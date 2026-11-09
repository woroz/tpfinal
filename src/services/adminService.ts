import { prisma } from '../utils/prisma.js';
import type { Role } from '../generated/prisma/client.js';
import { AppError } from '../utils/error.js';

interface FiltrosUsuarios {
    busqueda?: string;
    rol?: Role;
    pagina?: number;
    limite?: number;
}

export const adminService = {

    obtenerUsuarios: async (filtros: FiltrosUsuarios = {}) => {
        const pagina = filtros.pagina ?? 1;
        const limite = filtros.limite ?? 10;

        if (!Number.isInteger(pagina) || pagina < 1) {
            throw new AppError('Número de página inválido', 400);
        }
        if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
            throw new AppError('El límite debe estar entre 1 y 100', 400);
        }
        const where = {
            ...(filtros.rol && { rol: filtros.rol }),
            ...(filtros.busqueda && {
                OR: [
                    {
                        nombre: {
                            contains: filtros.busqueda,
                            mode: 'insensitive' as const
                        }
                    },
                    {
                        email: {
                            contains: filtros.busqueda,
                            mode: 'insensitive' as const
                        }
                    }
                ]
            })
        };

        const [usuarios, total] = await prisma.$transaction([
            prisma.usuario.findMany({
                where,
                skip: (pagina - 1) * limite,
                take: limite,
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id_usuario: true,
                    nombre: true,
                    email: true,
                    rol: true,
                    bloqueado: true,
                    createdAt: true,

                    alumno: {
                        select: {
                            id_alumno: true,
                            nivel_educativo: true
                        }
                    },

                    profesor: {
                        select: {
                            id_profesor: true,
                            tarifa: true,
                            descripcion: true
                        }
                    }
                }
            }),

            prisma.usuario.count({ where })
        ]);

        return {
            usuarios,
            paginacion: {
                total,
                pagina,
                limite,
                totalPaginas: Math.ceil(total / limite)
            }
        };
    },

    obtenerEstadisticas: async () => {
        const [
            totalUsuarios,
            totalAlumnos,
            totalProfesores
        ] = await prisma.$transaction([
            prisma.usuario.count(),
            prisma.usuario.count({
                where: { rol: 'alumno' }
            }),
            prisma.usuario.count({
                where: { rol: 'profesor' }
            })
        ]);

        return {
            totalUsuarios,
            totalAlumnos,
            totalProfesores
        };
    },

    obtenerTodosLosReportes: async () => {
        const reportes = await prisma.reporte.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                reportante: {
                    select: {
                        id_usuario: true,
                        nombre: true,
                        email: true
                    }
                },
                reportado: {
                    select: {
                        id_usuario: true,
                        nombre: true,
                        email: true,
                        bloqueado: true
                    }
                }
            }
        });

        return reportes;
    },

    cambiarEstadoBloqueoProfesor: async (
    idUsuario: string,
    bloqueado: boolean) => {
    const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: idUsuario },
        select: {
            id_usuario: true,
            nombre: true,
            email: true,
            rol: true,
            bloqueado: true
        }
    });

    if (!usuario) {
        throw new AppError('Usuario no encontrado', 404);
    }

    if (usuario.rol !== 'profesor') {
        throw new AppError(
            'Solo se pueden bloquear o desbloquear profesores',
            400
        );
    }

    const profesorActualizado = await prisma.usuario.update({
        where: { id_usuario: idUsuario },
        data: { bloqueado },
        select: {
            id_usuario: true,
            nombre: true,
            email: true,
            rol: true,
            bloqueado: true
        }
    });
    return profesorActualizado;
    },
};
