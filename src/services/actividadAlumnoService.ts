import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'

function dtoRegistro(registro: {
    id_registro: string
    id_alumno: string
    id_clase: string
    id_profesor: string
    actividad: string | null
    calificacion: number | null
    nota: string | null
    createdAt: Date
    updatedAt: Date
}) {
    return {
        id_registro: registro.id_registro,
        id_alumno: registro.id_alumno,
        id_clase: registro.id_clase,
        id_profesor: registro.id_profesor,
        actividad: registro.actividad,
        calificacion: registro.calificacion,
        nota: registro.nota,
        createdAt: registro.createdAt,
        updatedAt: registro.updatedAt
    }
}

async function verificarClaseFinalizada(idClase: string, idProfesor: string) {
    const clase = await prisma.clase.findFirst({
        where: { id_clase: idClase, id_profesor: idProfesor },
        select: { id_clase: true, fecha_hora_fin: true }
    })
    if (!clase) throw new AppError('No tenes permiso para registrar informacion en esta clase', 403)
    if (clase.fecha_hora_fin > new Date()) {
        throw new AppError('Solo podes registrar o consultar el desempeño una vez finalizada la clase', 409)
    }
}

export const actividadAlumnoService = {
    async listarDeClase(idProfesor: string, idClase: string) {
        await verificarClaseFinalizada(idClase, idProfesor)
        const [inscripciones, registros] = await Promise.all([
            prisma.inscripcion.findMany({
                where: { id_clase: idClase, estado: 'confirmada' },
                select: {
                    id_alumno: true,
                    alumno: { select: { usuario: { select: { nombre: true } } } }
                },
                orderBy: { alumno: { usuario: { nombre: 'asc' } } }
            }),
            prisma.registroActividadAlumno.findMany({
                where: { id_clase: idClase, id_profesor: idProfesor },
                orderBy: [{ createdAt: 'desc' }, { id_registro: 'asc' }]
            })
        ])
        return {
            alumnos: inscripciones.map((inscripcion) => ({
                id_alumno: inscripcion.id_alumno,
                nombre: inscripcion.alumno.usuario.nombre,
                registros: registros
                    .filter((registro) => registro.id_alumno === inscripcion.id_alumno)
                    .map(dtoRegistro)
            }))
        }
    },

    async crear(idProfesor: string, datos: {
        id_clase: string
        id_alumno: string
        actividad?: string | null
        calificacion?: number | null
        nota?: string | null
    }) {
        await verificarClaseFinalizada(datos.id_clase, idProfesor)
        const inscripcion = await prisma.inscripcion.findFirst({
            where: {
                id_clase: datos.id_clase,
                id_alumno: datos.id_alumno,
                estado: 'confirmada'
            },
            select: { id_inscripcion: true }
        })
        if (!inscripcion) throw new AppError('El alumno no tiene una inscripcion confirmada en esta clase', 404)

        const registro = await prisma.registroActividadAlumno.create({
            data: {
                id_clase: datos.id_clase,
                id_alumno: datos.id_alumno,
                id_profesor: idProfesor,
                actividad: datos.actividad || null,
                calificacion: datos.calificacion ?? null,
                nota: datos.nota || null
            }
        })
        return dtoRegistro(registro)
    },

    async actualizar(idProfesor: string, idRegistro: string, datos: {
        actividad?: string | null
        calificacion?: number | null
        nota?: string | null
    }) {
        const existente = await prisma.registroActividadAlumno.findFirst({
            where: { id_registro: idRegistro, id_profesor: idProfesor },
            select: { id_registro: true, id_clase: true }
        })
        if (!existente) throw new AppError('Registro no encontrado', 404)
        await verificarClaseFinalizada(existente.id_clase, idProfesor)

        const registro = await prisma.registroActividadAlumno.update({
            where: { id_registro: idRegistro },
            data: {
                ...(datos.actividad !== undefined ? { actividad: datos.actividad || null } : {}),
                ...(datos.calificacion !== undefined ? { calificacion: datos.calificacion } : {}),
                ...(datos.nota !== undefined ? { nota: datos.nota || null } : {})
            }
        })
        return dtoRegistro(registro)
    },

    async listarDelAlumno(idAlumno: string) {
        const registros = await prisma.registroActividadAlumno.findMany({
            where: { id_alumno: idAlumno },
            include: {
                clase: { select: { titulo: true, fecha_hora_inicio: true } },
                profesor: { include: { usuario: { select: { nombre: true } } } }
            },
            orderBy: [{ createdAt: 'desc' }, { id_registro: 'asc' }]
        })
        return registros.map((registro) => ({
            ...dtoRegistro(registro),
            clase: {
                titulo: registro.clase.titulo,
                fecha_hora_inicio: registro.clase.fecha_hora_inicio
            },
            profesor: { nombre: registro.profesor.usuario.nombre }
        }))
    }
}
