import { Router, Request, Response, NextFunction } from 'express'
import { auth } from '../middlewares/authMiddleware.js'
import { AppError } from '../utils/error.js'
import { solicitudSchema, ofertaSchema, editarSolicitudSchema} from '../schemas/tablonSchema.js'
import { validate } from "../middlewares/validateMiddleware.js";
import { tablonService } from '../services/tablonService.js'
import { upload } from '../utils/multer.js'
import { materialService } from '../services/materialService.js'

const router = Router()

router.post('/solicitudes', auth(['alumno']), validate(solicitudSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('Usuario no autenticado', 403)
        }

        if (!req.user.id_rol) {
            throw new AppError('Usuario no autenticado', 403)
        }

        const { titulo, tema, descripcion, ids_materia } = req.body
        const solicitud = await tablonService.crearSolicitud(req.user.id_rol, { 
            titulo,
            tema,
            descripcion,
            ids_materia
        })
        
        res.status(201).json({ message: 'Solicitud creada', id_solicitud: solicitud })
    } catch (error) {
        next(error)
    }
})

router.get('/solicitudes', auth(['profesor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError('Usuario no autenticado', 403)
        
        if (!req.user.id_rol) throw new AppError('Usuario no autenticado', 403)
        
        const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1)
        const solicitudes = await tablonService.obtenerSolicitudes(req.user.id_rol, pagina)
        
        res.status(200).json({ message: "Solicitudes obtenidas: ", solicitudes })
    } catch (error) {
        next(error)
    }
})

router.post('/solicitudes/:id/ofertas', auth(['profesor']), upload.single('material'), validate(ofertaSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        if (typeof id !== 'string' || !id) throw new AppError('Falta el id de la solicitud', 400)
        if (!req.user?.id_rol) throw new AppError('Profesor no identificado', 403)
        
        const { id_materia, mensaje, precio, fecha_hora_inicio, fecha_hora_fin } = req.body
        let material = undefined;
        if (req.file) {
            const archivoSubido = await materialService.subirPdf(req.file, `ofertas/${id}`);

            material = { 
                nombre: archivoSubido.nombre, 
                url: archivoSubido.url 
            };
        }
        try {
            const oferta = await tablonService.crearOferta(id, req.user.id_rol, {
                id_materia,
                mensaje,
                precio,
                fecha_hora_inicio,
                fecha_hora_fin,
                material
            })
            res.status(201).json({ message: 'Oferta creada', id_oferta: oferta.id_oferta })

        } catch (error) {
            if (material) {
                await materialService.eliminarPdf(material.url);
            }
            throw error;
        }
    } catch (error) {
        next(error)
    }
})

router.patch('/solicitudes/:id', auth(['alumno']), validate(editarSolicitudSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        if (typeof id !== 'string' || !id) throw new AppError('Falta el id de la solicitud', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)
        
        const { titulo, tema, descripcion, ids_materia } = req.body
        const solicitud = await tablonService.editarSolicitud(id, req.user.id_rol, {
            titulo,
            tema,
            descripcion,
            ids_materia
        })
        res.status(200).json({ message: 'Solicitud editada', solicitud })
    } catch (error) {
        next(error)
    }
})

router.delete('/solicitudes/:id', auth(['alumno']),async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        if (typeof id !== 'string' || !id) throw new AppError('Falta el id de la solicitud', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)
        
        const eliminarSolicitud = await tablonService.eliminarSolicitud(id, req.user.id_rol)
        res.status(200).json({ message: 'Solicitud eliminada', id_solicitud: eliminarSolicitud })
    } catch (error) {
        next(error)
    }
})

router.get('/solicitudes/mias', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)
        const solicitudes = await tablonService.obtenerSolicitudesAlumno(req.user.id_rol)
        res.status(200).json({ message: "Solicitudes obtenidas: ", solicitudes })
    } catch (error) {
        next(error)
    }
})

router.patch('/solicitudes/:id/cerrar', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        if (typeof id !== 'string' || !id) throw new AppError('Falta el id de la solicitud', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)

        await tablonService.cerrarSolicitud(id, req.user.id_rol)
        res.status(200).json({ message: 'Solicitud cerrada' })
    } catch (error) {
        next(error)
    }
})

router.patch('/solicitudes/:id/ofertas/:id_oferta/aceptar', auth(['alumno']), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, id_oferta } = req.params
        if (typeof id !== 'string' || !id) throw new AppError('Falta el id de la solicitud', 400)
        if (typeof id_oferta !== 'string' || !id_oferta) throw new AppError('Falta el id de la oferta', 400)
        if (!req.user?.id_rol) throw new AppError('Alumno no identificado', 403)

        const id_clase = await tablonService.aceptarOferta(id, id_oferta, req.user.id_rol)
        res.status(200).json({ message: 'Oferta aceptada', id_clase })
    } catch (error) {
        next(error)
    }
})
export default router