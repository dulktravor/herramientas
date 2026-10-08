# CeroNube

Utilidades para archivos que trabajan en el navegador, sin cuentas obligatorias ni subir el contenido para procesarlo.

- [Página oficial](https://herramientas.enrique-lazaro-dulktravor.workers.dev/)
- [Repositorio](https://github.com/dulktravor/herramientas)

## Desarrollo

Node.js >=22.13.0. Instalar con `npm ci` y ejecutar `npm run dev`.

Validar con `npm run lint`, `npx tsc --noEmit`, `npm run build` y `git diff --check`.

Pruebas de algoritmos: `node --experimental-strip-types --test tests/ocr-document.test.mjs tests/perspective.test.mjs tests/font-lab.test.mjs`.

Pruebas de las nuevas utilidades: `node --experimental-strip-types --test tests/qr.test.mjs tests/text-tools.test.mjs tests/password.test.mjs`. Con el build servido en el puerto 3000, ejecutar `npx playwright test tests/text-browser.test.mjs tests/password-browser.test.mjs tests/new-tools-integration.test.mjs --workers=1 --reporter=line --output=work/new-tools-tests`. La prueba QR usa `node --test tests/qr-browser.test.mjs` con `QR_TEST_URL` apuntando al servidor; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permite elegir el navegador en esa suite. N-01 a N-03 están comprobadas localmente y pendientes de publicación.

Pruebas de navegador: iniciar el build con `npm start -- --port 3000` y ejecutar `npx playwright test tests/document-tools.test.mjs tests/epub.test.mjs --workers=1 --reporter=line --output=work/tests`. `DOCUMENT_TEST_URL` y `EPUB_TEST_URL` permiten elegir el sitio; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selecciona un navegador instalado.

## Documentación vigente

La documentación está clasificada en seis tipos de contenido. El [índice documental](docs/README.md) explica qué corresponde a cada carpeta.

- **Diseño:** [identidad, interfaz y privacidad](docs/diseno/DESIGN.md).
- **Operación:** [guía de publicación y verificación](docs/operacion/GUIA_DESPLIEGUE_ACTUALIZACIONES.md).
- **Historial:** [registro de versiones y comprobaciones](docs/historial/REGISTRO_DESPLIEGUE.md).
- **Auditorías:** [proyecto](docs/auditorias/AUDITORIA_PROYECTO.md) y [comparativa de otras páginas](docs/auditorias/AUDITORIA_COMPARATIVA.md).
- **Producto:** [catálogo y condiciones de admisión](docs/producto/HERRAMIENTAS_POR_IMPLEMENTAR.md).
- **Planificación:** [mejoras del catálogo actual](docs/planificacion/MEJORAS_HERRAMIENTAS_EXISTENTES.md) y [diez propuestas de nuevas herramientas](docs/planificacion/PROPUESTAS_NUEVAS_HERRAMIENTAS.md).

La fuente del catálogo es `lib/site.ts`. Las variables admitidas están en `.env.example`; no guardar valores secretos en Git. Los resultados personales de `output/`, `tmp/`, `.codex-finalizer/` y `work/` están excluidos de Git y de los analizadores.

## Publicación

La rama `main` activa el despliegue configurado en Cloudflare. Seguir la guía y comprobar la versión pública antes de dar una publicación por terminada.

## Depuración documental del 8 de octubre de 2026

Se retiró `branding/PROPUESTAS_DE_MARCA.md`: era una exploración previa a la elección de CeroNube, duplicaba [DESIGN.md](docs/diseno/DESIGN.md) y describía un catálogo antiguo de seis herramientas. El antecedente sigue en Git y en el registro histórico. Se consolidó la hoja de nuevas herramientas para no presentar audio, vídeo, ZIP, fuentes y EPUB como pendientes. Se conservaron la guía, el diseño y la bitácora porque siguen cumpliendo funciones distintas.
