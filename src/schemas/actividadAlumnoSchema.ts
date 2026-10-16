import { z } from 'zod'

const camposRegistro = {
    actividad: z.string().trim().max(120).nullable().optional(),
    calificacion: z.number().finite().min(0).nullable().optional(),
    nota: z.string().trim().max(5000).nullable().optional()
}

function tieneContenido(data: { calificacion?: number | null; nota?: string | null }) {
    return data.calificacion !== null && data.calificacion !== undefined
        || Boolean(data.nota?.trim())
}

export const crearRegistroActividadSchema = z.object({
    id_clase: z.uuid('La clase no es valida'),
    id_alumno: z.uuid('El alumno no es valido'),
    ...camposRegistro
}).refine(tieneContenido, 'Ingresa una calificacion numerica o una nota de texto')

export const actualizarRegistroActividadSchema = z.object(camposRegistro)
    .refine(tieneContenido, 'El registro debe incluir una calificacion numerica o una nota de texto')

export const idRegistroActividadSchema = z.object({
    id: z.uuid('El registro no es valido')
})

export const idClaseActividadSchema = z.object({
    id_clase: z.uuid('La clase no es valida')
})
