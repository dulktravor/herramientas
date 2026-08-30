import type { Metadata } from 'next';

import { ConsentPreferencesButton } from '@/components/consent-provider';
import { ContentPageShell } from '@/components/content-page-shell';

export const metadata: Metadata = {
  title: 'Privacidad',
  description: 'Cómo se procesan los archivos, qué medición puede utilizarse y cómo controlar tus preferencias.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <ContentPageShell
      eyebrow="Transparencia"
      title="Política de privacidad"
      description="Esta página explica qué ocurre con tus archivos y qué servicios opcionales pueden activarse al utilizar Herramientas."
    >
      <section>
        <h2>Procesamiento de archivos</h2>
        <p>Las herramientas están diseñadas para procesar imágenes, documentos y datos dentro de tu navegador. Los archivos que seleccionas no se almacenan en una base de datos del sitio. Al cerrar o recargar la página, los datos temporales utilizados por la herramienta se descartan.</p>
        <p>Algunas funciones pueden descargar componentes necesarios para trabajar, como el modelo lingüístico del reconocimiento OCR. Esa descarga no implica que la imagen seleccionada se envíe al servidor.</p>
      </section>
      <section>
        <h2>Datos técnicos esenciales</h2>
        <p>El proveedor de alojamiento puede procesar datos técnicos habituales —por ejemplo, dirección IP, fecha, ruta solicitada y características del navegador— para entregar el sitio, mantener su seguridad y diagnosticar errores. Estos registros pertenecen a la infraestructura de Cloudflare.</p>
      </section>
      <section>
        <h2>Medición y publicidad opcionales</h2>
        <p>Si aceptas las tecnologías opcionales, el sitio puede cargar Cloudflare Web Analytics para conocer el uso agregado y Google AdSense para mostrar publicidad. Google y sus socios pueden utilizar identificadores o almacenamiento del navegador conforme a sus propias políticas y a la configuración regional aplicable.</p>
        <p>Si eliges “Solo necesarias”, las herramientas siguen funcionando y el sitio no carga desde su código los servicios opcionales configurados.</p>
      </section>
      <section>
        <h2>Tu elección</h2>
        <p>La preferencia se guarda localmente en tu navegador. Puedes eliminarla y volver a decidir en cualquier momento.</p>
        <div className="mt-4"><ConsentPreferencesButton /></div>
      </section>
      <section>
        <h2>Conservación y contacto</h2>
        <p>El sitio no crea cuentas de usuario ni conserva copias de los archivos procesados. La infraestructura y los servicios opcionales pueden aplicar sus propios periodos de conservación.</p>
        {contactEmail ? <p>Para consultas relacionadas con privacidad, escribe a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p> : null}
        <p>Última actualización: 29 de agosto de 2026.</p>
      </section>
    </ContentPageShell>
  );
}
