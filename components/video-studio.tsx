'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- The drop zone complements an accessible file input. */
/* eslint-disable jsx-a11y/media-has-caption -- User-provided video has no separate caption track. */
/* eslint-disable @next/next/no-img-element -- User-generated blob URLs cannot be statically optimized. */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Film,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  downloadBlob,
  formatBytes,
  makeId,
  replaceExtension,
} from '@/lib/browser-files';
import {
  calculateOutputDimensions,
  processVideoJob,
  terminateFfmpegEngine,
  type VideoAspectRatio,
  type VideoFitMode,
  type VideoJobResult,
  type VideoOutputFormat,
  type VideoQualityPreset,
  type VideoResolutionPreset,
  type VideoTextPosition,
  type VideoTextSize,
} from '@/lib/video-processor';

type VideoInfo = {
  id: string;
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
};

type SubtitlesFileInfo = {
  file: File;
  content: string;
};

const MAX_DESKTOP_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_MOBILE_BYTES = 150 * 1024 * 1024;  // 150 MB
const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'mkv',
  'avi',
  'm4v',
  'ogv',
]);

function formatTimecode(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const minsFormatted = String(mins).padStart(2, '0');
  const secsFormatted = secs.toFixed(1).padStart(4, '0');
  return `${minsFormatted}:${secsFormatted}`;
}

function isSupportedVideo(file: File) {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase('en') ?? '';
  return file.type.startsWith('video/') || SUPPORTED_VIDEO_EXTENSIONS.has(extension);
}

export function VideoStudio() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [extraAudioFile, setExtraAudioFile] = useState<File | null>(null);
  const [subtitlesInfo, setSubtitlesInfo] = useState<SubtitlesFileInfo | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Editing settings
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('original');
  const [fitMode, setFitMode] = useState<VideoFitMode>('contain');
  const [resolution, setResolution] = useState<VideoResolutionPreset>('original');
  const [videoFps, setVideoFps] = useState<number>(0); // 0 = original

  const [muteOriginal, setMuteOriginal] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(100);
  const [extraAudioVolume, setExtraAudioVolume] = useState(100);

  const [overlayText, setOverlayText] = useState('');
  const [textPosition, setTextPosition] = useState<VideoTextPosition>('bottom');
  const [textSize, setTextSize] = useState<VideoTextSize>('md');

  const [outputFormat, setOutputFormat] = useState<VideoOutputFormat>('mp4');
  const [quality, setQuality] = useState<VideoQualityPreset>('balanced');
  const [gifFps, setGifFps] = useState<number>(12);

  // Operation state
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<VideoJobResult | null>(null);
  const [isMobileDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  });

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const urls = useRef(new Set<string>());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const currentUrls = urls.current;
    return () => {
      abortRef.current?.abort();
      terminateFfmpegEngine();
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function registerUrl(url: string) {
    urls.current.add(url);
    return url;
  }

  function revokeUrl(url: string) {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }

  function clearResult() {
    setResult((current) => {
      if (current) revokeUrl(URL.createObjectURL(current.blob));
      return null;
    });
    setNotice('');
  }

  // Load video file
  async function handleVideoLoad(file: File) {
    setError('');
    setNotice('');
    clearResult();

    if (!isSupportedVideo(file)) {
      setError('Formato no compatible. Por favor sube un archivo MP4, WebM, MOV, MKV o AVI.');
      return;
    }

    const maxAllowedBytes = isMobileDevice ? MAX_MOBILE_BYTES : MAX_DESKTOP_BYTES;
    if (file.size > maxAllowedBytes) {
      setError(
        `El archivo supera el límite recomendado para este dispositivo (${formatBytes(maxAllowedBytes)}). Reduce el tamaño para evitar problemas de memoria.`,
      );
      return;
    }

    setLoading(true);

    const objectUrl = registerUrl(URL.createObjectURL(file));
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 0;
      if (dur <= 0 || !Number.isFinite(dur)) {
        setError('No se pudo determinar la duración del vídeo.');
        setLoading(false);
        return;
      }

      const w = tempVideo.videoWidth || 1280;
      const h = tempVideo.videoHeight || 720;

      if (videoInfo) {
        revokeUrl(videoInfo.url);
      }

      setVideoInfo({
        id: makeId('vid'),
        file,
        url: objectUrl,
        duration: dur,
        width: w,
        height: h,
      });

      setTrimStart(0);
      setTrimEnd(dur);
      setCurrentTime(0);
      setLoading(false);
    };

    tempVideo.onerror = () => {
      setError('No fue posible leer el archivo de vídeo en este navegador. Comprueba que el archivo no esté dañado.');
      revokeUrl(objectUrl);
      setLoading(false);
    };
  }

  // Load extra audio track
  function handleExtraAudioLoad(file: File) {
    setError('');
    clearResult();
    const ext = file.name.split('.').pop()?.toLocaleLowerCase('en') ?? '';
    const validExts = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac']);

    if (!file.type.startsWith('audio/') && !validExts.has(ext)) {
      setError('Por favor selecciona un archivo de audio válido (MP3, WAV, M4A, AAC u OGG).');
      return;
    }

    setExtraAudioFile(file);
    setNotice(`Pista de audio “${file.name}” cargada correctamente.`);
  }

  // Load subtitles file
  async function handleSubtitlesLoad(file: File) {
    setError('');
    clearResult();
    const ext = file.name.split('.').pop()?.toLocaleLowerCase('en') ?? '';

    if (ext !== 'srt' && ext !== 'vtt' && !file.type.includes('text')) {
      setError('Formato de subtítulos no compatible. Por favor sube un archivo .SRT o .VTT.');
      return;
    }

    try {
      const content = await file.text();
      setSubtitlesInfo({ file, content });
      setNotice(`Subtítulos “${file.name}” listos para incrustar.`);
    } catch {
      setError('No se pudo leer el archivo de subtítulos.');
    }
  }

  // Computed dimensions for target
  const targetDimensions = useMemo(() => {
    if (!videoInfo) return { width: 1280, height: 720 };
    return calculateOutputDimensions(
      videoInfo.width,
      videoInfo.height,
      aspectRatio,
      resolution,
    );
  }, [videoInfo, aspectRatio, resolution]);

  const selectedDuration = useMemo(() => {
    const dur = (trimEnd - trimStart) / playbackSpeed;
    return Math.max(0.1, Number.isFinite(dur) ? dur : 0.1);
  }, [trimStart, trimEnd, playbackSpeed]);

  // Video time update handler
  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Loop selection if playing beyond trimEnd
    if (isPlaying && time >= trimEnd) {
      videoRef.current.currentTime = trimStart;
    }
  }

  function togglePlay() {
    if (!videoRef.current || !videoInfo) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.playbackRate = playbackSpeed;
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }

  function seekTo(time: number) {
    if (!videoRef.current || !videoInfo) return;
    const safeTime = Math.max(0, Math.min(videoInfo.duration, time));
    videoRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  }

  // Snapshot current frame as PNG
  function captureFrame() {
    if (!videoRef.current || !videoInfo) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = targetDimensions.width;
    canvas.height = targetDimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;

    if (fitMode === 'contain') {
      const scale = Math.min(canvas.width / vw, canvas.height / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2;
      ctx.drawImage(video, dx, dy, dw, dh);
    } else {
      const scale = Math.max(canvas.width / vw, canvas.height / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2;
      ctx.drawImage(video, dx, dy, dw, dh);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const filename = replaceExtension(
          videoInfo.file.name,
          'png',
          `-fotograma-${currentTime.toFixed(1)}s`,
        );
        downloadBlob(blob, filename);
        setNotice('Fotograma capturado y descargado en PNG.');
      }
    }, 'image/png');
  }

  // Execute processing job using FFmpeg WASM
  async function handleProcess() {
    if (!videoInfo) return;
    clearResult();
    setError('');
    setNotice('');

    // Pre-validation
    if (trimStart >= trimEnd) {
      setError('El punto de inicio debe ser estrictamente menor que el punto de finalización.');
      return;
    }

    if (outputFormat === 'gif' && trimEnd - trimStart > 30) {
      setError('Para generar un GIF fluido, recorta el fragmento a un máximo de 30 segundos.');
      return;
    }

    setProcessing(true);
    setProgress(5);
    setProgressLabel('Inicializando motor de procesamiento...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const jobResult = await processVideoJob(
        {
          videoFile: videoInfo.file,
          trimStart,
          trimEnd,
          speed: playbackSpeed,
          aspectRatio,
          fitMode,
          resolution,
          sourceWidth: videoInfo.width,
          sourceHeight: videoInfo.height,
          sourceDuration: videoInfo.duration,
          muteOriginal,
          originalVolume,
          extraAudioFile,
          extraAudioVolume,
          subtitlesContent: subtitlesInfo?.content ?? null,
          overlayText: overlayText.trim() ? overlayText : null,
          overlayTextPosition: textPosition,
          overlayTextSize: textSize,
          outputFormat,
          quality,
          fps: outputFormat === 'gif' ? gifFps : videoFps,
        },
        (pct, label) => {
          setProgress(pct);
          setProgressLabel(label);
        },
        controller.signal,
      );

      setResult(jobResult);
      setNotice('¡Tu archivo ha sido procesado y está listo para descargar!');
      setProgress(100);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setNotice('Operación cancelada. Tus archivos y parámetros se conservan listos.');
      } else {
        const msg = cause instanceof Error ? cause.message : 'No fue posible completar la operación.';
        setError(msg);
      }
    } finally {
      abortRef.current = null;
      setProcessing(false);
    }
  }

  function handleCancelOperation() {
    if (abortRef.current) {
      abortRef.current.abort();
      terminateFfmpegEngine();
    }
  }

  // Reset all state
  function handleResetAll() {
    if (abortRef.current) abortRef.current.abort();
    terminateFfmpegEngine();

    if (videoInfo) revokeUrl(videoInfo.url);
    if (result) revokeUrl(URL.createObjectURL(result.blob));

    setVideoInfo(null);
    setExtraAudioFile(null);
    setSubtitlesInfo(null);
    setResult(null);
    setError('');
    setNotice('');
    setTrimStart(0);
    setTrimEnd(0);
    setCurrentTime(0);
    setOverlayText('');
    setTextPosition('bottom');
    setTextSize('md');
    setMuteOriginal(false);
    setOriginalVolume(100);
    setExtraAudioVolume(100);
    setPlaybackSpeed(1);
    setAspectRatio('original');
    setFitMode('contain');
    setResolution('original');
    setVideoFps(0);
    setOutputFormat('mp4');
    setQuality('balanced');
    setGifFps(12);
    setProgress(0);
  }

  const resultUrl = useMemo(() => {
    if (!result) return '';
    return URL.createObjectURL(result.blob);
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      {!videoInfo ? (
        <section
          className="rounded-3xl border border-dashed border-primary/35 bg-card p-6 text-center ring-1 ring-foreground/5 sm:p-10"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0] && !loading) {
              void handleVideoLoad(e.dataTransfer.files[0]);
            }
          }}
          aria-labelledby="video-upload-title"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            {loading ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            ) : (
              <Film className="size-6" aria-hidden="true" />
            )}
          </span>
          <h2 id="video-upload-title" className="mt-5 text-xl font-semibold tracking-tight">
            Carga un vídeo para empezar
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            MP4, WebM, MOV, MKV o AVI · Hasta {isMobileDevice ? '150 MB (móvil)' : '500 MB'} · Procesamiento local con WebAssembly
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
            <Smartphone className="size-3.5" aria-hidden="true" />
            <span>El vídeo nunca se envía a internet. Todo se procesa en este navegador.</span>
          </div>

          <div className="mt-6 flex justify-center">
            <label
              htmlFor="video-file-input"
              aria-disabled={loading}
              className={buttonVariants({
                size: 'lg',
                className: 'cursor-pointer rounded-xl px-6 min-h-10 aria-disabled:pointer-events-none aria-disabled:opacity-50',
              })}
            >
              <Upload aria-hidden="true" />
              {loading ? 'Leyendo vídeo…' : 'Seleccionar vídeo'}
            </label>
            <input
              id="video-file-input"
              type="file"
              accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v"
              disabled={loading}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleVideoLoad(e.target.files[0]);
                }
                e.target.value = '';
              }}
            />
          </div>
        </section>
      ) : null}

      {/* Alerts */}
      {error ? (
        <Alert variant="destructive" role="alert">
          <X aria-hidden="true" />
          <AlertTitle>No se pudo completar la operación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert className="border-primary/25 bg-secondary/45" aria-live="polite">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>{result ? 'Resultado listo' : 'Información'}</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      {/* Main Workspace */}
      {videoInfo ? (
        <div className="space-y-6">
          {/* Header Info & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="min-w-0">
              <span className="block truncate text-base font-semibold">{videoInfo.file.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {videoInfo.width} × {videoInfo.height} px · {formatTimecode(videoInfo.duration)} · {formatBytes(videoInfo.file.size)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-10"
                onClick={captureFrame}
                disabled={processing}
                aria-label="Capturar fotograma actual como imagen PNG"
              >
                <Camera aria-hidden="true" />
                <span className="hidden sm:inline">Capturar fotograma (PNG)</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10"
                onClick={handleResetAll}
                disabled={processing}
                aria-label="Cambiar archivo de vídeo y restablecer parámetros"
              >
                <RotateCcw aria-hidden="true" />
                Cambiar vídeo
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            {/* Player Preview */}
            <div className="flex flex-col gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#090c10] shadow-inner">
                <video
                  ref={videoRef}
                  src={videoInfo.url}
                  className="size-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
              </div>

              {/* Player Controls */}
              <div className="space-y-3">
                {/* Timeline slider */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTimecode(currentTime)}
                  </span>
                  <div className="grow">
                    <Slider
                      aria-label="Línea de tiempo del vídeo"
                      value={[currentTime]}
                      min={0}
                      max={videoInfo.duration}
                      step={0.1}
                      onValueChange={(val) => {
                        const nextTime = Array.isArray(val) ? val[0] : val;
                        seekTo(nextTime);
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTimecode(videoInfo.duration)}
                  </span>
                </div>

                {/* Play / Trim quick actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="min-h-10"
                      onClick={togglePlay}
                      disabled={processing}
                      aria-label={isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'}
                    >
                      {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                      {isPlaying ? 'Pausar' : 'Reproducir'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-10"
                      onClick={() => {
                        seekTo(trimStart);
                        if (videoRef.current && videoRef.current.paused) togglePlay();
                      }}
                      disabled={processing}
                      aria-label="Reproducir fragmento seleccionado"
                    >
                      <Scissors aria-hidden="true" />
                      Probar selección
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Recorte:</span>
                    <Badge variant="outline" className="font-mono">
                      {formatTimecode(trimStart)} - {formatTimecode(trimEnd)} ({formatTimecode(selectedDuration)})
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Editing Panel Tabs */}
            <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <Tabs defaultValue="recorte">
                <TabsList className="grid w-full grid-cols-4 min-h-10">
                  <TabsTrigger value="recorte" className="min-h-9">Recorte</TabsTrigger>
                  <TabsTrigger value="formato" className="min-h-9">Aspecto</TabsTrigger>
                  <TabsTrigger value="audio" className="min-h-9">Audio</TabsTrigger>
                  <TabsTrigger value="subtitulos" className="min-h-9">Subtítulos</TabsTrigger>
                </TabsList>

                {/* Tab 1: Trim & Speed */}
                <TabsContent value="recorte" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Puntos de corte (segundos)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="trim-start-input" className="block text-xs text-muted-foreground">
                          Inicio (s):
                        </label>
                        <Input
                          id="trim-start-input"
                          type="number"
                          min={0}
                          max={Math.max(0, trimEnd - 0.1)}
                          step={0.1}
                          value={Number(trimStart.toFixed(1))}
                          onChange={(e) => {
                            clearResult();
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setTrimStart(Math.min(val, trimEnd - 0.1));
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          className="mt-1 min-h-9 text-xs"
                          onClick={() => {
                            clearResult();
                            setTrimStart(Math.min(currentTime, trimEnd - 0.1));
                          }}
                        >
                          Usar tiempo actual
                        </Button>
                      </div>

                      <div>
                        <label htmlFor="trim-end-input" className="block text-xs text-muted-foreground">
                          Fin (s):
                        </label>
                        <Input
                          id="trim-end-input"
                          type="number"
                          min={trimStart + 0.1}
                          max={videoInfo.duration}
                          step={0.1}
                          value={Number(trimEnd.toFixed(1))}
                          onChange={(e) => {
                            clearResult();
                            const val = Number(e.target.value) || videoInfo.duration;
                            setTrimEnd(Math.max(trimStart + 0.1, Math.min(videoInfo.duration, val)));
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          className="mt-1 min-h-9 text-xs"
                          onClick={() => {
                            clearResult();
                            setTrimEnd(Math.max(trimStart + 0.1, currentTime));
                          }}
                        >
                          Usar tiempo actual
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Velocidad del resultado
                    </span>
                    <div className="flex flex-wrap gap-1.5" aria-label="Velocidad de reproducción">
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                        <Button
                          key={sp}
                          variant={playbackSpeed === sp ? 'default' : 'outline'}
                          size="sm"
                          className="min-h-10 min-w-10 px-3 text-xs"
                          aria-pressed={playbackSpeed === sp}
                          onClick={() => {
                            clearResult();
                            setPlaybackSpeed(sp);
                            if (videoRef.current) videoRef.current.playbackRate = sp;
                          }}
                        >
                          {sp}x
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Aspect Ratio & Resolution */}
                <TabsContent value="formato" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label htmlFor="aspect-ratio-select" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Relación de aspecto
                    </label>
                    <NativeSelect
                      id="aspect-ratio-select"
                      value={aspectRatio}
                      className="w-full"
                      onChange={(e) => {
                        clearResult();
                        setAspectRatio(e.target.value as VideoAspectRatio);
                      }}
                    >
                      <NativeSelectOption value="original">Original ({videoInfo.width}:{videoInfo.height})</NativeSelectOption>
                      <NativeSelectOption value="16:9">16:9 — Horizontal (YouTube, PC, TV)</NativeSelectOption>
                      <NativeSelectOption value="9:16">9:16 — Vertical (TikTok, Reels, Shorts)</NativeSelectOption>
                      <NativeSelectOption value="1:1">1:1 — Cuadrado (Instagram, feeds)</NativeSelectOption>
                      <NativeSelectOption value="4:3">4:3 — Estándar clásico</NativeSelectOption>
                    </NativeSelect>
                  </div>

                  {aspectRatio !== 'original' ? (
                    <div className="space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Modo de encuadre
                      </span>
                      <div className="grid grid-cols-2 gap-2" aria-label="Modo de encuadre">
                        <Button
                          variant={fitMode === 'contain' ? 'default' : 'outline'}
                          size="sm"
                          className="min-h-10"
                          aria-pressed={fitMode === 'contain'}
                          onClick={() => {
                            clearResult();
                            setFitMode('contain');
                          }}
                        >
                          Bandas (Contener)
                        </Button>
                        <Button
                          variant={fitMode === 'cover' ? 'default' : 'outline'}
                          size="sm"
                          className="min-h-10"
                          aria-pressed={fitMode === 'cover'}
                          onClick={() => {
                            clearResult();
                            setFitMode('cover');
                          }}
                        >
                          Rellenar (Recorte)
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2 pt-2">
                    <label htmlFor="resolution-select" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Resolución máxima de salida
                    </label>
                    <NativeSelect
                      id="resolution-select"
                      value={resolution}
                      className="w-full"
                      onChange={(e) => {
                        clearResult();
                        setResolution(e.target.value as VideoResolutionPreset);
                      }}
                    >
                      <NativeSelectOption value="original">Original ({videoInfo.width}×{videoInfo.height} px)</NativeSelectOption>
                      <NativeSelectOption value="1080p">1080p (Full HD)</NativeSelectOption>
                      <NativeSelectOption value="720p">720p (HD Recomendado)</NativeSelectOption>
                      <NativeSelectOption value="480p">480p (SD Ligero)</NativeSelectOption>
                      <NativeSelectOption value="360p">360p (Ahorro móvil)</NativeSelectOption>
                    </NativeSelect>
                    <span className="block text-xs text-muted-foreground">
                      Dimensiones calculadas: {targetDimensions.width} × {targetDimensions.height} px
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label htmlFor="video-fps-select" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Fotogramas por segundo (FPS vídeo)
                    </label>
                    <NativeSelect
                      id="video-fps-select"
                      value={videoFps}
                      className="w-full"
                      onChange={(e) => {
                        clearResult();
                        setVideoFps(Number(e.target.value));
                      }}
                    >
                      <NativeSelectOption value="0">Original del archivo</NativeSelectOption>
                      <NativeSelectOption value="24">24 FPS (Cinemático)</NativeSelectOption>
                      <NativeSelectOption value="30">30 FPS (Estándar web)</NativeSelectOption>
                      <NativeSelectOption value="60">60 FPS (Alta fluidez)</NativeSelectOption>
                    </NativeSelect>
                  </div>
                </TabsContent>

                {/* Tab 3: Audio settings */}
                <TabsContent value="audio" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="space-y-0.5">
                      <label htmlFor="mute-switch" className="text-sm font-medium cursor-pointer">
                        Silenciar audio original
                      </label>
                      <p className="text-xs text-muted-foreground">Elimina la pista de sonido del vídeo</p>
                    </div>
                    <Switch
                      id="mute-switch"
                      checked={muteOriginal}
                      onCheckedChange={(checked) => {
                        clearResult();
                        setMuteOriginal(checked);
                      }}
                      aria-label="Silenciar audio original del vídeo"
                    />
                  </div>

                  {!muteOriginal ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="original-volume-slider" className="text-muted-foreground">
                          Volumen original:
                        </label>
                        <span className="font-mono">{originalVolume}%</span>
                      </div>
                      <Slider
                        id="original-volume-slider"
                        aria-label="Volumen del audio original"
                        value={[originalVolume]}
                        min={0}
                        max={200}
                        step={5}
                        onValueChange={(val) => {
                          clearResult();
                          setOriginalVolume(Array.isArray(val) ? val[0] : val);
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Extra audio track */}
                  <div className="rounded-xl border border-dashed border-border p-3 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pista de audio adicional / Reemplazo
                      </span>
                      {extraAudioFile ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="min-h-9 text-xs"
                          onClick={() => {
                            clearResult();
                            setExtraAudioFile(null);
                          }}
                        >
                          <X aria-hidden="true" />
                          Quitar
                        </Button>
                      ) : null}
                    </div>

                    {extraAudioFile ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Music2 className="size-4 text-primary" aria-hidden="true" />
                          <span className="truncate">{extraAudioFile.name}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <label htmlFor="extra-audio-volume-slider" className="text-muted-foreground">
                              Volumen música:
                            </label>
                            <span className="font-mono">{extraAudioVolume}%</span>
                          </div>
                          <Slider
                            id="extra-audio-volume-slider"
                            aria-label="Volumen de la pista externa de música"
                            value={[extraAudioVolume]}
                            min={0}
                            max={200}
                            step={5}
                            onValueChange={(val) => {
                              clearResult();
                              setExtraAudioVolume(Array.isArray(val) ? val[0] : val);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-center">
                        <label
                          htmlFor="extra-audio-input"
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                            className: 'cursor-pointer text-xs min-h-10',
                          })}
                        >
                          <Upload aria-hidden="true" />
                          Cargar audio (MP3, WAV, M4A, OGG)
                        </label>
                        <input
                          id="extra-audio-input"
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleExtraAudioLoad(e.target.files[0]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 4: Subtitles & Overlay Text */}
                <TabsContent value="subtitulos" className="space-y-4 pt-4">
                  {/* Subtitle File */}
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Incrustar archivo de subtítulos (SRT / VTT)
                      </span>
                      {subtitlesInfo ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="min-h-9 text-xs"
                          onClick={() => {
                            clearResult();
                            setSubtitlesInfo(null);
                          }}
                        >
                          <X aria-hidden="true" />
                          Quitar
                        </Button>
                      ) : null}
                    </div>

                    {subtitlesInfo ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-secondary/50 p-2 text-xs font-medium">
                        <FileText className="size-4 text-primary" aria-hidden="true" />
                        <span className="truncate">{subtitlesInfo.file.name}</span>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <label
                          htmlFor="subtitles-file-input"
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                            className: 'cursor-pointer text-xs min-h-10 w-full',
                          })}
                        >
                          <Upload aria-hidden="true" />
                          Subir archivo .SRT o .VTT
                        </label>
                        <input
                          id="subtitles-file-input"
                          type="file"
                          accept=".srt,.vtt,text/vtt,application/x-subrip"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              void handleSubtitlesLoad(e.target.files[0]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Optional Overlay Text */}
                  <div className="space-y-2 pt-2">
                    <label htmlFor="overlay-text-input" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Texto adicional superpuesto (marca o rótulo)
                    </label>
                    <Input
                      id="overlay-text-input"
                      placeholder="Ejemplo: @ceronube · Grabado en directo"
                      value={overlayText}
                      onChange={(e) => {
                        clearResult();
                        setOverlayText(e.target.value);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="text-position-select" className="block text-xs text-muted-foreground">
                        Posición del texto:
                      </label>
                      <NativeSelect
                        id="text-position-select"
                        value={textPosition}
                        className="w-full"
                        onChange={(e) => {
                          clearResult();
                          setTextPosition(e.target.value as VideoTextPosition);
                        }}
                      >
                        <NativeSelectOption value="bottom">Inferior (Abajo)</NativeSelectOption>
                        <NativeSelectOption value="center">Centro</NativeSelectOption>
                        <NativeSelectOption value="top">Superior (Arriba)</NativeSelectOption>
                      </NativeSelect>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="text-size-select" className="block text-xs text-muted-foreground">
                        Tamaño:
                      </label>
                      <NativeSelect
                        id="text-size-select"
                        value={textSize}
                        className="w-full"
                        onChange={(e) => {
                          clearResult();
                          setTextSize(e.target.value as VideoTextSize);
                        }}
                      >
                        <NativeSelectOption value="sm">Pequeño</NativeSelectOption>
                        <NativeSelectOption value="md">Mediano</NativeSelectOption>
                        <NativeSelectOption value="lg">Grande</NativeSelectOption>
                      </NativeSelect>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Output format & Execution */}
              <div className="mt-6 space-y-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Formato de salida
                  </span>
                  <div className="grid grid-cols-3 gap-2" aria-label="Formato de salida">
                    <Button
                      variant={outputFormat === 'mp4' ? 'default' : 'outline'}
                      size="sm"
                      className="min-h-10 text-xs"
                      aria-pressed={outputFormat === 'mp4'}
                      onClick={() => {
                        clearResult();
                        setOutputFormat('mp4');
                      }}
                    >
                      Vídeo MP4
                    </Button>
                    <Button
                      variant={outputFormat === 'webm' ? 'default' : 'outline'}
                      size="sm"
                      className="min-h-10 text-xs"
                      aria-pressed={outputFormat === 'webm'}
                      onClick={() => {
                        clearResult();
                        setOutputFormat('webm');
                      }}
                    >
                      Vídeo WebM
                    </Button>
                    <Button
                      variant={outputFormat === 'gif' ? 'default' : 'outline'}
                      size="sm"
                      className="min-h-10 text-xs"
                      aria-pressed={outputFormat === 'gif'}
                      onClick={() => {
                        clearResult();
                        setOutputFormat('gif');
                      }}
                    >
                      GIF Animado
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1" aria-label="Extracción de audio">
                    <Button
                      variant={outputFormat === 'mp3' ? 'default' : 'outline'}
                      size="sm"
                      className="min-h-10 text-xs"
                      aria-pressed={outputFormat === 'mp3'}
                      onClick={() => {
                        clearResult();
                        setOutputFormat('mp3');
                      }}
                    >
                      Audio MP3
                    </Button>
                    <Button
                      variant={outputFormat === 'wav' ? 'default' : 'outline'}
                      size="sm"
                      className="min-h-10 text-xs"
                      aria-pressed={outputFormat === 'wav'}
                      onClick={() => {
                        clearResult();
                        setOutputFormat('wav');
                      }}
                    >
                      Audio WAV
                    </Button>
                    <Button
                      variant={outputFormat === 'ogg' ? 'default' : 'outline'}
                      size="sm"
                      className="min-h-10 text-xs"
                      aria-pressed={outputFormat === 'ogg'}
                      onClick={() => {
                        clearResult();
                        setOutputFormat('ogg');
                      }}
                    >
                      Audio OGG
                    </Button>
                  </div>
                </div>

                {outputFormat === 'mp4' || outputFormat === 'webm' ? (
                  <div className="space-y-2">
                    <label htmlFor="compression-preset-select" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Perfil de compresión
                    </label>
                    <NativeSelect
                      id="compression-preset-select"
                      value={quality}
                      className="w-full"
                      onChange={(e) => {
                        clearResult();
                        setQuality(e.target.value as VideoQualityPreset);
                      }}
                    >
                      <NativeSelectOption value="high">Alta fidelidad (Máxima nitidez / mayor tamaño)</NativeSelectOption>
                      <NativeSelectOption value="balanced">Equilibrado (Recomendado para la mayoría)</NativeSelectOption>
                      <NativeSelectOption value="economy">Ahorro máximo (Ideal para mensajería y web)</NativeSelectOption>
                    </NativeSelect>
                  </div>
                ) : null}

                {outputFormat === 'gif' ? (
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Fluidez del GIF animado (FPS)
                    </span>
                    <div className="flex flex-wrap gap-2" aria-label="FPS para GIF">
                      {[10, 12, 15, 20, 24].map((fps) => (
                        <Button
                          key={fps}
                          variant={gifFps === fps ? 'default' : 'outline'}
                          size="sm"
                          className="min-h-10 min-w-10 text-xs"
                          aria-pressed={gifFps === fps}
                          onClick={() => {
                            clearResult();
                            setGifFps(fps);
                          }}
                        >
                          {fps} FPS
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Progress bar if processing */}
                {processing ? (
                  <div className="space-y-2 rounded-2xl bg-secondary/30 p-3" aria-live="polite">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-primary">{progressLabel}</span>
                      <span className="font-mono text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} aria-label="Progreso de procesamiento del vídeo" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 w-full min-h-10 text-xs text-destructive hover:bg-destructive/10"
                      onClick={handleCancelOperation}
                    >
                      Cancelar operación
                    </Button>
                  </div>
                ) : null}

                {/* Action button */}
                <Button
                  className="w-full min-h-12 text-base font-semibold"
                  size="lg"
                  onClick={() => void handleProcess()}
                  disabled={processing}
                  aria-label={`Procesar y generar ${outputFormat.toUpperCase()}`}
                >
                  {processing ? (
                    <>
                      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                      Procesando en tu navegador…
                    </>
                  ) : (
                    <>
                      <Download aria-hidden="true" />
                      Procesar y descargar {outputFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Process Result Card */}
          {result ? (
            <Card className="rounded-3xl border-primary/25 bg-secondary/20 p-6" aria-live="polite">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                    <h3 className="text-lg font-semibold">
                      {replaceExtension(videoInfo.file.name, result.extension, '-editado')}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(result.size)} · Duración estimada: {formatTimecode(result.duration)}
                    {result.width ? ` · ${result.width} × ${result.height} px` : ''} · {result.mimeType}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    className="min-h-11 px-6"
                    onClick={() =>
                      downloadBlob(
                        result.blob,
                        replaceExtension(videoInfo.file.name, result.extension, '-editado'),
                      )
                    }
                  >
                    <Download aria-hidden="true" />
                    Descargar {result.extension.toUpperCase()}
                  </Button>
                </div>
              </div>

              {/* In-place preview */}
              <div className="mt-5 max-w-lg overflow-hidden rounded-2xl bg-black">
                {result.extension === 'mp4' || result.extension === 'webm' ? (
                  <video src={resultUrl} controls className="size-full max-h-72" />
                ) : result.extension === 'gif' ? (
                  <img src={resultUrl} alt="GIF animado generado" className="size-full max-h-72 object-contain" />
                ) : (
                  <audio src={resultUrl} controls className="w-full p-4" />
                )}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
