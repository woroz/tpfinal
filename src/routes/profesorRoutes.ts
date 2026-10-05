import { Router, Request, Response } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { horarioService } from '../services/horarioService.js'
import { horariosQuerySchema, idParamSchema } from '../schemas/reservaSchema.js'
import { validar } from '../utils/validar.js'

const router = Router()

router.get('/:id/horarios', auth(), async (req: Request, res: Response) => {
    const { id } = validar(idParamSchema, req.params)
    const { desde, hasta } = validar(horariosQuerySchema, req.query)
    const agenda = await horarioService.obtenerAgenda(id, desde, hasta)
    res.status(200).json(agenda)
})

export default router
