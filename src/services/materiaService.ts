import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';

export const materiaService = {
    async listar (filtros?: { id_area?: string }) {
        return await prisma.materia.findMany({
            where: {
                ...(filtros?.id_area && { id_area_conocimiento: filtros.id_area })
            },
            include: {
                areaConocimiento: true
            },
            orderBy: { nombreMateria: 'asc' }
        });
    },

    async obtener (id_materia: string) {
        const materia = await prisma.materia.findUnique({
            where: { id_materia },
            include: { areaConocimiento: true }
        });
        if (!materia) throw new AppError('Materia no encontrada', 404);
        return materia;
    },

    crear: async (nombreMateria: string, id_area_conocimiento: string) => {
        const area = await prisma.areaConocimiento.findUnique({
            where: { id_area: id_area_conocimiento }
        });
        if (!area) throw new AppError('El área de conocimiento no existe', 404);

        const materiaExistente = await prisma.materia.findFirst({
            where: {
                nombreMateria: {
                    equals: nombreMateria,
                    mode: 'insensitive'
                }
            }
        });

        if (materiaExistente) {
            return await prisma.materia.update({
                where: { id_materia: materiaExistente.id_materia },
                data: { id_area_conocimiento },
                include: { areaConocimiento: true }
            });
        }

        return await prisma.materia.create({
            data: {
                nombreMateria,
                id_area_conocimiento
            },
            include: { areaConocimiento: true }
        });
    },

    async buscarPorNombre (nombre: string) {
        return await prisma.materia.findMany({
            where: {
                nombreMateria: {
                    contains: nombre,
                    mode: 'insensitive'
                }
            },
            include: { areaConocimiento: true },
            take: 10
        });
    }
};