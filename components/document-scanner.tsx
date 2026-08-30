'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop zone complements an accessible file input. */

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileImage,
  FilePlus2,
  LoaderCircle,
  RotateCw,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Slider } from '@/components/ui/slider';
import { downloadBlob, formatBytes, makeId } from '@/lib/browser-files';

type ScanMode = 'color' | 'gray' | 'document';
type PageFormat = 'a4' | 'letter' | 'original';
type ScanPage = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number;
};

const pageSizes: Record<Exclude<PageFormat, 'original'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

async function renderPage(page: ScanPage, mode: ScanMode, crop: number) {
  const bitmap = await createImageBitmap(page.file);
  const cropX = Math.round(bitmap.width * crop / 100);
  const cropY = Math.round(bitmap.height * crop / 100);
  const sourceWidth = Math.max(1, bitmap.width - cropX * 2);
  const sourceHeight = Math.max(1, bitmap.height - cropY * 2);
  const maxSide = 2600;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const drawnWidth = Math.max(1, Math.round(sourceWidth * scale));
  const drawnHeight = Math.max(1, Math.round(sourceHeight * scale));
  const swapSides = page.rotation % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = swapSides ? drawnHeight : drawnWidth;
  canvas.height = swapSides ? drawnWidth : drawnHeight;
  const context = canvas.getContext('2d', { willReadFrequently: mode !== 'color' });
  if (!context) {
    bitmap.close();
    throw new Error('El navegador no pudo preparar una de las páginas.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(page.rotation * Math.PI / 180);
  context.drawImage(bitmap, cropX, cropY, sourceWidth, sourceHeight, -drawnWidth / 2, -drawnHeight / 2, drawnWidth, drawnHeight);
  context.restore();
  bitmap.close();

  if (mode !== 'color') {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const luminance = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
      const value = mode === 'document'
        ? clampChannel((luminance - 128) * 1.55 + 150)
        : clampChannel(luminance);
      pixels.data[index] = value;
      pixels.data[index + 1] = value;
      pixels.data[index + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No fue posible procesar una página.')), 'image/jpeg', 0.9);
  });
  return { blob, width: canvas.width, height: canvas.height };
}

async function createPdf(pages: ScanPage[], mode: ScanMode, crop: number, format: PageFormat, margin: number) {
  const { PDFDocument } = await import('pdf-lib');
  const output = await PDFDocument.create();

  for (const scanPage of pages) {
    const rendered = await renderPage(scanPage, mode, crop);
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
    const page = output.addPage([pageWidth, pageHeight]);
    const availableWidth = Math.max(1, pageWidth - margin * 2);
    const availableHeight = Math.max(1, pageHeight - margin * 2);
    const scale = Math.min(availableWidth / rendered.width, availableHeight / rendered.height);
    const width = rendered.width * scale;
    const height = rendered.height * scale;
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }

  const bytes = await output.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}

export function DocumentScanner() {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [mode, setMode] = useState<ScanMode>('document');
  const [format, setFormat] = useState<PageFormat>('a4');
  const [crop, setCrop] = useState(2);
  const [margin, setMargin] = useState(18);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const currentUrls = urls.current;
    return () => currentUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function addFiles(fileList: FileList | File[]) {
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
    const next = supported.slice(0, available).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      urls.current.add(previewUrl);
      return { id: makeId('scan'), file, previewUrl, rotation: 0 };
    });
    setPages((current) => [...current, ...next]);
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
      if (page) URL.revokeObjectURL(page.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  }

  async function exportPdf() {
    if (!pages.length || exporting) return;
    setExporting(true);
    setError('');
    setProgress(`Procesando ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'}…`);
    try {
      const blob = await createPdf(pages, mode, crop, format, margin);
      downloadBlob(blob, 'documento-escaneado.pdf');
      setProgress(`PDF creado · ${formatBytes(blob.size)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el PDF.');
      setProgress('');
    } finally {
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
          addFiles(event.dataTransfer.files);
        }}
        aria-labelledby="scanner-upload-title"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <FileImage className="size-6" aria-hidden="true" />
        </span>
        <h2 id="scanner-upload-title" className="mt-4 text-xl font-semibold tracking-tight">
          {pages.length ? 'Añade más fotografías' : 'Convierte fotografías en un documento'}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Ordena, gira, recorta bordes y mejora la legibilidad de hasta 20 páginas.
        </p>
        <label htmlFor="scanner-files" className={buttonVariants({ size: 'lg', className: 'mt-5 cursor-pointer rounded-xl px-5' })}>
          <FilePlus2 aria-hidden="true" /> Seleccionar fotografías
        </label>
        <input
          id="scanner-files"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </section>

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {pages.length ? (
        <>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6" aria-label="Ajustes del escáner">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <label htmlFor="scan-mode" className="space-y-2 text-sm font-medium">
                Mejora visual
                <NativeSelect id="scan-mode" className="w-full" value={mode} onChange={(event) => setMode(event.target.value as ScanMode)}>
                  <NativeSelectOption value="document">Documento limpio</NativeSelectOption>
                  <NativeSelectOption value="gray">Escala de grises</NativeSelectOption>
                  <NativeSelectOption value="color">Color original</NativeSelectOption>
                </NativeSelect>
              </label>
              <label htmlFor="page-format" className="space-y-2 text-sm font-medium">
                Formato de página
                <NativeSelect id="page-format" className="w-full" value={format} onChange={(event) => setFormat(event.target.value as PageFormat)}>
                  <NativeSelectOption value="a4">A4 automático</NativeSelectOption>
                  <NativeSelectOption value="letter">Carta automático</NativeSelectOption>
                  <NativeSelectOption value="original">Proporción original</NativeSelectOption>
                </NativeSelect>
              </label>
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between"><span>Recortar bordes</span><span className="text-muted-foreground">{crop}%</span></div>
                <Slider value={[crop]} min={0} max={8} step={1} onValueChange={(value) => setCrop(Array.isArray(value) ? (value[0] ?? 2) : value)} aria-label="Porcentaje de recorte de bordes" />
              </div>
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between"><span>Margen del PDF</span><span className="text-muted-foreground">{margin} pt</span></div>
                <Slider value={[margin]} min={0} max={48} step={6} onValueChange={(value) => setMargin(Array.isArray(value) ? (value[0] ?? 18) : value)} aria-label="Margen de la página PDF" />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{pages.length} {pages.length === 1 ? 'página preparada' : 'páginas preparadas'}</p>
                {progress ? <p className="mt-1 text-xs text-primary" aria-live="polite">{progress}</p> : null}
              </div>
              <Button size="lg" className="rounded-xl px-5" disabled={exporting} onClick={() => void exportPdf()}>
                {exporting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                {exporting ? 'Creando PDF…' : 'Descargar PDF'}
              </Button>
            </div>
          </section>

          <section aria-labelledby="scan-pages-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="scan-pages-title" className="text-xl font-semibold tracking-tight">Páginas del documento</h2>
                <p className="mt-1 text-sm text-muted-foreground">El orden mostrado será el orden del PDF.</p>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="size-4" aria-hidden="true" /> Vista previa</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((page, index) => (
                <article key={page.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
                  <div className="relative grid h-64 place-items-center overflow-hidden bg-muted/45 p-3">
                    {/* eslint-disable-next-line next/no-img-element -- The preview is a local object URL. */}
                    <img
                      src={page.previewUrl}
                      alt={`Página ${index + 1}: ${page.file.name}`}
                      className={`max-h-full max-w-full object-contain ${mode === 'gray' ? 'grayscale' : mode === 'document' ? 'grayscale contrast-125 brightness-110' : ''}`}
                      style={{ transform: `rotate(${page.rotation}deg) scale(${1 + crop / 48})` }}
                    />
                    <span className="absolute left-2 top-2 rounded-lg bg-background/90 px-2 py-1 font-mono text-xs shadow-sm">{index + 1}</span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium" title={page.file.name}>{page.file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatBytes(page.file.size)}</p>
                    <div className="mt-3 grid grid-cols-4 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Mover página a la izquierda" disabled={index === 0} onClick={() => movePage(index, -1)}><ArrowLeft aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Mover página a la derecha" disabled={index === pages.length - 1} onClick={() => movePage(index, 1)}><ArrowRight aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Girar página" onClick={() => setPages((current) => current.map((entry) => entry.id === page.id ? { ...entry, rotation: (entry.rotation + 90) % 360 } : entry))}><RotateCw aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar página" onClick={() => removePage(page.id)}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">Las fotografías se procesan en memoria y no se conservan al cerrar la página.</p>
    </div>
  );
}
