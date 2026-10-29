import {z} from 'zod';

export const solicitudSchema = z.object({
    titulo: z.string().trim().min(1, 'El título no puede estar vacío.').max(100, 'El título es demasiado largo'),
    tema: z.string().trim().min(1, 'El tema no puede estar vacío.').max(50, 'El tema es demasiado largo'),
    descripcion: z.string().trim().max(500, 'La descripción es demasiado larga').optional(),
    ids_materia: z.array(z.string().uuid()).min(1).max(5),
})

export const ofertaSchema = z.object({
    id_materia: z.string().uuid('Materia inválida'),
    mensaje: z.string().trim().max(500, 'El mensaje es demasiado largo').optional(),
    precio: z.coerce.number().int().min(0, 'El precio debe ser mayor o igual a 0'),
    fecha_hora_inicio: z.coerce.date(),
    fecha_hora_fin: z.coerce.date(),
})

export const editarSolicitudSchema = solicitudSchema.partial()
.refine((datos) => Object.keys(datos).length > 0, { message: 'No hay nada para modificar' })