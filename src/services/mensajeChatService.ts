import { prismaChat as prisma } from '../utils/prismaChat.js';

export const marcarMensajesComoLeidos = async (
  id_clase: string,
  id_usuario_actual: string
) => {
  return await prisma.mensaje.updateMany({
    where: {
      id_clase,
      NOT: {
        id_usuario_remitente: id_usuario_actual
      },
      leido: false
    },
    data: {
      leido: true
    }
  });
};