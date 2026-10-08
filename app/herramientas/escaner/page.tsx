import type { Metadata } from 'next';

import { DocumentScanner } from '@/components/document-scanner';
import { ToolPageShell } from '@/components/tool-page-shell';
import { absoluteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Escáner a PDF',
  description: 'Corrige la perspectiva de fotografías, ajusta cada página y crea un PDF limpio directamente en tu navegador.',
  alternates: { canonical: '/herramientas/escaner' },
  openGraph: { title: 'Escáner a PDF | CeroNube', description: 'Convierte fotos de documentos en un PDF limpio sin subirlas.', images: [] },
  twitter: { title: 'Escáner a PDF | CeroNube', description: 'Convierte fotos de documentos en un PDF limpio sin subirlas.', images: [] },
};

export default function ScannerPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Escáner a PDF',
    description: 'Escáner local con detección de bordes, corrección de perspectiva y exportación PDF.',
    url: absoluteUrl('/herramientas/escaner'),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Cualquier sistema con un navegador compatible',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };
  return (
    <ToolPageShell
      title="Escáner a PDF"
      description="Detecta la hoja, corrige la perspectiva mediante cuatro esquinas y prepara cada página antes de crear un PDF local."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <DocumentScanner />
    </ToolPageShell>
  );
}
