# N-02 — Limpiar y ordenar texto

Implementación y publicación: 8 de octubre de 2026. El commit de producto `b63011f` se desplegó en Cloudflare y se verificó en la página oficial.

Ruta: `/herramientas/texto`. Componentes: `components/text-workshop.tsx`, `lib/text-tools.ts` y `lib/text.worker.ts`. No se incorporan dependencias nuevas.

## Alcance y reglas

- Entrada por texto pegado o TXT. El TXT importado se muestra como original de solo lectura para no normalizar sus saltos mediante un editor HTML. Se puede reemplazar explícitamente con texto pegado.
- Las opciones empiezan desactivadas. Orden fijo de aplicación: espacios repetidos, mayúsculas/minúsculas, líneas vacías, duplicados y orden.
- Espacios: convierte cada grupo de dos o más espacios ASCII/tabulaciones en un espacio ASCII. Conserva extremos, tabulaciones aisladas y otros espacios Unicode.
- Líneas vacías: elimina líneas vacías o compuestas solo por espacios Unicode. Conserva la presencia de un salto final si queda texto.
- Duplicados: coincidencia exacta o comparación ignorando espacios externos y mayúsculas españolas. Conserva siempre la primera línea, sus espacios y tildes. No normaliza formas Unicode ni elimina acentos.
- Orden: `Intl.Collator('es', { sensitivity: 'variant', numeric })`, alfabético o natural, ascendente o descendente. Las equivalencias conservan su orden previo. Depende de las reglas de internacionalización del navegador.
- Saltos: sin opciones se conserva exactamente la entrada. Al ordenar se conserva el patrón de separadores por posición; al quitar líneas, los separadores de las retenidas. Mantiene LF, CRLF y CR, además del salto final cuando queda contenido.
- Conteo: puntos de código Unicode, incluidos espacios y saltos; no es un conteo de grafemas visuales. CRLF cuenta como dos caracteres. Palabras son grupos de letras/números con marcas combinantes y apóstrofes internos. La última línea vacía tras un salto cuenta como línea; texto vacío tiene cero.

## Codificación, exportación y privacidad

Lectura automática: BOM de UTF-8/UTF-16 LE/UTF-16 BE; sin BOM, UTF-8 estricto. También se puede elegir manualmente la codificación conocida, incluido Windows-1252. Una incompatibilidad de BOM se rechaza. `TextDecoder` usa `fatal: true`; no se reemplazan silenciosamente secuencias inválidas. Se rechazan bytes nulos en archivos, UTF-16 incompleto y pares sustitutos incompletos en textos. Un U+FFFD realmente presente en un UTF-8 válido se conserva.

Descarga: UTF-8 sin BOM, construido desde bytes explícitos del resultado completo. Copia: entrega exactamente ese resultado a `navigator.clipboard.writeText`; el sistema puede adaptar los saltos de línea al recuperar o pegar el contenido. La interfaz explica esta limitación. Ninguna transformación requiere una petición con el contenido.

Entrada, resultado y hasta cinco versiones para deshacer viven solo en memoria. Limpiar borra todos estos estados y restablece opciones. Al salir se termina el Worker y se borra el estado; `pagehide` y todos los eventos `pageshow` cubren restauraciones mediante BFCache y los valores de formulario que el navegador restaura fuera de React. El editor se borra inmediatamente y los controles se remontan al limpiar. El listener `pagehide` sincroniza el borrado con React antes de que se congele la página. Todas las URLs temporales de descarga se revocan al limpiar o salir. No se borra el portapapeles del sistema. La integración compartida debe excluir publicidad y analítica de esta ruta para evitar acceso de scripts opcionales al texto.

## Límites y medición

Límite inicial conservador: TXT de hasta 1 MiB (1.048.576 bytes), texto decodificado/pegado y resultado de hasta 1 MiB UTF-8, y hasta 50.000 líneas, incluida la última vacía cuando existe. Un resultado que expanda el tamaño fuera de límite se rechaza sin sustituir la entrada.

La lectura, decodificación, conteo y transformación se ejecutan en un Worker terminable. La vista se limita a los primeros 20.000 caracteres UTF-16 sin cortar pares sustitutos; copiar/descargar opera sobre todo el resultado. Las entradas grandes se presentan como vista de solo lectura, con reemplazo explícito.

Prueba medida el 8 de octubre de 2026 en Node 22.21.0: 1 MiB y 50.000 líneas, con reducción de espacios, duplicados exactos, orden natural y estadísticas de original/resultado: aproximadamente 82 ms para el algoritmo (sin inferir ese tiempo para otros equipos o navegadores). La suite del navegador cubre procesamiento de 1 MiB en Worker y actividad del hilo principal. El límite no afirma un máximo técnico universal.

## Validación

- `node --experimental-strip-types --test tests/text-tools.test.mjs`: diez casos sobre Unicode, tildes/ñ, emoji, tabulaciones, finales mixtos, identidad exacta, codificaciones, duplicados, orden, tamaños y previsualización.
- `tests/text-browser.test.mjs`: flujo de TXT, resultado antes de reemplazar, copia exacta al API del portapapeles, descarga byte por byte, deshacer/limpiar, errores de codificación/límite, cancelación del Worker, BFCache, móvil y oscuro. URL configurable mediante `TEXT_TEST_URL`; ejecutable mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
- TSC y oxlint de los archivos nuevos sin errores.
- Verificación final del coordinador: cinco de cinco pruebas de navegador aprobadas localmente y en producción después de incorporar borrado síncrono antes de BFCache y revocación de URLs temporales; cuatro pruebas de integración compartida aprobadas también en ambos entornos. Lint, TypeScript y build completos pasan. Revisión visual móvil realizada en ambos temas; publicación verificada en el [registro](../historial/REGISTRO_DESPLIEGUE.md).

No se afirma funcionamiento sin conexión: el navegador necesita cargar previamente la página, sus recursos y el módulo Worker. No hay guardado automático ni recuperación de una sesión al volver.
