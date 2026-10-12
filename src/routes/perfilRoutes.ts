import { Router, Request, Response, NextFunction } from 'express'
import { actualizarPerfilSchema } from '../schemas/perfilSchema.js'
import { perfilService } from '../services/perfilService.js'
import { AppError } from '../utils/error.js'
import { auth } from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { upload } from '../utils/multer.js'

const router = Router()

router.get('/', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401)
        }

        const perfil = await perfilService.obtenerPerfil(req.user.id_usuario)
        res.status(200).json({ message: 'Perfil obtenido', perfil })
    } catch (error) {
        next(error)
    }
})

router.patch('/', auth(['profesor', 'alumno']), validate(actualizarPerfilSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401)
        }

        const perfil = await perfilService.actualizarPerfil(
            req.user.id_usuario,
            req.user.rol,
            req.body
        )

        res.status(200).json({ message: 'Perfil actualizado', perfil })
    } catch (error) {
        next(error)
    }
})

router.post('/avatar', auth(['profesor', 'alumno']), upload.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401)
        }
        if (!req.file) {
            throw new AppError('Archivo no proporcionado', 400)
        }

        const perfil = await perfilService.actualizarAvatar(
            req.user.id_usuario,
            req.file
        )

        res.status(200).json({ message: 'Avatar actualizado', perfil })
    } catch (error) {
        next(error)
    }
})

export default router
