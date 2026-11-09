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
import transcripcion from './transcripcionRoutes.js'
import actividadAlumnoRoutes from './actividadAlumnoRoutes.js'
import tablonRoutes from './tablonRoutes.js'
import logrosRoutes from './logroRoutes.js'
import adminRoutes from './adminRoutes.js'
import reclamoRoutes from './reclamoRoutes.js'
import recordatorioRoutes from './recordatorioRoutes.js'
import reporteRoutes from './reporteRoutes.js';

const router = Router()

router.use('/transcripcion', transcripcion);
router.use('/actividad-alumno', actividadAlumnoRoutes);
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
router.use('/tablon', tablonRoutes);
router.use('/logros', logrosRoutes);
router.use('/admin', adminRoutes);
router.use('/reclamos', reclamoRoutes);
router.use('/recordatorios', recordatorioRoutes);
router.use('/reportes', reporteRoutes);

export default router
