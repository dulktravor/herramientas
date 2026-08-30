import type { Metadata } from 'next';

import { DataConverter } from '@/components/data-converter';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Conversor de datos',
  description: 'Convierte datos entre JSON, CSV, TSV y XML directamente en tu navegador.',
  alternates: { canonical: '/herramientas/datos' },
};

export default function DataConverterPage() {
  return (
    <ToolPageShell
      title="Conversor de datos"
      description="Transforma JSON, CSV, TSV y XML, inspecciona los registros en una tabla y descarga el formato que necesitas."
    >
      <DataConverter />
    </ToolPageShell>
  );
}
