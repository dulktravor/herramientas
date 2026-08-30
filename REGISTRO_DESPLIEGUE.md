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
