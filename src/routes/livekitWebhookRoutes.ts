import { Router, Request, Response } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { prisma } from '../utils/prisma.js';

const router = Router();

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY || '',
  process.env.LIVEKIT_API_SECRET || ''
);

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        error: 'El cuerpo del webhook no tiene el formato esperado.'
      });
    }

    const authorization = req.get('Authorization');

    if (!authorization) {
      return res.status(401).json({
        error: 'Falta la autorización del webhook.'
      });
    }

    const event = await receiver.receive(
      req.body.toString('utf8'),
      authorization
    );

    if (event.event !== 'egress_ended') {
      return res.status(200).json({ received: true });
    }

    const egressInfo = event.egressInfo;

    if (!egressInfo?.egressId) {
      return res.status(400).json({
        error: 'El evento no contiene un Egress ID.'
      });
    }

    const grabacion = await prisma.grabacion.findUnique({
      where: { egress_id: egressInfo.egressId }
    });

    if (!grabacion) {
      console.warn(
        'No se encontró la grabación:',
        egressInfo.egressId
      );

      return res.status(200).json({ received: true });
    }
    const archivo = egressInfo.fileResults?.[0];

    if (egressInfo.status === 3 && archivo) {
      const duracion = Math.max(
        0,
        Math.round(Number(archivo.duration) / 1_000_000_000)
      );

      const fechaFin = egressInfo.endedAt
        ? new Date(Number(egressInfo.endedAt) / 1_000_000)
        : new Date();
      await prisma.grabacion.updateMany({
        where: {
          egress_id: egressInfo.egressId,
          estado: { in: ['grabando', 'finalizando'] }
        },
        data: {
          estado: 'completada',
          url_grabacion: archivo.location || archivo.filename,
          duracion,
          fecha_fin: fechaFin
        }
      });
      console.log(
        'Grabación completada:',
        egressInfo.egressId
      );
    } else {
      await prisma.grabacion.updateMany({
        where: {
          egress_id: egressInfo.egressId,
          estado: { in: ['grabando', 'finalizando'] }
        },
        data: {
          estado: 'error',
          fecha_fin: new Date()
        }
      });
      console.error(
        'La grabación terminó con errores:',
        egressInfo.error
      );
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(
      'Error al procesar el webhook de LiveKit:',
      error
    );
    return res.status(500).json({
      error: 'No se pudo procesar el webhook.'
    });
  }
});

export default router;