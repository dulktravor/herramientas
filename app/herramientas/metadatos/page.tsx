import type { Metadata } from 'next';

import { MetadataCleaner } from '@/components/metadata-cleaner';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Limpiar metadatos',
  description: 'Inspecciona y elimina datos EXIF, ubicación GPS y detalles ocultos de tus fotografías.',
  alternates: { canonical: '/herramientas/metadatos' },
  openGraph: { title: 'Limpiar metadatos | CeroNube', description: 'Inspecciona y elimina EXIF y ubicación sin subir tus fotografías.', images: [] },
  twitter: { title: 'Limpiar metadatos | CeroNube', description: 'Inspecciona y elimina EXIF y ubicación sin subir tus fotografías.', images: [] },
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
