import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/error.js';
import { JwtUser } from '../types/jwt.js';

type UserRole = 'profesor' | 'alumno' | 'admin';

export const auth = (roles: UserRole[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization

        if (!authHeader?.startsWith('Bearer ')) {
            return next(new AppError('No autorizado: Falta token', 401))
        }

        const token = authHeader.split(' ')[1]

        try {
            const info = jwt.verify(token, config.jwt.secret) as JwtUser
            req.user = info

            if (roles.length > 0 && !roles.includes(info.rol)) {
                return next(new AppError('Prohibido: Permisos insuficientes', 403))
            }
            next()
        } catch (error) {
            return next(new AppError('Token expirado o invalido', 401))
        }
    }
}
