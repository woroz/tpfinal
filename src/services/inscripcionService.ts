import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { config } from '../config/index.js'
import { ESTADO_CLASE, ESTADO_INSCRIPCION, ESTADO_PAGO } from '../utils/estados.js'
import { claseOcupaHorario } from '../utils/ocupacion.js'
import type { Prisma } from '../generated/prisma/client.js'
import { encajaEnFranja } from './horarioService.js'
import { mercadoPagoService } from './mercadoPagoService.js'
import { notificacionService } from './notificacionService.js'

type Tx = Prisma.TransactionClient
type Plataforma = 'web' | 'app'

const MS_MINUTO = 60_000

const incluirDetalle = {
    clase: {
        include: {
            materia: true,
            profesor: { include: { usuario: { select: { nombre: true } } } }
        }
    },
    pago: true
} satisfies Prisma.InscripcionInclude

type InscripcionDetalle = Prisma.InscripcionGetPayload<{ include: typeof incluirDetalle }>

function aDto(inscripcion: InscripcionDetalle) {
    const expirada = inscripcion.estado === ESTADO_INSCRIPCION.pendientePago
        && inscripcion.expiraEn !== null
        && inscripcion.expiraEn <= new Date()

    return {
        id_inscripcion: inscripcion.id_inscripcion,
        estado: expirada ? 'expirada' : inscripcion.estado,
        expira_en: inscripcion.expiraEn,
        clase: {
            id_clase: inscripcion.clase.id_clase,
            titulo: inscripcion.clase.titulo,
            tema: inscripcion.clase.tema,
            materia: inscripcion.clase.materia.nombreMateria,
            inicio: inscripcion.clase.fecha_hora_inicio,
            fin: inscripcion.clase.fecha_hora_fin,
            precio: inscripcion.clase.precio ?? 0
        },
        profesor: {
            id_profesor: inscripcion.clase.id_profesor,
            nombre: inscripcion.clase.profesor.usuario.nombre
        },
        pago: inscripcion.pago
            ? { estado: inscripcion.pago.estado, monto: inscripcion.pago.monto }
            : null
    }
}

async function bloquearProfesor(tx: Tx, idProfesor: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idProfesor}))`
}

async function liberarReserva(idInscripcion: string, idClase: string): Promise<void> {
    await prisma.$transaction([
        prisma.inscripcion.update({
            where: { id_inscripcion: idInscripcion },
            data: { estado: ESTADO_INSCRIPCION.cancelada, expiraEn: null }
        }),
        prisma.clase.update({
            where: { id_clase: idClase },
            data: { estado: ESTADO_CLASE.cancelada }
        }),
        prisma.pago.updateMany({
            where: { id_inscripcion: idInscripcion },
            data: { estado: ESTADO_PAGO.rechazado }
        })
    ])
}

async function obtenerDetalle(idInscripcion: string) {
    const inscripcion = await prisma.inscripcion.findUnique({
        where: { id_inscripcion: idInscripcion },
        include: incluirDetalle
    })
    if (!inscripcion) throw new AppError('Reserva no encontrada', 404)
    return aDto(inscripcion)
}

async function confirmarPagoAprobado(idInscripcion: string, idPagoMp: string): Promise<void> {
    const resultado = await prisma.$transaction(async (tx: Tx) => {
        const previa = await tx.inscripcion.findUnique({
            where: { id_inscripcion: idInscripcion },
            include: { clase: true, pago: true }
        })
        if (!previa || !previa.pago) return 'ignorada' as const

        await bloquearProfesor(tx, previa.clase.id_profesor)

        const inscripcion = await tx.inscripcion.findUnique({
            where: { id_inscripcion: idInscripcion },
            include: { clase: true, pago: true }
        })
        if (!inscripcion || !inscripcion.pago) return 'ignorada' as const

        if (inscripcion.pago.estado === ESTADO_PAGO.aprobado
            || inscripcion.pago.estado === ESTADO_PAGO.reembolsado
            || inscripcion.pago.estado === ESTADO_PAGO.reembolsoPendiente) {
            return 'ignorada' as const
        }

        const ahora = new Date()
        const choque = await tx.clase.findFirst({
            where: {
                id_profesor: inscripcion.clase.id_profesor,
                id_clase: { not: inscripcion.id_clase },
                ...claseOcupaHorario(ahora),
                fecha_hora_inicio: { lt: inscripcion.clase.fecha_hora_fin },
                fecha_hora_fin: { gt: inscripcion.clase.fecha_hora_inicio }
            },
            select: { id_clase: true }
        })

        if (choque || inscripcion.estado === ESTADO_INSCRIPCION.cancelada) {
            await tx.pago.update({
                where: { id_inscripcion: idInscripcion },
                data: { estado: ESTADO_PAGO.reembolsoPendiente, id_mercadopago: idPagoMp, fecha_pago: ahora }
            })
            return 'conflicto' as const
        }

        await tx.inscripcion.update({
            where: { id_inscripcion: idInscripcion },
            data: { estado: ESTADO_INSCRIPCION.confirmada, expiraEn: null }
        })
        await tx.clase.update({
            where: { id_clase: inscripcion.id_clase },
            data: { estado: ESTADO_CLASE.confirmada }
        })
        await tx.pago.update({
            where: { id_inscripcion: idInscripcion },
            data: { estado: ESTADO_PAGO.aprobado, id_mercadopago: idPagoMp, fecha_pago: ahora }
        })
        return 'confirmada' as const
    })

    if (resultado === 'confirmada') {
        await notificacionService.reservaConfirmada(idInscripcion)
    }

    if (resultado === 'conflicto') {
        const reembolsado = await mercadoPagoService.reembolsar(idPagoMp)
        if (reembolsado) {
            await prisma.pago.update({
                where: { id_inscripcion: idInscripcion },
                data: { estado: ESTADO_PAGO.reembolsado }
            })
        }
        await notificacionService.reservaNoDisponible(idInscripcion, reembolsado)
    }
}

export const inscripcionService = {
    async reservar(
        idAlumno: string,
        datos: { id_profesor: string; id_materia: string; inicio: string; tema?: string; plataforma: Plataforma }
    ) {
        const { duracionMin, anticipacionMin, retencionMin } = config.reservas
        const ahora = new Date()
        const inicio = new Date(datos.inicio)
        const fin = new Date(inicio.getTime() + duracionMin * MS_MINUTO)

        if (inicio.getTime() < ahora.getTime() + anticipacionMin * MS_MINUTO) {
            throw new AppError('El horario elegido ya no esta disponible', 409)
        }

        const reserva = await prisma.$transaction(async (tx: Tx) => {
            await bloquearProfesor(tx, datos.id_profesor)

            const profesor = await tx.profesor.findUnique({
                where: { id_profesor: datos.id_profesor },
                include: {
                    materias: { where: { id_materia: datos.id_materia }, include: { materia: true } },
                    disponibilidad: { where: { estado: true } }
                }
            })
            if (!profesor) throw new AppError('Profesor no encontrado', 404)

            const asociacion = profesor.materias[0]
            if (!asociacion) throw new AppError('El profesor no dicta esa materia', 400)

            if (!encajaEnFranja(profesor.disponibilidad, inicio)) {
                throw new AppError('El horario elegido no esta disponible', 409)
            }

            const choqueProfesor = await tx.clase.findFirst({
                where: {
                    id_profesor: datos.id_profesor,
                    ...claseOcupaHorario(ahora),
                    fecha_hora_inicio: { lt: fin },
                    fecha_hora_fin: { gt: inicio }
                },
                select: { id_clase: true }
            })
            if (choqueProfesor) throw new AppError('El horario elegido ya fue reservado', 409)

            const choqueAlumno = await tx.inscripcion.findFirst({
                where: {
                    id_alumno: idAlumno,
                    OR: [
                        { estado: ESTADO_INSCRIPCION.confirmada },
                        { estado: ESTADO_INSCRIPCION.pendientePago, expiraEn: { gt: ahora } }
                    ],
                    clase: {
                        fecha_hora_inicio: { lt: fin },
                        fecha_hora_fin: { gt: inicio }
                    }
                },
                select: { id_inscripcion: true }
            })
            if (choqueAlumno) throw new AppError('Ya tenes una clase reservada en ese horario', 409)

            const monto = Math.round((profesor.tarifa ?? 0) * duracionMin / 60)
            const gratis = monto <= 0
            const nombreMateria: string = asociacion.materia.nombreMateria
            const titulo = `Clase de ${nombreMateria}`

            const clase = await tx.clase.create({
                data: {
                    id_profesor: datos.id_profesor,
                    id_materia: datos.id_materia,
                    titulo,
                    tema: datos.tema || nombreMateria,
                    fecha_hora_inicio: inicio,
                    fecha_hora_fin: fin,
                    cupo_maximo: 1,
                    precio: monto,
                    tipo: 'individual',
                    origen: 'reserva',
                    estado: gratis ? ESTADO_CLASE.confirmada : ESTADO_CLASE.pendiente
                }
            })

            const expiraEn = gratis ? null : new Date(ahora.getTime() + retencionMin * MS_MINUTO)

            const inscripcion = await tx.inscripcion.create({
                data: {
                    id_clase: clase.id_clase,
                    id_alumno: idAlumno,
                    estado: gratis ? ESTADO_INSCRIPCION.confirmada : ESTADO_INSCRIPCION.pendientePago,
                    expiraEn
                }
            })

            if (!gratis) {
                await tx.pago.create({
                    data: {
                        id_inscripcion: inscripcion.id_inscripcion,
                        monto,
                        medioPago: 'mercadopago',
                        estado: ESTADO_PAGO.pendiente
                    }
                })
            }

            return {
                idInscripcion: inscripcion.id_inscripcion as string,
                idClase: clase.id_clase as string,
                titulo,
                monto,
                expiraEn
            }
        })

        if (reserva.monto <= 0) {
            await notificacionService.reservaConfirmada(reserva.idInscripcion)
            return { inscripcion: await obtenerDetalle(reserva.idInscripcion), urlPago: null }
        }

        try {
            const { idPreferencia, urlPago } = await mercadoPagoService.crearPreferencia({
                idInscripcion: reserva.idInscripcion,
                titulo: reserva.titulo,
                monto: reserva.monto,
                expiraEn: reserva.expiraEn as Date,
                plataforma: datos.plataforma
            })
            await prisma.pago.update({
                where: { id_inscripcion: reserva.idInscripcion },
                data: { id_preferencia: idPreferencia }
            })
            return { inscripcion: await obtenerDetalle(reserva.idInscripcion), urlPago }
        } catch (error) {
            await liberarReserva(reserva.idInscripcion, reserva.idClase)
            throw error
        }
    },

    async generarPago(idAlumno: string, idInscripcion: string, plataforma: Plataforma) {
        const inscripcion = await prisma.inscripcion.findFirst({
            where: { id_inscripcion: idInscripcion, id_alumno: idAlumno },
            include: { clase: true, pago: true }
        })
        if (!inscripcion) throw new AppError('Reserva no encontrada', 404)

        if (inscripcion.estado === ESTADO_INSCRIPCION.confirmada) {
            throw new AppError('La clase ya esta confirmada', 409)
        }
        if (
            inscripcion.estado !== ESTADO_INSCRIPCION.pendientePago
            || !inscripcion.expiraEn
            || inscripcion.expiraEn <= new Date()
            || !inscripcion.pago
        ) {
            throw new AppError('La reserva expiro. Elegi otro horario', 409)
        }

        const { idPreferencia, urlPago } = await mercadoPagoService.crearPreferencia({
            idInscripcion,
            titulo: inscripcion.clase.titulo,
            monto: inscripcion.pago.monto,
            expiraEn: inscripcion.expiraEn,
            plataforma
        })
        await prisma.pago.update({
            where: { id_inscripcion: idInscripcion },
            data: { id_preferencia: idPreferencia }
        })

        return { urlPago }
    },

    async procesarNotificacionPago(idPagoMp: string): Promise<void> {
        const pagoMp = await mercadoPagoService.obtenerPago(idPagoMp)
        if (!pagoMp.referencia) return

        const pago = await prisma.pago.findUnique({ where: { id_inscripcion: pagoMp.referencia } })
        if (!pago) return

        if (pagoMp.estado === 'approved') {
            if (pagoMp.monto !== pago.monto) {
                console.error('El monto del pago no coincide con la reserva', { idPagoMp, esperado: pago.monto, recibido: pagoMp.monto })
                return
            }
            await confirmarPagoAprobado(pagoMp.referencia, pagoMp.id)
            return
        }

        if (pagoMp.estado === 'rejected' || pagoMp.estado === 'cancelled') {
            await prisma.pago.updateMany({
                where: { id_inscripcion: pagoMp.referencia, estado: ESTADO_PAGO.pendiente },
                data: { estado: ESTADO_PAGO.rechazado, id_mercadopago: pagoMp.id }
            })
        }
    },

    async obtener(idAlumno: string, idInscripcion: string) {
        const inscripcion = await prisma.inscripcion.findFirst({
            where: { id_inscripcion: idInscripcion, id_alumno: idAlumno },
            include: incluirDetalle
        })
        if (!inscripcion) throw new AppError('Reserva no encontrada', 404)
        return aDto(inscripcion)
    },

    async listarDelAlumno(idAlumno: string, historial: boolean) {
        const ahora = new Date()
        const inscripciones = await prisma.inscripcion.findMany({
            where: historial
                ? { id_alumno: idAlumno }
                : {
                    id_alumno: idAlumno,
                    clase: { fecha_hora_fin: { gte: ahora } },
                    OR: [
                        { estado: ESTADO_INSCRIPCION.confirmada },
                        { estado: ESTADO_INSCRIPCION.pendientePago, expiraEn: { gt: ahora } }
                    ]
                },
            include: incluirDetalle,
            orderBy: { clase: { fecha_hora_inicio: historial ? 'desc' : 'asc' } }
        })
        return inscripciones.map(aDto)
    }
}
