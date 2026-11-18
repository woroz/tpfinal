import assert from 'node:assert/strict'
import test from 'node:test'

Object.assign(process.env, {
  JWT_SECRET: 'clave-de-prueba',
  JWT_REFRESH_SECRET: 'clave-refresco-prueba',
})

const [{ default: express }, { default: jwt }, { prisma }, { default: rutas },
  { errorMiddleware }, { materialService }, { logroService }] = await Promise.all([
  import('express'),
  import('jsonwebtoken'),
  import('../dist/utils/prisma.js'),
  import('../dist/routes/materialRoutes.js'),
  import('../dist/middlewares/errorMiddleware.js'),
  import('../dist/services/materialService.js'),
  import('../dist/services/logroService.js'),
])

test('limita los PDF iniciales a tres y el total de la clase a diez', async (t) => {
  const originales = []
  function simular(objeto, nombre, valor) {
    const original = objeto[nombre]
    originales.push(() => { objeto[nombre] = original })
    objeto[nombre] = valor
  }
  t.after(() => originales.reverse().forEach((restaurar) => restaurar()))

  const materiales = []
  simular(prisma.usuario, 'findUnique', async ({ where }) => ({
    id_usuario: where.id_usuario, rol: 'profesor', bloqueado: false,
  }))
  simular(prisma.clase, 'findUnique', async ({ select }) =>
    select ? { materialUrl: null } : { id_profesor: 'profesor' }
  )
  simular(prisma, '$transaction', async (accion) => accion(prisma))
  simular(prisma, '$executeRaw', async () => {})
  simular(prisma.materialClase, 'count', async () => materiales.length)
  simular(prisma.materialClase, 'findFirst', async () => null)
  simular(prisma.materialClase, 'create', async ({ data }) => {
    const material = { id_material: String(materiales.length + 1), ...data }
    materiales.push(material)
    return material
  })
  simular(materialService, 'subirPdf', async (_archivo, idClase) => ({
    url: `https://archivos.test/${idClase}/${materiales.length + 1}.pdf`,
    nombre: `archivo-${materiales.length + 1}.pdf`,
  }))
  simular(logroService, 'actualizarSeguro', async () => {})

  const app = express()
  app.use(express.json())
  app.use('/clases', rutas)
  app.use(errorMiddleware)
  const servidor = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia))
  })
  t.after(() => new Promise((resolve, reject) =>
    servidor.close((error) => error ? reject(error) : resolve())
  ))

  const base = `http://127.0.0.1:${servidor.address().port}/clases/clase`
  const token = jwt.sign({ id_usuario: 'usuario', id_rol: 'profesor', rol: 'profesor' }, process.env.JWT_SECRET)
  async function subir(ruta) {
    const cuerpo = new FormData()
    cuerpo.append('pdf', new Blob(['%PDF-prueba'], { type: 'application/pdf' }), 'archivo.pdf')
    return fetch(`${base}/${ruta}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: cuerpo })
  }

  for (let indice = 0; indice < 3; indice += 1) {
    assert.equal((await subir('material-inicial')).status, 200)
  }
  assert.equal((await subir('material-inicial')).status, 409)
  for (let indice = 0; indice < 7; indice += 1) {
    assert.equal((await subir('material')).status, 200)
  }
  assert.equal((await subir('material')).status, 409)
  assert.equal(materiales.length, 10)
})
