# Herramientas por implementar en CeroNube

## Objetivo

Ampliar CeroNube con herramientas para nuevas familias de archivos, sin repetir las utilidades ya disponibles para imágenes, PDF, OCR, escaneo, metadatos fotográficos o conversión de datos tabulares.

Todas las herramientas descritas aquí deben cumplir estos principios:

- Procesamiento íntegramente local en el navegador.
- Ningún archivo debe enviarse a un servidor.
- Sin cuentas ni registro obligatorio.
- Resultados descargables directamente desde el dispositivo.
- Límites claros de tamaño, memoria y compatibilidad antes de procesar.
- Carga diferida de motores pesados, especialmente WebAssembly.

## Resumen de herramientas

| N.º | Categoría | Herramienta | Complejidad estimada | Prioridad sugerida |
| ---: | --- | --- | --- | --- |
| 1 | Audio | Estudio de audio | Media | Alta |
| 2 | Vídeo | Taller de vídeo | Alta | Media |
| 3 | Subtítulos | Editor de subtítulos | Baja | Muy alta |
| 4 | Comprimidos | Gestor de archivos ZIP | Baja | Muy alta |
| 5 | Tipografías | Laboratorio de fuentes | Media | Media |
| 6 | Modelos 3D | Visor y conversor 3D | Media | Media |
| 7 | Libros electrónicos | Taller EPUB | Media | Media |
| 8 | Documentos | DOCX a Markdown/HTML | Media | Media |
| 9 | Seguridad | Cifrar archivos | Baja-media | Alta |
| 10 | Seguridad | Verificar archivos | Muy baja | Muy alta |
| 11 | Desarrollo | Inspector hexadecimal | Baja | Media |
| 12 | Texto | Comparador de archivos | Baja | Alta |
| 13 | Texto | Conversor Markdown/HTML | Baja | Alta |
| 14 | Correo | Visor EML | Media | Media |
| 15 | Impresión 3D | Reparador STL | Alta | Baja |

## 1. Estudio de audio

Herramienta para editar y convertir archivos de audio sin subirlos.

### Funciones previstas

- Abrir MP3, WAV, OGG, FLAC, AAC y M4A, según compatibilidad del motor.
- Mostrar forma de onda, duración, canales y frecuencia de muestreo.
- Cortar un fragmento indicando inicio y fin.
- Unir varios audios y cambiar su orden.
- Ajustar volumen y normalizar niveles.
- Aplicar entrada y salida gradual.
- Cambiar velocidad de reproducción.
- Convertir entre formatos.
- Exportar el resultado o varios resultados en ZIP.

### Implementación orientativa

- Web Audio API para previsualización y operaciones sencillas.
- `OfflineAudioContext` para procesar sin reproducir en tiempo real.
- `ffmpeg.wasm` cargado bajo demanda para formatos y conversiones avanzadas.

## 2. Taller de vídeo

Herramienta local para operaciones frecuentes con vídeos.

### Funciones previstas

- Abrir MP4, WebM, MOV, MKV y AVI, según soporte del motor.
- Recortar por tiempo de inicio y fin.
- Cambiar resolución y relación de aspecto.
- Comprimir mediante perfiles comprensibles.
- Silenciar el vídeo o reemplazar su pista de audio.
- Extraer el audio en MP3, WAV u OGG.
- Cambiar velocidad y fotogramas por segundo.
- Convertir vídeo a GIF.
- Convertir entre MP4 y WebM.
- Incrustar subtítulos.

### Implementación orientativa

- Elementos nativos `video` y Canvas para previsualización.
- `ffmpeg.wasm` dentro de un Web Worker para procesar.
- Límites inferiores en dispositivos móviles debido al consumo de memoria.

## 3. Editor de subtítulos

Editor especializado en archivos de subtítulos, independiente del conversor de datos.

### Funciones previstas

- Abrir SRT, WebVTT y ASS/SSA.
- Editar texto, tiempo inicial y tiempo final de cada entrada.
- Desplazar todos los tiempos hacia delante o atrás.
- Cambiar la velocidad o adaptar subtítulos entre distintas tasas de fotogramas.
- Detectar entradas superpuestas, vacías o con tiempos inválidos.
- Dividir subtítulos en un punto determinado.
- Unir varios archivos conservando la continuidad temporal.
- Buscar y reemplazar texto.
- Convertir SRT a VTT y VTT a SRT.
- Previsualizar los subtítulos sobre un vídeo local opcional.

### Implementación orientativa

- TypeScript puro para análisis y serialización.
- APIs nativas de vídeo para la previsualización.
- Sin dependencias pesadas para la primera versión.

## 4. Gestor de archivos ZIP

Herramienta para crear, examinar y extraer archivos comprimidos.

### Funciones previstas

- Crear un ZIP con archivos y carpetas seleccionados.
- Añadir, quitar y renombrar elementos antes de comprimir.
- Elegir nivel de compresión.
- Abrir un ZIP y mostrar su estructura interna.
- Previsualizar archivos de texto pequeños.
- Extraer todo o solo elementos seleccionados.
- Mostrar tamaño original y tamaño comprimido.
- Detectar nombres duplicados y rutas potencialmente peligrosas.
- Generar un ZIP nuevo después de modificar su contenido.

### Implementación orientativa

- Reutilizar `jszip`, que ya está instalado en el proyecto.
- Validar rutas antes de extraer para evitar `../` y rutas absolutas.
- Considerar TAR, TAR.GZ y 7Z como ampliaciones posteriores.

## 5. Laboratorio de fuentes

Herramienta para inspeccionar, probar y preparar tipografías.

### Funciones previstas

- Abrir TTF, OTF, WOFF y WOFF2.
- Mostrar nombre, familia, peso, estilo y número de glifos.
- Previsualizar texto personalizado en distintos tamaños.
- Mostrar una cuadrícula de caracteres disponibles.
- Detectar si incluye tildes, eñes, símbolos y alfabetos específicos.
- Generar muestras tipográficas descargables.
- Convertir fuentes de escritorio a formatos web cuando sea técnicamente posible.
- Crear subconjuntos con únicamente los caracteres utilizados.
- Generar una declaración `@font-face` lista para copiar.

### Implementación orientativa

- API `FontFace` para cargar y previsualizar archivos locales.
- OpenType.js o una alternativa equivalente para inspección.
- Motor WOFF2 en WebAssembly para conversiones avanzadas.

## 6. Visor y conversor 3D

Herramienta para revisar y transformar modelos tridimensionales.

### Funciones previstas

- Abrir STL, OBJ, PLY, glTF y GLB.
- Rotar, desplazar y acercar el modelo.
- Cambiar fondo, iluminación y modo alámbrico.
- Mostrar dimensiones, número de vértices y polígonos.
- Cambiar escala y unidades.
- Centrar el modelo y colocarlo sobre el plano base.
- Exportar a STL, OBJ, PLY, glTF o GLB cuando la conversión sea compatible.
- Descargar una captura de la vista actual.

### Implementación orientativa

- Three.js para la visualización.
- Cargadores y exportadores oficiales de Three.js.
- Web Worker para archivos grandes o cálculos geométricos.

## 7. Taller EPUB

Herramienta para crear y reorganizar libros electrónicos.

### Funciones previstas

- Abrir y examinar la estructura de un EPUB.
- Crear un EPUB a partir de capítulos HTML o Markdown.
- Añadir, eliminar y reordenar capítulos.
- Editar título, autor, idioma y portada.
- Crear o reparar el índice de navegación.
- Extraer el texto o los capítulos del libro.
- Detectar recursos ausentes y enlaces internos rotos.
- Validar la estructura básica antes de descargar.
- Volver a empaquetar el libro como EPUB.

### Implementación orientativa

- JSZip para abrir y generar el contenedor EPUB.
- DOMParser para OPF, XHTML y documentos de navegación.
- Sanitización estricta antes de mostrar contenido HTML del libro.

## 8. DOCX a Markdown/HTML

Herramienta para recuperar contenido utilizable de documentos DOCX.

### Funciones previstas

- Abrir un archivo DOCX local.
- Extraer títulos, párrafos, listas, tablas, enlaces e imágenes.
- Mostrar una previsualización limpia del documento.
- Eliminar estilos innecesarios procedentes de Word.
- Exportar como Markdown o HTML semántico.
- Elegir si las imágenes se incluyen, se descargan aparte o se empaquetan en ZIP.
- Mostrar advertencias sobre elementos no convertibles.

### Implementación orientativa

- Mammoth.js o una biblioteca equivalente ejecutada en el navegador.
- DOMPurify o sanitización equivalente para el HTML generado.
- Evitar prometer conservación visual exacta del documento original.

## 9. Cifrar archivos

Herramienta para proteger cualquier tipo de archivo con una contraseña.

### Funciones previstas

- Seleccionar uno o varios archivos.
- Introducir y confirmar una contraseña.
- Derivar una clave usando PBKDF2 o Argon2id.
- Cifrar con AES-GCM y un vector aleatorio.
- Crear un formato contenedor documentado por CeroNube.
- Descifrar archivos creados por la propia herramienta.
- Mostrar una comprobación clara cuando la contraseña sea incorrecta.
- Incluir versión, algoritmo, sal y parámetros dentro del encabezado del contenedor.

### Implementación orientativa

- Web Crypto API para AES-GCM y PBKDF2.
- Argon2id en WebAssembly como posible mejora.
- Formato versionado para mantener compatibilidad futura.
- No almacenar contraseñas, claves ni archivos en el navegador.

## 10. Verificar archivos

Herramienta universal para calcular y comparar huellas digitales.

### Funciones previstas

- Calcular SHA-256, SHA-384 y SHA-512.
- Mostrar el resultado en hexadecimal.
- Copiar o descargar la suma de comprobación.
- Comparar con un hash proporcionado por el usuario.
- Procesar varios archivos y generar un manifiesto.
- Verificar un conjunto de archivos usando un manifiesto previo.
- Mostrar coincidencias y diferencias de forma inequívoca.

### Implementación orientativa

- Web Crypto API para archivos pequeños y medianos.
- Implementación incremental dentro de un Web Worker para archivos grandes.
- No presentar SHA-1 como opción segura.

## 11. Inspector hexadecimal

Herramienta para examinar la estructura binaria de cualquier archivo.

### Funciones previstas

- Mostrar offset, bytes hexadecimales y representación ASCII.
- Navegar por bloques sin cargar visualmente todo el archivo.
- Buscar secuencias hexadecimales o texto.
- Detectar la firma mágica y compararla con la extensión.
- Mostrar tipo MIME probable, tamaño y primeros bytes.
- Seleccionar un rango y exportarlo como archivo nuevo.
- Copiar bytes como hexadecimal, Base64 o arreglo de números.

### Implementación orientativa

- File API y lecturas parciales con `Blob.slice()`.
- Tabla virtualizada para no renderizar millones de filas.
- Base local de firmas comunes de formatos.

## 12. Comparador de archivos

Herramienta para encontrar diferencias entre dos archivos de texto.

### Funciones previstas

- Comparar TXT, Markdown, código fuente, configuraciones y subtítulos.
- Mostrar vista paralela y vista unificada.
- Resaltar líneas añadidas, eliminadas y modificadas.
- Ignorar opcionalmente espacios, mayúsculas o finales de línea.
- Navegar entre diferencias.
- Copiar o descargar el resultado combinado.
- Aplicar cambios seleccionados de un lado al otro.

### Implementación orientativa

- Algoritmo Myers o biblioteca ligera de diferencias.
- Web Worker para textos grandes.
- Límites de tamaño explícitos para evitar bloquear la interfaz.

## 13. Conversor Markdown/HTML

Editor local para transformar documentos de texto destinados a la web.

### Funciones previstas

- Editar Markdown con vista previa inmediata.
- Convertir Markdown a HTML semántico.
- Convertir HTML sencillo a Markdown.
- Limpiar estilos, scripts y atributos inseguros.
- Generar tabla de contenidos.
- Corregir enlaces relativos.
- Exportar Markdown, HTML completo o fragmento HTML.
- Incluir estadísticas básicas de palabras, títulos y enlaces.

### Implementación orientativa

- Parser CommonMark para Markdown.
- Turndown o equivalente para HTML a Markdown.
- Sanitización estricta del HTML mostrado y exportado.

## 14. Visor EML

Herramienta para abrir mensajes de correo guardados sin enviarlos a ningún servicio.

### Funciones previstas

- Abrir archivos EML.
- Mostrar remitente, destinatarios, fecha, asunto y encabezados.
- Alternar entre cuerpo de texto y cuerpo HTML.
- Listar y descargar archivos adjuntos.
- Mostrar el código fuente MIME.
- Exportar el cuerpo como TXT o HTML.
- Empaquetar cuerpo y adjuntos en ZIP.
- Advertir sobre contenido remoto, enlaces y adjuntos potencialmente peligrosos.

### Implementación orientativa

- Parser MIME compatible con navegador.
- Bloqueo de recursos remotos por defecto.
- Sanitización del cuerpo HTML y aislamiento de la previsualización.

## 15. Reparador STL

Herramienta avanzada para preparar modelos destinados a impresión 3D.

### Funciones previstas

- Abrir STL binario o ASCII.
- Detectar triángulos degenerados y vértices duplicados.
- Encontrar bordes abiertos y geometría no manifold.
- Invertir normales incorrectas.
- Cambiar unidades y dimensiones.
- Centrar, orientar y apoyar el modelo sobre la base.
- Calcular volumen aproximado y caja envolvente.
- Exportar un STL reparado.

### Implementación orientativa

- Three.js para visualización.
- Algoritmos geométricos ejecutados en Web Workers.
- Considerar una biblioteca especializada o WebAssembly para reparaciones complejas.

## Orden de implementación recomendado

### Fase 1: herramientas rápidas y ligeras

1. Editor de subtítulos.
2. Gestor de archivos ZIP.
3. Verificar archivos.
4. Comparador de archivos.
5. Conversor Markdown/HTML.

### Fase 2: nuevos formatos y experiencias

6. Estudio de audio.
7. Cifrar archivos.
8. Visor EML.
9. DOCX a Markdown/HTML.
10. Taller EPUB.

### Fase 3: procesamiento pesado o especializado

11. Taller de vídeo.
12. Laboratorio de fuentes.
13. Visor y conversor 3D.
14. Inspector hexadecimal avanzado.
15. Reparador STL.

## Categorías nuevas para el directorio

- Audio
- Vídeo
- Subtítulos
- Comprimidos
- Tipografías
- Modelos 3D
- Libros electrónicos
- Documentos
- Seguridad
- Desarrollo
- Texto
- Correo
- Impresión 3D

## Criterios de aceptación comunes

Cada herramienta se considerará lista cuando cumpla, como mínimo, lo siguiente:

- Funciona sin enviar el archivo a una API o servidor.
- Explica de forma visible que el procesamiento ocurre en el dispositivo.
- Rechaza formatos o tamaños no admitidos con un mensaje comprensible.
- Ofrece estado vacío, progreso, éxito y error.
- Permite cancelar o limpiar la operación.
- Libera las URL de objetos y recursos temporales.
- Evita congelar la interfaz durante operaciones costosas.
- Funciona con teclado y controles táctiles.
- Tiene límites razonables para ordenadores y móviles.
- Descarga el resultado con un nombre de archivo predecible.
- Incluye metadatos SEO y datos estructurados coherentes con el directorio.

## Exclusiones de esta hoja de ruta

Para mantener estas propuestas separadas de las funciones ya implementadas, esta lista no incluye:

- Compresión, conversión o redimensionado de imágenes.
- Organización o edición general de PDF.
- Limpieza de metadatos fotográficos.
- OCR de imágenes.
- Conversión entre JSON, CSV, TSV y XML.
- Escaneo de documentos a PDF.

