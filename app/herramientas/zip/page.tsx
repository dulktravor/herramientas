import type { Metadata } from 'next';

import { ToolPageShell } from '@/components/tool-page-shell';
import { ZipManager } from '@/components/zip-manager';
import { absoluteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Gestor de archivos ZIP',
  description:
    'Crea, examina, modifica y extrae archivos ZIP directamente en tu navegador sin subir su contenido.',
  alternates: { canonical: '/herramientas/zip' },
  openGraph: {
    title: 'Gestor de archivos ZIP | CeroNube',
    description:
      'Crea, examina, modifica y extrae archivos ZIP de forma privada en tu dispositivo.',
    images: [],
  },
  twitter: {
    title: 'Gestor de archivos ZIP | CeroNube',
    description:
      'Crea, examina, modifica y extrae archivos ZIP de forma privada en tu dispositivo.',
    images: [],
  },
};

export default function ZipManagerPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Gestor de archivos ZIP',
    description:
      'Herramienta local para crear archivos ZIP, examinar su estructura, previsualizar texto, detectar rutas peligrosas, extraer elementos y descargar una copia modificada.',
    url: absoluteUrl('/herramientas/zip'),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Cualquier sistema con un navegador moderno',
    browserRequirements: 'Requiere File API y JavaScript',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };

  return (
    <ToolPageShell
      title="Gestor de archivos ZIP"
      description="Crea un ZIP, revisa lo que contiene, extrae solo lo que necesitas o descarga una copia modificada. Todo ocurre en este dispositivo."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <ZipManager />
    </ToolPageShell>
  );
}
