'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Clipboard, Download, FileUp, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { DEFAULT_TEXT_OPTIONS, TEXT_LIMITS, assertTextSize, textBytes, textPreview, type TextEncoding, type TextOptions, type TextResult, type TextStats } from '@/lib/text-tools';

type Session = { source: string; stats: TextStats | null; result: TextResult | null; filename: string; encoding: string; imported: boolean };
const emptySession = (): Session => ({ source: '', stats: null, result: null, filename: 'texto', encoding: 'Texto pegado · LF', imported: false });
const panel = 'min-w-0 rounded-3xl border border-border bg-card p-5 sm:p-6';

function Stats({ stats }: { stats: TextStats | null }) {
  if (!stats) return <p className="text-sm text-muted-foreground">Previsualiza para contar caracteres, palabras y líneas.</p>;
  return <div className="text-sm text-muted-foreground"><p>{stats.characters.toLocaleString('es')} caracteres · {stats.words.toLocaleString('es')} palabras · {stats.lines.toLocaleString('es')} líneas · {stats.bytes.toLocaleString('es')} bytes UTF-8</p><p className="mt-1">Saltos: {stats.crlf} CRLF · {stats.lf} LF · {stats.cr} CR</p></div>;
}

function Preview({ text, label }: { text: string; label: string }) {
  const preview = textPreview(text);
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Scrollable text previews need keyboard focus for arrow/PageDown navigation.
  return <><pre aria-label={label} tabIndex={0} className="mt-3 h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-input bg-background p-3 font-mono text-sm [overflow-wrap:anywhere] focus-visible:outline-ring">{preview.text || <span className="text-muted-foreground">Texto vacío</span>}</pre>{preview.truncated && <p className="mt-2 text-sm text-muted-foreground">Vista parcial: primeros 20.000 caracteres UTF-16. Se procesa, copia y descarga el texto completo.</p>}</>;
}

export function TextWorkshop() {
  const [session, setSession] = useState<Session>(emptySession);
  const [history, setHistory] = useState<Session[]>([]);
  const [options, setOptions] = useState<TextOptions>({ ...DEFAULT_TEXT_OPTIONS });
  const [encoding, setEncoding] = useState<TextEncoding>('auto');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Pega texto o abre un TXT para empezar.');
  const [error, setError] = useState('');
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const worker = useRef<Worker | null>(null);
  const sourceEditor = useRef<HTMLTextAreaElement | null>(null);
  const downloadUrls = useRef(new Set<string>());
  const clipboardGeneration = useRef(0);

  const stop = useCallback(() => { worker.current?.terminate(); worker.current = null; setBusy(false); }, []);
  function remember() { setHistory((previous) => [...previous, session].slice(-TEXT_LIMITS.history)); }
  const clear = useCallback(() => {
    stop(); clipboardGeneration.current++;
    for (const url of downloadUrls.current) URL.revokeObjectURL(url);
    downloadUrls.current.clear();
    // Native history restoration may update a form value outside React state.
    if (sourceEditor.current) sourceEditor.current.value = '';
    setSessionEpoch((previous) => previous + 1);
    setSession(emptySession()); setHistory([]); setOptions({ ...DEFAULT_TEXT_OPTIONS }); setEncoding('auto'); setError('');
    setStatus('Sesión limpia. Se eliminaron la entrada, el resultado y las versiones anteriores. El portapapeles lo administra tu sistema.');
  }, [stop]);
  useEffect(() => {
    let restoreTimer: number | undefined;
    const leave = () => flushSync(clear);
    const restore = () => {
      clear();
      // Browsers may restore persisted form values after the pageshow event.
      restoreTimer = window.setTimeout(clear, 0);
    };
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', restore);
      window.clearTimeout(restoreTimer);
      clear();
    };
  }, [clear]);
  function setSource(text: string) {
    setError('');
    try { assertTextSize(textBytes(text).byteLength); } catch (problem) { setError((problem as Error).message); return; }
    setSession({ ...emptySession(), source: text }); setHistory([]);
    setStatus('Entrada actualizada. Previsualiza para aplicar las opciones y contar.');
  }

  function run(file?: File) {
    setError('');
    if (file) {
      if (!/\.txt$/i.test(file.name)) { setError('Selecciona un archivo con extensión .txt.'); return; }
      try { assertTextSize(file.size); } catch (problem) { setError((problem as Error).message); return; }
    }
    let instance: Worker;
    try { instance = new Worker(new URL('../lib/text.worker.ts', import.meta.url), { type: 'module' }); }
    catch { setError('Este navegador no puede iniciar el procesamiento local. Prueba con un navegador actualizado que permita Web Workers.'); return; }
    stop(); worker.current = instance; setBusy(true); setStatus(file ? 'Abriendo TXT…' : 'Preparando la vista previa…');
    instance.onerror = () => {
      if (worker.current !== instance) return;
      stop(); setError('No se pudo cargar el procesador local. Recarga la página y vuelve a intentarlo.'); setStatus('Procesamiento detenido.');
    };
    instance.onmessage = (event: MessageEvent<{ progress?: string; error?: string; opened?: { text: string; encoding: string; stats: TextStats }; result?: TextResult }>) => {
      if (worker.current !== instance) return;
      const response = event.data;
      if (response.progress) { setStatus(response.progress); return; }
      stop();
      if (response.error) { setError(response.error); setStatus('El contenido anterior se conserva. Corrige la entrada o la codificación.'); return; }
      if (response.opened && file) {
        setHistory([]);
        setSession({ source: response.opened.text, stats: response.opened.stats, result: null, filename: file.name.replace(/\.txt$/i, ''), encoding: response.opened.encoding, imported: true });
        setStatus('TXT abierto sin sustitución de caracteres. Elige las transformaciones y previsualiza.');
      } else if (response.result) {
        remember(); setSession({ ...session, stats: response.result.originalStats, result: response.result });
        setStatus('Vista previa lista. La entrada se conserva hasta que uses el resultado como entrada.');
      }
    };
    instance.postMessage(file ? { action: 'open', file, encoding } : { action: 'transform', text: session.source, options });
  }

  async function copy() {
    if (!session.result) return;
    const generation = clipboardGeneration.current;
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(session.result.text);
      if (generation === clipboardGeneration.current) setStatus('Resultado completo copiado. Los saltos originales se entregan al portapapeles; el sistema puede adaptarlos al pegar.');
    } catch {
      if (generation === clipboardGeneration.current) setError('El navegador no permite copiar. Descarga el TXT o selecciona el resultado visible.');
    }
  }

  function download() {
    if (!session.result) return;
    const bytes = textBytes(session.result.text);
    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    downloadUrls.current.add(url);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${session.filename}-resultado.txt`; anchor.click();
    window.setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.current.delete(url); }, 1000);
    setStatus('TXT descargado en UTF-8 sin BOM, con el texto completo y sus saltos de línea.');
  }

  const updateOption = <K extends keyof TextOptions>(key: K, value: TextOptions[K]) => setOptions((previous) => ({ ...previous, [key]: value }));
  return <div key={sessionEpoch} className="space-y-5">
    <section className={panel} aria-labelledby="text-input-heading">
      <h2 id="text-input-heading" className="text-xl font-semibold">1. Pega texto o abre un TXT</h2>
      <p className="mt-2 text-sm text-muted-foreground">Hasta 1 MiB (1.048.576 bytes UTF-8) y 50.000 líneas. El TXT también debe ocupar como máximo 1 MiB. La vista se acota a 20.000 caracteres; las operaciones trabajan con todo el contenido.</p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="min-w-0 w-full sm:w-auto sm:max-w-sm"><label htmlFor="text-encoding" className="mb-2 block text-sm font-medium">Codificación del TXT</label><NativeSelect className="w-full min-w-0" id="text-encoding" value={encoding} disabled={busy} onChange={(event) => setEncoding(event.target.value as TextEncoding)}><NativeSelectOption value="auto">Automática: BOM o UTF-8 estricto</NativeSelectOption><NativeSelectOption value="utf-8">UTF-8</NativeSelectOption><NativeSelectOption value="utf-16le">UTF-16 LE</NativeSelectOption><NativeSelectOption value="utf-16be">UTF-16 BE</NativeSelectOption><NativeSelectOption value="windows-1252">Windows-1252 (elección manual)</NativeSelectOption></NativeSelect></div>
        <div className="min-w-0 w-full sm:w-auto"><label htmlFor="text-file" className="mb-2 flex items-center gap-2 text-sm font-medium"><FileUp aria-hidden="true" className="size-4" />Abrir TXT</label><input id="text-file" type="file" accept=".txt,text/plain" disabled={busy} className="max-w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) run(file); }} /></div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">No se adivina Windows-1252. Si la lectura estricta falla, elige la codificación conocida y vuelve a abrir el TXT. Las descargas usan UTF-8 sin BOM.</p>
    </section>

    <section className={panel} aria-labelledby="text-options-heading">
      <h2 id="text-options-heading" className="text-xl font-semibold">2. Elige las transformaciones</h2>
      <p className="mt-2 text-sm text-muted-foreground">Se aplican en este orden: espacios, mayúsculas, líneas vacías, duplicados y orden. Al empezar, todas están desactivadas.</p>
      <fieldset disabled={busy} className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" checked={options.collapseSpaces} onChange={(event) => updateOption('collapseSpaces', event.target.checked)} className="size-4 accent-primary" />Reducir espacios y tabulaciones repetidos</label>
        <label className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" checked={options.removeEmpty} onChange={(event) => updateOption('removeEmpty', event.target.checked)} className="size-4 accent-primary" />Quitar líneas vacías (también solo espacios)</label>
        <div><label htmlFor="text-case" className="mb-2 block text-sm font-medium">Mayúsculas y minúsculas</label><NativeSelect className="w-full min-w-0" id="text-case" value={options.caseMode} onChange={(event) => updateOption('caseMode', event.target.value as TextOptions['caseMode'])}><NativeSelectOption value="keep">Conservar</NativeSelectOption><NativeSelectOption value="upper">MAYÚSCULAS</NativeSelectOption><NativeSelectOption value="lower">minúsculas</NativeSelectOption></NativeSelect></div>
        <div><label htmlFor="text-duplicates" className="mb-2 block text-sm font-medium">Líneas duplicadas</label><NativeSelect className="w-full min-w-0" id="text-duplicates" value={options.duplicates} onChange={(event) => updateOption('duplicates', event.target.value as TextOptions['duplicates'])}><NativeSelectOption value="keep">Conservar</NativeSelectOption><NativeSelectOption value="exact">Quitar coincidencias exactas</NativeSelectOption><NativeSelectOption value="trim-case">Ignorar espacios externos y mayúsculas</NativeSelectOption></NativeSelect></div>
        <div><label htmlFor="text-sort" className="mb-2 block text-sm font-medium">Orden de líneas</label><NativeSelect className="w-full min-w-0" id="text-sort" value={options.sort} onChange={(event) => updateOption('sort', event.target.value as TextOptions['sort'])}><NativeSelectOption value="keep">Conservar</NativeSelectOption><NativeSelectOption value="alphabetic">Alfabético en español</NativeSelectOption><NativeSelectOption value="natural">Español con números naturales</NativeSelectOption></NativeSelect></div>
        <label className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" checked={options.descending} disabled={options.sort === 'keep'} onChange={(event) => updateOption('descending', event.target.checked)} className="size-4 accent-primary" />Orden descendente (Z a A)</label>
      </fieldset>
      <details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer rounded-md py-2 font-medium text-foreground focus-visible:outline-ring">Reglas de espacios, acentos, saltos y conteo</summary><div className="mt-2 space-y-2"><p>Espacios: cada grupo de dos o más espacios ASCII o tabulaciones se convierte en un espacio. No se recortan extremos ni se cambian tabulaciones aisladas. Líneas vacías: incluye líneas compuestas solo por espacios Unicode.</p><p>Duplicados: conserva la primera línea. La comparación exacta distingue tildes, mayúsculas y espacios. La otra opción ignora solo espacios externos y mayúsculas; no quita tildes, ni normaliza Unicode, ni modifica la línea conservada.</p><p>Orden: reglas del navegador para español, con ñ después de n; distingue acentos y mayúsculas. El orden natural coloca «elemento 2» antes de «elemento 10». Las equivalencias mantienen su orden previo.</p><p>Saltos: conserva LF, CRLF y CR; al ordenar conserva el patrón de separadores por posición. Al quitar líneas conserva los separadores de las restantes y la presencia de un salto final si queda texto. La vista muestra los saltos como líneas; el TXT conserva sus bytes UTF-8.</p><p>Conteo: caracteres Unicode (un emoji puede combinar varios), incluidos espacios y saltos. CRLF cuenta como dos caracteres. Palabras: grupos de letras o números, con marcas de acento y apóstrofes internos. Las líneas incluyen la última vacía tras un salto final; un texto vacío tiene cero líneas.</p></div></details>
      <div className="mt-5 flex flex-wrap gap-2"><Button size="lg" disabled={busy} onClick={() => run()}><Sparkles aria-hidden="true" />Previsualizar y contar</Button>{busy && <Button size="lg" variant="outline" onClick={() => { stop(); setStatus('Procesamiento cancelado. El contenido anterior se conserva.'); }}>Cancelar</Button>}<Button size="lg" variant="outline" disabled={busy || !history.length} onClick={() => { const previous = history[history.length - 1]; setSession(previous); setHistory(history.slice(0, -1)); setError(''); setStatus('Versión previa restaurada.'); }}><RotateCcw aria-hidden="true" />Deshacer</Button><Button size="lg" variant="ghost" onClick={clear}><Trash2 aria-hidden="true" />Limpiar sesión</Button></div>
      <output aria-live="polite" className="mt-4 block text-sm text-muted-foreground">{status}</output>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </section>

    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <section className={panel} aria-labelledby="text-original-heading"><h2 id="text-original-heading" className="text-xl font-semibold">Original</h2><p className="mt-2 break-all text-sm text-muted-foreground">{session.imported ? `${session.filename}.txt · ` : ''}{session.encoding}</p>
        {session.imported || session.source.length > TEXT_LIMITS.preview ? <><Preview text={session.source} label="Texto original" /><Button size="lg" variant="outline" disabled={busy} className="mt-3" onClick={() => { remember(); setSession({ ...emptySession(), filename: session.filename }); setStatus('Pega el texto que quieras usar como nueva entrada. Deshacer restaura el TXT anterior.'); }}>Reemplazar con texto pegado</Button></> : <><label htmlFor="text-source" className="sr-only">Texto original</label><Textarea ref={sourceEditor} id="text-source" value={session.source} disabled={busy} placeholder="Pega aquí tu texto o lista…" className="mt-3 h-80 min-h-80 font-mono [field-sizing:fixed]" onChange={(event) => setSource(event.target.value)} onPaste={(event) => { const text = event.clipboardData.getData('text'); if (text.length > TEXT_LIMITS.preview) { event.preventDefault(); const element = event.currentTarget; setSource(session.source.slice(0, element.selectionStart) + text + session.source.slice(element.selectionEnd)); } }} /></>}
        <div className="mt-3"><Stats stats={session.stats} /></div>
      </section>
      <section className={panel} aria-labelledby="text-result-heading"><h2 id="text-result-heading" className="text-xl font-semibold">Resultado</h2><p className="mt-2 text-sm text-muted-foreground">{session.result ? 'Vista previa del texto completo procesado.' : 'Previsualiza para ver el resultado antes de sustituir la entrada.'}</p><Preview text={session.result?.text ?? ''} label="Texto resultado" /><div className="mt-3"><Stats stats={session.result?.stats ?? null} /></div>
        {session.result && <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{session.result.changes.map((change, index) => <li key={index}>{change}</li>)}</ul>}
        <div className="mt-4 flex flex-wrap gap-2"><Button size="lg" variant="secondary" disabled={busy || !session.result} onClick={copy}><Clipboard aria-hidden="true" />Copiar resultado</Button><Button size="lg" disabled={busy || !session.result} onClick={download}><Download aria-hidden="true" />Descargar TXT</Button><Button size="lg" variant="outline" disabled={busy || !session.result} onClick={() => { remember(); const result = session.result!; setSession({ ...session, source: result.text, stats: result.stats, imported: true, result: null, encoding: 'Texto procesado · saltos conservados' }); setStatus('Resultado usado como entrada. Deshacer restaura la versión previa.'); }}>Usar resultado como entrada</Button></div>
      </section>
    </div>
    <p className="px-1 text-sm text-muted-foreground">Entrada, resultado y hasta cinco versiones para deshacer permanecen en memoria durante esta visita. No se guardan en enlaces ni almacenamiento persistente. Limpiar la sesión o salir libera ese estado; no borra automáticamente el portapapeles del sistema.</p>
  </div>;
}
