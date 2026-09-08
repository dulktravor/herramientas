'use client';
/* eslint-disable next/no-img-element -- Cover images use local object URLs, never a server optimizer. */

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { downloadBlob, formatBytes } from '@/lib/browser-files';
import { EPUB_LIMITS, safePath, type EpubEntry } from '@/lib/epub-archive';
import type { Book } from '@/lib/epub';

type Engine = typeof import('@/lib/epub');
const panel = 'rounded-2xl border border-border bg-card p-5 space-y-4 min-w-0';
export function EpubWorkshop() {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    'Abre un EPUB o crea un libro con capítulos HTML o Markdown.',
  );
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<string[] | null>(null);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const coverImage = useRef<HTMLImageElement>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const worker = useRef<Worker | null>(null);
  const rejectJob = useRef<((e: Error) => void) | null>(null);
  const chapter = book?.chapters[selected];
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      rejectJob.current?.(new Error('Cancelado.'));
    },
    [],
  );
  useEffect(() => {
    if (!engine || !chapter || !book) {
      return;
    }
    let disposed = false;
    const readers: FileReader[] = [];
    const doc = new DOMParser().parseFromString(
      engine.cleanHtml(chapter.html),
      'text/html',
    );
    const render = async () => {
      let previewBytes = 0;
      for (const image of doc.querySelectorAll('img')) {
        try {
          const target = engine.resolveReference(
            chapter.path,
            image.getAttribute('src') || '',
          );
          const entry =
            target &&
            book.resources.find(
              (r) =>
                r.path === target.path &&
                /^image\/(png|jpeg|gif|webp)$/.test(r.media),
            );
          if (entry && previewBytes + entry.data.length <= 10 * 1024 * 1024) {
            previewBytes += entry.data.length;
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              readers.push(reader);
              reader.onload = () =>
                resolve(typeof reader.result === 'string' ? reader.result : '');
              reader.onerror = reader.onabort = () =>
                reject(new Error('Vista cancelada.'));
              reader.readAsDataURL(
                new Blob([new Uint8Array(entry.data)], { type: entry.media }),
              );
            });
            if (disposed) return;
            image.src = data;
          } else image.removeAttribute('src');
        } catch {
          image.removeAttribute('src');
        }
      }
      for (const link of doc.querySelectorAll('a'))
        link.removeAttribute('href');
      if (!disposed && previewFrame.current)
        previewFrame.current.srcdoc = engine.previewDocument(
          doc.body.innerHTML,
        );
    };
    void render();
    return () => {
      disposed = true;
      readers.forEach((reader) => {
        if (reader.readyState === FileReader.LOADING) reader.abort();
      });
    };
  }, [engine, chapter, book]);
  useEffect(() => {
    const cover = book?.resources.find(
      (e) =>
        e.path === book.cover && /^image\/(png|jpeg|gif|webp)$/.test(e.media),
    );
    if (!cover) {
      if (coverImage.current) coverImage.current.removeAttribute('src');
      return;
    }
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(cover.data)], { type: cover.media }),
    );
    if (coverImage.current) coverImage.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [book?.cover, book?.resources]);
  function cancel() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    rejectJob.current?.(new Error('Operación cancelada.'));
    rejectJob.current = null;
    active.current = false;
    setBusy(false);
    setStatus('Operación cancelada. El libro anterior se conserva.');
  }
  function update(next: Book) {
    setBook(next);
    setIssues(null);
    setError('');
  }
  async function operation(
    work: (e: Engine, check: () => void) => Promise<void>,
  ) {
    if (active.current) return;
    active.current = true;
    const id = ++generation.current;
    const check = () => {
      if (id !== generation.current) throw new Error('Operación cancelada.');
    };
    setBusy(true);
    setError('');
    setStatus('Procesando en este dispositivo…');
    try {
      const e = engine || (await import('@/lib/epub'));
      check();
      setEngine(e);
      await work(e, check);
    } catch (err) {
      if (id === generation.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo completar la operación.',
        );
        setStatus('Revisa el error e inténtalo de nuevo.');
      }
    } finally {
      if (id === generation.current) {
        active.current = false;
        setBusy(false);
      }
    }
  }
  function archive<T>(request: object): Promise<T> {
    return new Promise((resolve, reject) => {
      const instance = new Worker(
        new URL('../lib/epub.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = instance;
      const timer = window.setTimeout(
        () =>
          finish(
            undefined,
            'La operación superó 60 segundos. Prueba un libro más pequeño.',
          ),
        60000,
      );
      function finish(result?: T, message?: string) {
        clearTimeout(timer);
        instance.terminate();
        worker.current = null;
        rejectJob.current = null;
        if (message) reject(new Error(message));
        else resolve(result!);
      }
      rejectJob.current = (e) => finish(undefined, e.message);
      instance.onmessage = (event) => {
        if (event.data.progress) setStatus(event.data.progress);
        else finish(event.data.result, event.data.error);
      };
      instance.onerror = () =>
        finish(undefined, 'No se pudo ejecutar el motor EPUB.');
      instance.postMessage(request);
    });
  }
  function open(file: File) {
    void operation(async (e, check) => {
      if (!/\.epub$/i.test(file.name) || file.size > EPUB_LIMITS.compressed)
        throw new Error('Selecciona un EPUB de hasta 30 MB.');
      const buffer = await file.arrayBuffer();
      check();
      const entries = await archive<EpubEntry[]>({ action: 'open', buffer });
      check();
      const next = await e.readBook(entries, check);
      check();
      update(next);
      setSelected(0);
      setStatus(
        `Libro abierto: ${next.chapters.length} capítulos. Revisa los avisos antes de exportar.`,
      );
    });
  }
  function addChapters(files: File[]) {
    void operation(async (e, check) => {
      const next = book
        ? { ...book, chapters: [...book.chapters] }
        : e.emptyBook();
      if (next.chapters.length + files.length > EPUB_LIMITS.chapters)
        throw new Error('Máximo 300 capítulos.');
      const currentSize =
        next.resources.reduce((s, r) => s + r.data.length, 0) +
        next.chapters.reduce(
          (s, c) => s + new TextEncoder().encode(c.html).length,
          0,
        );
      if (
        currentSize + files.reduce((s, f) => s + f.size, 0) >
        EPUB_LIMITS.expanded
      )
        throw new Error('El contenido total supera 80 MB.');
      for (const file of files) {
        next.chapters.push(await e.importChapter(file, next.chapters));
        check();
      }
      update(next);
      setSelected(Math.max(0, next.chapters.length - files.length));
      setStatus(`${files.length} capítulos añadidos.`);
    });
  }
  function move(delta: number) {
    if (!book) return;
    const chapters = [...book.chapters];
    [chapters[selected], chapters[selected + delta]] = [
      chapters[selected + delta],
      chapters[selected],
    ];
    update({ ...book, chapters });
    setSelected(selected + delta);
  }
  function addResources(files: File[], cover: boolean) {
    void operation(async (e, check) => {
      const next = book
        ? { ...book, resources: [...book.resources] }
        : e.emptyBook();
      if (
        next.resources.length + next.chapters.length + files.length >
        EPUB_LIMITS.entries - 4
      )
        throw new Error('El libro contiene demasiados recursos.');
      const types: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        css: 'text/css',
        ttf: 'font/ttf',
        otf: 'font/otf',
        woff: 'font/woff',
        woff2: 'font/woff2',
      };
      for (const file of files) {
        const extension = file.name.split('.').pop()!.toLowerCase();
        if (
          !(extension in types) ||
          (cover && !['png', 'jpg', 'jpeg'].includes(extension)) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error(
            'Recursos de hasta 5 MB; la portada debe ser PNG o JPEG.',
          );
        const path = cover
          ? `portada-${crypto.randomUUID()}.${extension}`
          : safePath(file.webkitRelativePath || file.name);
        if (
          next.resources.some((r) => r.path === path) ||
          next.chapters.some((c) => c.path === path)
        )
          throw new Error(`Ya existe ${path}.`);
        const data = new Uint8Array(await file.arrayBuffer());
        check();
        if (cover) {
          const png =
            data[0] === 137 &&
            data[1] === 80 &&
            data[2] === 78 &&
            data[3] === 71;
          const jpg = data[0] === 255 && data[1] === 216 && data[2] === 255;
          if ((extension === 'png' && !png) || (extension !== 'png' && !jpg))
            throw new Error(
              'La portada no contiene una imagen PNG o JPEG válida.',
            );
          let bitmap: ImageBitmap;
          try {
            bitmap = await createImageBitmap(file);
          } catch {
            throw new Error(
              'No se pudo leer la imagen de portada. Prueba otro PNG o JPEG.',
            );
          }
          bitmap.close();
          check();
          next.cover = path;
        }
        next.resources.push({ path, data, media: types[extension] });
      }
      if (
        next.resources.reduce((s, r) => s + r.data.length, 0) >
        EPUB_LIMITS.expanded
      )
        throw new Error('Los recursos superan 80 MB.');
      update(next);
      setStatus(
        cover
          ? 'Portada actualizada.'
          : 'Recursos añadidos. Usa su ruta en los capítulos.',
      );
    });
  }
  function exportBook(kind: 'epub' | 'chapters' | 'text') {
    if (!book) return;
    void operation(async (e, check) => {
      const filename = (book.title.trim() || 'libro')
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .slice(0, 80);
      if (kind === 'text') {
        const text = book.chapters
          .map(
            (c) =>
              `${c.title}\n\n${new DOMParser().parseFromString(e.cleanHtml(c.html), 'text/html').body.textContent}`,
          )
          .join('\n\n---\n\n');
        downloadBlob(
          new Blob([text], { type: 'text/plain;charset=utf-8' }),
          `${filename}.txt`,
        );
      } else {
        if (kind === 'epub') {
          const found = await e.validateBook(book, check);
          check();
          setIssues(found);
          if (found.length)
            throw new Error(
              'Corrige los problemas de validación antes de descargar el EPUB.',
            );
        }
        const entries =
          kind === 'epub'
            ? e.buildEntries(book)
            : [
                ...book.resources,
                ...book.chapters.map((c) =>
                  e.textEntry(c.path, e.xhtml(c.title, c.html, book.language)),
                ),
              ];
        const result = await archive<ArrayBuffer>({
          action: 'pack',
          entries,
          epub: kind === 'epub',
        });
        check();
        downloadBlob(
          new Blob([result], {
            type: kind === 'epub' ? 'application/epub+zip' : 'application/zip',
          }),
          `${filename}.${kind === 'epub' ? 'epub' : 'zip'}`,
        );
      }
      setStatus('Descarga preparada correctamente.');
    });
  }
  return (
    <div className="space-y-5">
      <section className={panel} aria-label="Archivos del libro">
        <div className="flex items-center gap-3">
          <BookOpen className="size-6 text-primary" />
          <h2 className="text-xl font-semibold">
            Tu libro, capítulo a capítulo
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Procesamiento local, sin cuentas ni envíos. EPUB 2 y 3 de texto
          adaptable; exportación EPUB 3. Máximo 30 MB de entrada, 80 MB
          descomprimidos, 1.500 recursos y 300 capítulos. En móvil, utiliza
          libros de menos de 10 MB.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="epub-open" className="space-y-2 text-sm font-medium">
            Abrir EPUB
            <Input
              id="epub-open"
              type="file"
              accept=".epub"
              disabled={busy}
              onChange={(event) => {
                const f = event.target.files?.[0];
                event.target.value = '';
                if (f) open(f);
              }}
            />
          </label>
          <label
            htmlFor="epub-chapters"
            className="space-y-2 text-sm font-medium"
          >
            Añadir capítulos HTML o Markdown (hasta 2 MB cada uno)
            <Input
              id="epub-chapters"
              type="file"
              multiple
              accept=".html,.htm,.xhtml,.md,.markdown"
              disabled={busy}
              onChange={(event) => {
                const fs = Array.from(event.target.files || []);
                event.target.value = '';
                if (fs.length) addChapters(fs);
              }}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void operation(async (e) => {
                update(e.emptyBook());
                setSelected(0);
                setStatus('Libro nuevo. Añade capítulos y completa sus datos.');
              })
            }
          >
            Nuevo libro
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              cancel();
              setBook(null);
              setIssues(null);
              setError('');
              setSelected(0);
              setStatus('Libro y archivos retirados de la memoria.');
            }}
          >
            Limpiar
          </Button>
          {busy && (
            <Button variant="outline" onClick={cancel}>
              Cancelar operación
            </Button>
          )}
        </div>
        <output aria-live="polite" className="block text-sm">
          {status}
        </output>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      {book && (
        <>
          <fieldset disabled={busy} className={panel}>
            <legend className="px-2 text-lg font-semibold">
              Datos del libro
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['title', 'author', 'language'] as const).map((key, i) => (
                <label key={key} className="space-y-2 text-sm font-medium">
                  {['Título', 'Autor', 'Idioma'][i]}
                  <Input
                    value={book[key]}
                    maxLength={key === 'language' ? 35 : 500}
                    placeholder={key === 'language' ? 'es' : ''}
                    onChange={(ev) =>
                      update({ ...book, [key]: ev.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label
              htmlFor="epub-cover"
              className="block space-y-2 text-sm font-medium"
            >
              Cambiar portada (PNG o JPEG, hasta 5 MB)
              <Input
                id="epub-cover"
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  ev.target.value = '';
                  if (f) addResources([f], true);
                }}
              />
            </label>
            {book.cover && (
              <div className="flex flex-wrap items-center gap-4">
                {/* Local blob image: never send through an image optimizer. */}
                <img
                  ref={coverImage}
                  alt="Portada del libro"
                  className="h-32 max-w-28 rounded object-contain"
                />
                <span className="break-all text-sm">{book.cover}</span>
                <Button
                  variant="outline"
                  onClick={() => update({ ...book, cover: '' })}
                >
                  Quitar portada
                </Button>
              </div>
            )}
          </fieldset>
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className={panel}>
              <h2 className="font-semibold">
                Capítulos · {book.chapters.length}
              </h2>
              {book.chapters.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Añade archivos o escribe tu primer capítulo.
                </p>
              )}
              <ol className="max-h-[520px] space-y-2 overflow-auto">
                {book.chapters.map((c, i) => (
                  <li key={c.path}>
                    <button
                      disabled={busy}
                      onClick={() => setSelected(i)}
                      aria-current={selected === i ? 'true' : undefined}
                      className={`w-full rounded-lg border p-3 text-left text-sm break-words focus-visible:ring-2 focus-visible:ring-ring ${selected === i ? 'border-primary bg-primary/10' : 'border-border'}`}
                    >
                      {i + 1}. {c.title || 'Sin título'}
                    </button>
                  </li>
                ))}
              </ol>
              <Button
                variant="outline"
                disabled={busy || book.chapters.length >= EPUB_LIMITS.chapters}
                onClick={() => {
                  const path = `capitulo-${crypto.randomUUID()}.xhtml`;
                  update({
                    ...book,
                    chapters: [
                      ...book.chapters,
                      {
                        path,
                        title: 'Nuevo capítulo',
                        html: '<h1>Nuevo capítulo</h1><p>Escribe aquí.</p>',
                      },
                    ],
                  });
                  setSelected(book.chapters.length);
                }}
              >
                Escribir capítulo
              </Button>
            </section>
            <section className={panel}>
              {chapter ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy || selected === 0}
                      onClick={() => move(-1)}
                    >
                      <ArrowUp className="size-4" />
                      Subir
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || selected === book.chapters.length - 1}
                      onClick={() => move(1)}
                    >
                      <ArrowDown className="size-4" />
                      Bajar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        update({
                          ...book,
                          chapters: book.chapters.filter(
                            (_, i) => i !== selected,
                          ),
                        });
                        setSelected(Math.max(0, selected - 1));
                      }}
                    >
                      <Trash2 className="size-4" />
                      Eliminar capítulo
                    </Button>
                  </div>
                  <label
                    htmlFor="chapter-title"
                    className="block space-y-2 text-sm font-medium"
                  >
                    Título del capítulo
                    <Input
                      id="chapter-title"
                      disabled={busy}
                      value={chapter.title}
                      maxLength={500}
                      onChange={(ev) =>
                        update({
                          ...book,
                          chapters: book.chapters.map((c, i) =>
                            i === selected
                              ? { ...c, title: ev.target.value }
                              : c,
                          ),
                        })
                      }
                    />
                  </label>
                  <p className="break-all text-xs text-muted-foreground">
                    Ruta: {chapter.path}
                  </p>
                  <label
                    htmlFor="chapter-html"
                    className="block space-y-2 text-sm font-medium"
                  >
                    Contenido HTML
                    <Textarea
                      id="chapter-html"
                      disabled={busy}
                      value={chapter.html}
                      maxLength={EPUB_LIMITS.document}
                      className="min-h-48 font-mono text-sm"
                      onChange={(ev) =>
                        update({
                          ...book,
                          chapters: book.chapters.map((c, i) =>
                            i === selected
                              ? { ...c, html: ev.target.value }
                              : c,
                          ),
                        })
                      }
                    />
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Vista de lectura simplificada (hasta 10 MB de imágenes por
                    capítulo). Scripts, estilos del libro y conexiones externas
                    están bloqueados; los enlaces se comprueban al validar.
                  </p>
                  <iframe
                    title="Vista previa del capítulo"
                    sandbox=""
                    ref={previewFrame}
                    className="h-96 w-full rounded-lg border bg-white"
                  />
                </>
              ) : (
                <p className="text-muted-foreground">
                  Selecciona o añade un capítulo para editarlo.
                </p>
              )}
            </section>
          </div>
          <section className={panel}>
            <h2 className="font-semibold">
              Estructura y recursos · {book.resources.length}
            </h2>
            <label htmlFor="epub-resources" className="block space-y-2 text-sm">
              Añadir imágenes, CSS o fuentes (hasta 5 MB cada uno)
              <Input
                id="epub-resources"
                type="file"
                multiple
                disabled={busy}
                accept=".png,.jpg,.jpeg,.gif,.webp,.css,.ttf,.otf,.woff,.woff2"
                onChange={(ev) => {
                  const fs = Array.from(ev.target.files || []);
                  ev.target.value = '';
                  if (fs.length) addResources(fs, false);
                }}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Las rutas son relativas al capítulo. Puedes renombrar las rutas de
              recursos para reparar referencias, por ejemplo Images/foto.jpg.
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Examinar archivos y corregir rutas
              </summary>
              <ul className="mt-3 max-h-72 space-y-3 overflow-auto">
                {book.resources.map((r, i) => (
                  <li key={i} className="flex flex-wrap gap-2 text-sm">
                    <Input
                      aria-label={`Ruta del recurso ${i + 1}`}
                      className="min-w-0 flex-1"
                      disabled={busy}
                      value={r.path}
                      onChange={(ev) => {
                        update({
                          ...book,
                          resources: book.resources.map((entry, n) =>
                            n === i
                              ? { ...entry, path: ev.target.value }
                              : entry,
                          ),
                          cover:
                            book.cover === r.path
                              ? ev.target.value
                              : book.cover,
                        });
                      }}
                    />
                    <span>{formatBytes(r.data.length)}</span>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        update({
                          ...book,
                          resources: book.resources.filter((_, n) => n !== i),
                          cover: book.cover === r.path ? '' : book.cover,
                        })
                      }
                      aria-label={`Eliminar recurso ${r.path}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <section className={panel}>
            <h2 className="font-semibold">Índice, validación y descarga</h2>
            <p className="text-sm text-muted-foreground">
              El índice se reconstruye con los títulos y el orden actuales al
              exportar. Validación básica de estructura, recursos y destinos
              internos; no sustituye EPUBCheck. No se conservan DRM, maquetación
              fija, scripts ni metadatos editoriales avanzados.
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Ver índice que se exportará
              </summary>
              <ol className="mt-2 list-inside list-decimal text-sm">
                {book.chapters.map((c) => (
                  <li key={c.path}>{c.title}</li>
                ))}
              </ol>
            </details>
            {book.notices.map((notice, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {notice}
              </p>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void operation(async (e, check) => {
                    const found = await e.validateBook(book, check);
                    check();
                    setIssues(found);
                    setStatus(
                      found.length
                        ? 'Hay problemas que requieren corrección.'
                        : 'Estructura básica válida. El índice se regenerará al exportar.',
                    );
                  })
                }
              >
                Validar y reparar índice
              </Button>
              <Button
                disabled={busy || !book.chapters.length}
                onClick={() => exportBook('epub')}
              >
                Descargar EPUB
              </Button>
              <Button
                variant="outline"
                disabled={busy || !book.chapters.length}
                onClick={() => exportBook('chapters')}
              >
                Extraer capítulos ZIP
              </Button>
              <Button
                variant="outline"
                disabled={busy || !book.chapters.length}
                onClick={() => exportBook('text')}
              >
                Extraer texto TXT
              </Button>
            </div>
            {issues &&
              (issues.length ? (
                <ul
                  className="max-h-64 list-inside list-disc overflow-auto text-sm text-destructive"
                  aria-label="Problemas de validación"
                >
                  {issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-primary">
                  Validación básica correcta. Índice preparado con{' '}
                  {book.chapters.length} capítulos.
                </p>
              ))}
          </section>
        </>
      )}
    </div>
  );
}
