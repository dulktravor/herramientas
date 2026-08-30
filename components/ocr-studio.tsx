'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop zone complements an accessible file input. */

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clipboard,
  Download,
  FileText,
  ImageUp,
  Languages,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import type { Worker } from 'tesseract.js';

import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Progress,
  ProgressLabel,
} from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { downloadBlob, formatBytes, replaceExtension } from '@/lib/browser-files';

type OcrLanguage = 'spa' | 'eng' | 'spa+eng';

const statusLabels: Record<string, string> = {
  'loading tesseract core': 'Preparando el motor OCR',
  'initializing tesseract': 'Inicializando el reconocimiento',
  'loading language traineddata': 'Descargando el modelo de idioma',
  'initializing api': 'Preparando el idioma',
  'recognizing text': 'Reconociendo el texto',
};

export function OcrStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [language, setLanguage] = useState<OcrLanguage>('spa');
  const [text, setText] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      void workerRef.current?.terminate();
    };
  }, [previewUrl]);

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Selecciona una imagen JPG, PNG o WebP válida.');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setError('La imagen no puede superar 20 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setText('');
    setConfidence(null);
    setProgress(0);
    setStatus('');
  }

  async function recognizeText() {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setText('');
    setConfidence(null);
    setProgress(0);
    setStatus('Preparando el reconocimiento');

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(language.split('+'), undefined, {
        logger: (message) => {
          setProgress(Math.round(message.progress * 100));
          setStatus(statusLabels[message.status] ?? 'Procesando la imagen');
        },
      });
      workerRef.current = worker;
      const result = await worker.recognize(file, { rotateAuto: true });
      const recognized = result.data.text.trim();
      setText(recognized);
      setConfidence(Math.round(result.data.confidence));
      setProgress(100);
      setStatus(recognized ? 'Texto extraído' : 'No se encontró texto legible');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible reconocer el texto de esta imagen.',
      );
      setStatus('');
    } finally {
      await workerRef.current?.terminate().catch(() => undefined);
      workerRef.current = null;
      setProcessing(false);
    }
  }

  async function cancelRecognition() {
    await workerRef.current?.terminate().catch(() => undefined);
    workerRef.current = null;
    setProcessing(false);
    setProgress(0);
    setStatus('Reconocimiento cancelado');
  }

  async function copyText() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  function downloadText() {
    if (!text || !file) return;
    downloadBlob(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
      replaceExtension(file.name, 'txt', '-texto'),
    );
  }

  function clearAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setText('');
    setConfidence(null);
    setProgress(0);
    setStatus('');
    setError('');
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <section
          className="rounded-3xl border border-dashed border-primary/35 bg-card p-6 text-center ring-1 ring-foreground/5 sm:p-9"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectFile(event.dataTransfer.files[0]);
          }}
          aria-labelledby="ocr-upload-title"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            <ImageUp className="size-6" aria-hidden="true" />
          </span>
          <h2 id="ocr-upload-title" className="mt-5 text-xl font-semibold tracking-tight">
            Sube una imagen con texto
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Capturas, documentos o fotografías JPG, PNG y WebP · máximo 20 MB
          </p>
          <label
            htmlFor="ocr-file"
            className={buttonVariants({ size: 'lg', className: 'mt-6 cursor-pointer rounded-xl px-5' })}
          >
            Seleccionar imagen
          </label>
          <input
            id="ocr-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
            <div className="grid min-h-80 place-items-center bg-muted/45 p-5">
              {/* eslint-disable-next-line next/no-img-element -- The preview is a local object URL. */}
              <img
                src={previewUrl}
                alt={`Imagen seleccionada: ${file.name}`}
                className="max-h-[32rem] max-w-full rounded-xl object-contain"
              />
            </div>
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={processing}>
                <RotateCcw aria-hidden="true" /> Cambiar
              </Button>
            </div>
          </section>

          <section className="flex min-h-[30rem] flex-col rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label htmlFor="ocr-language" className="space-y-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Languages className="size-4 text-primary" aria-hidden="true" /> Idioma del texto
                </span>
                <NativeSelect
                  id="ocr-language"
                  className="w-full sm:w-52"
                  value={language}
                  disabled={processing}
                  onChange={(event) => setLanguage(event.target.value as OcrLanguage)}
                >
                  <NativeSelectOption value="spa">Español</NativeSelectOption>
                  <NativeSelectOption value="eng">Inglés</NativeSelectOption>
                  <NativeSelectOption value="spa+eng">Español + inglés</NativeSelectOption>
                </NativeSelect>
              </label>
              <div className="flex gap-2">
                {processing ? (
                  <Button variant="outline" className="rounded-xl" onClick={() => void cancelRecognition()}>
                    Cancelar
                  </Button>
                ) : null}
                <Button className="rounded-xl" onClick={() => void recognizeText()} disabled={processing}>
                  {processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                  {processing ? 'Reconociendo…' : 'Extraer texto'}
                </Button>
              </div>
            </div>

            {processing || status ? (
              <Progress value={progress} className="mt-6">
                <ProgressLabel>{status}</ProgressLabel>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">{progress}%</span>
              </Progress>
            ) : null}

            <div className="mt-6 flex flex-1 flex-col">
              <label htmlFor="ocr-result" className="mb-2 flex items-center justify-between gap-4 text-sm font-medium">
                Texto extraído
                {confidence !== null ? (
                  <span className="text-xs font-normal text-muted-foreground">Confianza aproximada: {confidence}%</span>
                ) : null}
              </label>
              <Textarea
                id="ocr-result"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="El texto reconocido aparecerá aquí y podrás editarlo."
                className="min-h-64 flex-1 resize-y rounded-xl font-mono leading-6"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" className="rounded-xl" onClick={() => void copyText()} disabled={!text}>
                  {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={downloadText} disabled={!text}>
                  <Download aria-hidden="true" /> Descargar TXT
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <p className="text-center text-xs leading-5 text-muted-foreground">
        La imagen se analiza en tu navegador. La primera ejecución descarga el modelo del idioma, pero tu archivo no se envía al servidor.
      </p>
    </div>
  );
}
