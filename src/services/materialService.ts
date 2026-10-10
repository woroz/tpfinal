import { del, put } from '@vercel/blob'
import { AppError } from '../utils/error.js'

const MAX_BYTES = 4 * 1024 * 1024

export const materialService = {
  async subirPdf(archivo: Express.Multer.File, idClase: string) {
    if (archivo.size > MAX_BYTES) throw new AppError('El PDF supera los 4 MB', 400)
    if (archivo.buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
      throw new AppError('El archivo no es un PDF valido', 400)
    }
    const blob = await put(`clases/${idClase}/material.pdf`, archivo.buffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true
    })
    return { url: blob.url, nombre: archivo.originalname.slice(0, 120) }
  },

  async eliminarPdf(url: string) {
    await del(url)
  },
}
