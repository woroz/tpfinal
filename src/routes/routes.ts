import { Router } from 'express'
import authRouter from './authRoutes.js'
import claseRoutes from './claseRoutes.js';
import perfilRoutes from './perfilRoutes.js';
import profesorRoutes from './profesorRoutes.js';
import materiaRoutes from './materiaRoutes.js';
import areaRoutes from './areaRoutes.js';

const router = Router()
router.use('/clases', claseRoutes);
router.use('/auth', authRouter)
router.use('/perfil', perfilRoutes)
router.use('/profesores', profesorRoutes)
router.use('/materias', materiaRoutes);
router.use('/areas', areaRoutes);

export default router