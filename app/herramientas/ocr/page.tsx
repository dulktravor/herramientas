import type { Metadata } from 'next';

import { OcrStudio } from '@/components/ocr-studio';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Imagen a texto',
  description: 'Extrae texto editable de imágenes y documentos fotografiados directamente en tu navegador.',
  alternates: { canonical: '/herramientas/ocr' },
  openGraph: { title: 'Imagen a texto | CeroNube', description: 'Extrae texto de imágenes con OCR local en tu navegador.', images: [] },
  twitter: { title: 'Imagen a texto | CeroNube', description: 'Extrae texto de imágenes con OCR local en tu navegador.', images: [] },
};

export default function OcrPage() {
  return (
    <ToolPageShell
      title="Imagen a texto"
      description="Convierte capturas y documentos fotografiados en texto editable con reconocimiento en español e inglés."
    >
      <OcrStudio />
    </ToolPageShell>
  );
}
