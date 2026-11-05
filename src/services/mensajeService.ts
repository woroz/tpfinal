import { prisma } from '../utils/prisma.js';

export const getHistorialChatByClase = async (id_clase: string) => {
  const claseExiste = await prisma.clase.findUnique({
    where: { id_clase }
  });
if (!claseExiste) {
    return null;
  }

  return await prisma.mensaje.findMany({
    where: { id_clase },
    orderBy: {
      fecha_envio: 'asc'
    },
    include: {
      remitente: {
        select: {
          id_usuario: true,
          nombre: true,
          rol: true
        }
      }
    }
  });
};