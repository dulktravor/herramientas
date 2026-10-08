import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const base = process.env.TEXT_TEST_URL || 'http://127.0.0.1:3000';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });
test.setTimeout(60000);

async function start(page) {
  await page.goto(`${base}/herramientas/texto`);
  await page.getByRole('button', { name: 'Solo necesarias', exact: true }).click().catch(() => {});
}
async function preview(page) {
  await page.getByRole('button', { name: 'Previsualizar y contar', exact: true }).click();
  await expect(page.locator('output')).toContainText('Vista previa lista');
}
async function download(page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar TXT', exact: true }).click();
  const result = await event;
  return { bytes: await fs.readFile(await result.path()), name: result.suggestedFilename() };
}

test('vista original/resultado, copia exacta, descarga UTF-8, deshacer y limpiar', async ({ page }) => {
  await start(page);
  const requests = [];
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } }); });
  const original = ' Niño  😀\r\nniño\r\nNiño\r\n\r\n';
  await page.locator('#text-file').setInputFiles({ name: 'lista.txt', mimeType: 'text/plain', buffer: Buffer.from(original) });
  await expect(page.locator('output')).toContainText('TXT abierto');
  await preview(page);
  expect((await download(page)).bytes.equals(Buffer.from(original))).toBe(true);
  await page.getByLabel('Líneas duplicadas', { exact: true }).selectOption('trim-case');
  await page.getByLabel('Quitar líneas vacías (también solo espacios)', { exact: true }).check();
  await page.getByLabel('Reducir espacios y tabulaciones repetidos', { exact: true }).check();
  await preview(page);
  const expected = ' Niño 😀\r\nniño\r\n';
  expect(await page.getByLabel('Texto original', { exact: true }).textContent()).toBe(original);
  expect(await page.getByLabel('Texto resultado', { exact: true }).textContent()).toBe(expected);
  await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
  expect(await page.evaluate(() => window.__copied)).toBe(expected);
  const saved = await download(page);
  expect(saved.bytes.equals(Buffer.from(expected))).toBe(true);
  expect(saved.name).toBe('lista-resultado.txt');
  await page.getByRole('button', { name: 'Usar resultado como entrada', exact: true }).click();
  expect(await page.getByLabel('Texto original', { exact: true }).textContent()).toBe(expected);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect(await page.getByLabel('Texto original', { exact: true }).textContent()).toBe(original);
  expect(await page.getByLabel('Texto resultado', { exact: true }).textContent()).toBe(expected);
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
  await expect(page.locator('#text-source')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Descargar TXT', exact: true })).toBeDisabled();
  expect(requests.some((request) => ['POST', 'PUT', 'PATCH'].includes(request.method))).toBe(false);
  expect(requests.some((request) => request.url.includes('Ni%C3%B1o') || request.body?.includes('Niño'))).toBe(false);
});

test('codificación inválida y límites dan explicación conservando entrada; UTF-16 correcto', async ({ page }) => {
  await start(page);
  await page.getByLabel('Texto original', { exact: true }).fill('original');
  await page.locator('#text-file').setInputFiles({ name: 'incorrecto.txt', mimeType: 'text/plain', buffer: Buffer.from([0xf1]) });
  await expect(page.getByRole('alert')).toContainText('sin perder caracteres');
  await expect(page.locator('#text-source')).toHaveValue('original');
  await page.getByLabel('Codificación del TXT', { exact: true }).selectOption('windows-1252');
  await page.locator('#text-file').setInputFiles({ name: 'antiguo.txt', mimeType: 'text/plain', buffer: Buffer.from([0xf1]) });
  await expect(page.getByLabel('Texto original', { exact: true })).toHaveText('ñ');
  await page.locator('#text-file').setInputFiles({ name: 'grande.txt', mimeType: 'text/plain', buffer: Buffer.alloc(1024 * 1024 + 1, 65) });
  await expect(page.getByRole('alert')).toContainText('1 MiB');
  await page.getByLabel('Codificación del TXT', { exact: true }).selectOption('auto');
  await page.locator('#text-file').setInputFiles({ name: 'unicode.txt', mimeType: 'text/plain', buffer: Buffer.from([0xff, 0xfe, 0xf1, 0, 0x3d, 0xd8, 0, 0xde]) });
  await expect(page.getByLabel('Texto original', { exact: true })).toHaveText('ñ😀');
});

test('1 MiB en Worker conserva interfaz operativa y cancela sin resultado tardío', async ({ page }) => {
  await start(page);
  // Delay worker delivery only, making the cancellation race deterministic while retaining the real worker.
  await page.evaluate(() => {
    const RealWorker = window.Worker;
    window.__realWorker = RealWorker;
    window.Worker = class extends RealWorker {
      postMessage(message, ...args) { window.setTimeout(() => { try { super.postMessage(message, ...args); } catch {} }, 1000); }
    };
    window.__ticks = 0;
    window.setInterval(() => window.__ticks++, 20);
  });
  const original = 'z'.repeat(1024 * 1024);
  await page.locator('#text-file').setInputFiles({ name: 'limite.txt', mimeType: 'text/plain', buffer: Buffer.from(original) });
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('output')).toContainText('cancelado');
  await page.waitForTimeout(1200);
  await expect(page.locator('#text-source')).toHaveValue('');
  await page.evaluate(() => { window.Worker = window.__realWorker; });
  const reversedRows = Array.from({ length: 49_999 }, (_, index) => `fila ${String(49_999 - index).padStart(5, '0')} palabra\r\n`);
  const filler = 'x'.repeat(1024 * 1024 - Buffer.byteLength(reversedRows.join('')));
  const largeList = reversedRows.join('') + filler;
  const expectedList = reversedRows.toReversed().join('') + filler;
  await page.locator('#text-file').setInputFiles({ name: 'limite.txt', mimeType: 'text/plain', buffer: Buffer.from(largeList) });
  await expect(page.locator('output')).toContainText('TXT abierto');
  await expect(page.getByText('Vista parcial:', { exact: false }).first()).toBeVisible();
  const sourcePreview = page.getByLabel('Texto original', { exact: true });
  await sourcePreview.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => sourcePreview.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.getByLabel('Orden de líneas', { exact: true }).selectOption('natural');
  const before = await page.evaluate(() => window.__ticks);
  await preview(page);
  expect(await page.evaluate(() => window.__ticks)).toBeGreaterThan(before);
  expect((await download(page)).bytes.equals(Buffer.from(expectedList))).toBe(true);
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
});

test('salir y restaurar BFCache elimina entrada y resultado', async ({ page }) => {
  await start(page);
  await page.getByLabel('Texto original', { exact: true }).fill('dato de prueba');
  await preview(page);
  await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  await expect(page.locator('#text-source')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Descargar TXT', exact: true })).toBeDisabled();
  await page.getByLabel('Texto original', { exact: true }).fill('otro dato');
  await page.goto(`${base}/`);
  await page.goBack();
  await expect(page.locator('#text-source')).toHaveValue('');
});

test('móvil, oscuro y navegación por teclado tienen controles accesibles sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await start(page);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.getByRole('heading', { name: 'Limpiar y ordenar texto', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Texto original', { exact: true }).focus();
  await page.keyboard.type('n\nñ\no');
  await preview(page);
  expect(await page.getByLabel('Texto resultado', { exact: true }).textContent()).toBe('n\nñ\no');
});
