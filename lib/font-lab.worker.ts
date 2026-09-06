import './font-worker-environment';
import { Font, woff2 } from 'fonteditor-core';
import { inflate, deflate } from 'pako';
import {
  detectFont,
  FONT_LIMIT,
  type FontRequest,
  type FontResult,
} from './font-lab-types';

self.onmessage = async ({ data }: MessageEvent<FontRequest>) => {
  try {
    if (data.buffer.byteLength > FONT_LIMIT)
      throw new Error('El límite es de 10 MB por fuente.');
    const format = detectFont(data.buffer);
    if (format === 'woff' || format === 'woff2') {
      const expanded = new DataView(data.buffer).getUint32(16);
      if (expanded > 40 * 1024 * 1024)
        throw new Error('La fuente supera los 40 MB descomprimida.');
    }
    if (format === 'woff2' || data.output === 'woff2') {
      await woff2.init('/font-engine/woff2.wasm');
    }
    const subset =
      data.subset === undefined
        ? undefined
        : [...new Set(Array.from(data.subset, (c) => c.codePointAt(0)!))];
    const font = Font.create(data.buffer, {
      type: format,
      subset,
      compound2simple: !!subset,
      inflate: (bytes) => Array.from(inflate(new Uint8Array(bytes))),
    });
    const value = font.get();
    if (subset) {
      // Shared glyphs can have extra Unicode aliases; keep only requested codes.
      const requested = new Set(subset);
      for (const glyph of value.glyf)
        glyph.unicode = (glyph.unicode ?? []).filter((code) =>
          requested.has(code),
        );
    }
    if (data.output) {
      const result = font.write({
        type: data.output,
        toBuffer: false,
        deflate: (bytes) => Array.from(deflate(new Uint8Array(bytes))),
      });
      const buffer =
        result instanceof ArrayBuffer
          ? result
          : new Uint8Array(result as Uint8Array).buffer;
      self.postMessage({ buffer } satisfies FontResult, { transfer: [buffer] });
    } else {
      const characters = [
        ...new Set(value.glyf.flatMap((g) => g.unicode ?? [])),
      ]
        .filter(
          (c) => c >= 32 && c <= 0x10ffff && !(c >= 0xd800 && c <= 0xdfff),
        )
        .sort((a, b) => a - b);
      self.postMessage({
        info: {
          name: value.name.fullName || value.name.fontFamily || 'Sin nombre',
          family: value.name.fontFamily || 'Fuente local',
          style: value.name.fontSubFamily || 'Regular',
          weight: value['OS/2'].usWeightClass || 400,
          glyphs: value.glyf.length,
          characters,
        },
      } satisfies FontResult);
    }
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo procesar esta fuente. Puede estar dañada o usar tablas no compatibles.',
    } satisfies FontResult);
  }
};
