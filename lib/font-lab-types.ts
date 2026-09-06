export type FontFormat = 'ttf' | 'otf' | 'woff' | 'woff2';
export type FontInfo = {
  name: string;
  family: string;
  style: string;
  weight: number;
  glyphs: number;
  characters: number[];
};
export type FontRequest = {
  buffer: ArrayBuffer;
  format: FontFormat;
  output?: 'ttf' | 'woff' | 'woff2';
  subset?: string;
};
export type FontResult = {
  info?: FontInfo;
  buffer?: ArrayBuffer;
  error?: string;
};
export const FONT_LIMIT = 10 * 1024 * 1024;
export function detectFont(buffer: ArrayBuffer): FontFormat {
  const bytes = new Uint8Array(buffer);
  const signature = String.fromCharCode(...bytes.slice(0, 4));
  if (signature === 'OTTO') return 'otf';
  if (signature === 'wOFF') return 'woff';
  if (signature === 'wOF2') return 'woff2';
  if (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)
    return 'ttf';
  throw new Error('El archivo no es una fuente TTF, OTF, WOFF o WOFF2 válida.');
}
