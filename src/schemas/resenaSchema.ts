import { z } from 'zod'

export const crearResenaSchema = z.object({
    id_clase: z.uuid('La clase no es valida'),
    puntaje: z.number().min(0.5).max(5).multipleOf(0.5),
    comentario: z.string().trim().max(1000, 'El comentario no puede tener mas de 1000 caracteres').optional()
})
