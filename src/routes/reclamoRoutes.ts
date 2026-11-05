import { Router, type Request, Response, NextFunction } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { obtenerIdRol } from '../utils/validar.js'
import { crearReclamoSchema, idReclamoSchema, actualizarEstadoReclamoSchema } from '../schemas/reclamoSchema.js'
import { reclamoService } from '../services/reclamoService.js'
import { AppError } from '../utils/error.js'

const router = Router()

router.post('/', auth(['alumno']), validate(crearReclamoSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reclamo = await reclamoService.crear(obtenerIdRol(req), req.body)
        res.status(201).json({ reclamo })
    } catch (error) {
        next(error)
    }
})

router.get('/mios', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reclamos = await reclamoService.listarDelAlumno(obtenerIdRol(req))
        res.status(200).json({ reclamos })
    } catch (error) {
        next(error)
    }
})

router.get('/admin', auth(['admin']), async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const reclamos = await reclamoService.listarParaAdmin()
        res.status(200).json({ reclamos })
    } catch (error) {
        next(error)
    }
})

router.patch('/:id/estado', auth(['admin']), validate(idReclamoSchema, 'params'), validate(actualizarEstadoReclamoSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401)
        }

        if (typeof req.params.id !== 'string') {
            throw new AppError('id de reclamo no proporcionado', 400);
        }

        const reclamo = await reclamoService.actualizarEstado(req.params.id, req.body.estado, req.user.id_usuario)
        res.status(200).json({ reclamo })
    } catch (error) {
        next(error)
    }
})

router.get('/:id', auth(['alumno']), validate(idReclamoSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id !== 'string') {
            throw new AppError('id de reclamo no proporcionado', 400);
        }

        const reclamo = await reclamoService.obtenerDelAlumno(obtenerIdRol(req), req.params.id)
        res.status(200).json({ reclamo })
    } catch (error) {
        next(error)
    }
})

export default router
