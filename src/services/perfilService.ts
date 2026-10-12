import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import type { Role } from '../generated/prisma/client.js'
import { verificarImagen } from '../utils/moderacion.js'
import { put, del } from '@vercel/blob'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

export const perfilService = {
    async actualizarPerfil (id_usuario: string, rol: Role, datos: {
        nombre?: string;
        biografia?: string;
        visibilidad?: 'publico' | 'privado';
        //alumno
        nivel_educativo?: string;
        longitud_alum?: number;
        latitud_alum?: number;
        //profesor
        tarifa?: number;
        descripcion?: string;
        longitud_prof?: number;
        latitud_prof?: number;
    }) {
        if (datos.nombre !== undefined) {
            await prisma.usuario.update({
                where : { id_usuario: id_usuario },
                data: { nombre: datos.nombre }
            })
        }
        
        if (datos.biografia !== undefined || datos.visibilidad !== undefined) {
            await prisma.perfil.update({
                where: { id_usuario: id_usuario },
                data: {
                    ...(datos.biografia !== undefined && { biografia: datos.biografia }),
                    ...(datos.visibilidad !== undefined && { visibilidad: datos.visibilidad })
                }
            });
        }
        if (rol === 'profesor') {
            const profesor = await prisma.profesor.findUnique({
                where: { id_usuario: id_usuario }
            });

            if (!profesor) throw new AppError('Profesor no encontrado', 404);

            await prisma.profesor.update({
                where: { id_usuario: id_usuario },
                data: {
                    ...(datos.tarifa !== undefined && { tarifa: datos.tarifa }),
                    ...(datos.descripcion !== undefined && { descripcion: datos.descripcion }),
                    ...(datos.latitud_prof !== undefined && { latitud_prof: datos.latitud_prof }),
                    ...(datos.longitud_prof !== undefined && { longitud_prof: datos.longitud_prof })
                }
            });
        }
        if (rol === 'alumno') {
            const alumno = await prisma.alumno.findUnique({
                where: { id_usuario: id_usuario }
            });

            if (!alumno) throw new AppError('Alumno no encontrado', 404);

            await prisma.alumno.update({
                where: { id_usuario: id_usuario },
                data: {
                    ...(datos.nivel_educativo !== undefined && { nivel_educativo: datos.nivel_educativo }),
                    ...(datos.latitud_alum !== undefined && { latitud_alum: datos.latitud_alum }),
                    ...(datos.longitud_alum !== undefined && { longitud_alum: datos.longitud_alum })
                }
            })
        }
        return await perfilService.obtenerPerfil(id_usuario)
    },

    async actualizarAvatar(id_usuario: string, file: Express.Multer.File) {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
            throw new AppError('Formato no permitido (usa jpg, png o webp)', 400)
        }
        const validacionAvatar = await verificarImagen(file.buffer, file.mimetype);

        if (!validacionAvatar) {
            throw new AppError('El avatar contiene contenido inapropiado', 400);
        }

        const perfilActual = await prisma.perfil.findUnique({
            where: { id_usuario },
            select: { avatarURL: true }
        })
        const type = file.mimetype.split('/')[1]

        const blob = await put(`avatars/${id_usuario}/avatar.${type}`, file.buffer, {
            access: 'public',
            contentType: file.mimetype,
            addRandomSuffix: true,
        })

        try {
            await prisma.perfil.update({
                where: { id_usuario },
                data: { avatarURL: blob.url }
            })
        } catch (error) {
            await del(blob.url)
            throw error
        }

        if (perfilActual?.avatarURL) {
            try {
                await del(perfilActual.avatarURL)
            } catch (error) {
                console.error('Error al eliminar el avatar anterior:', error)
            }
        }
        return await perfilService.obtenerPerfil(id_usuario)
    },

    async obtenerPerfil (id_usuario: string) {
        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario: id_usuario },
            include: {
                perfil: true,
                profesor: true,
                alumno: true
            }
        })

        if (!usuario) throw new AppError('Usuario no encontrado', 404);

        const { contrasena, ...usuarioSinPassword } = usuario;
        return usuarioSinPassword
    }
}