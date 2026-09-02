export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL
  ?? 'https://herramientas.enrique-lazaro-dulktravor.workers.dev').replace(/\/$/, '');

export const siteName = 'CeroNube';

export const siteTagline = 'Resuelve aquí. No subas nada.';

export const siteDescription =
  'Utilidades privadas para imágenes, PDF, vídeo, audio y datos que procesan tus archivos directamente en el navegador.';

export const publicTools = [
  {
    name: 'Taller de vídeo',
    description: 'Recorta, ajusta aspecto, silencia, añade audio y convierte vídeos en tu navegador.',
    path: '/herramientas/video',
  },
  {
    name: 'Estudio MIDI',
    description: 'Toca, reproduce y edita música de piano y otros instrumentos en tu navegador.',
    path: '/herramientas/midi',
  },
  {
    name: 'Estudio de audio',
    description: 'Recorta, une, normaliza y ajusta archivos de audio en tu navegador.',
    path: '/herramientas/audio',
  },
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
