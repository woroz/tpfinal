import { Router, Request, Response, NextFunction } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { uploadAudio } from '../utils/multer.js'
import { AppError } from '../utils/error.js'
import { transcripcionService } from '../services/transcripcionService.js'

const router = Router()

router.post('/:id_clase/transcribir-chunk', auth(['profesor']), uploadAudio.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_clase } = req.params
        const archivo = req.file

        if (!req.user) throw new AppError('Usuario no autenticado', 401)

        if (typeof id_clase !== 'string' || !id_clase) {
            throw new AppError('No se recibió id de clase', 400)
        }

        if (!archivo) throw new AppError('No se recibió archivo de audio', 400)

        const transcripcion = await transcripcionService.transcribirChunk(id_clase, req.user.id_rol, archivo.buffer, archivo.mimetype)
        
        res.status(200).json({ message: 'Transcripción actualizada', transcripcion })
        } catch (error) {
            next(error)
        }
    })

router.get('/:id_clase/transcripcion', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_clase } = req.params

        if (!req.user) throw new AppError('Usuario no autenticado', 401)
        if (typeof id_clase !== 'string' || !id_clase) {
            throw new AppError('No se recibió id de clase', 400)
        }

        const transcripcion = await transcripcionService.obtenerTranscripcion(id_clase, req.user.rol, req.user.id_rol)

        res.status(200).json({ message: 'Transcripción obtenida', transcripcion })
        } catch (error) {
            next(error)
        }
    })

router.patch('/:id_clase/transcripcion/visibilidad', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_clase } = req.params
        const { visible } = req.body

        if (!req.user) throw new AppError('Usuario no autenticado', 401)

        if (typeof id_clase !== 'string' || !id_clase) {
            throw new AppError('No se recibió id de clase', 400)
        }

        if (typeof visible !== 'boolean') {
            throw new AppError('El campo "visible" debe ser true o false', 400)
        }

        const transcripcion = await transcripcionService.cambiarVisibilidad(id_clase, req.user.id_rol, visible)
        
        res.status(200).json({ message: 'Visibilidad actualizada', transcripcion })
    } catch (error) {
        next(error)
    }
})

export default router