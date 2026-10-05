import { Router, Request, Response } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { inscripcionService } from '../services/inscripcionService.js'
import {
    crearInscripcionSchema,
    historialQuerySchema,
    idParamSchema,
    pagarInscripcionSchema
} from '../schemas/reservaSchema.js'
import { obtenerIdRol, validar } from '../utils/validar.js'

const router = Router()

router.post('/', auth(['alumno']), async (req: Request, res: Response) => {
    const datos = validar(crearInscripcionSchema, req.body)
    const resultado = await inscripcionService.reservar(obtenerIdRol(req), datos)
    res.status(201).json({
        message: resultado.urlPago ? 'Reserva creada, falta completar el pago' : 'Reserva confirmada',
        inscripcion: resultado.inscripcion,
        urlPago: resultado.urlPago
    })
})

router.get('/mias', auth(['alumno']), async (req: Request, res: Response) => {
    const { historial } = validar(historialQuerySchema, req.query)
    const inscripciones = await inscripcionService.listarDelAlumno(obtenerIdRol(req), historial === 'true')
    res.status(200).json({ inscripciones })
})

router.get('/:id', auth(['alumno']), async (req: Request, res: Response) => {
    const { id } = validar(idParamSchema, req.params)
    const inscripcion = await inscripcionService.obtener(obtenerIdRol(req), id)
    res.status(200).json({ inscripcion })
})

router.post('/:id/pago', auth(['alumno']), async (req: Request, res: Response) => {
    const { id } = validar(idParamSchema, req.params)
    const { plataforma } = validar(pagarInscripcionSchema, req.body ?? {})
    const resultado = await inscripcionService.generarPago(obtenerIdRol(req), id, plataforma)
    res.status(200).json(resultado)
})

export default router
