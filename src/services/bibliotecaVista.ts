import { posix } from 'node:path'
import { SaxesParser } from 'saxes'
import { fromBufferPromise } from 'yauzl'
import { AppError } from '../utils/error.js'

type Seccion = { titulo: string; contenido: string }
type Etiqueta = { name: string; attributes: Record<string, string> }
const MAXIMO_XML = 16 * 1024 * 1024
const MAXIMO_TEXTO = 200_000

function leerXml(xml: string, abrir: (tag: Etiqueta) => void, texto: (valor: string) => void, cerrar: (nombre: string) => void) {
  const parser = new SaxesParser()
  parser.on('doctype', () => { throw new Error('No se admite DTD') })
  parser.on('opentag', (tag) => abrir({ name: tag.name, attributes: tag.attributes }))
  parser.on('text', texto)
  parser.on('cdata', texto)
  parser.on('closetag', (tag) => cerrar(tag.name))
  parser.write(xml).close()
}

const local = (nombre: string) => nombre.split(':').pop()!

async function extraerXml(contenido: Buffer): Promise<Map<string, string>> {
  const zip = await fromBufferPromise(contenido, { lazyEntries: true, autoClose: false, validateEntrySizes: true })
  const archivos = new Map<string, string>()
  let total = 0
  try {
    if (zip.entryCount > 2000) throw new Error('Demasiados archivos internos')
    for await (const entrada of zip.eachEntry()) {
      const nombre = entrada.fileName
      if (!/^(word\/document\.xml|ppt\/presentation\.xml|ppt\/_rels\/presentation\.xml\.rels|ppt\/slides\/slide\d+\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/worksheets\/sheet\d+\.xml)$/.test(nombre)) continue
      if (archivos.has(nombre) || entrada.isEncrypted()) throw new Error('Archivo interno inválido')
      total += entrada.uncompressedSize
      if (total > MAXIMO_XML) throw new Error('Documento demasiado grande para previsualizar')
      const stream = await zip.openReadStreamPromise(entrada)
      const partes: Buffer[] = []
      let leidos = 0
      for await (const parte of stream) {
        const buffer = Buffer.from(parte)
        leidos += buffer.length
        if (leidos > entrada.uncompressedSize || leidos > MAXIMO_XML) throw new Error('Archivo interno demasiado grande')
        partes.push(buffer)
      }
      archivos.set(nombre, new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(partes)))
    }
  } finally {
    zip.close()
  }
  return archivos
}

function parrafos(xml: string): string {
  let leyendo = false
  let parrafo = ''
  const resultado: string[] = []
  leerXml(xml, (tag) => {
    const nombre = local(tag.name)
    if (nombre === 'p') parrafo = ''
    if (nombre === 't') leyendo = true
    if (nombre === 'tab') parrafo += '\t'
    if (nombre === 'br') parrafo += '\n'
  }, (texto) => { if (leyendo) parrafo += texto }, (tag) => {
    const nombre = local(tag)
    if (nombre === 't') leyendo = false
    if (nombre === 'p') resultado.push(parrafo)
  })
  return resultado.join('\n')
}

function relaciones(xml: string, base: string): Map<string, string> {
  const resultado = new Map<string, string>()
  leerXml(xml, (tag) => {
    if (local(tag.name) !== 'Relationship' || tag.attributes.TargetMode === 'External') return
    const { Id, Target } = tag.attributes
    if (Id && Target) resultado.set(Id, posix.normalize(Target.startsWith('/') ? Target.slice(1) : `${base}/${Target}`))
  }, () => {}, () => {})
  return resultado
}

function listaOrdenada(xml: string, rels: Map<string, string>, etiqueta: string): { nombre: string; ruta: string }[] {
  const items: { nombre: string; ruta: string }[] = []
  leerXml(xml, (tag) => {
    if (local(tag.name) !== etiqueta) return
    if (items.length >= 200) throw new Error('Demasiadas secciones')
    const id = tag.attributes['r:id']
    const ruta = rels.get(id)
    if (!ruta) throw new Error('Relación de documento inválida')
    items.push({ nombre: tag.attributes.name || '', ruta })
  }, () => {}, () => {})
  return items
}

function textosCompartidos(xml: string): string[] {
  const resultado: string[] = []
  let texto = ''
  let leyendo = false
  leerXml(xml, (tag) => {
    if (local(tag.name) === 'si') texto = ''
    if (local(tag.name) === 't') leyendo = true
  }, (valor) => { if (leyendo) texto += valor }, (tag) => {
    if (local(tag) === 't') leyendo = false
    if (local(tag) === 'si') {
      if (resultado.length >= 100_000) throw new Error('Demasiados textos compartidos')
      resultado.push(texto)
    }
  })
  return resultado
}

function hoja(xml: string, compartidos: string[], limite: { longitud: number }): string {
  const filas: string[] = []
  let celdas: string[] = []
  let tipo = ''
  let columna = 0
  let valor = ''
  let leyendo = false
  let totalCeldas = 0
  leerXml(xml, (tag) => {
    const nombre = local(tag.name)
    if (nombre === 'row') {
      if (filas.length >= 20_000) throw new Error('Demasiadas filas')
      if (++limite.longitud > MAXIMO_XML) throw new Error('Vista previa demasiado grande')
      celdas = []
    }
    if (nombre === 'c') {
      totalCeldas++
      if (totalCeldas > 100_000) throw new Error('Demasiadas celdas')
      tipo = tag.attributes.t || ''
      valor = ''
      const letras = tag.attributes.r?.match(/^[A-Z]+/)?.[0]
      columna = letras ? [...letras].reduce((n, letra) => n * 26 + letra.charCodeAt(0) - 64, 0) - 1 : celdas.length
      if (columna >= 100) throw new Error('La hoja tiene demasiadas columnas para previsualizar')
    }
    if (nombre === 'v' || (nombre === 't' && tipo === 'inlineStr')) leyendo = true
  }, (texto) => { if (leyendo) valor += texto }, (tag) => {
    const nombre = local(tag)
    if (nombre === 'v' || nombre === 't') leyendo = false
    if (nombre === 'c') {
      if (tipo === 's') {
        const indice = Number(valor)
        if (!/^\d+$/.test(valor) || compartidos[indice] === undefined) throw new Error('Texto compartido inválido')
        valor = compartidos[indice]
      } else if (tipo === 'b') valor = valor === '1' ? 'VERDADERO' : 'FALSO'
      limite.longitud += valor.length + Math.max(0, columna - celdas.length + 1)
      if (limite.longitud > MAXIMO_XML) throw new Error('Vista previa demasiado grande')
      while (celdas.length <= columna) celdas.push('')
      celdas[columna] = valor
    }
    if (nombre === 'row') filas.push(celdas.join('\t'))
  })
  return filas.join('\n')
}

export async function vistaTextoMaterial(nombre: string, contenido: Buffer): Promise<{ secciones: Seccion[]; truncado: boolean }> {
  const extension = nombre.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase()
  try {
    let secciones: Seccion[]
    if (extension === 'txt' || extension === 'csv') {
      const texto = new TextDecoder('utf-8', { fatal: true }).decode(contenido)
      if (texto.includes('\0')) throw new Error('Texto inválido')
      secciones = [{ titulo: extension.toUpperCase(), contenido: texto }]
    } else {
      const archivos = await extraerXml(contenido)
      const requerido = (ruta: string) => {
        const contenidoXml = archivos.get(ruta)
        if (contenidoXml === undefined) throw new Error('Documento incompleto')
        return contenidoXml
      }
      if (extension === 'docx') {
        secciones = [{ titulo: 'Documento', contenido: parrafos(requerido('word/document.xml')) }]
      } else if (extension === 'pptx') {
        const rels = relaciones(requerido('ppt/_rels/presentation.xml.rels'), 'ppt')
        const diapositivas = listaOrdenada(requerido('ppt/presentation.xml'), rels, 'sldId')
        secciones = diapositivas.map((item, indice) => ({ titulo: `Diapositiva ${indice + 1}`, contenido: parrafos(requerido(item.ruta)) }))
      } else if (extension === 'xlsx') {
        const rels = relaciones(requerido('xl/_rels/workbook.xml.rels'), 'xl')
        const hojas = listaOrdenada(requerido('xl/workbook.xml'), rels, 'sheet')
        const compartidos = archivos.has('xl/sharedStrings.xml') ? textosCompartidos(requerido('xl/sharedStrings.xml')) : []
        const limite = { longitud: 0 }
        secciones = hojas.map((item, indice) => ({ titulo: item.nombre || `Hoja ${indice + 1}`, contenido: hoja(requerido(item.ruta), compartidos, limite) }))
      } else throw new AppError('Este tipo de archivo no admite vista previa de texto.', 400)
    }
    if (!secciones.length) throw new Error('El documento no tiene secciones')
    let disponible = MAXIMO_TEXTO
    let truncado = false
    secciones = secciones.map((seccion) => {
      if (seccion.contenido.length > disponible) truncado = true
      const texto = seccion.contenido.slice(0, disponible)
      disponible -= texto.length
      return { ...seccion, contenido: texto }
    })
    return { secciones, truncado }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('No se pudo leer este documento para la vista previa. Descargalo para abrirlo con una aplicación compatible.', 422)
  }
}
