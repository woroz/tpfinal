import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../utils/prisma.js'
import { AppError } from '../utils/error.js'
import { cifrarMaterial, descifrarMaterial, validarMaterial } from './bibliotecaArchivos.js'

function almacenamiento() {
  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION } = process.env
  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT || !B2_REGION) {
    throw new AppError('El almacenamiento de la biblioteca no está configurado.', 503)
  }
  return {
    bucket: B2_BUCKET_NAME,
    client: new S3Client({
      region: B2_REGION, endpoint: B2_ENDPOINT,
      credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APPLICATION_KEY },
      forcePathStyle: true,
    }),
  }
}

const estadosValidos = ['disponible', 'confirmada', 'finalizada']
export type DestinatariosBiblioteca = 'alumno' | 'asistieron' | 'inscritos'

function prepararArchivo(nombreArchivo: string, archivo: Express.Multer.File) {
  const nombre = nombreArchivo.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, '')
  const tipo = validarMaterial(nombre, archivo.buffer)
  const extension = nombre.slice(nombre.lastIndexOf('.'))
  const titulo = nombre.slice(0, -extension.length).slice(0, 200 - extension.length) + extension
  const key = `biblioteca/${randomUUID()}.bin`
  return { titulo, tipo, key, cifrado: cifrarMaterial(archivo.buffer, key) }
}

async function eliminarArchivo(key: string) {
  const { client, bucket } = almacenamiento()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

async function limpiarArchivo(key: string) {
  try {
    await eliminarArchivo(key)
  } catch (error) {
    console.error('No se pudo eliminar el archivo de biblioteca del almacenamiento', { key, error })
  }
}

async function notificar(
  tx: Prisma.TransactionClient,
  destinatarios: { alumno: { id_usuario: string } }[],
  idClase: string,
  accion: 'subido' | 'modificado' | 'eliminado',
  titulo: string,
) {
  await tx.notificacion.createMany({
    data: destinatarios.map(({ alumno }) => ({
      id_usuario: alumno.id_usuario,
      id_clase: idClase,
      tipo: `biblioteca_${accion}`,
      titulo: `Material ${accion}`,
      mensaje: `El material "${titulo}" fue ${accion} en tu biblioteca.`,
    })),
  })
}

const seleccionMaterial = {
  id_material: true, titulo: true, tipo_archivo: true, fecha_carga: true, fecha_modificacion: true,
  clase: { select: { titulo: true, fecha_hora_inicio: true, materia: { select: { id_materia: true, nombreMateria: true } } } },
  profesor: { select: { id_profesor: true, usuario: { select: { nombre: true } } } },
} satisfies Prisma.materialDidacticoSelect

export const bibliotecaService = {
  async clasesDisponibles(idProfesor: string) {
    const clases = await prisma.clase.findMany({
      where: {
        id_profesor: idProfesor, fecha_hora_fin: { lte: new Date() },
        estado: { in: estadosValidos }, inscripciones: { some: { estado: 'confirmada' } },
      },
      select: {
        id_clase: true, titulo: true, fecha_hora_inicio: true,
        inscripciones: {
          where: { estado: 'confirmada' },
          select: { id_alumno: true, asistio: true, alumno: { select: { usuario: { select: { nombre: true } } } } },
        },
      },
      orderBy: { fecha_hora_inicio: 'desc' },
    })
    return clases.map((clase) => ({
      id_clase: clase.id_clase, titulo: clase.titulo, inicio: clase.fecha_hora_inicio,
      alumnos: clase.inscripciones.map((item) => ({
        id_alumno: item.id_alumno, nombre: item.alumno.usuario.nombre, asistio: item.asistio,
      })),
    }))
  },

  async subir(idProfesor: string, idClase: string, grupo: DestinatariosBiblioteca, idAlumno: string | undefined, nombre: string, archivo: Express.Multer.File) {
    const clase = await prisma.clase.findFirst({
      where: { id_clase: idClase, id_profesor: idProfesor, fecha_hora_fin: { lte: new Date() }, estado: { in: estadosValidos } },
      select: {
        inscripciones: {
          where: { estado: 'confirmada', ...(grupo === 'asistieron' ? { asistio: true } : {}), ...(grupo === 'alumno' ? { id_alumno: idAlumno } : {}) },
          select: { id_alumno: true, alumno: { select: { id_usuario: true } } },
        },
      },
    })
    if (!clase) throw new AppError('La clase no existe o no está disponible para compartir material.', 403)
    const destinatarios = [...new Map(clase.inscripciones.map((item) => [item.id_alumno, item])).values()]
    if (!destinatarios.length) throw new AppError('No hay alumnos confirmados que cumplan la selección.', 400)
    const preparado = prepararArchivo(nombre, archivo)
    const { client, bucket } = almacenamiento()
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: preparado.key, Body: preparado.cifrado, ContentType: 'application/octet-stream' }))
    try {
      return await prisma.$transaction(async (tx) => {
        const material = await tx.materialDidactico.create({
          data: {
            id_profesor: idProfesor, id_clase: idClase, titulo: preparado.titulo,
            url_archivo: preparado.key, tipo_archivo: preparado.tipo,
            destinatarios: { create: destinatarios.map(({ id_alumno }) => ({ id_alumno })) },
          },
          select: { id_material: true, titulo: true, fecha_carga: true },
        })
        await notificar(tx, destinatarios, idClase, 'subido', material.titulo)
        return material
      })
    } catch (error) {
      await limpiarArchivo(preparado.key)
      throw error
    }
  },

  async listar(idAlumno: string) {
    const materiales = await prisma.materialDidactico.findMany({
      where: { destinatarios: { some: { id_alumno: idAlumno } }, url_archivo: { startsWith: 'biblioteca/' } },
      select: { ...seleccionMaterial, destinatarios: { where: { id_alumno: idAlumno }, select: { descargadoEn: true } } },
      orderBy: { fecha_carga: 'desc' },
    })
    return materiales.map(({ destinatarios, ...material }) => ({ ...material, descargadoEn: destinatarios[0]?.descargadoEn ?? null }))
  },

  async listarPdfClases(idAlumno: string) {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { id_alumno: idAlumno, estado: 'confirmada' },
      select: {
        clase: {
          select: {
            id_clase: true, titulo: true, fecha_hora_inicio: true, materialUrl: true, materialNombre: true,
            materia: { select: { id_materia: true, nombreMateria: true } },
            profesor: { select: { id_profesor: true, usuario: { select: { nombre: true } } } },
            archivosPdf: { orderBy: { fecha_carga: 'asc' }, select: { id_material: true, nombre: true, url: true, fecha_carga: true } },
          },
        },
      },
      orderBy: { clase: { fecha_hora_inicio: 'desc' } },
    })
    return inscripciones.flatMap(({ clase }) => {
      const archivos = clase.archivosPdf.length
        ? clase.archivosPdf
        : clase.materialUrl
          ? [{ id_material: `legado-${clase.id_clase}`, nombre: clase.materialNombre ?? 'Material de la clase', url: clase.materialUrl, fecha_carga: clase.fecha_hora_inicio }]
          : []
      return archivos.map((archivo) => ({
        id_material: archivo.id_material,
        id_clase: clase.id_clase,
        titulo: clase.titulo,
        nombre: archivo.nombre,
        url: archivo.url,
        fecha_carga: archivo.fecha_carga,
        clase: { id_clase: clase.id_clase, titulo: clase.titulo, materia: clase.materia },
        profesor: clase.profesor,
      }))
    })
  },

  async listarProfesor(idProfesor: string) {
    return prisma.materialDidactico.findMany({
      where: { id_profesor: idProfesor, url_archivo: { startsWith: 'biblioteca/' } },
      select: { ...seleccionMaterial, destinatarios: { select: { alumno: { select: { usuario: { select: { nombre: true } } } } } } },
      orderBy: { fecha_carga: 'desc' },
    })
  },

  async reemplazar(idProfesor: string, idMaterial: string, nombre: string, archivo: Express.Multer.File) {
    const existente = await prisma.materialDidactico.findFirst({
      where: { id_material: idMaterial, id_profesor: idProfesor, url_archivo: { startsWith: 'biblioteca/' } },
      select: { id_clase: true, url_archivo: true, fecha_modificacion: true, destinatarios: { select: { alumno: { select: { id_usuario: true } } } } },
    })
    if (!existente) throw new AppError('No se encontró el material.', 404)
    const preparado = prepararArchivo(nombre, archivo)
    const { client, bucket } = almacenamiento()
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: preparado.key, Body: preparado.cifrado, ContentType: 'application/octet-stream' }))
    try {
      await prisma.$transaction(async (tx) => {
        const resultado = await tx.materialDidactico.updateMany({
          where: { id_material: idMaterial, id_profesor: idProfesor, url_archivo: existente.url_archivo },
          data: {
            titulo: preparado.titulo, tipo_archivo: preparado.tipo, url_archivo: preparado.key,
            fecha_modificacion: new Date(Math.max(Date.now(), existente.fecha_modificacion.getTime() + 1)),
          },
        })
        if (!resultado.count) throw new AppError('El material cambió. Actualizá la lista e intentá de nuevo.', 409)
        await tx.materialAlumno.updateMany({ where: { id_material: idMaterial }, data: { descargadoEn: null } })
        await notificar(tx, existente.destinatarios, existente.id_clase, 'modificado', preparado.titulo)
      })
    } catch (error) {
      await limpiarArchivo(preparado.key)
      throw error
    }
    await limpiarArchivo(existente.url_archivo)
  },

  async eliminar(idProfesor: string, idMaterial: string) {
    const existente = await prisma.materialDidactico.findFirst({
      where: { id_material: idMaterial, id_profesor: idProfesor, url_archivo: { startsWith: 'biblioteca/' } },
      select: { id_clase: true, titulo: true, url_archivo: true, destinatarios: { select: { alumno: { select: { id_usuario: true } } } } },
    })
    if (!existente) throw new AppError('No se encontró el material.', 404)
    await prisma.$transaction(async (tx) => {
      const resultado = await tx.materialDidactico.updateMany({
        where: { id_material: idMaterial, id_profesor: idProfesor, url_archivo: existente.url_archivo },
        data: { url_archivo: `eliminando/${randomUUID()}` },
      })
      if (!resultado.count) throw new AppError('El material cambió. Actualizá la lista e intentá de nuevo.', 409)
      await tx.materialAlumno.deleteMany({ where: { id_material: idMaterial } })
      await tx.materialDidactico.delete({ where: { id_material: idMaterial } })
      await notificar(tx, existente.destinatarios, existente.id_clase, 'eliminado', existente.titulo)
    })
    await limpiarArchivo(existente.url_archivo)
  },

  async registrarDescarga(idMaterial: string, idAlumno: string, fechaModificacion: Date) {
    const resultado = await prisma.materialAlumno.updateMany({
      where: {
        id_material: idMaterial, id_alumno: idAlumno,
        material: { url_archivo: { startsWith: 'biblioteca/' }, fecha_modificacion: fechaModificacion },
      },
      data: { descargadoEn: new Date() },
    })
    if (!resultado.count) throw new AppError('El material cambió o ya no está disponible. Actualizá la lista.', 409)
  },

  async archivo(idMaterial: string, idRol: string, rol: 'alumno' | 'profesor', registrarDescarga: boolean) {
    const material = await prisma.materialDidactico.findFirst({
      where: {
        id_material: idMaterial, url_archivo: { startsWith: 'biblioteca/' },
        ...(rol === 'alumno' ? { destinatarios: { some: { id_alumno: idRol } } } : { id_profesor: idRol }),
      },
      select: { url_archivo: true, titulo: true, tipo_archivo: true },
    })
    if (!material) throw new AppError('No se encontró el material en tu biblioteca.', 404)
    const { client, bucket } = almacenamiento()
    const respuesta = await client.send(new GetObjectCommand({ Bucket: bucket, Key: material.url_archivo }))
    if (!respuesta.Body) throw new Error('El almacenamiento devolvió un archivo vacío.')
    if (respuesta.ContentLength === undefined || respuesta.ContentLength > 4 * 1024 * 1024 + 32) {
      throw new Error('El archivo almacenado tiene un tamaño inválido.')
    }
    const contenido = descifrarMaterial(Buffer.from(await respuesta.Body.transformToByteArray()), material.url_archivo)
    if (rol === 'alumno' && registrarDescarga) {
      await prisma.materialAlumno.updateMany({
        where: { id_material: idMaterial, id_alumno: idRol, material: { url_archivo: material.url_archivo } },
        data: { descargadoEn: new Date() },
      })
    }
    return { contenido, nombre: material.titulo, tipo: material.tipo_archivo ?? 'application/octet-stream' }
  },
}
