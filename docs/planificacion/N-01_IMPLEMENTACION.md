# N-01 — Crear y leer QR

Fecha: 8 de octubre de 2026. Implementada, publicada y verificada en la página oficial; commit de producto `b63011f`.

## Alcance entregado

Ruta `/herramientas/qr`. Formularios de texto, URL completa HTTP/HTTPS, Wi-Fi personal WPA/WPA2, WEP o abierta y contacto vCard 3.0. Vista previa, PNG y SVG, lectura de una imagen PNG/JPEG/WebP local y copia explícita del contenido. Cámara omitida conforme a la ampliación opcional de la propuesta.

El lector muestra el contenido antes de ofrecer abrir un enlace. Solo ofrece navegación HTTP/HTTPS sin credenciales; no abre enlaces automáticamente. Descargar utiliza nombres fijos, sin nombres de red ni contenido en nombres de archivo. SVG contiene únicamente geometría numérica y colores fijos; el texto no se inserta como markup.

## Motores, fuentes y licencias

Se verificaron metadatos con `npm view`, los paquetes instalados y las fuentes primarias enlazadas, el 8 de octubre de 2026. Las versiones se fijan exactamente en el manifiesto y lockfile.

| Dependencia | Versión | Licencia | Paquete descomprimido npm | Función y carga |
| --- | --- | --- | --- | --- |
| `qrcode` | 1.5.4 | MIT | 135.364 bytes | Generador con importación dinámica al pulsar Generar QR |
| `jsqr` | 1.4.0 | Apache-2.0 | 279.741 bytes | Lector QR dentro de un Worker que se crea solo después de elegir una imagen válida |
| `@types/qrcode` | 1.5.6 | MIT | 18.453 bytes | Tipos de desarrollo; no se descargan en el navegador |

Fuentes: [node-qrcode](https://github.com/soldair/node-qrcode), [jsQR](https://github.com/cozmo/jsQR), [ZXing Browser](https://github.com/zxing-js/browser), [convenciones Wi-Fi de ZXing](https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android-ios-11) y [vCard 3.0, RFC 2426](https://www.rfc-editor.org/rfc/rfc2426).

Se evaluó la candidata ZXing Browser y se eligió jsQR porque el alcance exige únicamente QR desde imágenes, sin cámara ni otros códigos. Los paquetes actuales consultados de ZXing Browser 0.2.1 y ZXing Library 0.23.0 ocupan respectivamente 5.800.976 y 11.863.492 bytes descomprimidos; estas cifras no equivalen a un bundle de navegador comparable. La elección se apoya además en la API de píxeles de jsQR, compatible con Worker y cancelación por terminación.

Mantenimiento: la versión de qrcode se publicó el 5 de agosto de 2024 y la de jsQR el 24 de abril de 2021, según el registro npm; ambas son las versiones actuales consultadas. La antigüedad de jsQR exige revisar futuras correcciones. No se interpreta `time.modified` del registro como fecha de nueva versión. Las licencias y avisos completos de qrcode, dijkstrajs 1.0.3 (MIT, dependencia del generador) y jsQR se distribuyen en `public/qr-licenses.txt`, con un enlace visible en la herramienta.

En el build de producción conjunto, el chunk del generador mide 23.477 bytes (8.806 gzip) y el Worker lector 131.166 bytes (47.207 gzip). Los tamaños gzip son compresión de referencia calculada localmente; el tamaño transmitido depende del servidor. El componente propio mide 19.230 bytes (7.071 gzip) en ese build. Ningún motor solicita permisos de cámara, cuenta o archivos adicionales.

## Límites y formato

- Un segmento byte UTF-8, corrección M, capacidad real máxima 2.331 bytes, QR versión 1 a 40 seleccionada por el motor. El límite incluye datos de formularios, encabezados vCard y escapes. Se rechazan texto vacío, exceso y pares Unicode incompletos. No se recortan los campos al pegar.
- Negro opaco sobre blanco opaco, margen obligatorio de cuatro módulos. PNG usa seis píxeles por módulo; SVG y PNG derivan de la misma matriz. Sin logos, recoloración ni margen configurable que pueda impedir la lectura.
- Lectura: archivo de 1 byte a 8 MiB; medidas de 1 a 2048 píxeles por lado. Se inspecciona la cabecera PNG/JPEG/WebP antes de descomprimir y se verifica de nuevo la imagen decodificada. No se aceptan SVG ni formatos sin cabecera válida reconocida.
- Los escapes de Wi-Fi cubren barra inversa, punto y coma, dos puntos, coma y comillas. No se aceptan caracteres de control. Red abierta omite la contraseña.
- vCard escapa barra inversa, punto y coma, coma y saltos de línea; propiedades de teléfono/correo rechazan controles. Las líneas se pliegan a un máximo de 75 bytes sin dividir caracteres UTF-8.
- El lector reconoce un QR por imagen. Recortes, desenfoque, gran densidad, formatos binarios y ciertos lectores sin interpretación UTF-8 pueden limitar compatibilidad. El generador qrcode no implementa ECI completo; Unicode se validó con jsQR, sin prometer compatibilidad universal.
- Tiempo máximo de lectura de 15 segundos, cancelación visible y limpieza. Un QR grande requiere suficiente tamaño al compartir o imprimir.

## Privacidad y liberación

Los formularios y resultados se mantienen en estado React; no se escriben en URL, storage, eventos, consola ni API. El Worker recibe píxeles por transferencia de memoria y devuelve texto localmente. Se termina al completar, fallar, cancelar, limpiar, cambiar de entrada o salir. ImageBitmap se cierra y los canvas temporales se vacían; las URL blob de descarga se revocan usando la utilidad compartida.

`pagehide` y `pageshow` limpian campos, contraseña, resultado y recursos. Se borran también valores de los controles nativos y se desactiva autocompletado para impedir que el historial del navegador restaure texto al margen de React, incluyendo BFCache. La limpieza no borra archivos descargados ni el portapapeles del sistema. JavaScript no garantiza borrado físico de todas las copias en memoria.

La copia entrega el contenido exacto a `navigator.clipboard.writeText`; Windows puede normalizar finales LF a CRLF al leer después el portapapeles. El payload QR y las descargas no se cambian por esa normalización.

Servir la aplicación y cargar sus chunks produce solicitudes con recursos estáticos. Abrir un enlace es una acción explícita que visita otro sitio; el lector no lo visita al decodificar. No se anuncia funcionamiento sin conexión.

## Pruebas y mediciones

`node --experimental-strip-types --test tests/qr.test.mjs`: cinco pruebas aprobadas. Incluyen relectura independiente del SVG rasterizado con jsQR para texto Unicode, emoji, CRLF/LF, caracteres de markup, URL, Wi-Fi y contacto; capacidad exacta 2.331 bytes (versión 40); rechazo del exceso y Unicode incompleto; escapes/inyección; plegado vCard; URL y cabeceras/límites PNG/JPEG/WebP. Lint específico aprobado.

Mediciones locales en Node 22.21: generación del máximo, SVG y lectura independiente en 118 ms con lienzo RGBA de 4.928.400 bytes; lectura de ese mismo QR centrado en una imagen de 2048 × 2048 en 236 ms, con 16.777.216 bytes de píxeles RGBA. Son mediciones de esta máquina, no promesas de tiempo ni mediciones completas de memoria: el decodificador y los archivos añaden asignaciones. La lectura ocurre fuera del hilo principal y su límite protege la carga admitida.

`tests/qr-browser.test.mjs` usa `QR_TEST_URL` o `NEW_TOOLS_TEST_URL` para la URL base. Cubre PNG descargado y decodificado, SVG, escritura exacta de clipboard, lectura con Worker, imagen sin QR, exceso de dimensiones antes de descomprimir, escapes Wi-Fi, limpieza, BFCache/historial, solicitudes/consola/storage sin contenidos sintéticos, teclado y desbordamiento a 320 píxeles. La primera ejecución de navegador fue aprobada por el agente integrador. Se amplió después la prueba de historial para verificar también el valor nativo del editor de texto y los campos Wi-Fi vacíos; la repetición sobre el build final y revisión visual se registran por el agente integrador.

## Archivos

Verificación final del coordinador: flujo de navegador aprobado sobre el build final y en la página oficial, incluyendo regreso por historial con texto y campos Wi-Fi vacíos. Revisión visual móvil en ambos temas y las cuatro pruebas de integración compartida aprobadas localmente y en producción. Lint, TypeScript y build del proyecto pasan. Cloudflare confirmó el despliegue del commit `b63011f`; véase el [registro](../historial/REGISTRO_DESPLIEGUE.md).

`app/herramientas/qr/page.tsx`, `components/qr-workshop.tsx`, `lib/qr.ts`, `lib/qr-reader.worker.ts`, `tests/qr.test.mjs`, `tests/qr-browser.test.mjs`, `public/qr-licenses.txt`, esta nota y las dependencias en `package.json`/`package-lock.json`. El agente integrador mantiene catálogo, navegación y documentación común.
