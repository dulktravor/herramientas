# 📋 Registro de Despliegue y Modificaciones del Proyecto

**Proyecto:** CeroNube (utilidades privadas para imágenes, PDF y datos)

**Primera publicación registrada:** 29 de agosto de 2026

**Última actualización de producto:** 30 de agosto de 2026

**URL histórica de producción en Cloudflare Workers:** [https://herramientas.enrique-lazaro-dulktravor.workers.dev/](https://herramientas.enrique-lazaro-dulktravor.workers.dev/)
**Repositorio GitHub:** [https://github.com/dulktravor/herramientas](https://github.com/dulktravor/herramientas)  

---

## 1. 📂 Archivos Modificados / Creados

### `package.json`
- **Modificación:** Se añadió el script de despliegue `"deploy"` en la sección `"scripts"`.
- **Líneas añadidas:**
  ```json
  "scripts": {
    "dev": "vinext dev",
    "build": "vinext build",
    "start": "wrangler dev --config dist/server/wrangler.json",
    "deploy": "wrangler deploy --config dist/server/wrangler.json",
    "lint": "oxlint",
    "format": "oxfmt"
  }
  ```
- **Motivo:** Facilitar la ejecución de despliegues directos hacia Cloudflare Workers usando la configuración generada por Vinext (`dist/server/wrangler.json`).

### `REGISTRO_DESPLIEGUE.md`
- **Archivo Nuevo:** Este documento con la bitácora completa de cambios, arquitectura y pasos tomados.

---

## 2. 🛠️ Acciones Tomadas en el Entorno Local y Git

1. **Configuración de Seguridad en Git:**
   - Se registró el directorio del proyecto como seguro para resolver problemas de propiedad cruzada en Windows:
     ```bash
     git config --global --add safe.directory C:/Users/User/Downloads/herramientas
     ```
2. **Commit y Renombrado de Rama:**
   - Se añadieron los cambios de `package.json` al historial local:
     ```bash
     git add package.json
     git commit -m "Configurar scripts de despliegue"
     ```
   - Se renombró la rama principal a `main` (estándar de GitHub):
     ```bash
     git branch -M main
     ```
3. **Creación y Publicación del Repositorio en GitHub:**
   - Se creó el repositorio público en GitHub vinculado a la cuenta `@dulktravor` mediante GitHub CLI (`gh`):
     ```bash
     gh repo create herramientas --public --source=. --remote=origin --push
     ```
   - Código subido a: `https://github.com/dulktravor/herramientas.git` (rama `main`).

---

## 3. ☁️ Diagnóstico y Despliegue en Cloudflare

### A. Diagnóstico del Error 404 Inicial en Cloudflare Pages
- **Causa:** El proyecto está construido sobre **Vinext** (Next.js con React Server Components y Server-Side Rendering sobre Vite). Al ejecutar `npm run build`, se generan dos partes:
  1. `dist/server/index.js`: El servidor SSR / Worker.
  2. `dist/client/`: Solo los assets estáticos (CSS, JS cliente, imágenes) **sin un `index.html` estático**.
- Al intentar desplegarlo inicialmente como un sitio Pages puramente estático, Cloudflare Pages buscaba `index.html` en la raíz de `dist/client` y arrojaba error 404.

### B. Solución y Configuración en Cloudflare Workers CI/CD
Se configuró la integración nativa de **Cloudflare Workers con Static Assets** conectada directamente a GitHub:

1. **Conexión:** Cloudflare Dashboard > `Workers & Pages` > `Create application` > `Workers` > `Continue with GitHub` > Selección del repositorio `dulktravor/herramientas`.
2. **Parámetros de Build & Deploy configurados:**
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy --config dist/server/wrangler.json`
   - **Non-production branch deploy command:** `npx wrangler versions upload --config dist/server/wrangler.json`
   - **Root directory:** `/`
3. **Resultado:**
   - Cloudflare compila el servidor SSR (`dist/server/index.js`) y sube los 41 activos estáticos del cliente (`dist/client`).
   - El Worker se encuentra activo en producción en:
     👉 **[https://herramientas.enrique-lazaro-dulktravor.workers.dev/](https://herramientas.enrique-lazaro-dulktravor.workers.dev/)**

---

## 4. 🔄 Flujo de Actualización Continua (CI/CD)

Cualquier cambio futuro que realices en el código local solo requiere:
```bash
git add .
git commit -m "Descripción de tus cambios"
git push origin main
```
Cloudflare detectará automáticamente el `push`, compilará y actualizará el sitio en producción sin necesidad de intervención manual.

---

## 5. 🚀 Fase 3 — Nuevas herramientas

Se amplió la colección de tres a seis herramientas disponibles, manteniendo el procesamiento local como principio principal.

### Imagen a texto (OCR)
- Nueva ruta: `/herramientas/ocr`.
- Reconocimiento de texto en español, inglés o ambos idiomas.
- Indicador de progreso, cancelación, edición del resultado, copia y descarga en TXT.
- La imagen permanece en el navegador; solamente se descarga el modelo lingüístico requerido.

### Conversor de datos
- Nueva ruta: `/herramientas/datos`.
- Conversión entre JSON, CSV, TSV y XML.
- Detección automática del formato de origen, carga de archivos, pegado directo y vista tabular.
- Copia y descarga del resultado sin enviar los datos a un servidor.

### Escáner a PDF
- Nueva ruta: `/herramientas/escaner`.
- Creación de documentos PDF a partir de hasta 20 fotografías.
- Reordenamiento, rotación, recorte de bordes, mejora de legibilidad y formatos A4, Carta u original.
- Generación y descarga del PDF completamente en el navegador.

### Dependencias y catálogo
- Se incorporó `tesseract.js` como motor OCR ejecutado en un Web Worker.
- Las tres tarjetas que figuraban como “Siguiente etapa” ahora aparecen como “Disponible”.
- El sitio cuenta con siete rutas: la portada y seis herramientas independientes.

---

## 6. 🌱 Fase 4 — Crecimiento, SEO y monetización responsable

### SEO técnico
- Se añadieron `robots.txt` y `sitemap.xml` dinámicos con todas las páginas públicas.
- Cada herramienta tiene URL canónica y metadatos propios.
- La portada incorpora datos estructurados `WebSite` e `ItemList` para describir la colección.
- El dominio de producción actual se utiliza como origen predeterminado y puede sustituirse con `NEXT_PUBLIC_SITE_URL`.

### Monetización preparada, pero desactivada
- Se creó un componente reutilizable para anuncios AdSense responsivos y horizontales.
- Solo existe un espacio después del catálogo y otro después del contenido de cada herramienta; nunca se superpone a controles, cargas o descargas.
- Los anuncios no se renderizan si faltan el identificador del editor y los identificadores de bloque.
- La ruta `/ads.txt` se genera automáticamente con el editor configurado y no publica identificadores ficticios.

### Privacidad y consentimiento
- Se añadió una elección entre tecnologías esenciales y servicios opcionales.
- Cloudflare Web Analytics y Google AdSense solo se cargan desde el sitio después de aceptar las opciones.
- La preferencia se conserva en el navegador y puede revisarse desde la política de privacidad.

### Contenido institucional
- Nueva página `/privacidad` con detalles sobre procesamiento local, infraestructura y servicios opcionales.
- Nueva página `/terminos` con condiciones de uso y límites de responsabilidad.
- Nueva página `/acerca-de` con los principios del proyecto y el modelo de sostenibilidad.
- La navegación legal se comparte entre la portada, las herramientas y las páginas informativas.

### Variables preparadas
```env
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_HOME_SLOT=
NEXT_PUBLIC_ADSENSE_TOOL_SLOT=
NEXT_PUBLIC_CONTACT_EMAIL=
```

---

## 7. 🎨 Fase 5 — Rebranding integral a CeroNube

### A. Diagnóstico de la identidad anterior

La primera versión utilizaba el nombre genérico **“Herramientas”**. Aunque describía correctamente el contenido, presentaba varias limitaciones para construir reconocimiento:

- Era difícil de recordar y diferenciar en búsquedas y redes sociales.
- El icono de destellos de la navegación no expresaba archivos, procesamiento local ni privacidad.
- Existían tres lenguajes visuales diferentes: favicon azul, icono de aplicación verde e imagen Open Graph geométrica.
- El producto tenía una propuesta técnica clara, pero no una frase de marca breve y repetible.

Después de estudiar el catálogo, la arquitectura y la propuesta de privacidad se eligió **CeroNube** como nueva marca. El nombre convierte el procesamiento local en una promesa reconocible: los archivos se resuelven en el dispositivo sin cargarlos innecesariamente a un servidor.

### B. Posicionamiento y mensajes

Se estableció el siguiente sistema verbal:

- **Marca:** CeroNube.
- **Mensaje principal:** “Resuelve aquí. No subas nada.”
- **Descriptor:** “Utilidades privadas para imágenes, PDF y datos”.
- **Promesa funcional:** procesamiento local, cero cuentas obligatorias y recorrido directo al resultado.

La portada dejó de presentar solamente una colección genérica y pasó a comunicar desde el primer bloque la diferencia central del producto. También se incorporaron indicadores resumidos de seis utilidades, cero cuentas y procesamiento local por defecto.

### C. Sistema de identidad visual

Se diseñó un símbolo propio que combina:

- Una ventana de navegador como límite local.
- Un archivo en movimiento como representación de la tarea.
- Tres puntos de interfaz y líneas de velocidad.
- Un contenedor redondeado que mantiene legibilidad en avatares y tamaños pequeños.

La paleta principal quedó definida así:

| Función | Color | Uso |
| --- | --- | --- |
| Petróleo de marca | `#083F43` | Símbolo, bloques institucionales y firma visual |
| Cian | `#1EC8C8` / `#4BD8D3` | Acciones, estados activos y énfasis |
| Arena | `#F4EAD7` | Texto cálido y fondos de contraste |
| Mandarina | `#FF8A3D` | Acentos puntuales y movimiento |

Se crearon y unificaron los siguientes activos:

- `components/brand-logo.tsx`: logotipo y símbolo vectorial reutilizable dentro de React.
- `public/ceronube-mark.svg`: símbolo independiente para usos externos.
- `public/favicon.svg`: favicon coherente con la nueva identidad.
- `app/icon.svg`: icono de aplicación de mayor resolución.
- `public/og.png`: tarjeta social con el nombre y el mensaje de CeroNube.
- `branding/PROPUESTAS_DE_MARCA.md`: diagnóstico, posicionamiento y decisiones de marca.
- `branding/cero-nube-concepto.png`: tablero conceptual utilizado como referencia inicial.

### D. Rediseño de la portada

La portada `app/page.tsx` fue reorganizada y refinada sin alterar las funciones existentes:

- Navegación con el logotipo CeroNube y llamada directa al catálogo.
- Hero con el mensaje “Resuelve aquí. No subas nada.”
- Resumen visual de número de utilidades, ausencia de cuentas y procesamiento local.
- Buscador y filtros conservados como acceso principal al producto.
- Tarjetas con colores diferenciados para imagen, PDF y datos.
- Indicadores “Se procesa aquí” y “Sin registro” en cada utilidad.
- Sección de privacidad convertida en un bloque institucional de marca.
- Flujo de tres pasos presentado mediante tarjetas claras y consistentes.
- Cierre de página actualizado con una llamada a elegir una herramienta.

### E. Aplicación universal de la marca

Los componentes compartidos se actualizaron para evitar diferencias entre rutas:

- `components/tool-page-shell.tsx`: nueva cabecera, logotipo, mensaje de procesamiento en el dispositivo y navegación adaptable.
- `components/content-page-shell.tsx`: identidad compartida en privacidad, términos y acerca de.
- `components/site-footer.tsx`: firma institucional, descriptor, enlaces y mensaje de marca.
- `components/tool-directory.tsx`: nuevo tratamiento visual de búsqueda, filtros, categorías y tarjetas.
- `lib/site.ts`: constantes centralizadas para nombre, descripción y lema.

Las seis páginas de herramientas mantienen sus flujos y procesamiento originales. Solamente se ajustaron la presentación común y los metadatos.

### F. Metadatos y presencia social

En `app/layout.tsx` se sustituyeron el nombre genérico y las descripciones anteriores por la identidad CeroNube:

- Nombre de aplicación y plantilla de títulos.
- Descripción global.
- Títulos Open Graph y X/Twitter.
- Texto alternativo de la imagen social.
- Tarjeta `public/og.png` de 1733 × 917 píxeles.

Las páginas individuales de imágenes, PDF, metadatos, OCR, datos y escáner recibieron títulos y descripciones sociales específicos. Se vaciaron las imágenes heredadas en esas rutas para evitar mostrar una tarjeta genérica que no representa el contenido concreto de cada herramienta.

### G. Contenido institucional

Se actualizaron `/acerca-de` y `/privacidad` para nombrar correctamente a CeroNube y explicar la promesa local con un lenguaje coherente. Los términos funcionales y legales no se modificaron más allá de los ajustes necesarios de identidad.

---

## 8. 🌙 Fase 6 — Modo oscuro universal

### A. Comportamiento del selector

Se añadió `components/theme-toggle.tsx` y se colocó el control en:

- La portada.
- Las seis páginas de herramientas.
- Las páginas de privacidad, términos y acerca de.

El selector funciona de forma universal mediante la clase `dark` en el elemento raíz. La preferencia se guarda en `localStorage` bajo la clave `ceronube-theme`.

Cuando una persona visita el sitio por primera vez y todavía no ha elegido un tema, se respeta `prefers-color-scheme` del sistema operativo. Un script pequeño en `app/layout.tsx` aplica la preferencia antes de pintar la interfaz para evitar un destello del tema incorrecto durante la carga.

### B. Revisión del primer tema oscuro

La primera propuesta oscura utilizaba superficies petróleo (`#052B2D` y `#0A383B`). Después de revisarla en contexto se determinó que se percibía como una variante verde del tema claro, no como un modo oscuro auténtico.

Se corrigió el sistema reservando el color de marca para acentos y utilizando superficies neutrales:

| Token oscuro | Color final | Función |
| --- | --- | --- |
| Fondo | `#090C10` | Superficie general casi negra |
| Tarjetas | `#12171E` | Contenedores principales |
| Popovers | `#141A22` | Menús y superficies flotantes |
| Secundario | `#1A222B` | Controles y agrupaciones |
| Bordes | `#29323D` | Separación sin dominante verde |
| Texto | `#F1EDE5` | Lectura principal cálida |
| Texto secundario | `#9AA5AF` | Jerarquía y ayuda |
| Acento activo | `#4BD8D3` | Acciones y estados de marca |

También se realizaron estos ajustes:

- Se redujo el brillo cian del hero.
- Los bloques grandes de privacidad y cierre utilizan gris carbón en modo oscuro.
- Las tarjetas de confianza dejaron de usar fondos verdes.
- Los iconos de categorías tienen variantes específicas para fondos oscuros.
- El logotipo conserva sus colores como firma puntual, no como color dominante de la interfaz.
- El selector y los botones de retorno se adaptaron a pantallas pequeñas para evitar desbordamientos.
- Se declaró `color-scheme` para que controles nativos y comportamiento del navegador coincidan con el tema.

---

## 9. 📂 Resumen de archivos de la actualización CeroNube

### Archivos creados

- `components/brand-logo.tsx`
- `components/theme-toggle.tsx`
- `public/ceronube-mark.svg`
- `GUIA_DESPLIEGUE_ACTUALIZACIONES.md`
- `branding/PROPUESTAS_DE_MARCA.md`
- `branding/archivo-claro-concepto.png`
- `branding/listo-kit-concepto.png`
- `branding/cero-nube-concepto.png`

### Archivos modificados

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/icon.svg`
- `app/acerca-de/page.tsx`
- `app/privacidad/page.tsx`
- Las seis páginas bajo `app/herramientas/`
- `components/tool-page-shell.tsx`
- `components/content-page-shell.tsx`
- `components/site-footer.tsx`
- `components/tool-directory.tsx`
- `lib/site.ts`
- `public/favicon.svg`
- `public/og.png`
- `REGISTRO_DESPLIEGUE.md`

No se modificó la lógica de procesamiento de imágenes, PDF, OCR, metadatos, escaneo o conversión de datos.

---

## 10. ✅ Validaciones previas a la publicación del 30 de agosto de 2026

Antes de solicitar el despliegue se realizaron las siguientes comprobaciones:

- `npm run lint`: finalizado sin errores.
- `npm run build`: compilación completa de Vinext finalizada correctamente.
- Las diez rutas públicas respondieron con estado HTTP 200:
  - `/`
  - `/acerca-de`
  - `/privacidad`
  - `/terminos`
  - `/herramientas/imagenes`
  - `/herramientas/pdf`
  - `/herramientas/metadatos`
  - `/herramientas/ocr`
  - `/herramientas/datos`
  - `/herramientas/escaner`
- El selector de tema está presente en todas las rutas públicas.
- La imagen Open Graph fue inspeccionada para confirmar el nombre y el mensaje exactos.
- `git diff --check` no detectó errores de espacios en blanco; los avisos observados corresponden únicamente a la conversión normal LF/CRLF de Git en Windows.

---

## 11. ☁️ Publicación de la versión CeroNube

### Infraestructura aplicable

El procedimiento correcto para este repositorio es el descrito en `GUIA_DESPLIEGUE_ACTUALIZACIONES.md`:

1. Validación local con lint, build y pruebas representativas.
2. Creación de un commit en la rama `main`.
3. Envío del commit a `origin/main` en GitHub.
4. Inicio automático de la integración GitHub → Cloudflare Workers.
5. Compilación y despliegue en Cloudflare mediante `dist/server/wrangler.json`.
6. Comprobación de la versión publicada en la URL del Worker.

La presencia de `.openai/hosting.json` no sustituye la infraestructura de producción ya configurada. CeroNube continúa alojado como un Worker de Cloudflare con Static Assets y renderizado Vinext.

### Versión: 2026-08-30 — identidad CeroNube y modo oscuro

- **Commit de producto:** `319aad8` (`feat: renovar identidad CeroNube y modo oscuro`).
- **Tipo:** identidad, diseño, accesibilidad, SEO y documentación.
- **Cambios:** rebranding completo a CeroNube, nuevo logotipo, portada rediseñada, navegación unificada, metadatos sociales, favicon, imagen Open Graph y modo oscuro universal con superficies neutrales.
- **Variables modificadas:** ninguna.
- **Validaciones:** lint, build, comprobación HTTP de rutas públicas, presencia universal del selector de tema y revisión de activos sociales.
- **Despliegue:** automático mediante GitHub → Cloudflare Workers.
- **Resultado:** correcto. Cloudflare publicó la nueva identidad y la URL pública devolvió la portada CeroNube.
- **URL verificada:** [https://herramientas.enrique-lazaro-dulktravor.workers.dev/](https://herramientas.enrique-lazaro-dulktravor.workers.dev/).
- **Verificación posterior:** portada, páginas institucionales, seis herramientas, `robots.txt`, `sitemap.xml` y `ads.txt` respondieron con HTTP 200; la portada publicada contiene la marca CeroNube y el selector de tema.
- **Observaciones:** no se modificó la lógica interna de las seis herramientas ni se publicaron secretos o variables de entorno.

---

## Versión: 2026-08-31 — Estudio de audio local

- **Commit de producto:** `da78af1` (`feat: añadir estudio de audio local`).
- **Tipo:** función, privacidad, accesibilidad y SEO.
- **Cambios:** nueva herramienta para cargar, visualizar, recortar, reordenar, unir, normalizar y ajustar pistas de audio; permite modificar volumen, velocidad y fundidos, previsualizar el resultado y descargarlo como WAV sin enviar archivos al servidor. También se integró la categoría Audio en la portada, el directorio y el sitemap.
- **Variables modificadas:** ninguna.
- **Validaciones:** `npm run lint`, `npm run build`, `git diff --check`, carga y procesamiento de un WAV válido, rechazo de un archivo incompatible y comprobación HTTP de portada, herramienta, privacidad, `robots.txt`, `sitemap.xml` y `ads.txt`.
- **Despliegue:** automático mediante GitHub → Cloudflare Workers.
- **Resultado:** correcto. Las comprobaciones de Cloudflare Workers y Cloudflare Pages finalizaron satisfactoriamente para el commit de producto.
- **URL verificada:** [https://herramientas.enrique-lazaro-dulktravor.workers.dev/herramientas/audio](https://herramientas.enrique-lazaro-dulktravor.workers.dev/herramientas/audio).
- **Verificación posterior:** la ruta pública respondió con HTTP 200, mostró el Estudio de audio y procesó correctamente un WAV mono de prueba, generando una previsualización y un archivo WAV descargable.
- **Observaciones:** esta primera versión utiliza Web Audio API y exporta WAV PCM de 16 bits; las conversiones avanzadas a otros formatos quedan pendientes de integrar mediante un motor opcional cargado bajo demanda.

---

## Versión: 2026-09-01 — Estudio MIDI interactivo

- **Commits de producto:** `9352b0b` (`feat: añadir estudio MIDI interactivo`) y `e75a296` (`fix: cargar ONNX bajo demanda`).
- **Tipo:** función, inteligencia artificial, privacidad, accesibilidad y SEO.
- **Cambios:** nueva herramienta para importar, reproducir, editar y exportar archivos MIDI multipista; piano-roll con edición nota a nota, cuantización, deshacer y rehacer; piano virtual controlable con ratón, pantalla táctil y teclado; grabación en la pista activa; cuatro sonidos de piano y cinco instrumentos adicionales. Se añadió Piano Transcription (ByteDance) como módulo opcional para convertir audio de piano en una pista MIDI editable mediante inferencia ONNX local.
- **Variables modificadas:** ninguna.
- **Validaciones:** `npm run lint`, `npm run build`, `git diff --check`, ida y vuelta de un archivo MIDI en memoria, importación válida e inválida, exportación, edición en el piano-roll, piano virtual, herramienta WebMCP y comprobación HTTP de portada, herramienta MIDI, `robots.txt`, `sitemap.xml` y `ads.txt`.
- **Despliegue:** automático mediante GitHub → Cloudflare Workers.
- **Resultado:** correcto. El primer intento detectó que el WASM incluido de ONNX Runtime excedía el límite de 25 MiB por activo de Cloudflare; se corrigió cargando el runtime bajo demanda y el despliegue posterior finalizó satisfactoriamente.
- **URL verificada:** [https://herramientas.enrique-lazaro-dulktravor.workers.dev/herramientas/midi](https://herramientas.enrique-lazaro-dulktravor.workers.dev/herramientas/midi).
- **Verificación posterior:** la portada, la ruta MIDI y los archivos públicos de SEO respondieron con HTTP 200; en producción se comprobó el piano virtual, el editor y la pestaña de transcripción. El artefacto estático más grande quedó en 1,27 MiB.
- **Observaciones:** la transcripción descarga el runtime desde jsDelivr y los pesos ONNX desde Hugging Face solo al primer uso; el audio se procesa en el navegador y no se envía a CeroNube. El modelo original corresponde a ByteDance y los pesos convertidos se atribuyen bajo CC BY 4.0.

---

## Versión: 2026-09-01 — Taller de vídeo con FFmpeg WASM

- **Commit de producto:** `feat: implementar taller de video con motor FFmpeg WASM local`
- **Tipo:** función, multimedia, privacidad, accesibilidad y SEO.
- **Cambios:** nueva herramienta para abrir MP4, WebM, MOV, MKV y AVI; recorte preciso con validación de rangos, cambio de relación de aspecto (16:9, 9:16 Shorts/TikTok, 1:1, 4:3), modo de encuadre (bandas/rellenar), escalado de resolución (1080p, 720p, 480p, 360p), velocidad (0.25x a 2x), FPS configurables, silenciado y mezcla/reemplazo de pista de audio externa, extracción de audio en MP3, WAV y OGG, conversión de vídeo a GIF animado mediante doble paso (palettegen/paletteuse), incrustación de subtítulos SRT/VTT, captura de fotogramas PNG y cancelación abortable sin fugas de memoria. Se integró la categoría Vídeo en DESIGN.md, portada, directorio y sitemap.
- **Variables modificadas:** ninguna.
- **Validaciones:** `npm run lint` (0 errores, 0 avisos), `npx tsc --noEmit` (0 errores), `npm run build` (compilación exitosa), pruebas unitarias de subtítulos y dimensiones, pruebas funcionales locales de conversión, recorte, audio y GIF.
- **Despliegue:** automático mediante GitHub → Cloudflare Workers.
- **Resultado:** correcto. Cloudflare compila y publica el Worker con Static Assets.
- **URL verificada:** [https://herramientas.enrique-lazaro-dulktravor.workers.dev/herramientas/video](https://herramientas.enrique-lazaro-dulktravor.workers.dev/herramientas/video).
- **Observaciones:** el motor FFmpeg WASM se descarga bajo demanda desde jsDelivr y se ejecuta localmente en memoria del navegador; los archivos del usuario nunca salen del dispositivo.

