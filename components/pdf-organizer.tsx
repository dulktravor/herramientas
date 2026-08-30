'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Drop zones and draggable tiles have accessible alternatives. */

import { useRef, useState } from 'react';
import type { PDFDocument } from 'pdf-lib';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Download,
  FilePlus2,
  Files,
  GripVertical,
  LoaderCircle,
  RotateCw,
  Trash2,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { downloadBlob, makeId, replaceExtension } from '@/lib/browser-files';

type PdfPageItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourcePageIndex: number;
  sourcePageNumber: number;
  rotation: number;
  thumbnail: string;
};

type SourceFile = { name: string; bytes: Uint8Array };

async function createThumbnails(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const thumbnails: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(0.45, 210 / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No fue posible crear la vista previa del PDF.');
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    thumbnails.push(canvas.toDataURL('image/webp', 0.75));
    page.cleanup();
  }
  await document.cleanup();
  return thumbnails;
}

async function loadSourceDocuments(sourceIds: string[], sources: Map<string, SourceFile>) {
  const { PDFDocument } = await import('pdf-lib');
  const documents = new Map<string, PDFDocument>();
  for (const sourceId of sourceIds) {
    const source = sources.get(sourceId);
    if (!source) throw new Error('Falta uno de los documentos originales.');
    documents.set(sourceId, await PDFDocument.load(source.bytes.slice(), { ignoreEncryption: true }));
  }
  return documents;
}

async function buildPdf(pages: PdfPageItem[], sources: Map<string, SourceFile>) {
  const { degrees, PDFDocument } = await import('pdf-lib');
  const output = await PDFDocument.create();
  const documents = await loadSourceDocuments([...new Set(pages.map((page) => page.sourceId))], sources);

  for (const page of pages) {
    const source = documents.get(page.sourceId);
    if (!source) continue;
    const [copied] = await output.copyPages(source, [page.sourcePageIndex]);
    copied.setRotation(degrees((copied.getRotation().angle + page.rotation) % 360));
    output.addPage(copied);
  }
  const bytes = await output.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}

export function PdfOrganizer() {
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const sources = useRef(new Map<string, SourceFile>());
  const draggedId = useRef<string | null>(null);

  async function addFiles(files: FileList | File[]) {
    setError('');
    const selected = Array.from(files).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (selected.length === 0) {
      setError('Selecciona uno o varios archivos PDF válidos.');
      return;
    }
    if (selected.some((file) => file.size > 50 * 1024 * 1024)) {
      setError('Cada PDF debe pesar como máximo 50 MB.');
      return;
    }

    setLoading(true);
    try {
      const nextPages: PdfPageItem[] = [];
      for (const file of selected.slice(0, 10)) {
        const sourceId = makeId('pdf-source');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const thumbnails = await createThumbnails(bytes);
        if (pages.length + nextPages.length + thumbnails.length > 100) {
          throw new Error('El organizador admite hasta 100 páginas en total.');
        }
        sources.current.set(sourceId, { name: file.name, bytes });
        thumbnails.forEach((thumbnail, sourcePageIndex) => {
          nextPages.push({
            id: makeId('pdf-page'),
            sourceId,
            sourceName: file.name,
            sourcePageIndex,
            sourcePageNumber: sourcePageIndex + 1,
            rotation: 0,
            thumbnail,
          });
        });
      }
      setPages((current) => [...current, ...nextPages]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible abrir uno de los documentos.');
    } finally {
      setLoading(false);
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

  function dropBefore(targetId: string) {
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetId) return;
    setPages((current) => {
      const sourceIndex = current.findIndex((page) => page.id === sourceId);
      const targetIndex = current.findIndex((page) => page.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const copy = [...current];
      const [moved] = copy.splice(sourceIndex, 1);
      copy.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved);
      return copy;
    });
  }

  async function exportCombined() {
    if (pages.length === 0) return;
    setExporting(true);
    setError('');
    try {
      const blob = await buildPdf(pages, sources.current);
      downloadBlob(blob, 'documento-organizado.pdf');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible exportar el PDF.');
    } finally {
      setExporting(false);
    }
  }

  async function exportSplit() {
    if (pages.length === 0) return;
    setExporting(true);
    setError('');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const blob = await buildPdf([page], sources.current);
        zip.file(`${String(index + 1).padStart(3, '0')}-${replaceExtension(page.sourceName, 'pdf', `-pagina-${page.sourcePageNumber}`)}`, blob);
      }
      const archive = await zip.generateAsync({ type: 'blob' });
      downloadBlob(archive, 'paginas-separadas.zip');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible separar las páginas.');
    } finally {
      setExporting(false);
    }
  }

  function clearAll() {
    setPages([]);
    sources.current.clear();
    setError('');
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
        aria-labelledby="pdf-upload-title"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          {loading ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : <Files className="size-6" aria-hidden="true" />}
        </span>
        <h2 id="pdf-upload-title" className="mt-4 text-xl font-semibold tracking-tight">
          {pages.length > 0 ? 'Añade más documentos' : 'Arrastra tus PDF aquí'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Hasta 10 archivos, 50 MB por archivo y 100 páginas en total.</p>
        <label htmlFor="pdf-files" className={buttonVariants({ size: 'lg', className: 'mt-5 cursor-pointer rounded-xl px-5' })}>
          <FilePlus2 aria-hidden="true" /> Seleccionar PDF
        </label>
        <input
          id="pdf-files"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </section>

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {pages.length > 0 ? (
        <>
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between" aria-label="Acciones del documento">
            <div>
              <p className="font-medium">{pages.length} {pages.length === 1 ? 'página lista' : 'páginas listas'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Arrastra las páginas o usa las flechas para cambiar el orden.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void exportCombined()} disabled={exporting} className="rounded-xl">
                {exporting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                Descargar PDF
              </Button>
              <Button variant="secondary" onClick={() => void exportSplit()} disabled={exporting} className="rounded-xl">
                <Archive aria-hidden="true" /> Separar en ZIP
              </Button>
              <Button variant="ghost" onClick={clearAll} disabled={exporting} className="rounded-xl">
                <Trash2 aria-hidden="true" /> Limpiar
              </Button>
            </div>
          </section>

          <section aria-labelledby="pdf-pages-title">
            <h2 id="pdf-pages-title" className="sr-only">Páginas del documento</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {pages.map((page, index) => {
                return <article
                  key={page.id}
                  draggable
                  onDragStart={() => { draggedId.current = page.id; }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropBefore(page.id)}
                  className="group overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
                >
                  <div className="relative grid h-52 place-items-center bg-muted/40 p-3">
                    {/* eslint-disable-next-line next/no-img-element -- PDF thumbnails are generated locally in the browser. */}
                    <img
                      src={page.thumbnail}
                      alt={`Vista de ${page.sourceName}, página ${page.sourcePageNumber}`}
                      className="max-h-full max-w-full object-contain transition-transform"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 font-mono text-xs shadow-sm">
                      <GripVertical className="size-3" aria-hidden="true" /> {index + 1}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium" title={page.sourceName}>{page.sourceName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Página original {page.sourcePageNumber}</p>
                    <div className="mt-3 grid grid-cols-4 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Mover a la izquierda" disabled={index === 0} onClick={() => movePage(index, -1)}><ArrowLeft aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Mover a la derecha" disabled={index === pages.length - 1} onClick={() => movePage(index, 1)}><ArrowRight aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Girar página" onClick={() => setPages((current) => current.map((entry) => entry.id === page.id ? { ...entry, rotation: (entry.rotation + 90) % 360 } : entry))}><RotateCw aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar página" onClick={() => setPages((current) => current.filter((entry) => entry.id !== page.id))}><Trash2 aria-hidden="true" /></Button>
                    </div>
                  </div>
                </article>;
              })}
            </div>
          </section>
        </>
      ) : null}

      {pages.length === 0 && !loading ? (
        <p className="text-center text-xs text-muted-foreground">Los documentos se procesan en memoria y no se conservan al cerrar la página.</p>
      ) : null}
    </div>
  );
}
