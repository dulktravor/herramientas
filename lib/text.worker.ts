import { countText, decodeText, transformText, type TextEncoding, type TextOptions } from './text-tools';

self.onmessage = async (event: MessageEvent<{ action: 'open' | 'transform'; file?: File; encoding?: TextEncoding; text?: string; options?: TextOptions }>) => {
  try {
    if (event.data.action === 'open') {
      self.postMessage({ progress: 'Leyendo y validando la codificación…' });
      const bytes = new Uint8Array(await event.data.file!.arrayBuffer());
      const decoded = decodeText(bytes, event.data.encoding);
      self.postMessage({ progress: 'Contando el texto…' });
      self.postMessage({ opened: { ...decoded, stats: countText(decoded.text) } });
    } else {
      self.postMessage({ progress: 'Aplicando las transformaciones y contando el resultado…' });
      self.postMessage({ result: transformText(event.data.text!, event.data.options!) });
    }
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'No se pudo procesar el texto. Prueba con un TXT más pequeño.' });
  }
};
