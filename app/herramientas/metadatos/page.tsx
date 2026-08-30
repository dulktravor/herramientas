import type { Metadata } from 'next';

import { MetadataCleaner } from '@/components/metadata-cleaner';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Limpiar metadatos',
  description: 'Inspecciona y elimina datos EXIF, ubicación GPS y detalles ocultos de tus fotografías.',
  alternates: { canonical: '/herramientas/metadatos' },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function MetadataCleanerPage() {
  return (
    <ToolPageShell
      title="Limpiar metadatos"
      description="Descubre la información oculta en una fotografía y descarga una copia limpia sin enviarla fuera de tu dispositivo."
    >
      <MetadataCleaner />
    </ToolPageShell>
  );
}
