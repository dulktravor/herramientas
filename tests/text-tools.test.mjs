import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { TEXT_LIMITS, DEFAULT_TEXT_OPTIONS, transformText, countText, decodeText, textBytes, textPreview } from '../lib/text-tools.ts';

const transform = (input, options = {}) => transformText(input, { ...DEFAULT_TEXT_OPTIONS, ...options });

void test('sin opciones conserva Unicode, espacios y cada final de línea byte por byte', () => {
  for (const input of ['', '\ufeffÁrbol\t ñ 😀\r\n', 'a\r\nb\rc\n', 'e\u0301\u00a0é\n\n', '\t\t a  b  ']) {
    assert.equal(transform(input).text, input);
    assert.deepEqual(textBytes(transform(input).text), new TextEncoder().encode(input));
  }
});

void test('espacios repetidos no recorta extremos ni normaliza tabulaciones aisladas o NBSP', () => {
  assert.equal(transform('  a\t\t b\tc\u00a0\u00a0d\r\n  ', { collapseSpaces: true }).text, ' a b\tc\u00a0\u00a0d\r\n ');
});

void test('líneas vacías y duplicados conservan primera línea, Unicode y cierre final', () => {
  assert.equal(transform('a\r\n \t\r\nb\r\n\r\n', { removeEmpty: true }).text, 'a\r\nb\r\n');
  assert.equal(transform('Árbol\r\nárbol\r\n Árbol \r\nÁrbol\r\n', { duplicates: 'exact' }).text, 'Árbol\r\nárbol\r\n Árbol \r\n');
  assert.equal(transform(' Árbol \nárbol\narbol\n', { duplicates: 'trim-case' }).text, ' Árbol \narbol\n');
  assert.equal(transform('é\ne\u0301', { duplicates: 'trim-case' }).text, 'é\ne\u0301');
  assert.equal(transform('\r\n\t\n', { removeEmpty: true }).text, '');
});

void test('orden español y natural distingue acentos y ñ, conserva separadores por posición y equivalencias estables', () => {
  assert.equal(transform('o\r\nñ\rn\navión\navion', { sort: 'alphabetic' }).text, 'avion\r\navión\rn\nñ\no');
  assert.equal(transform('fila 10\nfila 02\nfila 2\nfila 1\n', { sort: 'natural' }).text, 'fila 1\nfila 02\nfila 2\nfila 10\n');
  assert.equal(transform('a\nb\n', { sort: 'alphabetic', descending: true }).text, 'b\na\n');
  assert.equal(transform('a\n', { sort: 'natural' }).text, 'a\n');
});

void test('transformaciones tienen orden explícito y mayúsculas españolas', () => {
  assert.equal(transform('Ñandú\nñandú\nÁRBOL', { caseMode: 'lower', duplicates: 'exact', sort: 'alphabetic' }).text, 'árbol\nñandú');
  assert.equal(transform('áéíóúñ ß', { caseMode: 'upper' }).text, 'ÁÉÍÓÚÑ SS');
});

void test('conteo incluye puntos Unicode, CRLF y última línea vacía; palabras excluyen emoji', () => {
  assert.deepEqual(countText('ñ 😀\r\na'), { characters: 6, words: 2, lines: 2, bytes: 10, lf: 0, crlf: 1, cr: 0 });
  assert.equal(countText("e\u0301 l'amour 👩‍🚀").words, 2);
  assert.equal(countText('a\n').lines, 2);
  assert.equal(countText('').lines, 0);
});

void test('decodificación estricta, BOM, UTF-16 LE/BE y Windows-1252 manual', () => {
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0xc3, 0xb1])).text, 'ñ');
  assert.equal(decodeText(new Uint8Array([0xff, 0xfe, 0xf1, 0x00, 0x3d, 0xd8, 0x00, 0xde])).text, 'ñ😀');
  assert.equal(decodeText(new Uint8Array([0xfe, 0xff, 0x00, 0xf1])).text, 'ñ');
  assert.equal(decodeText(new Uint8Array([0xf1]), 'windows-1252').text, 'ñ');
  assert.throws(() => decodeText(new Uint8Array([0xf1])), /sin perder caracteres/);
  assert.throws(() => decodeText(new Uint8Array([0xff, 0xfe, 0x00])), /sin perder caracteres/);
  assert.throws(() => decodeText(new Uint8Array([0xff, 0xfe, 0x00, 0xd8])), /sin perder caracteres/);
  assert.throws(() => decodeText(new Uint8Array([0xff, 0xfe, 0xf1, 0x00]), 'utf-8'), /declara/);
  assert.throws(() => decodeText(new Uint8Array([0, 1, 0])), /bytes nulos/);
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 65])).text, '\ufeffA');
  assert.equal(decodeText(new Uint8Array([0xef, 0xbf, 0xbd])).text, '\ufffd', 'un carácter de reemplazo real del archivo no se elimina');
});

void test('límites rechazan bytes/filas excesivos y Unicode incompleto sin exportaciones con pérdida', () => {
  assert.throws(() => transform('😀'.repeat(TEXT_LIMITS.bytes / 4 + 1)), /1 MiB/);
  assert.throws(() => transform('a\n'.repeat(TEXT_LIMITS.lines)), /50.000 líneas/);
  assert.throws(() => textBytes('a\ud800'), /Unicode incompleto/);
  assert.throws(() => textBytes('\udc00'), /Unicode incompleto/);
  assert.throws(() => decodeText(new Uint8Array(TEXT_LIMITS.bytes + 1)), /1 MiB/);
});

void test('previsualización acotada no corta pares sustitutos ni modifica resultado completo', () => {
  const input = 'a'.repeat(TEXT_LIMITS.preview - 1) + '😀' + 'fin';
  assert.equal(textPreview(input).text, 'a'.repeat(TEXT_LIMITS.preview - 1));
  assert.equal(textPreview(input).truncated, true);
  assert.equal(transform(input).text, input);
});

void test('medición en el límite: 1 MiB y 50.000 líneas; orden natural y conteo completo', (context) => {
  const rows = Array.from({ length: 49_999 }, (_, index) => `fila ${String(49_999 - index).padStart(5, '0')} palabra\r\n`).join('');
  const input = rows + 'x'.repeat(TEXT_LIMITS.bytes - textBytes(rows).length);
  assert.equal(textBytes(input).length, TEXT_LIMITS.bytes);
  const start = performance.now();
  const result = transform(input, { sort: 'natural', duplicates: 'exact', collapseSpaces: true });
  context.diagnostic(`1 MiB / 50.000 líneas: ${(performance.now() - start).toFixed(1)} ms en Node ${process.version}; ejecución del navegador en Worker.`);
  assert.equal(result.originalStats.lines, TEXT_LIMITS.lines);
  assert.equal(result.stats.bytes, TEXT_LIMITS.bytes);
  assert.match(result.text, /^fila 00001 palabra\r\n/);
});
