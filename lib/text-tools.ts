export const TEXT_LIMITS = { bytes: 1024 * 1024, lines: 50_000, preview: 20_000, history: 5 } as const;

export type TextEncoding = 'auto' | 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';
export type TextOptions = {
  collapseSpaces: boolean;
  removeEmpty: boolean;
  duplicates: 'keep' | 'exact' | 'trim-case';
  caseMode: 'keep' | 'upper' | 'lower';
  sort: 'keep' | 'alphabetic' | 'natural';
  descending: boolean;
};
export const DEFAULT_TEXT_OPTIONS: TextOptions = {
  collapseSpaces: false, removeEmpty: false, duplicates: 'keep', caseMode: 'keep', sort: 'keep', descending: false,
};
export type TextStats = { characters: number; words: number; lines: number; bytes: number; lf: number; crlf: number; cr: number };
export type TextResult = { text: string; originalStats: TextStats; stats: TextStats; changes: string[] };

export function assertTextSize(bytes: number) {
  if (bytes > TEXT_LIMITS.bytes) throw new Error('El texto supera el límite de 1 MiB (1.048.576 bytes). Reduce el archivo o pega un fragmento.');
}

export function validateUnicode(text: string) {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('El texto contiene un carácter Unicode incompleto. Corrige la entrada antes de exportarla.');
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error('El texto contiene un carácter Unicode incompleto. Corrige la entrada antes de exportarla.');
    }
  }
}

export function textBytes(text: string): Uint8Array {
  validateUnicode(text);
  return new TextEncoder().encode(text);
}

export function decodeText(bytes: Uint8Array, selection: TextEncoding = 'auto'): { text: string; encoding: string } {
  assertTextSize(bytes.byteLength);
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 'utf-8'
    : bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : null;
  const encoding = selection === 'auto' ? (bom ?? 'utf-8') : selection;
  if (bom && bom !== encoding) throw new Error(`El archivo declara ${bom.toUpperCase()}. Elige esa codificación o detección automática.`);
  try {
    // Preserve an actual U+FEFF after the encoding marker; consume only the marker.
    const offset = bom === 'utf-8' ? 3 : bom ? 2 : 0;
    const text = new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(bytes.subarray(offset));
    if (text.includes('\0')) throw new Error('El archivo contiene bytes nulos. Comprueba la codificación o selecciona un TXT, no un archivo binario.');
    validateUnicode(text);
    assertTextSize(textBytes(text).byteLength);
    return { text, encoding: `${encoding.toUpperCase()}${bom ? ' con BOM' : ''}` };
  } catch (error) {
    if (error instanceof TypeError) throw new Error('No se puede leer el TXT con esa codificación sin perder caracteres. Elige UTF-16 o Windows-1252 solo si conoces la codificación del archivo.');
    throw error;
  }
}

function splitLines(text: string) {
  const pieces = text.split(/(\r\n|\r|\n)/);
  const rows = Array.from({ length: Math.ceil(pieces.length / 2) }, (_, index) => ({ text: pieces[index * 2], eol: pieces[index * 2 + 1] ?? '' }));
  if (rows.length > 1 && rows[rows.length - 1].text === '') rows.pop();
  return rows;
}

export function countText(text: string): TextStats {
  const bytes = textBytes(text).byteLength;
  assertTextSize(bytes);
  let characters = 0, lf = 0, crlf = 0, cr = 0;
  for (const character of text) { void character; characters++; }
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\r') {
      if (text[index + 1] === '\n') { crlf++; index++; } else cr++;
    } else if (text[index] === '\n') lf++;
  }
  const lines = text === '' ? 0 : lf + crlf + cr + 1;
  if (lines > TEXT_LIMITS.lines) throw new Error('El texto supera 50.000 líneas. Divide la lista antes de procesarla.');
  // A word is a run of letters/numbers/combining marks, with optional inner apostrophes.
  let words = 0;
  const expression = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu;
  while (expression.exec(text)) words++;
  return { characters, words, lines, bytes, lf, crlf, cr };
}

export function transformText(input: string, options: TextOptions): TextResult {
  const originalStats = countText(input);
  const changes: string[] = [];
  let text = input;
  if (options.collapseSpaces) {
    let runs = 0;
    text = text.replace(/[ \t]{2,}/g, () => { runs++; return ' '; });
    changes.push(`${runs} grupos de espacios o tabulaciones reducidos a un espacio.`);
  }
  if (options.caseMode !== 'keep') {
    text = options.caseMode === 'upper' ? text.toLocaleUpperCase('es') : text.toLocaleLowerCase('es');
    changes.push(options.caseMode === 'upper' ? 'Texto convertido a MAYÚSCULAS.' : 'Texto convertido a minúsculas.');
  }
  if (text !== '' && (options.removeEmpty || options.duplicates !== 'keep' || options.sort !== 'keep')) {
    let rows = splitLines(text);
    if (options.removeEmpty) {
      const before = rows.length;
      rows = rows.filter((row) => !/^\s*$/u.test(row.text));
      changes.push(`${before - rows.length} líneas vacías eliminadas.`);
    }
    if (options.duplicates !== 'keep') {
      const seen = new Set<string>();
      const before = rows.length;
      rows = rows.filter((row) => {
        const key = options.duplicates === 'exact' ? row.text : row.text.trim().toLocaleLowerCase('es');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      changes.push(`${before - rows.length} líneas duplicadas eliminadas; se conserva la primera.`);
    }
    if (options.sort !== 'keep') {
      const separators = rows.map((row) => row.eol);
      const collator = new Intl.Collator('es', { sensitivity: 'variant', numeric: options.sort === 'natural' });
      rows.sort((a, b) => (options.descending ? -1 : 1) * collator.compare(a.text, b.text));
      rows = rows.map((row, index) => ({ text: row.text, eol: separators[index] }));
      changes.push(`Líneas ordenadas en español, ${options.sort === 'natural' ? 'con números naturales' : 'alfabéticamente'}, ${options.descending ? 'de Z a A' : 'de A a Z'}.`);
    }
    const fallback = input.match(/\r\n|\r|\n/)?.[0] ?? '\n';
    const terminal = /(?:\r\n|\r|\n)$/.test(input);
    text = rows.map((row, index) => row.text + (index === rows.length - 1 && !terminal ? '' : row.eol || fallback)).join('');
  }
  const stats = countText(text);
  if (!changes.length) changes.push('Sin transformaciones: el resultado conserva exactamente la entrada.');
  if (text === input && changes.length) changes.push('El contenido no cambió.');
  return { text, originalStats, stats, changes };
}

export function textPreview(text: string) {
  if (text.length <= TEXT_LIMITS.preview) return { text, truncated: false };
  let end = TEXT_LIMITS.preview;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end--;
  return { text: text.slice(0, end), truncated: true };
}
