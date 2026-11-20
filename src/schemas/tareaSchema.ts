import { z } from 'zod'

const fechaLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Fecha inválida')

const titulo = z.string().trim().min(1, 'El título no puede estar vacío.').max(100, 'El título es demasiado largo')
const descripcion = z.string().trim().max(1000, 'La descripción es demasiado larga')

export const crearTareaSchema = z.object({
    id_clase: z.string().uuid('Clase inválida'),
    titulo,
    descripcion: descripcion.optional(),
    fechaLimite: fechaLocal.optional(),
    id_alumno: z.array(z.string().uuid('Alumno inválido')).min(1, 'Elegí al menos un alumno').max(50),
})

export const editarTareaSchema = z.object({
    titulo: titulo.optional(),
    descripcion: descripcion.optional(),
    fechaLimite: fechaLocal.nullable().optional(),
}).refine((datos) => Object.keys(datos).length > 0, { message: 'No hay nada para modificar' })

export const calificarSchema = z.object({
    nota: z.number().min(0, 'La nota mínima es 0').max(10, 'La nota máxima es 10'),
    comentario: z.string().trim().max(500, 'El comentario es demasiado largo').optional(),
})

export const entregarSchema = z.object({
    entregaTexto: z.string().trim().max(5000, 'El texto es demasiado largo').optional(),
})