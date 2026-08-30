import type { Metadata } from 'next';

import { PdfOrganizer } from '@/components/pdf-organizer';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Organizar PDF',
  description: 'Une, reordena, gira, elimina y separa páginas PDF directamente en tu navegador.',
  alternates: { canonical: '/herramientas/pdf' },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function PdfOrganizerPage() {
  return (
    <ToolPageShell
      title="Organizar PDF"
      description="Une varios documentos, cambia el orden, gira o elimina páginas y descarga el resultado sin subir tus PDF."
    >
      <PdfOrganizer />
    </ToolPageShell>
  );
}
