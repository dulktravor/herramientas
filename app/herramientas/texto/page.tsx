import type { Metadata } from 'next';
import { ToolPageShell } from '@/components/tool-page-shell';
import { TextWorkshop } from '@/components/text-workshop';

export const metadata: Metadata = {
  title: 'Limpiar y ordenar texto',
  description: 'Limpia listas, ordena líneas y cuenta palabras de textos y TXT en tu navegador.',
  alternates: { canonical: '/herramientas/texto' },
  openGraph: { title: 'Limpiar y ordenar texto | CeroNube', description: 'Transforma textos y TXT localmente, con vista previa y descarga.', images: [] },
  twitter: { title: 'Limpiar y ordenar texto | CeroNube', description: 'Transforma textos y TXT localmente, con vista previa y descarga.', images: [] },
};

export default function TextPage() {
  return <ToolPageShell title="Limpiar y ordenar texto" description="Depura listas, ordena líneas y cuenta palabras. Revisa el original y el resultado antes de cambiar tu texto; todo se procesa en este dispositivo."><TextWorkshop /></ToolPageShell>;
}
