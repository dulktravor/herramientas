'use client';

import JSZip, { type JSZipObject } from 'jszip';
import {
  AlertTriangle,
  Archive,
  Check,
  Download,
  Eye,
  FileArchive,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  downloadBlob,
  formatBytes,
  makeId,
  replaceExtension,
} from '@/lib/browser-files';

const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 500 * 1024 * 1024;
const MAX_ENTRIES = 5_000;
const MAX_PREVIEW_BYTES = 256 * 1024;
const CANCELLED = 'ZIP_OPERATION_CANCELLED';
const textExtensions = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'yml',
  'yaml',
  'toml',
  'ini',
  'log',
  'srt',
  'vtt',
  'svg',
]);

type Operation = 'idle' | 'opening' | 'packing' | 'extracting';

type ManagedEntry = {
  id: string;
  path: string;
  directory: boolean;
  originalSize: number;
  compressedSize: number | null;
  selected: boolean;
  source: File | JSZipObject | null;
  warning: string | null;
};

type WritableFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type WritableDirectoryHandle = {
  getDirectoryHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<WritableDirectoryHandle>;
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<WritableFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<WritableDirectoryHandle>;
};

function normalizePath(value: string) {
  return value
    .replaceAll('\\', '/')
    .replace(/^[a-zA-Z]:/, '')
    .replace(/^\/+/, '')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

function pathProblem(value: string) {
  const normalized = value.replaceAll('\\', '/');
  if (normalized.includes('\0')) return 'Contiene un carácter nulo.';
  if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith('/'))
    return 'Intentaba usar una ruta absoluta.';
  if (normalized.split('/').includes('..'))
    return 'Intentaba salir de la carpeta de destino mediante “../”.';
  return null;
}

function extensionOf(path: string) {
  return path.split('.').pop()?.toLocaleLowerCase('es') ?? '';
}

function canPreview(entry: ManagedEntry) {
  return (
    !entry.directory &&
    entry.originalSize <= MAX_PREVIEW_BYTES &&
    textExtensions.has(extensionOf(entry.path))
  );
}

function privateSizes(object: JSZipObject) {
  const data = (
    object as unknown as {
      _data?: { compressedSize?: number; uncompressedSize?: number };
    }
  )._data;
  return {
    originalSize: data?.uncompressedSize ?? 0,
    compressedSize: data?.compressedSize ?? null,
  };
}

function baseName(path: string) {
  return path.replace(/\/$/, '').split('/').pop() || 'archivo';
}

function parentDepth(path: string) {
  return Math.max(0, path.replace(/\/$/, '').split('/').length - 1);
}

function nextFrame() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

async function writeIntoDirectory(
  root: WritableDirectoryHandle,
  path: string,
  blob: Blob,
) {
  const parts = path.split('/').filter(Boolean);
  const filename = parts.pop();
  if (!filename) return;
  let directory = root;
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: true });
  }
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export function ZipManager() {
  const [mode, setMode] = useState<'create' | 'open'>('create');
  const [entries, setEntries] = useState<ManagedEntry[]>([]);
  const [archiveName, setArchiveName] = useState<string | null>(null);
  const [compression, setCompression] = useState(6);
  const [operation, setOperation] = useState<Operation>('idle');
  const [progress, setProgress] = useState(0);
  const [operationLabel, setOperationLabel] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [renameEntry, setRenameEntry] = useState<ManagedEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const cancelRequested = useRef(false);

  const busy = operation !== 'idle';
  const files = useMemo(
    () => entries.filter((entry) => !entry.directory),
    [entries],
  );
  const selectedFiles = useMemo(
    () => files.filter((entry) => entry.selected),
    [files],
  );
  const totalOriginal = useMemo(
    () => files.reduce((sum, entry) => sum + entry.originalSize, 0),
    [files],
  );
  const totalCompressed = useMemo(
    () => files.reduce((sum, entry) => sum + (entry.compressedSize ?? 0), 0),
    [files],
  );
  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return [...entries]
      .filter(
        (entry) =>
          !needle || entry.path.toLocaleLowerCase('es').includes(needle),
      )
      .sort((a, b) => a.path.localeCompare(b.path, 'es', { numeric: true }));
  }, [entries, query]);
  const allSelected = files.length > 0 && selectedFiles.length === files.length;

  function resetMessages() {
    setError('');
    setNotice('');
  }

  function beginOperation(next: Operation, label: string) {
    cancelRequested.current = false;
    setOperation(next);
    setOperationLabel(label);
    setProgress(0);
    resetMessages();
  }

  function endOperation() {
    setOperation('idle');
    setOperationLabel('');
    setProgress(0);
  }

  function cancelOperation() {
    cancelRequested.current = true;
    setOperationLabel('Cancelando…');
  }

  function clearAll() {
    cancelRequested.current = true;
    setEntries([]);
    setArchiveName(null);
    setWarnings([]);
    setQuery('');
    setPreviewName('');
    setPreviewText('');
    resetMessages();
    endOperation();
  }

  function addFiles(fileList: FileList | File[]) {
    resetMessages();
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const existing = new Set(
      entries.map((entry) => entry.path.toLocaleLowerCase('es')),
    );
    const additions: ManagedEntry[] = [];
    const nextWarnings: string[] = [];
    let nextTotal = totalOriginal;

    for (const file of incoming) {
      const browserPath = file.webkitRelativePath || file.name;
      const problem = pathProblem(browserPath);
      const safePath = normalizePath(browserPath);
      if (problem || !safePath) {
        nextWarnings.push(
          `${browserPath || file.name}: ruta rechazada. ${problem ?? 'El nombre está vacío.'}`,
        );
        continue;
      }
      if (existing.has(safePath.toLocaleLowerCase('es'))) {
        nextWarnings.push(
          `${safePath}: nombre duplicado; se conservó la primera versión.`,
        );
        continue;
      }
      if (entries.length + additions.length >= MAX_ENTRIES) {
        nextWarnings.push(
          `Se alcanzó el límite de ${MAX_ENTRIES.toLocaleString('es')} elementos.`,
        );
        break;
      }
      if (nextTotal + file.size > MAX_EXPANDED_BYTES) {
        nextWarnings.push(
          `${safePath}: no se añadió porque el contenido superaría 500 MB.`,
        );
        continue;
      }

      existing.add(safePath.toLocaleLowerCase('es'));
      nextTotal += file.size;
      additions.push({
        id: makeId('zip-entry'),
        path: safePath,
        directory: false,
        originalSize: file.size,
        compressedSize: null,
        selected: true,
        source: file,
        warning: null,
      });
    }

    setEntries((current) => [...current, ...additions]);
    setWarnings((current) => [...current, ...nextWarnings]);
    if (additions.length)
      setNotice(
        `${additions.length} ${additions.length === 1 ? 'elemento añadido' : 'elementos añadidos'}.`,
      );
    if (!additions.length && nextWarnings.length)
      setError('No se pudo añadir ningún elemento. Revisa las advertencias.');
  }

  async function openArchive(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLocaleLowerCase('es').endsWith('.zip')) {
      setError('Selecciona un archivo con extensión .zip.');
      return;
    }
    if (file.size > MAX_ARCHIVE_BYTES) {
      setError('El ZIP no puede superar 200 MB.');
      return;
    }

    beginOperation('opening', 'Leyendo la estructura del ZIP…');
    try {
      setProgress(12);
      const zip = await JSZip.loadAsync(file, { createFolders: true });
      if (cancelRequested.current) throw new Error(CANCELLED);
      setProgress(68);
      const objects = Object.values(zip.files);
      if (objects.length > MAX_ENTRIES) {
        throw new Error(
          `El ZIP contiene más de ${MAX_ENTRIES.toLocaleString('es')} elementos.`,
        );
      }

      const nextEntries: ManagedEntry[] = [];
      const seen = new Set<string>();
      const nextWarnings: string[] = [];
      let expandedBytes = 0;

      for (const object of objects) {
        const unsafeOriginalName = (
          object as JSZipObject & { unsafeOriginalName?: string }
        ).unsafeOriginalName;
        const originalPath = unsafeOriginalName ?? object.name;
        const problem = pathProblem(originalPath);
        const safePath = normalizePath(object.name);
        if (!safePath) continue;
        const directory = object.dir;
        const finalPath = directory
          ? `${safePath.replace(/\/$/, '')}/`
          : safePath;
        const key = finalPath.toLocaleLowerCase('es');
        if (seen.has(key)) {
          nextWarnings.push(
            `${originalPath}: nombre duplicado; solo se conservará una entrada.`,
          );
          continue;
        }
        seen.add(key);

        const sizes = privateSizes(object);
        expandedBytes += sizes.originalSize;
        if (expandedBytes > MAX_EXPANDED_BYTES) {
          throw new Error(
            'El contenido descomprimido supera el límite de 500 MB. No se abrió para proteger la memoria del dispositivo.',
          );
        }
        if (problem)
          nextWarnings.push(
            `${originalPath}: ${problem} Se normalizó como “${finalPath}”.`,
          );

        nextEntries.push({
          id: makeId('zip-entry'),
          path: finalPath,
          directory,
          originalSize: sizes.originalSize,
          compressedSize: sizes.compressedSize,
          selected: !directory,
          source: object,
          warning: problem,
        });
      }

      setEntries(nextEntries);
      setArchiveName(file.name);
      setWarnings(nextWarnings);
      setMode('open');
      setProgress(100);
      setNotice(
        `ZIP abierto: ${nextEntries.filter((entry) => !entry.directory).length} archivos listos para revisar.`,
      );
    } catch (cause) {
      if (cause instanceof Error && cause.message === CANCELLED) {
        setNotice('La apertura se canceló.');
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : 'No fue posible abrir este ZIP. Puede estar dañado o protegido con contraseña.',
        );
      }
    } finally {
      endOperation();
    }
  }

  async function entryBlob(
    entry: ManagedEntry,
    progressStart = 0,
    progressSpan = 100,
  ) {
    if (!entry.source) return new Blob();
    if (entry.source instanceof File) return entry.source;
    return entry.source.async('blob', (metadata) => {
      if (cancelRequested.current) throw new Error(CANCELLED);
      setProgress(
        Math.min(100, progressStart + (metadata.percent / 100) * progressSpan),
      );
    });
  }

  async function createZip() {
    if (!files.length) {
      setError('Añade al menos un archivo antes de crear el ZIP.');
      return;
    }
    beginOperation('packing', 'Preparando los archivos…');
    try {
      const output = new JSZip();
      const ordered = [...entries].sort((a, b) =>
        a.path.localeCompare(b.path, 'es'),
      );
      for (let index = 0; index < ordered.length; index += 1) {
        if (cancelRequested.current) throw new Error(CANCELLED);
        const entry = ordered[index];
        if (entry.directory) {
          output.folder(entry.path);
        } else {
          const content = await entryBlob(
            entry,
            (index / ordered.length) * 35,
            35 / ordered.length,
          );
          output.file(entry.path, content);
        }
        if (index % 12 === 0) await nextFrame();
      }

      setOperationLabel('Comprimiendo el ZIP…');
      const blob = await output.generateAsync(
        {
          type: 'blob',
          compression: compression === 0 ? 'STORE' : 'DEFLATE',
          compressionOptions: { level: compression },
          platform: 'DOS',
        },
        (metadata) => {
          if (cancelRequested.current) throw new Error(CANCELLED);
          setProgress(35 + metadata.percent * 0.65);
          if (metadata.currentFile)
            setOperationLabel(`Comprimiendo ${metadata.currentFile}…`);
        },
      );
      if (cancelRequested.current) throw new Error(CANCELLED);

      const filename = archiveName
        ? replaceExtension(archiveName, 'zip', '-editado')
        : 'archivo.zip';
      downloadBlob(blob, filename);
      setNotice(`${filename} está listo (${formatBytes(blob.size)}).`);
    } catch (cause) {
      if (cause instanceof Error && cause.message === CANCELLED)
        setNotice('La compresión se canceló.');
      else
        setError(
          cause instanceof Error
            ? cause.message
            : 'No fue posible crear el ZIP.',
        );
    } finally {
      endOperation();
    }
  }

  async function extractSelected() {
    if (!selectedFiles.length) {
      setError('Selecciona al menos un archivo para extraer.');
      return;
    }
    beginOperation('extracting', 'Preparando la extracción…');
    try {
      const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
      let destination: WritableDirectoryHandle | null = null;
      if (picker) {
        try {
          destination = await picker.call(window, { mode: 'readwrite' });
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === 'AbortError') {
            setNotice('La selección de carpeta se canceló.');
            return;
          }
          throw cause;
        }
      }

      for (let index = 0; index < selectedFiles.length; index += 1) {
        if (cancelRequested.current) throw new Error(CANCELLED);
        const entry = selectedFiles[index];
        setOperationLabel(`Extrayendo ${entry.path}…`);
        const blob = await entryBlob(
          entry,
          (index / selectedFiles.length) * 100,
          100 / selectedFiles.length,
        );
        if (destination)
          await writeIntoDirectory(destination, entry.path, blob);
        else downloadBlob(blob, baseName(entry.path));
        if (index % 8 === 0) await nextFrame();
      }

      setProgress(100);
      setNotice(
        destination
          ? `${selectedFiles.length} ${selectedFiles.length === 1 ? 'archivo extraído' : 'archivos extraídos'} con su estructura de carpetas.`
          : `${selectedFiles.length} ${selectedFiles.length === 1 ? 'archivo descargado' : 'archivos descargados'}. Tu navegador puede pedir permiso para descargas múltiples.`,
      );
    } catch (cause) {
      if (cause instanceof Error && cause.message === CANCELLED)
        setNotice('La extracción se canceló.');
      else
        setError(
          cause instanceof Error
            ? cause.message
            : 'No fue posible extraer los archivos seleccionados.',
        );
    } finally {
      endOperation();
    }
  }

  async function previewEntry(entry: ManagedEntry) {
    if (!canPreview(entry)) return;
    setPreviewName(entry.path);
    setPreviewText('');
    setPreviewLoading(true);
    try {
      const blob = await entryBlob(entry);
      setPreviewText(await blob.text());
    } catch {
      setPreviewText('No fue posible leer este archivo como texto.');
    } finally {
      setPreviewLoading(false);
    }
  }

  function toggleEntry(entry: ManagedEntry, checked: boolean) {
    const prefix = entry.directory ? entry.path : null;
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id || (prefix && item.path.startsWith(prefix))
          ? { ...item, selected: checked }
          : item,
      ),
    );
  }

  function removeEntry(entry: ManagedEntry) {
    setEntries((current) =>
      current.filter(
        (item) =>
          item.id !== entry.id &&
          !(entry.directory && item.path.startsWith(entry.path)),
      ),
    );
    setNotice(`${baseName(entry.path)} se quitó de la lista.`);
    setError('');
  }

  function startRename(entry: ManagedEntry) {
    setRenameEntry(entry);
    setRenameValue(entry.path.replace(/\/$/, ''));
    setRenameError('');
  }

  function saveRename() {
    if (!renameEntry) return;
    const problem = pathProblem(renameValue);
    const normalized = normalizePath(renameValue);
    if (problem || !normalized) {
      setRenameError(problem ?? 'Escribe un nombre o una ruta válida.');
      return;
    }
    const nextPath = renameEntry.directory ? `${normalized}/` : normalized;
    const oldPrefix = renameEntry.path;
    const affectedIds = new Set(
      entries
        .filter(
          (entry) =>
            entry.id === renameEntry.id ||
            (renameEntry.directory && entry.path.startsWith(oldPrefix)),
        )
        .map((entry) => entry.id),
    );
    const unaffected = new Set(
      entries
        .filter((entry) => !affectedIds.has(entry.id))
        .map((entry) => entry.path.toLocaleLowerCase('es')),
    );
    const replacements = entries
      .filter((entry) => affectedIds.has(entry.id))
      .map((entry) =>
        entry.id === renameEntry.id
          ? nextPath
          : `${nextPath}${entry.path.slice(oldPrefix.length)}`,
      );
    if (
      replacements.some((path) => unaffected.has(path.toLocaleLowerCase('es')))
    ) {
      setRenameError(
        'Ese nombre ya existe en el ZIP. Elige otro para evitar duplicados.',
      );
      return;
    }

    setEntries((current) =>
      current.map((entry) => {
        if (entry.id === renameEntry.id) return { ...entry, path: nextPath };
        if (renameEntry.directory && entry.path.startsWith(oldPrefix)) {
          return {
            ...entry,
            path: `${nextPath}${entry.path.slice(oldPrefix.length)}`,
          };
        }
        return entry;
      }),
    );
    setRenameEntry(null);
    setNotice(`Elemento renombrado como “${nextPath}”.`);
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as 'create' | 'open')}
      >
        <TabsList
          className="h-11 w-full rounded-xl p-1 sm:w-auto"
          aria-label="Elegir operación ZIP"
        >
          <TabsTrigger value="create" className="h-full px-4">
            <Plus aria-hidden="true" /> Crear ZIP
          </TabsTrigger>
          <TabsTrigger value="open" className="h-full px-4">
            <FolderOpen aria-hidden="true" /> Abrir ZIP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <section
            className={`rounded-3xl border-2 border-dashed p-6 transition-colors sm:p-8 ${dragging ? 'border-primary bg-secondary/70' : 'border-primary/25 bg-card'}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <div className="mx-auto max-w-2xl text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary ring-1 ring-primary/10">
                <Archive className="size-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                Añade archivos y carpetas
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Arrástralos aquí o usa los botones. Puedes reorganizar nombres y
                quitar elementos antes de comprimir.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <label
                  htmlFor="zip-files"
                  className={buttonVariants({
                    size: 'lg',
                    className: 'cursor-pointer rounded-xl',
                  })}
                >
                  <Upload aria-hidden="true" /> Elegir archivos
                </label>
                <input
                  id="zip-files"
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.target.files ?? []);
                    event.target.value = '';
                  }}
                />
                <label
                  htmlFor="zip-folder"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'cursor-pointer rounded-xl',
                  })}
                >
                  <FolderInput aria-hidden="true" /> Elegir carpeta
                </label>
                <input
                  id="zip-folder"
                  type="file"
                  multiple
                  className="sr-only"
                  {...({ webkitdirectory: '', directory: '' } as Record<
                    string,
                    string
                  >)}
                  onChange={(event) => {
                    addFiles(event.target.files ?? []);
                    event.target.value = '';
                  }}
                />
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="open" className="mt-4">
          <section className="rounded-3xl bg-[#083f43] p-6 text-[#f4ead7] shadow-sm dark:bg-[#12171e] sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#4fe0d6] ring-1 ring-white/10">
                  <FileArchive className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-tight">
                  Examina un archivo ZIP
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#bed5cf]">
                  Consulta carpetas y tamaños, previsualiza texto, extrae lo
                  necesario o crea una versión modificada.
                </p>
              </div>
              <label
                htmlFor="zip-archive"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'lg',
                  className:
                    'cursor-pointer rounded-xl bg-[#f4ead7] text-[#083f43] hover:bg-white',
                })}
              >
                <FolderOpen aria-hidden="true" /> Seleccionar ZIP
              </label>
              <input
                id="zip-archive"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="sr-only"
                onChange={(event) => {
                  void openArchive(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Alert className="rounded-2xl border-primary/15 bg-secondary/45 p-4">
        <ShieldCheck className="text-primary" aria-hidden="true" />
        <AlertTitle>
          El ZIP se procesa únicamente en este dispositivo
        </AlertTitle>
        <AlertDescription>
          Límite: 200 MB por ZIP, 500 MB descomprimidos y{' '}
          {MAX_ENTRIES.toLocaleString('es')} elementos. La vista previa admite
          texto de hasta 256 KB. ZIP cifrados y otros formatos comprimidos aún
          no son compatibles.
        </AlertDescription>
      </Alert>

      {warnings.length ? (
        <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/8 p-4 text-amber-900 dark:text-amber-200">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>
            {warnings.length}{' '}
            {warnings.length === 1
              ? 'advertencia detectada'
              : 'advertencias detectadas'}
          </AlertTitle>
          <AlertDescription className="text-current/80">
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              {warnings.length > 4 ? (
                <li>Y {warnings.length - 4} más.</li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="rounded-2xl p-4">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>No se pudo completar la operación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <output className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-foreground">
          <Check className="size-4 text-primary" aria-hidden="true" />
          {notice}
        </output>
      ) : null}

      {busy ? (
        <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <Progress value={progress}>
            <ProgressLabel className="max-w-[75%] truncate">
              {operationLabel}
            </ProgressLabel>
            <ProgressValue>
              {(_formattedValue, value) => `${Math.round(value ?? 0)}%`}
            </ProgressValue>
          </Progress>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-lg"
            onClick={cancelOperation}
          >
            <X aria-hidden="true" /> Cancelar
          </Button>
        </section>
      ) : null}

      {entries.length ? (
        <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Contenido del ZIP
                  </h2>
                  {archiveName ? (
                    <Badge variant="secondary">{archiveName}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {files.length} {files.length === 1 ? 'archivo' : 'archivos'} ·{' '}
                  {formatBytes(totalOriginal)} originales
                  {totalCompressed > 0
                    ? ` · ${formatBytes(totalCompressed)} comprimidos`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={extractSelected}
                  disabled={busy || !selectedFiles.length}
                >
                  <Download aria-hidden="true" /> Extraer seleccionados (
                  {selectedFiles.length})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={clearAll}
                  disabled={busy}
                >
                  <RotateCcw aria-hidden="true" /> Limpiar
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-end">
              <label
                className="space-y-2 text-sm font-medium"
                htmlFor="zip-search"
              >
                Buscar en la estructura
                <Input
                  id="zip-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ejemplo: documentos/"
                  className="h-10 rounded-xl"
                />
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
                  <label htmlFor="zip-compression">Nivel de compresión</label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {compression === 0 ? 'Sin comprimir' : `${compression} / 9`}
                  </span>
                </div>
                <Slider
                  id="zip-compression"
                  min={0}
                  max={9}
                  step={1}
                  value={[compression]}
                  onValueChange={(value) =>
                    setCompression(Array.isArray(value) ? value[0] : value)
                  }
                />
              </div>
            </div>
          </div>

          <Table className="min-w-[720px]">
            <TableHeader className="bg-muted/45 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <TableRow>
                <TableHead className="w-14 px-5 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setEntries((current) =>
                        current.map((entry) => ({
                          ...entry,
                          selected: entry.directory
                            ? entry.selected
                            : checked === true,
                        })),
                      )
                    }
                    aria-label="Seleccionar todos los archivos"
                  />
                </TableHead>
                <TableHead className="px-2 py-3 font-medium">Ruta</TableHead>
                <TableHead className="w-32 px-4 py-3 text-right font-medium">
                  Original
                </TableHead>
                <TableHead className="w-32 px-4 py-3 text-right font-medium">
                  Comprimido
                </TableHead>
                <TableHead className="w-36 px-5 py-3 text-right font-medium">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => {
                const EntryIcon = entry.directory
                  ? Folder
                  : canPreview(entry)
                    ? FileText
                    : FileArchive;
                return (
                  <TableRow
                    key={entry.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="px-5 py-3">
                      <Checkbox
                        checked={entry.selected}
                        onCheckedChange={(checked) =>
                          toggleEntry(entry, checked === true)
                        }
                        aria-label={`${entry.selected ? 'Deseleccionar' : 'Seleccionar'} ${entry.path}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-lg px-2 py-3">
                      <div
                        className="flex min-w-0 items-center gap-2"
                        style={{
                          paddingLeft: `${Math.min(parentDepth(entry.path), 5) * 0.8}rem`,
                        }}
                      >
                        <EntryIcon
                          className={`size-4 shrink-0 ${entry.warning ? 'text-amber-600 dark:text-amber-300' : entry.directory ? 'text-[#d97706]' : 'text-primary'}`}
                          aria-hidden="true"
                        />
                        <span
                          className="truncate font-mono text-xs"
                          title={entry.path}
                        >
                          {baseName(entry.path)}
                          {entry.directory ? '/' : ''}
                        </span>
                        {entry.warning ? (
                          <AlertTriangle
                            className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300"
                            aria-label="Ruta normalizada"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {entry.directory ? '—' : formatBytes(entry.originalSize)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {entry.directory || entry.compressedSize === null
                        ? '—'
                        : formatBytes(entry.compressedSize)}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {canPreview(entry) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void previewEntry(entry)}
                            aria-label={`Previsualizar ${entry.path}`}
                            title="Previsualizar texto"
                          >
                            <Eye aria-hidden="true" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => startRename(entry)}
                          aria-label={`Renombrar ${entry.path}`}
                          title="Renombrar"
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeEntry(entry)}
                          aria-label={`Quitar ${entry.path}`}
                          title="Quitar de la lista"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {visibleEntries.length === 0 ? (
            <div className="border-t border-border px-6 py-12 text-center">
              <FileArchive
                className="mx-auto size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 font-medium">No hay coincidencias</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prueba con otra parte del nombre o la ruta.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 border-t border-border bg-muted/25 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="font-medium">Generar una copia con estos cambios</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Los nombres, eliminaciones y archivos añadidos se aplicarán al
                ZIP descargado.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="rounded-xl"
              onClick={createZip}
              disabled={busy || !files.length}
            >
              <Archive aria-hidden="true" />{' '}
              {archiveName
                ? 'Descargar ZIP modificado'
                : 'Crear y descargar ZIP'}
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <FileArchive
            className="mx-auto size-9 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="mt-4 font-semibold">Todavía no hay contenido</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Añade archivos para crear un ZIP o abre uno existente para
            examinarlo.
          </p>
        </section>
      )}

      <Dialog
        open={Boolean(renameEntry)}
        onOpenChange={(open) => {
          if (!open) setRenameEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar elemento</DialogTitle>
            <DialogDescription>
              Puedes cambiar el nombre o escribir una ruta como
              “documentos/informe.pdf”.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="zip-rename" className="space-y-2 font-medium">
            Nueva ruta
            <Input
              id="zip-rename"
              value={renameValue}
              onChange={(event) => {
                setRenameValue(event.target.value);
                setRenameError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveRename();
              }}
            />
          </label>
          {renameError ? (
            <p role="alert" className="text-sm text-destructive">
              {renameError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameEntry(null)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={saveRename}>
              Guardar nombre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewName)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewName('');
            setPreviewText('');
          }
        }}
      >
        <DialogContent className="max-h-[85vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewName}</DialogTitle>
            <DialogDescription>
              Vista previa local de texto. El archivo no sale del navegador.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-5 whitespace-pre-wrap break-words">
            {previewLoading ? 'Leyendo archivo…' : previewText}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
