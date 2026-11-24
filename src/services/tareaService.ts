import { put, del } from '@vercel/blob'
import { prisma } from "../utils/prisma.js";
import { AppError } from "../utils/error.js";

export const tareaService = {
    async crearTarea(id_profesor: string, data: {
        id_clase: string,
        titulo: string,
        descripcion?: string,
        fechaLimite?: string,
        id_alumno: string[]
    }) {
        const clase = await prisma.clase.findFirst({
            where: { id_clase: data.id_clase, id_profesor },
            select: { id_clase: true, titulo: true }
        })
        if (!clase) throw new AppError('La clase no existe o no es tuya', 403)

        const ids = [...new Set(data.id_alumno)]

        const inscriptos = await prisma.inscripcion.findMany({
            where: {
                id_clase: data.id_clase,
                id_alumno: { in: ids },
                estado: 'confirmada'
            },
            select: {
                id_alumno: true,
                alumno: { select: { id_usuario: true } }
            }
        })
        if (inscriptos.length !== ids.length) {
            throw new AppError('Algunos alumnos no están inscriptos en la clase', 400)
        }

        const fechaLimite = data.fechaLimite ? new Date(`${data.fechaLimite}:00-03:00`) : undefined
        if (fechaLimite && fechaLimite < new Date()) {
            throw new AppError('La fecha límite no puede ser anterior a la fecha actual', 400)
        }

        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id_clase FROM "Clase" WHERE id_clase = ${data.id_clase} FOR UPDATE`
            const existente = await tx.tarea.findFirst({ where: { id_clase: data.id_clase }, select: { id_tarea: true } })
            if (existente) throw new AppError('Esta clase ya tiene una tarea asignada', 409)
            const tarea = await tx.tarea.create({
                data: {
                    id_clase: data.id_clase,
                    titulo: data.titulo,
                    descripcion: data.descripcion,
                    fechaLimite: fechaLimite,
                }
            })
            await tx.tareaAlumno.createMany({
                data: ids.map((id_alumno) => ({
                    id_tarea: tarea.id_tarea,
                    id_alumno: id_alumno
                }))
            })
            await tx.notificacion.createMany({
                data: inscriptos.map((inscripcion) => ({
                    id_usuario: inscripcion.alumno.id_usuario,
                    id_clase: data.id_clase,
                    tipo: 'tarea_nueva',
                    titulo: 'Nueva tarea asignada',
                    mensaje: `Tenés una nueva tarea en "${clase.titulo}": ${tarea.titulo}.`
                }))
            })
            return tarea
        })
    },

    async listarMisTareas(id_alumno: string, pendiente: boolean) {
        const tareas = await prisma.tareaAlumno.findMany({
            where: {
                id_alumno: id_alumno,
                ...(pendiente ? { entregadaEn: null } : {})
            },
            orderBy: { tarea: { createdAt: 'desc' } },
            select: {
                entregaTexto: true,
                entregadaEn: true,
                nota: true,
                comentario: true,
                calificadaEn: true,
                archivos: {
                    select: {
                        id_archivo: true,
                        nombre: true,
                        url: true
                    }
                },
                tarea: {
                    select: {
                        id_tarea: true,
                        titulo: true,
                        descripcion: true,
                        fechaLimite: true,
                        adjuntos: {
                            select: {
                                id_adjunto: true,
                                nombre: true,
                                url: true
                            }
                        },
                        clase: {
                            select: {
                                id_clase: true,
                                titulo: true
                            }
                        }
                    }
                }
            },
        })
        return tareas.map((t) => ({
            ...t,
            estado: t.nota !== null ? 'calificada' : t.entregadaEn ? 'entregada' : 'sin_entregar'
        }))
    },

    async listarPorClase(id_clase: string, rol: string, id_rol: string) {
        if (rol === 'alumno') {
            const tareas = await prisma.tareaAlumno.findMany({
                where: { id_alumno: id_rol, tarea: { id_clase } },
                orderBy: { tarea: { createdAt: 'desc' } },
                select: {
                    entregaTexto: true,
                    entregadaEn: true,
                    nota: true,
                    comentario: true,
                    calificadaEn: true,
                    archivos: { select: { id_archivo: true, nombre: true, url: true } },
                    tarea: {
                        select: {
                            id_tarea: true,
                            titulo: true,
                            descripcion: true,
                            fechaLimite: true,
                            adjuntos: { 
                                select: { 
                                    id_adjunto: true,
                                    nombre: true,
                                    url: true
                                } }
                        }

                    }
                }
            })
            return tareas.map((t) => ({
                ...t,
                estado: t.nota !== null ? 'calificada' : t.entregadaEn ? 'entregada' : 'sin_entregar'
            }))
        }

        const clase = await prisma.clase.findFirst({
            where: { id_clase, id_profesor: id_rol },
            select: { id_clase: true }
        })
        if (!clase) throw new AppError('La clase no existe o no es tuya', 403)

        const tareas = await prisma.tarea.findMany({
            where: { id_clase },
            orderBy: { createdAt: 'desc' },
            select: {
                id_tarea: true,
                titulo: true,
                descripcion: true,
                fechaLimite: true,
                createdAt: true,
                adjuntos: {
                    select: {
                        id_adjunto: true,
                        nombre: true,
                        url: true
                    }
                },
                asignaciones: {
                    select: {
                        id_alumno: true,
                        entregaTexto: true,
                        entregadaEn: true,
                        nota: true,
                        comentario: true,
                        calificadaEn: true,
                        archivos: { select: { id_archivo: true, nombre: true, url: true } },
                        alumno: { select: { usuario: { select: { nombre: true } } } }
                    }
                }
            }
        })
        return tareas.map((t) => ({
            ...t,
            asignaciones: t.asignaciones.map((a) => ({
                id_alumno: a.id_alumno,
                nombre: a.alumno.usuario.nombre,
                entregaTexto: a.entregaTexto,
                entregadaEn: a.entregadaEn,
                nota: a.nota,
                comentario: a.comentario,
                calificadaEn: a.calificadaEn,
                archivos: a.archivos,
                estado: a.nota !== null ? 'calificada' : a.entregadaEn ? 'entregada' : 'sin_entregar'
            }))
        }))
    },

    async modificarTarea(id_tarea: string, id_profesor: string, data: {
        titulo?: string,
        descripcion?: string,
        fechaLimite?: string | null
    }) {
        const modificada = await prisma.tarea.updateMany({
            where: { id_tarea, clase: { id_profesor } },
            data: {
                titulo: data.titulo,
                descripcion: data.descripcion,
                fechaLimite: data.fechaLimite === null ? null : data.fechaLimite ? new Date(`${data.fechaLimite}:00-03:00`) : undefined            }
        })
        if (modificada.count === 0) throw new AppError('La tarea no existe o no es tuya', 404)
        return { ok: true }
    },

    async calificar(id_tarea: string, id_alumno: string, id_profesor: string, data: {
        nota: number,
        comentario?: string
    }) {
        const calificada = await prisma.tareaAlumno.updateMany({
            where: {
                id_tarea,
                id_alumno,
                entregadaEn: { not: null },
                tarea: { clase: { id_profesor } }
            },
            data: {
                nota: data.nota,
                comentario: data.comentario,
                calificadaEn: new Date()
            }
        })
        if (calificada.count === 0) {
            throw new AppError('La tarea no existe, no es tuya o el alumno todavía no entregó', 404)
        }
        return { ok: true }
    },

    async subirArchivo(id_tarea: string, id_alumno: string, file: Express.Multer.File) {
        const asignacion = await prisma.tareaAlumno.findUnique({
            where: { id_tarea_id_alumno: { id_tarea, id_alumno } },
            select: { nota: true, _count: { select: { archivos: true } } }
        })
        if (!asignacion) throw new AppError('La tarea no existe', 404)
        if (asignacion.nota !== null) throw new AppError('La tarea ya fue calificada', 409)
        if (asignacion._count.archivos >= 3) throw new AppError('Podés subir hasta 3 archivos', 400)

        const blob = await put(
            `tareas/${id_tarea}/${id_alumno}/${Date.now()}-${file.originalname}`,
            file.buffer,
            { access: 'public', contentType: file.mimetype }
        )

        try {
            return await prisma.entregaArchivo.create({
                data: { id_tarea, id_alumno, nombre: file.originalname, url: blob.url }
            })
        } catch (error) {
            await del(blob.url).catch(() => { })
            throw error
        }
    },

    async quitarArchivo(id_tarea: string, id_alumno: string, id_archivo: string) {
        const archivo = await prisma.entregaArchivo.findFirst({
            where: { id_archivo, id_tarea, id_alumno, entrega: { nota: null } },
            select: { url: true }
        })
        if (!archivo) throw new AppError('El archivo no existe o la tarea ya fue calificada', 404)

        await prisma.entregaArchivo.delete({ where: { id_archivo } })
        await del(archivo.url).catch(() => { })
        return { ok: true }
    },

    async entregar(id_tarea: string, id_alumno: string, data: { entregaTexto?: string }) {
        if (!data.entregaTexto) {
            const archivos = await prisma.entregaArchivo.count({ where: { id_tarea, id_alumno } })
            if (archivos === 0) throw new AppError('Escribí una respuesta o adjuntá un archivo', 400)
        }

        return prisma.$transaction(async (tx) => {
            const entrega = await tx.tareaAlumno.findUnique({
                where: { id_tarea_id_alumno: { id_tarea, id_alumno } },
                select: {
                    alumno: { select: { usuario: { select: { nombre: true } } } },
                    tarea: { select: {
                        titulo: true,
                        id_clase: true,
                        clase: { select: { titulo: true, profesor: { select: { usuario: { select: { id_usuario: true } } } } } }
                    } }
                }
            })
            if (!entrega) throw new AppError('La tarea no existe o ya fue calificada', 404)
            const datosEntrega = { entregaTexto: data.entregaTexto, entregadaEn: new Date() }
            const primera = await tx.tareaAlumno.updateMany({
                where: { id_tarea, id_alumno, nota: null, entregadaEn: null },
                data: datosEntrega
            })
            if (primera.count === 0) {
                const actualizada = await tx.tareaAlumno.updateMany({
                    where: { id_tarea, id_alumno, nota: null },
                    data: datosEntrega
                })
                if (actualizada.count === 0) throw new AppError('La tarea no existe o ya fue calificada', 404)
            } else {
                await tx.notificacion.create({
                    data: {
                        id_usuario: entrega.tarea.clase.profesor.usuario.id_usuario,
                        id_clase: entrega.tarea.id_clase,
                        tipo: 'tarea_entregada',
                        titulo: 'Nueva tarea entregada',
                        mensaje: `${entrega.alumno.usuario.nombre} entregó "${entrega.tarea.titulo}" en "${entrega.tarea.clase.titulo}".`
                    }
                })
            }
            return { ok: true }
        })
    },
    async subirAdjunto(id_tarea: string, id_profesor: string, file: Express.Multer.File) {
        const tarea = await prisma.tarea.findFirst({
            where: { id_tarea, clase: { id_profesor } },
            select: { _count: { select: { adjuntos: true } } }
        })
        if (!tarea) throw new AppError('La tarea no existe o no es tuya', 404)
        if (tarea._count.adjuntos >= 3) throw new AppError('Podés adjuntar hasta 3 archivos', 400)

        const blob = await put(
            `tareas/${id_tarea}/consigna/${Date.now()}-${file.originalname}`,
            file.buffer,
            { access: 'public', contentType: file.mimetype }
        )

        try {
            return await prisma.tareaAdjunto.create({
                data: { id_tarea, nombre: file.originalname, url: blob.url }
            })
        } catch (error) {
            await del(blob.url).catch(() => { })
            throw error
        }
    },

    async quitarAdjunto(id_tarea: string, id_profesor: string, id_adjunto: string) {
        const adjunto = await prisma.tareaAdjunto.findFirst({
            where: { id_adjunto, id_tarea, tarea: { clase: { id_profesor } } },
            select: { url: true }
        })
        if (!adjunto) throw new AppError('El archivo no existe o no es tuyo', 404)

        await prisma.tareaAdjunto.delete({ where: { id_adjunto } })
        await del(adjunto.url).catch(() => { })
        return { ok: true }
    },
    
    async listarUltimaClase(id_alumno: string) {
        const inscripcion = await prisma.inscripcion.findFirst({
            where: {
                id_alumno,
                estado: 'confirmada',
                clase: {
                    fecha_hora_inicio: { lte: new Date() },
                    estado: { not: 'cancelada'}
                }
            },
            orderBy: { clase: { fecha_hora_inicio: 'desc' } },
            select: {
                clase: {
                    select: {
                        id_clase: true,
                        titulo: true,
                        fecha_hora_inicio: true,
                        profesor: {
                            select: {
                                usuario: { select: { nombre: true } }
                            }
                        }
                    }
                }
            }
        })
        const generadoEn = new Date()
        if (!inscripcion) return { clase: null, tareas: [], generadoEn }

        const tareas = await prisma.tareaAlumno.findMany({
            where: { id_alumno, tarea: { id_clase: inscripcion.clase.id_clase } },
            orderBy: { tarea: { createdAt: 'desc' } },
            select: {
                entregaTexto: true,
                entregadaEn: true,
                nota: true,
                comentario: true,
                calificadaEn: true,
                archivos: { select: { id_archivo: true, nombre: true, url: true } },
                tarea: {
                    select: {
                        id_tarea: true,
                        titulo: true,
                        descripcion: true,
                        fechaLimite: true,
                        adjuntos: { select: { id_adjunto: true, nombre: true, url: true } }
                    }
                }
            }
        })
        return {
            clase: inscripcion.clase,
            generadoEn,
            tareas: tareas.map((tarea) => ({
                ...tarea,
                estado: tarea.nota !== null ? 'calificada' : tarea.entregadaEn ? 'entregada' : 'sin_entregar'
            }))
        }
    }
}