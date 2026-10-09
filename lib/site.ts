export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://herramientas.enrique-lazaro-dulktravor.workers.dev'
).replace(/\/$/, '');

export const siteName = 'CeroNube';

export const siteTagline = 'Resuelve aquí. No subas nada.';

export const siteDescription =
  'Utilidades privadas para archivos, texto, códigos QR, contraseñas, unidades, fechas y colores que trabajan directamente en tu navegador.';

export const publicTools = [
  { name: 'Convertir unidades', description: 'Convierte longitud, masa, temperatura, área, volumen y almacenamiento digital localmente.', path: '/herramientas/unidades' },
  { name: 'Calcular fechas y horarios', description: 'Calcula días entre fechas, suma o resta días y convierte horarios entre zonas.', path: '/herramientas/fechas' },
  { name: 'Convertir y revisar colores', description: 'Convierte HEX, RGB y HSL, crea paletas y revisa el contraste de texto y fondo.', path: '/herramientas/colores' },
  { name: 'Crear y leer QR', description: 'Crea QR para texto, enlaces, Wi-Fi y contactos; lee imágenes localmente.', path: '/herramientas/qr' },
  { name: 'Limpiar y ordenar texto', description: 'Limpia listas y texto, cuenta palabras y descarga TXT en tu navegador.', path: '/herramientas/texto' },
  { name: 'Generar contraseñas y frases', description: 'Genera contraseñas y frases aleatorias en tu dispositivo sin guardar secretos.', path: '/herramientas/contrasenas' },
  { name: 'Taller EPUB', description: 'Crea y reorganiza libros, edita capítulos y metadatos, repara el índice y extrae texto localmente.', path: '/herramientas/epub' },
  { name: 'Laboratorio de fuentes', description: 'Inspecciona y convierte fuentes, crea muestras y subconjuntos en tu navegador.', path: '/herramientas/fuentes' },
  {
    name: 'Gestor de archivos ZIP',
    description:
      'Crea, examina, modifica y extrae archivos ZIP en tu navegador.',
    path: '/herramientas/zip',
  },
  {
    name: 'Taller de vídeo',
    description:
      'Recorta, ajusta aspecto, silencia, añade audio y convierte vídeos en tu navegador.',
    path: '/herramientas/video',
  },
  {
    name: 'Estudio MIDI',
    description:
      'Toca, reproduce y edita música de piano y otros instrumentos en tu navegador.',
    path: '/herramientas/midi',
  },
  {
    name: 'Estudio de audio',
    description:
      'Recorta, une, normaliza y ajusta archivos de audio en tu navegador.',
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
    description: 'Reconoce varias imágenes o PDF y exporta texto o un PDF buscable.',
    path: '/herramientas/ocr',
  },
  {
    name: 'Conversor de datos',
    description: 'Convierte entre JSON, CSV, TSV y XML.',
    path: '/herramientas/datos',
  },
  {
    name: 'Escáner a PDF',
    description: 'Detecta bordes, corrige la perspectiva y crea un PDF limpio.',
    path: '/herramientas/escaner',
  },
] as const;

export function absoluteUrl(path = '/') {
  return new URL(path, `${siteUrl}/`).toString();
}
