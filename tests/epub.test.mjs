import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { inspectZip, EPUB_LIMITS, safePath } from '../lib/epub-archive.ts';
import fs from 'node:fs/promises';

const base = process.env.EPUB_TEST_URL || 'http://localhost:3000';
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  },
});
test.setTimeout(90000);
const chapter = (name, text) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.from(text),
});
async function start(page) {
  await page.goto(`${base}/herramientas/epub`);
  await page
    .getByRole('button', { name: 'Solo necesarias', exact: true })
    .click()
    .catch(() => {});
}
async function save(page, name) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const download = await event;
  return {
    bytes: await fs.readFile(await download.path()),
    name: download.suggestedFilename(),
  };
}
test('controles ZIP rechazan rutas peligrosas y tamaños declarados excesivos', async () => {
  for (const path of ['../a', '/a', 'a\\b', 'a/../b', 'a:b'])
    expect(() => safePath(path)).toThrow();
  const zip = new JSZip();
  zip.file('a', 'abc');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  expect(inspectZip(bytes.buffer).names.has('a')).toBeTruthy();
  const view = new DataView(bytes.buffer);
  for (let p = 0; p < bytes.length - 46; p++)
    if (view.getUint32(p, true) === 0x02014b50)
      view.setUint32(p + 24, EPUB_LIMITS.expanded + 1, true);
  expect(() => inspectZip(bytes.buffer)).toThrow(/80 MB/);
});
test('crear, editar, reordenar, exportar, reabrir y extraer EPUB local', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  const outbound = [];
  page.on('request', (r) => {
    if (['POST', 'PUT', 'PATCH'].includes(r.method())) outbound.push(r.url());
  });
  await page
    .locator('#epub-chapters')
    .setInputFiles([
      chapter(
        'uno.md',
        '# Uno\n\nHola **mundo**, niño & niña.\n\n[Dos](dos.xhtml#destino)',
      ),
      chapter('dos.html', '<h1 id="destino">Dos</h1><p>Segundo capítulo.</p>'),
    ]);
  await expect(
    page.getByRole('button', { name: '1. Uno', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Título', { exact: true }).fill('Prueba EPUB');
  await page.getByLabel('Autor', { exact: true }).fill('CeroNube');
  await page.getByRole('button', { name: 'Bajar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '1. Dos', exact: true }),
  ).toBeVisible();
  const result = await save(page, 'Descargar EPUB');
  expect(result.name).toBe('Prueba-EPUB.epub');
  expect(result.bytes.readUInt16LE(8)).toBe(0);
  expect(result.bytes.subarray(30, 38).toString()).toBe('mimetype');
  const zip = await JSZip.loadAsync(result.bytes);
  expect(await zip.file('mimetype').async('string')).toBe(
    'application/epub+zip',
  );
  const opf = await zip.file('CeroNube/package.opf').async('string');
  expect(opf).toContain('Prueba EPUB');
  expect(opf).toContain('version="3.0"');
  const nav = await zip.file('CeroNube/nav.xhtml').async('string');
  expect(nav.indexOf('>Dos<')).toBeLessThan(nav.indexOf('>Uno<'));
  await page.locator('#epub-open').setInputFiles({
    name: result.name,
    mimeType: 'application/epub+zip',
    buffer: result.bytes,
  });
  await expect(
    page.getByText('Libro abierto: 2 capítulos.', { exact: false }),
  ).toBeVisible();
  expect((await save(page, 'Extraer texto TXT')).bytes.toString()).toContain(
    'niño & niña',
  );
  const extracted = await JSZip.loadAsync(
    (await save(page, 'Extraer capítulos ZIP')).bytes,
  );
  expect(extracted.file('uno.xhtml')).not.toBeNull();
  expect(outbound).toEqual([]);
  expect(errors).toEqual([]);
});
test('sanitización, enlaces ausentes, portada, inválidos y limpieza', async ({
  page,
}) => {
  await start(page);
  await page
    .locator('#epub-chapters')
    .setInputFiles(
      chapter(
        'inseguro.html',
        '<h1>Prueba</h1><script>parent.hacked=1</script><img src="https://example.com/tracker"><p onclick="alert(1)">Seguro</p><a href="ausente.xhtml#x">Roto</a>',
      ),
    );
  await expect(page.locator('#chapter-html')).toHaveValue(/Seguro/);
  expect(await page.locator('#chapter-html').inputValue()).not.toMatch(
    /script|onclick|https:/,
  );
  expect(await page.evaluate(() => window.hacked)).toBeUndefined();
  await page.getByLabel('Título', { exact: true }).fill('Prueba');
  await page.getByLabel('Autor', { exact: true }).fill('Autor');
  await page.getByRole('button', { name: 'Validar y reparar índice' }).click();
  await expect(
    page.getByRole('list', { name: 'Problemas de validación' }),
  ).toContainText('ausente.xhtml');
  await page
    .locator('#chapter-html')
    .fill('<h1 id="bien">Bien</h1><a href="#bien">Destino</a>');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 48;
    canvas.getContext('2d').fillRect(0, 0, 32, 48);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#epub-cover').setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await expect(
    page.getByText('Portada actualizada.', { exact: true }),
  ).toBeVisible();
  const result = await save(page, 'Descargar EPUB');
  const zip = await JSZip.loadAsync(result.bytes);
  expect(await zip.file('CeroNube/package.opf').async('string')).toContain(
    'cover-image',
  );
  await page
    .locator('#epub-open')
    .setInputFiles(chapter('malo.epub', 'esto no es un EPUB'));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#chapter-html')).toHaveValue(/id="bien"/);
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await expect(page.locator('#chapter-html')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('retirados');
});
test('móvil, tema oscuro y cancelación conservan una interfaz utilizable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page.getByRole('button', { name: 'Nuevo libro', exact: true }).click();
  await page
    .getByRole('button', { name: 'Escribir capítulo', exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole('button', { name: 'Cambiar entre modo claro y oscuro' })
    .click();
  await expect(page.locator('#chapter-html')).toBeVisible();
  await page.locator('#chapter-title').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#chapter-html')).toBeFocused();
  await page.getByLabel('Título', { exact: true }).fill('Prueba');
  await page.getByLabel('Autor', { exact: true }).fill('Autor');
  // Delay worker responses deterministically to make the cancel path observable.
  await page.evaluate(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      postMessage(...args) {
        setTimeout(() => super.postMessage(...args), 3000);
      }
    };
  });
  await page
    .getByRole('button', { name: 'Descargar EPUB', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Cancelar operación', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('cancelada');
  await expect(page.locator('#chapter-html')).toHaveValue(/Escribe aquí/);
  await expect(
    page.frameLocator('iframe').getByText('Escribe aquí.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'work/epub-mobile.png', fullPage: true });
});

test('EPUB 2, imágenes relativas, fragmentos rotos, DRM y rutas editadas', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    'OPS/content.opf',
    '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>Libro anterior</dc:title><dc:creator>Autora</dc:creator><dc:language>es</dc:language></metadata><manifest><item id="c" href="Text/c.xhtml" media-type="application/xhtml+xml"/><item id="img" href="Images/a.png" media-type="image/png"/><item id="missing" href="Images/ausente.png" media-type="image/png"/></manifest><spine><itemref idref="c"/></spine></package>',
  );
  zip.file(
    'OPS/Text/c.xhtml',
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Capítulo antiguo</title></head><body><h1 id="inicio">Inicio</h1><img src="../Images/a.png" alt="Imagen"/><a href="#roto">Destino roto</a></body></html>',
  );
  await start(page);
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 80;
    c.getContext('2d').fillRect(0, 0, 80, 80);
    return c.toDataURL().split(',')[1];
  });
  zip.file('OPS/Images/a.png', Buffer.from(png, 'base64'));
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  await page.locator('#epub-open').setInputFiles({
    name: 'anterior.epub',
    mimeType: 'application/epub+zip',
    buffer,
  });
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue(
    'Libro anterior',
  );
  await expect(
    page.getByText('Falta el recurso declarado: OPS/Images/ausente.png', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.frameLocator('iframe').getByAltText('Imagen'),
  ).toHaveJSProperty('naturalWidth', 80);
  await page.getByRole('button', { name: 'Validar y reparar índice' }).click();
  await expect(
    page.getByRole('list', { name: 'Problemas de validación' }),
  ).toContainText('#roto');
  await page
    .locator('#chapter-html')
    .fill(
      (await page.locator('#chapter-html').inputValue()).replace(
        '#roto',
        '#inicio',
      ),
    );
  await page
    .getByText('Examinar archivos y corregir rutas', { exact: true })
    .click();
  await page.getByLabel('Ruta del recurso 1').fill('../no.png');
  await page.getByRole('button', { name: 'Validar y reparar índice' }).click();
  await expect(
    page.getByRole('list', { name: 'Problemas de validación' }),
  ).toContainText('Ruta no segura');
  await page.getByLabel('Ruta del recurso 1').fill('OPS/Images/a.png');
  await save(page, 'Descargar EPUB');
  await page.screenshot({ path: 'work/epub-desktop.png', fullPage: true });
  zip.file('META-INF/encryption.xml', '<encryption/>');
  await page.locator('#epub-open').setInputFiles({
    name: 'cifrado.epub',
    mimeType: 'application/epub+zip',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.getByRole('alert')).toContainText('DRM');
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue(
    'Libro anterior',
  );
});
