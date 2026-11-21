import multer from 'multer'
import { AppError } from './error.js'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
})

const TIPOS_AUDIO = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav"]
const TIPOS_TAREA = ['application/pdf', 'image/jpeg', 'image/png']

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tipoBase = file.mimetype.split(';')[0]
    if (TIPOS_AUDIO.includes(tipoBase)) cb(null, true)
    else cb(new AppError('Tipo de archivo no permitido', 400))
  },
})

export const uploadTarea = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (TIPOS_TAREA.includes(file.mimetype)) cb(null, true)
    else cb(new AppError('Solo se permiten PDF, JPG o PNG', 400))
  },
})