import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { crearMateriaSchema } from '../schemas/materiaSchema.js';
import { materiaService } from '../services/materiaService.js';
import { AppError } from '../utils/error.js';

const router = Router();

router.get('/', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_area } = req.query;
        const materias = await materiaService.listar({
            id_area: id_area as string | undefined
        });
        res.status(200).json({ message: 'Materias listadas: ', total: materias.length, materias });
    } catch (error) { next(error); }
});

router.get('/buscar', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.query;
        const materias = await materiaService.buscarPorNombre(query as string);
        res.status(200).json({ message: 'Materias encontradas: ', total: materias.length, materias });
    } catch (error) { next(error); }
});

router.get('/:id', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
         if (typeof req.params.id !== 'string') {
            throw new AppError('id de materia no proporcionado', 400)
        }
        const materia = await materiaService.obtener(req.params.id);
        res.status(200).json({ message: 'Materia encontrada: ', materia });
    } catch (error) { next(error); }
});

router.post('/', auth(['profesor', 'admin']), validate(crearMateriaSchema), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { nombreMateria, id_area_conocimiento } = req.body;
            const materia = await materiaService.crear(nombreMateria, id_area_conocimiento);
            res.status(201).json({ message: 'Materia creada: ', materia });
        } catch (error) { next(error); }
    }
);

export default router;