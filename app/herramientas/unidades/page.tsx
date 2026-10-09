import type { Metadata } from 'next';
import { ToolPageShell } from '@/components/tool-page-shell';
import { UnitConverter } from '@/components/unit-converter';

export const metadata: Metadata = {
  title: 'Convertir unidades',
  description: 'Convierte longitud, masa, temperatura, área, volumen y almacenamiento digital con factores locales y precisión elegida.',
  alternates: { canonical: '/herramientas/unidades' },
  openGraph: { title: 'Convertir unidades | CeroNube', description: 'Convierte unidades en tu navegador y copia el resultado con su unidad.', images: [] },
  twitter: { title: 'Convertir unidades | CeroNube', description: 'Conversiones locales de seis familias de unidades, con precisión visible.', images: [] },
};

export default function UnitsPage() {
  return <ToolPageShell title="Convertir unidades" description="Resuelve conversiones de longitud, masa, temperatura, área, volumen y almacenamiento digital. Elige las unidades y la precisión, y copia el resultado calculado en este dispositivo."><UnitConverter /></ToolPageShell>;
}
