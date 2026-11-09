import { prisma } from "../utils/prisma.js";

export const reporteService = {
    crearReporte: async (
        idUsuarioReportante: string, 
        idUsuarioReportado: string, 
        motivo: string
    ) => {
        return await prisma.reporte.create({
            data: {
                id_usuario_reportante: idUsuarioReportante,
                id_usuario_reportado: idUsuarioReportado,
                motivo,
                estado: "PENDIENTE",
            },
        });
    }
};