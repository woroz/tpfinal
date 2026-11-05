import { z } from 'zod'

export const crearReclamoSchema = z.object({
    id_clase: z.uuid('La clase no es valida'),
    motivo: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres').max(2000, 'El motivo no puede superar los 2000 caracteres')
})

export const idReclamoSchema = z.object({
    id: z.uuid('El reclamo no es valido')
})

export const actualizarEstadoReclamoSchema = z.object({
    estado: z.enum(['pendiente', 'en_revision', 'resuelto', 'rechazado'])
})
