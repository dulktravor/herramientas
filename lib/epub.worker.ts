import JSZip from 'jszip';
import {
  EPUB_LIMITS,
  inspectZip,
  safePath,
  type EpubEntry,
} from './epub-archive';
self.onmessage = async (
  event: MessageEvent<{
    action: 'open' | 'pack';
    buffer?: ArrayBuffer;
    entries?: EpubEntry[];
    epub?: boolean;
  }>,
) => {
  try {
    const request = event.data;
    if (request.action === 'open') {
      inspectZip(request.buffer!);
      const zip = await JSZip.loadAsync(request.buffer!);
      const entries: EpubEntry[] = [];
      let total = 0;
      for (const file of Object.values(zip.files)) {
        if (file.dir) continue;
        const data = await new Promise<Uint8Array>((resolve, reject) => {
          const chunks: Uint8Array[] = [];
          let size = 0;
          // JSZip 3.10 implements this streaming API but omits it from JSZipObject's typings.
          const stream = (
            file as typeof file & {
              internalStream(
                type: 'uint8array',
              ): JSZip.JSZipStreamHelper<Uint8Array>;
            }
          ).internalStream('uint8array');
          stream
            .on('data', (chunk: Uint8Array) => {
              size += chunk.length;
              if (total + size > EPUB_LIMITS.expanded) {
                stream.pause();
                reject(new Error('El contenido supera 80 MB.'));
                return;
              }
              chunks.push(chunk);
            })
            .on('error', reject)
            .on('end', () => {
              const bytes = new Uint8Array(size);
              let offset = 0;
              for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.length;
              }
              resolve(bytes);
            })
            .resume();
        });
        total += data.length;
        if (total > EPUB_LIMITS.expanded)
          throw new Error('El contenido supera 80 MB.');
        entries.push({ path: file.name, data, media: '' });
        self.postMessage({ progress: `Leyendo recurso ${entries.length}…` });
      }
      self.postMessage({ result: entries });
    } else {
      const zip = new JSZip();
      if (request.epub)
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
      const names = new Set<string>();
      let total = 0;
      for (const entry of request.entries!) {
        safePath(entry.path);
        total += entry.data.length;
        if (
          names.has(entry.path) ||
          total > EPUB_LIMITS.expanded ||
          names.size >= EPUB_LIMITS.entries
        )
          throw new Error('Rutas duplicadas o límites del libro superados.');
        names.add(entry.path);
        if (entry.path !== 'mimetype')
          zip.file(entry.path, entry.data, { createFolders: false });
      }
      const result = await zip.generateAsync(
        {
          type: 'arraybuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        ({ percent }) =>
          self.postMessage({
            progress: `Empaquetando: ${Math.round(percent)} %`,
          }),
      );
      self.postMessage({ result }, { transfer: [result] });
    }
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el archivo.',
    });
  }
};
