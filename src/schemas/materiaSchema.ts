import { z } from 'zod';

export const crearMateriaSchema = z.object({
    nombreMateria: z.string().min(1).max(100),
    id_area_conocimiento: z.string().uuid()
});

export const asociarMateriaSchema = z.object({
    id_materia: z.string().uuid()
});
