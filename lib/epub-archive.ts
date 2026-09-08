export const EPUB_LIMITS = {
  compressed: 30 * 1024 * 1024,
  expanded: 80 * 1024 * 1024,
  entries: 1500,
  document: 2 * 1024 * 1024,
  chapters: 300,
};
export type EpubEntry = { path: string; data: Uint8Array; media: string };
export function safePath(path: string) {
  if (
    !path ||
    /[\\?#:]/.test(path) ||
    Array.from(path).some((c) => c.charCodeAt(0) < 32) ||
    path.startsWith('/') ||
    path.split('/').some((p) => p === '..' || p === '.')
  )
    throw new Error('El archivo contiene una ruta no segura.');
  return path;
}
// Inspect sizes before JSZip allocates inflated contents. Reject ZIP64 and ambiguous names.
export function inspectZip(buffer: ArrayBuffer) {
  const v = new DataView(buffer);
  if (buffer.byteLength > EPUB_LIMITS.compressed || buffer.byteLength < 22)
    throw new Error('EPUB inválido o mayor de 30 MB.');
  let end = -1;
  for (let p = v.byteLength - 22; p >= Math.max(0, v.byteLength - 65557); p--)
    if (
      v.getUint32(p, true) === 0x06054b50 &&
      p + 22 + v.getUint16(p + 20, true) === v.byteLength
    ) {
      end = p;
      break;
    }
  if (end < 0) throw new Error('No se encuentra un contenedor ZIP válido.');
  const count = v.getUint16(end + 10, true),
    offset = v.getUint32(end + 16, true);
  if (
    v.getUint16(end + 4, true) ||
    v.getUint16(end + 6, true) ||
    count !== v.getUint16(end + 8, true) ||
    count > EPUB_LIMITS.entries ||
    offset === 0xffffffff
  )
    throw new Error(
      'ZIP dividido, ZIP64 o demasiados recursos: no compatible.',
    );
  let pos = offset,
    total = 0;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50)
      throw new Error('Directorio ZIP dañado.');
    const flags = v.getUint16(pos + 8, true),
      size = v.getUint32(pos + 24, true),
      len = v.getUint16(pos + 28, true);
    const next =
      pos +
      46 +
      len +
      v.getUint16(pos + 30, true) +
      v.getUint16(pos + 32, true);
    if (next > end || flags & 1 || size === 0xffffffff)
      throw new Error('ZIP cifrado o dañado: no compatible.');
    const path = safePath(
      new TextDecoder('utf-8', { fatal: true }).decode(
        new Uint8Array(buffer, pos + 46, len),
      ),
    );
    if (names.has(path)) throw new Error('El ZIP contiene rutas duplicadas.');
    names.add(path);
    total += size;
    if (total > EPUB_LIMITS.expanded)
      throw new Error('El libro supera 80 MB descomprimidos.');
    pos = next;
  }
  return { total, names };
}
