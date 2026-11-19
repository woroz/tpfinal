import { Router } from 'express'
import multer from 'multer'
import { auth } from '../middlewares/authMiddleware.js'
import { AppError } from '../utils/error.js'
import { obtenerIdRol } from '../utils/validar.js'
import { bibliotecaService } from '../services/bibliotecaService.js'
import { vistaTextoMaterial } from '../services/bibliotecaVista.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } })

router.get('/clases', auth(['profesor']), async (req, res) => {
  res.json({ clases: await bibliotecaService.clasesDisponibles(obtenerIdRol(req)) })
})

router.post('/materiales', auth(['profesor']), upload.single('archivo'), async (req, res) => {
  const { id_clase, id_alumno, nombre_archivo } = req.body
  const grupo: unknown = req.body.destinatarios ?? 'alumno'
  if (typeof id_clase !== 'string' || !id_clase ||
      (grupo !== 'alumno' && grupo !== 'asistieron' && grupo !== 'inscritos') ||
      (grupo === 'alumno' && (typeof id_alumno !== 'string' || !id_alumno)) ||
      typeof nombre_archivo !== 'string' || !nombre_archivo || !req.file) {
    throw new AppError('Seleccioná una clase, destinatarios y un archivo.', 400)
  }
  const material = await bibliotecaService.subir(obtenerIdRol(req), id_clase, grupo, id_alumno, nombre_archivo, req.file)
  res.status(201).json({ material })
})

router.get('/materiales', auth(['alumno']), async (req, res) => {
  res.json({ materiales: await bibliotecaService.listar(obtenerIdRol(req)) })
})

router.get('/materiales/pdf-clases', auth(['alumno']), async (req, res) => {
  res.json({ materiales: await bibliotecaService.listarPdfClases(obtenerIdRol(req)) })
})

router.get('/materiales/profesor', auth(['profesor']), async (req, res) => {
  res.json({ materiales: await bibliotecaService.listarProfesor(obtenerIdRol(req)) })
})

router.put('/materiales/:id', auth(['profesor']), upload.single('archivo'), async (req, res) => {
  if (typeof req.body.nombre_archivo !== 'string' || !req.body.nombre_archivo || !req.file) {
    throw new AppError('Seleccioná un archivo.', 400)
  }
  await bibliotecaService.reemplazar(obtenerIdRol(req), String(req.params.id), req.body.nombre_archivo, req.file)
  res.json({ message: 'Material modificado.' })
})

router.delete('/materiales/:id', auth(['profesor']), async (req, res) => {
  await bibliotecaService.eliminar(obtenerIdRol(req), String(req.params.id))
  res.json({ message: 'Material eliminado.' })
})

router.post('/materiales/:id/descarga', auth(['alumno']), async (req, res) => {
  const fecha = typeof req.body.fecha_modificacion === 'string' ? new Date(req.body.fecha_modificacion) : new Date(NaN)
  if (Number.isNaN(fecha.getTime())) throw new AppError('La versión del material no es válida.', 400)
  await bibliotecaService.registrarDescarga(String(req.params.id), obtenerIdRol(req), fecha)
  res.json({ message: 'Descarga registrada.' })
})

router.get('/materiales/:id/vista', auth(['alumno', 'profesor']), async (req, res) => {
  const rol = req.user?.rol
  if (rol !== 'alumno' && rol !== 'profesor') throw new AppError('No autorizado.', 403)
  const archivo = await bibliotecaService.archivo(String(req.params.id), obtenerIdRol(req), rol, false)
  const vista = await vistaTextoMaterial(archivo.nombre, archivo.contenido)
  res.set('Cache-Control', 'private, no-store').json(vista)
})

router.get('/materiales/:id/archivo', auth(['alumno', 'profesor']), async (req, res) => {
  const rol = req.user?.rol
  if (rol !== 'alumno' && rol !== 'profesor') throw new AppError('No autorizado.', 403)
  const vista = req.query.vista === '1'
  const archivo = await bibliotecaService.archivo(String(req.params.id), obtenerIdRol(req), rol, !vista)
  res.set('Cache-Control', 'private, no-store')
  if (vista) res.set('Content-Disposition', 'inline')
  else res.attachment(archivo.nombre)
  res.type(archivo.tipo).send(archivo.contenido)
})

export default router
