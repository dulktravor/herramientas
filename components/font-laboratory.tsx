'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { downloadBlob, replaceExtension } from '@/lib/browser-files';
import {
  detectFont,
  FONT_LIMIT,
  type FontInfo,
  type FontRequest,
  type FontResult,
} from '@/lib/font-lab-types';

const alphabets = {
  'Español (tildes, eñes y signos)':
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÜÑáéíóúüñ¿¡',
  'Símbolos y monedas': '€$£¥©®™±×÷°→←',
  'Griego básico': 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
  'Cirílico ruso':
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
};
const panel = 'rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4';

export function FontLaboratory() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<FontInfo | null>(null);
  const [family, setFamily] = useState('sans-serif');
  const [text, setText] = useState(
    'El veloz murciélago hindú comía feliz cardillo y kiwi. ¡Qué fuente tan bonita! 0123456789',
  );
  const [size, setSize] = useState(40);
  const [page, setPage] = useState(0);
  const [output, setOutput] = useState<'woff2' | 'woff' | 'ttf'>('woff2');
  const [subset, setSubset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Selecciona una fuente para comenzar.');
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);
  const face = useRef<FontFace | null>(null);
  const generation = useRef(0);
  const rejectJob = useRef<((reason: Error) => void) | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      rejectJob.current?.(new Error('Operación cancelada.'));
      if (face.current) document.fonts.delete(face.current);
    },
    [],
  );
  function cancel() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    rejectJob.current?.(new Error('Operación cancelada.'));
    rejectJob.current = null;
    setBusy(false);
    setStatus('Operación cancelada.');
  }
  function clear() {
    cancel();
    if (face.current) document.fonts.delete(face.current);
    face.current = null;
    setInfo(null);
    setFile(null);
    setError('');
    setFamily('sans-serif');
    setPage(0);
    if (input.current) input.current.value = '';
    setStatus('Selecciona una fuente para comenzar.');
  }
  function run(data: FontRequest): Promise<FontResult> {
    return new Promise((resolve, reject) => {
      const instance = new Worker(
        new URL('../lib/font-lab.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = instance;
      const timeout = window.setTimeout(
        () =>
          finish(
            undefined,
            'La operación superó 60 segundos. Prueba una fuente más pequeña.',
          ),
        60000,
      );
      function finish(result?: FontResult, message?: string) {
        clearTimeout(timeout);
        instance.terminate();
        worker.current = null;
        rejectJob.current = null;
        if (message) reject(new Error(message));
        else resolve(result!);
      }
      rejectJob.current = (reason) => finish(undefined, reason.message);
      instance.onmessage = ({ data: result }: MessageEvent<FontResult>) =>
        finish(result, result.error);
      instance.onerror = () =>
        finish(
          undefined,
          'No se pudo iniciar el motor de fuentes. Recarga la página e inténtalo de nuevo.',
        );
      instance.postMessage(data, [data.buffer]);
    });
  }
  async function open(selected?: File) {
    if (!selected) return;
    clear();
    const token = generation.current;
    setBusy(true);
    setStatus('Leyendo la fuente en este dispositivo…');
    try {
      if (!/\.(ttf|otf|woff|woff2)$/i.test(selected.name))
        throw new Error('Selecciona un archivo TTF, OTF, WOFF o WOFF2.');
      if (!selected.size || selected.size > FONT_LIMIT)
        throw new Error('La fuente debe pesar entre 1 byte y 10 MB.');
      const buffer = await selected.arrayBuffer();
      if (token !== generation.current) return;
      const format = detectFont(buffer);
      const result = await run({ buffer: buffer.slice(0), format });
      if (token !== generation.current) return;
      const fontFamily = `LocalFont${token}`;
      const loaded = await new FontFace(fontFamily, buffer).load();
      if (token !== generation.current) return;
      document.fonts.add(loaded);
      face.current = loaded;
      setFamily(fontFamily);
      setInfo(result.info!);
      setFile(selected);
      setStatus('Fuente lista. No se ha enviado ningún archivo.');
    } catch (e) {
      if (token === generation.current) {
        setError(
          e instanceof Error ? e.message : 'No se pudo abrir la fuente.',
        );
        setStatus('No se pudo abrir la fuente.');
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  async function convert() {
    if (!file || !info) return;
    const token = generation.current;
    setBusy(true);
    setError('');
    setStatus('Preparando la descarga…');
    try {
      if (subset && !text.trim())
        throw new Error(
          'Escribe los caracteres del subconjunto en el texto de prueba.',
        );
      if (
        subset &&
        Array.from(text).some(
          (c) =>
            !info.characters.includes(c.codePointAt(0)!) &&
            !'\n\r\t'.includes(c),
        )
      )
        throw new Error(
          'El texto contiene caracteres ausentes. Quítalos antes de crear el subconjunto.',
        );
      const buffer = await file.arrayBuffer();
      if (token !== generation.current) return;
      const result = await run({
        buffer,
        format: detectFont(buffer),
        output,
        subset: subset ? text.replace(/[\n\r\t]/g, '') : undefined,
      });
      if (token !== generation.current) return;
      downloadBlob(
        new Blob([result.buffer!], { type: `font/${output}` }),
        replaceExtension(file.name, output, subset ? '-subconjunto' : '-web'),
      );
      setStatus('Fuente generada y descargada.');
    } catch (e) {
      if (token === generation.current) {
        setError(e instanceof Error ? e.message : 'No se pudo convertir.');
        setStatus('No se generó la descarga.');
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function sample() {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1600, 1000);
    ctx.fillStyle = '#18252b';
    ctx.font = '24px sans-serif';
    ctx.fillText(`${info?.name} · CeroNube`, 60, 60);
    let y = 130;
    for (const scale of [24, 40, 64]) {
      ctx.font = `${scale}px ${family}`;
      let line = '';
      for (const char of Array.from(text).slice(0, 600)) {
        if (ctx.measureText(line + char).width > 1480 || char === '\n') {
          ctx.fillText(line, 60, y);
          y += scale * 1.4;
          line = '';
        }
        if (y > 920) break;
        if (char !== '\n') line += char;
      }
      if (y <= 920) ctx.fillText(line, 60, y);
      y += scale * 1.4 + 30;
    }
    canvas.toBlob((blob) => {
      if (blob)
        downloadBlob(blob, replaceExtension(file!.name, 'png', '-muestra'));
    });
  }
  const cssFamily = (info?.family || 'Mi fuente').replace(
    /[^\p{L}\p{N} _-]/gu,
    '',
  );
  const css = `@font-face {\n  font-family: "${cssFamily}";\n  src: url("./${file ? encodeURIComponent(replaceExtension(file.name, output, subset ? '-subconjunto' : '-web')) : 'fuente.woff2'}") format("${output === 'ttf' ? 'truetype' : output}");\n  font-weight: ${info?.weight || 400};\n  font-style: ${/italic|oblique/i.test(info?.style || '') ? 'italic' : 'normal'};\n  font-display: swap;\n}`;
  const missing = info
    ? [...new Set(Array.from(text))].filter(
        (c) =>
          !'\n\r\t'.includes(c) && !info.characters.includes(c.codePointAt(0)!),
      )
    : [];

  return (
    <div className="space-y-6">
      <section className={panel}>
        <label htmlFor="font-file" className="block text-lg font-semibold">
          Abre tu tipografía
        </label>
        <p className="text-sm text-muted-foreground">
          TTF, OTF, WOFF y WOFF2 · Máximo 10 MB (40 MB descomprimida). Una
          fuente a la vez, también en móvil. Navegador moderno con FontFace, Web
          Workers y WebAssembly.
        </p>
        <Input
          ref={input}
          id="font-file"
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          disabled={busy}
          onChange={(e) => void open(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={clear}>
            Limpiar
          </Button>
          {busy && <Button onClick={cancel}>Cancelar</Button>}
        </div>
        <output className="block" aria-live="polite">
          {status}
        </output>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Procesamiento íntegramente local. El motor se carga solo al abrir una
          fuente; tus archivos no salen del navegador.
        </p>
      </section>
      {info && (
        <>
          <section className={panel}>
            <h2 className="text-2xl font-semibold break-words">{info.name}</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['Familia', info.family],
                ['Estilo', info.style],
                ['Peso', info.weight],
                ['Glifos', info.glyphs],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <label htmlFor="font-text" className="block font-medium">
              Texto de prueba y caracteres del subconjunto
            </label>
            <Textarea
              id="font-text"
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
            />
            <label htmlFor="font-size" className="block">
              Tamaño: {size} px
            </label>
            <input
              className="w-full accent-primary"
              id="font-size"
              type="range"
              min="12"
              max="120"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <div
              className="rounded-xl border p-5 overflow-auto max-h-96 whitespace-pre-wrap break-words"
              style={{ fontFamily: family, fontSize: size, lineHeight: 1.5 }}
            >
              {text || 'Escribe tu texto arriba.'}
            </div>
            {missing.length > 0 && (
              <p className="text-sm">
                Caracteres ausentes (la vista puede usar otra fuente):{' '}
                {missing.join(' ')}
              </p>
            )}
            <Button onClick={sample} disabled={busy || !text.trim()}>
              Descargar muestra PNG
            </Button>
            <p className="text-sm text-muted-foreground">
              La muestra incluye tamaños 24, 40 y 64 px, hasta 600 caracteres y
              el espacio disponible en una lámina de 1600 × 1000.
            </p>
          </section>
          <section className={panel}>
            <h2 className="text-xl font-semibold">Cobertura de caracteres</h2>
            {Object.entries(alphabets).map(([name, chars]) => {
              const absent = Array.from(chars).filter(
                (c) => !info.characters.includes(c.codePointAt(0)!),
              );
              return (
                <p key={name}>
                  <strong>{name}:</strong> {chars.length - absent.length}/
                  {chars.length}
                  {absent.length > 0
                    ? ` · Faltan: ${absent.join(' ')}`
                    : ' · Completo'}
                </p>
              );
            })}
            <p className="text-sm text-muted-foreground">
              Se comprueban los caracteres indicados; no certifica todas las
              variantes de un idioma.
            </p>
          </section>
          <section className={panel}>
            <h2 className="text-xl font-semibold">
              Caracteres disponibles · {info.characters.length}
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-12">
              {info.characters.slice(page * 96, (page + 1) * 96).map((code) => (
                <div key={code} className="rounded-lg border p-2 text-center">
                  <span
                    className="block text-3xl"
                    style={{ fontFamily: family }}
                  >
                    {String.fromCodePoint(code)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    U+{code.toString(16).toUpperCase().padStart(4, '0')}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                {page + 1} /{' '}
                {Math.max(1, Math.ceil(info.characters.length / 96))}
              </span>
              <Button
                variant="outline"
                disabled={(page + 1) * 96 >= info.characters.length}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </section>
          <section className={panel}>
            <h2 className="text-xl font-semibold">Preparar para la web</h2>
            <p className="text-sm text-muted-foreground">
              Exportación de contornos estáticos. Puede perder ejes variables,
              color, ligaduras, kerning e instrucciones de ajuste. OTF se
              convierte a contornos TrueType. Comprueba el resultado antes de
              usarlo; conserva el original y respeta la licencia de la fuente.
            </p>
            <label htmlFor="font-output" className="block">
              Formato de descarga
            </label>
            <select
              className="rounded-md border bg-background p-2"
              id="font-output"
              value={output}
              onChange={(e) => setOutput(e.target.value as typeof output)}
              disabled={busy}
            >
              <option value="woff2">WOFF2</option>
              <option value="woff">WOFF</option>
              <option value="ttf">TTF</option>
            </select>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={subset}
                disabled={busy}
                onChange={(e) => setSubset(e.target.checked)}
              />
              Incluir solo los caracteres del texto de prueba
            </label>
            <Button onClick={() => void convert()} disabled={busy}>
              Descargar {subset ? 'subconjunto' : 'fuente'}{' '}
              {output.toUpperCase()}
            </Button>
            <label htmlFor="font-css" className="block font-medium">
              Declaración @font-face
            </label>
            <Textarea
              id="font-css"
              className="min-h-56 font-mono text-sm"
              readOnly
              value={css}
            />
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(css);
                  setStatus('CSS copiado.');
                } catch {
                  setError(
                    'No se pudo copiar. Selecciona y copia el CSS manualmente.',
                  );
                }
              }}
            >
              Copiar CSS
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
