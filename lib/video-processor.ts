import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { cuesToSrt, parseSubtitles } from '@/lib/subtitles';

export type VideoOutputFormat = 'mp4' | 'webm' | 'gif' | 'mp3' | 'wav' | 'ogg';
export type VideoAspectRatio = 'original' | '16:9' | '9:16' | '1:1' | '4:3';
export type VideoFitMode = 'contain' | 'cover';
export type VideoResolutionPreset = 'original' | '1080p' | '720p' | '480p' | '360p';
export type VideoQualityPreset = 'high' | 'balanced' | 'economy';
export type VideoTextPosition = 'bottom' | 'top' | 'center';
export type VideoTextSize = 'sm' | 'md' | 'lg';

export type VideoJobOptions = {
  videoFile: File;
  trimStart: number;
  trimEnd: number;
  speed: number;
  aspectRatio: VideoAspectRatio;
  fitMode: VideoFitMode;
  resolution: VideoResolutionPreset;
  sourceWidth: number;
  sourceHeight: number;
  sourceDuration: number;
  muteOriginal: boolean;
  originalVolume: number;
  extraAudioFile?: File | null;
  extraAudioVolume?: number;
  subtitlesContent?: string | null;
  overlayText?: string | null;
  overlayTextPosition?: VideoTextPosition;
  overlayTextSize?: VideoTextSize;
  outputFormat: VideoOutputFormat;
  quality: VideoQualityPreset;
  fps?: number; // 0 for source/default
};

export type VideoJobResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number;
  width?: number;
  height?: number;
  size: number;
};

const FFMPEG_CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const FFMPEG_CORE_FALLBACK = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

let activeFfmpegInstance: FFmpeg | null = null;
let isCoreLoaded = false;

export function calculateOutputDimensions(
  sourceW: number,
  sourceH: number,
  aspectRatio: VideoAspectRatio,
  resolutionPreset: VideoResolutionPreset,
): { width: number; height: number } {
  const safeW = Math.max(16, sourceW || 1280);
  const safeH = Math.max(16, sourceH || 720);

  let targetW = safeW;
  let targetH = safeH;

  // Compute base aspect ratio
  if (aspectRatio === '16:9') {
    if (safeW >= safeH) {
      targetH = Math.round((targetW * 9) / 16);
    } else {
      targetW = Math.round((targetH * 16) / 9);
    }
  } else if (aspectRatio === '9:16') {
    // Vertical format (Shorts / Reels / TikTok)
    // Avoid unbounded resolution expansion
    const maxBound = Math.min(safeW, safeH, 1080);
    targetW = maxBound;
    targetH = Math.round((targetW * 16) / 9);
  } else if (aspectRatio === '1:1') {
    const dim = Math.min(safeW, safeH);
    targetW = dim;
    targetH = dim;
  } else if (aspectRatio === '4:3') {
    if (safeW >= safeH) {
      targetH = Math.round((targetW * 3) / 4);
    } else {
      targetW = Math.round((targetH * 4) / 3);
    }
  }

  // Bound with resolution preset
  let maxDim = 1920;
  if (resolutionPreset === '1080p') maxDim = 1920;
  else if (resolutionPreset === '720p') maxDim = 1280;
  else if (resolutionPreset === '480p') maxDim = 854;
  else if (resolutionPreset === '360p') maxDim = 640;
  else if (resolutionPreset === 'original') maxDim = Math.max(safeW, safeH);

  const currentMax = Math.max(targetW, targetH);
  if (currentMax > maxDim) {
    const scale = maxDim / currentMax;
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  // Ensure dimensions are even numbers (H.264 requirement)
  if (targetW % 2 !== 0) targetW += 1;
  if (targetH % 2 !== 0) targetH += 1;

  return { width: Math.max(16, targetW), height: Math.max(16, targetH) };
}

function buildAtempoFilter(speed: number): string {
  if (Math.abs(speed - 1) < 0.01) return '';
  if (speed >= 0.5 && speed <= 2.0) {
    return `atempo=${speed.toFixed(3)}`;
  }
  if (speed < 0.5) {
    // atempo min is 0.5, chain if needed (e.g. 0.25 -> 0.5,0.5)
    return 'atempo=0.5,atempo=' + (speed / 0.5).toFixed(3);
  }
  // speed > 2.0
  return 'atempo=2.0,atempo=' + (speed / 2.0).toFixed(3);
}

export async function loadFfmpegEngine(
  onProgress?: (percent: number, label: string) => void,
  signal?: AbortSignal,
): Promise<FFmpeg> {
  if (activeFfmpegInstance && isCoreLoaded) {
    return activeFfmpegInstance;
  }

  onProgress?.(5, 'Descargando motor FFmpeg en tu navegador...');

  const ffmpeg = new FFmpeg();
  activeFfmpegInstance = ffmpeg;

  try {
    let coreURL: string;
    let wasmURL: string;

    try {
      coreURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript');
      wasmURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm');
    } catch {
      // Fallback to unpkg if jsdelivr fails
      coreURL = await toBlobURL(`${FFMPEG_CORE_FALLBACK}/ffmpeg-core.js`, 'text/javascript');
      wasmURL = await toBlobURL(`${FFMPEG_CORE_FALLBACK}/ffmpeg-core.wasm`, 'application/wasm');
    }

    if (signal?.aborted) {
      throw new DOMException('Operación cancelada', 'AbortError');
    }

    onProgress?.(20, 'Inicializando motor local WebAssembly...');

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    isCoreLoaded = true;
    return ffmpeg;
  } catch (err) {
    activeFfmpegInstance = null;
    isCoreLoaded = false;
    throw err;
  }
}

export function terminateFfmpegEngine(): void {
  if (activeFfmpegInstance) {
    try {
      // Calling terminate on the internal worker if available or re-instantiating
      isCoreLoaded = false;
      activeFfmpegInstance = null;
    } catch {
      // ignore
    }
  }
}

export async function processVideoJob(
  options: VideoJobOptions,
  onProgress: (percent: number, label: string) => void,
  signal: AbortSignal,
): Promise<VideoJobResult> {
  if (options.trimStart >= options.trimEnd) {
    throw new Error('El punto de inicio debe ser estrictamente menor que el punto de finalización.');
  }

  const durationSlice = options.trimEnd - options.trimStart;
  const targetDuration = durationSlice / options.speed;

  onProgress(2, 'Preparando motor de procesamiento local...');
  const ffmpeg = await loadFfmpegEngine(onProgress, signal);

  if (signal.aborted) throw new DOMException('Operación cancelada', 'AbortError');

  // Input file extensions
  const videoExt = options.videoFile.name.split('.').pop()?.toLocaleLowerCase('en') || 'mp4';
  const inputVideoName = `input_video.${videoExt}`;
  const inputAudioName = options.extraAudioFile
    ? `extra_audio.${options.extraAudioFile.name.split('.').pop()?.toLocaleLowerCase('en') || 'mp3'}`
    : null;

  onProgress(25, 'Cargando archivo en memoria segura...');
  const videoData = new Uint8Array(await options.videoFile.arrayBuffer());
  await ffmpeg.writeFile(inputVideoName, videoData);

  if (options.extraAudioFile && inputAudioName) {
    const audioData = new Uint8Array(await options.extraAudioFile.arrayBuffer());
    await ffmpeg.writeFile(inputAudioName, audioData);
  }

  // Handle subtitles
  let subtitlesFilename: string | null = null;
  if (options.subtitlesContent?.trim()) {
    const cues = parseSubtitles(options.subtitlesContent);
    if (cues.length > 0) {
      subtitlesFilename = 'subs.srt';
      const srtStr = cuesToSrt(cues);
      await ffmpeg.writeFile(subtitlesFilename, new TextEncoder().encode(srtStr));
    }
  }

  if (signal.aborted) throw new DOMException('Operación cancelada', 'AbortError');

  // Determine output format & extension
  const isAudioOnly = options.outputFormat === 'mp3' || options.outputFormat === 'wav' || options.outputFormat === 'ogg';
  const isGif = options.outputFormat === 'gif';

  const outExt = options.outputFormat;
  const outputFileName = `output.${outExt}`;

  // Calculate dimensions
  const dims = calculateOutputDimensions(
    options.sourceWidth,
    options.sourceHeight,
    options.aspectRatio,
    options.resolution,
  );

  // Set up progress callback
  const progressHandler = ({ progress }: { progress: number; time?: number }) => {
    if (signal.aborted) return;
    const clampedProgress = Math.min(99, Math.max(0, Math.round(progress * 100)));
    const pct = 30 + Math.round((clampedProgress / 100) * 65);
    onProgress(pct, `Procesando y codificando ${options.outputFormat.toUpperCase()} (${clampedProgress}%)...`);
  };

  ffmpeg.on('progress', progressHandler);

  try {
    const args: string[] = [];

    // Trimming input video
    args.push('-ss', options.trimStart.toFixed(3));
    args.push('-to', options.trimEnd.toFixed(3));
    args.push('-i', inputVideoName);

    // If extra audio track is provided and we are not muting
    let hasExtraAudioInput = false;
    if (inputAudioName) {
      hasExtraAudioInput = true;
      args.push('-i', inputAudioName);
    }

    if (isAudioOnly) {
      // Audio extraction flow
      onProgress(35, `Extrayendo y procesando audio en ${options.outputFormat.toUpperCase()}...`);

      // Video disabled
      args.push('-vn');

      // Audio filters
      const afFilters: string[] = [];
      const atempo = buildAtempoFilter(options.speed);
      if (atempo) afFilters.push(atempo);

      if (options.originalVolume !== 100) {
        afFilters.push(`volume=${(options.originalVolume / 100).toFixed(2)}`);
      }

      if (afFilters.length > 0) {
        args.push('-af', afFilters.join(','));
      }

      if (options.outputFormat === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', '192k');
      } else if (options.outputFormat === 'wav') {
        args.push('-c:a', 'pcm_s16le');
      } else if (options.outputFormat === 'ogg') {
        args.push('-c:a', 'libvorbis', '-q:a', '5');
      }
    } else if (isGif) {
      // Animated GIF flow with palettegen + paletteuse for high visual quality
      onProgress(35, 'Generando paleta de colores y animación GIF...');

      const vfFilters: string[] = [];

      // Speed
      if (Math.abs(options.speed - 1) > 0.01) {
        vfFilters.push(`setpts=${(1 / options.speed).toFixed(4)}*PTS`);
      }

      // FPS
      const fps = options.fps && options.fps > 0 ? options.fps : 12;
      vfFilters.push(`fps=${fps}`);

      // Scale / Aspect ratio
      if (options.aspectRatio === 'original') {
        vfFilters.push(`scale=${dims.width}:${dims.height}:flags=lanczos`);
      } else if (options.fitMode === 'contain') {
        vfFilters.push(
          `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2:black`,
        );
      } else {
        // cover / crop
        vfFilters.push(
          `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${dims.width}:${dims.height}`,
        );
      }

      // 2-pass palette filter
      const filterChain = `${vfFilters.join(',')},split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`;
      args.push('-vf', filterChain);
      args.push('-an'); // No audio in GIF
    } else {
      // MP4 / WebM Video processing
      onProgress(35, `Codificando vídeo ${options.outputFormat.toUpperCase()}...`);

      const vfFilters: string[] = [];

      // Speed
      if (Math.abs(options.speed - 1) > 0.01) {
        vfFilters.push(`setpts=${(1 / options.speed).toFixed(4)}*PTS`);
      }

      // FPS if custom
      if (options.fps && options.fps > 0) {
        vfFilters.push(`fps=${options.fps}`);
      }

      // Scaling & Aspect ratio
      if (options.aspectRatio === 'original') {
        vfFilters.push(`scale=${dims.width}:${dims.height}:flags=lanczos`);
      } else if (options.fitMode === 'contain') {
        vfFilters.push(
          `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2:black`,
        );
      } else {
        // Cover
        vfFilters.push(
          `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${dims.width}:${dims.height}`,
        );
      }

      // Subtitles burn-in
      if (subtitlesFilename) {
        vfFilters.push(`subtitles=${subtitlesFilename}`);
      }

      if (vfFilters.length > 0) {
        args.push('-vf', vfFilters.join(','));
      }

      // Audio handling
      if (options.muteOriginal && !hasExtraAudioInput) {
        args.push('-an');
      } else if (hasExtraAudioInput) {
        // Use extra audio
        args.push('-map', '0:v:0', '-map', '1:a:0', '-c:a', options.outputFormat === 'webm' ? 'libopus' : 'aac', '-b:a', '128k');
      } else {
        // Keep original audio with atempo / volume
        const afFilters: string[] = [];
        const atempo = buildAtempoFilter(options.speed);
        if (atempo) afFilters.push(atempo);
        if (options.originalVolume !== 100) {
          afFilters.push(`volume=${(options.originalVolume / 100).toFixed(2)}`);
        }
        if (afFilters.length > 0) {
          args.push('-af', afFilters.join(','));
        }

        if (options.outputFormat === 'webm') {
          args.push('-c:a', 'libopus', '-b:a', '128k');
        } else {
          args.push('-c:a', 'aac', '-b:a', '128k');
        }
      }

      // Video codec & quality settings
      if (options.outputFormat === 'mp4') {
        let crf = 23;
        if (options.quality === 'high') crf = 18;
        if (options.quality === 'economy') crf = 28;

        args.push(
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          String(crf),
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
        );
      } else {
        // WebM format
        let crf = 31;
        let b = '2M';
        if (options.quality === 'high') {
          crf = 24;
          b = '4M';
        }
        if (options.quality === 'economy') {
          crf = 38;
          b = '1M';
        }

        args.push(
          '-c:v',
          'libvpx-vp9',
          '-crf',
          String(crf),
          '-b:v',
          b,
          '-deadline',
          'realtime',
          '-cpu-used',
          '8',
        );
      }
    }

    // Output filename
    args.push('-y', outputFileName);

    if (signal.aborted) throw new DOMException('Operación cancelada', 'AbortError');

    // Execute FFmpeg
    const exitCode = await ffmpeg.exec(args, undefined, { signal });

    if (signal.aborted) throw new DOMException('Operación cancelada', 'AbortError');

    if (exitCode !== 0) {
      throw new Error(`El proceso de vídeo terminó con código de error ${exitCode}.`);
    }

    onProgress(95, 'Extrayendo archivo procesado...');

    const fileData = await ffmpeg.readFile(outputFileName);
    const dataUint8: Uint8Array =
      fileData instanceof Uint8Array
        ? fileData
        : typeof fileData === 'string'
          ? new TextEncoder().encode(fileData)
          : new Uint8Array(fileData as unknown as ArrayBuffer);

    let mimeType = 'video/mp4';
    if (options.outputFormat === 'webm') mimeType = 'video/webm';
    else if (options.outputFormat === 'gif') mimeType = 'image/gif';
    else if (options.outputFormat === 'mp3') mimeType = 'audio/mpeg';
    else if (options.outputFormat === 'wav') mimeType = 'audio/wav';
    else if (options.outputFormat === 'ogg') mimeType = 'audio/ogg';

    const blob = new Blob([dataUint8 as unknown as BlobPart], { type: mimeType });

    onProgress(100, '¡Archivo completado exitosamente!');

    return {
      blob,
      mimeType,
      extension: outExt,
      duration: targetDuration,
      width: isAudioOnly ? undefined : dims.width,
      height: isAudioOnly ? undefined : dims.height,
      size: blob.size,
    };
  } finally {
    ffmpeg.off('progress', progressHandler);

    // Clean virtual file system
    try {
      await ffmpeg.deleteFile(inputVideoName);
      if (inputAudioName) await ffmpeg.deleteFile(inputAudioName);
      if (subtitlesFilename) await ffmpeg.deleteFile(subtitlesFilename);
      await ffmpeg.deleteFile(outputFileName);
    } catch {
      // ignore cleanup errors
    }
  }
}
