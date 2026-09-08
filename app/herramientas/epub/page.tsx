import type { Metadata } from 'next';
import { ToolPageShell } from '@/components/tool-page-shell';
import { EpubWorkshop } from '@/components/epub-workshop';
import { absoluteUrl, siteName } from '@/lib/site';
const description =
  'Crea y edita EPUB, reorganiza capítulos HTML o Markdown, cambia portada y metadatos, repara el índice y extrae texto sin subir archivos.';
export const metadata: Metadata = {
  title: 'Taller EPUB',
  description,
  alternates: { canonical: '/herramientas/epub' },
  openGraph: { title: 'Taller EPUB | CeroNube', description, images: [] },
  twitter: { title: 'Taller EPUB | CeroNube', description, images: [] },
};
export default function EpubPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Taller EPUB',
    description,
    url: absoluteUrl('/herramientas/epub'),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Cualquier sistema con un navegador moderno',
    browserRequirements: 'JavaScript, DOMParser y Web Workers',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };
  return (
    <ToolPageShell
      title="Taller EPUB"
      description="Crea, revisa y reorganiza tus libros electrónicos. Tus archivos permanecen en este dispositivo."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <EpubWorkshop />
    </ToolPageShell>
  );
}
