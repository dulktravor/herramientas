'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Braces,
  ArrowUpRight,
  FileScan,
  FileArchive,
  Files,
  Film,
  Images,
  Music2,
  ScanText,
  Search,
  ShieldEllipsis,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ToolItem = {
  name: string;
  description: string;
  category: 'imagenes' | 'pdf' | 'datos' | 'audio' | 'video' | 'comprimidos';
  keywords: string;
  icon: LucideIcon;
  stage: 'Disponible' | 'Siguiente etapa';
  href: string | null;
};

const tools: ToolItem[] = [
  {
    name: 'Gestor de archivos ZIP',
    description:
      'Crea, examina, modifica y extrae archivos ZIP sin enviar su contenido.',
    category: 'comprimidos',
    keywords:
      'zip archivo comprimido comprimir descomprimir extraer carpeta abrir examinar renombrar',
    icon: FileArchive,
    stage: 'Disponible',
    href: '/herramientas/zip',
  },
  {
    name: 'Taller de vídeo',
    description:
      'Recorta, cambia relación de aspecto, añade subtítulos SRT/VTT, extrae audio y convierte a MP4, WebM o GIF.',
    category: 'video',
    keywords:
      'video mp4 webm mov mkv avi recortar inicio fin aspecto resolucion gif animado silenciar subtitulos srt vtt audio mp3 wav ogg velocidad fps fotograma comprimir',
    icon: Film,
    stage: 'Disponible',
    href: '/herramientas/video',
  },
  {
    name: 'Estudio MIDI',
    description:
      'Toca, reproduce y edita MIDI en un piano-roll con instrumentos virtuales.',
    category: 'audio',
    keywords:
      'midi piano notas teclado instrumento sintetizador transcribir partitura editar reproducir',
    icon: Music2,
    stage: 'Disponible',
    href: '/herramientas/midi',
  },
  {
    name: 'Estudio de audio',
    description: 'Recorta, une, normaliza y ajusta pistas desde el navegador.',
    category: 'audio',
    keywords:
      'audio mp3 wav ogg flac aac m4a recortar unir volumen normalizar velocidad fundido',
    icon: Music2,
    stage: 'Disponible',
    href: '/herramientas/audio',
  },
  {
    name: 'Estudio de imágenes',
    description: 'Comprime, convierte y redimensiona varias imágenes a la vez.',
    category: 'imagenes',
    keywords:
      'jpg png webp avif comprimir convertir reducir redimensionar foto',
    icon: Images,
    stage: 'Disponible',
    href: '/herramientas/imagenes',
  },
  {
    name: 'Organizar PDF',
    description: 'Une, separa, gira y reordena páginas con una vista visual.',
    category: 'pdf',
    keywords: 'unir dividir separar ordenar rotar eliminar paginas documento',
    icon: Files,
    stage: 'Disponible',
    href: '/herramientas/pdf',
  },
  {
    name: 'Limpiar metadatos',
    description:
      'Descubre y elimina GPS, dispositivo y datos ocultos de tus fotos.',
    category: 'imagenes',
    keywords: 'exif gps privacidad limpiar borrar datos foto camara',
    icon: ShieldEllipsis,
    stage: 'Disponible',
    href: '/herramientas/metadatos',
  },
  {
    name: 'Imagen a texto',
    description:
      'Extrae texto editable de capturas y documentos fotografiados.',
    category: 'imagenes',
    keywords: 'ocr texto captura foto escaneo reconocer copiar',
    icon: ScanText,
    stage: 'Disponible',
    href: '/herramientas/ocr',
  },
  {
    name: 'Conversor de datos',
    description: 'Transforma y limpia CSV, JSON, XML y tablas sin programar.',
    category: 'datos',
    keywords: 'csv json xml yaml excel tabla convertir transformar',
    icon: Braces,
    stage: 'Disponible',
    href: '/herramientas/datos',
  },
  {
    name: 'Escáner a PDF',
    description: 'Corrige fotografías de documentos y crea un PDF limpio.',
    category: 'pdf',
    keywords: 'escaner foto documento perspectiva corregir crear pdf',
    icon: FileScan,
    stage: 'Disponible',
    href: '/herramientas/escaner',
  },
];

const categories = [
  { id: 'todas', label: 'Todas' },
  { id: 'comprimidos', label: 'Comprimidos' },
  { id: 'video', label: 'Vídeo' },
  { id: 'audio', label: 'Audio' },
  { id: 'imagenes', label: 'Imágenes' },
  { id: 'pdf', label: 'PDF' },
  { id: 'datos', label: 'Datos' },
] as const;

const categoryLabels = {
  comprimidos: 'Comprimidos',
  video: 'Vídeo',
  audio: 'Audio',
  imagenes: 'Imagen',
  pdf: 'PDF',
  datos: 'Datos',
} as const;

const categoryStyles = {
  comprimidos:
    'bg-[#fef3c7] text-[#92400e] dark:bg-[#332719] dark:text-[#fcd34d]',
  video: 'bg-[#fee2e2] text-[#991b1b] dark:bg-[#331c20] dark:text-[#fca5a5]',
  audio: 'bg-[#eee3ff] text-[#60309a] dark:bg-[#292033] dark:text-[#d7b5ff]',
  imagenes: 'bg-[#dff4f1] text-[#08666a] dark:bg-[#17272b] dark:text-[#66e1dc]',
  pdf: 'bg-[#ffe1ca] text-[#713915] dark:bg-[#30231d] dark:text-[#ffb27e]',
  datos: 'bg-[#083f43] text-[#f4ead7] dark:bg-[#202731] dark:text-[#f1ede5]',
} as const;

export function ToolDirectory() {
  const [query, setQuery] = useState('');
  const [category, setCategory] =
    useState<(typeof categories)[number]['id']>('todas');

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');

    return tools.filter((tool) => {
      const matchesCategory =
        category === 'todas' || tool.category === category;
      const searchableText =
        `${tool.name} ${tool.description} ${tool.keywords}`.toLocaleLowerCase(
          'es',
        );
      return (
        matchesCategory &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [category, query]);

  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <label htmlFor="tool-search" className="sr-only">
          Buscar una herramienta
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="tool-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="¿Qué necesitas hacer? Ejemplo: reducir una foto"
            className="h-14 rounded-2xl border-primary/15 bg-card pl-12 pr-4 text-base shadow-[0_16px_50px_color-mix(in_oklch,var(--foreground)_7%,transparent)] focus-visible:border-primary md:text-base"
          />
        </div>
        <div
          className="mt-4 flex flex-wrap justify-center gap-2"
          aria-label="Filtrar herramientas"
        >
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className="min-h-10 rounded-full border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Trabaja sin subir</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Elige qué necesitas resolver
          </h2>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filteredTools.length}{' '}
          {filteredTools.length === 1 ? 'resultado' : 'resultados'}
        </p>
      </div>

      {filteredTools.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const content = (
              <Card className="group relative min-h-64 gap-0 overflow-hidden border-transparent py-0 ring-1 ring-foreground/10 transition-[transform,box-shadow,ring-color] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_color-mix(in_oklch,var(--foreground)_9%,transparent)] hover:ring-primary/30">
                <span
                  className="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
                <CardHeader className="px-6 pt-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div
                      className={`grid size-11 place-items-center rounded-xl ${categoryStyles[tool.category]}`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                      {categoryLabels[tool.category]}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="mt-1 leading-6">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between px-6 pb-6 pt-5">
                  <Badge
                    variant={
                      tool.stage === 'Disponible' ? 'secondary' : 'outline'
                    }
                    className="border border-primary/10"
                  >
                    Se procesa aquí
                    {tool.href ? <ArrowUpRight aria-hidden="true" /> : null}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Sin registro
                  </span>
                </CardContent>
              </Card>
            );
            return tool.href ? (
              <Link
                key={tool.name}
                href={tool.href}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {content}
              </Link>
            ) : (
              <div key={tool.name}>{content}</div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Search
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h3 className="mt-4 font-medium">No encontramos esa herramienta</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba con “PDF”, “imagen”, “texto” o “datos”.
          </p>
        </div>
      )}
    </div>
  );
}
