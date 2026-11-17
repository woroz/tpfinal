import { AccessToken, RoomServiceClient, EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from '../utils/estados.js';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL = process.env.LIVEKIT_URL || '';

const egressClient = new EgressClient(
  LIVEKIT_URL.replace(/^wss:/, 'https:'),
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

const B2_KEY_ID = process.env.B2_KEY_ID || '';
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || '';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || '';
const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
const B2_REGION = process.env.B2_REGION || '';

const s3Client = new S3Client({
  region: B2_REGION,
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY
  },
  forcePathStyle: true
});

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
    await prisma.clase.update({
      where: { id_clase },
      data: {
        profesorAsistio: true,
        profesorIngreso: new Date()
      }
    });
  } else if (rol === 'alumno') {
    if (!id_rol) throw new AppError('Alumno no identificado', 403);

    const ahora = new Date();
    const inicioVentana = new Date(clase.fecha_hora_inicio.getTime() - 10 * 60 * 1000);

    if (clase.estado === ESTADO_CLASE.cancelada) {
      throw new AppError('La clase fue cancelada', 409);
    }
    if (ahora < inicioVentana || ahora > clase.fecha_hora_fin) {
      throw new AppError('La videollamada no esta disponible en este momento.', 403);
    }

    const inscripcion = await prisma.inscripcion.findFirst({
      where: { id_clase, id_alumno: id_rol, estado: ESTADO_INSCRIPCION.confirmada },
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

  const inicio = new Date(clase.fecha_hora_inicio);

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

const solicitarDetencionGrabacion = async (
  id_grabacion: string,
  egress_id: string
) => {
  await prisma.grabacion.update({
    where: { id_grabacion },
    data: { estado: 'finalizando' }
  });
  try {
    await egressClient.stopEgress(egress_id);
  } catch (error) {
    await prisma.grabacion.updateMany({
      where: {
        id_grabacion,
        estado: 'finalizando'
      },
      data: { estado: 'grabando' }
    });
    throw error;
  }
};

export const finalizarSalaService = async (nombre_sala: string) => {
  const sala = await prisma.salaVideollamada.findFirst({
    where: { nombre_sala }
  });
  if (!sala) {
    throw new AppError('No se encontró la sala de videollamada.', 404);
  }
  const grabacion = await prisma.grabacion.findUnique({
    where: { id_clase: sala.id_clase }
  });
  try {
    if (grabacion?.estado === 'grabando' && grabacion.egress_id) {
      await solicitarDetencionGrabacion(
        grabacion.id_grabacion,
        grabacion.egress_id
      );
    }
    await roomService.deleteRoom(nombre_sala);
    return { message: "Sala finalizada correctamente en el servidor." };
  } catch (error) {
    console.error('Error al finalizar la sala:', error);
    throw new AppError('No se pudo finalizar la sala correctamente.', 500);
  }
};

export const iniciarGrabacionService = async (
  id_clase: string,
  id_profesor: string
) => {
  const clase = await prisma.clase.findUnique({
    where: { id_clase }
  });

  if (!clase) {
    throw new AppError('La clase no existe.', 404);
  }
  if (clase.id_profesor !== id_profesor) {
    throw new AppError('No sos el profesor de esta clase.', 403);
  }

  const sala = await prisma.salaVideollamada.findUnique({
    where: { id_clase }
  });
  if (!sala) {
    throw new AppError('La sala de videollamada no existe.', 404);
  }
  if ( !B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT || !B2_REGION ) {
    throw new AppError('La configuración de almacenamiento no está completa.', 500);
  }

  const grabacionExistente = await prisma.grabacion.findUnique({
    where: { id_clase }
  });

  if (grabacionExistente) {
    throw new AppError('Esta clase ya tiene una grabación registrada.', 409);
  }

  const rutaArchivo = `grabaciones/${id_clase}/${Date.now()}.mp4`;
  const archivo = new EncodedFileOutput({
  fileType: EncodedFileType.MP4,
  filepath: rutaArchivo,
    output: {
      case: 's3',
      value: new S3Upload({
        accessKey: B2_KEY_ID,
        secret: B2_APPLICATION_KEY,
        bucket: B2_BUCKET_NAME,
        region: B2_REGION,
        endpoint: B2_ENDPOINT,
        forcePathStyle: true
      })
    }
  });

  const grabacion = await prisma.grabacion.create({
    data: {
      id_clase,
      estado: 'pendiente',
      url_grabacion: rutaArchivo
    }
  });
  try {
    const resultado = await egressClient.startRoomCompositeEgress(
      sala.nombre_sala,
      { file: archivo },
      { layout: 'grid' }
    );
    await prisma.grabacion.update({
      where: { id_grabacion: grabacion.id_grabacion },
      data: {
        egress_id: resultado.egressId,
        estado: 'grabando'
      }
    });
    return {
      message: 'La grabación comenzó correctamente.',
      id_grabacion: grabacion.id_grabacion,
      egress_id: resultado.egressId
    };
  } catch (error) {
    console.error('Error al iniciar la grabación:', error);
    await prisma.grabacion.update({
      where: { id_grabacion: grabacion.id_grabacion },
      data: {
        estado: 'error'
      }
    });
    throw new AppError('No se pudo iniciar la grabación.', 500);
  }
};

export const detenerGrabacionService = async (
  id_clase: string,
  id_profesor: string
) => {
  const clase = await prisma.clase.findUnique({
    where: { id_clase }
  });
  if (!clase) {
    throw new AppError('La clase no existe.', 404);
  }
  if (clase.id_profesor !== id_profesor) {
    throw new AppError('No sos el profesor de esta clase.', 403);
  }

  const grabacion = await prisma.grabacion.findUnique({
    where: { id_clase }
  });
  if (!grabacion) {
    throw new AppError('Esta clase no tiene una grabación registrada.', 404);
  }
  if (grabacion.estado !== 'grabando' || !grabacion.egress_id) {
    throw new AppError('No hay una grabación activa para detener.', 409);
  }
  try {
    await solicitarDetencionGrabacion(
    grabacion.id_grabacion,
    grabacion.egress_id
  );
    return {
      message: 'Se solicitó detener la grabación. El archivo se está procesando.'
    };
  } catch (error) {
    console.error('Error al detener la grabación:', error);
    throw new AppError('No se pudo detener la grabación.', 500);
  }
};

export const obtenerEstadoGrabacionService = async (
  id_clase: string,
  id_profesor: string
) => {
  const clase = await prisma.clase.findUnique({
    where: { id_clase }
  });
  if (!clase) {
    throw new AppError('La clase no existe.', 404);
  }
  if (clase.id_profesor !== id_profesor) {
    throw new AppError('No sos el profesor de esta clase.', 403);
  }
  const grabacion = await prisma.grabacion.findUnique({
    where: { id_clase },
    select: {
      id_grabacion: true,
      egress_id: true,
      url_grabacion: true,
      estado: true,
      duracion: true,
      fecha_inicio: true,
      fecha_fin: true
    }
  });
  if (!grabacion) {
    return {
      existe: false,
      estado: 'sin_grabacion'
    };
  }
  if (
    ['completada', 'error'].includes(grabacion.estado) ||
    !grabacion.egress_id ||
    !grabacion.url_grabacion
  ) {
    return {
      existe: true,
      ...grabacion
    };
  }
  try {
    const egressActivos = await egressClient.listEgress({
      egressId: grabacion.egress_id
    });
    const sigueGrabando = egressActivos.some(
      egress => egress.egressId === grabacion.egress_id
    );
    if (sigueGrabando) {
      return {
        existe: true,
        ...grabacion
      };
    }
    if (grabacion.estado === 'grabando') {
      await prisma.grabacion.update({
        where: { id_grabacion: grabacion.id_grabacion },
        data: { estado: 'finalizando' }
      });
    }
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: grabacion.url_grabacion
        })
      );
      const grabacionActualizada = await prisma.grabacion.update({
        where: { id_grabacion: grabacion.id_grabacion },
        data: {
          estado: 'completada',
          fecha_fin: new Date()
        },
        select: {
          id_grabacion: true,
          estado: true,
          duracion: true,
          fecha_inicio: true,
          fecha_fin: true
        }
      });
      return {
        existe: true,
        ...grabacionActualizada
      };
    } catch (error) {
      const errorAws = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      const noExisteTodavia =
        errorAws.name === 'NotFound' ||
        errorAws.name === 'NoSuchKey' ||
        errorAws.$metadata?.httpStatusCode === 404;
      if (!noExisteTodavia) {
        console.error('Error al comprobar el archivo en B2:', error);
      }
      return {
        existe: true,
        ...grabacion,
        estado: 'finalizando'
      };
    }
  } catch (error) {
    console.error('Error al consultar Egress de LiveKit:', error);
    return {
      existe: true,
      ...grabacion
    };
  }
};

export const obtenerUrlGrabacionService = async (
  id_clase: string,
  id_usuario: string,
  rol: string
) => {
  const clase = await prisma.clase.findUnique({
    where: { id_clase }
  });
  if (!clase) {
    throw new AppError('La clase no existe.', 404);
  }
  if (rol === 'profesor') {
    if (clase.id_profesor !== id_usuario) {
      throw new AppError('No sos el profesor de esta clase.', 403);
    }
  } else if (rol === 'alumno') {
    const inscripcion = await prisma.inscripcion.findFirst({
      where: {
        id_clase,
        id_alumno: id_usuario,
        estado: ESTADO_INSCRIPCION.confirmada
      }
    });

    if (!inscripcion) {
      throw new AppError(
        'No tenés permiso para acceder a esta grabación.',
        403
      );
    }
  } else {
    throw new AppError(
      'No tenés permiso para acceder a esta grabación.',
      403
    );
  }
  const grabacion = await prisma.grabacion.findUnique({
    where: { id_clase }
  });
  if (!grabacion || !grabacion.url_grabacion) {
    throw new AppError('La grabación no existe.', 404);
  }
  if (!B2_BUCKET_NAME || !B2_ENDPOINT) {
    throw new AppError(
      'La configuración del almacenamiento no está completa.',
      500
    );
  }
  if (grabacion.estado === 'finalizando') {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: grabacion.url_grabacion
        })
      );
      await prisma.grabacion.update({
        where: { id_grabacion: grabacion.id_grabacion },
        data: {
          estado: 'completada',
          fecha_fin: new Date()
        }
      });
    } catch (error) {
      const errorAws = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      const noExiste =
        errorAws.name === 'NotFound' ||
        errorAws.name === 'NoSuchKey' ||
        errorAws.$metadata?.httpStatusCode === 404;
      if (noExiste) {
        throw new AppError(
          'La grabación todavía se está procesando. Probá nuevamente en unos minutos.',
          409
        );
      }
      console.error(
        'Error al comprobar la grabación en Backblaze:',
        error
      );
      throw new AppError(
        'No se pudo comprobar la disponibilidad de la grabación.',
        500
      );
    }
  } else if (grabacion.estado !== 'completada') {
    throw new AppError(
      'La grabación todavía no está disponible.',
      409
    );
  }
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: grabacion.url_grabacion
    }),
    { expiresIn: 3600 }
  );
  return {
    url,
    expira_en: 3600
  };
};