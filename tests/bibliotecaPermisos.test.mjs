import assert from 'node:assert/strict'
import test from 'node:test'

Object.assign(process.env, {
  PORT: '3000', NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
  JWT_SECRET: 'clave-de-prueba', JWT_REFRESH_SECRET: 'clave-refresco-prueba',
  GROQ_API_KEY: 'prueba', GROQ_MODEL: 'prueba', GROQ_RESUMEN_MODEL: 'prueba', CRON_SECRET: 'prueba',
  B2_KEY_ID: 'prueba', B2_APPLICATION_KEY: 'prueba', B2_BUCKET_NAME: 'prueba',
  B2_ENDPOINT: 'http://127.0.0.1:1', B2_REGION: 'test', BIBLIOTECA_CLAVE_CIFRADO: 'ab'.repeat(32),
})

const [{ default: express }, { default: jwt }, { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand },
  { prisma }, { default: rutas }, { errorMiddleware }] = await Promise.all([
  import('express'), import('jsonwebtoken'), import('@aws-sdk/client-s3'),
  import('../dist/utils/prisma.js'), import('../dist/routes/bibliotecaRoutes.js'), import('../dist/middlewares/errorMiddleware.js'),
])

test('compartir, previsualizar, descargar, reemplazar y borrar respeta destinatarios y notifica', async (t) => {
  const clase = {
    id_clase: 'clase', id_profesor: 'profesor', fecha_hora_fin: new Date(Date.now() - 60000), estado: 'finalizada',
    inscripciones: [
      { id_alumno: 'alumno', estado: 'confirmada', asistio: true, alumno: { id_usuario: 'usuario-alumno' } },
      { id_alumno: 'ausente', estado: 'confirmada', asistio: false, alumno: { id_usuario: 'usuario-ausente' } },
      { id_alumno: 'cancelado', estado: 'cancelada', asistio: true, alumno: { id_usuario: 'usuario-cancelado' } },
    ],
  }
  const materiales = new Map()
  const archivos = new Map()
  const avisos = []
  let secuencia = 0
  const cambios = []
  function simular(objeto, nombre, valor) {
    cambios.push(() => { objeto[nombre] = original })
    const original = objeto[nombre]
    objeto[nombre] = valor
  }
  t.after(() => cambios.reverse().forEach((restaurar) => restaurar()))
  simular(prisma.usuario, 'findUnique', async ({ where }) => ({ id_usuario: where.id_usuario, rol: 'alumno', bloqueado: false }))
  simular(prisma, '$transaction', async (funcion) => funcion(prisma))
  simular(prisma.clase, 'findFirst', async ({ where, select }) => {
    if (where.id_clase !== clase.id_clase || where.id_profesor !== clase.id_profesor ||
      clase.fecha_hora_fin > where.fecha_hora_fin.lte || !where.estado.in.includes(clase.estado)) return null
    const filtro = select.inscripciones.where
    return { inscripciones: clase.inscripciones.filter((i) => i.estado === filtro.estado &&
      (filtro.asistio === undefined || i.asistio === filtro.asistio) &&
      (filtro.id_alumno === undefined || i.id_alumno === filtro.id_alumno)) }
  })
  simular(prisma.materialDidactico, 'create', async ({ data }) => {
    const material = {
      ...data, id_material: String(++secuencia), fecha_carga: new Date(), fecha_modificacion: new Date(Date.now() - 1000),
      destinatarios: data.destinatarios.create.map(({ id_alumno }) => ({
        id_alumno, descargadoEn: null, alumno: clase.inscripciones.find((i) => i.id_alumno === id_alumno).alumno,
      })),
    }
    materiales.set(material.id_material, material)
    return { ...material, destinatarios: material.destinatarios.map((d) => ({ ...d })) }
  })
  simular(prisma.materialDidactico, 'findFirst', async ({ where }) => {
    const material = materiales.get(where.id_material)
    if (!material || !material.url_archivo.startsWith(where.url_archivo.startsWith)) return null
    if (where.id_profesor && where.id_profesor !== material.id_profesor) return null
    if (where.destinatarios && !material.destinatarios.some((d) => d.id_alumno === where.destinatarios.some.id_alumno)) return null
    return { ...material, destinatarios: material.destinatarios.map((d) => ({ ...d })) }
  })
  simular(prisma.materialDidactico, 'findMany', async ({ where }) => [...materiales.values()].filter((m) =>
    m.url_archivo.startsWith(where.url_archivo.startsWith) &&
    (where.id_profesor ? m.id_profesor === where.id_profesor : m.destinatarios.some((d) => d.id_alumno === where.destinatarios.some.id_alumno))
  ).map((m) => ({
    ...m, destinatarios: where.id_profesor ? m.destinatarios : m.destinatarios.filter((d) => d.id_alumno === where.destinatarios.some.id_alumno),
  })))
  simular(prisma.materialDidactico, 'updateMany', async ({ where, data }) => {
    const material = materiales.get(where.id_material)
    if (!material || material.id_profesor !== where.id_profesor || material.url_archivo !== where.url_archivo) return { count: 0 }
    Object.assign(material, data)
    return { count: 1 }
  })
  simular(prisma.materialDidactico, 'delete', async ({ where }) => { materiales.delete(where.id_material) })
  simular(prisma.materialAlumno, 'updateMany', async ({ where, data }) => {
    const material = materiales.get(where.id_material)
    if (!material) return { count: 0 }
    if (where.material?.url_archivo && typeof where.material.url_archivo === 'string' && material.url_archivo !== where.material.url_archivo) return { count: 0 }
    if (where.material?.fecha_modificacion && material.fecha_modificacion.getTime() !== where.material.fecha_modificacion.getTime()) return { count: 0 }
    const afectados = material.destinatarios.filter((d) => !where.id_alumno || d.id_alumno === where.id_alumno)
    afectados.forEach((d) => Object.assign(d, data))
    return { count: afectados.length }
  })
  simular(prisma.materialAlumno, 'deleteMany', async ({ where }) => { materiales.get(where.id_material).destinatarios = [] })
  simular(prisma.notificacion, 'createMany', async ({ data }) => { avisos.push(...data); return { count: data.length } })
  simular(S3Client.prototype, 'send', async (comando) => {
    if (comando instanceof PutObjectCommand) { archivos.set(comando.input.Key, Buffer.from(comando.input.Body)); return {} }
    if (comando instanceof DeleteObjectCommand) { archivos.delete(comando.input.Key); return {} }
    if (comando instanceof GetObjectCommand) {
      const contenido = archivos.get(comando.input.Key)
      return { Body: { transformToByteArray: async () => contenido }, ContentLength: contenido.length }
    }
    throw new Error('Operación de almacenamiento inesperada')
  })

  const app = express()
  app.use(express.json())
  app.use('/biblioteca', rutas)
  app.use(errorMiddleware)
  const servidor = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia))
  })
  t.after(() => new Promise((resolve, reject) => servidor.close((error) => error ? reject(error) : resolve())))
  const base = `http://127.0.0.1:${servidor.address().port}/biblioteca`
  const token = (rol, id) => jwt.sign({ id_usuario: id, id_rol: id, rol }, process.env.JWT_SECRET)
  const headers = (rol, id) => ({ Authorization: `Bearer ${token(rol, id)}` })
  const cuerpoArchivo = (nombre = 'apunte.pdf') => {
    const cuerpo = new FormData()
    cuerpo.append('nombre_archivo', nombre)
    cuerpo.append('archivo', new Blob(['%PDF-material de prueba'], { type: 'application/pdf' }), nombre)
    return cuerpo
  }
  const subir = (profesor, grupo, alumno = '') => {
    const cuerpo = cuerpoArchivo()
    cuerpo.append('id_clase', 'clase')
    cuerpo.append('destinatarios', grupo)
    cuerpo.append('id_alumno', alumno)
    return fetch(`${base}/materiales`, { method: 'POST', headers: headers('profesor', profesor), body: cuerpo })
  }
  assert.equal((await subir('otro', 'inscritos')).status, 403)
  assert.equal((await subir('profesor', 'alumno', 'cancelado')).status, 400)
  clase.fecha_hora_fin = new Date(Date.now() + 60000)
  assert.equal((await subir('profesor', 'inscritos')).status, 403)
  clase.fecha_hora_fin = new Date(Date.now() - 60000)
  clase.estado = 'cancelada'
  assert.equal((await subir('profesor', 'inscritos')).status, 403)
  clase.estado = 'finalizada'

  const asistencia = await (await subir('profesor', 'asistieron')).json()
  assert.deepEqual(materiales.get(asistencia.material.id_material).destinatarios.map((d) => d.id_alumno), ['alumno'])
  const carga = await subir('profesor', 'inscritos')
  assert.equal(carga.status, 201)
  const id = (await carga.json()).material.id_material
  const material = materiales.get(id)
  assert.deepEqual(material.destinatarios.map((d) => d.id_alumno), ['alumno', 'ausente'])
  assert.equal(archivos.get(material.url_archivo).includes(Buffer.from('%PDF-material de prueba')), false)
  assert.deepEqual(avisos.map((a) => a.id_usuario), ['usuario-alumno', 'usuario-alumno', 'usuario-ausente'])

  const archivo = (rol, usuario, vista = false) => fetch(`${base}/materiales/${id}/archivo${vista ? '?vista=1' : ''}`, { headers: headers(rol, usuario) })
  assert.equal((await archivo('alumno', 'cancelado')).status, 404)
  assert.equal((await archivo('profesor', 'otro')).status, 404)
  assert.equal((await archivo('profesor', 'profesor', true)).status, 200)
  assert.equal((await archivo('alumno', 'alumno', true)).status, 200)
  assert.equal(material.destinatarios[0].descargadoEn, null)
  const descarga = await archivo('alumno', 'alumno')
  assert.equal(descarga.status, 200)
  assert.equal(await descarga.text(), '%PDF-material de prueba')
  assert.ok(material.destinatarios[0].descargadoEn)
  const versionAnterior = material.fecha_modificacion.toISOString()

  const reemplazar = (usuario) => fetch(`${base}/materiales/${id}`, { method: 'PUT', headers: headers('profesor', usuario), body: cuerpoArchivo('nuevo.pdf') })
  assert.equal((await reemplazar('otro')).status, 404)
  assert.equal((await reemplazar('profesor')).status, 200)
  assert.equal(material.titulo, 'nuevo.pdf')
  assert.equal(material.destinatarios[0].descargadoEn, null)
  assert.equal(avisos.filter((a) => a.tipo === 'biblioteca_modificado').length, 2)
  const confirmar = (fecha) => fetch(`${base}/materiales/${id}/descarga`, {
    method: 'POST', headers: { ...headers('alumno', 'alumno'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha_modificacion: fecha }),
  })
  assert.equal((await confirmar(versionAnterior)).status, 409)
  assert.equal((await confirmar(material.fecha_modificacion.toISOString())).status, 200)

  const eliminar = (usuario) => fetch(`${base}/materiales/${id}`, { method: 'DELETE', headers: headers('profesor', usuario) })
  assert.equal((await eliminar('otro')).status, 404)
  assert.equal((await eliminar('profesor')).status, 200)
  assert.equal((await archivo('alumno', 'alumno')).status, 404)
  assert.equal(avisos.filter((a) => a.tipo === 'biblioteca_eliminado').length, 2)

  const cuerpoTexto = new FormData()
  cuerpoTexto.append('id_clase', 'clase')
  cuerpoTexto.append('destinatarios', 'alumno')
  cuerpoTexto.append('id_alumno', 'alumno')
  cuerpoTexto.append('nombre_archivo', 'notas.csv')
  cuerpoTexto.append('archivo', new Blob(['nombre,nota\nAna,9']), 'notas.csv')
  const texto = await fetch(`${base}/materiales`, { method: 'POST', headers: headers('profesor', 'profesor'), body: cuerpoTexto })
  assert.equal(texto.status, 201)
  const idTexto = (await texto.json()).material.id_material
  const vistaTexto = (rol, usuario) => fetch(`${base}/materiales/${idTexto}/vista`, { headers: headers(rol, usuario) })
  assert.equal((await vistaTexto('alumno', 'cancelado')).status, 404)
  const respuestaVista = await vistaTexto('alumno', 'alumno')
  assert.equal(respuestaVista.status, 200)
  assert.equal((await respuestaVista.json()).secciones[0].contenido, 'nombre,nota\nAna,9')
  assert.equal(materiales.get(idTexto).destinatarios[0].descargadoEn, null)
})
