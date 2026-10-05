import { Router, Request, Response, NextFunction } from 'express'
import { config } from '../config/index.js'
import { loginSchema, registerSchema } from '../schemas/authSchema.js'
import { authService } from '../services/authService.js'
import { AppError } from '../utils/error.js'
import { validate } from '../middlewares/validateMiddleware.js'

const router = Router()

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await authService.register(req.body.email, req.body.password, req.body.nombre, req.body.rol)
        res.status(201).json({ message: "usuario registrado", userId: data.id_usuario })
    } catch (error) {
        next(error)
    }
})

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {token, refreshToken} = await authService.login(req.body.email, req.body.password)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        res.status(200).json({ message: 'Bienvenido', token: token })
    } catch (error) {
        next(error)
    }
})

router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/'
    })

    res.status(200).json({ message: 'sesion cerrada correctamente' })
})

router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) return next(new AppError('No hay token de refresco', 401))

    try {
        const { newAccessToken, newRefreshToken } = await authService.refreshToken(refreshToken)
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        res.status(200).json({ accessToken: newAccessToken })
    } catch (error) {
        next(error)
    }
})

export default router
