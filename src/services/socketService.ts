import { Server, Socket } from 'socket.io';
import { prisma } from '../utils/prisma.js'; 
import { marcarMensajesComoLeidos } from './mensajeService.js';

export const initSocketService = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Usuario conectado al socket: ${socket.id}`);
   
    socket.on('unirse_clase', async (data: { id_clase: string; id_usuario_actual: string }) => {
      const { id_clase, id_usuario_actual } = data;
      try {
        const clase = await prisma.clase.findUnique({
          where: { id_clase },
          select: {
            id_clase: true,
            profesor: {
              select: {
                id_usuario: true
              }},
              inscripciones: {
                select: {
                  alumno: {
                    select: {
                      id_usuario: true
          }}}}}});
        
        if (!clase) {
          socket.emit('error_socket', { mensaje: 'La clase especificada no existe.' });
          return;
        }
        
        const esProfesorDeLaClase = clase.profesor.id_usuario === id_usuario_actual;
        const esAlumnoInscrito = clase.inscripciones.some(ins => ins.alumno.id_usuario === id_usuario_actual);

        if (!esProfesorDeLaClase && !esAlumnoInscrito) {
          console.warn(`Acceso no autorizado del usuario ${id_usuario_actual} a la clase ${id_clase}`);
          socket.emit('error_socket', { mensaje: 'No tienes permiso para ver el chat de esta clase.' });
          return; 
        }

        socket.join(id_clase);
        console.log(`Acceso autorizado: Usuario ${socket.id} se unió a la sala: ${id_clase}`);

        await marcarMensajesComoLeidos(id_clase, id_usuario_actual);
        io.to(id_clase).emit('mensajes_leidos_actualizados', { id_clase, por_usuario: id_usuario_actual });

      } catch (error) {
        console.error('Error en validación de seguridad de socket:', error);
        socket.emit('error_socket', { mensaje: 'Ocurrió un error de validación en el servidor.' });
      }
    });

     /*socket.on('marcar_mensajes_leidos', async (data: { id_clase: string; id_usuario: string }) => {
      const { id_clase, id_usuario } = data;
      try {
        await marcarMensajesComoLeidos(id_clase, id_usuario);
        io.to(id_clase).emit('mensajes_leidos_actualizados', { 
          id_clase, 
          por_usuario: id_usuario 
        });
      } catch (error) {
        console.error('Error al actualizar vistos en tiempo real:', error);
      }
    });*/

    socket.on('marcar_mensajes_leidos', async (data: { id_clase: string; id_usuario: string }) => {
      const { id_clase, id_usuario } = data;
      console.log(`[SOCKET] -> Evento 'marcar_mensajes_leidos' recibido de usuario: ${id_usuario} para clase: ${id_clase}`);
      
      try {
        // 1. Forzamos un log antes de llamar al servicio para auditar el comportamiento
        await marcarMensajesComoLeidos(id_clase, id_usuario);
        console.log(`[DATABASE] -> Mensajes de la clase ${id_clase} marcados como leídos por el usuario ${id_usuario}`);
        
        // 2. Transmitimos el cambio a TODA la sala
        console.log(`[SOCKET] -> Emitiendo 'mensajes_leidos_actualizados' a la sala: ${id_clase}`);
        io.to(id_clase).emit('mensajes_leidos_actualizados', { 
          id_clase, 
          por_usuario: id_usuario 
        });
      } catch (error) {
        console.error('[SOCKET ERROR] -> Error al actualizar vistos:', error);
      }
    });

    socket.on('enviar_mensaje', async (data: {
      id_clase: string;
      id_usuario_remitente: string;
      contenido: string;
    }) => {
      const { id_clase, id_usuario_remitente, contenido } = data;

      try {
        const nuevoMensaje = await prisma.mensaje.create({
          data: {
            contenido,
            id_clase,
            id_usuario_remitente,
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