import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import { Prisma } from '../generated/prisma/client.js'
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from '../utils/estados.js'
import { minutosAHora } from '../utils/fechas.js'

export const profesorService = {
    buscarProfesores: async (filtros: {
        latitud: number,
        longitud: number,
        radio: number,
        id_materia?: string,
       id_area?: string
    }) => {
        const { latitud, longitud, radio, id_materia, id_area } = filtros;
        console.log('filtros recibidos', filtros)
        console.log('valores: ', {latitud, longitud, radio, id_materia, id_area})
        console.log('tipos: ', {
            latitud: typeof latitud,
            longitud: typeof longitud,
            radio: typeof radio
        })
        
        const filtroMateria = id_materia? Prisma.sql`AND m.id_materia = ${id_materia}`
        : Prisma.empty;
        
        const filtroArea = id_area
        ? Prisma.sql`AND ac.id_area = ${id_area}`
        : Prisma.empty;

        console.log('ejecutando query con: ', {latitud, longitud, radio})

        const profesores = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT
            p.id_profesor,
            p.descripcion,
            p.tarifa,
            p.latitud_prof,
            p.longitud_prof,
            u.nombre,
            u.email,
            (
            6371 * acos(
                cos(radians(${latitud})) * cos(radians(p.latitud_prof)) *
                cos(radians(p.longitud_prof) - radians(${longitud})) +
                sin(radians(${latitud})) * sin(radians(p.latitud_prof))
            )
            ) AS distancia
        FROM "Profesor" p
        JOIN "Usuario" u ON u.id_usuario = p.id_usuario
        LEFT JOIN "profesorMateria" pm ON pm.id_profesor = p.id_profesor
        LEFT JOIN "materia" m ON m.id_materia = pm.id_materia
        LEFT JOIN "areaConocimiento" ac ON ac.id_area = m.id_area_conocimiento
        WHERE p.latitud_prof IS NOT NULL
            AND p.longitud_prof IS NOT NULL
            AND (
            6371 * acos(
                cos(radians(${latitud})) * cos(radians(p.latitud_prof)) *
                cos(radians(p.longitud_prof) - radians(${longitud})) +
                sin(radians(${latitud})) * sin(radians(p.latitud_prof))
            )
            ) <= ${radio}
             ${filtroMateria}
             ${filtroArea}
        ORDER BY distancia ASC, p.id_profesor ASC
        LIMIT 50
        `;
        
        console.log('🔍 Profesores encontrados:', profesores.length);
        console.log('🔍 Primer profesor:', profesores[0]);

        const idsProfesores = profesores.map(profesor => profesor.id_profesor)
        
        const materias = await prisma.profesorMateria.findMany({
            where: { id_profesor: { in: idsProfesores} },
            include: { materia: { include: { areaConocimiento: true }}}
        })

        const clasesDisponibles = await prisma.clase.groupBy ({
            by: ['id_profesor'],
            where: {
                id_profesor: { in: idsProfesores },
                estado: 'disponible'
            },
            _count: { id_clase: true }
        })
        
        return profesores.map(profesor => ({
            ...profesor,
            materias: materias.filter(materia => materia.id_profesor === profesor.id_profesor).map(materia => ({
            id_materia: materia.materia.id_materia,
            nombreMateria: materia.materia.nombreMateria,
            area: materia.materia.areaConocimiento.nombreArea
            })),
            clasesDisponibles: clasesDisponibles.find(
                clase => clase .id_profesor === profesor.id_profesor
            )?._count.id_clase || 0
        }));
    },

    obtenerPerfilPublico: async (id_profesor: string) => {
        const profesor = await prisma.profesor.findUnique ({
            where: { id_profesor: id_profesor },
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        email: true,
                        perfil: true
                    }
                },
                materias: {
                    include: {
                        materia: { include: { areaConocimiento: true } }
                    }
                },
                disponibilidad: {
                    where: { estado: true },
                    orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }]
                },
                resenas: {
                    include: {
                        alumno: { include: { usuario: { select: { nombre: true } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                clases: {
                    where: {
                        estado: ESTADO_CLASE.disponible,
                        fecha_hora_inicio: { gte: new Date() }
                    },
                    include: { materia: true },
                    orderBy: { fecha_hora_inicio: 'asc' }
                }
            }
        })

        if (!profesor) throw new AppError('Profesor no encontrado', 404);

        const promedioResenas = profesor.resenas.length > 0
        ? profesor.resenas.reduce((acc, resena) => acc + resena.puntaje, 0) / profesor.resenas.length
        : null;

        return {
            ...profesor,
            disponibilidad: profesor.disponibilidad.map((franja) => ({
                diaSemana: franja.diaSemana,
                desde: minutosAHora(franja.minutoInicio),
                hasta: minutosAHora(franja.minutoFin),
                id_materia: franja.id_materia
            })),
            promedioResenas
        }
    },

    obtenerClases: async (id_proofesor: string, filtros?: { estado?: string }, soloPublicas = false) => {
        const ahora = new Date()
        const clases = await prisma.clase.findMany({
            where: soloPublicas
                ? {
                    id_profesor: id_proofesor,
                    estado: ESTADO_CLASE.disponible,
                    origen: { not: 'reserva' },
                    fecha_hora_inicio: { gte: ahora }
                }
                : {
                    id_profesor: id_proofesor,
                    ...(filtros?.estado && { estado: filtros.estado })
                },
            include: {
                materia: { include: { areaConocimiento: true } },
                inscripciones: {
                    where: {
                        OR: [
                            { estado: ESTADO_INSCRIPCION.confirmada },
                            { estado: ESTADO_INSCRIPCION.pendientePago, expiraEn: { gt: ahora } }
                        ]
                    },
                    select: { id_inscripcion: true }
                }
            },
            orderBy: { fecha_hora_inicio: 'asc' }
        })

        return clases.map(({ inscripciones, ...clase }) => ({
            ...clase,
            cuposDisponibles: Math.max(clase.cupo_maximo - inscripciones.length, 0)
        }))
    },

    obtenerResenas: async (id_profesor: string) => {
        const resenas = await prisma.resena.findMany({
            where: { id_profesor: id_profesor },
            include: {
                alumno: { include: { usuario: { select: { nombre: true } } } },
                clase: { select: { titulo: true, tema: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        return resenas
    },

    obtenerDisponibilidad: async (id_profesor: string) => {
        const disponibilidad = await prisma.disponibilidad.findMany({
            where: { 
                id_profesor: id_profesor,
                estado: true 
            },
            orderBy: [
                {diaSemana: 'asc'},
                {minutoInicio: 'asc'}
            ]
        })
        return disponibilidad.map((franja) => ({
            diaSemana: franja.diaSemana,
            desde: minutosAHora(franja.minutoInicio),
            hasta: minutosAHora(franja.minutoFin),
            id_materia: franja.id_materia
        }))
    },

    asociarMateria: async (id_profesor: string, id_materia: string) => {
        const materia = await prisma.materia.findUnique({
            where: { id_materia }
        });
        if (!materia) throw new AppError('Materia no encontrada', 404);

        await prisma.profesorMateria.upsert({
            where: {
                id_materia_id_profesor: {
                    id_materia,
                    id_profesor: id_profesor
                }
            },
            update: {},
            create: {
                id_materia,
                id_profesor: id_profesor
            }
        });

        return { message: 'Materia asociada al profesor' };

    },

    obtenerMaterias: async (id_profesor: string) => {
        const relaciones = await prisma.profesorMateria.findMany({
            where: { id_profesor: id_profesor },
            include: {
                materia: { include: { areaConocimiento: true } }
            }
        });

        return relaciones.map(relacion => relacion.materia);
    },

    desasociarMateria: async (id_profesor: string, id_materia: string) => {
        return prisma.$transaction(async (tx) => {
            const eliminada = await tx.profesorMateria.deleteMany({
                where: {
                    id_materia,
                    id_profesor
                }
            });
            if (!eliminada.count) {
                throw new AppError('La materia no estaba asociada al profesor', 404);
            }

            await tx.disponibilidad.deleteMany({
                where: { id_profesor, id_materia }
            });

            return { message: 'Materia desasociada' };
        });
    }
}