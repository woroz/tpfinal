import { AccessToken } from 'livekit-server-sdk';
import { RoomServiceClient } from 'livekit-server-sdk';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL = process.env.LIVEKIT_URL || '';

const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
export const obtenerTokenService = async (id_clase: string, id_usuario: string, nombre_usuario: string,
  rol: string, id_rol?: string
) => {
  const clase = await prisma.clase.findUnique({
    where: { id_clase }
  });

  if (!clase) throw new AppError('La clase especificada no existe.', 404);

  if (rol === 'profesor') {
    if (!id_rol || clase.id_profesor !== id_rol) {
      throw new AppError('No sos el profesor de esta clase', 403);
    }
  } else if (rol === 'alumno') {
    if (!id_rol) throw new AppError('Alumno no identificado', 403);

    const inscripcion = await prisma.inscripcion.findFirst({
      where: { id_clase, id_alumno: id_rol },
    });
    if (!inscripcion) throw new AppError('No estás inscripto en esta clase', 403);

    if (!inscripcion.asistio) {
      await prisma.inscripcion.update({
        where: { id_inscripcion: inscripcion.id_inscripcion },
        data: { asistio: true },
      });
    }
  } else {
    throw new AppError('No tenés permiso para esta clase', 403);
  }

  //const ahora = new Date();
  const inicio = new Date(clase.fecha_hora_inicio);
  //const fin = new Date(clase.fecha_hora_fin);
  //const tiempoPermitidoInicio = new Date(inicio.getTime() - 10 * 60 * 1000);

  /*if (ahora < tiempoPermitidoInicio || ahora > fin) {
    throw new Error('La videollamada no está disponible en este momento.');
  }*/

 const sala = await prisma.salaVideollamada.upsert({
    where: { id_clase },
    update: {},
    create: {
      estado: 'activa',
      habilitada_desde: inicio,
      id_clase,
      nombre_sala: `sala-${id_clase.substring(0, 8)}`,
    },
  });

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: id_usuario,
    name: nombre_usuario,
  });
  at.addGrant({
    roomJoin: true,
    room: sala.nombre_sala,
    canPublish: true,
    canSubscribe: true,
  });

  const tokenJwt = await at.toJwt();

  return {
    token: tokenJwt,
    nombre_sala: sala.nombre_sala,
    url_servidor: LIVEKIT_URL
  };
};

export const finalizarSalaService = async (nombre_sala: string) => {
  try {
    await roomService.deleteRoom(nombre_sala);
    return { message: "Sala finalizada correctamente en el servidor." };
  } catch (error) {
    throw new Error("No se pudo cerrar la sala en el servidor de LiveKit.");
  }
};