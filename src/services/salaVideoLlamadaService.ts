import { AccessToken } from 'livekit-server-sdk';
import { prisma } from '../utils/prisma.js';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL = process.env.LIVEKIT_URL || '';

export const obtenerTokenService = async (id_clase: string, id_usuario: string, nombre_usuario: string) => {

  const clase = await prisma.clase.findUnique({
    where: { id_clase }
  });

  if (!clase) {
    throw new Error('La clase especificada no existe.');
  }

  //const ahora = new Date();
  const inicio = new Date(clase.fecha_hora_inicio);
  //const fin = new Date(clase.fecha_hora_fin);
  //const tiempoPermitidoInicio = new Date(inicio.getTime() - 10 * 60 * 1000);

  /*if (ahora < tiempoPermitidoInicio || ahora > fin) {
    throw new Error('La videollamada no está disponible en este momento.');
  }*/

  let sala = await prisma.salaVideollamada.findFirst({
    where: { id_clase }
  });

  if (!sala) {
    sala = await prisma.salaVideollamada.create({
      data: {
        estado: 'activa',
        habilitada_desde: inicio,
        id_clase: id_clase,
        nombre_sala: `sala-${id_clase.substring(0, 8)}`
      }
    });
  }

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