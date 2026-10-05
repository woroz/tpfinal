import { config } from '../config/index.js'

const MS_MINUTO = 60_000
const MS_DIA = 86_400_000

export function aHoraLocal(fecha: Date): Date {
    return new Date(fecha.getTime() + config.reservas.zonaOffsetMin * MS_MINUTO)
}

export function minutosDelDia(fecha: Date): number {
    const local = aHoraLocal(fecha)
    return local.getUTCHours() * 60 + local.getUTCMinutes()
}

export function diaSemanaLocal(fecha: Date): number {
    return aHoraLocal(fecha).getUTCDay()
}

export function fechaLocalISO(fecha: Date): string {
    return aHoraLocal(fecha).toISOString().slice(0, 10)
}

export function desdeFechaLocal(fechaISO: string, minutos: number): Date {
    const [anio, mes, dia] = fechaISO.split('-').map(Number)
    return new Date(Date.UTC(anio, mes - 1, dia, 0, minutos) - config.reservas.zonaOffsetMin * MS_MINUTO)
}

export function sumarDiasISO(fechaISO: string, dias: number): string {
    return new Date(Date.parse(`${fechaISO}T00:00:00Z`) + dias * MS_DIA).toISOString().slice(0, 10)
}

export function diasEntre(desde: string, hasta: string): number {
    return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / MS_DIA)
}

export function listarFechas(desde: string, hasta: string): string[] {
    const fechas: string[] = []
    const fin = Date.parse(`${hasta}T00:00:00Z`)
    for (let t = Date.parse(`${desde}T00:00:00Z`); t <= fin; t += MS_DIA) {
        fechas.push(new Date(t).toISOString().slice(0, 10))
    }
    return fechas
}

export function diaSemanaDeFecha(fechaISO: string): number {
    return new Date(`${fechaISO}T12:00:00Z`).getUTCDay()
}

export function aIsoConOffset(fecha: Date): string {
    const local = aHoraLocal(fecha).toISOString().slice(0, 23)
    const offset = config.reservas.zonaOffsetMin
    const signo = offset <= 0 ? '-' : '+'
    const absoluto = Math.abs(offset)
    const horas = String(Math.floor(absoluto / 60)).padStart(2, '0')
    const minutos = String(absoluto % 60).padStart(2, '0')
    return `${local}${signo}${horas}:${minutos}`
}

export function horaAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
}

export function minutosAHora(minutos: number): string {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0')
    const m = String(minutos % 60).padStart(2, '0')
    return `${h}:${m}`
}

export function formatearFechaHora(fecha: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/Argentina/Buenos_Aires'
    }).format(fecha)
}
