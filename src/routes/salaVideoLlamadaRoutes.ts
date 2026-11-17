import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js'; 
import {
  obtenerTokenService,
  finalizarSalaService,
  iniciarGrabacionService,
  detenerGrabacionService,
  obtenerEstadoGrabacionService,
  obtenerUrlGrabacionService
} from '../services/salaVideoLlamadaService.js';
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

router.post('/grabacion/iniciar/:id_clase', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado.', 401);
      }
      if (!req.user.id_rol) {
        throw new AppError('No se pudo identificar al profesor.', 403);
      }
      const { id_clase } = req.params;
      if (typeof id_clase !== 'string' || !id_clase) {
        throw new AppError('El parámetro id_clase es necesario.', 400);
      }
      const resultado = await iniciarGrabacionService(
        id_clase,
        req.user.id_rol
      );
      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/grabacion/detener/:id_clase', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado.', 401);
      }
      if (!req.user.id_rol) {
        throw new AppError('No se pudo identificar al profesor.', 403);
      }
      const { id_clase } = req.params;
      if (typeof id_clase !== 'string' || !id_clase) {
        throw new AppError('El parámetro id_clase es necesario.', 400);
      }
      const resultado = await detenerGrabacionService(
        id_clase,
        req.user.id_rol
      );
      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/grabacion/estado/:id_clase', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Usuario no autenticado.', 401);
    }
    if (!req.user.id_rol) {
      throw new AppError('No se pudo identificar al profesor.', 403);
    }
    const { id_clase } = req.params;

    if (typeof id_clase !== 'string' || !id_clase) {
      throw new AppError('El parámetro id_clase es necesario.', 400);
    }
    const resultado = await obtenerEstadoGrabacionService(
      id_clase,
      req.user.id_rol
    );
    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});

router.get('/grabacion/url/:id_clase', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Usuario no autenticado.', 401);
    }
    if (!req.user.id_rol) {
      throw new AppError('No se pudo identificar al usuario.', 403);
    }
    const { id_clase } = req.params;

    if (typeof id_clase !== 'string' || !id_clase) {
      throw new AppError('El parámetro id_clase es necesario.', 400);
    }
    const resultado = await obtenerUrlGrabacionService(
      id_clase,
      req.user.id_rol,
      req.user.rol
    );
    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});

router.delete('/finalizar/:nombre_sala', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre_sala } = req.params;
    const resultado = await finalizarSalaService(nombre_sala as string);
    return res.status(200).json(resultado);
  } catch (error) {
      next(error);
    }
});

export default router;