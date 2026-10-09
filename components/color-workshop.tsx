'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Clipboard, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COLOR_LIMITS, composite, contrast, exportPalette, formatColor, paletteEntry, parseColor, type Color, type PaletteEntry } from '@/lib/color-tools';

const panel = 'min-w-0 rounded-3xl border border-border bg-card p-5 sm:p-6';
function parsed(raw: string): { color: Color | null; error: string } {
  try { return { color: parseColor(raw), error: '' }; }
  catch (error) { return { color: null, error: raw ? (error as Error).message : '' }; }
}

function ColorEditor({ id, label, raw, setRaw, opaque = false }: { id: string; label: string; raw: string; setRaw: (value: string) => void; opaque?: boolean }) {
  const { color, error } = parsed(raw);
  const problem = error || (opaque && color && color.a !== 1 ? 'El fondo base debe ser opaco (opacidad 100 %).' : '');
  const hex = color ? formatColor({ ...color, a: 1 }).hex : '#08666A';
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <div className="flex min-w-0 gap-2">
      <Input id={id} value={raw} onChange={(event) => setRaw(event.target.value)} maxLength={COLOR_LIMITS.input} placeholder="#08666A" autoComplete="off" spellCheck={false} aria-invalid={Boolean(problem)} aria-describedby={`${id}-help${problem ? ` ${id}-error` : ''}`} className="min-w-0 font-mono" />
      <input type="color" aria-label={`Seleccionar ${label.toLowerCase()}`} value={hex} onChange={(event) => setRaw(formatColor({ ...parseColor(event.target.value), a: opaque ? 1 : color?.a ?? 1 }).rgb)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-1 focus-visible:outline-ring" />
    </div>
    <p id={`${id}-help`} className="text-xs text-muted-foreground">{color ? `Opacidad: ${Number((color.a * 100).toFixed(4))} %.` : 'Escribe un color o usa el selector.'}</p>
    {!opaque && <div><label htmlFor={`${id}-alpha`} className="block text-sm">Opacidad de {label.toLowerCase()} {color ? `(${Number((color.a * 100).toFixed(4))} %)` : ''}</label><input id={`${id}-alpha`} type="range" min="0" max="100" step="1" value={color ? color.a * 100 : 100} disabled={!color} onChange={(event) => { if (color) setRaw(formatColor({ ...color, a: Number(event.target.value) / 100 }).rgb); }} className="mt-1 h-8 w-full accent-primary focus-visible:outline-ring" /></div>}
    {problem && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{problem}</p>}
  </div>;
}

function Swatch({ color, base, label }: { color: Color; base: Color; label: string }) {
  return <figure aria-label={label} className="h-20 overflow-hidden rounded-xl border border-border" style={{ backgroundColor: formatColor(base).rgb }}><div aria-hidden="true" className="h-full" style={{ backgroundColor: formatColor(color).rgb }} /><figcaption className="sr-only">{label}</figcaption></figure>;
}

export function ColorWorkshop() {
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [foreground, setForeground] = useState('#000000');
  const [background, setBackground] = useState('#FFFFFF');
  const [canvas, setCanvas] = useState('#FFFFFF');
  const [status, setStatus] = useState('Introduce un color para convertirlo y crear tu paleta.');
  const [error, setError] = useState('');
  const [epoch, setEpoch] = useState(0);
  const urls = useRef(new Set<string>());
  const generation = useRef(0);

  const clear = useCallback(() => {
    generation.current++;
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    setSource(''); setName(''); setPalette([]); setForeground('#000000'); setBackground('#FFFFFF'); setCanvas('#FFFFFF'); setError('');
    setEpoch((previous) => previous + 1);
    setStatus('Sesión limpia. Se eliminaron tus colores, nombres y paleta. El portapapeles lo administra tu sistema.');
  }, []);
  useEffect(() => {
    let timer: number | undefined;
    const leave = () => flushSync(clear);
    const restore = () => { clear(); timer = window.setTimeout(clear, 0); };
    window.addEventListener('pagehide', leave); window.addEventListener('pageshow', restore);
    return () => { window.removeEventListener('pagehide', leave); window.removeEventListener('pageshow', restore); window.clearTimeout(timer); clear(); };
  }, [clear]);

  const current = parsed(source), front = parsed(foreground), back = parsed(background), base = parsed(canvas);
  const validBase = base.color?.a === 1 ? base.color : null;
  const values = current.color ? formatColor(current.color) : null;
  const review = front.color && back.color && validBase ? contrast(front.color, back.color, validBase) : null;

  async function copy(value: string) {
    const attempt = generation.current;
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (attempt === generation.current) setStatus('Valor copiado al portapapeles.');
    } catch {
      if (attempt === generation.current) setError('El navegador no permite copiar. Selecciona el valor visible o descarga la paleta.');
    }
  }
  function add() {
    setError('');
    if (!current.color) return;
    if (palette.length >= COLOR_LIMITS.palette) { setError('La paleta admite 32 colores. Quita uno antes de añadir otro.'); return; }
    try { const entry = paletteEntry(name, current.color); setPalette((previous) => [...previous, entry]); setName(''); setStatus('Color añadido a la paleta con su nombre y opacidad.'); }
    catch (problem) { setError((problem as Error).message); }
  }
  function download(format: 'txt' | 'json') {
    setError('');
    try {
      const content = exportPalette(palette, format);
      const url = URL.createObjectURL(new Blob([content], { type: `${format === 'json' ? 'application/json' : 'text/plain'};charset=utf-8` }));
      urls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `paleta-ceronube.${format}`; anchor.click();
      window.setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
      setStatus(`Paleta descargada como ${format.toUpperCase()}, con nombres, valores y opacidad.`);
    } catch (problem) { setError((problem as Error).message); }
  }

  return <div key={epoch} className="space-y-5">
    <section className={panel} aria-labelledby="color-formats">
      <h2 id="color-formats" className="text-xl font-semibold">Formatos y reglas</h2>
      <p className="mt-2 text-sm text-muted-foreground">Espacio sRGB: HEX con # y 3, 4, 6 u 8 dígitos; rgb(0, 128, 255), rgba(0, 128, 255, 0.5), hsl(210, 100%, 50%) y hsla(210, 100%, 50%, 0.5). Usa comas entre componentes y punto decimal. Canales RGB de 0 a 255, saturación y luminosidad de 0 a 100 %, opacidad de 0 a 1; el tono en grados se normaliza a una vuelta.</p>
      <p className="mt-2 text-sm text-muted-foreground">Hasta 128 caracteres por entrada y 32 colores por paleta; nombres de hasta 64 caracteres. No se admiten nombres CSS, porcentajes RGB ni otros espacios como CMYK, Lab o Display P3. HEX se redondea a 8 bits por canal; RGB/HSL a 6 decimales al mostrar o copiar. El cálculo usa los valores internos sin redondear.</p>
    </section>

    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <section className={panel} aria-labelledby="color-convert">
        <h2 id="color-convert" className="text-xl font-semibold">1. Convierte un color</h2>
        <div className="mt-4"><ColorEditor id="color-source" label="Color para convertir" raw={source} setRaw={setSource} /></div>
        {current.color && values && <div className="mt-4 space-y-3">
          {validBase ? <><Swatch color={current.color} base={validBase} label={`Muestra del color ${values.hex} sobre fondo base ${formatColor(validBase).hex}`} /><p className="text-sm text-muted-foreground">Muestra sobre el fondo base de la sección de contraste. Color efectivo: <span className="font-mono">{formatColor(composite(current.color, validBase)).rgb}</span>.</p></> : <p className="text-sm text-muted-foreground">Corrige el fondo base para ver la muestra compuesta.</p>}
          <dl className="space-y-3">{(['hex', 'rgb', 'hsl'] as const).map((format) => <div key={format} className="rounded-xl border border-border bg-background p-3"><dt className="text-sm font-medium">{format.toUpperCase()}</dt><dd className="mt-1 break-all font-mono text-sm" data-testid={`color-${format}`}>{values[format]}</dd><Button className="mt-2" variant="outline" onClick={() => copy(values[format])}><Clipboard aria-hidden="true" />Copiar {format.toUpperCase()}</Button></div>)}</dl>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setForeground(values.rgb)}>Usar como texto</Button><Button variant="secondary" onClick={() => setBackground(values.rgb)}>Usar como fondo</Button></div>
        </div>}
        {!current.color && !current.error && <p className="mt-4 text-sm text-muted-foreground">Los valores equivalentes aparecerán aquí.</p>}
      </section>

      <section className={panel} aria-labelledby="color-palette">
        <h2 id="color-palette" className="text-xl font-semibold">2. Crea una paleta manual</h2>
        <p className="mt-2 text-sm text-muted-foreground">Añade el color convertido con un nombre. Los colores se conservan en memoria durante esta visita.</p>
        <div className="mt-4"><label htmlFor="color-name" className="mb-2 block text-sm font-medium">Nombre del color</label><Input id="color-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={COLOR_LIMITS.name} autoComplete="off" placeholder="Por ejemplo: Fondo del cartel" /></div>
        <Button className="mt-3" disabled={!current.color || !name.trim() || palette.length >= COLOR_LIMITS.palette} onClick={add}><Plus aria-hidden="true" />Añadir a la paleta</Button>
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">{palette.length} de 32 colores.</p>
        {!palette.length && <p className="mt-3 text-sm text-muted-foreground">Tu paleta está vacía.</p>}
        <ul className="mt-4 space-y-3">{palette.map((entry, index) => { const formats = formatColor(entry.color); return <li key={index} className="min-w-0 rounded-xl border border-border bg-background p-3">
          <p className="break-all font-medium">{entry.name}</p>
          {validBase && <div className="mt-2"><Swatch color={entry.color} base={validBase} label={`Muestra de ${entry.name}, ${formats.hex}, sobre ${formatColor(validBase).hex}`} /></div>}
          <p className="mt-2 break-all font-mono text-sm">{formats.hex}</p><p className="text-sm text-muted-foreground">Opacidad: {Number((entry.color.a * 100).toFixed(4))} %</p>
          <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" aria-label={`Copiar HEX de ${entry.name}`} onClick={() => copy(formats.hex)}><Clipboard aria-hidden="true" />Copiar HEX</Button><Button variant="ghost" aria-label={`Quitar ${entry.name} de la paleta`} onClick={() => { setPalette((previous) => previous.filter((_, position) => position !== index)); setStatus('Color retirado de la paleta.'); }}><Trash2 aria-hidden="true" />Quitar</Button></div>
        </li>; })}</ul>
        <div className="mt-5 flex flex-wrap gap-2"><Button disabled={!palette.length} onClick={() => download('txt')}><Download aria-hidden="true" />Descargar TXT</Button><Button variant="secondary" disabled={!palette.length} onClick={() => download('json')}><Download aria-hidden="true" />Descargar JSON</Button></div>
      </section>
    </div>

    <section className={panel} aria-labelledby="color-contrast">
      <h2 id="color-contrast" className="text-xl font-semibold">3. Revisa el contraste de texto y fondo</h2>
      <p className="mt-2 text-sm text-muted-foreground">El fondo base opaco queda detrás del fondo elegido. Si hay transparencia, se compone primero el fondo y después el texto, antes de calcular el contraste.</p>
      <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3"><ColorEditor id="color-foreground" label="Color del texto" raw={foreground} setRaw={setForeground} /><ColorEditor id="color-background" label="Color del fondo" raw={background} setRaw={setBackground} /><ColorEditor id="color-canvas" label="Fondo base opaco" raw={canvas} setRaw={setCanvas} opaque /></div>
      {review ? <div className="mt-5 space-y-4">
        <figure aria-label="Muestra de texto sobre el fondo efectivo" className="rounded-xl border border-border p-5" style={{ backgroundColor: formatColor(review.effectiveBackground).rgb, color: formatColor(review.effectiveForeground).rgb }}><p className="text-base">Texto de ejemplo sobre tu fondo.</p><p className="mt-2 text-2xl">Ejemplo de texto grande</p></figure>
        <p className="text-sm text-muted-foreground">Fondo efectivo: <span className="break-all font-mono" data-testid="effective-background">{formatColor(review.effectiveBackground).rgb}</span><br />Texto efectivo: <span className="break-all font-mono" data-testid="effective-foreground">{formatColor(review.effectiveForeground).rgb}</span></p>
        <div aria-live="polite"><p className="text-2xl font-semibold" data-testid="contrast-ratio">{review.ratio.toFixed(2)}:1</p><p className="mt-1 text-sm text-muted-foreground">Relación mostrada con 2 decimales; los umbrales usan el valor sin redondear.</p><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><li>AA texto normal (4.5:1): <strong>{review.normalAA ? 'Cumple' : 'No cumple'}</strong></li><li>AA texto grande (3:1): <strong>{review.largeAA ? 'Cumple' : 'No cumple'}</strong></li><li>AAA texto normal (7:1): <strong>{review.normalAAA ? 'Cumple' : 'No cumple'}</strong></li><li>AAA texto grande (4.5:1): <strong>{review.largeAAA ? 'Cumple' : 'No cumple'}</strong></li></ul></div>
        <Button variant="outline" onClick={() => copy(`WCAG 2.2 · Contraste ${review.ratio.toFixed(2)}:1 (umbral sin redondear)\nTexto: ${formatColor(front.color!).rgb}\nFondo: ${formatColor(back.color!).rgb}\nBase: ${formatColor(validBase!).rgb}\nTexto efectivo: ${formatColor(review.effectiveForeground).rgb}\nFondo efectivo: ${formatColor(review.effectiveBackground).rgb}\nAA normal: ${review.normalAA ? 'Cumple' : 'No cumple'}\nAA grande: ${review.largeAA ? 'Cumple' : 'No cumple'}\nAAA normal: ${review.normalAAA ? 'Cumple' : 'No cumple'}\nAAA grande: ${review.largeAAA ? 'Cumple' : 'No cumple'}`)}><Clipboard aria-hidden="true" />Copiar revisión de contraste</Button>
      </div> : <output className="mt-4 block text-sm text-muted-foreground">Introduce colores válidos y un fondo base opaco para calcular el contraste.</output>}
      <p className="mt-5 text-sm text-muted-foreground">WCAG 2.2, criterios 1.4.3 y 1.4.6. Texto grande: al menos 18 pt (24 px), o 14 pt (aprox. 18.67 px) en negrita. La muestra ilustra los colores; el tamaño y peso reales deben revisarse en tu diseño. Esta revisión evalúa la combinación elegida y no certifica la accesibilidad de una página completa.</p>
    </section>

    <section className={panel} aria-label="Estado y limpieza"><Button variant="ghost" onClick={clear}><Trash2 aria-hidden="true" />Limpiar sesión</Button><output aria-live="polite" className="mt-3 block text-sm text-muted-foreground">{status}</output>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}<p className="mt-3 text-sm text-muted-foreground">Colores, nombres y resultados permanecen en memoria. Copia y descarga solo por acción explícita. Limpiar o salir elimina el estado de esta visita; el portapapeles depende de tu sistema. No se guardan en enlaces ni almacenamiento persistente.</p></section>
  </div>;
}
