# CeroNube

Utilidades para archivos que trabajan en el navegador, sin cuentas obligatorias ni subir el contenido para procesarlo.

- [Página oficial](https://herramientas.enrique-lazaro-dulktravor.workers.dev/)
- [Repositorio](https://github.com/dulktravor/herramientas)

## Desarrollo

Node.js >=22.13.0. Instalar con `npm ci` y ejecutar `npm run dev`.

Validar con `npm run lint`, `npx tsc --noEmit`, `npm run build` y `git diff --check`.

Pruebas de algoritmos: `node --experimental-strip-types --test tests/ocr-document.test.mjs tests/perspective.test.mjs tests/font-lab.test.mjs`.

Pruebas de navegador: iniciar el build con `npm start -- --port 3000` y ejecutar `npx playwright test tests/document-tools.test.mjs tests/epub.test.mjs --workers=1 --reporter=line --output=work/tests`. `DOCUMENT_TEST_URL` y `EPUB_TEST_URL` permiten elegir el sitio; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selecciona un navegador instalado.

## Documentación vigente

- `DESIGN.md`: identidad, interfaz, accesibilidad y principios de privacidad.
- `GUIA_DESPLIEGUE_ACTUALIZACIONES.md`: publicación GitHub → Cloudflare y verificación.
- `REGISTRO_DESPLIEGUE.md`: historial de versiones y comprobaciones.
- `MEJORAS_HERRAMIENTAS_EXISTENTES.md`: seguimiento de mejoras del catálogo.
- `HERRAMIENTAS_POR_IMPLEMENTAR.md`: catálogo actual y evaluación de propuestas.
- `AUDITORIA_COMPARATIVA.md`: competidores, fuentes y propuestas útiles para el público.
- `AUDITORIA_PROYECTO.md`: alcance, hallazgos técnicos, correcciones y seguimiento.

La fuente del catálogo es `lib/site.ts`. Las variables admitidas están en `.env.example`; no guardar valores secretos en Git. Los resultados personales de `output/`, `tmp/`, `.codex-finalizer/` y `work/` están excluidos de Git y de los analizadores.

## Publicación

La rama `main` activa el despliegue configurado en Cloudflare. Seguir la guía y comprobar la versión pública antes de dar una publicación por terminada.

## Depuración documental del 8 de octubre de 2026

Se retiró `branding/PROPUESTAS_DE_MARCA.md`: era una exploración previa a la elección de CeroNube, duplicaba `DESIGN.md` y describía un catálogo antiguo de seis herramientas. El antecedente sigue en Git y en el registro histórico. Se consolidó la hoja de nuevas herramientas para no presentar audio, vídeo, ZIP, fuentes y EPUB como pendientes. Se conservaron la guía, el diseño y la bitácora porque siguen cumpliendo funciones distintas.
