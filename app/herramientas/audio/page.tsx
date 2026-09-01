import type { Metadata } from 'next';

import { AudioStudio } from '@/components/audio-studio';
import { ToolPageShell } from '@/components/tool-page-shell';
import { absoluteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Estudio de audio',
  description:
    'Recorta, ajusta y exporta archivos de audio directamente en tu navegador.',
  alternates: { canonical: '/herramientas/audio' },
  openGraph: {
    title: 'Estudio de audio | CeroNube',
    description: 'Edita audio sin subir tus archivos.',
    images: [],
  },
  twitter: {
    title: 'Estudio de audio | CeroNube',
    description: 'Edita audio sin subir tus archivos.',
    images: [],
  },
};

export default function AudioStudioPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Estudio de audio',
    description:
      'Editor local para recortar, unir, normalizar y ajustar archivos de audio.',
    url: absoluteUrl('/herramientas/audio'),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Cualquier sistema con un navegador compatible',
    browserRequirements: 'Requiere Web Audio API',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };

  return (
    <ToolPageShell
      title="Estudio de audio"
      description="Recorta, ajusta y exporta tus pistas sin enviarlas a un servidor. Todo ocurre en este dispositivo."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <AudioStudio />
    </ToolPageShell>
  );
}
