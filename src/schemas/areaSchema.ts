import { z } from 'zod';

export const crearAreaSchema = z.object({
    nombreArea: z.string().min(1).max(100)
});