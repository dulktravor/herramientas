'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Drop zones complement accessible file inputs. */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Download,
  FileSearch,
  FileText,
  FileUp,
  Languages,
  LoaderCircle,
  RotateCcw,
  RotateCw,
  Trash2,
} from 'lucide-react';
import type { Worker } from 'tesseract.js';

import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { downloadBlob, formatBytes, makeId } from '@/lib/browser-files';
import {
  collectOcrWords,
  combineOcrText,
  createSearchablePdf,
  type OcrWord,
  type TesseractBlocks,
} from '@/lib/ocr-document';

type OcrLanguage = 'spa' | 'eng' | 'spa+eng';
type OcrEnhancement = 'original' | 'gray' | 'document';
type OcrPage = {
  id: string;
  sourceName: string;
  image: Blob;
  previewUrl: string;
  rotation: number;
  enhancement: OcrEnhancement;
  text: string;
  confidence: number | null;
  words: OcrWord[];
  processedImage?: Blob;
  processedWidth?: number;
  processedHeight?: number;
};

const MAX_PAGES = 30;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PDF_BYTES = 50 * 1024 * 1024;

const statusLabels: Record<string, string> = {
  'loading tesseract core': 'Preparando el motor OCR',
  'initializing tesseract': 'Inicializando el reconocimiento',
  'loading language traineddata': 'Descargando el modelo de idioma',
  'initializing api': 'Preparando el idioma',
  'recognizing text': 'Reconociendo el texto',
};

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('No fue posible preparar una página para OCR.')),
      'image/jpeg',
      quality,
    );
  });
}

async function renderPdfPages(file: File, available: number, onProgress: (message: string) => void) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const count = Math.min(document.numPages, available);
  const pages: Array<{ blob: Blob; name: string }> = [];
  try {
    for (let index = 1; index <= count; index += 1) {
      onProgress(`Preparando página ${index} de ${count} de ${file.name}…`);
      const pdfPage = await document.getPage(index);
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(2.4, 1900 / Math.max(base.width, base.height));
      const viewport = pdfPage.getViewport({ scale });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No fue posible dibujar una página del PDF.');
      await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push({
        blob: await canvasToJpeg(canvas),
        name: `${file.name} · página ${index}`,
      });
      pdfPage.cleanup();
    }
  } finally {
    await (document as typeof document & { destroy?: () => Promise<void> }).destroy?.();
  }
  return { pages, truncated: document.numPages > count };
}

async function preparePage(page: OcrPage) {
  const bitmap = await createImageBitmap(page.image);
  const maxSide = 2200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const sourceWidth = Math.max(1, Math.round(bitmap.width * scale));
  const sourceHeight = Math.max(1, Math.round(bitmap.height * scale));
  const swapSides = page.rotation % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = swapSides ? sourceHeight : sourceWidth;
  canvas.height = swapSides ? sourceWidth : sourceHeight;
  const context = canvas.getContext('2d', { willReadFrequently: page.enhancement !== 'original' });
  if (!context) {
    bitmap.close();
    throw new Error('El navegador no pudo preparar una de las páginas.');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(page.rotation * Math.PI / 180);
  context.drawImage(bitmap, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  bitmap.close();
  context.setTransform(1, 0, 0, 1, 0, 0);

  if (page.enhancement !== 'original') {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const luminance = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
      const value = page.enhancement === 'document'
        ? Math.max(0, Math.min(255, Math.round((luminance - 128) * 1.65 + 150)))
        : Math.round(luminance);
      pixels.data[index] = value;
      pixels.data[index + 1] = value;
      pixels.data[index + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
  }

  return {
    blob: await canvasToJpeg(canvas),
    width: canvas.width,
    height: canvas.height,
  };
}

// eslint-disable-next-line react/react-compiler -- The compiler currently cannot transform this stateful multi-page OCR coordinator.
export function OcrStudio() {
  const [pages, setPages] = useState<OcrPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [language, setLanguage] = useState<OcrLanguage>('spa');
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const recognitionAbort = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const cancelled = useRef(false);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) ?? pages[0] ?? null,
    [pages, selectedId],
  );
  const recognizedCount = pages.filter((page) => page.confidence !== null).length;
  const lowConfidence = selectedPage?.words.filter((word) => word.confidence < 65) ?? [];

  useEffect(() => {
    const currentUrls = urls.current;
    return () => {
      cancelled.current = true;
      recognitionAbort.current?.abort();
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
      void workerRef.current?.terminate();
    };
  }, []);

  function makePage(blob: Blob, sourceName: string): OcrPage {
    const previewUrl = URL.createObjectURL(blob);
    urls.current.add(previewUrl);
    return {
      id: makeId('ocr'),
      sourceName,
      image: blob,
      previewUrl,
      rotation: 0,
      enhancement: 'document',
      text: '',
      confidence: null,
      words: [],
    };
  }

  async function addFiles(fileList: FileList | File[]) {
    if (loadingFiles || processing || exportingPdf) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setError('');
    setLoadingFiles(true);
    const next: OcrPage[] = [];
    let truncated = false;
    try {
      for (const file of files) {
        const remaining = MAX_PAGES - pages.length - next.length;
        if (remaining <= 0) {
          truncated = true;
          break;
        }
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name}: el PDF supera 50 MB.`);
          const rendered = await renderPdfPages(file, remaining, setStatus);
          rendered.pages.forEach((page) => next.push(makePage(page.blob, page.name)));
          truncated ||= rendered.truncated;
        } else if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: la imagen supera 20 MB.`);
          next.push(makePage(file, file.name));
        } else {
          throw new Error(`${file.name}: formato no compatible. Usa PDF, JPG, PNG o WebP.`);
        }
      }
      setPages((current) => [...current, ...next]);
      if (!selectedId && next[0]) setSelectedId(next[0].id);
      setStatus(truncated ? `Se alcanzó el límite de ${MAX_PAGES} páginas.` : `${next.length} ${next.length === 1 ? 'página añadida' : 'páginas añadidas'}.`);
    } catch (cause) {
      next.forEach((page) => {
        URL.revokeObjectURL(page.previewUrl);
        urls.current.delete(page.previewUrl);
      });
      setError(cause instanceof Error ? cause.message : 'No fue posible preparar los archivos.');
      setStatus('');
    } finally {
      setLoadingFiles(false);
    }
  }

  function updatePage(id: string, patch: Partial<OcrPage>) {
    setPages((current) => current.map((page) => page.id === id ? {
      ...page,
      ...patch,
      ...(patch.rotation !== undefined || patch.enhancement !== undefined
        ? { text: '', confidence: null, words: [], processedImage: undefined, processedWidth: undefined, processedHeight: undefined }
        : {}),
    } : page));
    if (patch.rotation !== undefined || patch.enhancement !== undefined) {
      setText('');
      setStatus('Los ajustes cambiaron. Vuelve a reconocer el documento.');
    }
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      setText(combineOcrText(copy));
      return copy;
    });
  }

  function removePage(id: string) {
    setPages((current) => {
      const page = current.find((entry) => entry.id === id);
      if (page) {
        URL.revokeObjectURL(page.previewUrl);
        urls.current.delete(page.previewUrl);
      }
      const next = current.filter((entry) => entry.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      setText(combineOcrText(next));
      return next;
    });
  }

  async function recognizeDocument() {
    if (!pages.length || processing) return;
    setProcessing(true);
    setError('');
    setProgress(0);
    setStatus('Preparando el reconocimiento');
    cancelled.current = false;
    const controller = new AbortController();
    recognitionAbort.current = controller;
    const snapshot = pages.map((page) => ({ ...page }));
    try {
      const { createWorker } = await import('tesseract.js');
      let activePage = 0;
      const worker = await createWorker(language.split('+'), undefined, {
        logger: (message) => {
          const pageProgress = Math.round(message.progress * 100);
          setProgress(Math.round(((activePage + message.progress) / snapshot.length) * 100));
          setStatus(`Página ${activePage + 1} de ${snapshot.length} · ${statusLabels[message.status] ?? 'Procesando'} · ${pageProgress}%`);
        },
      });
      workerRef.current = worker;
      if (cancelled.current) throw new DOMException('Reconocimiento cancelado', 'AbortError');

      for (activePage = 0; activePage < snapshot.length; activePage += 1) {
        if (cancelled.current) throw new DOMException('Reconocimiento cancelado', 'AbortError');
        const prepared = await preparePage(snapshot[activePage]);
        const result = await new Promise<Awaited<ReturnType<Worker['recognize']>>>((resolve, reject) => {
          const abort = () => reject(new DOMException('Reconocimiento cancelado', 'AbortError'));
          if (controller.signal.aborted) { abort(); return; }
          controller.signal.addEventListener('abort', abort, { once: true });
          void worker.recognize(prepared.blob, { rotateAuto: false }, { text: true, blocks: true })
            .then(resolve, reject)
            .finally(() => controller.signal.removeEventListener('abort', abort));
        });
        if (cancelled.current) throw new DOMException('Reconocimiento cancelado', 'AbortError');
        const updated: OcrPage = {
          ...snapshot[activePage],
          text: result.data.text.trim(),
          confidence: Math.round(result.data.confidence),
          words: collectOcrWords(result.data.blocks as TesseractBlocks),
          processedImage: prepared.blob,
          processedWidth: prepared.width,
          processedHeight: prepared.height,
        };
        snapshot[activePage] = updated;
        setPages(snapshot.map((page) => ({ ...page })));
        setText(combineOcrText(snapshot));
      }
      setProgress(100);
      setStatus(`Reconocimiento terminado · ${snapshot.length} ${snapshot.length === 1 ? 'página' : 'páginas'}`);
    } catch (cause) {
      if ((cause as DOMException).name === 'AbortError' || cancelled.current) {
        setStatus('Reconocimiento cancelado');
        setProgress(0);
      } else {
        setError(cause instanceof Error ? cause.message : 'No fue posible reconocer el documento.');
        setStatus('');
      }
    } finally {
      await workerRef.current?.terminate().catch(() => undefined);
      workerRef.current = null;
      recognitionAbort.current = null;
      setProcessing(false);
    }
  }

  async function cancelRecognition() {
    cancelled.current = true;
    recognitionAbort.current?.abort();
    setStatus('Cancelando reconocimiento; la descarga inicial puede necesitar terminar.');
    await workerRef.current?.terminate().catch(() => undefined);
    workerRef.current = null;
  }

  async function exportSearchablePdf() {
    setExportingPdf(true);
    setError('');
    setStatus('Creando PDF con capa de texto…');
    try {
      const blob = await createSearchablePdf(pages);
      downloadBlob(blob, 'documento-ocr-buscable.pdf');
      setStatus(`PDF buscable creado · ${formatBytes(blob.size)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el PDF buscable.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function copyText() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  function downloadText() {
    if (!text) return;
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'documento-ocr.txt');
  }

  function clearAll() {
    void cancelRecognition();
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setPages([]);
    setSelectedId(null);
    setText('');
    setProgress(0);
    setStatus('');
    setError('');
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-dashed border-primary/35 bg-card p-6 text-center ring-1 ring-foreground/5 sm:p-9"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void addFiles(event.dataTransfer.files);
        }}
        aria-labelledby="ocr-upload-title"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          {loadingFiles ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : <FileSearch className="size-6" aria-hidden="true" />}
        </span>
        <h2 id="ocr-upload-title" className="mt-5 text-xl font-semibold tracking-tight">
          {pages.length ? 'Añade más páginas' : 'Reconoce un documento completo'}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Imágenes JPG, PNG o WebP de hasta 20 MB y PDF de hasta 50 MB · máximo {MAX_PAGES} páginas
        </p>
        <label htmlFor="ocr-files" className={buttonVariants({ size: 'lg', className: 'mt-6 cursor-pointer rounded-xl px-5' })}>
          <FileUp aria-hidden="true" /> Seleccionar imágenes o PDF
        </label>
        <input
          id="ocr-files"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          multiple
          className="sr-only"
          disabled={loadingFiles || processing}
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </section>

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {pages.length ? (
        <>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-end">
                <label htmlFor="ocr-language" className="space-y-2 text-sm font-medium">
                  <span className="flex items-center gap-2"><Languages className="size-4 text-primary" aria-hidden="true" /> Idioma del texto</span>
                  <NativeSelect id="ocr-language" className="w-full" value={language} disabled={processing} onChange={(event) => setLanguage(event.target.value as OcrLanguage)}>
                    <NativeSelectOption value="spa">Español</NativeSelectOption>
                    <NativeSelectOption value="eng">Inglés</NativeSelectOption>
                    <NativeSelectOption value="spa+eng">Español + inglés</NativeSelectOption>
                  </NativeSelect>
                </label>
                <div>
                  <p className="text-sm font-medium">{pages.length} {pages.length === 1 ? 'página' : 'páginas'} · {recognizedCount} reconocidas</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    La primera ejecución descarga el motor (aprox. 4 MB) y entre 2 y 8 MB por idioma; después el navegador intenta reutilizarlos desde su caché. Los archivos permanecen en este dispositivo.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {processing ? <Button variant="outline" onClick={() => void cancelRecognition()}>Cancelar</Button> : null}
                <Button onClick={() => void recognizeDocument()} disabled={processing || loadingFiles}>
                  {processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                  {processing ? 'Reconociendo…' : recognizedCount ? 'Reconocer de nuevo' : 'Reconocer documento'}
                </Button>
                <Button variant="ghost" onClick={clearAll} disabled={processing}><RotateCcw aria-hidden="true" /> Limpiar</Button>
              </div>
            </div>
            {processing || status ? (
              <Progress value={progress} className="mt-5">
                <ProgressLabel>{status}</ProgressLabel>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">{progress}%</span>
              </Progress>
            ) : null}
          </section>

          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <section aria-labelledby="ocr-pages-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="ocr-pages-title" className="font-semibold tracking-tight">Páginas</h2>
                <span className="text-xs text-muted-foreground">Orden de lectura</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {pages.map((page, index) => (
                  <article key={page.id} className={`overflow-hidden rounded-2xl bg-card ring-1 ${selectedPage?.id === page.id ? 'ring-2 ring-primary' : 'ring-foreground/10'}`}>
                    <button type="button" className="grid w-full grid-cols-[6rem_1fr] text-left" onClick={() => setSelectedId(page.id)} aria-label={`Revisar página ${index + 1}: ${page.sourceName}`}>
                      <span className="relative grid h-28 place-items-center overflow-hidden bg-muted/45 p-2">
                        {/* eslint-disable-next-line next/no-img-element -- Local OCR input preview. */}
                        <img src={page.previewUrl} alt="" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)` }} />
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-background/90 px-1.5 py-0.5 font-mono text-[0.65rem]">{index + 1}</span>
                      </span>
                      <span className="min-w-0 p-3">
                        <span className="block truncate text-sm font-medium">{page.sourceName}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{page.confidence === null ? 'Sin reconocer' : `${page.confidence}% de confianza`}</span>
                        {page.words.some((word) => word.confidence < 65) ? <span className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="size-3" /> Revisar dudas</span> : null}
                      </span>
                    </button>
                    <div className="grid grid-cols-4 gap-1 border-t border-border p-2">
                      <Button variant="ghost" size="icon-sm" aria-label="Mover página a la izquierda" disabled={index === 0 || processing} onClick={() => movePage(index, -1)}><ArrowLeft aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Mover página a la derecha" disabled={index === pages.length - 1 || processing} onClick={() => movePage(index, 1)}><ArrowRight aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Girar página" disabled={processing} onClick={() => updatePage(page.id, { rotation: (page.rotation + 90) % 360 })}><RotateCw aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar página" disabled={processing} onClick={() => removePage(page.id)}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10" aria-labelledby="ocr-review-title">
              {selectedPage ? (
                <>
                  <div className="grid min-h-80 place-items-center bg-muted/45 p-5">
                    {/* eslint-disable-next-line next/no-img-element -- Local OCR input preview. */}
                    <img src={selectedPage.previewUrl} alt={`Página seleccionada: ${selectedPage.sourceName}`} className="max-h-[32rem] max-w-full rounded-xl object-contain" style={{ transform: `rotate(${selectedPage.rotation}deg)` }} />
                  </div>
                  <div className="border-t border-border p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 id="ocr-review-title" className="truncate font-semibold">{selectedPage.sourceName}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{formatBytes(selectedPage.image.size)} · rotación {selectedPage.rotation}°</p>
                      </div>
                      <label htmlFor="ocr-enhancement" className="space-y-1 text-xs font-medium">
                        Preparación
                        <NativeSelect id="ocr-enhancement" value={selectedPage.enhancement} disabled={processing} onChange={(event) => updatePage(selectedPage.id, { enhancement: event.target.value as OcrEnhancement })}>
                          <NativeSelectOption value="document">Documento limpio</NativeSelectOption>
                          <NativeSelectOption value="gray">Escala de grises</NativeSelectOption>
                          <NativeSelectOption value="original">Imagen original</NativeSelectOption>
                        </NativeSelect>
                      </label>
                    </div>
                    {selectedPage.text ? <p className="mt-5 whitespace-pre-wrap rounded-xl bg-muted/40 p-4 text-sm leading-6">{selectedPage.text}</p> : <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">El texto de esta página aparecerá aquí después del reconocimiento.</p>}
                    {lowConfidence.length ? (
                      <div className="mt-5">
                        <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200"><AlertTriangle className="size-4" /> Fragmentos de baja confianza</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {lowConfidence.slice(0, 24).map((word, index) => <span key={`${word.text}-${index}`} className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100">{word.text || '¿?'} · {word.confidence}%</span>)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </section>
          </div>

          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6" aria-labelledby="ocr-result-title">
            <label htmlFor="ocr-result" className="flex items-center justify-between gap-4 text-sm font-medium">
              <span id="ocr-result-title">Texto completo editable</span>
              <span className="text-xs font-normal text-muted-foreground">{text.length.toLocaleString('es')} caracteres</span>
            </label>
            <Textarea id="ocr-result" value={text} onChange={(event) => setText(event.target.value)} placeholder="El texto reconocido de todas las páginas aparecerá aquí." className="mt-3 min-h-72 resize-y rounded-xl font-mono leading-6" />
            <p className="mt-2 text-xs text-muted-foreground">Las correcciones de este campo se incluyen al copiar y descargar TXT. El PDF conserva el texto reconocido de cada página; sus idiomas compatibles son español e inglés. Gira las páginas inclinadas antes de reconocerlas.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void copyText()} disabled={!text}>{copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}{copied ? 'Copiado' : 'Copiar'}</Button>
              <Button variant="outline" onClick={downloadText} disabled={!text}><Download aria-hidden="true" /> Descargar TXT</Button>
              <Button onClick={() => void exportSearchablePdf()} disabled={!recognizedCount || processing || exportingPdf}>
                {exportingPdf ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                {exportingPdf ? 'Creando PDF…' : 'Descargar PDF buscable'}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      <p className="text-center text-xs leading-5 text-muted-foreground">El reconocimiento y la creación del PDF buscable ocurren en tu navegador. La primera ejecución descarga el modelo del idioma, pero tus archivos no se envían al servidor.</p>
    </div>
  );
}
