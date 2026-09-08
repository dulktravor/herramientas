import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { EPUB_LIMITS, safePath, type EpubEntry } from './epub-archive';
export type Chapter = { path: string; title: string; html: string };
export type Book = {
  title: string;
  author: string;
  language: string;
  identifier: string;
  chapters: Chapter[];
  resources: EpubEntry[];
  cover: string;
  notices: string[];
};
const enc = new TextEncoder();
export const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
export const textEntry = (
  path: string,
  text: string,
  media = 'application/xhtml+xml',
): EpubEntry => ({ path, data: enc.encode(text), media });
export function emptyBook(): Book {
  return {
    title: '',
    author: '',
    language: 'es',
    identifier: `urn:uuid:${crypto.randomUUID()}`,
    chapters: [],
    resources: [],
    cover: '',
    notices: [],
  };
}
function xml(text: string) {
  if (/<!ENTITY/i.test(text))
    throw new Error('No se admiten entidades XML personalizadas.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length)
    throw new Error('Documento XML/XHTML dañado.');
  return doc;
}
function nodes(doc: Document | Element, name: string) {
  return Array.from(doc.getElementsByTagNameNS('*', name));
}
export function resolveReference(from: string, ref: string) {
  if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(ref)) return null;
  const url = new URL(ref, `https://epub.invalid/${from}`);
  return {
    path: decodeURIComponent(url.pathname.slice(1)),
    fragment: decodeURIComponent(url.hash.slice(1)),
  };
}
function relative(from: string, to: string) {
  const a = from.split('/');
  a.pop();
  const b = to.split('/');
  while (a.length && a[0] === b[0]) {
    a.shift();
    b.shift();
  }
  return '../'.repeat(a.length) + b.map(encodeURIComponent).join('/');
}
export function cleanHtml(source: string) {
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'style',
      'link',
      'meta',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'iframe',
      'object',
      'embed',
      'audio',
      'video',
      'source',
    ],
    FORBID_ATTR: ['style', 'srcset', 'ping', 'background'],
    ADD_ATTR: ['epub:type'],
  });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  for (const el of doc.body.querySelectorAll('[src], [href]')) {
    for (const attr of ['src', 'href']) {
      const value = el.getAttribute(attr);
      if (
        value &&
        (/^[a-z][a-z\d+.-]*:|^\/\//i.test(value.trim()) ||
          Array.from(value).some(
            (c) => c.charCodeAt(0) <= 32 || c === String.fromCharCode(92),
          ))
      )
        el.removeAttribute(attr);
    }
  }
  return doc.body.innerHTML;
}
export function xhtml(title: string, html: string, language: string) {
  const doc = new DOMParser().parseFromString(cleanHtml(html), 'text/html');
  const body = Array.from(doc.body.childNodes)
    .map((node) => new XMLSerializer().serializeToString(node))
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(language)}" xml:lang="${escapeXml(language)}"><head><title>${escapeXml(title)}</title></head><body>${body}</body></html>`;
}
export async function importChapter(
  file: File,
  existing: Chapter[],
): Promise<Chapter> {
  if (
    !/\.(md|markdown|html?|xhtml)$/i.test(file.name) ||
    file.size > EPUB_LIMITS.document
  )
    throw new Error('Cada capítulo debe ser HTML o Markdown de hasta 2 MB.');
  const source = await file.text();
  const html = cleanHtml(
    /\.(md|markdown)$/i.test(file.name) ? await marked.parse(source) : source,
  );
  const path = safePath(file.name.replace(/\.(md|markdown|html?)$/i, '.xhtml'));
  if (existing.some((c) => c.path === path))
    throw new Error(
      `Ya existe el capítulo ${path}. Renombra el archivo antes de añadirlo.`,
    );
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return {
    path,
    title:
      doc.querySelector('h1,h2')?.textContent?.trim() ||
      file.name.replace(/\.[^.]+$/, ''),
    html,
  };
}
export async function readBook(
  entries: EpubEntry[],
  check: () => void,
): Promise<Book> {
  const byPath = new Map(entries.map((e) => [e.path, e]));
  const read = (path: string) => {
    const e = byPath.get(path);
    if (!e) throw new Error(`Falta el recurso ${path}.`);
    if (e.data.length > EPUB_LIMITS.document)
      throw new Error(`El documento ${path} supera 2 MB.`);
    return new TextDecoder().decode(e.data);
  };
  if (read('mimetype') !== 'application/epub+zip')
    throw new Error('El contenedor no declara un EPUB válido.');
  if (byPath.has('META-INF/encryption.xml'))
    throw new Error(
      'No se admiten libros con DRM, recursos cifrados o fuentes ofuscadas.',
    );
  const container = xml(read('META-INF/container.xml'));
  const rootfiles = nodes(container, 'rootfile');
  if (rootfiles.length !== 1)
    throw new Error('Se admite una sola edición por EPUB.');
  const opfPath = safePath(rootfiles[0].getAttribute('full-path') || '');
  const opf = xml(read(opfPath));
  if (
    nodes(opf, 'meta').some(
      (e) =>
        e.getAttribute('property') === 'rendition:layout' &&
        e.textContent === 'pre-paginated',
    ) ||
    nodes(opf, 'itemref').some((e) =>
      e.getAttribute('properties')?.includes('pre-paginated'),
    )
  )
    throw new Error('Los EPUB de maquetación fija no son compatibles.');
  const book = emptyBook();
  book.title = nodes(opf, 'title')[0]?.textContent || '';
  book.author = nodes(opf, 'creator')
    .map((e) => e.textContent)
    .join(', ');
  book.language = nodes(opf, 'language')[0]?.textContent || 'es';
  book.identifier = nodes(opf, 'identifier')[0]?.textContent || book.identifier;
  const manifest = new Map<
    string,
    { path: string; media: string; properties: string }
  >();
  for (const item of nodes(opf, 'item')) {
    const resolved = resolveReference(opfPath, item.getAttribute('href') || '');
    if (!resolved)
      throw new Error(
        'El libro declara recursos remotos. Descárgalos e incorpóralos antes de editarlo aquí.',
      );
    const id = item.getAttribute('id') || '';
    if (!id || manifest.has(id))
      throw new Error(
        'El manifiesto contiene identificadores duplicados o vacíos.',
      );
    const meta = {
      path: safePath(resolved.path),
      media: item.getAttribute('media-type') || '',
      properties: item.getAttribute('properties') || '',
    };
    manifest.set(id, meta);
    if (meta.properties.includes('cover-image')) book.cover = meta.path;
    if (!byPath.has(meta.path))
      book.notices.push(`Falta el recurso declarado: ${meta.path}`);
  }
  if (!book.cover) {
    const coverId = nodes(opf, 'meta')
      .find((e) => e.getAttribute('name') === 'cover')
      ?.getAttribute('content');
    book.cover = coverId ? manifest.get(coverId)?.path || '' : '';
  }
  const refs = nodes(opf, 'itemref');
  if (refs.length > EPUB_LIMITS.chapters)
    throw new Error('El libro supera 300 capítulos.');
  const chapterPaths = new Set<string>();
  for (const ref of refs) {
    const item = manifest.get(ref.getAttribute('idref') || '');
    if (!item || item.media !== 'application/xhtml+xml')
      throw new Error(
        'El orden de lectura debe referenciar capítulos XHTML válidos.',
      );
    if (chapterPaths.has(item.path))
      throw new Error('El orden de lectura repite un capítulo.');
    chapterPaths.add(item.path);
    const doc = xml(read(item.path));
    book.chapters.push({
      path: item.path,
      title: nodes(doc, 'title')[0]?.textContent || item.path,
      html: cleanHtml(nodes(doc, 'body')[0]?.innerHTML || ''),
    });
    await new Promise((r) => setTimeout(r, 0));
    check();
  }
  for (const item of manifest.values()) {
    const entry = byPath.get(item.path);
    if (
      entry &&
      !chapterPaths.has(item.path) &&
      !item.properties.includes('nav') &&
      item.media !== 'application/x-dtbncx+xml'
    ) {
      if (item.media === 'application/xhtml+xml') {
        const doc = xml(read(item.path));
        book.resources.push(
          textEntry(
            item.path,
            xhtml(
              nodes(doc, 'title')[0]?.textContent || item.path,
              nodes(doc, 'body')[0]?.innerHTML || '',
              book.language,
            ),
          ),
        );
      } else book.resources.push({ ...entry, media: item.media });
    }
  }
  book.notices.push(
    'La exportación crea EPUB 3 con índice nuevo. Se conserva el contenido de lectura y sus recursos; se simplifican estilos, contenido activo y metadatos avanzados.',
  );
  return book;
}
export async function validateBook(book: Book, check: () => void = () => {}) {
  const issues: string[] = [];
  if (!book.title.trim()) issues.push('Escribe el título del libro.');
  if (!book.author.trim()) issues.push('Escribe el autor del libro.');
  if (!/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/.test(book.language))
    issues.push('Indica un idioma válido, por ejemplo es o es-CO.');
  if (!book.chapters.length) issues.push('Añade al menos un capítulo.');
  if (book.chapters.length > EPUB_LIMITS.chapters)
    issues.push('Máximo 300 capítulos.');
  const all = new Map(book.resources.map((e) => [e.path, e]));
  for (const c of book.chapters)
    all.set(c.path, textEntry(c.path, xhtml(c.title, c.html, book.language)));
  if (all.size !== book.resources.length + book.chapters.length)
    issues.push('Hay rutas de capítulos o recursos duplicadas.');
  if (
    [...all.values()].reduce((s, e) => s + e.data.length, 0) >
    EPUB_LIMITS.expanded
  )
    issues.push('El libro supera 80 MB descomprimidos.');
  if (all.size > EPUB_LIMITS.entries - 4)
    issues.push('Hay demasiados recursos.');
  if (book.cover && !all.has(book.cover))
    issues.push('La portada no existe en el libro.');
  if (book.chapters.some((c) => !c.title.trim()))
    issues.push('Todos los capítulos deben tener título.');
  for (const e of all.values()) {
    try {
      safePath(e.path);
    } catch {
      issues.push(`Ruta no segura: ${e.path}`);
    }
    if (e.path === 'mimetype' || e.path.startsWith('META-INF/'))
      issues.push(`Ruta reservada: ${e.path}`);
    if (!e.media || /[<>"\s]/.test(e.media))
      issues.push(`${e.path}: tipo de recurso inválido.`);
    if (e.media === 'text/css' || e.media === 'image/svg+xml') {
      if (e.data.length > EPUB_LIMITS.document) {
        issues.push(`${e.path}: documento mayor de 2 MB.`);
        continue;
      }
      const content = new TextDecoder().decode(e.data);
      const refs =
        e.media === 'text/css'
          ? Array.from(
              content.matchAll(
                /url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/gi,
              ),
              (m) => m[1] || m[2],
            )
          : [];
      if (e.media === 'image/svg+xml') {
        try {
          const doc = xml(content);
          if (
            doc.querySelector('script,foreignObject') ||
            Array.from(doc.querySelectorAll('*')).some((el) =>
              Array.from(el.attributes).some((a) => /^on/i.test(a.name)),
            )
          )
            issues.push(`${e.path}: SVG con contenido activo no compatible.`);
          for (const el of doc.querySelectorAll('*'))
            for (const attr of Array.from(el.attributes))
              if (attr.localName === 'href') refs.push(attr.value);
        } catch {
          issues.push(`${e.path}: SVG inválido.`);
        }
      }
      for (const ref of refs) {
        try {
          const target = resolveReference(e.path, ref.trim());
          if (!target) issues.push(`${e.path}: recurso externo ${ref}.`);
          else if (!all.has(target.path))
            issues.push(`${e.path}: falta ${ref}.`);
        } catch {
          issues.push(`${e.path}: referencia inválida.`);
        }
      }
    }
  }
  const docs = new Map<string, Document>();
  for (const e of all.values())
    if (e.media === 'application/xhtml+xml') {
      if (e.data.length > EPUB_LIMITS.document) {
        issues.push(`${e.path}: supera 2 MB.`);
        continue;
      }
      try {
        docs.set(e.path, xml(new TextDecoder().decode(e.data)));
      } catch {
        issues.push(`${e.path}: XHTML inválido.`);
      }
      await new Promise((r) => setTimeout(r, 0));
      check();
    }
  for (const [path, doc] of docs) {
    const ids = new Set<string>();
    for (const el of doc.querySelectorAll('[id]')) {
      const id = el.getAttribute('id')!;
      if (ids.has(id)) issues.push(`${path}: identificador repetido ${id}.`);
      ids.add(id);
    }
    for (const el of doc.querySelectorAll('[href], [src]'))
      for (const attr of ['href', 'src']) {
        const ref = el.getAttribute(attr);
        if (!ref) continue;
        try {
          const target = resolveReference(path, ref);
          if (!target) {
            issues.push(`${path}: referencia externa ${ref}.`);
            continue;
          }
          if (!all.has(target.path)) issues.push(`${path}: falta ${ref}.`);
          else if (
            target.fragment &&
            docs.has(target.path) &&
            !Array.from(docs.get(target.path)!.querySelectorAll('[id]')).some(
              (e) => e.getAttribute('id') === target.fragment,
            )
          )
            issues.push(`${path}: no existe el destino #${target.fragment}.`);
        } catch {
          issues.push(`${path}: referencia inválida ${ref}.`);
        }
      }
    await new Promise((r) => setTimeout(r, 0));
    check();
  }
  return [...new Set(issues)];
}
export function buildEntries(book: Book) {
  const used = new Set([
    ...book.chapters.map((c) => c.path),
    ...book.resources.map((r) => r.path),
  ]);
  let dir = 'CeroNube';
  while ([...used].some((p) => p === dir || p.startsWith(`${dir}/`)))
    dir += '-';
  const opf = `${dir}/package.opf`,
    nav = `${dir}/nav.xhtml`;
  const entries = [
    ...book.resources,
    ...book.chapters.map((c) =>
      textEntry(c.path, xhtml(c.title, c.html, book.language)),
    ),
  ];
  entries.push(
    textEntry(
      nav,
      `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(book.language)}"><head><title>Índice</title></head><body><nav epub:type="toc" id="toc"><h1>Índice</h1><ol>${book.chapters.map((c) => `<li><a href="${escapeXml(relative(nav, c.path))}">${escapeXml(c.title)}</a></li>`).join('')}</ol></nav></body></html>`,
    ),
  );
  const manifest = entries
    .map(
      (e, i) =>
        `<item id="item${i}" href="${escapeXml(relative(opf, e.path))}" media-type="${escapeXml(e.media)}"${e.path === nav ? ' properties="nav"' : e.path === book.cover ? ' properties="cover-image"' : ''}/>`,
    )
    .join('');
  entries.push(
    textEntry(
      opf,
      `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${escapeXml(book.identifier)}</dc:identifier><dc:title>${escapeXml(book.title)}</dc:title><dc:creator>${escapeXml(book.author)}</dc:creator><dc:language>${escapeXml(book.language)}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest>${manifest}</manifest><spine>${book.chapters.map((c) => `<itemref idref="item${entries.findIndex((e) => e.path === c.path)}"/>`).join('')}</spine></package>`,
      'application/oebps-package+xml',
    ),
  );
  entries.push(
    textEntry(
      'META-INF/container.xml',
      `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="${opf}" media-type="application/oebps-package+xml"/></rootfiles></container>`,
      'application/xml',
    ),
  );
  return entries;
}
export function previewDocument(html: string) {
  // CSP also blocks navigation, remote resources and any content missed by sanitization.
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{font:18px/1.65 Georgia,serif;padding:24px;color:#172d30;background:white;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}pre{white-space:pre-wrap}</style></head><body>${html}</body></html>`;
}
