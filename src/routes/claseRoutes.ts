import { Router, Request, Response, NextFunction } from 'express';
import { claseService } from '../services/claseService.js';
import { AppError } from '../utils/error.js';
import { auth } from '../middlewares/authMiddleware.js';
import { historialQuerySchema } from '../schemas/reservaSchema.js';
import { obtenerIdRol, validar } from '../utils/validar.js';

const router = Router();

router.post('/crear', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new AppError('Usuario no autenticado', 401);
            }

            const idProfesor = req.user.id_rol;
            if (!idProfesor) {
                throw new AppError('El usuario no tiene un perfil de profesor', 403);
            }
            
            const { 
                id_materia, 
                titulo, 
                tema, 
                fecha_hora_inicio, 
                fecha_hora_fin, 
                cupo_maximo, 
                precio, 
                tipo, 
                origen 
            } = req.body;
            if (!id_materia || !titulo || !tema || !fecha_hora_inicio || !fecha_hora_fin || !cupo_maximo || !tipo || !origen) {
                throw new AppError('Faltan campos para crear la clase', 400);
            }
            const nuevaClase = await claseService.crearClase(idProfesor, {
                id_materia,
                titulo,
                tema,
                fecha_hora_inicio,
                fecha_hora_fin,
                cupo_maximo: Number(cupo_maximo),
                precio: precio ? Number(precio) : 0,
                tipo,
                origen 
            });
            return res.status(201).json({
                success: true,
                message: 'Clase creada exitosamente',
                clase: nuevaClase
            });

        } catch (error) {
            next(error); 
        }
    }
);

router.get('/programadas', auth(['profesor']), async (req: Request, res: Response) => {
    const { historial } = validar(historialQuerySchema, req.query);
    const clases = await claseService.listarProgramadas(obtenerIdRol(req), historial === 'true');
    res.status(200).json({ clases });
});

export default router;
