import { hashPassword,verifyPassword } from '../utils/hash.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { prisma } from '../utils/prisma.js'
import type { Role } from '../generated/prisma/client.js'
import type { JwtUser } from '../types/jwt.js'
import { AppError } from '../utils/error.js'
 
type Ubicacion = { pais?: string; provincia?: string; ciudad?: string }
 
async function geocodificarDireccion(direccion: string, ubicacion: Ubicacion = {}): Promise<{ latitud: number; longitud: number }> {
    // Si el usuario eligio pais/provincia/ciudad, se agregan a la busqueda para mejorar el resultado.
    const consulta = [direccion, ubicacion.ciudad, ubicacion.provincia, ubicacion.pais]
        .filter(Boolean)
        .join(', ')
 
    const params = new URLSearchParams({
        q: consulta,
        format: 'jsonv2',
        limit: '1',
        'accept-language': 'es'
    })
    // Sin pais elegido se mantiene el comportamiento anterior (solo Argentina).
    if (!ubicacion.pais) params.set('countrycodes', 'ar')
 
    let response: Response
    try {
        response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: {
                'User-Agent': 'MentorAr/1.0 (registro de usuarios)'
            }
        })
    } catch {
        throw new AppError('No se pudo consultar la ubicacion. Intenta nuevamente.', 503)
    }
 
    if (!response.ok) {
        throw new AppError('No se pudo consultar la ubicacion. Intenta nuevamente.', 503)
    }
 
    const resultados = await response.json() as Array<{ lat?: string; lon?: string }>
    const resultado = resultados[0]
    const latitud = Number(resultado?.lat)
    const longitud = Number(resultado?.lon)
 
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
        throw new AppError('No encontramos esa direccion. Inclui calle, numero, ciudad y provincia.', 400)
    }
 
    return { latitud, longitud }
}
 
export const authService = {
    register: async (email: string, password: string, nombre: string, rol: Role, direccion: string, ubicacionElegida: Ubicacion = {}) => {
    if (rol === "admin") {
        throw new AppError('No se puede registrar un usuario con rol admin', 400)
    }
 
    const verificarEmail = await prisma.usuario.findUnique({ where: { email } })
    if (verificarEmail) {
        throw new AppError('El email ya esta registrado', 400)
    }
 
    const hash = await hashPassword(password)
    const ubicacion = await geocodificarDireccion(direccion, ubicacionElegida)
 
    const user = await prisma.usuario.create({
        data: {
            email,
            contrasena: hash,
            nombre,
            rol,
            ...(rol === 'profesor' && {
                profesor: {
                    create: {
                        latitud_prof: ubicacion.latitud,
                        longitud_prof: ubicacion.longitud
                    }
                }
            }),
            ...(rol === 'alumno' && {
                alumno: {
                    create: {
                        latitud_alum: ubicacion.latitud,
                        longitud_alum: ubicacion.longitud
                    }
                }
            }),
            perfil: {
                create: {
                    visibilidad: 'publico',
                    pais: ubicacionElegida.pais ?? null,
                    provincia: ubicacionElegida.provincia ?? null,
                    ciudad: ubicacionElegida.ciudad ?? null
                }
            }
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