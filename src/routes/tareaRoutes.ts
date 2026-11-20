import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { crearTareaSchema, editarTareaSchema, calificarSchema, entregarSchema } from '../schemas/tareaSchema.js';
import { tareaService } from '../services/tareaService.js';
import { AppError } from '../utils/error.js';
import { uploadTarea } from '../utils/multer.js';

const router = Router();

router.post('/', auth(['profesor']), validate(crearTareaSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id_rol) throw new AppError('Profesor no identificado', 403)
        const { id_clase, titulo, descripcion, fechaLimite, id_alumno } = req.body;
        const tarea = await tareaService.crearTarea(req.user.id_rol, { id_clase, titulo, descripcion, fechaLimite, id_alumno })
        res.status(201).json({ message: 'Tarea publicada: ', tarea });
    } catch (error) { 
        next(error); 
    }
});

router.get('/misTareas', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)
        const tareas = await tareaService.listarMisTareas(req.user.id_rol, req.query.pendientes === 'true')
        res.status(200).json({ message: 'Tareas obtenidas', tareas })
    } catch (error) {
        next(error)
    }
})

router.get('/clase/:id_clase', auth(['profesor', "alumno"]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_clase } = req.params
        if (typeof id_clase !== 'string' || !id_clase) throw new AppError('Falta el id de la clase', 400)
        if (!req.user?.id_rol) throw new AppError('Usuario no identificado', 403)

        const tarea = await tareaService.listarPorClase(id_clase, req.user.rol, req.user.id_rol,);
        res.status(200).json({ message: 'Tarea encontrada: ', tarea });
    } catch (error) { 
        next(error); 
    }
});

router.patch('/:id_tarea', auth(['profesor']), validate(editarTareaSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_tarea } = req.params
        if (typeof id_tarea !== 'string' || !id_tarea) throw new AppError('Falta el id de la tarea', 400)
        if (!req.user?.id_rol) throw new AppError('Profesor no identificado', 403)
        const { titulo, descripcion, fechaLimite } = req.body;
        const tarea = await tareaService.modificarTarea(id_tarea,req.user?.id_rol, { titulo, descripcion, fechaLimite });
        res.status(200).json({ message: 'Tarea modificada: ', tarea });
    } catch (error) { 
        next(error); 
    }
});

router.post('/:id_tarea/alumnos/:id_alumno/nota', auth(['profesor']), validate(calificarSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_tarea, id_alumno } = req.params
        const { nota, comentario } = req.body;
        if (typeof id_tarea !== 'string' || !id_tarea) throw new AppError('Falta el id de la tarea', 400)
        if (typeof id_alumno !== 'string' || !id_alumno) throw new AppError('Falta el id del alumno', 400)
        if (!req.user?.id_rol) throw new AppError('Profesor no identificado', 403)
        const tarea = await tareaService.calificar(id_tarea, id_alumno, req.user.id_rol,{ nota, comentario });
        res.status(200).json({ message: 'Nota registrada: ', tarea });
    } catch (error) { 
        next(error); 
    }
});

router.post('/:id_tarea/archivos', auth(['alumno']), uploadTarea.single('archivo'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_tarea } = req.params
        if (typeof id_tarea !== 'string' || !id_tarea) throw new AppError('Falta el id de la tarea', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)
        if (!req.file) throw new AppError('Falta el archivo', 400)

        const archivo = await tareaService.subirArchivo(id_tarea, req.user.id_rol, req.file)
        res.status(201).json({ message: 'Archivo subido', archivo })
    } catch (error) {
        next(error)
    }
})

router.delete('/:id_tarea/archivos/:id_archivo', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_tarea, id_archivo } = req.params
        if (typeof id_tarea !== 'string' || !id_tarea) throw new AppError('Falta el id de la tarea', 400)
        if (typeof id_archivo !== 'string' || !id_archivo) throw new AppError('Falta el id del archivo', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)

        await tareaService.quitarArchivo(id_tarea, req.user.id_rol, id_archivo)
        res.status(200).json({ message: 'Archivo eliminado' })
    } catch (error) {
        next(error)
    }
})

router.post('/:id_tarea/entregar', auth(['alumno']), validate(entregarSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id_tarea } = req.params
        if (typeof id_tarea !== 'string' || !id_tarea) throw new AppError('Falta el id de la tarea', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)
        const { entregaTexto } = req.body

        await tareaService.entregar(id_tarea, req.user.id_rol, { entregaTexto })
        res.status(200).json({ message: 'Tarea entregada' })
    } catch (error) {
        next(error)
    }
})


export default router;