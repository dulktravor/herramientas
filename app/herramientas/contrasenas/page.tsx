import type { Metadata } from 'next';

import { PasswordGenerator } from '@/components/password-generator';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Generar contraseñas y frases',
  description: 'Crea contraseñas y frases aleatorias localmente con la fuente criptográfica de tu navegador. Sin historial de secretos.',
  alternates: { canonical: '/herramientas/contrasenas' },
  openGraph: { title: 'Generar contraseñas y frases | CeroNube', description: 'Elige longitud, grupos de caracteres o una frase aleatoria de palabras y copia el resultado local.', images: [] },
  twitter: { title: 'Generar contraseñas y frases | CeroNube', description: 'Genera contraseñas y frases aleatorias localmente, sin historial.', images: [] },
};

export default function PasswordGeneratorPage() {
  return <ToolPageShell title="Generar contraseñas y frases" description="Elige los caracteres o una frase de palabras aleatorias y copia el resultado cuando lo necesites. La generación ocurre en tu navegador, sin cuenta ni historial de secretos."><PasswordGenerator /></ToolPageShell>;
}
