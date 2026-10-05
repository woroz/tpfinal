import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/error.js'

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({ status: error.status, message: error.message })
    }

    if (error instanceof SyntaxError && (error as { status?: number }).status === 400) {
        return res.status(400).json({ status: 'fail', message: 'El cuerpo de la solicitud no es un JSON valido' })
    }

    console.error('Error no controlado', { error })
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' })
}
