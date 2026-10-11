import { Router, Request, Response } from 'express'
import multer from 'multer'
import { auth } from '../middlewares/authMiddleware.js'
import { obtenerIdRol } from '../utils/validar.js'
import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { materialService } from '../services/materialService.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } })

router.post('/:id/material', auth(['profesor']), upload.single('pdf'), async (req: Request, res: Response) => {
  const idClase = String(req.params.id)
  const clase = await prisma.clase.findUnique({ where: { id_clase: idClase } })
  if (!clase || clase.id_profesor !== obtenerIdRol(req)) throw new AppError('Clase no encontrada', 404)
  const archivo = req.file
  if (!archivo) throw new AppError('Falta el archivo PDF', 400)

  const material = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idClase}))`
    const cantidad = await tx.materialClase.count({ where: { id_clase: idClase } })
    if (cantidad >= 3) throw new AppError('Cada clase permite hasta 3 archivos PDF', 409)

    const { url, nombre } = await materialService.subirPdf(archivo, idClase)
    return tx.materialClase.create({
      data: { id_clase: idClase, nombre, url }
    })
  }, { maxWait: 10_000, timeout: 60_000 })

  res.status(200).json({
    material: { id_material: material.id_material, url: material.url, nombre: material.nombre },
    cantidad: await prisma.materialClase.count({ where: { id_clase: idClase } })
  })
})

router.patch('/:id/material/:id_material', auth(['profesor']), upload.single('pdf'), async (req: Request, res: Response) => {
  const idClase = String(req.params.id)
  const idMaterial = String(req.params.id_material)
  const clase = await prisma.clase.findUnique({ where: { id_clase: idClase } })
  if (!clase || clase.id_profesor !== obtenerIdRol(req)) throw new AppError('Clase no encontrada', 404)
  const archivo = req.file
  if (!archivo) throw new AppError('Falta el archivo PDF para reemplazar', 400)

  const existente = await prisma.materialClase.findFirst({
    where: { id_material: idMaterial, id_clase: idClase }
  })
  if (!existente) throw new AppError('PDF no encontrado', 404)

  const { url, nombre } = await materialService.subirPdf(archivo, idClase)
  const actualizado = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idClase}))`
    const actual = await tx.materialClase.findFirst({
      where: { id_material: idMaterial, id_clase: idClase }
    })
    if (!actual) throw new AppError('PDF no encontrado', 404)

    const nuevo = await tx.materialClase.update({
      where: { id_material: idMaterial },
      data: { url, nombre }
    })
    await tx.clase.updateMany({
      where: { id_clase: idClase, materialUrl: actual.url },
      data: { materialUrl: url, materialNombre: nombre }
    })
    return { actualizado: nuevo, anteriorUrl: actual.url }
  })

  let advertencia: string | undefined
  try {
    await materialService.eliminarPdf(actualizado.anteriorUrl)
  } catch (error) {
    console.error('No se pudo eliminar el PDF reemplazado', error)
    advertencia = 'El PDF se reemplazó, pero no se pudo eliminar el archivo anterior del almacenamiento.'
  }

  res.status(200).json({
    material: {
      id_material: actualizado.actualizado.id_material,
      url: actualizado.actualizado.url,
      nombre: actualizado.actualizado.nombre
    },
    ...(advertencia ? { advertencia } : {})
  })
})

router.delete('/:id/material/:id_material', auth(['profesor']), async (req: Request, res: Response) => {
  const idClase = String(req.params.id)
  const idMaterial = String(req.params.id_material)
  const clase = await prisma.clase.findUnique({ where: { id_clase: idClase } })
  if (!clase || clase.id_profesor !== obtenerIdRol(req)) throw new AppError('Clase no encontrada', 404)

  const material = await prisma.materialClase.findFirst({
    where: { id_material: idMaterial, id_clase: idClase }
  })
  if (!material) throw new AppError('PDF no encontrado', 404)

  const urlEliminada = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idClase}))`
    const actual = await tx.materialClase.findFirst({
      where: { id_material: idMaterial, id_clase: idClase }
    })
    if (!actual) throw new AppError('PDF no encontrado', 404)
    await tx.materialClase.delete({ where: { id_material: idMaterial } })
    await tx.clase.updateMany({
      where: { id_clase: idClase, materialUrl: actual.url },
      data: { materialUrl: null, materialNombre: null }
    })
    return actual.url
  })

  let advertencia: string | undefined
  try {
    await materialService.eliminarPdf(urlEliminada)
  } catch (error) {
    console.error('No se pudo eliminar el PDF del almacenamiento', error)
    advertencia = 'El PDF se quitó de la clase, pero no se pudo eliminar el archivo del almacenamiento.'
  }

  res.status(200).json({ message: 'PDF eliminado de la clase', ...(advertencia ? { advertencia } : {}) })
})

export default router
