# Auditoría del proyecto CeroNube

Fecha: 8 de octubre de 2026. Referencia inicial: `06d1248` en `main` y `origin/main`, más cambios locales sin commit. Repositorio: `dulktravor/herramientas`.

## Resultado

Se identificaron mejoras del escáner y del OCR del 17 de septiembre que permanecían sin publicar. Se completaron pruebas y correcciones antes de preparar el despliegue automático GitHub → Cloudflare. La evidencia definitiva de producción se conserva en `REGISTRO_DESPLIEGUE.md`.

El catálogo tiene 12 herramientas; no se añadieron las candidatas de la investigación como funciones disponibles. `AUDITORIA_COMPARATIVA.md` recoge siete referencias y diez oportunidades nuevas.

## Alcance y límites

Revisión del estado e historial Git, dependencias, configuración de compilación/publicación, documentación propia y catálogo `app/components/lib/hooks/tests`. Lectura estática dirigida de consentimiento/publicidad, vídeo, imágenes, datos, PDF, OCR, perspectiva, fuentes, EPUB, ZIP, metadatos y estructura MIDI. Validación automática completa de TypeScript y lint.

Las pruebas funcionales se concentran en los cambios: escáner, OCR, preferencias, imágenes, datos, PDF y regresiones EPUB/fuentes después de actualizar dependencias. No se afirma haber probado exhaustivamente todos los codecs, dispositivos, navegadores, lectores PDF, acciones MIDI o formatos admitidos. Las pruebas móviles utilizan una ventana Chromium de 390 × 844; no certifican cámara física ni todas las interacciones táctiles. La auditoría externa es documental y no incluye pruebas invasivas ni envío de archivos a terceros.

## Correcciones realizadas

| Hallazgo | Corrección | Evidencia |
| --- | --- | --- |
| OCR y escáner locales sin publicar | Incorporar motores, interfaz, descripciones y pruebas pendientes | Git inicial; pruebas y bitácora |
| Scripts opcionales seguían activos tras revocar permisos | Guardar la elección y recargar el documento al retirar permisos activos | Prueba de preferencias persistentes y ausencia de scripts tras recarga |
| Preferencias iniciales no reflejaban valores guardados tras hidratar | Formularios reiniciados por la configuración efectiva | Prueba con tres preferencias previamente activadas |
| Cancelación OCR dejaba esperando una promesa de reconocimiento | Abortar la espera y terminar el trabajador | OCR real, cancelación y posterior limpieza |
| Rotación automática OCR podía desalinear palabras e imagen del PDF | Giro manual previo; reconocer la imagen preparada sin autorrotación interna | OCR de imágenes/PDF; extracción de texto del PDF exportado |
| Rasterización PDF podía exceder el tamaño máximo por escala mínima | Quitar la escala mínima que ampliaba páginas gigantes | Revisión de cálculo y build |
| Cargas por arrastre podían entrar durante operaciones ocupadas | Guardas de operación en OCR, escáner y organizador PDF | Revisión y flujos automatizados |
| URLs temporales de escáner se conservaban tras error o desmontaje | Revocar URLs creadas en lotes fallidos y previsualizaciones | Inválidos, cambios y navegación móvil |
| FFmpeg no se terminaba realmente | Invocar `terminate()` en la instancia | Revisión de API instalada, lint y build; sin prueba exhaustiva de codecs |
| Resultado de vídeo revocaba una URL nueva en lugar de la utilizada | Limpieza ligada a la URL efectiva del resultado | Revisión de ciclo de vida y build |
| Controles de rótulos de vídeo no se aplicaban al exportar | Retirar controles de texto libre y opciones no aplicadas en la interfaz | Código y build; subtítulos de archivo se conservan |
| Volumen de pista externa de vídeo ignorado | Aplicar filtro de volumen a la pista seleccionada | Revisión de argumentos; pendiente ampliar prueba de audio resultante |
| Imágenes homónimas se sobrescribían en un ZIP | Generar nombres únicos en el archivo comprimido | Dos entradas homónimas; descarga con dos archivos distintos |
| CSV/TSV con encabezados duplicados perdía columnas | Rechazar duplicados y filas con más columnas que encabezados | CSV inválido y conversión válida posteriores |
| PDF de más de 100 páginas renderizaba todas las miniaturas antes del rechazo | Verificar número de páginas antes del bucle y destruir loading task | PDF sintético de 101 páginas rechazado |
| Artefactos ajenos entraban al estado Git y podían inflar análisis | Excluir output, tmp y finalizer de Git; excluir temporales de lint/TypeScript | Git final y validaciones |

## Seguridad de dependencias

El primer `npm audit` devolvió 26 avisos: 3 críticos, 18 altos, 4 moderados y 1 bajo. Se aplicó `npm audit fix` sin `--force` y se actualizó el formateador de desarrollo `oxfmt` a 0.72.0. Se conservaron `package-lock.json` y la instalación reproducible.

Resultado final: **16 avisos: 0 críticos, 13 altos y 3 moderados**. Los avisos restantes se concentran en las cadenas `braces/micromatch/fast-glob` (shadcn y plugins de Vinext), `sharp` (Miniflare/Cloudflare) y `fflate` (satori/@vercel/og). Las recomendaciones automáticas incluyen retroceder Vinext, Wrangler o shadcn a versiones incompatibles; no se forzaron. Esto no demuestra explotación en CeroNube ni permite declarar el proyecto libre de vulnerabilidades. Deben revisarse por cadena y actualizar cuando exista una solución compatible, con pruebas del build y producción.

Fuentes del diagnóstico: `npm audit` del registro npm; ejemplos de avisos [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) y [fflate](https://github.com/advisories/GHSA-px8p-9vwx-vf98). Informes JSON de trabajo excluidos de Git.

## Evidencia de validación

- `npm ci`: instalación reproducible satisfactoria.
- `npm run lint` y `npx tsc --noEmit`: correctos.
- `npm run build`: correcto con dependencias actualizadas. Avisos de imports dinámicos y clasificación de rutas de Vinext sin fallo de compilación.
- 10 pruebas unitarias: perspectiva/detección, estructura OCR, PDF generado y conversiones/subconjuntos de fuentes.
- 9 pruebas de navegador sobre el build: cuatro flujos documentales/regresiones y cinco escenarios EPUB.
- Comprobación adicional del PDF buscable: PDF.js extrae los textos reconocidos en ambas páginas; pasa tras normalizar espacios de posicionamiento.
- OCR real descargando motor/idioma, imágenes y PDF; TXT editado, descarga, cancelación, inválidos y límite de 30 páginas.
- Escáner: cuatro esquinas, teclado, PDF de una y 20 páginas, cancelación, inválidos y previsualización.
- Pantallas móviles oscuras revisadas visualmente sin desbordamiento horizontal.
- Durante los flujos OCR/escáner instrumentados no se detectaron solicitudes POST/PUT/PATCH. Las solicitudes GET de motores/modelos son esperadas; la revisión de código complementa este control, que por sí solo no demuestra ausencia de cualquier forma de exfiltración.

## Purga documental

Retirado `branding/PROPUESTAS_DE_MARCA.md`: propuesta exploratoria posterior reemplazada por `DESIGN.md`, con alternativas de marca ya resueltas y catálogo de seis herramientas obsoleto. Recuperable en Git; las menciones antiguas de la bitácora son históricas.

Consolidado `HERRAMIENTAS_POR_IMPLEMENTAR.md`: catálogo ejecutable actual, criterios obligatorios y antecedentes sin reactivar decisiones descartadas. Añadido `README.md` como índice. Conservados diseño, guía, registro y hoja de mejoras porque tienen usos distintos. No se purgaron Markdown de dependencias ni documentos personales de output/tmp.

## Seguimiento

- Revisar las 16 alertas de dependencias sin downgrades automáticos.
- Ampliar pruebas de vídeo con codecs reales, volumen externo, cancelación durante carga de motores y reproducción de salida.
- OCR: las correcciones del editor completo se aplican a TXT/copia; el PDF conserva el reconocimiento por página. La capa PDF usa Helvetica/WinAnsi con sustitución de caracteres fuera del conjunto soportado; alcance anunciado español/inglés. La descarga inicial de Tesseract puede necesitar terminar antes de cerrar el trabajador.
- El escáner conserva una detección heurística que exige revisión de esquinas; resta transferencia directa a OCR/PDF, correspondiente a M-06.
- Ampliar compatibilidad móvil física y auditoría de teclado/tacto a todo el catálogo.
- Evaluar primero QR, taller de texto, contraseñas, unidades y fechas, con los criterios y fuentes del informe comparativo.
