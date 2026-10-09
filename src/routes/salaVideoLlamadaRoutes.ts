import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js'; 
import { obtenerTokenService } from '../services/salaVideoLlamadaService.js';

const router = Router();

router.get('/token/:id_clase', auth(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { id_clase } = req.params;

  if (!id_clase) {
    return res.status(400).json({ error: 'El parámetro id_clase es requerido.' });
  }

  const id_usuario = req.user?.id_usuario || (req.user as any)?.id;
  const nombre_usuario = req.user?.nombre || 'Usuario MentorAr';

  if (!id_usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado o token inválido.' });
  }

  try {
    const dataSala = await obtenerTokenService(id_clase as string, id_usuario, nombre_usuario);
    return res.status(200).json(dataSala);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;