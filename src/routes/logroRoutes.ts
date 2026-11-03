import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { logroService } from '../services/logroService.js';
import { AppError } from '../utils/error.js';
import { validar } from '../utils/validar.js';
import { idParamSchema } from '../schemas/reservaSchema.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/actualizar-programados', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const secreto = config.CRON.secret;
        if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) {
            throw new AppError('No autorizado', 401);
        }
        const resultado = await logroService.actualizarTodos();
        res.status(resultado.fallidos > 0 ? 503 : 200).json(resultado);
    } catch (error) {
        next(error);
    }
});

router.get('/', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user || !req.user.id_rol) {
            throw new AppError('Usuario no autenticado', 401);
        }
        const { id_usuario, id_rol, rol } = req.user;
        const logros = await logroService.listarLogros(id_usuario, id_rol, rol);
        res.status(200).json({ message: 'Logros listados:', total: logros.length, logros });
    } catch (error) {
        next(error);
    }
});

router.get('/obtenidos', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user || !req.user.id_rol) {
            throw new AppError('Usuario no autenticado', 401);
        }
        const { id_usuario, id_rol, rol } = req.user;
        const logros = await logroService.listarLogrosObtenidos(id_usuario, id_rol, rol);
        res.status(200).json({ message: 'Logros obtenidos:', total: logros.length, logros });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', auth(['profesor', 'alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401);
        }
        if (typeof req.params.id !== 'string') {
            throw new AppError('Id de logro no proporcionado', 400);
        }
        const { id } = validar(idParamSchema, req.params);
        const { id_usuario, rol } = req.user;
        const logro = await logroService.logroEspecifico(id, id_usuario, rol);
        res.status(200).json({ message: 'Logro encontrado:', logro });
    } catch (error) {
        next(error);
    }
});

export default router;
