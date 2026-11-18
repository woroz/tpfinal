import assert from 'node:assert/strict'
import test from 'node:test'
import { cifrarMaterial, descifrarMaterial, validarMaterial } from '../dist/services/bibliotecaArchivos.js'

test('cifra y descifra sin exponer el contenido y detecta modificaciones', () => {
  process.env.BIBLIOTECA_CLAVE_CIFRADO = '01'.repeat(32)
  const original = Buffer.from('%PDF-material de prueba')
  const cifrado = cifrarMaterial(original, 'archivo-1')
  assert.equal(cifrado.includes(original), false)
  assert.deepEqual(descifrarMaterial(cifrado, 'archivo-1'), original)
  assert.throws(() => descifrarMaterial(cifrado, 'archivo-2'))
  cifrado[cifrado.length - 1] ^= 1
  assert.throws(() => descifrarMaterial(cifrado, 'archivo-1'))
})

test('rechaza archivos no admitidos y contenido que no corresponde', () => {
  assert.equal(validarMaterial('apunte.pdf', Buffer.from('%PDF-prueba')), 'application/pdf')
  assert.throws(() => validarMaterial('apunte.exe', Buffer.from('abc')), /PDF, PNG/)
  assert.throws(() => validarMaterial('apunte.pdf', Buffer.from('abc')), /no corresponde/)
  assert.throws(() => validarMaterial('apunte.pdf', Buffer.alloc(4 * 1024 * 1024 + 1)), /4 MB/)
})

test('no cifra si falta una clave válida', () => {
  process.env.BIBLIOTECA_CLAVE_CIFRADO = 'incorrecta'
  assert.throws(() => cifrarMaterial(Buffer.from('prueba'), 'archivo-1'), /clave de cifrado/)
})
