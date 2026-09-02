import type { Metadata } from 'next';

import { MidiStudio } from '@/components/midi-studio';
import { ToolPageShell } from '@/components/tool-page-shell';
import { absoluteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Estudio MIDI',
  description: 'Reproduce, edita y crea archivos MIDI con un piano virtual en tu navegador.',
  alternates: { canonical: '/herramientas/midi' },
  openGraph: {
    title: 'Estudio MIDI | CeroNube',
    description: 'Edita MIDI y toca un piano virtual sin subir tus archivos.',
    images: [],
  },
  twitter: {
    title: 'Estudio MIDI | CeroNube',
    description: 'Edita MIDI y toca un piano virtual sin subir tus archivos.',
    images: [],
  },
};

export default function MidiStudioPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Estudio MIDI',
    description: 'Editor MIDI local con piano virtual, varias pistas y diferentes instrumentos.',
    url: absoluteUrl('/herramientas/midi'),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Cualquier sistema con un navegador compatible',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };

  return (
    <ToolPageShell
      title="Estudio MIDI"
      description="Carga, interpreta y edita música nota a nota. Tus proyectos MIDI permanecen en este dispositivo."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <MidiStudio />
    </ToolPageShell>
  );
}
