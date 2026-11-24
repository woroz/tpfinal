import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

function entorno() {
  const estado = { tareas: [], asignaciones: [], avisos: [], bloqueos: 0 }
  const clase = { id_clase: 'clase', titulo: 'Matemática' }
  class AppError extends Error {
    constructor(mensaje, estadoHttp) { super(mensaje); this.estadoHttp = estadoHttp }
  }
  let cola = Promise.resolve()
  const prisma = {
    clase: { findFirst: async () => clase },
    inscripcion: { findMany: async ({ where }) => where.id_alumno.in.map((id) => ({
      id_alumno: id, alumno: { id_usuario: `usuario-${id}` }
    })) },
    tarea: {
      findFirst: async ({ where }) => estado.tareas.find((tarea) => tarea.id_clase === where.id_clase) ?? null,
      create: async ({ data }) => {
        const tarea = { ...data, id_tarea: `tarea-${estado.tareas.length + 1}` }
        estado.tareas.push(tarea)
        return tarea
      }
    },
    tareaAlumno: {
      createMany: async ({ data }) => {
        estado.asignaciones.push(...data.map((item) => ({ ...item, entregadaEn: null, nota: null })))
        return { count: data.length }
      },
      findUnique: async ({ where }) => {
        const item = estado.asignaciones.find((asignacion) =>
          asignacion.id_tarea === where.id_tarea_id_alumno.id_tarea &&
          asignacion.id_alumno === where.id_tarea_id_alumno.id_alumno)
        if (!item) return null
        const tarea = estado.tareas.find((actual) => actual.id_tarea === item.id_tarea)
        return {
          alumno: { usuario: { nombre: 'Alumno de prueba' } },
          tarea: { ...tarea, clase: { titulo: clase.titulo, profesor: { usuario: { id_usuario: 'usuario-profesor' } } } }
        }
      },
      updateMany: async ({ where, data }) => {
        const item = estado.asignaciones.find((asignacion) =>
          asignacion.id_tarea === where.id_tarea && asignacion.id_alumno === where.id_alumno &&
          asignacion.nota === null && (where.entregadaEn !== null || asignacion.entregadaEn === null))
        if (!item) return { count: 0 }
        Object.assign(item, data)
        return { count: 1 }
      }
    },
    entregaArchivo: { count: async () => 0 },
    notificacion: {
      createMany: async ({ data }) => { estado.avisos.push(...data); return { count: data.length } },
      create: async ({ data }) => { estado.avisos.push(data); return data }
    },
    $queryRaw: async () => { estado.bloqueos++; return [] },
    $transaction: (accion) => {
      const resultado = cola.then(() => accion(prisma))
      cola = resultado.then(() => undefined, () => undefined)
      return resultado
    }
  }
  const codigo = stripTypeScriptTypes(readFileSync(new URL('../src/services/tareaService.ts', import.meta.url), 'utf8'))
    .replace("import { put, del } from '@vercel/blob'", "const { put, del } = require('@vercel/blob')")
    .replace('import { prisma } from "../utils/prisma.js";', 'const { prisma } = require("../utils/prisma.js");')
    .replace('import { AppError } from "../utils/error.js";', 'const { AppError } = require("../utils/error.js");')
    .replace('export const tareaService =', 'exports.tareaService =')
  const modulo = { exports: {} }
  vm.runInNewContext(codigo, {
    exports: modulo.exports,
    require: (nombre) => {
      if (nombre === '@vercel/blob') return {}
      if (nombre === '../utils/prisma.js') return { prisma }
      if (nombre === '../utils/error.js') return { AppError }
      throw new Error(`Dependencia inesperada: ${nombre}`)
    },
    Date, Set
  })
  return { servicio: modulo.exports.tareaService, estado }
}

test('solo crea una tarea por clase y avisa a los alumnos asignados', async () => {
  const { servicio, estado } = entorno()
  const datos = { id_clase: 'clase', titulo: 'Ejercicio', id_alumno: ['uno', 'dos'] }
  const resultados = await Promise.allSettled([
    servicio.crearTarea('profesor', datos),
    servicio.crearTarea('profesor', datos)
  ])
  assert.equal(resultados.filter((item) => item.status === 'fulfilled').length, 1)
  assert.match(resultados.find((item) => item.status === 'rejected').reason.message, /ya tiene una tarea/)
  assert.equal(estado.tareas.length, 1)
  assert.equal(estado.bloqueos, 2)
  assert.deepEqual(estado.avisos.map((item) => item.id_usuario).sort(), ['usuario-dos', 'usuario-uno'])
})

test('avisa al profesor quién entregó, sin duplicar el aviso al actualizar la entrega', async () => {
  const { servicio, estado } = entorno()
  await servicio.crearTarea('profesor', { id_clase: 'clase', titulo: 'Ejercicio', id_alumno: ['uno'] })
  await servicio.entregar('tarea-1', 'uno', { entregaTexto: 'Respuesta' })
  await servicio.entregar('tarea-1', 'uno', { entregaTexto: 'Respuesta editada' })
  const avisos = estado.avisos.filter((item) => item.tipo === 'tarea_entregada')
  assert.equal(avisos.length, 1)
  assert.equal(avisos[0].id_usuario, 'usuario-profesor')
  assert.match(avisos[0].mensaje, /Alumno de prueba.*Ejercicio/)
  assert.equal(estado.asignaciones[0].entregaTexto, 'Respuesta editada')
})
