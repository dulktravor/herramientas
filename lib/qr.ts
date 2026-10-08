import type { QRCode } from 'qrcode';

export const QR_MAX_BYTES = 2331;
export const QR_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const QR_IMAGE_MAX_SIDE = 2048;
export const QR_MARGIN = 4;
export const QR_SCALE = 6;

export type QrInput =
  | { kind: 'text'; text: string }
  | { kind: 'url'; url: string }
  | {
      kind: 'wifi';
      ssid: string;
      password: string;
      security: 'WPA' | 'WEP' | 'nopass';
      hidden: boolean;
    }
  | {
      kind: 'contact';
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      organization: string;
    };

export function escapeWifi(value: string) {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export function escapeVcard(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function hasControl(value: string) {
  return Array.from(value).some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );
}

function foldVcardLine(line: string) {
  const encoder = new TextEncoder();
  let result = '';
  let lineBytes = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (lineBytes + bytes > 75) {
      result += '\r\n ';
      lineBytes = 1;
    }
    result += character;
    lineBytes += bytes;
  }
  return result;
}

export function validateQrText(value: string) {
  if (!value)
    throw new Error('Escribe el contenido que quieres convertir en QR.');
  // Do not silently turn lone UTF-16 surrogates into replacement characters.
  if (
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
      value,
    )
  ) {
    throw new Error(
      'El texto contiene un carácter Unicode incompleto. Vuelve a pegarlo.',
    );
  }
  const bytes = new TextEncoder().encode(value).length;
  if (bytes > QR_MAX_BYTES)
    throw new Error(
      `El contenido ocupa ${bytes} bytes UTF-8. El máximo es ${QR_MAX_BYTES} bytes, incluidos los campos y escapes.`,
    );
  return value;
}

export function getQrLink(
  value: string,
): { href: string; protocol: string } | null {
  // Restrict explicit navigation to ordinary web URLs; do not normalize decoded text.
  if (!/^https?:\/\//i.test(value) || /\s/u.test(value) || hasControl(value))
    return null;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    return { href: value, protocol: parsed.protocol };
  } catch {
    return null;
  }
}

export function buildQrPayload(input: QrInput) {
  let payload: string;
  switch (input.kind) {
    case 'text':
      payload = input.text;
      break;
    case 'url':
      if (!getQrLink(input.url))
        throw new Error(
          'Introduce una URL completa con http:// o https://, sin espacios ni credenciales.',
        );
      payload = input.url;
      break;
    case 'wifi':
      if (!input.ssid.trim())
        throw new Error('Introduce el nombre de la red Wi-Fi.');
      if (!['WPA', 'WEP', 'nopass'].includes(input.security))
        throw new Error('Selecciona un tipo de seguridad compatible.');
      if (hasControl(input.ssid + input.password))
        throw new Error(
          'Los datos Wi-Fi no admiten saltos de línea ni caracteres de control.',
        );
      if (input.security !== 'nopass' && !input.password)
        throw new Error(
          'Introduce la contraseña de la red o elige una red sin contraseña.',
        );
      payload = `WIFI:T:${input.security};S:${escapeWifi(input.ssid)};${input.security === 'nopass' ? '' : `P:${escapeWifi(input.password)};`}H:${input.hidden ? 'true' : 'false'};;`;
      break;
    case 'contact': {
      if (!input.firstName.trim() && !input.lastName.trim())
        throw new Error('Introduce un nombre o apellido para el contacto.');
      if (hasControl(input.phone + input.email))
        throw new Error(
          'El teléfono y el correo no admiten saltos de línea ni caracteres de control.',
        );
      if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email))
        throw new Error('Revisa el correo electrónico del contacto.');
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVcard(input.lastName)};${escapeVcard(input.firstName)};;;`,
        `FN:${escapeVcard([input.firstName, input.lastName].filter(Boolean).join(' '))}`,
      ];
      if (input.phone) lines.push(`TEL:${escapeVcard(input.phone)}`);
      if (input.email) lines.push(`EMAIL:${escapeVcard(input.email)}`);
      if (input.organization)
        lines.push(`ORG:${escapeVcard(input.organization)}`);
      lines.push('END:VCARD');
      payload = lines.map(foldVcardLine).join('\r\n');
      break;
    }
    default:
      throw new Error('Selecciona un tipo de QR compatible.');
  }
  return validateQrText(payload);
}

export async function createQr(value: string): Promise<QRCode> {
  validateQrText(value);
  const { default: encoder } = await import('qrcode');
  // A single UTF-8 byte segment gives an exact, predictable capacity at level M.
  return encoder.create(
    [{ data: new TextEncoder().encode(value), mode: 'byte' }],
    { errorCorrectionLevel: 'M' },
  );
}

export function qrToSvg(qr: QRCode) {
  const size = qr.modules.size + 2 * QR_MARGIN;
  let path = '';
  for (let y = 0; y < qr.modules.size; y++) {
    for (let x = 0; x < qr.modules.size; x++) {
      if (qr.modules.data[y * qr.modules.size + x])
        path += `M${x + QR_MARGIN} ${y + QR_MARGIN}h1v1h-1z`;
    }
  }
  // Only numeric modules are serialized. User content never becomes SVG markup.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * QR_SCALE}" height="${size * QR_SCALE}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

export function qrToCanvas(qr: QRCode) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = (qr.modules.size + 2 * QR_MARGIN) * QR_SCALE;
  const context = canvas.getContext('2d');
  if (!context)
    throw new Error('Este navegador no permite crear imágenes en un lienzo.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  for (let y = 0; y < qr.modules.size; y++) {
    for (let x = 0; x < qr.modules.size; x++) {
      if (qr.modules.data[y * qr.modules.size + x])
        context.fillRect(
          (x + QR_MARGIN) * QR_SCALE,
          (y + QR_MARGIN) * QR_SCALE,
          QR_SCALE,
          QR_SCALE,
        );
    }
  }
  return canvas;
}

export function validateQrImageFile(file: Pick<File, 'size' | 'type'>) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error(
      'Selecciona una imagen PNG, JPEG o WebP. SVG no se admite en el lector.',
    );
  if (file.size === 0 || file.size > QR_IMAGE_MAX_BYTES)
    throw new Error('La imagen debe pesar entre 1 byte y 8 MiB.');
}

// Inspect dimensions before decoding compressed pixels to avoid allocating an
// arbitrarily large bitmap. The browser still verifies the full image afterward.
export function qrImageDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, text: string) =>
    text
      .split('')
      .every(
        (character, index) => bytes[offset + index] === character.charCodeAt(0),
      );
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    ascii(1, 'PNG\r\n\x1a\n') &&
    ascii(12, 'IHDR')
  ) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (start + length > bytes.length) break;
      if (ascii(offset, 'VP8X') && length >= 10) {
        const little24 = (at: number) =>
          bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
        return {
          width: little24(start + 4) + 1,
          height: little24(start + 7) + 1,
        };
      }
      if (ascii(offset, 'VP8L') && length >= 5 && bytes[start] === 47) {
        const bits = view.getUint32(start + 1, true);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >>> 14) & 0x3fff) + 1,
        };
      }
      if (
        ascii(offset, 'VP8 ') &&
        length >= 10 &&
        bytes[start + 3] === 157 &&
        bytes[start + 4] === 1 &&
        bytes[start + 5] === 42
      ) {
        return {
          width: view.getUint16(start + 6, true) & 0x3fff,
          height: view.getUint16(start + 8, true) & 0x3fff,
        };
      }
      offset = start + length + (length % 2);
    }
  }
  if (bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 8
      ) {
        return {
          height: view.getUint16(offset + 3),
          width: view.getUint16(offset + 5),
        };
      }
      offset += length;
    }
  }
  throw new Error(
    'La imagen no tiene una cabecera PNG, JPEG o WebP válida. Vuelve a exportarla en uno de esos formatos.',
  );
}

export function validateQrImageDimensions(width: number, height: number) {
  if (
    width < 1 ||
    height < 1 ||
    width > QR_IMAGE_MAX_SIDE ||
    height > QR_IMAGE_MAX_SIDE
  )
    throw new Error(
      'La imagen supera 2048 × 2048 píxeles o sus medidas no son válidas. Recorta el QR o reduce la imagen antes de leerla.',
    );
}

export async function readQrImagePixels(file: File, signal: AbortSignal) {
  validateQrImageFile(file);
  if (typeof createImageBitmap !== 'function')
    throw new Error(
      'Este navegador no admite la lectura local de estas imágenes. Prueba una versión reciente de Firefox, Chrome, Edge o Safari.',
    );
  signal.throwIfAborted();
  const dimensions = qrImageDimensions(
    new Uint8Array(await file.arrayBuffer()),
  );
  signal.throwIfAborted();
  validateQrImageDimensions(dimensions.width, dimensions.height);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    validateQrImageDimensions(bitmap.width, bitmap.height);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
      throw new Error(
        'Este navegador no permite leer los píxeles de la imagen.',
      );
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}
