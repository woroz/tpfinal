import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { AppError } from '../utils/error.js'

const CABECERA = Buffer.from('BIB1')

function claveBiblioteca(): Buffer {
  const clave = process.env.BIBLIOTECA_CLAVE_CIFRADO
  if (!clave || !/^[0-9a-f]{64}$/i.test(clave)) {
    throw new AppError('La clave de cifrado de la biblioteca no está configurada correctamente.', 503)
  }
  return Buffer.from(clave, 'hex')
}

export function cifrarMaterial(contenido: Buffer, identificador: string): Buffer {
  const iv = randomBytes(12)
  const cifrador = createCipheriv('aes-256-gcm', claveBiblioteca(), iv)
  cifrador.setAAD(Buffer.from(identificador))
  const cifrado = Buffer.concat([cifrador.update(contenido), cifrador.final()])
  return Buffer.concat([CABECERA, iv, cifrador.getAuthTag(), cifrado])
}

export function descifrarMaterial(contenido: Buffer, identificador: string): Buffer {
  if (contenido.length < 32 || !contenido.subarray(0, 4).equals(CABECERA)) {
    throw new Error('El archivo de biblioteca no tiene un formato cifrado válido.')
  }
  const descifrador = createDecipheriv('aes-256-gcm', claveBiblioteca(), contenido.subarray(4, 16))
  descifrador.setAAD(Buffer.from(identificador))
  descifrador.setAuthTag(contenido.subarray(16, 32))
  return Buffer.concat([descifrador.update(contenido.subarray(32)), descifrador.final()])
}

const TIPOS: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
}

export function validarMaterial(nombre: string, contenido: Buffer): string {
  const extension = nombre.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() ?? ''
  const tipo = TIPOS[extension]
  if (!tipo) throw new AppError('Usá un archivo PDF, PNG, JPG, DOCX, XLSX, PPTX, TXT o CSV.', 400)
  if (!contenido.length || contenido.length > 4 * 1024 * 1024) {
    throw new AppError('El archivo debe tener hasta 4 MB.', 400)
  }
  const pdf = contenido.subarray(0, 5).toString('ascii') === '%PDF-'
  const png = contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const jpg = contenido.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  const zip = contenido.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
  if ((extension === 'pdf' && !pdf) || (extension === 'png' && !png) ||
      (['jpg', 'jpeg'].includes(extension) && !jpg) ||
      (['docx', 'xlsx', 'pptx'].includes(extension) && !zip)) {
    throw new AppError('El contenido del archivo no corresponde a su extensión.', 400)
  }
  if (['txt', 'csv'].includes(extension)) {
    try {
      const texto = new TextDecoder('utf-8', { fatal: true }).decode(contenido)
      if (texto.includes('\0')) throw new Error('Texto con caracteres nulos')
    } catch {
      throw new AppError('El archivo de texto debe estar codificado en UTF-8.', 400)
    }
  }
  return tipo
}
