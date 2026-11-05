import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'

const estadosValidos = new Set(['pendiente', 'en_revision', 'resuelto', 'rechazado'])

export const reclamoService = {
    async crear(idAlumno: string, datos: { id_clase: string; motivo: string }) {
        const inscripcion = await prisma.inscripcion.findFirst({
            where: { 
                id_alumno: idAlumno,
                id_clase: datos.id_clase,
                estado: 'confirmada'
            },
            include: { clase: true }
        })
        if (!inscripcion) throw new AppError('No tenes una inscripcion confirmada en esta clase', 404)
        if (inscripcion.clase.fecha_hora_fin > new Date()) {
            throw new AppError('Solo podes reclamar una clase que ya finalizó', 409)
        }
        if (!inscripcion.asistio) {
            throw new AppError('Solo podes reclamar una clase a la que asististe', 409)
        }
        if (inscripcion.clase.profesorAsistio) {
            throw new AppError('El profesor figura como asistente en esta clase', 409)
        }

        const existente = await prisma.reclamo.findFirst({
            where: { 
                id_alumno: idAlumno,
                id_clase: datos.id_clase
            }
        })
        if (existente) throw new AppError('Ya existe un reclamo para esta clase', 409)

        const reclamo = await prisma.reclamo.create({
            data: {
                id_alumno: idAlumno,
                id_clase: datos.id_clase,
                motivo: datos.motivo,
                estado: 'pendiente'
            },
            select: {
                id_reclamo: true,
                id_clase: true,
                motivo: true,
                estado: true,
                createdAt: true,
                clase: {
                    select: {
                        id_clase: true,
                        id_profesor: true,
                        profesorAsistio: true,
                        profesorIngreso: true,
                        titulo: true,
                        profesor: { select: { usuario: { select: { nombre: true } } } }
                    }
                }
            }
        })
        return reclamo
    },

    async listarDelAlumno(idAlumno: string) {
        const reclamos = await prisma.reclamo.findMany({
            where: { id_alumno: idAlumno },
            select: {
                id_reclamo: true,
                id_clase: true,
                motivo: true,
                estado: true,
                createdAt: true,
                clase: {
                    select: {
                        id_clase: true,
                        titulo: true,
                        profesor: { select: { usuario: { select: { nombre: true } } } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return reclamos
    },

    async obtenerDelAlumno(idAlumno: string, idReclamo: string) {
        const reclamo = await prisma.reclamo.findFirst({
            where: { id_reclamo: idReclamo, id_alumno: idAlumno },
            select: {
                id_reclamo: true,
                id_clase: true,
                motivo: true,
                estado: true,
                createdAt: true,
                clase: {
                    select: {
                        id_clase: true,
                        titulo: true,
                        profesor: { select: { usuario: { select: { nombre: true } } } }
                    }
                }
            }
        })
        if (!reclamo) throw new AppError('Reclamo no encontrado', 404)
        return reclamo
    },

    async listarParaAdmin() {
        const reclamos = await prisma.reclamo.findMany({
            select: {
                id_reclamo: true,
                id_clase: true,
                id_admin: true,
                motivo: true,
                estado: true,
                createdAt: true,
                clase: {
                    select: {
                        id_clase: true,
                        id_profesor: true,
                        titulo: true,
                        profesorAsistio: true,
                        profesorIngreso: true,
                        profesor: { select: { usuario: { select: { nombre: true } } } }
                    }
                },
                alumno: { select: { usuario: { select: { nombre: true, email: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        })
        return reclamos.map((reclamo) => ({ ...reclamo, tipo: 'reclamo' as const }))
    },

    async actualizarEstado(idReclamo: string, estado: string, idAdmin: string) {
        if (!estadosValidos.has(estado)) throw new AppError('Estado de reclamo no valido', 400)
        const reclamoActual = await prisma.reclamo.findUnique({
            where: { id_reclamo: idReclamo },
            select: { estado: true }
        })
        if (!reclamoActual) throw new AppError('Reclamo no encontrado', 404)
        if (reclamoActual.estado === 'resuelto' || reclamoActual.estado === 'rechazado') {
            throw new AppError('Un reclamo resuelto o rechazado no se puede modificar', 409)
        }
        const reclamo = await prisma.reclamo.update({
            where: { id_reclamo: idReclamo },
            data: { estado, id_admin: idAdmin },
            select: {
                id_reclamo: true,
                id_clase: true,
                id_admin: true,
                motivo: true,
                estado: true,
                createdAt: true,
                clase: {
                    select: {
                        id_clase: true,
                        id_profesor: true,
                        titulo: true,
                        profesorAsistio: true,
                        profesorIngreso: true,
                        profesor: { select: { usuario: { select: { nombre: true } } } }
                    }
                },
                alumno: { select: { usuario: { select: { nombre: true, email: true } } } }
            }
        })
        return { ...reclamo, tipo: 'reclamo' as const }
    }
}
