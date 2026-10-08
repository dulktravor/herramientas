import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

const base = process.env.DOCUMENT_TEST_URL || 'http://localhost:3000';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });
test.setTimeout(180000);

async function open(page, path) {
  await page.goto(base + path);
  const consent = page.getByRole('button', { name: 'Solo necesarias', exact: true });
  await consent.waitFor({ state: 'visible', timeout: 1500 }).then(() => consent.click()).catch(() => {});
}

async function photo(page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333'; ctx.fillRect(0, 0, 800, 1000);
    ctx.fillStyle = '#fff'; ctx.fillRect(50, 50, 700, 900);
    ctx.fillStyle = '#000'; ctx.font = '36px Arial';
    ctx.fillText('CERONUBE LOCAL TEST', 100, 180);
    ctx.fillText('Private document number 12345', 100, 260);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'documento.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}

function track(page) {
  const errors = []; const sends = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method())) sends.push(request.url());
  });
  return { errors, sends };
}

async function download(page, name) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return fs.readFile(await (await pending).path());
}

test('escáner: perspectiva, teclado, inválidos, 20 páginas, PDF y cancelación', async ({ page }) => {
  await open(page, '/herramientas/escaner');
  const tracked = track(page);
  await page.locator('#scanner-files').setInputFiles({ name: 'rota.png', mimeType: 'image/png', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toBeVisible();
  const fixture = await photo(page);
  await page.locator('#scanner-files').setInputFiles(fixture);
  await expect(page.getByAltText('Previsualización con perspectiva corregida')).toBeVisible();
  const corner = page.getByRole('button', { name: /superior izquierda/ });
  await corner.focus(); await corner.press('ArrowRight');
  const bytes = await download(page, 'Descargar PDF corregido');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  await page.locator('#scanner-files').setInputFiles(Array.from({ length: 19 }, (_, i) => ({ ...fixture, name: `pagina-${i}.png` })));
  await expect(page.getByText('20 páginas preparadas', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Descargar PDF corregido', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByText('Exportación cancelada', { exact: true })).toBeVisible({ timeout: 30000 });
  const batch = await download(page, 'Descargar PDF corregido');
  expect((await PDFDocument.load(batch)).getPageCount()).toBe(20);
  expect(tracked.errors).toEqual([]); expect(tracked.sends).toEqual([]);
});

test('OCR real: imágenes y PDF, texto, PDF buscable, edición TXT y cancelación', async ({ page }) => {
  await open(page, '/herramientas/ocr');
  const tracked = track(page);
  let pdfModule = '';
  page.on('request', request => {
    if (/\/chunks\/pdf-[A-Za-z0-9_-]+\.js/.test(request.url())) pdfModule = request.url();
  });
  const fixture = await photo(page);
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([600, 800]).drawText('CERONUBE PDF PAGE', { x: 50, y: 650, size: 32, font });
  await page.locator('#ocr-files').setInputFiles([fixture, { name: 'pagina.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) }]);
  await expect(page.getByText('2 páginas · 0 reconocidas', { exact: true })).toBeVisible();
  await page.locator('#ocr-language').selectOption('eng');
  await page.getByRole('button', { name: 'Reconocer documento', exact: true }).click();
  await expect(page.locator('#ocr-result')).toHaveValue(/CERONUBE LOCAL TEST[\s\S]*CERONUBE PDF PAGE/, { timeout: 120000 });
  const bytes = await download(page, 'Descargar PDF buscable');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  expect(pdfModule).not.toBe('');
  const searchableText = await page.evaluate(async ({ data, moduleUrl }) => {
    const pdfjs = await import(moduleUrl);
    const task = pdfjs.getDocument({ data: new Uint8Array(data) });
    const doc = await task.promise;
    const text = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        text.push(content.items.map(item => item.str || '').join(' '));
      }
      return text.join('\n');
    } finally { await task.destroy(); }
  }, { data: Array.from(bytes), moduleUrl: pdfModule });
  expect(searchableText.replace(/\s+/g, ' ')).toMatch(/CERONUBE LOCAL TEST.*CERONUBE PDF PAGE/);
  await page.locator('#ocr-result').fill('Corrección manual');
  const txt = await download(page, 'Descargar TXT');
  expect(txt.toString()).toBe('Corrección manual');
  await page.getByRole('button', { name: 'Reconocer de nuevo', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reconocer de nuevo', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await page.locator('#ocr-files').setInputFiles({ name: 'invalido.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toContainText('formato no compatible');
  await page.locator('#ocr-files').setInputFiles(Array.from({ length: 31 }, (_, i) => ({ ...fixture, name: `pagina-${i}.png` })));
  await expect(page.getByText('30 páginas · 0 reconocidas', { exact: true })).toBeVisible();
  expect(tracked.errors).toEqual([]); expect(tracked.sends).toEqual([]);
});

test('móvil oscuro sin desbordamiento y consentimiento persistente/revocable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page, '/herramientas/escaner');
  const fixture = await photo(page);
  await page.locator('#scanner-files').setInputFiles(fixture);
  await expect(page.getByAltText('Previsualización con perspectiva corregida')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'work/scanner-mobile.png', fullPage: true });
  await open(page, '/herramientas/ocr');
  await page.locator('#ocr-files').setInputFiles(fixture);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'work/ocr-mobile.png', fullPage: true });
  await page.evaluate(() => localStorage.setItem('herramientas-consent-v2', JSON.stringify({ advertising: true, personalizedAdvertising: true, analytics: true })));
  await page.goto(base + '/privacidad');
  await expect(page.getByRole('switch', { name: 'Medición de uso' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Anuncios contextuales' })).toBeChecked();
  await page.getByRole('button', { name: 'Desactivar opcionales', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Medición de uso' })).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Medición de uso' })).not.toBeChecked();
  expect(await page.locator('#cloudflare-web-analytics, #google-adsense').count()).toBe(0);
});

test('regresiones: CSV duplicado, imágenes homónimas y PDF de más de 100 páginas', async ({ page }) => {
  await open(page, '/herramientas/datos');
  await page.locator('#source-format').selectOption('csv');
  await page.locator('#data-input').fill('nombre,nombre\nuno,dos');
  await page.getByRole('button', { name: 'Convertir datos', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('encabezados deben ser únicos');
  await page.locator('#data-input').fill('nombre,ciudad\nAna,Bogotá');
  await page.getByRole('button', { name: 'Convertir datos', exact: true }).click();
  await expect(page.locator('#data-output')).toHaveValue(/Ana/);
  await open(page, '/herramientas/imagenes');
  const fixture = await photo(page);
  await page.locator('#image-files').setInputFiles([fixture, fixture]);
  await page.getByRole('button', { name: 'Procesar 2 imágenes', exact: true }).click();
  const zip = await JSZip.loadAsync(await download(page, 'Descargar ZIP'));
  expect(Object.values(zip.files).filter(entry => !entry.dir)).toHaveLength(2);
  await open(page, '/herramientas/pdf');
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 101; i++) pdf.addPage([100, 100]);
  await page.locator('input[type=file]').setInputFiles({ name: 'extenso.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) });
  await expect(page.getByRole('alert')).toContainText('100 páginas');
});
