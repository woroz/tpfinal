import {z} from 'zod';

export const buscarClaseSchema = z.object({
    consulta: z.string().trim().min(1, 'La consulta no puede estar vacia').max(100, 'La consulta es demasiado larga'),
    latitud: z.number().min(-90, 'La latitud debe estar entre -90 y 90').max(90, 'La latitud debe estar entre -90 y 90'),
    longitud: z.number().min(-180, 'La longitud debe estar entre -180 y 180').max(180, 'La longitud debe estar entre -180 y 180'),
    radio: z.number()
})
