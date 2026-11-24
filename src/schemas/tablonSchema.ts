import {z} from 'zod';

const catalogo = new Map<string, string[]>([
    ['cartografia', ['Lectura de mapas', 'Coordenadas geográficas', 'Escalas cartográficas']],
    ['ecuaciones', ['Ecuaciones de primer grado', 'Sistemas de ecuaciones']],
    ['matematica', ['Ecuaciones de primer grado', 'Sistemas de ecuaciones', 'Funciones', 'Geometría']],
    ['fisica', ['Cinemática', 'Dinámica']],
    ['idiomas', ['Comprensión lectora', 'Gramática', 'Conversación']],
    ['quimica', ['Estructura atómica', 'Reacciones químicas']],
    ['informatica', ['Programación']],
]);

export const temasTablon = [...new Set([...catalogo.values()].flat())];

export function temasDeMateria(nombre: string) {
    const clave = nombre.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return catalogo.get(clave) ?? [];
}

export const solicitudSchema = z.object({
    titulo: z.string().trim().min(1, 'El título no puede estar vacío.').max(100, 'El título es demasiado largo'),
    tema: z.string().trim().min(1, 'Elegí o escribí un tema.').max(50, 'El tema admite hasta 50 caracteres.'),
    descripcion: z.string().trim().max(500, 'La descripción es demasiado larga').optional(),
    ids_materia: z.array(z.string().uuid()).length(1, 'Elegí una sola materia.'),
})

const fechaOferta = z.preprocess(valor => {
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(valor)) {
        return valor + '-03:00';
    }
    return valor;
}, z.coerce.date());

export const ofertaSchema = z.object({
    id_materia: z.string().uuid('Materia inválida'),
    mensaje: z.string().trim().max(500, 'El mensaje es demasiado largo').optional(),
    precio: z.coerce.number().int().min(0, 'El precio debe ser mayor o igual a 0'),
    fecha_hora_inicio: fechaOferta,
    fecha_hora_fin: fechaOferta,
})

export const editarSolicitudSchema = solicitudSchema.partial()
.refine((datos) => Object.keys(datos).length > 0, { message: 'No hay nada para modificar' })
