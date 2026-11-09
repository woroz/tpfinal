import { Server, Socket } from 'socket.io';
import { prismaChat as prisma } from '../utils/prismaChat.js';
import { marcarMensajesComoLeidos } from './mensajeChatService.js';

export const initSocketService = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    const id_usuario_actual = socket.data.usuario.id_usuario;
    const verificarUsuarioHabilitado = async (): Promise<boolean> => {
      const usuario = await prisma.usuario.findUnique({
        where: {
          id_usuario: id_usuario_actual
        },
        select: {
          rol: true,
          bloqueado: true
        }
      });

      if (!usuario) {
        socket.disconnect(true);
        return false;
      }

      if (usuario.bloqueado && usuario.rol === 'profesor') {
        socket.emit('error_socket', {
          mensaje: 'Tu cuenta de profesor se encuentra bloqueada.'
        });

        socket.disconnect(true);
        return false;
      }

      return true;
    };

    socket.on('unirse_clase', async (data: { id_clase: string }) => {
      const { id_clase } = data;
      try {
        if (!(await verificarUsuarioHabilitado())) {
          return;
        }
        const clase = await prisma.clase.findUnique({
          where: { id_clase },
          select: {
            id_clase: true,
            profesor: {
              select: { id_usuario: true }
            },
            inscripciones: {
              select: {
                alumno: {
                  select: { id_usuario: true }
                }
              }
            }
          }
        });
        if (!clase) {
          socket.emit('error_socket', { mensaje: 'La clase especificada no existe.' });
          return;
        }

        const esProfesorDeLaClase = clase.profesor.id_usuario === id_usuario_actual;
        const esAlumnoInscrito = clase.inscripciones.some(
          ins => ins.alumno.id_usuario === id_usuario_actual
        );

        if (!esProfesorDeLaClase && !esAlumnoInscrito) {
          console.warn(`Acceso no autorizado del usuario ${id_usuario_actual} a la clase ${id_clase}`);
          socket.emit('error_socket', { mensaje: 'No tienes permiso para ver el chat de esta clase.' });
          return;
        }

        socket.join(id_clase);
        console.log(`Acceso autorizado: Usuario ${socket.id} se unió a la sala: ${id_clase}`);

        await marcarMensajesComoLeidos(id_clase, id_usuario_actual);

        io.to(id_clase).emit('mensajes_leidos_actualizados', {
          id_clase,
          por_usuario: id_usuario_actual
        });

      } catch (error) {
        console.error('Error en validación de seguridad de socket:', error);
        socket.emit('error_socket', { mensaje: 'Ocurrió un error de validación en el servidor.' });
      }
    });

    socket.on('marcar_mensajes_leidos', async (data: { id_clase: string }) => {
      const { id_clase } = data;

      try {
        if (!(await verificarUsuarioHabilitado())) {
          return;
        }
        if (!socket.rooms.has(id_clase)) {
          socket.emit('error_socket', { mensaje: 'No tienes acceso a esta sala.' });
          return;
        }

        await marcarMensajesComoLeidos(id_clase, id_usuario_actual);

        io.to(id_clase).emit('mensajes_leidos_actualizados', {
          id_clase,
          por_usuario: id_usuario_actual
        });

      } catch (error) {
        console.error('Error al actualizar vistos:', error);
      }
    });

    socket.on('enviar_mensaje', async (data: {
      id_clase: string;
      contenido: string;
    }) => {
      const { id_clase, contenido } = data;

      try {
        if (!(await verificarUsuarioHabilitado())) {
          return;
        }
        if (!socket.rooms.has(id_clase)) {
          socket.emit('error_socket', { mensaje: 'No tienes acceso a esta sala.' });
          return;
        }

        if (typeof contenido !== 'string' || !contenido.trim()) {
          socket.emit('error_socket', { mensaje: 'El mensaje no puede estar vacío.' });
          return;
        }

        const nuevoMensaje = await prisma.mensaje.create({
          data: {
            contenido: contenido.trim(),
            id_clase,
            id_usuario_remitente: id_usuario_actual,
            fecha_envio: new Date(),
            leido: false
          }
        });

        io.to(id_clase).emit('recibir_mensaje', nuevoMensaje);

      } catch (error) {
        console.error('Error al procesar el mensaje en el socket:', error);
        socket.emit('error_socket', { mensaje: 'No se pudo enviar el mensaje' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado del socket: ${socket.id}`);
    });
  });
};
