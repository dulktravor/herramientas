import type { Metadata } from 'next';

import { ImageStudio } from '@/components/image-studio';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Estudio de imágenes',
  description: 'Comprime, convierte y redimensiona imágenes directamente en tu navegador.',
  alternates: { canonical: '/herramientas/imagenes' },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function ImageStudioPage() {
  return (
    <ToolPageShell
      title="Estudio de imágenes"
      description="Comprime, convierte y redimensiona imágenes por lotes sin enviarlas a un servidor."
    >
      <ImageStudio />
    </ToolPageShell>
  );
}
