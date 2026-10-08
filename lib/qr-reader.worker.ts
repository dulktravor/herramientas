import jsQR from 'jsqr';

self.onmessage = (
  event: MessageEvent<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }>,
) => {
  try {
    const { data, width, height } = event.data;
    const code = jsQR(data, width, height, {
      inversionAttempts: 'attemptBoth',
    });
    if (!code) {
      self.postMessage({
        error:
          'No se encontró un QR legible. Usa una imagen nítida con el código completo y su margen.',
      });
      return;
    }
    // Empty text also covers non-text QR payloads; do not report a misleading result.
    if (!code.data) {
      self.postMessage({
        error: 'Este QR no contiene texto legible compatible con el lector.',
      });
      return;
    }
    self.postMessage({ text: code.data });
  } catch {
    self.postMessage({
      error:
        'No se pudo leer la imagen. Prueba un PNG, JPEG o WebP válido y nítido.',
    });
  }
};
