import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { config } from '../config/index.js'
import { horaAMinutos, minutosAHora } from '../utils/fechas.js'

type Franja = { diaSemana: number; desde: string; hasta: string }

export const disponibilidadService = {
    async obtener(idProfesor: string) {
        const filas = await prisma.disponibilidad.findMany({
            where: { id_profesor: idProfesor },
            orderBy: [{ diaSemana: 'asc' }, { minutoInicio: 'asc' }]
        })
        return filas.map((fila: { diaSemana: number; minutoInicio: number; minutoFin: number }) => ({
            diaSemana: fila.diaSemana,
            desde: minutosAHora(fila.minutoInicio),
            hasta: minutosAHora(fila.minutoFin)
        }))
    },

    async guardar(idProfesor: string, franjas: Franja[]) {
        const normalizadas = franjas
            .map((franja) => ({
                diaSemana: franja.diaSemana,
                minutoInicio: horaAMinutos(franja.desde),
                minutoFin: horaAMinutos(franja.hasta)
            }))
            .sort((a, b) => a.diaSemana - b.diaSemana || a.minutoInicio - b.minutoInicio)

        normalizadas.forEach((franja, indice) => {
            if (franja.minutoFin - franja.minutoInicio < config.reservas.duracionMin) {
                throw new AppError(`Cada franja debe durar al menos ${config.reservas.duracionMin} minutos`, 400)
            }
            const anterior = normalizadas[indice - 1]
            if (anterior && anterior.diaSemana === franja.diaSemana && franja.minutoInicio < anterior.minutoFin) {
                throw new AppError('Las franjas de un mismo dia no pueden superponerse', 400)
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
                    estado: true
                }))
            })
        ])

        return this.obtener(idProfesor)
    }
}
