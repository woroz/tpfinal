import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { crearQuizSchema, cambiarEstadoQuizSchema, responderQuizSchema } from '../schemas/quizSchema.js';
import { quizService } from '../services/quizService.js';
import { AppError } from '../utils/error.js';

const router = Router();
router.post(
    '/',
    auth(['profesor']),
    validate(crearQuizSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id_rol) {
                throw new AppError('Profesor no identificado', 403);
            }
            const quiz = await quizService.crearQuiz(
                req.user.id_rol,
                req.body
            );
            res.status(201).json({
                message: 'Quiz creado correctamente',
                quiz
            });
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/clase/:id_clase',
    auth(['profesor', 'alumno']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_clase } = req.params;
            if (typeof id_clase !== 'string' || !id_clase) {
                throw new AppError('Falta el id de la clase', 400);
            }
            if (!req.user?.id_rol) {
                throw new AppError('Usuario no identificado', 403);
            }
            const quizzes = await quizService.listarPorClase(
                id_clase,
                req.user.rol,
                req.user.id_rol
            );
            res.status(200).json({
                message: 'Quizzes obtenidos',
                quizzes
            });
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/:id_quiz',
    auth(['profesor', 'alumno']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_quiz } = req.params;
            if (typeof id_quiz !== 'string' || !id_quiz) {
                throw new AppError('Falta el id del quiz', 400);
            }
            if (!req.user?.id_rol) {
                throw new AppError('Usuario no identificado', 403);
            }
            const quiz = await quizService.obtenerQuiz(
                id_quiz,
                req.user.rol,
                req.user.id_rol
            );
            res.status(200).json({
                message: 'Quiz obtenido',
                quiz
            });
        } catch (error) {
            next(error);
        }
    }
);

router.patch(
    '/:id_quiz/estado',
    auth(['profesor']),
    validate(cambiarEstadoQuizSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_quiz } = req.params;
            if (typeof id_quiz !== 'string' || !id_quiz) {
                throw new AppError('Falta el id del quiz', 400);
            }
            if (!req.user?.id_rol) {
                throw new AppError('Profesor no identificado', 403);
            }
            const quiz = await quizService.cambiarEstado(
                id_quiz,
                req.user.id_rol,
                req.body.estado
            );
            res.status(200).json({
                message: 'Estado del quiz actualizado',
                quiz
            });
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/:id_quiz/intentos',
    auth(['alumno']),
    validate(responderQuizSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_quiz } = req.params;
            if (typeof id_quiz !== 'string' || !id_quiz) {
                throw new AppError('Falta el id del quiz', 400);
            }
            if (!req.user?.id_rol) {
                throw new AppError('Alumno no identificado', 403);
            }
            const intento = await quizService.responder(
                id_quiz,
                req.user.id_rol,
                req.body
            );
            res.status(201).json({
                message: 'Quiz respondido correctamente',
                intento
            });
        } catch (error) {
            next(error);
        }
    }
);


router.get(
    '/:id_quiz/resultados',
    auth(['profesor']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_quiz } = req.params;
            if (typeof id_quiz !== 'string' || !id_quiz) {
                throw new AppError('Falta el id del quiz', 400);
            }
            if (!req.user?.id_rol) {
                throw new AppError('Profesor no identificado', 403);
            }
            const resultados = await quizService.listarResultados(
                id_quiz,
                req.user.id_rol
            );
            res.status(200).json({
                message: 'Resultados obtenidos',
                resultados
            });
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/:id_quiz/mis-intentos',
    auth(['alumno']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_quiz } = req.params;
            if (typeof id_quiz !== 'string' || !id_quiz) {
                throw new AppError('Falta el id del quiz', 400);
            }
            if (!req.user?.id_rol) {
                throw new AppError('Alumno no identificado', 403);
            }
            const intentos = await quizService.misIntentos(
                id_quiz,
                req.user.id_rol
            );
            res.status(200).json({
                message: 'Intentos obtenidos',
                intentos
            });
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/intentos/:id_intento',
    auth(['profesor', 'alumno']),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id_intento } = req.params;

            if (typeof id_intento !== 'string' || !id_intento) {
                throw new AppError('Falta el id del intento', 400);
            }

            if (!req.user?.id_rol) {
                throw new AppError('Usuario no identificado', 403);
            }

            const detalle = await quizService.verDetalleIntento(
                id_intento,
                req.user.rol,
                req.user.id_rol
            );

            res.status(200).json({
                message: 'Detalle del intento obtenido',
                intento: detalle
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
