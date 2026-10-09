import { Router, Request, Response, NextFunction } from 'express';
import { claseService } from '../services/claseService.js';
import { AppError } from '../utils/error.js';
import { auth } from '../middlewares/authMiddleware.js';
import { historialQuerySchema } from '../schemas/reservaSchema.js';
import { obtenerIdRol, validar } from '../utils/validar.js';
import { buscarClaseSchema } from '../schemas/claseSchema.js';
import { validate } from '../middlewares/validateMiddleware.js';
 
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
                contenido,
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
            if (contenido !== undefined && contenido !== null) {
                if (typeof contenido !== 'string') {
                    throw new AppError('El contenido de la clase no es valido', 400);
                }
                if (contenido.length > 5000) {
                    throw new AppError('El contenido de la clase no puede superar los 5000 caracteres', 400);
                }
            }
            const nuevaClase = await claseService.crearClase(idProfesor, {
                id_materia,
                titulo,
                tema,
                contenido,
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
 
router.post('/buscar', auth(['alumno']), validate(buscarClaseSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { consulta, latitud, longitud, radio } = req.body;
        const clases = await claseService.buscarClases(consulta, latitud, longitud, radio);
        res.status(200).json({ message: 'Clases encontradas', clases });
    } catch (error) {
        next(error);
    }
})
 
export default router;
 