import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { buscarProfesorSchema } from '../schemas/profesorSchema.js';
import { asociarMateriaSchema } from '../schemas/materiaSchema.js';
import { profesorService } from '../services/profesorService.js';
import { horarioService } from '../services/horarioService.js'
import { horariosQuerySchema, idParamSchema } from '../schemas/reservaSchema.js'
import { validar } from '../utils/validar.js'
import { AppError } from '../utils/error.js';

const router = Router();

router.get('/:id/horarios', auth(), async (req: Request, res: Response) => {
    const { id } = validar(idParamSchema, req.params)
    const { desde, hasta } = validar(horariosQuerySchema, req.query)
    const agenda = await horarioService.obtenerAgenda(id, desde, hasta)
    res.status(200).json(agenda)
})

router.get('/buscar', auth(['alumno']), validate(buscarProfesorSchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401)
        }
        const filtros = req.query as any
        const profesores = await profesorService.buscarProfesores({
            latitud: filtros.latitud,
            longitud: filtros.longitud,
            radio: filtros.radio,
            id_materia: filtros.id_materia,
            id_area: filtros.id_area
        })
        res.status(200).json({ message: 'Profesores encontrados', profesores })
    } catch (error) {
        next(error)
    }
})

router.get( '/materias', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id_profesor = req.user!.id_rol;
            if (!id_profesor) throw new AppError('No es un profesor', 403);

            const materias = await profesorService.obtenerMaterias(id_profesor);
            res.status(200).json({
                message: 'Materias del profesor',
                total: materias.length,
                materias
            });
        } catch (error) { 
            next(error); 
        }
    }
);

router.post('/materias', auth(['profesor']), validate(asociarMateriaSchema), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id_profesor = req.user!.id_rol;
            if (!id_profesor) throw new AppError('No es un profesor', 403);

            const { id_materia } = req.body;
            const resultado = await profesorService.asociarMateria(id_profesor, id_materia);
            res.status(201).json({ message: "Materia asociada correctamente", resultado });
        } catch (error) { 
            next(error);
        }
    }
);

router.delete('/materias/:id_materia', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id_profesor = req.user!.id_rol;
            if (!id_profesor) throw new AppError('No es un profesor', 403);
            if (typeof req.params.id_materia !== 'string') {
                throw new AppError('id de materia no proporcionado', 400);
            }
            const resultado = await profesorService.desasociarMateria(
                id_profesor,
                req.params.id_materia
            );
            res.status(200).json({ message: "Materia desasociada correctamente", resultado });
        } catch (error) { 
            next(error); 
        }
    }
);

router.get('/:id', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 401)
        }
        if (typeof req.params.id !== 'string') {
            throw new AppError('ID de profesor no proporcionado', 400)
        }
        
        const perfil = await profesorService.obtenerPerfilPublico(req.params.id)

        res.status(200).json({ message: 'Perfil encontrado', perfil })
    } catch (error) {
        next(error)
    }
})

router.get('/:id/clases', auth(['profesor', 'alumno', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const  {estado } = req.query
        if (typeof req.params.id !== 'string') {
            throw new AppError('ID de profesor no proporcionado', 400)
        }

        const esDueno = req.user?.rol === 'admin' || req.user?.id_rol === req.params.id
        const clases = await profesorService.obtenerClases(req.params.id, {
            estado: typeof estado === 'string' ? estado : undefined
        }, !esDueno)

        res.status(200).json({ message: 'Clases encontradas', clases })
    } catch (error) {
        next(error)
    }
})

router.get('/:id/resenas', auth(['alumno', 'profesor', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id !== 'string') {
            throw new AppError('ID de profesor no proporcionado', 400)
        }

      const resenas = await profesorService.obtenerResenas(req.params.id);
      res.status(200).json({ message: 'Reseñas encontradas', total: resenas.length, resenas });
    } catch (error) {
      next(error);
    }
  }
)

router.get('/:id/disponibilidad', auth(['alumno', 'profesor', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id !== 'string') {
            throw new AppError('ID de profesor no proporcionado', 400)
        }

      const disponibilidad = await profesorService.obtenerDisponibilidad(req.params.id);
      res.status(200).json({ message: 'Disponibilidad del profesor', disponibilidad });
    } catch (error) {
      next(error);
    }
  }
)

export default router
