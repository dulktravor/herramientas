import type { Metadata } from 'next';

import { DocumentScanner } from '@/components/document-scanner';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Escáner a PDF',
  description: 'Mejora fotografías de documentos y crea un PDF ordenado directamente en tu navegador.',
  alternates: { canonical: '/herramientas/escaner' },
};

export default function ScannerPage() {
  return (
    <ToolPageShell
      title="Escáner a PDF"
      description="Convierte fotografías de apuntes y documentos en un PDF limpio: ordena, gira, recorta bordes y mejora la legibilidad."
    >
      <DocumentScanner />
    </ToolPageShell>
  );
}
