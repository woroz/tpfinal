import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { config } from '../config/index.js'
import { horaAMinutos, minutosAHora } from '../utils/fechas.js'

// id_materia vacio/undefined = la franja vale para todas las materias del profesor
type Franja = { diaSemana: number; desde: string; hasta: string; id_materia?: string | null }

export const disponibilidadService = {
    async obtener(idProfesor: string) {
        const filas = await prisma.disponibilidad.findMany({
            where: { id_profesor: idProfesor },
            orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }]
        })
        return filas.map((fila: { diaSemana: number; minutoInicio: number; minutoFin: number; id_materia: string | null }) => ({
            diaSemana: fila.diaSemana,
            desde: minutosAHora(fila.minutoInicio),
            hasta: minutosAHora(fila.minutoFin),
            id_materia: fila.id_materia ?? null
        }))
    },

    async guardar(idProfesor: string, franjas: Franja[]) {
        const normalizadas = franjas
            .map((franja) => ({
                diaSemana: franja.diaSemana,
                minutoInicio: horaAMinutos(franja.desde),
                minutoFin: horaAMinutos(franja.hasta),
                id_materia: franja.id_materia || null
            }))
            .sort((a, b) => a.diaSemana - b.diaSemana || a.minutoInicio - b.minutoInicio)

        // Solo se puede asignar una franja a una materia que el profesor dicta
        const idsPedidos = [...new Set(normalizadas.map((f) => f.id_materia).filter((id): id is string => !!id))]
        if (idsPedidos.length) {
            const dictadas = await prisma.profesorMateria.findMany({
                where: { id_profesor: idProfesor, id_materia: { in: idsPedidos } },
                select: { id_materia: true }
            })
            if (dictadas.length !== idsPedidos.length) {
                throw new AppError('Elegiste una materia que no figura entre las que dictas', 400)
            }
        }

        normalizadas.forEach((franja, indice) => {
            if (franja.minutoFin - franja.minutoInicio < config.reservas.duracionMin) {
                throw new AppError(`Cada franja debe durar al menos ${config.reservas.duracionMin} minutos`, 400)
            }
            const superpuesta = normalizadas.slice(0, indice).some((anterior) =>
                anterior.diaSemana === franja.diaSemana
                && franja.minutoInicio < anterior.minutoFin
                && anterior.minutoInicio < franja.minutoFin
                && (!anterior.id_materia || !franja.id_materia || anterior.id_materia === franja.id_materia)
            )
            if (superpuesta) {
                throw new AppError('Las franjas de una misma materia no pueden superponerse', 400)
            }
        })

        await prisma.$transaction([
            prisma.disponibilidad.deleteMany({ where: { id_profesor: idProfesor } }),
            prisma.disponibilidad.createMany({
                data: normalizadas.map((franja) => ({
                    id_profesor: idProfesor,
                    diaSemana: franja.diaSemana,
                    minutoInicio: franja.minutoInicio,
                    minutoFin: franja.minutoFin,
                    id_materia: franja.id_materia,
                    estado: true
                }))
            })
        ])

        return this.obtener(idProfesor)
    }
}
