import type { Metadata } from 'next';

import { OcrStudio } from '@/components/ocr-studio';
import { ToolPageShell } from '@/components/tool-page-shell';
import { absoluteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Imagen a texto',
  description: 'Extrae texto de varias imágenes o PDF y crea documentos buscables directamente en tu navegador.',
  alternates: { canonical: '/herramientas/ocr' },
  openGraph: { title: 'Imagen a texto | CeroNube', description: 'Extrae texto de imágenes con OCR local en tu navegador.', images: [] },
  twitter: { title: 'Imagen a texto | CeroNube', description: 'Extrae texto de imágenes con OCR local en tu navegador.', images: [] },
};

export default function OcrPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Imagen a texto',
    description: 'OCR local multipágina para imágenes y PDF con exportación de texto y PDF buscable.',
    url: absoluteUrl('/herramientas/ocr'),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Cualquier sistema con un navegador compatible',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };
  return (
    <ToolPageShell
      title="Imagen a texto"
      description="Reconoce varias imágenes o páginas PDF, revisa fragmentos dudosos y descarga texto o un PDF buscable."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <OcrStudio />
    </ToolPageShell>
  );
}
