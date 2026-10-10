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
  if (!req.file) throw new AppError('Falta el archivo PDF', 400)

  const { url, nombre } = await materialService.subirPdf(req.file, idClase)
  const actualizada = await prisma.clase.update({
    where: { id_clase: idClase },
    data: { materialUrl: url, materialNombre: nombre }
  })
  res.status(200).json({ clase: actualizada })
})

export default router
