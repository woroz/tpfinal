import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/error.js'
import multer from 'multer'

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({ status: error.status, message: error.message })
    }

    if (error instanceof SyntaxError && (error as { status?: number }).status === 400) {
        return res.status(400).json({ status: 'fail', message: 'El cuerpo de la solicitud no es un JSON valido' })
    }
    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande' : 'Error al subir el archivo'
        return res.status(400).json({ status: 'error', message })
    }

    console.error('Error no controlado', { error })
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' })
}
