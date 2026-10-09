import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { COLOR_LIMITS, parseColor, formatColor, rgbToHsl, hslToRgb, composite, luminance, contrast, paletteEntry, exportPalette } from '../lib/color-tools.ts';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);
const same = (actual, expected, tolerance = 1e-9) => { for (const key of ['r', 'g', 'b', 'a']) close(actual[key], expected[key], tolerance); };

// References are independent known CSS/WCAG examples, not parser-derived expectations.
// CSS Color 4 §7: https://www.w3.org/TR/css-color-4/#the-hsl-notation
void test('HEX, RGB y HSL primarios, grises, tonos normalizados y alfa', () => {
  assert.deepEqual(parseColor('#F00'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseColor('#0f08'), { r: 0, g: 255, b: 0, a: 136 / 255 });
  assert.deepEqual(parseColor(' #abcdef80 '), { r: 171, g: 205, b: 239, a: 128 / 255 });
  same(parseColor('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0, a: 1 });
  same(parseColor('hsl(120deg, 100%, 50%)'), { r: 0, g: 255, b: 0, a: 1 });
  same(parseColor('hsla(-120, 100%, 50%, 0.25)'), { r: 0, g: 0, b: 255, a: 0.25 });
  same(parseColor('hsl(720, 0%, 50%)'), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
  assert.deepEqual(parseColor('rgba(1.5, 2, 3, .5)'), { r: 1.5, g: 2, b: 3, a: 0.5 });
  same(parseColor('hsl(60, 100%, 50%)'), { r: 255, g: 255, b: 0, a: 1 });
});

void test('ida y vuelta RGB/HSL no pierde precisión interna; formatos explican redondeo', () => {
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    const color = { r, g, b, a: 0.45 }, hsl = rgbToHsl(color);
    same(hslToRgb(hsl.h, hsl.s, hsl.l, color.a), color);
    same(parseColor(formatColor(color).hsl), color, 0.00001);
    same(parseColor(formatColor(color).rgb), color);
    same(parseColor(formatColor({ ...color, a: 1 }).hex), { ...color, a: 1 });
  }
  const formats = formatColor({ r: 127.5, g: 0, b: 254.75, a: 0.5 });
  assert.equal(formats.hex, '#8000FF80');
  assert.equal(formats.rgb, 'rgba(127.5, 0, 254.75, 0.5)');
});

void test('entradas inválidas, fuera de rango y formatos no admitidos se rechazan', () => {
  for (const value of ['', '#12', '#12345', '#1234567', '#gggggg', 'red', 'rgb(256, 0, 0)', 'rgb(-1, 0, 0)', 'rgb(1, 2, 3, 1)', 'rgba(1, 2, 3)', 'rgba(1, 2, 3, 1.01)', 'rgb(10%, 0%, 0%)', 'rgb(1 2 3 / .5)', 'hsl(0, 101%, 50%)', 'hsl(0, 100, 50)', 'hsl(NaN, 0%, 0%)', 'hsla(0, 0%, 0%, -1)', 'color(display-p3 1 0 0)', 'rgb(1e2, 0, 0)', 'var(--color)', '#FFF' + ' '.repeat(128)]) assert.throws(() => parseColor(value), undefined, value);
  assert.throws(() => formatColor({ r: NaN, g: 0, b: 0, a: 1 }));
  assert.throws(() => hslToRgb(Infinity, 0, 0));
  assert.throws(() => hslToRgb(0, NaN, 50));
});

// WCAG 2.2 relative luminance, 0.04045 breakpoint, black/white = 21:1.
// https://www.w3.org/TR/2024/REC-WCAG22-20241212/#dfn-relative-luminance
void test('luminancia y contraste coinciden con valores de referencia WCAG 2.2', () => {
  const white = parseColor('#fff'), black = parseColor('#000');
  close(luminance(white), 1); close(luminance(black), 0);
  close(luminance(parseColor('#f00')), 0.2126); close(luminance(parseColor('#0f0')), 0.7152); close(luminance(parseColor('#00f')), 0.0722);
  close(contrast(black, white, white).ratio, 21);
  close(contrast(white, black, white).ratio, 21);
  close(contrast(black, black, white).ratio, 1);
  close(contrast(parseColor('#777'), white, white).ratio, 4.478089453577214, 1e-12);
  assert.equal(contrast(parseColor('#777'), white, white).normalAA, false);
  assert.equal(contrast(parseColor('#767676'), white, white).normalAA, true);
  // A continuous gray just below 4.5 must fail, although display rounds to 4.50.
  const ratio = 4.4999, linear = 1.05 / ratio - 0.05;
  const encoded = (1.055 * linear ** (1 / 2.4) - 0.055) * 255;
  const review = contrast({ r: encoded, g: encoded, b: encoded, a: 1 }, white, white);
  assert.equal(review.ratio.toFixed(2), '4.50'); assert.equal(review.normalAA, false);
});

void test('composición alfa aplica fondo sobre base y texto después, sin redondear', () => {
  const white = parseColor('#fff');
  same(composite(parseColor('rgba(255, 0, 0, 0.5)'), white), { r: 255, g: 127.5, b: 127.5, a: 1 });
  const review = contrast(parseColor('rgba(0, 0, 0, 0.5)'), parseColor('rgba(255, 0, 0, 0.5)'), white);
  same(review.effectiveBackground, { r: 255, g: 127.5, b: 127.5, a: 1 });
  same(review.effectiveForeground, { r: 127.5, g: 63.75, b: 63.75, a: 1 });
  close(contrast(parseColor('rgba(255, 0, 0, 0)'), parseColor('#000'), white).ratio, 1);
  close(contrast(parseColor('#000'), parseColor('rgba(255, 0, 0, 0)'), white).ratio, 21);
  same(composite(parseColor('#0000'), parseColor('#fff0')), { r: 0, g: 0, b: 0, a: 0 });
  same(composite(parseColor('#f008'), parseColor('#00f8')), { r: 173.86363636363637, g: 0, b: 81.13636363636364, a: 0.7822222222222222 });
  assert.throws(() => contrast(parseColor('#000'), white, parseColor('#fff8')), /opaco/);
  assert.throws(() => luminance(parseColor('#fff8')), /Compón/);
});

void test('umbrales AA/AAA para texto normal y grande son explícitos', () => {
  const white = parseColor('#fff');
  const high = contrast(parseColor('#000'), white, white);
  assert.ok(high.normalAA && high.normalAAA && high.largeAA && high.largeAAA);
  const medium = contrast(parseColor('#888'), white, white);
  assert.equal(medium.normalAA, false); assert.equal(medium.largeAA, true); assert.equal(medium.normalAAA, false); assert.equal(medium.largeAAA, false);
});

void test('todos los pasos de opacidad mantienen sRGB válido sin errores de flotante', () => {
  const bases = ['#fff', '#000', '#f00', '#0f0', '#00f', '#fff8', '#0008'].map(parseColor);
  for (const source of bases) for (const base of bases) for (let step = 0; step <= 100; step++) {
    const composed = composite({ ...source, a: step / 100 }, base);
    assert.doesNotThrow(() => formatColor(composed));
    assert.ok([composed.r, composed.g, composed.b].every((channel) => channel >= 0 && channel <= 255));
    assert.doesNotThrow(() => contrast({ ...source, a: step / 100 }, base, parseColor('#fff')));
  }
  assert.equal(composite({ r: 255, g: 0, b: 0, a: 0.08 }, parseColor('#fff')).r, 255);
});

void test('paleta JSON y TXT preserva Unicode, nombres, valores y opacidad; controles inválidos rechazados', () => {
  const original = { r: 10.25, g: 20.125, b: 30, a: 0.123456789 };
  const entry = paletteEntry('  Diseño ñ 😀  ', original);
  original.r = 200;
  const json = JSON.parse(exportPalette([entry], 'json'));
  assert.equal(json.version, 1); assert.equal(json.colorSpace, 'srgb');
  assert.equal(json.colors[0].name, 'Diseño ñ 😀');
  assert.deepEqual(json.colors[0].rgba, { r: 10.25, g: 20.125, b: 30, a: 0.123456789 });
  assert.equal(json.colors[0].hex, '#0A141E1F');
  assert.match(exportPalette([entry], 'txt'), /Diseño ñ 😀\nHEX: #0A141E1F\nRGB: rgba\(10.25, 20.125, 30, 0.123457\)/);
  for (const name of ['', ' ', 'a'.repeat(65), 'a\nb', 'a\u0000b', '\ud800']) assert.throws(() => paletteEntry(name, parseColor('#fff')));
  assert.throws(() => exportPalette([], 'json'));
  assert.throws(() => exportPalette(Array(33).fill(entry), 'txt'));
});

void test('límite de 32 colores: conversión, composición y exportación mantienen carga acotada', (context) => {
  const start = performance.now();
  const entries = Array.from({ length: COLOR_LIMITS.palette }, (_, index) => paletteEntry(`Color ${index + 1} ${'x'.repeat(50)}`, parseColor(`hsla(${index * 10}, 80%, 60%, .5)`)));
  for (const entry of entries) contrast(entry.color, parseColor('#fff8'), parseColor('#fff'));
  const content = exportPalette(entries, 'json');
  assert.equal(JSON.parse(content).colors.length, 32);
  context.diagnostic(`32 colores y exportación ${Buffer.byteLength(content)} bytes: ${(performance.now() - start).toFixed(2)} ms en Node ${process.version}.`);
});
