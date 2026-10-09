import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { auth } from '../middlewares/authMiddleware.js'
import { obtenerIdRol } from '../utils/validar.js'
import { claseService } from '../services/claseService.js'
import { AppError } from '../utils/error.js'

const router = Router()

const horarioSchema = z.object({
  fecha_hora_inicio: z.string().min(1),
  fecha_hora_fin: z.string().min(1)
})

// PATCH /clases/:id/horario   body: { fecha_hora_inicio, fecha_hora_fin }
router.patch('/:id/horario', auth(['profesor']), async (req: Request, res: Response) => {
  const parsed = horarioSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError('Fechas invalidas', 400)

  const clase = await claseService.cambiarHorario(
    obtenerIdRol(req),
    String(req.params.id),
    parsed.data.fecha_hora_inicio,
    parsed.data.fecha_hora_fin
  )
  res.status(200).json({ message: 'Horario actualizado y alumnos notificados', clase })
})

export default router
