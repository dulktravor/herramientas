'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop zone complements an accessible file input. */
/* eslint-disable jsx-a11y/media-has-caption -- User-provided audio has no separate caption track. */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  LoaderCircle,
  Music2,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  downloadBlob,
  formatBytes,
  makeId,
  replaceExtension,
} from '@/lib/browser-files';

type AudioItem = {
  id: string;
  file: File;
  url: string;
  buffer: AudioBuffer;
  trimStart: number;
  trimEnd: number;
  volume: number;
  speed: number;
  fadeIn: number;
  fadeOut: number;
};

type AudioResult = {
  blob: Blob;
  url: string;
  filename: string;
  duration: number;
  sampleRate: number;
  channels: number;
};

const MAX_FILES = 8;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_TOTAL_DURATION = 20 * 60;
const SUPPORTED_EXTENSIONS = new Set([
  'aac',
  'flac',
  'm4a',
  'mp3',
  'oga',
  'ogg',
  'wav',
]);

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds - minutes * 60;
  return `${minutes}:${remainder.toFixed(1).padStart(4, '0')}`;
}

function isSupportedAudio(file: File) {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase('en') ?? '';
  return file.type.startsWith('audio/') || SUPPORTED_EXTENSIONS.has(extension);
}

function assertNotCancelled(signal: AbortSignal) {
  if (signal.aborted)
    throw new DOMException('Operación cancelada', 'AbortError');
}

async function findPeak(
  buffer: AudioBuffer,
  start: number,
  end: number,
  signal: AbortSignal,
) {
  const firstSample = Math.max(0, Math.floor(start * buffer.sampleRate));
  const lastSample = Math.min(
    buffer.length,
    Math.ceil(end * buffer.sampleRate),
  );
  let peak = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = firstSample; index < lastSample; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index] ?? 0));
      if (index > firstSample && index % 1_000_000 === 0) {
        assertNotCancelled(signal);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }
    }
  }

  return peak;
}

async function renderAudio(
  items: AudioItem[],
  normalize: boolean,
  signal: AbortSignal,
  onProgress: (value: number, label: string) => void,
) {
  const sampleRate = Math.min(
    48_000,
    Math.max(...items.map((item) => item.buffer.sampleRate)),
  );
  const channels = Math.min(
    2,
    Math.max(...items.map((item) => item.buffer.numberOfChannels)),
  );
  const durations = items.map(
    (item) => (item.trimEnd - item.trimStart) / item.speed,
  );
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  const frameCount = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const estimatedBytes = frameCount * channels * 4;

  if (estimatedBytes > 350 * 1024 * 1024) {
    throw new Error(
      'El resultado requiere demasiada memoria. Reduce la duración total de las pistas.',
    );
  }

  const peaks: number[] = [];
  for (let index = 0; index < items.length; index += 1) {
    assertNotCancelled(signal);
    onProgress(
      10 + Math.round((index / items.length) * 25),
      `Analizando pista ${index + 1} de ${items.length}`,
    );
    peaks.push(
      normalize
        ? await findPeak(
            items[index].buffer,
            items[index].trimStart,
            items[index].trimEnd,
            signal,
          )
        : 1,
    );
  }

  assertNotCancelled(signal);
  onProgress(42, 'Preparando la mezcla');
  const context = new OfflineAudioContext(channels, frameCount, sampleRate);
  let offset = 0;

  items.forEach((item, index) => {
    const outputDuration = durations[index];
    const source = context.createBufferSource();
    const gain = context.createGain();
    const normalizationGain =
      normalize && peaks[index] > 0 ? Math.min(8, 0.98 / peaks[index]) : 1;
    const baseGain = (item.volume / 100) * normalizationGain;
    const fadeIn = Math.min(item.fadeIn, outputDuration / 2);
    const fadeOut = Math.min(item.fadeOut, outputDuration / 2);

    source.buffer = item.buffer;
    source.playbackRate.value = item.speed;
    source.connect(gain).connect(context.destination);
    gain.gain.setValueAtTime(fadeIn > 0 ? 0 : baseGain, offset);
    if (fadeIn > 0)
      gain.gain.linearRampToValueAtTime(baseGain, offset + fadeIn);
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(baseGain, offset + outputDuration - fadeOut);
      gain.gain.linearRampToValueAtTime(0, offset + outputDuration);
    }
    source.start(offset, item.trimStart, item.trimEnd - item.trimStart);
    offset += outputDuration;
  });

  onProgress(55, 'Procesando el audio');
  const rendered = await context.startRendering();
  assertNotCancelled(signal);
  return rendered;
}

async function encodeWav(
  buffer: AudioBuffer,
  signal: AbortSignal,
  onProgress: (value: number, label: string) => void,
) {
  const channels = buffer.numberOfChannels;
  const bytesPerSample = 2;
  const dataLength = buffer.length * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataLength);
  const view = new DataView(output);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1)
      view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from({ length: channels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  let offset = 44;
  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(
        -1,
        Math.min(1, channelData[channel][sampleIndex] ?? 0),
      );
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += bytesPerSample;
    }
    if (sampleIndex > 0 && sampleIndex % 250_000 === 0) {
      assertNotCancelled(signal);
      onProgress(
        72 + Math.round((sampleIndex / buffer.length) * 27),
        'Creando el archivo WAV',
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }

  assertNotCancelled(signal);
  return new Blob([output], { type: 'audio/wav' });
}

function Waveform({
  item,
  currentTime,
  onSeek,
}: {
  item: AudioItem;
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) return;
      context.scale(ratio, ratio);
      const styles = getComputedStyle(document.documentElement);
      const primary = styles.getPropertyValue('--primary').trim() || '#0f6b70';
      const muted = styles.getPropertyValue('--muted').trim() || '#e7e5e4';
      const width = bounds.width;
      const height = bounds.height;
      const center = height / 2;
      const samples = item.buffer.getChannelData(0);
      const columns = Math.max(1, Math.floor(width));
      const samplesPerColumn = Math.max(
        1,
        Math.floor(samples.length / columns),
      );

      context.clearRect(0, 0, width, height);
      context.fillStyle = muted;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = primary;
      context.lineWidth = 1;
      context.beginPath();
      for (let column = 0; column < columns; column += 1) {
        let peak = 0;
        const start = column * samplesPerColumn;
        const end = Math.min(samples.length, start + samplesPerColumn);
        for (let index = start; index < end; index += 1)
          peak = Math.max(peak, Math.abs(samples[index] ?? 0));
        const amplitude = Math.max(1, peak * (height * 0.43));
        context.moveTo(column + 0.5, center - amplitude);
        context.lineTo(column + 0.5, center + amplitude);
      }
      context.stroke();

      const trimStartX = (item.trimStart / item.buffer.duration) * width;
      const trimEndX = (item.trimEnd / item.buffer.duration) * width;
      context.fillStyle = 'rgba(15, 23, 42, 0.45)';
      context.fillRect(0, 0, trimStartX, height);
      context.fillRect(trimEndX, 0, width - trimEndX, height);
      context.fillStyle = '#ffffff';
      context.fillRect(
        (currentTime / item.buffer.duration) * width,
        0,
        2,
        height,
      );
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [currentTime, item]);

  return (
    <canvas
      ref={canvasRef}
      className="h-32 w-full cursor-pointer rounded-xl"
      aria-label={`Forma de onda de ${item.file.name}`}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onSeek(
          ((event.clientX - bounds.left) / bounds.width) * item.buffer.duration,
        );
      }}
    >
      Forma de onda de {item.file.name}
    </canvas>
  );
}

export function AudioStudio() {
  const [items, setItems] = useState<AudioItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [normalize, setNormalize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<AudioResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urls = useRef(new Set<string>());
  const abortRef = useRef<AbortController | null>(null);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [activeId, items],
  );
  const totalSourceDuration = items.reduce(
    (sum, item) => sum + item.buffer.duration,
    0,
  );
  const outputDuration = items.reduce(
    (sum, item) => sum + (item.trimEnd - item.trimStart) / item.speed,
    0,
  );

  useEffect(() => {
    const currentUrls = urls.current;
    return () => {
      abortRef.current?.abort();
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function revokeUrl(url: string) {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }

  function discardResult() {
    setResult((current) => {
      if (current) revokeUrl(current.url);
      return null;
    });
    setNotice('');
  }

  async function addFiles(files: FileList | File[]) {
    setError('');
    setNotice('');
    const requested = Array.from(files);
    const valid = requested.filter(isSupportedAudio);
    if (valid.length !== requested.length || valid.length === 0) {
      setError('Selecciona archivos MP3, WAV, OGG, FLAC, AAC o M4A válidos.');
    }
    const slots = Math.max(0, MAX_FILES - items.length);
    const existingBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    let acceptedBytes = existingBytes;
    const accepted = valid.slice(0, slots).filter((file) => {
      if (
        file.size > MAX_FILE_BYTES ||
        acceptedBytes + file.size > MAX_TOTAL_BYTES
      )
        return false;
      acceptedBytes += file.size;
      return true;
    });
    if (accepted.length !== valid.length)
      setError(
        'Se admiten hasta 8 pistas, 100 MB por archivo y 200 MB en total.',
      );
    if (accepted.length === 0) return;

    setLoading(true);
    discardResult();
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      const decoded: AudioItem[] = [];
      let accumulatedDuration = totalSourceDuration;
      for (const file of accepted) {
        try {
          const buffer = await context.decodeAudioData(
            await file.arrayBuffer(),
          );
          if (accumulatedDuration + buffer.duration > MAX_TOTAL_DURATION) {
            setError(
              'La duración total no puede superar 20 minutos en esta primera versión.',
            );
            break;
          }
          accumulatedDuration += buffer.duration;
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          decoded.push({
            id: makeId('audio'),
            file,
            url,
            buffer,
            trimStart: 0,
            trimEnd: buffer.duration,
            volume: 100,
            speed: 1,
            fadeIn: 0,
            fadeOut: 0,
          });
        } catch {
          setError(
            `No fue posible decodificar “${file.name}” en este navegador.`,
          );
        }
      }
      if (decoded.length > 0) {
        setItems((current) => [...current, ...decoded]);
        setActiveId((current) => current ?? decoded[0].id);
      }
    } catch {
      setError('Este navegador no ofrece el motor de audio necesario.');
    } finally {
      await context?.close();
      setLoading(false);
    }
  }

  function updateItem(
    id: string,
    patch: Partial<
      Pick<
        AudioItem,
        'trimStart' | 'trimEnd' | 'volume' | 'speed' | 'fadeIn' | 'fadeOut'
      >
    >,
  ) {
    discardResult();
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    discardResult();
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) revokeUrl(item.url);
      const remaining = current.filter((entry) => entry.id !== id);
      setActiveId((selected) =>
        selected === id ? (remaining[0]?.id ?? null) : selected,
      );
      return remaining;
    });
  }

  function moveItem(id: string, direction: -1 | 1) {
    discardResult();
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length)
        return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function resetActiveItem() {
    if (!activeItem) return;
    updateItem(activeItem.id, {
      trimStart: 0,
      trimEnd: activeItem.buffer.duration,
      volume: 100,
      speed: 1,
      fadeIn: 0,
      fadeOut: 0,
    });
  }

  function clearAll() {
    abortRef.current?.abort();
    items.forEach((item) => revokeUrl(item.url));
    if (result) revokeUrl(result.url);
    setItems([]);
    setActiveId(null);
    setResult(null);
    setNormalize(false);
    setError('');
    setNotice('');
    setProgress(0);
  }

  function seek(time: number) {
    if (!activeItem || !audioRef.current) return;
    const boundedTime = Math.min(
      activeItem.trimEnd,
      Math.max(activeItem.trimStart, time),
    );
    audioRef.current.currentTime = boundedTime;
    setCurrentTime(boundedTime);
  }

  async function playSelection() {
    if (!activeItem || !audioRef.current) return;
    const audio = audioRef.current;
    if (
      audio.currentTime < activeItem.trimStart ||
      audio.currentTime >= activeItem.trimEnd
    )
      seek(activeItem.trimStart);
    audio.playbackRate = activeItem.speed;
    await audio.play();
  }

  async function processItems() {
    if (items.length === 0) return;
    discardResult();
    setError('');
    setNotice('');
    setProcessing(true);
    setProgress(5);
    setProgressLabel('Comprobando las pistas');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const rendered = await renderAudio(
        items,
        normalize,
        controller.signal,
        (value, label) => {
          setProgress(value);
          setProgressLabel(label);
        },
      );
      const blob = await encodeWav(
        rendered,
        controller.signal,
        (value, label) => {
          setProgress(value);
          setProgressLabel(label);
        },
      );
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      const filename =
        items.length === 1
          ? replaceExtension(items[0].file.name, 'wav', '-editado')
          : 'audios-unidos.wav';
      setResult({
        blob,
        url,
        filename,
        duration: rendered.duration,
        sampleRate: rendered.sampleRate,
        channels: rendered.numberOfChannels,
      });
      setProgress(100);
      setProgressLabel('Archivo listo');
      setNotice(
        items.length === 1
          ? 'La pista procesada está lista para descargar.'
          : 'Las pistas se unieron en el orden mostrado.',
      );
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError')
        setNotice(
          'Operación cancelada. Tus pistas originales siguen disponibles.',
        );
      else
        setError(
          cause instanceof Error
            ? cause.message
            : 'No fue posible procesar el audio.',
        );
    } finally {
      abortRef.current = null;
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-dashed border-primary/35 bg-card p-6 text-center ring-1 ring-foreground/5 sm:p-9"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!loading && !processing) void addFiles(event.dataTransfer.files);
        }}
        aria-labelledby="audio-upload-title"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          {loading ? (
            <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
          ) : (
            <Music2 className="size-6" aria-hidden="true" />
          )}
        </span>
        <h2
          id="audio-upload-title"
          className="mt-5 text-xl font-semibold tracking-tight"
        >
          {items.length > 0
            ? 'Añade otra pista'
            : 'Carga una pista para empezar'}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          MP3, WAV, OGG, FLAC, AAC o M4A · hasta 8 pistas · 100 MB por archivo ·
          20 minutos en total
        </p>
        <label
          htmlFor="audio-files"
          aria-disabled={loading || processing}
          className={buttonVariants({
            size: 'lg',
            className:
              'mt-6 cursor-pointer rounded-xl px-5 aria-disabled:pointer-events-none aria-disabled:opacity-50',
          })}
        >
          <Upload aria-hidden="true" />
          {loading ? 'Leyendo audio…' : 'Seleccionar audio'}
        </label>
        <input
          id="audio-files"
          type="file"
          accept="audio/*,.flac,.m4a,.aac"
          multiple
          disabled={loading || processing}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </section>

      {error ? (
        <Alert variant="destructive">
          <X aria-hidden="true" />
          <AlertTitle>No se pudo completar la operación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert className="border-primary/25 bg-secondary/45">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>
            {result ? 'Resultado listo' : 'Proceso detenido'}
          </AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      {items.length > 0 ? (
        <>
          <section
            className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
            aria-label="Editor de audio"
          >
            <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">
                    Orden de unión
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Tus pistas
                  </h2>
                </div>
                <Badge variant="secondary">
                  {items.length}/{MAX_FILES}
                </Badge>
              </div>
              <div className="mt-5 space-y-3">
                {items.map((item, index) => (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-3 transition-colors ${activeItem?.id === item.id ? 'border-primary bg-secondary/45' : 'border-border bg-background'}`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setActiveId(item.id);
                        setCurrentTime(item.trimStart);
                      }}
                    >
                      <span className="block truncate text-sm font-semibold">
                        {index + 1}. {item.file.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDuration(item.buffer.duration)} ·{' '}
                        {item.buffer.numberOfChannels === 1
                          ? 'Mono'
                          : `${item.buffer.numberOfChannels} canales`}{' '}
                        · {(item.buffer.sampleRate / 1000).toFixed(1)} kHz ·{' '}
                        {formatBytes(item.file.size)}
                      </span>
                    </button>
                    <div className="mt-3 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Subir ${item.file.name}`}
                        disabled={index === 0 || processing}
                        onClick={() => moveItem(item.id, -1)}
                      >
                        <ChevronUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Bajar ${item.file.name}`}
                        disabled={index === items.length - 1 || processing}
                        onClick={() => moveItem(item.id, 1)}
                      >
                        <ChevronDown aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto"
                        aria-label={`Eliminar ${item.file.name}`}
                        disabled={processing}
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {activeItem ? (
              <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">
                      Edición no destructiva
                    </p>
                    <h2 className="mt-1 truncate text-xl font-semibold tracking-tight">
                      {activeItem.file.name}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={resetActiveItem}
                    disabled={processing}
                  >
                    <RotateCcw aria-hidden="true" />
                    Restablecer
                  </Button>
                </div>
                <div className="mt-5">
                  <Waveform
                    item={activeItem}
                    currentTime={currentTime}
                    onSeek={seek}
                  />
                  <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
                    <span>{formatDuration(activeItem.trimStart)}</span>
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(activeItem.trimEnd)}</span>
                  </div>
                </div>
                <audio
                  key={activeItem.id}
                  ref={audioRef}
                  src={activeItem.url}
                  preload="metadata"
                  className="mt-4 w-full"
                  controls
                  onLoadedMetadata={(event) => {
                    event.currentTarget.currentTime = activeItem.trimStart;
                    event.currentTarget.playbackRate = activeItem.speed;
                  }}
                  onTimeUpdate={(event) => {
                    const time = event.currentTarget.currentTime;
                    setCurrentTime(time);
                    if (time >= activeItem.trimEnd) {
                      event.currentTarget.pause();
                      event.currentTarget.currentTime = activeItem.trimStart;
                      setCurrentTime(activeItem.trimStart);
                    }
                  }}
                />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label
                    htmlFor="trim-start"
                    className="space-y-2 text-sm font-medium"
                  >
                    Inicio (segundos)
                    <Input
                      id="trim-start"
                      type="number"
                      min={0}
                      max={Math.max(0, activeItem.trimEnd - 0.01)}
                      step={0.01}
                      value={Number(activeItem.trimStart.toFixed(2))}
                      disabled={processing}
                      onChange={(event) =>
                        updateItem(activeItem.id, {
                          trimStart: Math.min(
                            activeItem.trimEnd - 0.01,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        })
                      }
                    />
                  </label>
                  <label
                    htmlFor="trim-end"
                    className="space-y-2 text-sm font-medium"
                  >
                    Final (segundos)
                    <Input
                      id="trim-end"
                      type="number"
                      min={activeItem.trimStart + 0.01}
                      max={activeItem.buffer.duration}
                      step={0.01}
                      value={Number(activeItem.trimEnd.toFixed(2))}
                      disabled={processing}
                      onChange={(event) =>
                        updateItem(activeItem.id, {
                          trimEnd: Math.min(
                            activeItem.buffer.duration,
                            Math.max(
                              activeItem.trimStart + 0.01,
                              Number(event.target.value) ||
                                activeItem.buffer.duration,
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                  <div className="space-y-3 text-sm font-medium sm:col-span-2">
                    <div className="flex justify-between gap-4">
                      <span>Volumen</span>
                      <span className="text-muted-foreground">
                        {activeItem.volume}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={200}
                      step={1}
                      value={[activeItem.volume]}
                      disabled={processing}
                      onValueChange={(value) =>
                        updateItem(activeItem.id, {
                          volume: Array.isArray(value)
                            ? (value[0] ?? 100)
                            : value,
                        })
                      }
                      aria-label="Volumen de la pista"
                    />
                  </div>
                  <div className="space-y-3 text-sm font-medium sm:col-span-2">
                    <div className="flex justify-between gap-4">
                      <span>Velocidad</span>
                      <span className="text-muted-foreground">
                        {activeItem.speed.toFixed(2)}×
                      </span>
                    </div>
                    <Slider
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={[activeItem.speed]}
                      disabled={processing}
                      onValueChange={(value) => {
                        const speed = Array.isArray(value)
                          ? (value[0] ?? 1)
                          : value;
                        updateItem(activeItem.id, { speed });
                        if (audioRef.current)
                          audioRef.current.playbackRate = speed;
                      }}
                      aria-label="Velocidad de la pista"
                    />
                  </div>
                  <label
                    htmlFor="fade-in"
                    className="space-y-2 text-sm font-medium"
                  >
                    Entrada gradual (s)
                    <Input
                      id="fade-in"
                      type="number"
                      min={0}
                      max={(activeItem.trimEnd - activeItem.trimStart) / 2}
                      step={0.1}
                      value={activeItem.fadeIn}
                      disabled={processing}
                      onChange={(event) =>
                        updateItem(activeItem.id, {
                          fadeIn: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </label>
                  <label
                    htmlFor="fade-out"
                    className="space-y-2 text-sm font-medium"
                  >
                    Salida gradual (s)
                    <Input
                      id="fade-out"
                      type="number"
                      min={0}
                      max={(activeItem.trimEnd - activeItem.trimStart) / 2}
                      step={0.1}
                      value={activeItem.fadeOut}
                      disabled={processing}
                      onChange={(event) =>
                        updateItem(activeItem.id, {
                          fadeOut: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </label>
                </div>
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => void playSelection()}
                  disabled={processing}
                >
                  <Play aria-hidden="true" />
                  Reproducir selección
                </Button>
              </div>
            ) : null}
          </section>

          <section
            className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
            aria-labelledby="audio-export-title"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Salida</p>
                <h2
                  id="audio-export-title"
                  className="mt-1 text-xl font-semibold tracking-tight"
                >
                  WAV PCM de 16 bits
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {items.length === 1
                    ? 'Procesa la selección de la pista.'
                    : `Une ${items.length} pistas en el orden indicado.`}{' '}
                  Duración estimada: {formatDuration(outputDuration)}.
                </p>
              </div>
              <div className="flex min-h-12 items-center justify-between gap-5 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium lg:min-w-64">
                <label htmlFor="normalize-audio">
                  Normalizar niveles
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Analiza el pico de cada pista
                  </span>
                </label>
                <Switch
                  id="normalize-audio"
                  checked={normalize}
                  disabled={processing}
                  onCheckedChange={(checked) => {
                    discardResult();
                    setNormalize(checked);
                  }}
                  aria-label="Normalizar niveles"
                />
              </div>
            </div>
            {processing || progress > 0 ? (
              <Progress
                value={progress}
                className="mt-5"
                aria-label={progressLabel}
              >
                <ProgressLabel>{progressLabel}</ProgressLabel>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  {progress}%
                </span>
              </Progress>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="rounded-xl px-5"
                onClick={() => void processItems()}
                disabled={processing || loading}
              >
                {processing ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <SlidersHorizontal aria-hidden="true" />
                )}
                {processing
                  ? 'Procesando…'
                  : items.length === 1
                    ? 'Procesar pista'
                    : 'Unir y procesar'}
              </Button>
              {processing ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl px-5"
                  onClick={() => abortRef.current?.abort()}
                >
                  <X aria-hidden="true" />
                  Cancelar
                </Button>
              ) : null}
              {result ? (
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-xl px-5"
                  onClick={() => downloadBlob(result.blob, result.filename)}
                >
                  <Download aria-hidden="true" />
                  Descargar {result.filename}
                </Button>
              ) : null}
              <Button
                size="lg"
                variant="ghost"
                className="rounded-xl px-5"
                onClick={clearAll}
                disabled={processing}
              >
                <Trash2 aria-hidden="true" />
                Limpiar todo
              </Button>
            </div>
            {result ? (
              <div className="mt-5 rounded-2xl border border-primary/20 bg-secondary/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold">{result.filename}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDuration(result.duration)} ·{' '}
                      {result.channels === 1 ? 'Mono' : 'Estéreo'} ·{' '}
                      {(result.sampleRate / 1000).toFixed(1)} kHz ·{' '}
                      {formatBytes(result.blob.size)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle2 aria-hidden="true" /> Listo
                  </Badge>
                </div>
                <audio
                  src={result.url}
                  controls
                  className="mt-4 w-full"
                  aria-label="Previsualización del resultado"
                />
              </div>
            ) : null}
          </section>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            La decodificación depende de los formatos admitidos por tu
            navegador. Esta primera versión exporta WAV; las conversiones
            avanzadas llegarán con el motor opcional de formatos.
          </p>
        </>
      ) : (
        <section
          className="grid gap-4 rounded-3xl bg-card p-6 ring-1 ring-foreground/10 sm:grid-cols-3"
          aria-label="Funciones del estudio"
        >
          {[
            [
              'Recorta con precisión',
              'Define el inicio y el final de cada pista.',
            ],
            [
              'Ajusta el sonido',
              'Controla volumen, normalización, velocidad y fundidos.',
            ],
            [
              'Exporta localmente',
              'Descarga un WAV procesado desde tu dispositivo.',
            ],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl bg-muted/55 p-4">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
