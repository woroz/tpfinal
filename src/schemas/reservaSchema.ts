import { z } from 'zod'

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:mm')

export const idParamSchema = z.object({
    id: z.uuid('El identificador no es valido')
})

export const horariosQuerySchema = z.object({
    desde: fecha.optional(),
    hasta: fecha.optional()
})

export const historialQuerySchema = z.object({
    historial: z.enum(['true', 'false']).optional()
})

export const crearInscripcionSchema = z.object({
    id_profesor: z.uuid('El profesor no es valido'),
    id_materia: z.uuid('La materia no es valida'),
    inicio: z.iso.datetime({ offset: true, message: 'La fecha de inicio no es valida' }),
    tema: z.string().trim().max(200, 'El tema no puede tener mas de 200 caracteres').optional(),
    plataforma: z.enum(['web', 'app']).default('web')
})

export const pagarInscripcionSchema = z.object({
    plataforma: z.enum(['web', 'app']).default('web')
})

export const guardarDisponibilidadSchema = z.object({
    franjas: z.array(z.object({
        diaSemana: z.number().int().min(0).max(6),
        desde: hora,
        hasta: hora
    })).max(70, 'Hay demasiadas franjas horarias')
})

export const verificarPagoSchema = z.object({
    payment_id: z.coerce.string().regex(/^\d{1,20}$/, 'El identificador de pago no es valido')
})
