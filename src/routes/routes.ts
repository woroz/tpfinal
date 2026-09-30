import { Router } from 'express'
import authRouter from './authRoutes.js'
import claseRoutes from './claseRoutes.js';

const router = Router()
router.use('/clases', claseRoutes);
router.use('/auth', authRouter)

export default router