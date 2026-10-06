import { Router, Request, Response } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { inscripcionService } from '../services/inscripcionService.js'
import { mercadoPagoService } from '../services/mercadoPagoService.js'
import { verificarPagoSchema } from '../schemas/reservaSchema.js'
import { obtenerIdRol, validar } from '../utils/validar.js'

const router = Router()

router.get('/mios', auth(['alumno']), async (req: Request, res: Response) => {
    const pagos = await inscripcionService.listarPagosDelAlumno(obtenerIdRol(req))
    res.status(200).json({ pagos })
})

router.post('/verificar', auth(['alumno']), async (req: Request, res: Response) => {
    const { payment_id } = validar(verificarPagoSchema, req.body)
    const inscripcion = await inscripcionService.verificarPago(obtenerIdRol(req), payment_id)
    res.status(200).json({ inscripcion })
})

router.post('/webhook', async (req: Request, res: Response) => {
    const tipo = req.query.type ?? req.query.topic ?? req.body?.type
    const idDato = String(req.query['data.id'] ?? req.query.id ?? req.body?.data?.id ?? '')

    if (tipo !== 'payment' || !idDato) {
        return res.sendStatus(200)
    }

    if (!mercadoPagoService.firmaValida(req.headers, idDato)) {
        return res.sendStatus(401)
    }

    await inscripcionService.procesarNotificacionPago(idDato)
    res.sendStatus(200)
})

export default router
