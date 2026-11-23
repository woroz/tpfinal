import { z } from 'zod';

const opcionSchema = z.object({
    texto: z.string()
        .trim()
        .min(1, 'La opción no puede estar vacía')
        .max(300, 'La opción es demasiado larga'),
    es_correcto: z.boolean()
});

const preguntaSchema = z.object({
    enunciado: z.string()
        .trim()
        .min(1, 'El enunciado no puede estar vacío')
        .max(1000, 'El enunciado es demasiado largo'),
    orden: z.number().int().min(1),
    opciones: z.array(opcionSchema)
        .min(2, 'Cada pregunta debe tener al menos dos opciones')
        .max(6, 'Cada pregunta puede tener hasta seis opciones')
}).refine(
    (pregunta) => pregunta.opciones.filter(o => o.es_correcto).length === 1,
    { message: 'Cada pregunta debe tener exactamente una respuesta correcta' }
);

export const crearQuizSchema = z.object({
    id_clase: z.string().uuid('Clase inválida'),
    titulo: z.string()
        .trim()
        .min(1, 'El título no puede estar vacío')
        .max(100, 'El título es demasiado largo'),
    preguntas: z.array(preguntaSchema)
        .min(1, 'El quiz debe tener al menos una pregunta')
        .max(50, 'El quiz puede tener hasta 50 preguntas')
}).refine(
    (quiz) => new Set(quiz.preguntas.map(p => p.orden)).size === quiz.preguntas.length,
    { message: 'No puede haber preguntas con el mismo orden' }
);

export const cambiarEstadoQuizSchema = z.object({
    estado: z.boolean()
});

export const responderQuizSchema = z.object({
    respuestas: z.array(z.object({
        id_pregunta: z.string().uuid(),
        id_opcion: z.string().uuid()
    })).min(1, 'Debés responder al menos una pregunta')
});
