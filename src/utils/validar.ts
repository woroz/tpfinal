import type { Request } from 'express'
import type { z } from 'zod'
import { AppError } from './error.js'

export function validar<T extends z.ZodType>(schema: T, datos: unknown): z.output<T> {
    const resultado = schema.safeParse(datos)
    if (!resultado.success) {
        throw new AppError(resultado.error.issues[0].message, 400)
    }
    return resultado.data
}

export function obtenerIdRol(req: Request): string {
    const id = req.user?.id_rol
    if (!id) throw new AppError('El usuario no tiene un perfil asociado', 403)
    return id
}

export function obtenerIdUsuario(req: Request): string {
    const id = req.user?.id_usuario
    if (!id) throw new AppError('Usuario no autenticado', 401)
    return id
}
