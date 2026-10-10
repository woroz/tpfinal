import { Router } from 'express'
import authRouter from './authRoutes.js'
import claseRoutes from './claseRoutes.js';
import profesorRoutes from './profesorRoutes.js'
import disponibilidadRoutes from './disponibilidadRoutes.js'
import inscripcionRoutes from './inscripcionRoutes.js'
import pagoRoutes from './pagoRoutes.js'
import notificacionRoutes from './notificacionRoutes.js'
import perfilRoutes from './perfilRoutes.js';
import materiaRoutes from './materiaRoutes.js';
import areaRoutes from './areaRoutes.js';
import salaVideoLlamadaRoutes from './salaVideoLlamadaRoutes.js';

const router = Router()
router.use('/clases', claseRoutes);
router.use('/auth', authRouter)
router.use('/profesores', profesorRoutes)
router.use('/disponibilidad', disponibilidadRoutes)
router.use('/inscripciones', inscripcionRoutes)
router.use('/pagos', pagoRoutes)
router.use('/notificaciones', notificacionRoutes)
router.use('/perfil', perfilRoutes)
router.use('/materias', materiaRoutes);
router.use('/areas', areaRoutes);
router.use('/sala-videollamada', salaVideoLlamadaRoutes);

export default router
