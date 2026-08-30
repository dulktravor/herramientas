import type { Metadata } from 'next';

import { OcrStudio } from '@/components/ocr-studio';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Imagen a texto',
  description: 'Extrae texto editable de imágenes y documentos fotografiados directamente en tu navegador.',
  alternates: { canonical: '/herramientas/ocr' },
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
