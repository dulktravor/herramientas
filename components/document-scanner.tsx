'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Drop zones complement accessible file inputs. */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Crop,
  Download,
  FilePlus2,
  LoaderCircle,
  RotateCcw,
  RotateCw,
  ScanLine,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Slider } from '@/components/ui/slider';
import { downloadBlob, formatBytes, makeId } from '@/lib/browser-files';
import {
  DEFAULT_CORNERS,
  clampPoint,
  cloneCorners,
  detectDocumentCorners,
  isValidPerspective,
  perspectiveDimensions,
  projectPerspectivePoint,
  type NormalizedPoint,
  type PerspectiveCorners,
} from '@/lib/perspective';

type ScanMode = 'color' | 'gray' | 'document';
type PageFormat = 'a4' | 'letter' | 'original';
type ScanPage = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number;
  corners: PerspectiveCorners;
  mode: ScanMode;
  brightness: number;
  contrast: number;
};

const pageSizes: Record<Exclude<PageFormat, 'original'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const cornerLabels = ['superior izquierda', 'superior derecha', 'inferior derecha', 'inferior izquierda'];

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function abortError() {
  return new DOMException('Operación cancelada', 'AbortError');
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error('No fue posible procesar una página.')),
      'image/jpeg',
      quality,
    );
  });
}

async function analyzeCorners(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 560;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return cloneCorners(DEFAULT_CORNERS);
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return detectDocumentCorners(image.data, image.width, image.height);
}

function adjustedChannel(value: number, brightness: number, contrast: number) {
  const safeContrast = Math.max(-90, Math.min(200, contrast));
  const factor = (259 * (safeContrast + 255)) / (255 * (259 - safeContrast));
  return clampChannel(factor * (value - 128) + 128 + brightness);
}

async function renderPage(
  page: ScanPage,
  quality: number,
  maxSide: number,
  signal?: AbortSignal,
) {
  if (!isValidPerspective(page.corners)) {
    throw new Error('Las esquinas se cruzan o dejan un área demasiado pequeña. Ajusta el recorte.');
  }
  if (signal?.aborted) throw abortError();
  const bitmap = await createImageBitmap(page.file);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = bitmap.width;
  sourceCanvas.height = bitmap.height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    bitmap.close();
    throw new Error('El navegador no pudo preparar una de las páginas.');
  }
  sourceContext.drawImage(bitmap, 0, 0);
  bitmap.close();
  const source = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const dimensions = perspectiveDimensions(page.corners, source.width, source.height, maxSide);
  const rectified = document.createElement('canvas');
  rectified.width = dimensions.width;
  rectified.height = dimensions.height;
  const rectifiedContext = rectified.getContext('2d');
  if (!rectifiedContext) throw new Error('No fue posible crear la imagen corregida.');
  const output = rectifiedContext.createImageData(rectified.width, rectified.height);
  const extraContrast = page.mode === 'document' ? 42 : 0;
  const extraBrightness = page.mode === 'document' ? 15 : 0;

  for (let y = 0; y < rectified.height; y += 1) {
    if (signal?.aborted) throw abortError();
    const unitY = rectified.height === 1 ? 0 : y / (rectified.height - 1);
    for (let x = 0; x < rectified.width; x += 1) {
      const unitX = rectified.width === 1 ? 0 : x / (rectified.width - 1);
      const projected = projectPerspectivePoint(page.corners, unitX, unitY);
      const sourceX = Math.max(0, Math.min(source.width - 1, Math.round(projected.x * (source.width - 1))));
      const sourceY = Math.max(0, Math.min(source.height - 1, Math.round(projected.y * (source.height - 1))));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * rectified.width + x) * 4;
      const r = source.data[sourceIndex];
      const g = source.data[sourceIndex + 1];
      const b = source.data[sourceIndex + 2];
      if (page.mode === 'color') {
        output.data[targetIndex] = adjustedChannel(r, page.brightness, page.contrast);
        output.data[targetIndex + 1] = adjustedChannel(g, page.brightness, page.contrast);
        output.data[targetIndex + 2] = adjustedChannel(b, page.brightness, page.contrast);
      } else {
        const luminance = r * 0.299 + g * 0.587 + b * 0.114;
        const value = adjustedChannel(
          luminance,
          page.brightness + extraBrightness,
          page.contrast + extraContrast,
        );
        output.data[targetIndex] = value;
        output.data[targetIndex + 1] = value;
        output.data[targetIndex + 2] = value;
      }
      output.data[targetIndex + 3] = 255;
    }
    if (y > 0 && y % 96 === 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }
  rectifiedContext.putImageData(output, 0, 0);

  const swapSides = page.rotation % 180 !== 0;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = swapSides ? rectified.height : rectified.width;
  finalCanvas.height = swapSides ? rectified.width : rectified.height;
  const finalContext = finalCanvas.getContext('2d');
  if (!finalContext) throw new Error('No fue posible aplicar la rotación.');
  finalContext.fillStyle = '#ffffff';
  finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalContext.translate(finalCanvas.width / 2, finalCanvas.height / 2);
  finalContext.rotate(page.rotation * Math.PI / 180);
  finalContext.drawImage(rectified, -rectified.width / 2, -rectified.height / 2);
  const blob = await canvasToBlob(finalCanvas, quality);
  return { blob, width: finalCanvas.width, height: finalCanvas.height };
}

async function createPdf(
  pages: ScanPage[],
  quality: number,
  format: PageFormat,
  margin: number,
  signal: AbortSignal,
  onProgress: (message: string) => void,
) {
  const { PDFDocument } = await import('pdf-lib');
  const output = await PDFDocument.create();

  for (let index = 0; index < pages.length; index += 1) {
    if (signal.aborted) throw abortError();
    onProgress(`Corrigiendo página ${index + 1} de ${pages.length}…`);
    const rendered = await renderPage(pages[index], quality, 2600, signal);
    const image = await output.embedJpg(await rendered.blob.arrayBuffer());
    const landscape = rendered.width > rendered.height;
    let pageWidth: number;
    let pageHeight: number;
    if (format === 'original') {
      const scale = 595.28 / rendered.width;
      pageWidth = rendered.width * scale;
      pageHeight = rendered.height * scale;
    } else {
      const base = pageSizes[format];
      [pageWidth, pageHeight] = landscape ? [base[1], base[0]] : base;
    }
    const pdfPage = output.addPage([pageWidth, pageHeight]);
    const availableWidth = Math.max(1, pageWidth - margin * 2);
    const availableHeight = Math.max(1, pageHeight - margin * 2);
    const scale = Math.min(availableWidth / rendered.width, availableHeight / rendered.height);
    const width = rendered.width * scale;
    const height = rendered.height * scale;
    pdfPage.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }

  onProgress('Empaquetando PDF…');
  const bytes = await output.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}

function PerspectiveEditor({
  page,
  onChange,
}: {
  page: ScanPage;
  onChange: (corners: PerspectiveCorners) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);

  const updateFromPointer = useCallback((index: number, clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const corners = cloneCorners(page.corners);
    corners[index] = clampPoint({
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    });
    if (isValidPerspective(corners)) onChange(corners);
  }, [onChange, page.corners]);

  return (
    <div className="grid min-h-80 place-items-center overflow-auto bg-muted/45 p-4">
      <div ref={frameRef} className="relative mx-auto w-fit max-w-full touch-none select-none">
        {/* eslint-disable-next-line next/no-img-element -- Local preview never leaves the browser. */}
        <img src={page.previewUrl} alt={`Ajuste de perspectiva de ${page.file.name}`} className="block max-h-[34rem] max-w-full" />
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon
            points={page.corners.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
            fill="rgb(75 216 211 / 0.13)"
            stroke="rgb(75 216 211)"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {page.corners.map((point, index) => (
          <button
            key={cornerLabels[index]}
            type="button"
            aria-label={`Mover esquina ${cornerLabels[index]}`}
            className="absolute size-8 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-primary shadow-lg outline-none ring-primary/30 focus-visible:ring-4 active:cursor-grabbing"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            onPointerDown={(event) => {
              dragIndex.current = index;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (dragIndex.current === index && event.currentTarget.hasPointerCapture(event.pointerId)) {
                updateFromPointer(index, event.clientX, event.clientY);
              }
            }}
            onPointerUp={(event) => {
              dragIndex.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              const delta = event.shiftKey ? 0.02 : 0.005;
              const movement: Record<string, NormalizedPoint> = {
                ArrowLeft: { x: -delta, y: 0 },
                ArrowRight: { x: delta, y: 0 },
                ArrowUp: { x: 0, y: -delta },
                ArrowDown: { x: 0, y: delta },
              };
              const change = movement[event.key];
              if (!change) return;
              event.preventDefault();
              const corners = cloneCorners(page.corners);
              corners[index] = clampPoint({ x: point.x + change.x, y: point.y + change.y });
              if (isValidPerspective(corners)) onChange(corners);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function DocumentScanner() {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<PageFormat>('a4');
  const [margin, setMargin] = useState(18);
  const [quality, setQuality] = useState(88);
  const [exporting, setExporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [correctedPreview, setCorrectedPreview] = useState('');
  const urls = useRef(new Set<string>());
  const exportAbort = useRef<AbortController | null>(null);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) ?? pages[0] ?? null,
    [pages, selectedId],
  );

  useEffect(() => {
    const currentUrls = urls.current;
    return () => {
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
      exportAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => { if (correctedPreview) URL.revokeObjectURL(correctedPreview); };
  }, [correctedPreview]);

  useEffect(() => {
    if (!selectedPage) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void renderPage(selectedPage, 0.82, 900, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          const previewUrl = URL.createObjectURL(result.blob);
          setCorrectedPreview((current) => {
            if (current) URL.revokeObjectURL(current);
            return previewUrl;
          });
        })
        .catch((cause) => {
          if ((cause as DOMException).name !== 'AbortError') {
            setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la vista previa.');
          }
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [selectedPage]);

  const updatePage = useCallback((id: string, patch: Partial<ScanPage>) => {
    setPages((current) => current.map((page) => page.id === id ? { ...page, ...patch } : page));
  }, []);

  async function addFiles(fileList: FileList | File[]) {
    if (analyzing || exporting) return;
    setError('');
    const candidates = Array.from(fileList);
    const supported = candidates.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    if (!supported.length) {
      setError('Selecciona fotografías JPG, PNG o WebP válidas.');
      return;
    }
    if (supported.some((file) => file.size > 20 * 1024 * 1024)) {
      setError('Cada fotografía debe pesar como máximo 20 MB.');
      return;
    }
    const available = Math.max(0, 20 - pages.length);
    if (supported.length > available) setError('El escáner admite un máximo de 20 páginas.');
    const accepted = supported.slice(0, available);
    setAnalyzing(true);
    const next: ScanPage[] = [];
    const createdUrls: string[] = [];
    try {
      for (let index = 0; index < accepted.length; index += 1) {
        const file = accepted[index];
        setProgress(`Detectando bordes ${index + 1} de ${accepted.length}…`);
        const previewUrl = URL.createObjectURL(file);
        urls.current.add(previewUrl);
        createdUrls.push(previewUrl);
        next.push({
          id: makeId('scan'),
          file,
          previewUrl,
          rotation: 0,
          corners: await analyzeCorners(file),
          mode: 'document',
          brightness: 0,
          contrast: 0,
        });
      }
      setPages((current) => [...current, ...next]);
      if (!selectedId && next[0]) setSelectedId(next[0].id);
      setProgress(`${next.length} ${next.length === 1 ? 'página preparada' : 'páginas preparadas'}`);
    } catch (cause) {
      createdUrls.forEach((url) => { URL.revokeObjectURL(url); urls.current.delete(url); });
      setError(cause instanceof Error ? cause.message : 'No fue posible analizar las fotografías.');
      setProgress('');
    } finally {
      setAnalyzing(false);
    }
  }

  async function detectAgain(page: ScanPage) {
    setAnalyzing(true);
    setError('');
    setProgress('Detectando los bordes del documento…');
    try {
      updatePage(page.id, { corners: await analyzeCorners(page.file) });
      setProgress('Bordes actualizados. Revisa las cuatro esquinas.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible detectar los bordes.');
    } finally {
      setAnalyzing(false);
    }
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
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
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
        if (!next.length) {
          setCorrectedPreview((current) => {
            if (current) URL.revokeObjectURL(current);
            return '';
          });
        }
      }
      return next;
    });
  }

  async function exportPdf() {
    if (!pages.length || exporting) return;
    setExporting(true);
    setError('');
    const controller = new AbortController();
    exportAbort.current = controller;
    try {
      const blob = await createPdf(
        pages,
        quality / 100,
        format,
        margin,
        controller.signal,
        setProgress,
      );
      downloadBlob(blob, 'documento-escaneado.pdf');
      setProgress(`PDF creado · ${formatBytes(blob.size)}`);
    } catch (cause) {
      if ((cause as DOMException).name === 'AbortError') {
        setProgress('Exportación cancelada');
      } else {
        setError(cause instanceof Error ? cause.message : 'No fue posible crear el PDF.');
        setProgress('');
      }
    } finally {
      exportAbort.current = null;
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-dashed border-primary/35 bg-card p-6 text-center ring-1 ring-foreground/5 sm:p-8"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void addFiles(event.dataTransfer.files);
        }}
        aria-labelledby="scanner-upload-title"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          {analyzing ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : <ScanLine className="size-6" aria-hidden="true" />}
        </span>
        <h2 id="scanner-upload-title" className="mt-4 text-xl font-semibold tracking-tight">
          {pages.length ? 'Añade más fotografías' : 'Corrige la perspectiva de tus documentos'}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Detecta la hoja, ajusta sus cuatro esquinas y mejora hasta 20 páginas sin subirlas.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG o WebP · hasta 20 MB por fotografía</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <label htmlFor="scanner-files" className={buttonVariants({ size: 'lg', className: 'cursor-pointer rounded-xl px-5' })}>
            <FilePlus2 aria-hidden="true" /> Seleccionar fotografías
          </label>
          <input
            id="scanner-files"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={analyzing || exporting}
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <label htmlFor="scanner-camera" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'cursor-pointer rounded-xl px-5' })}>
            <Camera aria-hidden="true" /> Tomar foto
          </label>
          <input
            id="scanner-camera"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={analyzing || exporting}
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      </section>

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {selectedPage ? (
        <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10" aria-labelledby="perspective-title">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="text-sm font-medium text-primary">Página seleccionada</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="perspective-title" className="text-xl font-semibold tracking-tight">Ajusta las cuatro esquinas</h2>
                <p className="mt-1 text-sm text-muted-foreground">Arrastra los puntos sobre las esquinas reales de la hoja. También puedes enfocarlos y usar las flechas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void detectAgain(selectedPage)} disabled={analyzing || exporting}>
                  {analyzing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                  Detectar otra vez
                </Button>
                <Button variant="ghost" onClick={() => updatePage(selectedPage.id, { corners: cloneCorners(DEFAULT_CORNERS), brightness: 0, contrast: 0, mode: 'document' })} disabled={exporting}>
                  <RotateCcw aria-hidden="true" /> Restablecer
                </Button>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-2">
            <div className="border-b border-border lg:border-b-0 lg:border-r">
              <p className="border-b border-border px-5 py-3 text-sm font-medium">Original y área seleccionada</p>
              <PerspectiveEditor page={selectedPage} onChange={(corners) => updatePage(selectedPage.id, { corners })} />
            </div>
            <div>
              <p className="border-b border-border px-5 py-3 text-sm font-medium">Vista corregida</p>
              <div className="grid min-h-80 place-items-center bg-muted/30 p-4">
                {correctedPreview ? (
                  // eslint-disable-next-line next/no-img-element -- Generated locally from the selected page.
                  <img src={correctedPreview} alt="Previsualización con perspectiva corregida" className="max-h-[34rem] max-w-full object-contain" />
                ) : (
                  <LoaderCircle className="size-7 animate-spin text-primary" aria-label="Actualizando previsualización" />
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-5 border-t border-border p-5 md:grid-cols-3 sm:p-6">
            <label htmlFor="selected-scan-mode" className="space-y-2 text-sm font-medium">
              Mejora de esta página
              <NativeSelect id="selected-scan-mode" className="w-full" value={selectedPage.mode} onChange={(event) => updatePage(selectedPage.id, { mode: event.target.value as ScanMode })}>
                <NativeSelectOption value="document">Documento limpio</NativeSelectOption>
                <NativeSelectOption value="gray">Escala de grises</NativeSelectOption>
                <NativeSelectOption value="color">Color original</NativeSelectOption>
              </NativeSelect>
            </label>
            <div className="space-y-3 text-sm font-medium">
              <div className="flex justify-between"><span>Brillo</span><span className="text-muted-foreground">{selectedPage.brightness}</span></div>
              <Slider value={[selectedPage.brightness]} min={-40} max={40} step={2} onValueChange={(value) => updatePage(selectedPage.id, { brightness: Number(Array.isArray(value) ? value[0] : value) })} aria-label="Brillo de esta página" />
            </div>
            <div className="space-y-3 text-sm font-medium">
              <div className="flex justify-between"><span>Contraste</span><span className="text-muted-foreground">{selectedPage.contrast}</span></div>
              <Slider value={[selectedPage.contrast]} min={-40} max={80} step={4} onValueChange={(value) => updatePage(selectedPage.id, { contrast: Number(Array.isArray(value) ? value[0] : value) })} aria-label="Contraste de esta página" />
            </div>
          </div>
        </section>
      ) : null}

      {pages.length ? (
        <>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6" aria-label="Ajustes de salida">
            <div className="grid gap-5 md:grid-cols-3">
              <label htmlFor="page-format" className="space-y-2 text-sm font-medium">
                Formato de página
                <NativeSelect id="page-format" className="w-full" value={format} onChange={(event) => setFormat(event.target.value as PageFormat)}>
                  <NativeSelectOption value="a4">A4 automático</NativeSelectOption>
                  <NativeSelectOption value="letter">Carta automático</NativeSelectOption>
                  <NativeSelectOption value="original">Proporción original</NativeSelectOption>
                </NativeSelect>
              </label>
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between"><span>Margen del PDF</span><span className="text-muted-foreground">{margin} pt</span></div>
                <Slider value={[margin]} min={0} max={48} step={6} onValueChange={(value) => setMargin(Number(Array.isArray(value) ? value[0] : value))} aria-label="Margen de la página PDF" />
              </div>
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between"><span>Calidad JPEG</span><span className="text-muted-foreground">{quality}%</span></div>
                <Slider value={[quality]} min={55} max={95} step={5} onValueChange={(value) => setQuality(Number(Array.isArray(value) ? value[0] : value))} aria-label="Calidad de las imágenes dentro del PDF" />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{pages.length} {pages.length === 1 ? 'página preparada' : 'páginas preparadas'}</p>
                {progress ? <p className="mt-1 text-xs text-primary" aria-live="polite">{progress}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {exporting ? (
                  <Button variant="outline" size="lg" className="rounded-xl" onClick={() => exportAbort.current?.abort()}>
                    <X aria-hidden="true" /> Cancelar
                  </Button>
                ) : null}
                <Button size="lg" className="rounded-xl px-5" disabled={exporting || analyzing} onClick={() => void exportPdf()}>
                  {exporting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                  {exporting ? 'Creando PDF…' : 'Descargar PDF corregido'}
                </Button>
              </div>
            </div>
          </section>

          <section aria-labelledby="scan-pages-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="scan-pages-title" className="text-xl font-semibold tracking-tight">Páginas del documento</h2>
                <p className="mt-1 text-sm text-muted-foreground">Selecciona una página para ajustar sus esquinas y su aspecto.</p>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Crop className="size-4" aria-hidden="true" /> Ajuste individual</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((page, index) => (
                <article key={page.id} className={`overflow-hidden rounded-2xl bg-card ring-1 ${selectedPage?.id === page.id ? 'ring-2 ring-primary' : 'ring-foreground/10'}`}>
                  <button type="button" className="relative grid h-56 w-full place-items-center overflow-hidden bg-muted/45 p-3 text-left" onClick={() => setSelectedId(page.id)} aria-label={`Ajustar página ${index + 1}: ${page.file.name}`}>
                    {/* eslint-disable-next-line next/no-img-element -- Local file preview. */}
                    <img src={page.previewUrl} alt="" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)` }} />
                    <span className="absolute left-2 top-2 rounded-lg bg-background/90 px-2 py-1 font-mono text-xs shadow-sm">{index + 1}</span>
                  </button>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium" title={page.file.name}>{page.file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatBytes(page.file.size)} · {page.mode === 'document' ? 'Documento' : page.mode === 'gray' ? 'Grises' : 'Color'}</p>
                    <div className="mt-3 grid grid-cols-4 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Mover página a la izquierda" disabled={index === 0 || exporting} onClick={() => movePage(index, -1)}><ArrowLeft aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Mover página a la derecha" disabled={index === pages.length - 1 || exporting} onClick={() => movePage(index, 1)}><ArrowRight aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Girar página" disabled={exporting} onClick={() => updatePage(page.id, { rotation: (page.rotation + 90) % 360 })}><RotateCw aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar página" disabled={exporting} onClick={() => removePage(page.id)}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <p className="text-center text-xs leading-5 text-muted-foreground">La detección de bordes y la corrección de perspectiva ocurren en este dispositivo. Revisa siempre las cuatro esquinas antes de descargar.</p>
    </div>
  );
}
