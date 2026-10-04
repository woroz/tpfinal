import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { crearAreaSchema } from '../schemas/areaSchema.js';
import { areaService } from '../services/areaService.js';
import { AppError } from '../utils/error.js';

const router = Router();

router.get('/', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const areas = await areaService.listar();
        res.status(200).json({ message: 'Áreas listadas: ', total: areas.length, areas });
    } catch (error) { 
        next(error); 
    }
});

router.get('/:id', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (typeof req.params.id !== 'string') {
                throw new AppError('id de area no proporcionado', 400);
            }
            const area = await areaService.obtener(req.params.id);
            res.status(200).json({ message: 'Area encontrada', area });
        } catch (error) { 
            next(error); 
        }
    }
);

router.post('/', auth(['profesor', 'admin']), validate(crearAreaSchema), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { nombreArea } = req.body;
            const area = await areaService.crear(nombreArea);
            res.status(201).json({ message: 'Area creada: ', area });
        } catch (error) { 
            next(error); 
        }
    }
);

export default router;