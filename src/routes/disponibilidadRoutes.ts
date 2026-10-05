import { Router, Request, Response } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { disponibilidadService } from '../services/disponibilidadService.js'
import { guardarDisponibilidadSchema } from '../schemas/reservaSchema.js'
import { obtenerIdRol, validar } from '../utils/validar.js'

const router = Router()

router.get('/', auth(['profesor']), async (req: Request, res: Response) => {
    const franjas = await disponibilidadService.obtener(obtenerIdRol(req))
    res.status(200).json({ franjas })
})

router.put('/', auth(['profesor']), async (req: Request, res: Response) => {
    const datos = validar(guardarDisponibilidadSchema, req.body)
    const franjas = await disponibilidadService.guardar(obtenerIdRol(req), datos.franjas)
    res.status(200).json({ message: 'Disponibilidad actualizada', franjas })
})

export default router
