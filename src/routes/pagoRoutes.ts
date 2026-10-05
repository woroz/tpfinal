import { Router, Request, Response } from 'express'
import { inscripcionService } from '../services/inscripcionService.js'
import { mercadoPagoService } from '../services/mercadoPagoService.js'

const router = Router()

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
