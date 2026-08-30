# 📋 Registro de Despliegue y Modificaciones del Proyecto

**Proyecto:** Herramientas Web (utilidades para imágenes, PDF y metadatos)  
**Fecha de Despliegue:** 29 de Agosto de 2026  
**URL de Producción Activa:** [https://herramientas.enrique-lazaro-dulktravor.workers.dev/](https://herramientas.enrique-lazaro-dulktravor.workers.dev/)  
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
