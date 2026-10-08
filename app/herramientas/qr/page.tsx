import type { Metadata } from 'next';
import { QrWorkshop } from '@/components/qr-workshop';
import { ToolPageShell } from '@/components/tool-page-shell';

export const metadata: Metadata = {
  title: 'Crear y leer QR',
  description:
    'Crea QR para texto, enlaces, Wi-Fi y contactos, descarga PNG o SVG y lee imágenes localmente en tu navegador.',
  alternates: { canonical: '/herramientas/qr' },
  openGraph: {
    title: 'Crear y leer QR | CeroNube',
    description: 'Genera y lee QR localmente, sin subir tus datos.',
    images: [],
  },
  twitter: {
    title: 'Crear y leer QR | CeroNube',
    description: 'Genera y lee QR localmente, sin subir tus datos.',
    images: [],
  },
};

export default function QrPage() {
  return (
    <ToolPageShell
      title="Crear y leer QR"
      description="Comparte un texto, enlace, red Wi-Fi o contacto con un QR. También puedes leer un código desde una imagen de tu dispositivo."
    >
      <QrWorkshop />
    </ToolPageShell>
  );
}
