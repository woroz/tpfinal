import { Router, Request, Response } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { notificacionService } from '../services/notificacionService.js'
import { idParamSchema } from '../schemas/reservaSchema.js'
import { obtenerIdUsuario, validar } from '../utils/validar.js'

const router = Router()

router.get('/', auth(), async (req: Request, res: Response) => {
    const notificaciones = await notificacionService.listar(obtenerIdUsuario(req))
    res.status(200).json({ notificaciones })
})

router.patch('/:id/leida', auth(), async (req: Request, res: Response) => {
    const { id } = validar(idParamSchema, req.params)
    await notificacionService.marcarLeida(obtenerIdUsuario(req), id)
    res.status(200).json({ message: 'Notificacion marcada como leida' })
})

export default router
