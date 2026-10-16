import { Router, type Request, type Response, type NextFunction } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { actividadAlumnoService } from '../services/actividadAlumnoService.js'
import {
    actualizarRegistroActividadSchema,
    crearRegistroActividadSchema,
    idClaseActividadSchema,
    idRegistroActividadSchema
} from '../schemas/actividadAlumnoSchema.js'
import { obtenerIdRol, validar } from '../utils/validar.js'

const router = Router()

router.get('/mias', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const registros = await actividadAlumnoService.listarDelAlumno(obtenerIdRol(req))
        res.status(200).json({ registros })
    } catch (error) {
        next(error)
    }
})

router.get('/clases/:id_clase', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_clase } = validar(idClaseActividadSchema, req.params)
        const resultado = await actividadAlumnoService.listarDeClase(obtenerIdRol(req), id_clase)
        res.status(200).json(resultado)
    } catch (error) {
        next(error)
    }
})

router.post('/', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const datos = validar(crearRegistroActividadSchema, req.body)
        const registro = await actividadAlumnoService.crear(obtenerIdRol(req), datos)
        res.status(201).json({ registro })
    } catch (error) {
        next(error)
    }
})

router.patch('/:id', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = validar(idRegistroActividadSchema, req.params)
        const datos = validar(actualizarRegistroActividadSchema, req.body)
        const registro = await actividadAlumnoService.actualizar(obtenerIdRol(req), id, datos)
        res.status(200).json({ registro })
    } catch (error) {
        next(error)
    }
})

export default router
