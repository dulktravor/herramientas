import type { Metadata } from 'next';
import { ToolPageShell } from '@/components/tool-page-shell';
import { FontLaboratory } from '@/components/font-laboratory';
import { absoluteUrl, siteName } from '@/lib/site';
const description =
  'Inspecciona fuentes TTF, OTF, WOFF y WOFF2, prueba sus caracteres, crea muestras y prepara subconjuntos sin subir archivos.';
export const metadata: Metadata = {
  title: 'Laboratorio de fuentes',
  description,
  alternates: { canonical: '/herramientas/fuentes' },
  openGraph: {
    title: 'Laboratorio de fuentes | CeroNube',
    description,
    images: [],
  },
  twitter: {
    title: 'Laboratorio de fuentes | CeroNube',
    description,
    images: [],
  },
};
export default function FontLaboratoryPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Laboratorio de fuentes',
    description,
    url: absoluteUrl('/herramientas/fuentes'),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Cualquier sistema con un navegador moderno',
    browserRequirements: 'JavaScript, FontFace, Web Workers y WebAssembly',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: siteName },
  };
  return (
    <ToolPageShell
      title="Laboratorio de fuentes"
      description="Explora tu tipografía, prueba sus caracteres y prepárala para la web. Todo ocurre en este dispositivo."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <FontLaboratory />
    </ToolPageShell>
  );
}
