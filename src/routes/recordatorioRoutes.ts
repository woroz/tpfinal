import { Router, type Request, type Response, type NextFunction } from 'express'
import { config } from '../config/index.js'
import { AppError } from '../utils/error.js'
import { recordatorioService } from '../services/recordatorioService.js'

const router = Router()

const procesar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.headers.authorization !== `Bearer ${config.CRON.secret}`) {
            throw new AppError('No autorizado', 401)
        }
        const resultado = await recordatorioService.procesar()
        res.status(200).json(resultado)
    } catch (error) {
        next(error)
    }
}

router.post('/procesar', procesar)
router.get('/procesar', procesar)

export default router
