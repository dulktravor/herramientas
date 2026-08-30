'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Drop zones complement accessible file inputs. */

import { useEffect, useRef, useState } from 'react';
import * as exifr from 'exifr';
import {
  CheckCircle2,
  Download,
  Eraser,
  FileWarning,
  ImageUp,
  LoaderCircle,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { downloadBlob, formatBytes, replaceExtension } from '@/lib/browser-files';

type MetadataEntry = { label: string; value: string; sensitive?: boolean };

type LoadedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  entries: MetadataEntry[];
  cleanResult?: { blob: Blob; url: string; filename: string };
};

const labels: Record<string, string> = {
  Make: 'Fabricante',
  Model: 'Dispositivo',
  Software: 'Programa',
  DateTimeOriginal: 'Fecha original',
  CreateDate: 'Fecha de creación',
  ModifyDate: 'Fecha de modificación',
  latitude: 'Latitud GPS',
  longitude: 'Longitud GPS',
  GPSLatitude: 'Latitud GPS',
  GPSLongitude: 'Longitud GPS',
  Orientation: 'Orientación',
  Artist: 'Autor',
  Copyright: 'Copyright',
  ImageDescription: 'Descripción',
  LensModel: 'Lente',
  ExposureTime: 'Exposición',
  FNumber: 'Apertura',
  ISO: 'ISO',
  FocalLength: 'Distancia focal',
};

const sensitiveKeys = new Set([
  'latitude',
  'longitude',
  'GPSLatitude',
  'GPSLongitude',
  'GPSPosition',
  'Artist',
  'Copyright',
  'SerialNumber',
  'BodySerialNumber',
]);

function stringifyMetadataValue(value: unknown) {
  if (value instanceof Date) return value.toLocaleString('es-CO');
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(6);
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  return '';
}

async function stripMetadata(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('No fue posible preparar la copia limpia.');
  }
  if (file.type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const mime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('No fue posible generar la copia limpia.'))),
      mime,
      mime === 'image/png' ? undefined : 0.95,
    );
  });
  return { blob, extension: mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] };
}

export function MetadataCleaner() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState('');
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const currentUrls = urls.current;
    return () => currentUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function loadFile(file: File) {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError('La imagen no puede superar 30 MB.');
      return;
    }

    setLoading(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();

      const raw = (await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        interop: true,
      })) as Record<string, unknown> | undefined;

      const entries = Object.entries(raw ?? {})
        .map(([key, value]) => ({
          label: labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2'),
          value: stringifyMetadataValue(value),
          sensitive: sensitiveKeys.has(key),
        }))
        .filter((entry) => entry.value)
        .slice(0, 50);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
        if (image.cleanResult) URL.revokeObjectURL(image.cleanResult.url);
      }
      const previewUrl = URL.createObjectURL(file);
      urls.current.add(previewUrl);
      setImage({ file, previewUrl, entries, ...dimensions });
    } catch {
      setError('No fue posible leer esta imagen. Puede estar dañada o usar un formato no compatible.');
    } finally {
      setLoading(false);
    }
  }

  async function cleanImage() {
    if (!image) return;
    setCleaning(true);
    setError('');
    try {
      const result = await stripMetadata(image.file);
      if (image.cleanResult) URL.revokeObjectURL(image.cleanResult.url);
      const url = URL.createObjectURL(result.blob);
      urls.current.add(url);
      setImage({
        ...image,
        cleanResult: {
          blob: result.blob,
          url,
          filename: replaceExtension(image.file.name, result.extension, '-sin-metadatos'),
        },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible limpiar la imagen.');
    } finally {
      setCleaning(false);
    }
  }

  const sensitiveCount = image?.entries.filter((entry) => entry.sensitive).length ?? 0;

  return (
    <div className="space-y-6">
      {!image ? (
        <section
          className="rounded-3xl border border-dashed border-primary/35 bg-card p-7 text-center ring-1 ring-foreground/5 sm:p-10"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void loadFile(file);
          }}
          aria-labelledby="metadata-upload-title"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            {loading ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : <ImageUp className="size-6" aria-hidden="true" />}
          </span>
          <h2 id="metadata-upload-title" className="mt-5 text-xl font-semibold tracking-tight">Comprueba qué revela tu foto</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Analiza EXIF, ubicación GPS, dispositivo, fechas y autor sin subir la imagen.</p>
          <label htmlFor="metadata-file" className={buttonVariants({ size: 'lg', className: 'mt-6 cursor-pointer rounded-xl px-5' })}>
            Seleccionar imagen
          </label>
          <input
            id="metadata-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
            }}
          />
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
            {/* eslint-disable-next-line next/no-img-element -- The preview uses a local object URL and is never optimized remotely. */}
            <img src={image.previewUrl} alt={`Vista de ${image.file.name}`} className="h-72 w-full bg-muted/40 object-contain p-4" />
            <div className="p-5">
              <h2 className="truncate font-semibold">{image.file.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{image.width}×{image.height} · {formatBytes(image.file.size)}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button className="rounded-xl" onClick={() => void cleanImage()} disabled={cleaning}>
                  {cleaning ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Eraser aria-hidden="true" />}
                  {cleaning ? 'Limpiando…' : 'Crear copia limpia'}
                </Button>
                <label htmlFor="metadata-replace" className={buttonVariants({ variant: 'outline', className: 'cursor-pointer rounded-xl' })}>Cambiar imagen</label>
                <input
                  id="metadata-replace"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void loadFile(file);
                  }}
                />
              </div>
              {image.cleanResult ? (
                <div className="mt-5 rounded-2xl bg-secondary p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4" aria-hidden="true" /> Copia sin metadatos creada</p>
                  <p className="mt-1 text-xs text-muted-foreground">Nuevo tamaño: {formatBytes(image.cleanResult.blob.size)}</p>
                  <Button variant="secondary" className="mt-3 w-full rounded-xl" onClick={() => downloadBlob(image.cleanResult!.blob, image.cleanResult!.filename)}>
                    <Download aria-hidden="true" /> Descargar copia limpia
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-6 ring-1 ring-foreground/10" aria-labelledby="metadata-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">Inspección local</p>
                <h2 id="metadata-title" className="mt-1 text-xl font-semibold tracking-tight">Metadatos encontrados</h2>
              </div>
              {sensitiveCount > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"><MapPin className="size-3.5" aria-hidden="true" /> {sensitiveCount} sensibles</span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary"><ShieldCheck className="size-3.5" aria-hidden="true" /> Sin datos sensibles detectados</span>
              )}
            </div>

            {image.entries.length > 0 ? (
              <dl className="mt-6 divide-y divide-border">
                {image.entries.map((entry, index) => (
                  <div key={`${entry.label}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <dt className="text-sm text-muted-foreground">{entry.label}</dt>
                    <dd className={entry.sensitive ? 'break-words text-sm font-medium text-destructive' : 'break-words text-sm font-medium'}>{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <FileWarning className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">No se encontraron metadatos EXIF legibles</p>
                <p className="mt-1 text-xs text-muted-foreground">Aun así, puedes generar una copia normalizada.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
