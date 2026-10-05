import { z } from 'zod';

export const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1).max(30).optional(),
  biografia: z.string().max(500).optional(),
  avatarURL: z.string().url().optional(),
  visibilidad: z.enum(['publico', 'privado']).optional(),
  nivel_educativo: z.string().max(50).optional(),
  latitud_alum: z.number().min(-90).max(90).optional(),
  longitud_alum: z.number().min(-180).max(180).optional(),
  tarifa: z.number().int().min(0).optional(),
  descripcion: z.string().max(500).optional(),
  latitud_prof: z.number().min(-90).max(90).optional(),
  longitud_prof: z.number().min(-180).max(180).optional()
});