import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js'; 
import { obtenerTokenService } from '../services/salaVideoLlamadaService.js';
import { finalizarSalaService } from '../services/salaVideoLlamadaService.js';
import { AppError } from '../utils/error.js';

const router = Router();

router.get('/token/:id_clase', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id_clase } = req.params;

    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    if (typeof id_clase !== 'string' || !id_clase) {
        throw new AppError('El parametro id_clase es necesario', 400)
    }

    const dataSala = await obtenerTokenService(id_clase, req.user.id_usuario, req.user.nombre, req.user.rol, req.user.id_rol);
    return res.status(200).json(dataSala);
  } catch (error) {
    next(error);
  }
});

router.delete('/finalizar/:nombre_sala', auth(['profesor']), async (req: Request, res: Response) => {
  const { nombre_sala } = req.params;
  try {
    const resultado = await finalizarSalaService(nombre_sala as string);
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;