import type { Metadata } from 'next';
import { DateWorkshop } from '@/components/date-workshop';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Calcular fechas y horarios',
  description: 'Calcula días de calendario, suma o resta fechas y convierte horarios entre zonas en tu navegador, sin enviar tus datos.',
  alternates: { canonical: '/herramientas/fechas' },
  openGraph: { title: 'Calcular fechas y horarios | CeroNube', description: 'Días entre fechas y horarios equivalentes con zonas y cambios estacionales explícitos.', images: [] },
  twitter: { title: 'Calcular fechas y horarios | CeroNube', description: 'Fechas y horarios calculados localmente en tu navegador.', images: [] },
};

export default function DatesPage() {
  return <ToolPageShell title="Calcular fechas y horarios" description="Cuenta días de calendario, suma o resta fechas y encuentra la hora equivalente en otra zona. Las reglas del cálculo y los cambios estacionales se muestran junto al resultado."><DateWorkshop /></ToolPageShell>;
}
