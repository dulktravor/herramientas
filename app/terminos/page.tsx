import type { Metadata } from 'next';

import { ContentPageShell } from '@/components/content-page-shell';

export const metadata: Metadata = {
  title: 'Términos de uso',
  description: 'Condiciones básicas para utilizar responsablemente las herramientas del sitio.',
  alternates: { canonical: '/terminos' },
};

export default function TermsPage() {
  return (
    <ContentPageShell
      eyebrow="Condiciones"
      title="Términos de uso"
      description="Estas condiciones establecen un marco sencillo para utilizar las herramientas de forma segura y responsable."
    >
      <section>
        <h2>Uso del servicio</h2>
        <p>Puedes utilizar las herramientas para procesar archivos propios o archivos que tengas autorización para modificar. No debes emplearlas para infringir derechos, eludir medidas de seguridad, distribuir contenido ilícito o causar daño a otras personas o sistemas.</p>
      </section>
      <section>
        <h2>Tus archivos y resultados</h2>
        <p>Conservas los derechos y la responsabilidad sobre los archivos que eliges y los resultados que generas. Es recomendable mantener una copia del archivo original antes de realizar cualquier transformación.</p>
      </section>
      <section>
        <h2>Disponibilidad y precisión</h2>
        <p>Las utilidades se proporcionan como apoyo práctico. Los resultados automáticos —incluidos OCR, compresión, lectura de metadatos y conversión de formatos— pueden contener errores. Comprueba el resultado antes de utilizarlo en procesos importantes.</p>
        <p>El sitio puede cambiar, incorporar límites temporales o dejar de ofrecer una herramienta cuando sea necesario por mantenimiento, seguridad o compatibilidad.</p>
      </section>
      <section>
        <h2>Servicios externos</h2>
        <p>El alojamiento, la medición y la publicidad pueden depender de proveedores externos sujetos a sus propias condiciones. La disponibilidad de esos servicios no está controlada completamente por este sitio.</p>
      </section>
      <section>
        <h2>Cambios</h2>
        <p>Estos términos pueden actualizarse para reflejar nuevas herramientas o requisitos. La fecha de actualización permitirá identificar la versión vigente.</p>
        <p>Última actualización: 29 de agosto de 2026.</p>
      </section>
    </ContentPageShell>
  );
}
