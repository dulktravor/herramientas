'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Braces,
  ArrowUpRight,
  FileScan,
  Files,
  Images,
  ScanText,
  Search,
  ShieldEllipsis,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const tools = [
  {
    name: 'Estudio de imágenes',
    description: 'Comprime, convierte y redimensiona varias imágenes a la vez.',
    category: 'imagenes',
    keywords: 'jpg png webp avif comprimir convertir reducir redimensionar foto',
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
    description: 'Descubre y elimina GPS, dispositivo y datos ocultos de tus fotos.',
    category: 'imagenes',
    keywords: 'exif gps privacidad limpiar borrar datos foto camara',
    icon: ShieldEllipsis,
    stage: 'Disponible',
    href: '/herramientas/metadatos',
  },
  {
    name: 'Imagen a texto',
    description: 'Extrae texto editable de capturas y documentos fotografiados.',
    category: 'imagenes',
    keywords: 'ocr texto captura foto escaneo reconocer copiar',
    icon: ScanText,
    stage: 'Siguiente etapa',
    href: null,
  },
  {
    name: 'Conversor de datos',
    description: 'Transforma y limpia CSV, JSON, XML y tablas sin programar.',
    category: 'datos',
    keywords: 'csv json xml yaml excel tabla convertir transformar',
    icon: Braces,
    stage: 'Siguiente etapa',
    href: null,
  },
  {
    name: 'Escáner a PDF',
    description: 'Corrige fotografías de documentos y crea un PDF limpio.',
    category: 'pdf',
    keywords: 'escaner foto documento perspectiva corregir crear pdf',
    icon: FileScan,
    stage: 'Siguiente etapa',
    href: null,
  },
] as const;

const categories = [
  { id: 'todas', label: 'Todas' },
  { id: 'imagenes', label: 'Imágenes' },
  { id: 'pdf', label: 'PDF' },
  { id: 'datos', label: 'Datos' },
] as const;

export function ToolDirectory() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]['id']>('todas');

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');

    return tools.filter((tool) => {
      const matchesCategory = category === 'todas' || tool.category === category;
      const searchableText = `${tool.name} ${tool.description} ${tool.keywords}`.toLocaleLowerCase('es');
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
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
            className="h-14 rounded-2xl bg-card pl-12 pr-4 text-base shadow-[0_16px_50px_color-mix(in_oklch,var(--foreground)_7%,transparent)] md:text-base"
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Filtrar herramientas">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className="min-h-10 rounded-full border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Colección inicial</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Herramientas destacadas
          </h2>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filteredTools.length} {filteredTools.length === 1 ? 'resultado' : 'resultados'}
        </p>
      </div>

      {filteredTools.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const content = (
              <Card
                className="min-h-60 gap-0 border-transparent py-0 ring-1 ring-foreground/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_color-mix(in_oklch,var(--foreground)_8%,transparent)]"
              >
                <CardHeader className="px-6 pt-6">
                  <div className="mb-5 grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="mt-1 leading-6">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto px-6 pb-6 pt-5">
                  <Badge variant={tool.stage === 'Disponible' ? 'secondary' : 'outline'}>
                    {tool.stage}
                    {tool.href ? <ArrowUpRight aria-hidden="true" /> : null}
                  </Badge>
                </CardContent>
              </Card>
            );
            return tool.href ? (
              <Link key={tool.name} href={tool.href} className="rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {content}
              </Link>
            ) : (
              <div key={tool.name}>{content}</div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Search className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 font-medium">No encontramos esa herramienta</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba con “PDF”, “imagen”, “texto” o “datos”.
          </p>
        </div>
      )}
    </div>
  );
}
