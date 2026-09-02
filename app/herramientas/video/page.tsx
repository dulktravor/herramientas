import type { Metadata } from 'next';

import { VideoStudio } from '@/components/video-studio';
import { ToolPageShell } from '@/components/tool-page-shell';
import { absoluteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Taller de vídeo',
  description:
    'Recorta, ajusta resolución y aspecto, incrusta subtítulos SRT/VTT, extrae audio en MP3/WAV/OGG y convierte vídeos a MP4, WebM o GIF en tu navegador sin subir archivos.',
  alternates: { canonical: '/herramientas/video' },
  openGraph: {
    title: 'Taller de vídeo | CeroNube',
    description:
      'Edita, recorta, incrusta subtítulos, extrae audio y convierte vídeos a MP4, WebM o GIF de forma privada en tu dispositivo.',
  },
  twitter: {
    title: 'Taller de vídeo | CeroNube',
    description:
      'Edita, recorta, incrusta subtítulos, extrae audio y convierte vídeos a MP4, WebM o GIF de forma privada en tu dispositivo.',
  },
};

export default function VideoStudioPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Taller de vídeo',
    description:
      'Editor local de vídeo para recortar por tiempos, cambiar relación de aspecto y resolución, comprimir, silenciar o mezclar audio, incrustar subtítulos SRT/VTT y convertir a MP4, WebM, GIF animado, MP3, WAV u OGG.',
    url: absoluteUrl('/herramientas/video'),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Cualquier sistema con un navegador moderno',
    browserRequirements: 'Requiere WebAssembly y Web Workers',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };

  return (
    <ToolPageShell
      title="Taller de vídeo"
      description="Recorta, ajusta aspecto y resolución, incrusta subtítulos, añade música, extrae audio o convierte a GIF sin enviar tus archivos a un servidor. Todo ocurre en este dispositivo."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <VideoStudio />
    </ToolPageShell>
  );
}
