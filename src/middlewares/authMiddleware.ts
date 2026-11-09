import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/error.js';
import type { JwtUser } from '../types/jwt.js';
import { prisma } from '../utils/prisma.js';

type UserRole = 'profesor' | 'alumno' | 'admin';

declare global {
    namespace Express {
        interface Request {
            user?: JwtUser;
        }
    }
}

export const auth = (roles: UserRole[] = []) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization

        if (!authHeader?.startsWith('Bearer ')) {
            return next(new AppError('No autorizado: Falta token', 401))
        }
        const token = authHeader.split(' ')[1]
        try {
            const info = jwt.verify(token, config.jwt.secret) as JwtUser
            const usuario = await prisma.usuario.findUnique({
                where: {
                    id_usuario: info.id_usuario
                },
                select: {
                    id_usuario: true,
                    rol: true,
                    bloqueado: true
                }
            });

             if (!usuario) {
                return next(new AppError('Usuario no encontrado', 401));
            }

            if (usuario.bloqueado && usuario.rol === 'profesor') {
                return next(new AppError(
                    'Tu cuenta de profesor se encuentra bloqueada',
                    403
                ));
            }

            req.user = info;
            if (roles.length > 0 && !roles.includes(info.rol)) {
                return next(new AppError('Prohibido: Permisos insuficientes', 403));
            }
            next();
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return next(new AppError('Token expirado o invalido', 401));
            }
            return next(error);
        }
    };
};