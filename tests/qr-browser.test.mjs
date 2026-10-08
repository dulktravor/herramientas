import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import pngjs from 'pngjs';
import jsQR from 'jsqr';

const baseUrl = process.env.QR_TEST_URL ?? process.env.NEW_TOOLS_TEST_URL;
const { PNG } = pngjs;
async function downloadBytes(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

void test(
  'QR navegador: generación, PNG/SVG, Worker lector, privacidad, límites y limpieza',
  { skip: !baseUrl, timeout: 120000 },
  async () => {
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    });
    try {
      const context = await browser.newContext({ acceptDownloads: true });
      const page = await context.newPage();
      const requests = [];
      const logs = [];
      page.on('request', (request) =>
        requests.push(request.url() + (request.postData() ?? '')),
      );
      page.on('console', (message) => logs.push(message.text()));
      await page.goto(`${baseUrl}/herramientas/qr`);
      const secret =
        'QR-SINTETICO-Ñ-😀-489021\nsegunda línea <script>prueba</script>';
      await page.locator('#qr-text').fill(secret);
      await page
        .getByRole('button', { name: 'Generar QR', exact: true })
        .click();
      await page.locator('#qr-content').waitFor();
      assert.equal(await page.locator('#qr-content').inputValue(), secret);
      const [pngDownload] = await Promise.all([
        page.waitForEvent('download'),
        page
          .getByRole('button', { name: 'Descargar PNG', exact: true })
          .click(),
      ]);
      const pngBytes = await downloadBytes(pngDownload);
      const png = PNG.sync.read(pngBytes);
      assert.equal(
        jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
        secret,
      );
      const [svgDownload] = await Promise.all([
        page.waitForEvent('download'),
        page
          .getByRole('button', { name: 'Descargar SVG', exact: true })
          .click(),
      ]);
      const svg = (await downloadBytes(svgDownload)).toString();
      assert.ok(svg.startsWith('<svg '));
      assert.ok(!svg.includes('<script>'));
      assert.ok(svg.includes(`width="${png.width}"`));
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.evaluate(() => {
        const write = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = (value) => {
          window.__qrCopiedForTest = value;
          return write(value);
        };
      });
      await page
        .getByRole('button', { name: 'Copiar contenido', exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.__qrCopiedForTest), secret);
      // Windows may normalize LF to CRLF in the system clipboard. Verify the
      // exact writeText argument separately from the operating-system round trip.
      assert.equal(
        (await page.evaluate(() => navigator.clipboard.readText())).replace(
          /\r\n/g,
          '\n',
        ),
        secret,
      );
      await page.evaluate(() => {
        delete window.__qrCopiedForTest;
      });
      await page
        .getByRole('button', { name: 'Leer imagen', exact: true })
        .click();
      await page.locator('#qr-image-input').setInputFiles({
        name: 'sintetico.png',
        mimeType: 'image/png',
        buffer: pngBytes,
      });
      await page.waitForFunction(
        (value) => document.querySelector('#qr-content')?.value === value,
        secret,
      );
      assert.equal(await page.locator('#qr-content').inputValue(), secret);
      assert.equal(
        await page
          .getByRole('link', { name: 'Abrir enlace en otra pestaña' })
          .count(),
        0,
      );
      await page
        .getByRole('button', { name: 'Limpiar sesión', exact: true })
        .click();
      assert.equal(await page.locator('#qr-content').count(), 0);
      const largeHeader = Buffer.alloc(24);
      largeHeader.set([137, 80, 78, 71, 13, 10, 26, 10]);
      largeHeader.write('IHDR', 12);
      largeHeader.writeUInt32BE(2049, 16);
      largeHeader.writeUInt32BE(1, 20);
      await page.locator('#qr-image-input').setInputFiles({
        name: 'grande.png',
        mimeType: 'image/png',
        buffer: largeHeader,
      });
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').textContent(), /2048/);
      const blank = PNG.sync.write({
        width: 64,
        height: 64,
        data: Buffer.alloc(64 * 64 * 4, 255),
      });
      await page.locator('#qr-image-input').setInputFiles({
        name: 'vacio.png',
        mimeType: 'image/png',
        buffer: blank,
      });
      await page.waitForFunction(() =>
        document
          .querySelector('[role="alert"]')
          ?.textContent?.includes('No se encontró'),
      );
      await page.getByRole('button', { name: 'Crear QR', exact: true }).click();
      await page.locator('#qr-kind').selectOption('wifi');
      await page.locator('#qr-ssid').fill('Red;ñ');
      await page.locator('#qr-password').fill('PRIVADA-489021;\\"');
      await page
        .getByRole('button', { name: 'Generar QR', exact: true })
        .click();
      await page.locator('#qr-content').waitFor();
      assert.match(
        await page.locator('#qr-content').inputValue(),
        /^WIFI:T:WPA;S:Red\\;ñ;P:/,
      );
      await page.evaluate(() => {
        window.dispatchEvent(new PageTransitionEvent('pagehide'));
        window.dispatchEvent(
          new PageTransitionEvent('pageshow', { persisted: true }),
        );
      });
      assert.equal(await page.locator('#qr-password').inputValue(), '');
      assert.equal(await page.locator('#qr-content').count(), 0);
      await page.locator('#qr-password').fill('PRIVADA-489021');
      await page.locator('#qr-ssid').fill('Red prueba');
      await page
        .getByRole('button', { name: 'Generar QR', exact: true })
        .click();
      await page.locator('#qr-content').waitFor();
      await page.goto(`${baseUrl}/`);
      await page.goBack();
      await page.locator('#qr-kind').waitFor();
      assert.equal(await page.locator('#qr-content').count(), 0);
      if (await page.locator('#qr-password').count()) {
        assert.equal(await page.locator('#qr-password').inputValue(), '');
        assert.equal(await page.locator('#qr-ssid').inputValue(), '');
      }
      await page.locator('#qr-kind').selectOption('text');
      await page.locator('#qr-text').fill(secret);
      await page
        .getByRole('button', { name: 'Generar QR', exact: true })
        .click();
      await page.locator('#qr-content').waitFor();
      await page.goto(`${baseUrl}/`);
      await page.goBack();
      await page.locator('#qr-text').waitFor();
      assert.equal(
        await page.locator('#qr-text').inputValue(),
        '',
        'El historial no restaura texto privado en el control nativo.',
      );
      assert.equal(await page.locator('#qr-content').count(), 0);
      const storage = await page.evaluate(() =>
        JSON.stringify({
          local: Object.fromEntries(
            Object.keys(localStorage).map((key) => [
              key,
              localStorage.getItem(key),
            ]),
          ),
          session: Object.fromEntries(
            Object.keys(sessionStorage).map((key) => [
              key,
              sessionStorage.getItem(key),
            ]),
          ),
        }),
      );
      for (const needle of [
        'QR-SINTETICO',
        'PRIVADA-489021',
        'sintetico.png',
      ]) {
        assert.ok(
          !requests.some(
            (request) =>
              request.includes(needle) ||
              request.includes(encodeURIComponent(needle)),
          ),
          `Contenido privado en petición: ${needle}`,
        );
        assert.ok(
          !logs.some((message) => message.includes(needle)),
          `Contenido privado en consola: ${needle}`,
        );
        assert.ok(
          !storage.includes(needle),
          `Contenido privado en almacenamiento: ${needle}`,
        );
      }
      assert.ok(
        requests.some((request) => request.includes('qr-reader.worker')),
        'El lector debe ejecutarse como Worker bajo demanda.',
      );
      await page.setViewportSize({ width: 320, height: 740 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        'Sin desbordamiento horizontal a 320px',
      );
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page
        .getByRole('button', { name: 'Leer imagen', exact: true })
        .focus();
      assert.equal(
        await page
          .getByRole('button', { name: 'Leer imagen', exact: true })
          .evaluate((element) => element === document.activeElement),
        true,
      );
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
