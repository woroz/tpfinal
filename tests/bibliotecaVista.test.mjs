import assert from 'node:assert/strict'
import test from 'node:test'
import { deflateRawSync } from 'node:zlib'
import { vistaTextoMaterial } from '../dist/services/bibliotecaVista.js'
import { validarMaterial } from '../dist/services/bibliotecaArchivos.js'

function zip(archivos) {
  const locales = []
  const centrales = []
  let desplazamiento = 0
  for (const [nombre, texto] of Object.entries(archivos)) {
    const ruta = Buffer.from(nombre)
    const contenido = Buffer.from(texto)
    const comprimido = deflateRawSync(contenido)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(comprimido.length, 18)
    local.writeUInt32LE(contenido.length, 22)
    local.writeUInt16LE(ruta.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(comprimido.length, 20)
    central.writeUInt32LE(contenido.length, 24)
    central.writeUInt16LE(ruta.length, 28)
    central.writeUInt32LE(desplazamiento, 42)
    locales.push(local, ruta, comprimido)
    centrales.push(central, ruta)
    desplazamiento += local.length + ruta.length + comprimido.length
  }
  const directorio = Buffer.concat(centrales)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(Object.keys(archivos).length, 8)
  fin.writeUInt16LE(Object.keys(archivos).length, 10)
  fin.writeUInt32LE(directorio.length, 12)
  fin.writeUInt32LE(desplazamiento, 16)
  return Buffer.concat([...locales, directorio, fin])
}

test('previsualiza texto de Word y diapositivas en su orden', async () => {
  const documento = zip({ 'word/document.xml': '<w:document xmlns:w="x"><w:p><w:r><w:t>Hola &amp; mundo</w:t></w:r></w:p><w:p><w:r><w:t>Segundo</w:t></w:r></w:p></w:document>' })
  assert.equal((await vistaTextoMaterial('apunte.docx', documento)).secciones[0].contenido, 'Hola & mundo\nSegundo')
  const presentacion = zip({
    'ppt/presentation.xml': '<p:presentation xmlns:p="x" xmlns:r="r"><p:sldId r:id="b"/><p:sldId r:id="a"/></p:presentation>',
    'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="a" Target="slides/slide1.xml"/><Relationship Id="b" Target="slides/slide2.xml"/></Relationships>',
    'ppt/slides/slide1.xml': '<a:p xmlns:a="x"><a:t>Final</a:t></a:p>',
    'ppt/slides/slide2.xml': '<a:p xmlns:a="x"><a:t>Inicio</a:t></a:p>',
  })
  assert.deepEqual((await vistaTextoMaterial('clase.pptx', presentacion)).secciones.map((s) => s.contenido), ['Inicio', 'Final'])
})

test('previsualiza hojas de Excel y texto sin ejecutar fórmulas', async () => {
  const planilla = zip({
    'xl/workbook.xml': '<workbook xmlns:r="r"><sheets><sheet name="Notas" r:id="a"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="a" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>Alumno</t></si><si><r><t>Ana</t></r><r><t> Pérez</t></r></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Nota</t></is></c></row><row><c r="A2" t="s"><v>1</v></c><c r="C2"><f>4+5</f><v>9</v></c></row></sheetData></worksheet>',
  })
  const vista = await vistaTextoMaterial('notas.xlsx', planilla)
  assert.equal(vista.secciones[0].titulo, 'Notas')
  assert.equal(vista.secciones[0].contenido, 'Alumno\t\tNota\nAna Pérez\t\t9')
  assert.equal(validarMaterial('notas.xlsx', planilla), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  assert.equal((await vistaTextoMaterial('datos.csv', Buffer.from('nombre,nota\nAna,9'))).secciones[0].contenido, 'nombre,nota\nAna,9')
  assert.throws(() => validarMaterial('datos.txt', Buffer.from([255, 0])), /UTF-8/)
})

test('limita y rechaza documentos inválidos o demasiado grandes', async () => {
  await assert.rejects(() => vistaTextoMaterial('roto.docx', Buffer.from('no es un zip')), /No se pudo leer/)
  const invalido = zip({ 'word/document.xml': '<!DOCTYPE x [<!ENTITY x "hola">]><x>&x;</x>' })
  await assert.rejects(() => vistaTextoMaterial('invalido.docx', invalido), /No se pudo leer/)
  const grande = zip({ 'word/document.xml': 'a'.repeat(16 * 1024 * 1024 + 1) })
  await assert.rejects(() => vistaTextoMaterial('grande.docx', grande), /No se pudo leer/)
  const expansion = zip({
    'xl/workbook.xml': '<workbook xmlns:r="r"><sheet name="Hoja" r:id="a"/></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="a" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': `<sst><si><t>${'x'.repeat(1024 * 1024)}</t></si></sst>`,
    'xl/worksheets/sheet1.xml': `<worksheet>${'<row><c r="A1" t="s"><v>0</v></c></row>'.repeat(20)}</worksheet>`,
  })
  await assert.rejects(() => vistaTextoMaterial('expansion.xlsx', expansion), /No se pudo leer/)
  const vista = await vistaTextoMaterial('largo.txt', Buffer.from('a'.repeat(200_001)))
  assert.equal(vista.truncado, true)
  assert.equal(vista.secciones[0].contenido.length, 200_000)
})
