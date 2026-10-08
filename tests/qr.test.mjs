import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import jsQR from 'jsqr';
import {
  buildQrPayload,
  createQr,
  escapeVcard,
  escapeWifi,
  getQrLink,
  QR_MAX_BYTES,
  QR_MARGIN,
  QR_SCALE,
  qrToSvg,
  qrImageDimensions,
  validateQrImageDimensions,
  validateQrImageFile,
} from '../lib/qr.ts';

function rasterSvg(svg) {
  const size = Number(svg.match(/viewBox="0 0 (\d+) /)[1]);
  const width = size * QR_SCALE;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const match of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const x = Number(match[1]) * QR_SCALE;
    const y = Number(match[2]) * QR_SCALE;
    for (let dy = 0; dy < QR_SCALE; dy++)
      for (let dx = 0; dx < QR_SCALE; dx++) {
        const offset = ((y + dy) * width + x + dx) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
  }
  return { pixels, width };
}

void test('QR SVG vuelve a leerse con jsQR independiente: Unicode, saltos, URL y escapes Wi-Fi/vCard', async () => {
  const inputs = [
    {
      kind: 'text',
      text: 'Bogotá, ñ, canción 😀\r\nSegunda línea\n<svg onload="alert(1)"> & texto',
    },
    { kind: 'url', url: 'https://example.invalid/ruta?dato=%C3%B1#fragmento' },
    {
      kind: 'wifi',
      ssid: 'Red;:,"\\ñ',
      password: 'clave;,:"\\😀',
      security: 'WPA',
      hidden: true,
    },
    {
      kind: 'wifi',
      ssid: 'Red abierta',
      password: 'no exportar',
      security: 'nopass',
      hidden: false,
    },
    {
      kind: 'contact',
      firstName: 'María;😀',
      lastName: 'Muñoz, Pérez',
      phone: '+57 555 0100',
      email: 'prueba@example.invalid',
      organization: 'Escuela\\Taller\nSegundo piso',
    },
  ];
  for (const input of inputs) {
    const payload = buildQrPayload(input);
    const qr = await createQr(payload);
    const svg = qrToSvg(qr);
    const { pixels, width } = rasterSvg(svg);
    const decoded = jsQR(pixels, width, width);
    assert.equal(decoded?.data, payload);
    assert.equal(qr.errorCorrectionLevel.bit, 0); // M
    assert.ok(!svg.includes('onload'));
    assert.equal(width, (qr.modules.size + QR_MARGIN * 2) * QR_SCALE);
    if (input.kind === 'wifi' && input.security === 'nopass')
      assert.ok(!payload.includes('no exportar'));
  }
});

void test('capacidad UTF-8 exacta M: acepta 2331 bytes, rechaza exceso y Unicode incompleto', async () => {
  const start = performance.now();
  const qr = await createQr('x'.repeat(QR_MAX_BYTES));
  assert.equal(qr.version, 40);
  const svg = qrToSvg(qr);
  const { pixels, width } = rasterSvg(svg);
  assert.equal(jsQR(pixels, width, width)?.data, 'x'.repeat(QR_MAX_BYTES));
  console.info(
    `QR M, 2331 bytes, generación+SVG+lectura: ${Math.round(performance.now() - start)} ms; lienzo RGBA ${pixels.byteLength} bytes.`,
  );
  await assert.rejects(createQr('x'.repeat(QR_MAX_BYTES + 1)), /máximo/);
  await assert.rejects(createQr('😀'.repeat(583)), /máximo/);
  await assert.rejects(createQr(''), /Escribe/);
  await assert.rejects(createQr('\ud800'), /incompleto/);
  await assert.rejects(createQr('\udc00'), /incompleto/);
});

void test('Wi-Fi y vCard escapan caracteres y bloquean inyección en propiedades', () => {
  assert.equal(escapeWifi('a\\b;c:d,e"f'), 'a\\\\b\\;c\\:d\\,e\\"f');
  assert.equal(escapeVcard('a\\b;c,d\r\nx'), 'a\\\\b\\;c\\,d\\nx');
  assert.throws(
    () =>
      buildQrPayload({
        kind: 'wifi',
        ssid: 'x\nP:ataque',
        password: 'clave',
        security: 'WPA',
        hidden: false,
      }),
    /control/,
  );
  assert.throws(
    () =>
      buildQrPayload({
        kind: 'wifi',
        ssid: '',
        password: '',
        security: 'WPA',
        hidden: false,
      }),
    /nombre/,
  );
  assert.throws(
    () =>
      buildQrPayload({
        kind: 'wifi',
        ssid: 'x',
        password: '',
        security: 'WPA',
        hidden: false,
      }),
    /contraseña/,
  );
  assert.throws(
    () =>
      buildQrPayload({
        kind: 'contact',
        firstName: 'Ana',
        lastName: '',
        phone: '123\r\nURL:evil',
        email: '',
        organization: '',
      }),
    /control/,
  );
  const vcard = buildQrPayload({
    kind: 'contact',
    firstName: 'ñ'.repeat(100),
    lastName: '',
    phone: '',
    email: '',
    organization: 'Empresa\nSegunda línea',
  });
  for (const line of vcard.split('\r\n'))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(vcard.includes('ORG:Empresa\\nSegunda línea'));
});

void test('URL explícita completa: no acciones automáticas ni esquemas ejecutables', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hola',
    'file:///etc/a',
    'https://user:clave@example.invalid',
    'example.invalid',
    'https://example.invalid/\n',
  ]) {
    assert.equal(getQrLink(url), null);
    assert.throws(() => buildQrPayload({ kind: 'url', url }), /URL completa/);
  }
  assert.deepEqual(getQrLink('https://example.invalid/ñ'), {
    href: 'https://example.invalid/ñ',
    protocol: 'https:',
  });
});

void test('límites de imagen y medidas se validan antes de descomprimir', () => {
  assert.doesNotThrow(() =>
    validateQrImageFile({ type: 'image/png', size: 8 * 1024 * 1024 }),
  );
  assert.throws(
    () => validateQrImageFile({ type: 'image/png', size: 8 * 1024 * 1024 + 1 }),
    /8 MiB/,
  );
  assert.throws(
    () => validateQrImageFile({ type: 'image/svg+xml', size: 100 }),
    /SVG/,
  );
  assert.throws(
    () => validateQrImageFile({ type: 'image/png', size: 0 }),
    /1 byte/,
  );
  assert.doesNotThrow(() => validateQrImageDimensions(2048, 2048));
  assert.throws(() => validateQrImageDimensions(2049, 100), /2048/);
  const png = Buffer.alloc(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.write('IHDR', 12);
  png.writeUInt32BE(99999, 16);
  png.writeUInt32BE(2, 20);
  assert.deepEqual(qrImageDimensions(png), { width: 99999, height: 2 });
  const jpeg = Buffer.from([255, 216, 255, 192, 0, 8, 8, 0, 100, 0, 200, 1]);
  assert.deepEqual(qrImageDimensions(jpeg), { width: 200, height: 100 });
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0);
  webp.write('WEBP', 8);
  webp.write('VP8X', 12);
  webp.writeUInt32LE(10, 16);
  webp[24] = 99;
  webp[27] = 199;
  assert.deepEqual(qrImageDimensions(webp), { width: 100, height: 200 });
  const lossless = Buffer.alloc(26);
  lossless.write('RIFF', 0);
  lossless.write('WEBP', 8);
  lossless.write('VP8L', 12);
  lossless.writeUInt32LE(5, 16);
  lossless[20] = 47;
  lossless.writeUInt32LE(99 | (199 << 14), 21);
  assert.deepEqual(qrImageDimensions(lossless), { width: 100, height: 200 });
  assert.throws(() => qrImageDimensions(Buffer.from([1, 2, 3])), /cabecera/);
});
