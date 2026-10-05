import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { config } from '../config/index.js'
import { claseOcupaHorario } from '../utils/ocupacion.js'
import {
    desdeFechaLocal,
    diaSemanaDeFecha,
    diaSemanaLocal,
    diasEntre,
    fechaLocalISO,
    listarFechas,
    minutosDelDia,
    sumarDiasISO
} from '../utils/fechas.js'

const MS_MINUTO = 60_000

type FranjaSemanal = { diaSemana: number; minutoInicio: number; minutoFin: number }

export function encajaEnFranja(franjas: FranjaSemanal[], inicio: Date): boolean {
    const { duracionMin } = config.reservas
    if (inicio.getTime() % MS_MINUTO !== 0) return false
    const dia = diaSemanaLocal(inicio)
    const minuto = minutosDelDia(inicio)
    return franjas.some((franja) =>
        franja.diaSemana === dia
        && minuto >= franja.minutoInicio
        && minuto + duracionMin <= franja.minutoFin
        && (minuto - franja.minutoInicio) % duracionMin === 0
    )
}

export const horarioService = {
    async obtenerAgenda(idProfesor: string, desdeParam?: string, hastaParam?: string) {
        const { duracionMin, anticipacionMin, diasMaximos } = config.reservas
        const ahora = new Date()
        const desde = desdeParam ?? fechaLocalISO(ahora)
        const hasta = hastaParam ?? sumarDiasISO(desde, 29)

        if (diasEntre(desde, hasta) < 0) {
            throw new AppError('La fecha hasta no puede ser anterior a la fecha desde', 400)
        }
        if (diasEntre(desde, hasta) >= diasMaximos) {
            throw new AppError(`El rango no puede superar los ${diasMaximos} dias`, 400)
        }

        const profesor = await prisma.profesor.findUnique({
            where: { id_profesor: idProfesor },
            include: {
                usuario: { select: { nombre: true } },
                materias: { include: { materia: true } },
                disponibilidad: { where: { estado: true } }
            }
        })
        if (!profesor) throw new AppError('Profesor no encontrado', 404)

        const ocupadas: { fecha_hora_inicio: Date; fecha_hora_fin: Date }[] = await prisma.clase.findMany({
            where: {
                id_profesor: idProfesor,
                ...claseOcupaHorario(ahora),
                fecha_hora_inicio: { lt: desdeFechaLocal(sumarDiasISO(hasta, 1), 0) },
                fecha_hora_fin: { gt: desdeFechaLocal(desde, 0) }
            },
            select: { fecha_hora_inicio: true, fecha_hora_fin: true }
        })

        const minimo = new Date(ahora.getTime() + anticipacionMin * MS_MINUTO)
        const franjas: FranjaSemanal[] = profesor.disponibilidad
        const dias: { fecha: string; horarios: { inicio: string; fin: string }[] }[] = []

        for (const fecha of listarFechas(desde, hasta)) {
            const dia = diaSemanaDeFecha(fecha)
            const horarios: { inicio: string; fin: string }[] = []

            for (const franja of franjas.filter((f) => f.diaSemana === dia)) {
                for (let minuto = franja.minutoInicio; minuto + duracionMin <= franja.minutoFin; minuto += duracionMin) {
                    const inicio = desdeFechaLocal(fecha, minuto)
                    const fin = new Date(inicio.getTime() + duracionMin * MS_MINUTO)
                    if (inicio < minimo) continue
                    if (ocupadas.some((o) => o.fecha_hora_inicio < fin && o.fecha_hora_fin > inicio)) continue
                    horarios.push({ inicio: inicio.toISOString(), fin: fin.toISOString() })
                }
            }

            if (horarios.length) {
                horarios.sort((a, b) => a.inicio.localeCompare(b.inicio))
                dias.push({ fecha, horarios })
            }
        }

        const tarifa: number = profesor.tarifa ?? 0

        return {
            profesor: {
                id_profesor: profesor.id_profesor,
                nombre: profesor.usuario.nombre,
                tarifa,
                duracion_min: duracionMin,
                precio_clase: Math.round(tarifa * duracionMin / 60),
                materias: profesor.materias.map((pm: { materia: { id_materia: string; nombreMateria: string } }) => ({
                    id_materia: pm.materia.id_materia,
                    nombre: pm.materia.nombreMateria
                }))
            },
            dias
        }
    }
}
