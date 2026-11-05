import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { adminService } from '../services/adminService.js';
import { AppError } from '../utils/error.js';
import type { Role } from '../generated/prisma/client.js';

const router = Router();

const rolesValidos: Role[] = ['alumno', 'profesor', 'admin'];

router.get('/usuarios', auth(['admin']), async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const busqueda = typeof req.query.busqueda === 'string'
            ? req.query.busqueda.trim()
            : undefined;

        const rolQuery = req.query.rol;

        if (
            rolQuery !== undefined &&
            (typeof rolQuery !== 'string' ||
             !rolesValidos.includes(rolQuery as Role))
        ) {
            throw new AppError('Rol de usuario inválido', 400);
        }

        const pagina = req.query.pagina === undefined
            ? 1
            : Number(req.query.pagina);

        const limite = req.query.limite === undefined
            ? 10
            : Number(req.query.limite);

        const resultado = await adminService.obtenerUsuarios({
            busqueda,
            rol: rolQuery as Role | undefined,
            pagina,
            limite
        });

        res.status(200).json({
            message: 'Usuarios obtenidos correctamente',
            ...resultado
        });

    } catch (error) {
        next(error);
    }
});

router.get('/estadisticas', auth(['admin']), async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const estadisticas = await adminService.obtenerEstadisticas();

        res.status(200).json({
            message: 'Estadísticas obtenidas correctamente',
            estadisticas
        });

    } catch (error) {
        next(error);
    }
});


export default router;
