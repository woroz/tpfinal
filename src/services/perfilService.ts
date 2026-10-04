import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import { Role } from '../generated/prisma/client.js'

export const perfilService = {
    actualizarPerfil: async (id_usuario: string, rol: Role, datos: {
        nombre?: string;
        biografia?: string;
        avatarURL?: string;
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
    }) => {
        if (datos.nombre !== undefined) {
            await prisma.usuario.update({
                where : { id_usuario: id_usuario },
                data: { nombre: datos.nombre }
            })
        }
        
        if (datos.biografia !== undefined || datos.avatarURL !== undefined || datos.visibilidad !== undefined) {
            await prisma.perfil.update({
                where: { id_usuario: id_usuario },
                data: {
                    ...(datos.biografia !== undefined && { biografia: datos.biografia }),
                    ...(datos.avatarURL !== undefined && { avatarURL: datos.avatarURL }),
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

    

    obtenerPerfil: async (id_usuario: string) => {
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