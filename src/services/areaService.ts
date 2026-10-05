import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';

export const areaService = {
    async listar() {
        return await prisma.areaConocimiento.findMany({
            include: { _count: { select: { materias: true } } },
            orderBy: { nombreArea: 'asc' }
        });
    },

    async obtener(id_area: string) {
        const area = await prisma.areaConocimiento.findUnique({
            where: { id_area },
            include: { materias: true }
        });
        if (!area) throw new AppError('Area no encontrada', 404);
        return area 
    },

    async crear(nombreArea: string) {
        const areaExistente = await prisma.areaConocimiento.findFirst({
            where : {
                nombreArea: {
                    equals: nombreArea,
                    mode: 'insensitive'
                }
            }
        })
        if (areaExistente) {
            return await prisma.areaConocimiento.update({
                where: { id_area: areaExistente.id_area },
                data: { nombreArea }
            });
        }

        return await prisma.areaConocimiento.create({
            data: {
                nombreArea
            }
        })
    }
};