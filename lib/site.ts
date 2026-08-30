export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL
  ?? 'https://herramientas.enrique-lazaro-dulktravor.workers.dev').replace(/\/$/, '');

export const siteDescription =
  'Herramientas gratuitas para imágenes, PDF y datos que funcionan directamente en tu navegador.';

export const publicTools = [
  {
    name: 'Estudio de imágenes',
    description: 'Comprime, convierte y redimensiona imágenes en tu navegador.',
    path: '/herramientas/imagenes',
  },
  {
    name: 'Organizar PDF',
    description: 'Une, separa, gira y reordena páginas PDF.',
    path: '/herramientas/pdf',
  },
  {
    name: 'Limpiar metadatos',
    description: 'Detecta y elimina información EXIF de fotografías.',
    path: '/herramientas/metadatos',
  },
  {
    name: 'Imagen a texto',
    description: 'Extrae texto editable de imágenes mediante OCR.',
    path: '/herramientas/ocr',
  },
  {
    name: 'Conversor de datos',
    description: 'Convierte entre JSON, CSV, TSV y XML.',
    path: '/herramientas/datos',
  },
  {
    name: 'Escáner a PDF',
    description: 'Convierte fotografías de documentos en un PDF limpio.',
    path: '/herramientas/escaner',
  },
] as const;

export function absoluteUrl(path = '/') {
  return new URL(path, `${siteUrl}/`).toString();
}
