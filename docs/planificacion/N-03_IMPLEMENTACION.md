# N-03 · Generar contraseñas y frases

Fecha: 8 de octubre de 2026. Implementada, revisada conjuntamente y comprobada localmente y en la página oficial. Commit de producto `b63011f`, desplegado correctamente en Cloudflare.

## Alcance entregado

Ruta `/herramientas/contrasenas`. Dos modos: contraseña con longitud y grupos visibles; frase con cantidad de palabras y separador. El resultado se oculta inicialmente, se muestra u oculta por acción y se copia únicamente al pulsar Copiar. Regenerar reemplaza el único resultado. Cambiar preferencias, cambiar modo, limpiar, desmontar la herramienta o el evento `pagehide` vacían el campo.

El secreto se mantiene en el valor del campo DOM actual, no en estados React o historial. No se guarda en URL, cookies, almacenamiento persistente, eventos de medición, consola ni solicitudes de transformación. La copia usa Clipboard API y explica la denegación de permisos. El portapapeles y su historial pertenecen al sistema; limpiarlos no forma parte de Limpiar sesión. Eliminar referencias y vaciar el campo no garantiza borrado forense de cadenas de JavaScript o memoria administrada por el navegador.

## Aleatoriedad y opciones

La única fuente de producción es `crypto.getRandomValues`; no existe alternativa con generación débil. Si la API falta, arroja un error o no produce muestras válidas, la operación se detiene con un mensaje fijo sin propagar detalles internos. Las pruebas pueden inyectar una fuente sintética.

Para seleccionar un índice de tamaño `n`, se rechazan enteros de 32 bits mayores o iguales a `2^32 - (2^32 % n)` antes de aplicar el módulo. Se utiliza un buffer de 128 enteros de 32 bits (512 bytes), menor que la cuota de Web Crypto; los enteros consumidos y los buffers al terminar o fallar se ponen a cero. El muestreo tiene un límite de 128 rechazos consecutivos para evitar bloqueos por una fuente defectuosa.

Contraseñas: de 4 a 128 caracteres enteros. Grupos ASCII de minúsculas, mayúsculas, números y 23 símbolos visibles en la interfaz. Al menos un grupo; cada grupo seleccionado debe aparecer. Se generan candidatos completos uniformes sobre el alfabeto elegido y se rechazan aquellos que no cubren todos los grupos. La distribución de los resultados válidos es uniforme. Tras 4.096 candidatos fallidos se devuelve un error; nunca se añade un carácter obligatorio, cambia la longitud o amplía el alfabeto silenciosamente. La ayuda recomienda 12 o más caracteres para uso habitual, sin prometer invulnerabilidad.

Frases: de 6 a 12 entradas, selección independiente con reemplazo y separadores fijos visibles (guion, espacio, guion bajo o punto). Las repeticiones son válidas. El mínimo coincide con la recomendación de la fuente del diccionario. No se incluye medidor genérico de seguridad ni estimación de tiempo de ataque.

## Diccionario y dependencias

Lista EFF Long Wordlist, Joseph Bonneau / Electronic Frontier Foundation: 7.776 entradas distintas en inglés, ASCII minúsculo, de 3 a 9 caracteres. Incluye `drop-down`, `felt-tip`, `t-shirt` y `yo-yo`, que conservan su guion aun si se elige otro separador. Retirados únicamente los números de dados; conservadas todas las entradas y su orden. La lista se encapsula en TypeScript inmutable y se incluye en el módulo de la página. No se consulta EFF durante generación.

Licencia CC BY 4.0 verificada en la política oficial de EFF el 8 de octubre de 2026. Atribución, cambios y fuentes en `lib/passphrase-wordlist.LICENSE.md`; texto legal íntegro conservado en `lib/passphrase-wordlist.LICENSE.txt`, obtenido de Creative Commons. Atribución y enlace de licencia también en la interfaz. No se añaden dependencias de paquete. El módulo de palabras ocupa 62.352 bytes de fuente y 25.020 bytes con gzip local; el peso real de red depende del build y la plataforma.

Fuentes primarias:

- [EFF: lista y recomendación de seis palabras](https://www.eff.org/dice).
- [Lista original](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt).
- [Política de copyright y licencia EFF](https://www.eff.org/copyright).
- [Licencia CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
- [Contrato `getRandomValues` de Web Cryptography](https://www.w3.org/TR/webcrypto/#Crypto-method-getRandomValues).

## Evidencia local

- `node --experimental-strip-types --test tests/password.test.mjs`: 10 pruebas, todas correctas. Comprueban las 15 combinaciones no vacías de grupos en longitudes 4, 12, 20 y 128; opciones inválidas; descarte del residuo que introduciría sesgo; rechazo completo de candidatos sin cobertura; fallos de Crypto; límites de una fuente defectuosa; puesta a cero de buffers; composición e integridad del diccionario; todas las cantidades y separadores con fuente determinista; preservación de los cuatro compuestos con cualquier separador; ausencia de generación débil, persistencia y red en los archivos del generador.
- `npx oxlint --type-aware ...`: pasa sobre página, componente, dos módulos de generación y ambas suites. La comprobación conjunta de TypeScript y build corresponde a la integración del agente coordinador.
- Medición Node 22.21.0 en este equipo, 1.000 ejecuciones por extremo con los cuatro grupos: longitud 4, percentil 99 de 0,109 ms y máximo 2,703 ms; longitud 128, percentil 99 de 0,061 ms y máximo 0,184 ms. Son mediciones locales de algoritmo, sin extrapolar a todos los navegadores. Las operaciones acotadas se ejecutan en el hilo principal.
- Suite `tests/password-browser.test.mjs`, variable `PASSWORD_TEST_URL`: generación/copia/regeneración/limpieza con consentimiento opcional aceptado y rechazado; URL, almacenamiento, consola y solicitudes sin secretos; opciones y frases; errores Crypto y portapapeles; teclado, ancho 320 px, ambos temas y retorno tras salir. Ejecutada por el coordinador contra el build conjunto en `http://127.0.0.1:3000` con Chrome instalado: 5 de 5 pruebas correctas. Su comprobación adicional de scripts opcionales aceptados y aislamiento de la ruta también pasa.

La revisión posterior hace deterministas los conteos de frases y prueba los cuatro separadores y `t-shirt` compuesto. Precisa además en la ayuda que cada compuesto cuenta como una palabra. Intentar ejecutar esta versión de la suite cuando el servidor local estaba detenido produjo `ERR_CONNECTION_REFUSED`, antes de cargar la herramienta; queda su repetición a cargo del coordinador tras el rebuild final.

## Integración y límites

Verificación final del coordinador: diez pruebas de algoritmo y cinco de navegador aprobadas tras añadir casos deterministas de los compuestos con guion. Las cinco pruebas de navegador y las cuatro comprobaciones comunes de catálogo, sitemap, aislamiento y temas móviles pasan también en la página oficial. Lint, TypeScript y build completos aprobados. Publicación documentada en el [registro](../historial/REGISTRO_DESPLIEGUE.md).

El coordinador integra catálogo, categoría Utilidades, sitemap y documentación de seguimiento. La protección compartida de rutas sensibles suspende medición/publicidad en esta ruta y recarga un documento limpio si existían scripts opcionales de una navegación previa. Esa protección y su prueba pertenecen a archivos compartidos fuera de la propiedad de este agente.

No se anuncia modo sin conexión. El despliegue público se verificó con Chrome instalado; no se certifican otros navegadores. El diccionario está en inglés, explicitado antes de generar. Se necesita un navegador con Crypto; Clipboard API requiere compatibilidad y contexto permitido. Si copiar falla, el usuario puede mostrar y copiar manualmente. Las pruebas usan datos sintéticos y no credenciales reales.
