import { z } from "zod";

export const cambiarVisibilidadSchema = z.object({
    visibilidad: z.boolean()
})