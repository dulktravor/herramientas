'use client';

import { Midi } from '@tonejs/midi';
import {
  Bot,
  CircleStop,
  Download,
  Eraser,
  FileAudio,
  Keyboard,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Redo2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  type PointerEvent as ReactPointerEvent,
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type Note = { id: string; midi: number; time: number; duration: number; velocity: number };
type InstrumentId = 'grand' | 'bright' | 'felt' | 'electric' | 'organ' | 'strings' | 'marimba' | 'bass' | 'synth';
type Track = { id: string; name: string; instrument: InstrumentId; notes: Note[]; color: string; muted: boolean; solo: boolean };
type Voice = { sources: OscillatorNode[]; gain: GainNode };
type HistoryState = { tracks: Track[]; selectedTrackId: string };
type DragState = { noteId: string; trackId: string; startX: number; startY: number; originalTime: number; originalMidi: number };
type ModelStatus = 'idle' | 'loading' | 'running' | 'done' | 'error';
type OrtTensor = { data: ArrayLike<number>; dims: readonly number[] };
type OrtSession = { run: (feeds: Record<string, OrtTensor>) => Promise<Record<string, OrtTensor>>; release: () => Promise<void> | void };
type OrtRuntime = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: 'float32', data: Float32Array, dims: readonly number[]) => OrtTensor;
  InferenceSession: { create: (url: string, options: Record<string, unknown>) => Promise<OrtSession> };
};

declare global {
  interface Window { ort?: OrtRuntime }
}

const ROW_HEIGHT = 22;
const MIN_PITCH = 36;
const MAX_PITCH = 84;
const MODEL_URL = 'https://huggingface.co/LanOss/mobimml-piano-transcription/resolve/main/piano_transcription.onnx';
const ORT_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/ort.min.js';
const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';
const MODEL_SAMPLE_RATE = 16_000;
const MODEL_WINDOW = 160_000;
const TRACK_COLORS = ['#8d63ff', '#32c7b5', '#ff8c61', '#58a7ff', '#e46fc5', '#d6ad3b'];
const KEYBOARD_MAP: Record<string, number> = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76 };
const instruments: Array<{ id: InstrumentId; label: string; group: 'Pianos' | 'Otros instrumentos' }> = [
  { id: 'grand', label: 'Piano de concierto', group: 'Pianos' },
  { id: 'bright', label: 'Piano brillante', group: 'Pianos' },
  { id: 'felt', label: 'Piano de fieltro', group: 'Pianos' },
  { id: 'electric', label: 'Piano eléctrico', group: 'Pianos' },
  { id: 'organ', label: 'Órgano', group: 'Otros instrumentos' },
  { id: 'strings', label: 'Cuerdas', group: 'Otros instrumentos' },
  { id: 'marimba', label: 'Marimba', group: 'Otros instrumentos' },
  { id: 'bass', label: 'Bajo', group: 'Otros instrumentos' },
  { id: 'synth', label: 'Sintetizador', group: 'Otros instrumentos' },
];

let ortRuntimePromise: Promise<OrtRuntime> | null = null;

function loadOrtRuntime() {
  if (window.ort) return Promise.resolve(window.ort);
  if (ortRuntimePromise) return ortRuntimePromise;
  ortRuntimePromise = new Promise<OrtRuntime>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ORT_SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    const finish = () => window.ort ? resolve(window.ort) : reject(new Error('El motor ONNX no quedó disponible.'));
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('No se pudo descargar el motor ONNX. Revisa tu conexión e inténtalo otra vez.')), { once: true });
    if (!existing) {
      script.src = ORT_SCRIPT_URL;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    ortRuntimePromise = null;
    throw error;
  });
  return ortRuntimePromise;
}
const demoTrack: Track = {
  id: 'track-demo', name: 'Piano principal', instrument: 'grand', color: TRACK_COLORS[0], muted: false, solo: false,
  notes: [
    { id: 'n1', midi: 60, time: 0, duration: 0.45, velocity: 0.82 },
    { id: 'n2', midi: 64, time: 0.5, duration: 0.45, velocity: 0.78 },
    { id: 'n3', midi: 67, time: 1, duration: 0.95, velocity: 0.86 },
    { id: 'n4', midi: 71, time: 2, duration: 0.45, velocity: 0.75 },
    { id: 'n5', midi: 72, time: 2.5, duration: 1.45, velocity: 0.9 },
  ],
};

function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function midiName(midi: number) {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60); const wholeSeconds = Math.floor(seconds % 60); const millis = Math.floor((seconds % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}:${String(millis).padStart(3, '0')}`;
}
function cloneTracks(tracks: Track[]) { return tracks.map((track) => ({ ...track, notes: track.notes.map((note) => ({ ...note })) })); }
function instrumentLabel(id: InstrumentId) { return instruments.find((instrument) => instrument.id === id)?.label ?? 'Instrumento'; }

function createVoice(context: AudioContext, midi: number, instrument: InstrumentId, velocity: number, when: number, duration?: number): Voice {
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const gain = context.createGain(); const filter = context.createBiquadFilter(); const sources: OscillatorNode[] = [];
  const volume = clamp(velocity, 0.08, 1) * 0.24; const stopAt = duration ? when + duration + 1.5 : undefined;
  let waves: Array<{ type: OscillatorType; ratio: number; amount: number }> = [{ type: 'triangle', ratio: 1, amount: 0.72 }, { type: 'sine', ratio: 2, amount: 0.28 }];
  let attack = 0.008; let release = 0.7; let sustain = 0.18; let cutoff = 7_000;
  if (instrument === 'bright') { waves = [{ type: 'triangle', ratio: 1, amount: 0.68 }, { type: 'square', ratio: 2, amount: 0.12 }, { type: 'sine', ratio: 3, amount: 0.2 }]; release = 0.55; cutoff = 10_000; }
  else if (instrument === 'felt') { waves = [{ type: 'sine', ratio: 1, amount: 0.85 }, { type: 'triangle', ratio: 2, amount: 0.15 }]; attack = 0.018; release = 1.15; cutoff = 2_200; }
  else if (instrument === 'electric') { waves = [{ type: 'sine', ratio: 1, amount: 0.8 }, { type: 'sine', ratio: 3.01, amount: 0.2 }]; release = 1.3; cutoff = 5_000; }
  else if (instrument === 'organ') { waves = [{ type: 'sine', ratio: 1, amount: 0.64 }, { type: 'sine', ratio: 2, amount: 0.24 }, { type: 'sine', ratio: 3, amount: 0.12 }]; attack = 0.04; release = 0.25; sustain = 0.72; }
  else if (instrument === 'strings') { waves = [{ type: 'sawtooth', ratio: 0.997, amount: 0.34 }, { type: 'sawtooth', ratio: 1.003, amount: 0.34 }, { type: 'triangle', ratio: 1, amount: 0.32 }]; attack = 0.35; release = 1.4; sustain = 0.55; cutoff = 2_700; }
  else if (instrument === 'marimba') { waves = [{ type: 'sine', ratio: 1, amount: 0.72 }, { type: 'sine', ratio: 3.99, amount: 0.28 }]; release = 0.42; sustain = 0.05; cutoff = 5_500; }
  else if (instrument === 'bass') { waves = [{ type: 'triangle', ratio: 0.5, amount: 0.55 }, { type: 'sine', ratio: 1, amount: 0.45 }]; attack = 0.018; release = 0.45; sustain = 0.5; cutoff = 1_100; }
  else if (instrument === 'synth') { waves = [{ type: 'sawtooth', ratio: 1, amount: 0.58 }, { type: 'square', ratio: 0.5, amount: 0.42 }]; attack = 0.025; release = 0.5; sustain = 0.44; cutoff = 3_800; }
  filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, when);
  gain.gain.setValueAtTime(0.0001, when); gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), when + attack);
  if (duration) {
    const releaseStart = Math.max(when + attack + 0.02, when + duration);
    if (['grand', 'bright', 'felt', 'electric', 'marimba'].includes(instrument)) gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * sustain), Math.min(releaseStart, when + 0.55));
    gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value || volume * sustain), releaseStart); gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release);
  } else gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * sustain), when + 0.5);
  filter.connect(gain); gain.connect(context.destination);
  waves.forEach((wave) => { const oscillator = context.createOscillator(); const partialGain = context.createGain(); oscillator.type = wave.type; oscillator.frequency.setValueAtTime(frequency * wave.ratio, when); partialGain.gain.value = wave.amount; oscillator.connect(partialGain); partialGain.connect(filter); oscillator.start(when); if (stopAt) oscillator.stop(stopAt); sources.push(oscillator); });
  return { sources, gain };
}
function releaseVoice(context: AudioContext, voice: Voice, release = 0.18) {
  const now = context.currentTime; voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now); voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
  voice.sources.forEach((source) => { try { source.stop(now + release + 0.03); } catch {} });
}
function resampleMono(input: AudioBuffer, sampleRate = MODEL_SAMPLE_RATE) {
  const length = Math.max(1, Math.round(input.duration * sampleRate)); const output = new Float32Array(length); const channels = Array.from({ length: input.numberOfChannels }, (_, index) => input.getChannelData(index)); const ratio = input.sampleRate / sampleRate;
  for (let index = 0; index < length; index += 1) { const sourcePosition = index * ratio; const low = Math.floor(sourcePosition); const high = Math.min(input.length - 1, low + 1); const mix = sourcePosition - low; let sample = 0; channels.forEach((channel) => { sample += (channel[low] * (1 - mix) + channel[high] * mix) / channels.length; }); output[index] = sample; }
  return output;
}
function decodeModelChunk(onsetData: Float32Array, frameData: Float32Array, velocityData: Float32Array | undefined, frameCount: number, chunkOffset: number, chunkDuration: number) {
  const notes: Note[] = []; const secondsPerFrame = chunkDuration / Math.max(1, frameCount - 1);
  for (let pitch = 0; pitch < 88; pitch += 1) { let frame = 1; while (frame < frameCount - 1) {
    const index = frame * 88 + pitch; const onset = onsetData[index] ?? 0; const isPeak = onset > 0.45 && onset >= (onsetData[index - 88] ?? 0) && onset >= (onsetData[index + 88] ?? 0);
    if (!isPeak) { frame += 1; continue; }
    let endFrame = frame + 2; while (endFrame < frameCount - 1 && endFrame - frame < 1_200) { const frameProbability = frameData[endFrame * 88 + pitch] ?? 0; if (frameProbability < 0.32 && endFrame - frame > 3) break; const nextOnset = onsetData[endFrame * 88 + pitch] ?? 0; if (nextOnset > 0.5 && endFrame - frame > 4) break; endFrame += 1; }
    const velocityRaw = velocityData?.[index] ?? 0.72; const velocity = velocityRaw > 1 ? velocityRaw / 128 : velocityRaw;
    notes.push({ id: uid('ai'), midi: pitch + 21, time: chunkOffset + frame * secondsPerFrame, duration: Math.max(0.06, (endFrame - frame) * secondsPerFrame), velocity: clamp(velocity, 0.18, 1) }); frame = Math.max(frame + 1, endFrame - 1);
  }} return notes;
}

export function MidiStudio() {
  const [tracks, setTracks] = useState<Track[]>([demoTrack]); const [selectedTrackId, setSelectedTrackId] = useState(demoTrack.id); const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [tempo, setTempo] = useState(120); const [projectName, setProjectName] = useState('Proyecto sin título'); const [isPlaying, setIsPlaying] = useState(false); const [isRecording, setIsRecording] = useState(false); const [playhead, setPlayhead] = useState(0); const [zoom, setZoom] = useState(90); const [snapEnabled, setSnapEnabled] = useState(true); const [activeTab, setActiveTab] = useState('editor');
  const [notice, setNotice] = useState<string | null>('Proyecto de ejemplo listo. Ábrelo, bórralo o importa tu propio MIDI.'); const [history, setHistory] = useState<HistoryState[]>([]); const [future, setFuture] = useState<HistoryState[]>([]); const [drag, setDrag] = useState<DragState | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null); const [modelStatus, setModelStatus] = useState<ModelStatus>('idle'); const [modelProgress, setModelProgress] = useState(0); const [modelMessage, setModelMessage] = useState('El modelo se descarga al usarlo por primera vez y luego queda en la caché del navegador.'); const [transcriptionThreshold, setTranscriptionThreshold] = useState(45); const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const midiInputRef = useRef<HTMLInputElement>(null); const audioInputRef = useRef<HTMLInputElement>(null); const audioContextRef = useRef<AudioContext | null>(null); const scheduledVoicesRef = useRef<Voice[]>([]); const liveVoicesRef = useRef<Map<number, Voice>>(new Map()); const recordedNotesRef = useRef<Map<number, { startedAt: number; id: string }>>(new Map()); const animationRef = useRef<number | null>(null); const playbackStartedAtRef = useRef(0); const playbackOffsetRef = useRef(0);
  const tracksRef = useRef(tracks); const playheadRef = useRef(playhead); const selectedTrackIdRef = useRef(selectedTrackId); const tempoRef = useRef(tempo); const isRecordingRef = useRef(isRecording);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]); useEffect(() => { playheadRef.current = playhead; }, [playhead]); useEffect(() => { selectedTrackIdRef.current = selectedTrackId; }, [selectedTrackId]); useEffect(() => { tempoRef.current = tempo; }, [tempo]); useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) ?? tracks[0]; const selectedNote = selectedTrack?.notes.find((note) => note.id === selectedNoteId) ?? null;
  const duration = Math.max(4, ...tracks.flatMap((track) => track.notes.map((note) => note.time + note.duration))); const gridWidth = Math.max(920, (duration + 2) * zoom);
  const pitchRows = useMemo(() => Array.from({ length: MAX_PITCH - MIN_PITCH + 1 }, (_, index) => MAX_PITCH - index), []);
  const getContext = useCallback(async () => { if (!audioContextRef.current) audioContextRef.current = new AudioContext(); if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume(); return audioContextRef.current; }, []);
  const pushHistory = useCallback(() => { setHistory((items) => [...items.slice(-39), { tracks: cloneTracks(tracksRef.current), selectedTrackId: selectedTrackIdRef.current }]); setFuture([]); }, []);
  const updateTrack = useCallback((trackId: string, updater: (track: Track) => Track) => { setTracks((items) => items.map((track) => track.id === trackId ? updater(track) : track)); }, []);
  const stopPlayback = useCallback((reset = false) => { scheduledVoicesRef.current.forEach((voice) => voice.sources.forEach((source) => { try { source.stop(); } catch {} })); scheduledVoicesRef.current = []; if (animationRef.current) window.clearInterval(animationRef.current); animationRef.current = null; setIsPlaying(false); if (reset) { setPlayhead(0); playheadRef.current = 0; } }, []);
  const startPlayback = useCallback(async () => {
    if (isPlaying) { const elapsed = audioContextRef.current ? audioContextRef.current.currentTime - playbackStartedAtRef.current : 0; const next = Math.min(duration, playbackOffsetRef.current + elapsed); setPlayhead(next); playheadRef.current = next; stopPlayback(false); return; }
    const context = await getContext(); const offset = playheadRef.current >= duration - 0.02 ? 0 : playheadRef.current; setPlayhead(offset); playheadRef.current = offset; playbackOffsetRef.current = offset; playbackStartedAtRef.current = context.currentTime; const now = context.currentTime + 0.04; const soloed = tracksRef.current.some((track) => track.solo);
    tracksRef.current.forEach((track) => { if (track.muted || (soloed && !track.solo)) return; track.notes.forEach((note) => { if (note.time + note.duration <= offset) return; const noteStart = Math.max(offset, note.time); const remainingDuration = note.duration - Math.max(0, offset - note.time); scheduledVoicesRef.current.push(createVoice(context, note.midi, track.instrument, note.velocity, now + (noteStart - offset), remainingDuration)); }); });
    setIsPlaying(true);
    const tick = () => {
      const current = playbackOffsetRef.current + (context.currentTime - playbackStartedAtRef.current);
      if (current >= duration) {
        setPlayhead(0);
        playheadRef.current = 0;
        stopPlayback(false);
        return;
      }
      setPlayhead(current);
      playheadRef.current = current;
    };
    animationRef.current = window.setInterval(tick, 16);
  }, [duration, getContext, isPlaying, stopPlayback]);
  const noteOn = useCallback(async (midi: number) => { if (liveVoicesRef.current.has(midi)) return; const context = await getContext(); const instrument = tracksRef.current.find((track) => track.id === selectedTrackIdRef.current)?.instrument ?? 'grand'; const voice = createVoice(context, midi, instrument, 0.82, context.currentTime); liveVoicesRef.current.set(midi, voice); setActiveKeys((keys) => new Set(keys).add(midi)); if (isRecordingRef.current) recordedNotesRef.current.set(midi, { startedAt: playheadRef.current, id: uid('recorded') }); }, [getContext]);
  const noteOff = useCallback((midi: number) => { const context = audioContextRef.current; const voice = liveVoicesRef.current.get(midi); if (context && voice) releaseVoice(context, voice, 0.25); liveVoicesRef.current.delete(midi); setActiveKeys((keys) => { const next = new Set(keys); next.delete(midi); return next; }); const recorded = recordedNotesRef.current.get(midi); if (recorded) { const end = Math.max(playheadRef.current, recorded.startedAt + 0.08); updateTrack(selectedTrackIdRef.current, (track) => ({ ...track, notes: [...track.notes, { id: recorded.id, midi, time: recorded.startedAt, duration: end - recorded.startedAt, velocity: 0.82 }] })); recordedNotesRef.current.delete(midi); } }, [updateTrack]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { const target = event.target as HTMLElement | null; if (target?.matches('input, textarea, select, button, [contenteditable="true"]')) return; if (event.code === 'Space') { event.preventDefault(); void startPlayback(); return; } if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNoteId) { event.preventDefault(); pushHistory(); updateTrack(selectedTrackIdRef.current, (track) => ({ ...track, notes: track.notes.filter((note) => note.id !== selectedNoteId) })); setSelectedNoteId(null); return; } const midi = KEYBOARD_MAP[event.key.toLowerCase()]; if (midi !== undefined && !event.repeat) { event.preventDefault(); void noteOn(midi); } };
    const onKeyUp = (event: KeyboardEvent) => { const midi = KEYBOARD_MAP[event.key.toLowerCase()]; if (midi !== undefined) noteOff(midi); };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [noteOff, noteOn, pushHistory, selectedNoteId, startPlayback, updateTrack]);
  useEffect(() => { if (!drag) return; const onMove = (event: PointerEvent) => { const deltaTimeRaw = (event.clientX - drag.startX) / zoom; const snapStep = 60 / tempoRef.current / 4; const rawTime = Math.max(0, drag.originalTime + deltaTimeRaw); const time = snapEnabled ? Math.round(rawTime / snapStep) * snapStep : rawTime; const pitchDelta = Math.round((drag.startY - event.clientY) / ROW_HEIGHT); updateTrack(drag.trackId, (track) => ({ ...track, notes: track.notes.map((note) => note.id === drag.noteId ? { ...note, time, midi: clamp(drag.originalMidi + pitchDelta, 0, 127) } : note) })); }; const onUp = () => setDrag(null); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true }); return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }; }, [drag, snapEnabled, updateTrack, zoom]);
  useEffect(() => () => stopPlayback(false), [stopPlayback]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext; if (!context?.registerTool) return; const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: 'midi_add_notes', title: 'Añadir notas MIDI', description: 'Añade notas a la pista seleccionada del editor MIDI visible.', inputSchema: { type: 'object', properties: { notes: { type: 'array', minItems: 1, maxItems: 64, items: { type: 'object', properties: { midi: { type: 'integer', minimum: 0, maximum: 127 }, time: { type: 'number', minimum: 0 }, duration: { type: 'number', exclusiveMinimum: 0 }, velocity: { type: 'number', minimum: 0, maximum: 1 } }, required: ['midi', 'time', 'duration'], additionalProperties: false } } }, required: ['notes'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input: unknown) { const notes = (input as { notes?: Array<Partial<Note>> })?.notes; if (!Array.isArray(notes) || !notes.length) throw new Error('Se necesita al menos una nota.'); const valid = notes.map((note) => { if (!Number.isInteger(note.midi) || Number(note.midi) < 0 || Number(note.midi) > 127 || !Number.isFinite(note.time) || Number(note.time) < 0 || !Number.isFinite(note.duration) || Number(note.duration) <= 0) throw new Error('Cada nota debe tener MIDI 0–127, tiempo ≥ 0 y duración > 0.'); return { id: uid('agent'), midi: Number(note.midi), time: Number(note.time), duration: Number(note.duration), velocity: clamp(Number(note.velocity ?? 0.8), 0, 1) }; }); updateTrack(selectedTrackIdRef.current, (track) => ({ ...track, notes: [...track.notes, ...valid] })); return { added: valid.length, trackId: selectedTrackIdRef.current }; } }, { signal: lifecycle.signal })).catch(() => {}); return () => lifecycle.abort();
  }, [updateTrack]);

  const handleMidiImport = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { const midi = new Midi(await file.arrayBuffer()); const importedTracks: Track[] = midi.tracks.filter((track) => track.notes.length > 0).map((track, index) => ({ id: uid('track'), name: track.name || `Pista ${index + 1}`, instrument: track.instrument.percussion ? 'marimba' : track.instrument.family === 'bass' ? 'bass' : 'grand', color: TRACK_COLORS[index % TRACK_COLORS.length], muted: false, solo: false, notes: track.notes.map((note) => ({ id: uid('note'), midi: note.midi, time: note.time, duration: Math.max(0.04, note.duration), velocity: note.velocity })) })); if (!importedTracks.length) throw new Error('El archivo no contiene notas MIDI.'); pushHistory(); setTracks(importedTracks); setSelectedTrackId(importedTracks[0].id); setSelectedNoteId(null); setTempo(Math.round(midi.header.tempos[0]?.bpm ?? 120)); setProjectName(file.name.replace(/\.midi?$/i, '')); setPlayhead(0); setNotice(`${file.name} abierto: ${importedTracks.reduce((sum, track) => sum + track.notes.length, 0)} notas en ${importedTracks.length} pista${importedTracks.length === 1 ? '' : 's'}.`); } catch (error) { setNotice(error instanceof Error ? error.message : 'No fue posible abrir este archivo MIDI.'); } };
  const exportMidi = () => { const midi = new Midi(); midi.header.setTempo(tempo); midi.header.name = projectName; tracks.forEach((track) => { const midiTrack = midi.addTrack(); midiTrack.name = track.name; track.notes.slice().sort((a, b) => a.time - b.time).forEach((note) => midiTrack.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: note.velocity })); }); const blob = new Blob([new Uint8Array(midi.toArray())], { type: 'audio/midi' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${projectName.trim() || 'proyecto-midi'}.mid`; link.click(); URL.revokeObjectURL(url); setNotice('MIDI exportado y listo en tus descargas.'); };
  const addTrack = () => { pushHistory(); const id = uid('track'); const next: Track = { id, name: `Pista ${tracks.length + 1}`, instrument: 'grand', notes: [], color: TRACK_COLORS[tracks.length % TRACK_COLORS.length], muted: false, solo: false }; setTracks((items) => [...items, next]); setSelectedTrackId(id); setSelectedNoteId(null); };
  const removeTrack = (trackId: string) => { if (tracks.length === 1) { setNotice('El proyecto debe conservar al menos una pista.'); return; } pushHistory(); const next = tracks.filter((track) => track.id !== trackId); setTracks(next); if (selectedTrackId === trackId) setSelectedTrackId(next[0].id); setSelectedNoteId(null); };
  const addNoteAt = (event: MouseEvent<HTMLDivElement>) => { if (!selectedTrack) return; const rect = event.currentTarget.getBoundingClientRect(); const timeRaw = (event.clientX - rect.left) / zoom; const snapStep = 60 / tempo / 4; const time = snapEnabled ? Math.round(timeRaw / snapStep) * snapStep : timeRaw; const row = Math.floor((event.clientY - rect.top) / ROW_HEIGHT); const midi = clamp(MAX_PITCH - row, MIN_PITCH, MAX_PITCH); pushHistory(); const note: Note = { id: uid('note'), midi, time: Math.max(0, time), duration: 60 / tempo, velocity: 0.8 }; updateTrack(selectedTrack.id, (track) => ({ ...track, notes: [...track.notes, note] })); setSelectedNoteId(note.id); };
  const startNoteDrag = (event: ReactPointerEvent<HTMLButtonElement>, note: Note) => { event.stopPropagation(); pushHistory(); setSelectedNoteId(note.id); setDrag({ noteId: note.id, trackId: selectedTrackId, startX: event.clientX, startY: event.clientY, originalTime: note.time, originalMidi: note.midi }); };
  const quantizeNotes = () => { if (!selectedTrack) return; pushHistory(); const step = 60 / tempo / 4; updateTrack(selectedTrack.id, (track) => ({ ...track, notes: track.notes.map((note) => !selectedNoteId || note.id === selectedNoteId ? { ...note, time: Math.round(note.time / step) * step, duration: Math.max(step, Math.round(note.duration / step) * step) } : note) })); setNotice(selectedNoteId ? 'Nota ajustada a la cuadrícula de 1/16.' : 'Pista cuantizada a 1/16.'); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((items) => [...items, { tracks: cloneTracks(tracksRef.current), selectedTrackId: selectedTrackIdRef.current }]); setTracks(cloneTracks(previous.tracks)); setSelectedTrackId(previous.selectedTrackId); setHistory((items) => items.slice(0, -1)); setSelectedNoteId(null); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((items) => [...items, { tracks: cloneTracks(tracksRef.current), selectedTrackId: selectedTrackIdRef.current }]); setTracks(cloneTracks(next.tracks)); setSelectedTrackId(next.selectedTrackId); setFuture((items) => items.slice(0, -1)); setSelectedNoteId(null); };
  const clearProject = () => { pushHistory(); stopPlayback(true); const empty = { ...demoTrack, id: uid('track'), notes: [], name: 'Piano principal' }; setTracks([empty]); setSelectedTrackId(empty.id); setSelectedNoteId(null); setProjectName('Proyecto sin título'); setNotice('Proyecto vacío listo para tocar o dibujar notas.'); };
  const updateSelectedNote = (patch: Partial<Note>) => { if (!selectedTrack || !selectedNote) return; updateTrack(selectedTrack.id, (track) => ({ ...track, notes: track.notes.map((note) => note.id === selectedNote.id ? { ...note, ...patch } : note) })); };

  const transcribeAudio = async () => {
    if (!audioFile) { audioInputRef.current?.click(); return; }
    try {
      setModelStatus('loading'); setModelProgress(3); setModelMessage('Preparando el motor local y descargando el modelo…');
      const ort = await loadOrtRuntime(); ort.env.wasm.wasmPaths = ORT_WASM_PATH; ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 1);
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'], graphOptimizationLevel: 'disabled' });
      setModelProgress(16); setModelMessage('Decodificando y preparando el audio a 16 kHz…'); const context = await getContext(); const decoded = await context.decodeAudioData((await audioFile.arrayBuffer()).slice(0)); const audio = resampleMono(decoded); const totalChunks = Math.ceil(audio.length / MODEL_WINDOW); const transcribed: Note[] = []; setModelStatus('running');
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) { const chunk = new Float32Array(MODEL_WINDOW); const start = chunkIndex * MODEL_WINDOW; const slice = audio.subarray(start, Math.min(audio.length, start + MODEL_WINDOW)); chunk.set(slice); setModelMessage(`Analizando segmento ${chunkIndex + 1} de ${totalChunks}…`); setModelProgress(16 + Math.round(((chunkIndex + 0.2) / totalChunks) * 78)); const outputs = await session.run({ waveform: new ort.Tensor('float32', chunk, [1, MODEL_WINDOW]) }); const onsetTensor = outputs.reg_onset_output ?? outputs.reg_onset; const frameTensor = outputs.frame_output ?? outputs.frame; const velocityTensor = outputs.velocity_output ?? outputs.velocity; if (!onsetTensor || !frameTensor) throw new Error('El modelo devolvió una salida no compatible.'); const dims = onsetTensor.dims.map(Number); const frameCount = dims[dims.length - 2] || Math.round((onsetTensor.data.length as number) / 88); const chunkDuration = slice.length / MODEL_SAMPLE_RATE; const decodedNotes = decodeModelChunk(onsetTensor.data as Float32Array, frameTensor.data as Float32Array, velocityTensor?.data as Float32Array | undefined, frameCount, start / MODEL_SAMPLE_RATE, Math.min(10, chunkDuration)).filter((note) => { const index = Math.round((note.time - start / MODEL_SAMPLE_RATE) * (frameCount - 1) / Math.max(chunkDuration, 0.01)) * 88 + (note.midi - 21); const confidence = (onsetTensor.data as Float32Array)[index] ?? 0; return confidence >= transcriptionThreshold / 100; }); transcribed.push(...decodedNotes); setModelProgress(16 + Math.round(((chunkIndex + 1) / totalChunks) * 78)); await new Promise((resolve) => setTimeout(resolve, 0)); }
      await session.release(); if (!transcribed.length) throw new Error('No se detectaron notas. Prueba con una grabación de piano más limpia o baja el umbral.'); pushHistory(); const newTrack: Track = { id: uid('track-ai'), name: `Transcripción · ${audioFile.name.replace(/\.[^.]+$/, '')}`, instrument: 'grand', color: TRACK_COLORS[tracksRef.current.length % TRACK_COLORS.length], muted: false, solo: false, notes: transcribed }; setTracks((items) => [...items, newTrack]); setSelectedTrackId(newTrack.id); setActiveTab('editor'); setPlayhead(0); setModelProgress(100); setModelStatus('done'); setModelMessage(`${transcribed.length} notas detectadas y añadidas en una pista nueva.`); setNotice(`Transcripción terminada: ${transcribed.length} notas añadidas al editor.`);
    } catch (error) { setModelStatus('error'); setModelMessage(error instanceof Error ? error.message : 'No fue posible ejecutar el modelo en este navegador.'); }
  };

  const whiteMidis = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
  const blackKeys = [{ midi: 49, after: 0 }, { midi: 51, after: 1 }, { midi: 54, after: 3 }, { midi: 56, after: 4 }, { midi: 58, after: 5 }, { midi: 61, after: 7 }, { midi: 63, after: 8 }, { midi: 66, after: 10 }, { midi: 68, after: 11 }, { midi: 70, after: 12 }, { midi: 73, after: 14 }];
  const midiToKey = Object.fromEntries(Object.entries(KEYBOARD_MAP).map(([key, midi]) => [midi, key.toUpperCase()]));

  return (
    <div className="space-y-5">
      <input ref={midiInputRef} type="file" accept=".mid,.midi,audio/midi,audio/x-midi" className="hidden" onChange={handleMidiImport} />
      <input ref={audioInputRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" className="hidden" onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ''; setAudioFile(file); if (file) { setModelStatus('idle'); setModelProgress(0); setModelMessage(`${file.name} listo para transcribir.`); } }} />
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as string)}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <TabsList className="h-10 rounded-xl bg-muted p-1"><TabsTrigger value="editor" className="h-8 px-4"><SlidersHorizontal /> Editor MIDI</TabsTrigger><TabsTrigger value="transcription" className="hidden" aria-hidden="true" tabIndex={-1}><Sparkles /> Transcripción IA</TabsTrigger></TabsList>
          <p className="text-xs text-muted-foreground">Atajos: A–; toca · Espacio reproduce · Supr elimina</p>
        </div>
        <TabsContent value="editor" className="mt-4 space-y-4">
          <section className="overflow-hidden rounded-3xl border border-[#322c48] bg-[#161421] text-[#f7f3ff] shadow-[0_30px_70px_rgb(38_27_67_/_18%)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#8d63ff] text-white"><Music2 className="size-5" /></div><div className="min-w-0"><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Nombre del proyecto" className="h-7 max-w-64 border-transparent bg-transparent px-0 font-semibold text-[#f7f3ff] focus-visible:border-[#8d63ff] focus-visible:ring-[#8d63ff]/30" /><p className="text-xs text-[#aaa4bd]">{tempo} BPM · 4/4 · {tracks.length} pista{tracks.length === 1 ? '' : 's'} · {tracks.reduce((sum, track) => sum + track.notes.length, 0)} notas</p></div></div>
              <div className="flex flex-wrap gap-2"><Button variant="ghost" className="text-[#ddd7ed] hover:bg-white/10 hover:text-white" onClick={() => midiInputRef.current?.click()}><Upload /> Abrir MIDI</Button><Button variant="ghost" className="text-[#ddd7ed] hover:bg-white/10 hover:text-white" onClick={clearProject}><RotateCcw /> Nuevo</Button><Button className="bg-[#8d63ff] text-white hover:bg-[#7b50f2]" onClick={exportMidi}><Download /> Exportar MIDI</Button></div>
            </div>
            <div className="grid min-h-[42rem] lg:grid-cols-[17rem_minmax(0,1fr)]">
              <aside className="border-b border-white/10 bg-[#1d1a2a] p-4 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#aaa4bd]">Pistas</p><Button size="icon-sm" variant="ghost" className="text-[#aaa4bd] hover:bg-white/10 hover:text-white" aria-label="Añadir pista" onClick={addTrack}><Plus /></Button></div>
                <div className="mt-3 space-y-2">{tracks.map((track) => (
                  <div key={track.id} className={cn('rounded-2xl border p-3 transition', selectedTrackId === track.id ? 'border-[#8d63ff]/60 bg-[#8d63ff]/10' : 'border-white/8 bg-white/[0.025] hover:bg-white/5')}>
                    <button type="button" aria-label={`Seleccionar pista ${track.name}`} className="flex w-full items-center gap-3 text-left" onClick={() => { setSelectedTrackId(track.id); setSelectedNoteId(null); }}><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: track.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{track.name}</span><span className="block truncate text-xs text-[#aaa4bd]">{track.notes.length} notas · {instrumentLabel(track.instrument)}</span></span></button>
                    {selectedTrackId === track.id ? <div className="mt-3 space-y-2 border-t border-white/10 pt-3"><Input value={track.name} onChange={(event) => updateTrack(track.id, (item) => ({ ...item, name: event.target.value }))} aria-label="Nombre de la pista" className="border-white/10 bg-white/5 text-[#f7f3ff]" /><NativeSelect value={track.instrument} onChange={(event) => updateTrack(track.id, (item) => ({ ...item, instrument: event.target.value as InstrumentId }))} aria-label="Instrumento de la pista" className="w-full [&_select]:border-white/10 [&_select]:bg-white/5 [&_select]:text-[#f7f3ff]"><NativeSelectOptGroup label="Pianos">{instruments.filter((item) => item.group === 'Pianos').map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelectOptGroup><NativeSelectOptGroup label="Otros instrumentos">{instruments.filter((item) => item.group === 'Otros instrumentos').map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelectOptGroup></NativeSelect><div className="flex items-center gap-1.5"><Button size="sm" variant={track.muted ? 'secondary' : 'ghost'} className="flex-1 text-[#d8d3e6] hover:bg-white/10 hover:text-white" onClick={() => updateTrack(track.id, (item) => ({ ...item, muted: !item.muted }))}>M Silencio</Button><Button size="sm" variant={track.solo ? 'secondary' : 'ghost'} className="flex-1 text-[#d8d3e6] hover:bg-white/10 hover:text-white" onClick={() => updateTrack(track.id, (item) => ({ ...item, solo: !item.solo }))}>S Solo</Button><Button size="icon-sm" variant="ghost" className="text-[#aaa4bd] hover:bg-[#d95368]/15 hover:text-[#ff8fa0]" onClick={() => removeTrack(track.id)} aria-label="Eliminar pista"><Trash2 /></Button></div></div> : null}
                  </div>
                ))}</div>
              </aside>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#1a1726] px-3 py-3 sm:gap-3 sm:px-4">
                  <Button size="icon-lg" className="rounded-full bg-[#f7f3ff] text-[#181521] hover:bg-white" aria-label={isPlaying ? 'Pausar' : 'Reproducir'} onClick={() => void startPlayback()}>{isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}</Button>
                  <Button size="icon-lg" variant="ghost" className={cn('rounded-full text-[#c5bfd5] hover:bg-white/10 hover:text-white', isRecording && 'bg-[#ef536b]/15 text-[#ff8193]')} aria-label={isRecording ? 'Detener grabación' : 'Grabar piano virtual'} onClick={() => setIsRecording((value) => !value)}>{isRecording ? <CircleStop className="fill-current" /> : <Radio />}</Button>
                  <div className="min-w-[5.3rem] font-mono text-sm tabular-nums text-[#d8d3e6]">{formatTime(playhead)}</div><div className="hidden h-5 w-px bg-white/10 sm:block" />
                  <span className="flex items-center gap-1.5 text-xs text-[#aaa4bd]"><Input aria-label="Tempo en BPM" type="number" min={30} max={300} value={tempo} onChange={(event) => setTempo(clamp(Number(event.target.value) || 120, 30, 300))} className="h-8 w-16 border-white/10 bg-white/5 text-center text-[#f7f3ff]" /> BPM</span>
                  <div className="flex items-center gap-1"><Button size="icon-sm" variant="ghost" className="text-[#aaa4bd] hover:bg-white/10 hover:text-white" onClick={undo} disabled={!history.length} aria-label="Deshacer"><Undo2 /></Button><Button size="icon-sm" variant="ghost" className="text-[#aaa4bd] hover:bg-white/10 hover:text-white" onClick={redo} disabled={!future.length} aria-label="Rehacer"><Redo2 /></Button></div>
                  <Button size="sm" variant="ghost" className="text-[#c5bfd5] hover:bg-white/10 hover:text-white" onClick={quantizeNotes}><WandSparkles /> Cuantizar</Button><span className="ml-auto flex items-center gap-2 text-xs text-[#aaa4bd]">Ajuste <Switch aria-label="Ajustar notas a la cuadrícula" size="sm" checked={snapEnabled} onCheckedChange={setSnapEnabled} /></span><div className="flex items-center gap-1"><Button size="icon-sm" variant="ghost" className="text-[#aaa4bd] hover:bg-white/10 hover:text-white" onClick={() => setZoom((value) => Math.max(45, value - 15))} aria-label="Alejar"><ZoomOut /></Button><Button size="icon-sm" variant="ghost" className="text-[#aaa4bd] hover:bg-white/10 hover:text-white" onClick={() => setZoom((value) => Math.min(180, value + 15))} aria-label="Acercar"><ZoomIn /></Button></div>
                </div>
                <div className="relative h-[25rem] overflow-auto bg-[#11101a]">
                  <div className="sticky left-0 top-0 z-20 h-6 border-b border-white/10 bg-[#191723]" style={{ width: gridWidth }}>{Array.from({ length: Math.ceil(gridWidth / zoom) + 1 }, (_, index) => <span key={index} className="absolute top-1 text-[0.58rem] text-[#746f82]" style={{ left: index * zoom + 5 }}>{index}s</span>)}</div>
                  <div className="relative" style={{ width: gridWidth, height: pitchRows.length * ROW_HEIGHT }}>
                    <div className="absolute inset-0 cursor-crosshair" style={{ backgroundImage: 'linear-gradient(to right, rgb(255 255 255 / 7%) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 5%) 1px, transparent 1px)', backgroundSize: `${zoom / 4}px 100%, 100% ${ROW_HEIGHT}px` }} onDoubleClick={addNoteAt} aria-label="Piano roll. Haz doble clic para añadir una nota." />
                    {pitchRows.map((midi, index) => <span key={midi} className={cn('pointer-events-none z-10 block w-11 border-b border-r border-white/10 bg-[#1d1a28]/95 pl-1 text-[0.58rem] leading-[22px] text-[#777184]', midi % 12 === 0 && 'text-[#d1c9e2]')} style={{ position: 'absolute', left: 0, top: index * ROW_HEIGHT, height: ROW_HEIGHT }}>{midiName(midi)}</span>)}
                    {selectedTrack?.notes.map((note) => <button type="button" key={note.id} className={cn('absolute z-[5] min-w-2 cursor-grab overflow-hidden rounded-md border px-1.5 text-left text-[0.62rem] font-semibold text-white shadow-[0_4px_12px_rgb(0_0_0_/_22%)] active:cursor-grabbing', selectedNoteId === note.id ? 'border-white ring-2 ring-white/35' : 'border-white/20 hover:border-white/60')} style={{ left: note.time * zoom, top: (MAX_PITCH - note.midi) * ROW_HEIGHT + 2, width: Math.max(8, note.duration * zoom), height: ROW_HEIGHT - 4, backgroundColor: selectedTrack.color }} onPointerDown={(event) => startNoteDrag(event, note)} aria-label={`${midiName(note.midi)}, inicia en ${note.time.toFixed(2)} segundos, dura ${note.duration.toFixed(2)} segundos`}>{note.duration * zoom > 28 ? midiName(note.midi) : ''}</button>)}
                    <button type="button" className="absolute inset-y-0 z-[8] w-px cursor-ew-resize bg-[#ff9273] shadow-[0_0_12px_#ff9273]" style={{ left: playhead * zoom }} onPointerDown={(event) => { const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (rect) setPlayhead(clamp((event.clientX - rect.left) / zoom, 0, duration)); }} aria-label={`Cabezal de reproducción en ${playhead.toFixed(2)} segundos`} />
                  </div>
                </div>
                {selectedNote ? <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#191723] px-4 py-3 text-xs text-[#aaa4bd]"><span className="font-semibold text-[#f7f3ff]">{midiName(selectedNote.midi)}</span><span className="flex items-center gap-1.5">Inicio <Input aria-label="Inicio de la nota en segundos" type="number" step="0.01" min="0" value={selectedNote.time.toFixed(2)} onChange={(event) => updateSelectedNote({ time: Math.max(0, Number(event.target.value)) })} className="h-7 w-20 border-white/10 bg-white/5 text-[#f7f3ff]" /></span><span className="flex items-center gap-1.5">Duración <Input aria-label="Duración de la nota en segundos" type="number" step="0.01" min="0.04" value={selectedNote.duration.toFixed(2)} onChange={(event) => updateSelectedNote({ duration: Math.max(0.04, Number(event.target.value)) })} className="h-7 w-20 border-white/10 bg-white/5 text-[#f7f3ff]" /></span><span className="flex items-center gap-2">Velocidad <Slider aria-label="Velocidad de la nota" min={1} max={100} value={[Math.round(selectedNote.velocity * 100)]} onValueChange={(value) => updateSelectedNote({ velocity: Number(Array.isArray(value) ? value[0] : value) / 100 })} className="w-24" /></span><Button size="sm" variant="ghost" className="ml-auto text-[#ff92a2] hover:bg-[#d95368]/15 hover:text-[#ffb0bc]" onClick={() => { pushHistory(); updateTrack(selectedTrack.id, (track) => ({ ...track, notes: track.notes.filter((note) => note.id !== selectedNote.id) })); setSelectedNoteId(null); }}><Trash2 /> Eliminar</Button></div> : <div className="border-t border-white/10 bg-[#191723] px-4 py-2 text-center text-xs text-[#777184]">Doble clic para crear · arrastra para mover · selecciona una nota para editar sus valores</div>}
                <div className="border-t border-white/10 bg-[#0c0b12] px-3 pb-3 pt-2">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#777184]"><span className="flex items-center gap-1.5"><Keyboard className="size-3.5" /> Piano virtual · {instrumentLabel(selectedTrack?.instrument ?? 'grand')}</span><span>{isRecording ? 'Grabando notas en la pista activa' : 'Toca con el ratón o con A–;'}</span></div>
                  <div className="relative mx-auto flex h-32 max-w-4xl select-none">
                    {whiteMidis.map((midi) => <button type="button" key={midi} className={cn('group relative flex-1 rounded-b-lg border border-[#aaa4bd] bg-[#f7f3ff] text-[#302b3c] transition hover:bg-white active:translate-y-0.5', activeKeys.has(midi) && 'bg-[#d8cbff] shadow-[inset_0_-8px_18px_#b8a2f5]')} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); void noteOn(midi); }} onPointerUp={() => noteOff(midi)} onPointerCancel={() => noteOff(midi)} aria-label={`Tocar ${midiName(midi)}`}><span className="absolute inset-x-0 bottom-2 text-center text-[0.62rem] font-semibold text-[#756e82]">{midiToKey[midi] ?? midiName(midi)}</span></button>)}
                    {blackKeys.map(({ midi, after }) => <button type="button" key={midi} className={cn('absolute top-0 z-10 h-[64%] w-[4.6%] -translate-x-1/2 rounded-b-md border border-black bg-gradient-to-b from-[#2a2732] to-[#08070b] text-white shadow-[0_5px_7px_rgb(0_0_0_/_45%)] active:translate-y-0.5', activeKeys.has(midi) && 'from-[#8162d8] to-[#3b286f]')} style={{ left: `${((after + 1) / whiteMidis.length) * 100}%` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); void noteOn(midi); }} onPointerUp={() => noteOff(midi)} onPointerCancel={() => noteOff(midi)} aria-label={`Tocar ${midiName(midi)}`}><span className="absolute inset-x-0 bottom-1 text-center text-[0.55rem] text-[#bdb6c8]">{midiToKey[midi] ?? ''}</span></button>)}
                  </div>
                </div>
              </div>
            </div>
          </section>
          {notice ? <Alert className="border-primary/15 bg-secondary/55"><Volume2 /><AlertTitle>Estado del proyecto</AlertTitle><AlertDescription>{notice}</AlertDescription><Button size="icon-sm" variant="ghost" className="absolute right-2 top-2" onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X /></Button></Alert> : null}
        </TabsContent>
        <TabsContent value="transcription" className="hidden" aria-hidden="true">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 sm:p-8">
                <Badge className="border border-primary/15 bg-secondary text-secondary-foreground"><Bot /> Modelo añadido</Badge><h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em]">Piano Transcription <span className="text-primary">(ByteDance)</span></h2><p className="mt-3 max-w-xl leading-7 text-muted-foreground">Convierte una grabación de piano en eventos MIDI de alta resolución. El audio se decodifica y el modelo ONNX se ejecuta en este navegador; el archivo no se envía a CeroNube.</p>
                <button type="button" onClick={() => audioInputRef.current?.click()} className="mt-6 grid min-h-44 w-full place-items-center rounded-2xl border-2 border-dashed border-primary/20 bg-secondary/35 p-6 text-center transition hover:border-primary/50 hover:bg-secondary/65 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"><span><FileAudio className="mx-auto size-8 text-primary" /><span className="mt-3 block font-semibold">{audioFile ? audioFile.name : 'Elige una grabación de piano'}</span><span className="mt-1 block text-sm text-muted-foreground">WAV, MP3, M4A, OGG o FLAC · mejor resultado con piano aislado</span></span></button>
                <div className="mt-5 rounded-2xl border border-border bg-background p-4"><div className="flex items-center justify-between gap-4"><label htmlFor="sensitivity" className="text-sm font-medium">Umbral de detección</label><span className="text-sm tabular-nums text-muted-foreground">{transcriptionThreshold}%</span></div><Slider id="sensitivity" min={25} max={70} value={[transcriptionThreshold]} onValueChange={(value) => setTranscriptionThreshold(Number(Array.isArray(value) ? value[0] : value))} className="mt-3" /><p className="mt-2 text-xs leading-5 text-muted-foreground">Más bajo detecta notas suaves; más alto reduce falsos positivos.</p></div>
                <Button className="mt-5 h-11 w-full rounded-xl" onClick={() => void transcribeAudio()} disabled={modelStatus === 'loading' || modelStatus === 'running'}>{modelStatus === 'loading' || modelStatus === 'running' ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{modelStatus === 'loading' ? 'Cargando modelo…' : modelStatus === 'running' ? 'Transcribiendo…' : 'Transcribir y abrir en el editor'}</Button>
              </div>
              <div className="border-t border-border bg-[#0f292c] p-6 text-[#eef9f7] lg:border-l lg:border-t-0 sm:p-8">
                <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#4bd8d3] text-[#071012]"><WandSparkles className="size-5" /></span><div><p className="font-semibold">Procesamiento local</p><p className="text-sm text-[#a9c9c5]">ONNX Runtime · audio mono a 16 kHz</p></div></div>
                <div className="mt-8 space-y-5"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6de4df]">Flujo</p><ol className="mt-3 space-y-3 text-sm text-[#cbe0dd]"><li className="flex gap-3"><span className="font-mono text-[#6de4df]">01</span> Decodifica el audio en tu dispositivo</li><li className="flex gap-3"><span className="font-mono text-[#6de4df]">02</span> Detecta inicio, final y velocidad de 88 teclas</li><li className="flex gap-3"><span className="font-mono text-[#6de4df]">03</span> Crea una pista editable en el piano-roll</li></ol></div><Progress value={modelProgress} className="[&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#4bd8d3]"><ProgressLabel>{modelStatus === 'done' ? 'Completado' : modelStatus === 'error' ? 'Se necesita atención' : 'Progreso'}</ProgressLabel><span className="ml-auto text-sm tabular-nums text-[#a9c9c5]">{modelProgress}%</span></Progress><p className={cn('text-sm leading-6 text-[#a9c9c5]', modelStatus === 'error' && 'text-[#ffb4b4]')}>{modelMessage}</p><Alert className="border-white/10 bg-white/5 text-[#eef9f7]"><Download /><AlertTitle>Primera ejecución</AlertTitle><AlertDescription className="text-[#a9c9c5]">El peso del modelo se obtiene desde Hugging Face. La descarga inicial puede tardar; la inferencia también puede ser lenta en móviles.</AlertDescription></Alert></div>
                <div className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-[#8fb2ae]">Modelo original de Qiuqiang Kong y colaboradores en ByteDance, convertido a ONNX para ejecución web. Pesos bajo CC BY 4.0. <a href="https://github.com/bytedance/piano_transcription" target="_blank" rel="noreferrer" className="text-[#6de4df] underline underline-offset-4">Código y publicación</a></div>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-4"><Save className="size-5 text-primary" /><h3 className="mt-3 font-semibold">MIDI estándar</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Importa y exporta archivos .mid con varias pistas.</p></div><div className="rounded-2xl border border-border bg-card p-4"><Keyboard className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Piano tocable</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Ratón, pantalla táctil o teclado físico, con grabación directa.</p></div><div className="rounded-2xl border border-border bg-card p-4"><Eraser className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Edición nota a nota</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Mueve, cuantiza, afina y ajusta duración y velocidad.</p></div></section>
    </div>
  );
}
