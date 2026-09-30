import { Router, Request, Response, NextFunction } from 'express';
import { claseService } from '../services/claseService.js';
import { AppError } from '../utils/error.js';

const router = Router();

router.post(
    '/crear',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idProfesor = req.body.id_profesor;
            if (!idProfesor) {
                throw new AppError('Se requiere el ID del profesor.', 400);
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

export default router;