import assert from 'node:assert/strict';
import test from 'node:test';

import { PDFDocument } from 'pdf-lib';

import {
  collectOcrWords,
  combineOcrText,
  createSearchablePdf,
} from '../lib/ocr-document.ts';

void test('collectOcrWords flattens Tesseract blocks and rounds confidence', () => {
  const words = collectOcrWords([{ paragraphs: [{ lines: [{ words: [
    { text: 'dudosa', confidence: 64.6, bbox: { x0: 1, y0: 2, x1: 30, y1: 14 } },
    { text: 'clara', confidence: 98.2, bbox: { x0: 34, y0: 2, x1: 60, y1: 14 } },
  ] }] }] }]);

  assert.deepEqual(words.map(({ text, confidence }) => ({ text, confidence })), [
    { text: 'dudosa', confidence: 65 },
    { text: 'clara', confidence: 98 },
  ]);
});

void test('combineOcrText preserves original page numbers when a page has no text', () => {
  const text = combineOcrText([
    { sourceName: 'uno.jpg', text: 'Primera', words: [] },
    { sourceName: 'dos.jpg', text: '   ', words: [] },
    { sourceName: 'tres.jpg', text: 'Tercera', words: [] },
  ]);

  assert.match(text, /Página 1 · uno\.jpg/);
  assert.match(text, /Página 3 · tres\.jpg/);
  assert.doesNotMatch(text, /Página 2/);
});

void test('createSearchablePdf creates one page per recognized image', async () => {
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const blob = new Blob([pngBytes], { type: 'image/png' });
  const output = await createSearchablePdf([
    {
      sourceName: 'pagina.png',
      text: 'Texto comprobable',
      words: [{ text: 'Texto', confidence: 99, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } }],
      processedImage: blob,
      processedWidth: 1,
      processedHeight: 1,
    },
  ]);
  const pdf = await PDFDocument.load(await output.arrayBuffer());

  assert.equal(output.type, 'application/pdf');
  assert.equal(pdf.getPageCount(), 1);
});
