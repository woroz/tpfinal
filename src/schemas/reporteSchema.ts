import { z } from "zod";

export const crearReporteSchema = z.object({
  id_usuario_reportado: z.string().uuid("El ID del profesor debe ser un ID válido"),
  motivo: z.string().min(3, "El motivo es obligatorio"),
}).passthrough();