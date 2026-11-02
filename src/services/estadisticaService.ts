import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from '../utils/estados.js';
import type { Role } from '../generated/prisma/client.js'

export const estadisticaService = {
    async recalcularEstadisticasProfesor(id_profesor: string) {
        const ahora = new Date()
        const [clasesDictadas, resenas] = await Promise.all([
            prisma.clase.count({
                where: {
                    id_profesor,
                    fecha_hora_fin: { lt: ahora },
                    estado: { not: ESTADO_CLASE.cancelada },
                    inscripciones: { some: { estado: ESTADO_INSCRIPCION.confirmada } }
                }
            }),
            prisma.resena.aggregate({
                where: { id_profesor },
                _avg: { puntaje: true },
                _count: { _all: true }
            })
        ])

        const datos = {
            clasesDictadas,
            cantidadResenas: resenas._count._all,
            promedioResenas: resenas._avg.puntaje
        }

        return prisma.estadisticaProfesor.upsert({
            where: { id_profesor },
            create: { id_profesor, ...datos },
            update: datos
        })
    },
    async recalcularEstadisticasAlumno(id_alumno: string) {
        const ahora = new Date()

        const [clasesTomadas, calificaciones, resenasDejadas] = await Promise.all([
            prisma.inscripcion.count({
                where: {
                    id_alumno,
                    estado: ESTADO_INSCRIPCION.confirmada,
                    clase: {
                        fecha_hora_fin: { lt: ahora },
                        estado: { not: ESTADO_CLASE.cancelada }
                    }
                }
            }),
            prisma.registroActividadAlumno.aggregate({
                where: { id_alumno, calificacion: { not: null } },
                _avg: { calificacion: true },
                _count: { calificacion: true }
            }),
            prisma.resena.count({
                where: { id_alumno }
            })
        ])

        const datos = {
            clasesTomadas,
            cantidadCalificaciones: calificaciones._count.calificacion,
            promedioCalificaciones: calificaciones._avg.calificacion,
            resenasDejadas
        }

        return prisma.estadisticaAlumno.upsert({
            where: { id_alumno },
            create: { id_alumno, ...datos },
            update: datos
        })
    },

async obtenerEstadisticas(id_usuario: string, rol: Role, id_rol: string) {

    const usuario = await prisma.usuario.findUnique({
        where: { id_usuario },
        select: { createdAt: true }
    })
    if (!usuario) throw new AppError('Usuario no encontrado', 404)

    const antiguedadMaxima = 5 * 60 * 1000

    if (rol === 'profesor') {
        let actual = await prisma.estadisticaProfesor.findUnique({ where: { id_profesor: id_rol } })

        if (!actual || Date.now() - actual.actualizadoEn.getTime() >= antiguedadMaxima) {
            try {
                actual = await estadisticaService.recalcularEstadisticasProfesor(id_rol)
            } catch (error) {
                if (!actual) throw new AppError('No se pudieron calcular las estadísticas', 500)
            }
        }

        return {
            rol,
            miembroDesde: usuario.createdAt,
            estadisticas: {
                clasesDictadas: actual.clasesDictadas,
                cantidadResenas: actual.cantidadResenas,
                promedioResenas: actual.promedioResenas,
                actualizadoEn: actual.actualizadoEn
            }
        }
    }

    let actual = await prisma.estadisticaAlumno.findUnique({ where: { id_alumno: id_rol } })

    if (!actual || Date.now() - actual.actualizadoEn.getTime() >= antiguedadMaxima) {
        try {
            actual = await estadisticaService.recalcularEstadisticasAlumno(id_rol)
        } catch (error) {
            if (!actual) throw new AppError('No se pudieron calcular las estadísticas', 500)
        }
    }


    return {
        rol,
        miembroDesde: usuario.createdAt,
        estadisticas: {
            clasesTomadas: actual.clasesTomadas,
            cantidadCalificaciones: actual.cantidadCalificaciones,
            promedioCalificaciones: actual.promedioCalificaciones,
            resenasDejadas: actual.resenasDejadas,
            actualizadoEn: actual.actualizadoEn
        }
    }
}
};