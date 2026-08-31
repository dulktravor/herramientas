import type { Metadata } from 'next';

import { ConsentPreferences } from '@/components/consent-provider';
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
      description="Esta página explica qué ocurre con tus archivos y qué servicios opcionales pueden activarse al utilizar CeroNube."
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
        <p>Puedes autorizar por separado los anuncios contextuales, la personalización publicitaria y la medición agregada. Los anuncios contextuales se seleccionan principalmente según el contenido que estás viendo; los personalizados pueden utilizar intereses y otras señales autorizadas.</p>
        <p>Si desactivas la personalización pero mantienes los anuncios, el sitio solicitará anuncios no personalizados. Google puede seguir procesando determinadas señales técnicas para entregar, medir y proteger la publicidad contra fraude, conforme a la normativa aplicable.</p>
      </section>
      <section>
        <h2>Tu elección</h2>
        <p>La preferencia se guarda localmente en tu navegador. Puedes modificarla en cualquier momento; desactivar todas las opciones no afecta el funcionamiento de las herramientas.</p>
        <div className="mt-5"><ConsentPreferences /></div>
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
