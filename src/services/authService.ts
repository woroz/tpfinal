import { hashPassword,verifyPassword } from '../utils/hash.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { prisma } from '../utils/prisma.js'
import { Role } from '../generated/prisma/client.js'
import { JwtUser } from '../types/jwt.js'
import { AppError } from '../utils/error.js'

export const authService = {
    register: async (email: string, password: string, nombre: string, rol: Role) => {
    if (rol === "admin") {
        throw new AppError('No se puede registrar un usuario con rol admin', 400)
    }

    const verificarEmail = await prisma.usuario.findUnique({ where: { email } })
    if (verificarEmail) {
        throw new AppError('El email ya esta registrado', 400)
    }

    const hash = await hashPassword(password)

    const user = await prisma.usuario.create({
        data: {
            email,
            contrasena: hash,
            nombre,
            rol,
            ...(rol === 'profesor' && { profesor: { create: {} } }),
            ...(rol === 'alumno'   && { alumno:   { create: {} } }),
            perfil: { create: { visibilidad: 'publico' } }
        },
        include: {
            profesor: true,
            alumno: true,
            perfil: true
        }
    })

    return { id_usuario: user.id_usuario }
},

    login: async (email: string, password: string) => {
        const user = await prisma.usuario.findUnique({
            where: { email },
            include: {
                profesor: true,
                alumno: true
            }
        })
        if (!user) throw new AppError('Credenciales invalidas', 401)
        
        const validarPassword = await verifyPassword(user.contrasena, password)
        if (!validarPassword) throw new AppError('Credenciales invalidas', 401)
        
        let id_rol: string | undefined;
        if (user.rol === 'profesor') id_rol = user.profesor?.id_profesor;
        if (user.rol === 'alumno')   id_rol = user.alumno?.id_alumno;

        const info: JwtUser = { id_usuario: user.id_usuario, id_rol: id_rol, nombre: user.nombre, email: user.email, rol: user.rol }
        const token = jwt.sign(info, config.jwt.secret, { expiresIn: '1h' })
        const refreshToken = jwt.sign({ id_usuario: user.id_usuario }, config.jwt.refreshSecret, { expiresIn: '7d' })

        return { token, refreshToken }
    },

    refreshToken: async (refreshToken: string) => {
        const token = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id_usuario: string }
        const user = await prisma.usuario.findUnique({ where: { id_usuario: token.id_usuario },
            include: {
                profesor: true,
                alumno: true
            }
        })
        
        if (!user) {
            throw new AppError('Usuario no encontrado', 404)
        }

        let id_rol: string | undefined;
        if (user.rol === 'profesor') id_rol = user.profesor?.id_profesor;
        if (user.rol === 'alumno')   id_rol = user.alumno?.id_alumno;

        const info: JwtUser = {
            id_usuario: user.id_usuario,
            id_rol: id_rol,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol
        }
        const newAccessToken = jwt.sign(info, config.jwt.secret, { expiresIn: '15m' })         
        const newRefreshToken = jwt.sign( { id_usuario: user.id_usuario}, config.jwt.refreshSecret, { expiresIn: '7d' })
        return {newAccessToken, newRefreshToken }
    }
}