'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Drop zones complement accessible file inputs. */

import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  ImageUp,
  LoaderCircle,
  Trash2,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Slider } from '@/components/ui/slider';
import { downloadBlob, formatBytes, makeId, replaceExtension } from '@/lib/browser-files';

type OutputFormat = 'original' | 'image/jpeg' | 'image/png' | 'image/webp';

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  result?: {
    blob: Blob;
    url: string;
    filename: string;
    width: number;
    height: number;
  };
};

const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function readImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

async function transformImage(file: File, format: OutputFormat, quality: number, maxWidth: number) {
  const bitmap = await createImageBitmap(file);
  const scale = maxWidth > 0 ? Math.min(1, maxWidth / bitmap.width) : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    bitmap.close();
    throw new Error('El navegador no pudo preparar la imagen.');
  }

  const requestedMime = format === 'original' ? file.type : format;
  const mime = extensionByMime[requestedMime] ? requestedMime : 'image/png';
  if (mime === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('No fue posible crear el archivo resultante.'))),
      mime,
      quality / 100,
    );
  });

  return { blob, width, height, mime };
}

export function ImageStudio() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [format, setFormat] = useState<OutputFormat>('original');
  const [quality, setQuality] = useState(82);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const currentUrls = urls.current;
    return () => currentUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function addFiles(files: FileList | File[]) {
    setError('');
    const candidates = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const supported = candidates.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));

    if (supported.length !== candidates.length || supported.length === 0) {
      setError('Selecciona archivos JPG, PNG o WebP válidos.');
    }

    const accepted = supported.filter((file) => file.size <= 25 * 1024 * 1024).slice(0, 30);
    if (accepted.length !== supported.length) {
      setError('Se admiten hasta 30 imágenes y un máximo de 25 MB por archivo.');
    }

    const nextItems: ImageItem[] = [];
    for (const file of accepted) {
      try {
        const dimensions = await readImage(file);
        const previewUrl = URL.createObjectURL(file);
        urls.current.add(previewUrl);
        nextItems.push({ id: makeId('image'), file, previewUrl, ...dimensions });
      } catch {
        setError('Una de las imágenes no pudo leerse y fue omitida.');
      }
    }
    setItems((current) => [...current, ...nextItems].slice(0, 30));
  }

  function removeItem(id: string) {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.result) URL.revokeObjectURL(item.result.url);
      }
      return current.filter((entry) => entry.id !== id);
    });
  }

  async function processAll() {
    if (items.length === 0) return;
    setProcessing(true);
    setError('');

    try {
      const processed: ImageItem[] = [];
      for (const item of items) {
        const output = await transformImage(item.file, format, quality, maxWidth);
        if (item.result) URL.revokeObjectURL(item.result.url);
        const url = URL.createObjectURL(output.blob);
        urls.current.add(url);
        const extension = extensionByMime[output.mime];
        processed.push({
          ...item,
          result: {
            blob: output.blob,
            url,
            filename: replaceExtension(item.file.name, extension, '-optimizada'),
            width: output.width,
            height: output.height,
          },
        });
      }
      setItems(processed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible procesar las imágenes.');
    } finally {
      setProcessing(false);
    }
  }

  async function downloadAll() {
    const completed = items.filter((item) => item.result);
    if (completed.length === 1 && completed[0].result) {
      downloadBlob(completed[0].result.blob, completed[0].result.filename);
      return;
    }

    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    completed.forEach((item) => {
      if (item.result) zip.file(item.result.filename, item.result.blob);
    });
    const archive = await zip.generateAsync({ type: 'blob' });
    downloadBlob(archive, 'imagenes-optimizadas.zip');
  }

  const completedCount = items.filter((item) => item.result).length;

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-dashed border-primary/35 bg-card p-6 text-center ring-1 ring-foreground/5 sm:p-9"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void addFiles(event.dataTransfer.files);
        }}
        aria-labelledby="image-upload-title"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <ImageUp className="size-6" aria-hidden="true" />
        </span>
        <h2 id="image-upload-title" className="mt-5 text-xl font-semibold tracking-tight">Arrastra tus imágenes aquí</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">JPG, PNG o WebP · hasta 30 archivos · máximo 25 MB cada uno</p>
        <label htmlFor="image-files" className={buttonVariants({ size: 'lg', className: 'mt-6 cursor-pointer rounded-xl px-5' })}>
          Seleccionar imágenes
        </label>
        <input
          id="image-files"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </section>

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {items.length > 0 ? (
        <>
          <section className="grid gap-5 rounded-3xl bg-card p-6 ring-1 ring-foreground/10 lg:grid-cols-3" aria-label="Opciones de procesamiento">
            <label htmlFor="image-format" className="space-y-2 text-sm font-medium">
              Formato de salida
              <NativeSelect id="image-format" className="w-full" value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
                <NativeSelectOption value="original">Mantener formato</NativeSelectOption>
                <NativeSelectOption value="image/jpeg">JPG</NativeSelectOption>
                <NativeSelectOption value="image/png">PNG</NativeSelectOption>
                <NativeSelectOption value="image/webp">WebP</NativeSelectOption>
              </NativeSelect>
            </label>
            <label htmlFor="image-max-width" className="space-y-2 text-sm font-medium">
              Ancho máximo
              <Input id="image-max-width" type="number" min={320} max={8000} step={10} value={maxWidth} onChange={(event) => setMaxWidth(Number(event.target.value) || 1920)} />
            </label>
            <div className="space-y-3 text-sm font-medium">
              <div className="flex justify-between"><span>Calidad</span><span className="text-muted-foreground">{quality}%</span></div>
              <Slider min={35} max={100} step={1} value={[quality]} onValueChange={(value) => setQuality(Array.isArray(value) ? (value[0] ?? 82) : value)} aria-label="Calidad de imagen" />
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-3">
              <Button size="lg" className="rounded-xl px-5" onClick={() => void processAll()} disabled={processing}>
                {processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                {processing ? 'Procesando…' : `Procesar ${items.length} ${items.length === 1 ? 'imagen' : 'imágenes'}`}
              </Button>
              {completedCount > 0 ? (
                <Button size="lg" variant="secondary" className="rounded-xl px-5" onClick={() => void downloadAll()}>
                  {completedCount > 1 ? <Archive aria-hidden="true" /> : <Download aria-hidden="true" />}
                  Descargar {completedCount > 1 ? 'ZIP' : 'resultado'}
                </Button>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="image-list-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="image-list-title" className="text-xl font-semibold tracking-tight">Tus imágenes</h2>
              <span className="text-sm text-muted-foreground">{items.length}/30</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => {
                const savings = item.result ? Math.max(0, item.file.size - item.result.blob.size) : 0;
                return (
                  <article key={item.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
                    <div className="grid grid-cols-2 bg-muted/50">
                      {/* eslint-disable-next-line next/no-img-element -- The preview uses a local object URL and is never optimized remotely. */}
                      <img src={item.previewUrl} alt={`Vista original de ${item.file.name}`} className="h-44 w-full object-contain p-3" />
                      {item.result ? (
                        <>
                          {/* eslint-disable-next-line next/no-img-element -- The preview uses a local object URL and is never optimized remotely. */}
                          <img src={item.result.url} alt={`Resultado optimizado de ${item.file.name}`} className="h-44 w-full border-l border-border object-contain p-3" />
                        </>
                      ) : (
                        <div className="grid h-44 place-items-center border-l border-border px-4 text-center text-xs text-muted-foreground">El resultado aparecerá aquí</div>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium">{item.file.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.width}×{item.height} · {formatBytes(item.file.size)}
                          {item.result ? ` → ${item.result.width}×${item.result.height} · ${formatBytes(item.result.blob.size)}` : ''}
                        </p>
                        {savings > 0 ? <p className="mt-1 text-xs font-medium text-primary">Ahorro: {formatBytes(savings)}</p> : null}
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${item.file.name}`} onClick={() => removeItem(item.id)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
