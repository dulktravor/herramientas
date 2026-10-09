export type Color = { r: number; g: number; b: number; a: number };
export type PaletteEntry = { name: string; color: Color };
export const COLOR_LIMITS = { input: 128, name: 64, palette: 32 } as const;

/**
 * N-06: sRGB only; explicit subset of CSS Color 4 (HEX and comma RGB/HSL).
 * https://www.w3.org/TR/css-color-4/#hsl-to-rgb
 * Contrast: WCAG 2.2 Recommendation, 12 December 2024, relative luminance
 * (0.04045 breakpoint), criteria 1.4.3 and 1.4.6. No rounded pass decisions.
 * https://www.w3.org/TR/2024/REC-WCAG22-20241212/#dfn-relative-luminance
 * Alpha: source-over on encoded sRGB components, background over opaque canvas,
 * then foreground over effective background, before luminance linearization.
 * https://www.w3.org/TR/compositing-1/#simplealphacompositing
 * Formatting rounds only at export: HEX to 8-bit, RGB/HSL to 6 decimals.
 */
function validColor(color: Color): void {
  if (![color.r, color.g, color.b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)
    || !Number.isFinite(color.a) || color.a < 0 || color.a > 1) throw new Error('Color fuera del rango sRGB u opacidad inválida.');
}

function number(token: string): number {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error('Usa números con punto decimal; las comas separan componentes.');
  const value = Number(token);
  if (!Number.isFinite(value)) throw new Error('El número debe ser finito.');
  return value;
}

function inRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: admite valores entre ${min} y ${max}.`);
  return value;
}

export function hslToRgb(h: number, s: number, l: number, a = 1): Color {
  if (!Number.isFinite(h)) throw new Error('El tono debe ser finito.');
  inRange(s, 0, 100, 'Saturación'); inRange(l, 0, 100, 'Luminosidad');
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const amplitude = s * Math.min(l, 1 - l);
  const channel = (offset: number) => {
    const k = (offset + h / 30) % 12;
    return 255 * (l - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  const result = { r: channel(0), g: channel(8), b: channel(4), a };
  validColor(result); return result;
}

export function rgbToHsl(color: Color): { h: number; s: number; l: number } {
  validColor(color);
  const [r, g, b] = [color.r / 255, color.g / 255, color.b / 255];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const l = (max + min) / 2;
  // The mathematical saturation is bounded; remove floating point overshoot at 100 %.
  const s = delta === 0 ? 0 : Math.min(1, delta / (1 - Math.abs(2 * l - 1)));
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = ((h * 60) + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function parseColor(input: string): Color {
  if (input.length > COLOR_LIMITS.input) throw new Error('El color admite como máximo 128 caracteres.');
  const text = input.trim();
  if (!text) throw new Error('Introduce un color HEX, RGB o HSL.');
  if (/^#[0-9a-f]{3,4}$/i.test(text) || /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(text)) {
    const hex = text.length <= 5 ? text.slice(1).split('').map((char) => char + char).join('') : text.slice(1);
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
  }
  const match = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/i.exec(text);
  if (!match) throw new Error('Usa HEX con # (3, 4, 6 u 8 dígitos), rgb/rgba o hsl/hsla con comas.');
  const fn = match[1].toLowerCase(), parts = match[2].split(',').map((part) => part.trim());
  if (parts.length !== (fn.endsWith('a') ? 4 : 3)) throw new Error('La cantidad de componentes no corresponde al formato elegido.');
  const alpha = parts.length === 4 ? inRange(number(parts[3]), 0, 1, 'Opacidad') : 1;
  if (fn.startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((part) => inRange(number(part), 0, 255, 'Canal RGB'));
    return { r, g, b, a: alpha };
  }
  if (!parts[1].endsWith('%') || !parts[2].endsWith('%')) throw new Error('Saturación y luminosidad HSL deben terminar en %.');
  const hue = parts[0].replace(/deg$/i, '');
  return hslToRgb(number(hue), number(parts[1].slice(0, -1)), number(parts[2].slice(0, -1)), alpha);
}

const decimal = (value: number) => String(Number(value.toFixed(6)));
export function formatColor(color: Color): { hex: string; rgb: string; hsl: string } {
  validColor(color);
  const byte = (value: number) => Math.round(value).toString(16).padStart(2, '0').toUpperCase();
  const { h, s, l } = rgbToHsl(color);
  return {
    hex: `#${byte(color.r)}${byte(color.g)}${byte(color.b)}${color.a < 1 ? byte(color.a * 255) : ''}`,
    rgb: `${color.a < 1 ? 'rgba' : 'rgb'}(${decimal(color.r)}, ${decimal(color.g)}, ${decimal(color.b)}${color.a < 1 ? `, ${decimal(color.a)}` : ''})`,
    hsl: `${color.a < 1 ? 'hsla' : 'hsl'}(${decimal(h)}, ${decimal(s)}%, ${decimal(l)}%${color.a < 1 ? `, ${decimal(color.a)}` : ''})`,
  };
}

export function composite(source: Color, background: Color): Color {
  validColor(source); validColor(background);
  const a = source.a + background.a * (1 - source.a);
  // A convex combination is mathematically in [0,255], but floating point
  // products can produce 255.00000000000003. Bound derived components only;
  // input validation remains strict and ordinary components are not rounded.
  const channel = (key: 'r' | 'g' | 'b') => a === 0 ? 0 : Math.max(0, Math.min(255, (source[key] * source.a + background[key] * background.a * (1 - source.a)) / a));
  return { r: channel('r'), g: channel('g'), b: channel('b'), a };
}

export function luminance(color: Color): number {
  validColor(color);
  if (color.a !== 1) throw new Error('Compón la transparencia sobre un fondo opaco antes de calcular luminancia.');
  const linear = (channel: number) => { const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function contrast(foreground: Color, background: Color, canvas: Color) {
  validColor(canvas);
  if (canvas.a !== 1) throw new Error('El fondo base debe ser opaco (opacidad 100 %).');
  const effectiveBackground = composite(background, canvas);
  const effectiveForeground = composite(foreground, effectiveBackground);
  const first = luminance(effectiveForeground), second = luminance(effectiveBackground);
  const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  return { ratio, effectiveBackground, effectiveForeground, normalAA: ratio >= 4.5, largeAA: ratio >= 3, normalAAA: ratio >= 7, largeAAA: ratio >= 4.5 };
}

export function paletteEntry(name: string, color: Color): PaletteEntry {
  validColor(color);
  const trimmed = name.trim();
  const hasControl = Array.from(trimmed).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
  if (!trimmed || trimmed.length > COLOR_LIMITS.name || hasControl || !trimmed.isWellFormed()) throw new Error('El nombre requiere de 1 a 64 caracteres, sin saltos ni caracteres de control.');
  return { name: trimmed, color: { ...color } };
}

export function exportPalette(entries: PaletteEntry[], format: 'txt' | 'json'): string {
  if (!entries.length || entries.length > COLOR_LIMITS.palette) throw new Error('La paleta requiere entre 1 y 32 colores.');
  const colors = entries.map((entry) => { const checked = paletteEntry(entry.name, entry.color); return { name: checked.name, ...formatColor(checked.color), rgba: checked.color }; });
  if (format === 'json') return JSON.stringify({ version: 1, colorSpace: 'srgb', colors }, null, 2) + '\n';
  return 'Paleta CeroNube · sRGB\nHEX redondeado a 8 bits; RGB/HSL a 6 decimales.\n\n' + colors.map((entry) => `${entry.name}\nHEX: ${entry.hex}\nRGB: ${entry.rgb}\nHSL: ${entry.hsl}\nOpacidad: ${decimal(entry.rgba.a * 100)} %`).join('\n\n') + '\n';
}
