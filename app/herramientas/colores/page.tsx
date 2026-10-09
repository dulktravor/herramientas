import type { Metadata } from 'next';
import { ToolPageShell } from '@/components/tool-page-shell';
import { ColorWorkshop } from '@/components/color-workshop';

export const metadata: Metadata = {
  title: 'Convertir y revisar colores',
  description: 'Convierte colores HEX, RGB y HSL, crea paletas y revisa el contraste de texto y fondo localmente.',
  alternates: { canonical: '/herramientas/colores' },
  openGraph: { title: 'Convertir y revisar colores | CeroNube', description: 'Paletas sRGB y contraste WCAG 2.2 en tu navegador.', images: [] },
  twitter: { title: 'Convertir y revisar colores | CeroNube', description: 'Paletas sRGB y contraste WCAG 2.2 en tu navegador.', images: [] },
};

export default function ColorPage() {
  return <ToolPageShell title="Convertir y revisar colores" description="Prepara colores para tus diseños, guarda una paleta como TXT o JSON y comprueba la legibilidad de texto sobre un fondo. Todo se calcula en este dispositivo."><ColorWorkshop /></ToolPageShell>;
}
