import { Router } from 'express'
import authRouter from './authRoutes.js'
import claseRoutes from './claseRoutes.js';
import profesorRoutes from './profesorRoutes.js'
import disponibilidadRoutes from './disponibilidadRoutes.js'
import inscripcionRoutes from './inscripcionRoutes.js'
import pagoRoutes from './pagoRoutes.js'
import notificacionRoutes from './notificacionRoutes.js'

const router = Router()
router.use('/clases', claseRoutes);
router.use('/auth', authRouter)
router.use('/profesores', profesorRoutes)
router.use('/disponibilidad', disponibilidadRoutes)
router.use('/inscripciones', inscripcionRoutes)
router.use('/pagos', pagoRoutes)
router.use('/notificaciones', notificacionRoutes)

export default router
