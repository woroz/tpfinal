import { z } from 'zod'

export const buscarProfesorSchema = z.object({
    latitud: z.coerce.number().min(-90).max(90),
    longitud: z.coerce.number().min(-180).max(180),
    radio: z.coerce.number().min(0.1).max(100).default(5),
    id_materia: z.string().optional(),
    id_area: z.string().optional()
})

export type buscarProfesorInput = z.infer<typeof buscarProfesorSchema>