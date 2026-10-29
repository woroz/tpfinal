import { prisma } from "../utils/prisma.js";
import { AppError } from "../utils/error.js";
import { claseOcupaHorario } from '../utils/ocupacion.js'
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from '../utils/estados.js'
import { config } from '../config/index.js'

const limiteVigencia = () => new Date(Date.now() - DIAS_VIGENCIA * 24 * 60 * 60 * 1000)
const DIAS_VIGENCIA = 14
const POR_PAGINA = 20

export const tablonService = {
    async crearSolicitud(id_alumno: string, datos: {
        titulo: string,
        tema: string,
        descripcion?: string,
        ids_materia: string[]
    }) {
        const ids = [...new Set(datos.ids_materia)];
        const existentes = await prisma.materia.count({
            where: {
                id_materia: { in: ids }
            }
        })
        
        if (existentes !== ids.length) throw new AppError('Alguna de las materias no existe', 400)
        const solicitud = await prisma.solicitudClase.create({
            data: {
                id_alumno,
                titulo: datos.titulo,
                tema: datos.tema,
                descripcion: datos.descripcion,
                estado: "abierta",
                solicitudMateria: { create: ids.map((id_materia) => ({ id_materia })) },
            }
        })

        return solicitud.id_solicitud
    },

    async obtenerSolicitudes(id_profesor: string, pagina = 1) {
        const limite = new Date(Date.now() - DIAS_VIGENCIA * 24 * 60 * 60 * 1000)
        const solicitudes = await prisma.solicitudClase.findMany({
            where: { estado: 'abierta', createdAt: { gte: limite } },
            orderBy: { createdAt: 'desc' },
            skip: (pagina - 1) * POR_PAGINA,
            take: POR_PAGINA,
            select: {
                id_solicitud: true,
                titulo: true,
                tema: true,
                descripcion: true,
                createdAt: true,
                alumno: { select: { usuario: { select: { nombre: true } } } },
                solicitudMateria: {
                    select: { materia: { select: { id_materia: true, nombreMateria: true } } },
                },
                ofertas: { where: { id_profesor }, select: { id_oferta: true } },
            },
        })

        return solicitudes.map(({ ofertas, alumno, ...resto }) => ({
            ...resto,
            nombreAlumno: alumno.usuario.nombre,
            yaOfreciste: ofertas.length > 0,
        }))
    },

    async crearOferta(id_solicitud: string, id_profesor: string,
    datos: {
        id_materia: string
        mensaje?: string
        precio: number
        fecha_hora_inicio: Date
        fecha_hora_fin: Date
        material?: { nombre: string; url: string }
    }
) {
    if (datos.fecha_hora_inicio <= new Date()) throw new AppError('La fecha de inicio debe ser futura', 400)
    if (datos.fecha_hora_fin <= datos.fecha_hora_inicio) throw new AppError('El fin debe ser posterior al inicio', 400)

    const solicitud = await prisma.solicitudClase.findUnique({
        where: { id_solicitud },
        select: { estado: true, createdAt: true, solicitudMateria: { select: { id_materia: true } } },
    })

    if (!solicitud) throw new AppError('La solicitud no existe', 404)
    if (solicitud.estado !== 'abierta' || solicitud.createdAt < limiteVigencia()) {
        throw new AppError('La solicitud ya no está disponible', 409)
    }
    if (!solicitud.solicitudMateria.some((m) => m.id_materia === datos.id_materia)) {
        throw new AppError('Esa materia no está en la solicitud', 400)
    }

    const materia = await prisma.profesorMateria.findUnique({
        where: { id_materia_id_profesor: { id_materia: datos.id_materia, id_profesor } },
    })
    if (!materia) throw new AppError('No dictas esa materia', 403)

    const horarioClase = await prisma.clase.findFirst({
        where: {
            id_profesor,
            ...claseOcupaHorario(new Date()),
            fecha_hora_inicio: { lt: datos.fecha_hora_fin },
            fecha_hora_fin: { gt: datos.fecha_hora_inicio },
        },
        select: { id_clase: true },
    })
    if (horarioClase) throw new AppError('Ya tenés una clase en ese horario', 409)

    try {
        return await prisma.ofertaSolicitud.create({
            data: {
                id_solicitud,
                id_profesor,
                id_materia: datos.id_materia,
                mensaje: datos.mensaje,
                precio: datos.precio,
                fecha_hora_inicio: datos.fecha_hora_inicio,
                fecha_hora_fin: datos.fecha_hora_fin,
                materialNombre: datos.material?.nombre,
                materialUrl: datos.material?.url,
                estado: 'pendiente',
            },
            select: { id_oferta: true },
        })
    } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
            throw new AppError('Ya ofreciste una clase para esta solicitud', 409)
        }
        throw error
    }
},

    async editarSolicitud(id_solicitud: string, id_alumno: string, datos: {
        titulo?: string,
        tema?: string,
        descripcion?: string,
        ids_materia?: string[]
    }) {
        const limite = new Date(Date.now() - DIAS_VIGENCIA * 24 * 60 * 60 * 1000)
        const ids = datos.ids_materia ? [...new Set(datos.ids_materia)] : undefined
        if (ids) {
            const existentes = await prisma.materia.count({ where: { id_materia: { in: ids } } })
            if (existentes !== ids.length) throw new AppError('Alguna de las materias no existe', 400)
        }
    return prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudClase.findFirst({
            where: { id_solicitud, id_alumno },
            select: { estado: true, createdAt: true, _count: { select: { ofertas: true } } },
        })
        if (!solicitud) throw new AppError('La solicitud no existe o no es tuya', 404)
        if (solicitud.estado !== 'abierta') throw new AppError('Solo se pueden editar solicitudes abiertas', 409)
        if (solicitud.createdAt < limite) throw new AppError('La solicitud venció', 409)
        if (solicitud._count.ofertas > 0) throw new AppError('No se pueden editar solicitudes con ofertas', 409)

        await tx.solicitudClase.update({
            where: { id_solicitud },
            data: { titulo: datos.titulo, tema: datos.tema, descripcion: datos.descripcion },
        })

        if (ids) {
            await tx.solicitudMateria.deleteMany({ where: { id_solicitud } })
            await tx.solicitudMateria.createMany({
                data: ids.map((id_materia) => ({ id_solicitud, id_materia })),
            })
        }

        return tx.solicitudClase.findUniqueOrThrow({
            where: { id_solicitud },
            select: {
                id_solicitud: true,
                titulo: true,
                tema: true,
                descripcion: true,
                estado: true,
                solicitudMateria: { select: { materia: { select: { id_materia: true, nombreMateria: true } } } },
            },
        })
    })

    },

    async eliminarSolicitud(id_solicitud: string, id_alumno: string) {
        return prisma.$transaction(async (tx) => {
            const solicitud = await tx.solicitudClase.findFirst({
                where: { id_solicitud, id_alumno },
                select: { estado: true, _count: { select: { ofertas: true } } },
            })
            if (!solicitud) throw new AppError('La solicitud no existe o no es tuya', 404)
            if (solicitud._count.ofertas > 0) throw new AppError('Esta solicitud tiene ofertas, hay que cerrarla en vez de eliminarla', 409)
            
            await tx.solicitudMateria.deleteMany({ where: { id_solicitud } })
            await tx.solicitudClase.delete({ where: { id_solicitud } })
            return id_solicitud
        })
    },

    async obtenerSolicitudesAlumno(id_alumno: string) {
        const limite = new Date(Date.now() - DIAS_VIGENCIA * 24 * 60 * 60 * 1000)
        const solicitudes = await prisma.solicitudClase.findMany({
            where: { id_alumno },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id_solicitud: true,
                titulo: true,
                tema: true,
                descripcion: true,
                estado: true,
                createdAt: true,
                solicitudMateria: { 
                    select: { materia: { select: { id_materia: true, nombreMateria: true } } 
                }},
                ofertas: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id_oferta: true,
                        mensaje: true,
                        estado: true,
                        createdAt: true,
                        precio: true,
                        fecha_hora_inicio: true,
                        fecha_hora_fin: true,
                        materialNombre: true,
                        id_clase: true,
                        profesor: {
                            select: { id_profesor: true, tarifa: true, usuario: { select: { nombre: true } }
                        } },
                        materia: {
                            select: { id_materia: true, nombreMateria: true } 
                        },
                    },
                },
            },
        })
        return solicitudes.map((s) => ({ ...s, vencida: s.estado === 'abierta' && s.createdAt < limite }))
    },

    async cerrarSolicitud(id_solicitud: string, id_alumno: string) {
        return prisma.$transaction(async (tx) => {
            const cerradas = await tx.solicitudClase.updateMany({ 
                where: { id_solicitud, id_alumno, estado: 'abierta' },
                data: { estado: 'cerrada'},
            })
            if (cerradas.count === 0) throw new AppError('La solicitud no existe, no es tuya o ya no esta abierta', 404)
            
                await tx.ofertaSolicitud.updateMany({
                where: { id_solicitud, estado: 'pendiente' },
                data: { estado: 'rechazada' },
            })
            return id_solicitud
        })
    },

    async aceptarOferta(id_solicitud: string, id_oferta: string, id_alumno: string) {
    return await prisma.$transaction(async (tx) => {
        
        const oferta = await tx.ofertaSolicitud.findFirst({
            where: { 
                id_oferta, id_solicitud, estado: 'pendiente',
                fecha_hora_inicio: { gt: new Date() },
                solicitud: { id_alumno, estado: 'abierta', createdAt: { gte: limiteVigencia() } }
            },
            include: { solicitud: true }
        })
        if (!oferta) throw new AppError('Oferta no encontrada o no disponible', 404)

        const clase = await tx.clase.create({
            data: {
                id_profesor: oferta.id_profesor,
                id_materia: oferta.id_materia,
                titulo: oferta.solicitud.titulo,
                tema: oferta.solicitud.tema,
                cupo_maximo: 1,
                precio: oferta.precio,
                fecha_hora_inicio: oferta.fecha_hora_inicio,
                fecha_hora_fin: oferta.fecha_hora_fin,
                tipo: 'individual',
                origen: 'solicitud', 
                estado: ESTADO_CLASE.pendiente
            }
        })

        if (oferta.materialNombre && oferta.materialUrl) {
            await tx.materialClase.create({
                data: {
                    id_clase: clase.id_clase,
                    nombre: oferta.materialNombre,
                    url: oferta.materialUrl
                }
            })
        }

        const retencionMin = config.reservas.retencionMin
        const expiraEn = new Date(Date.now() + retencionMin * 60 * 1000)

        await tx.inscripcion.create({
            data: {
                id_clase: clase.id_clase,
                id_alumno: id_alumno,
                estado: ESTADO_INSCRIPCION.pendientePago,
                expiraEn: expiraEn
            }
        })
        
        await tx.ofertaSolicitud.update({
            where: { id_oferta },
            data: { estado: 'aceptada', id_clase: clase.id_clase }
        })
        await tx.ofertaSolicitud.updateMany({
            where: { id_solicitud, id_oferta: { not: id_oferta } },
            data: { estado: 'rechazada' }
        })
        await tx.solicitudClase.update({
            where: { id_solicitud },
            data: { estado: 'cerrada' }
        })

        return clase.id_clase
    })
}
}