import nodemailer, { type Transporter } from 'nodemailer'
import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { config } from '../config/index.js'
import { formatearFechaHora } from '../utils/fechas.js'

let transporte: Transporter | null | undefined

function obtenerTransporte(): Transporter | null {
    if (transporte !== undefined) return transporte
    transporte = config.mail.host
        ? nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.port === 465,
            auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined
        })
        : null
    return transporte
}

async function enviarMail(para: string, asunto: string, texto: string): Promise<void> {
    const canal = obtenerTransporte()
    if (!canal) return
    try {
        await canal.sendMail({ from: config.mail.from, to: para, subject: asunto, text: texto })
    } catch (error) {
        console.error('Error al enviar el mail', { para, message: (error as Error).message })
    }
}

type Aviso = {
    id_usuario: string
    email: string
    tipo: string
    titulo: string
    mensaje: string
    id_clase: string
}

async function enviarAvisos(avisos: Aviso[]): Promise<void> {
    await prisma.notificacion.createMany({
        data: avisos.map((aviso) => ({
            id_usuario: aviso.id_usuario,
            id_clase: aviso.id_clase,
            tipo: aviso.tipo,
            titulo: aviso.titulo,
            mensaje: aviso.mensaje
        }))
    })
    await Promise.all(avisos.map((aviso) => enviarMail(aviso.email, aviso.titulo, aviso.mensaje)))
}

export const notificacionService = {
    async reservaConfirmada(idInscripcion: string): Promise<void> {
        try {
            const inscripcion = await prisma.inscripcion.findUnique({
                where: { id_inscripcion: idInscripcion },
                include: {
                    alumno: { include: { usuario: true } },
                    clase: { include: { materia: true, profesor: { include: { usuario: true } } } }
                }
            })
            if (!inscripcion) return

            const { clase, alumno } = inscripcion
            const cuando = formatearFechaHora(clase.fecha_hora_inicio)
            const materia = clase.materia.nombreMateria
            const profesor = clase.profesor.usuario
            const estudiante = alumno.usuario

            await enviarAvisos([
                {
                    id_usuario: estudiante.id_usuario,
                    email: estudiante.email,
                    id_clase: clase.id_clase,
                    tipo: 'reserva_confirmada',
                    titulo: 'Reserva confirmada',
                    mensaje: `Tu clase de ${materia} con ${profesor.nombre} quedo confirmada para el ${cuando}.`
                },
                {
                    id_usuario: profesor.id_usuario,
                    email: profesor.email,
                    id_clase: clase.id_clase,
                    tipo: 'nueva_reserva',
                    titulo: 'Nueva clase reservada',
                    mensaje: `${estudiante.nombre} reservo una clase de ${materia} para el ${cuando}.`
                }
            ])
        } catch (error) {
            console.error('Error al notificar la reserva', { idInscripcion, message: (error as Error).message })
        }
    },

    async reservaNoDisponible(idInscripcion: string, reembolsado: boolean): Promise<void> {
        try {
            const inscripcion = await prisma.inscripcion.findUnique({
                where: { id_inscripcion: idInscripcion },
                include: {
                    alumno: { include: { usuario: true } },
                    clase: { include: { materia: true } }
                }
            })
            if (!inscripcion) return

            const { clase, alumno } = inscripcion
            const detalle = reembolsado
                ? 'Te devolvimos el pago.'
                : 'Vamos a gestionar la devolucion del pago a la brevedad.'

            await enviarAvisos([{
                id_usuario: alumno.usuario.id_usuario,
                email: alumno.usuario.email,
                id_clase: clase.id_clase,
                tipo: 'reserva_no_disponible',
                titulo: 'No pudimos confirmar tu reserva',
                mensaje: `El horario de tu clase de ${clase.materia.nombreMateria} dejo de estar disponible antes de acreditarse el pago. ${detalle}`
            }])
        } catch (error) {
            console.error('Error al notificar la reserva no disponible', { idInscripcion, message: (error as Error).message })
        }
    },

    listar(idUsuario: string) {
        return prisma.notificacion.findMany({
            where: { id_usuario: idUsuario },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
    },

    async marcarLeida(idUsuario: string, idNotificacion: string): Promise<void> {
        const resultado = await prisma.notificacion.updateMany({
            where: { id_notificacion: idNotificacion, id_usuario: idUsuario },
            data: { leida: true }
        })
        if (resultado.count === 0) throw new AppError('Notificacion no encontrada', 404)
    }
}
