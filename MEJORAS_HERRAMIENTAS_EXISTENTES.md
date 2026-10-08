# Plan de mejoras para las herramientas existentes de CeroNube

## Propósito

Este documento es la hoja de ruta oficial para mejorar las herramientas que ya están publicadas en CeroNube.

Su objetivo es completar los flujos actuales, aumentar su utilidad cotidiana y mantener una experiencia coherente, privada y comprensible. No se utilizará para recuperar como herramientas independientes las propuestas descartadas de `HERRAMIENTAS_POR_IMPLEMENTAR.md`.

## Regla obligatoria de seguimiento

**Todo trabajo relacionado con esta hoja de ruta debe registrarse en este mismo archivo.**

Cada vez que se inicie, avance, pruebe, pause, complete, despliegue o descarte una mejora, se debe:

1. Actualizar su estado en la tabla de seguimiento.
2. Marcar los criterios de aceptación que ya se hayan cumplido.
3. Añadir una entrada fechada en el registro de avances al final del documento.
4. Indicar los archivos principales modificados.
5. Registrar las verificaciones realizadas y su resultado.
6. Documentar cualquier cambio de alcance, limitación o decisión técnica.

No se considerará terminada una mejora si su implementación no quedó registrada aquí.

## Estados permitidos

- `Pendiente`: todavía no se ha iniciado.
- `En análisis`: se está definiendo el alcance o investigando la solución.
- `En desarrollo`: hay implementación activa.
- `En pruebas`: la implementación está completa, pero falta validación.
- `Bloqueada`: existe un impedimento documentado.
- `Completada`: cumple los criterios de aceptación y las pruebas previstas.
- `Desplegada`: está publicada y verificada en producción.
- `Descartada`: se decidió no continuar y el motivo está documentado.

## Principios comunes

Todas las mejoras deben respetar estos criterios:

- Los archivos continúan procesándose localmente en el navegador.
- Ningún archivo se envía a un servidor para ser procesado.
- Las descargas externas de motores, modelos o componentes deben explicarse antes de utilizarlas.
- Los límites de tamaño, memoria y compatibilidad deben mostrarse antes de procesar.
- Las operaciones pesadas deben ejecutarse en Web Workers cuando sea viable.
- Toda operación prolongada debe ofrecer progreso, cancelación y recuperación ante errores.
- Los resultados deben poder descargarse con nombres predecibles.
- Los recursos temporales y las URL de objeto deben liberarse correctamente.
- Los controles deben funcionar con teclado y pantallas táctiles.
- Cada mejora debe probarse en escritorio y en una vista móvil representativa.
- No deben incorporarse funciones que contradigan el descarte de herramientas de `HERRAMIENTAS_POR_IMPLEMENTAR.md`.

## Orden recomendado de implementación

| Orden | Mejora principal | Herramienta | Impacto | Complejidad | Estado |
| ---: | --- | --- | --- | --- | --- |
| 1 | Corrección real de perspectiva | Escáner a PDF | Muy alto | Media-alta | Completada |
| 2 | OCR multipágina y PDF buscable | Imagen a texto | Muy alto | Media-alta | Completada |
| 3 | Exportación MP3 y OGG | Estudio de audio | Muy alto | Media | Pendiente |
| 4 | Peso objetivo y recorte visual | Estudio de imágenes | Alto | Media | Pendiente |
| 5 | Acciones por lotes y deshacer | Organizar PDF | Alto | Media | Pendiente |
| 6 | Flujo «Abrir en otra herramienta» | Plataforma compartida | Muy alto | Media-alta | Pendiente |
| 7 | Limpieza y transformación avanzada | Conversor de datos | Alto | Media | Pendiente |
| 8 | Línea de tiempo visual | Taller de vídeo | Alto | Alta | Pendiente |
| 9 | Guardado local y edición múltiple | Estudio MIDI | Medio-alto | Alta | Pendiente |
| 10 | Comparación y fuentes variables | Laboratorio de fuentes | Medio | Media | Pendiente |
| 11 | Inspección y limpieza por lotes | Limpiar metadatos | Medio-alto | Media | Pendiente |
| 12 | Vista de árbol y mejor gestión | Gestor de archivos ZIP | Medio | Media | Pendiente |
| 13 | Edición y validación editorial | Taller EPUB | Medio-alto | Alta | Pendiente |

---

## 1. Escáner a PDF

### Objetivo principal

Sustituir el recorte porcentual actual por una corrección real de perspectiva que permita convertir fotografías inclinadas en páginas rectangulares y legibles.

### Mejoras previstas

- Detectar automáticamente los cuatro bordes del documento.
- Permitir mover manualmente las cuatro esquinas cuando la detección falle.
- Mostrar una previsualización de la transformación antes de exportar.
- Permitir ajustes diferentes para cada página.
- Añadir controles individuales de brillo, contraste, blanco y negro y color.
- Capturar fotografías directamente desde la cámara en dispositivos compatibles.
- Configurar resolución y calidad del PDF resultante.
- Enviar el resultado directamente a OCR u Organizar PDF.

### Criterios de aceptación

- [x] La perspectiva se corrige mediante cuatro puntos, no mediante un simple zoom.
- [x] Cada página conserva sus propios ajustes.
- [x] La previsualización representa el resultado exportado.
- [x] Se puede restaurar una página a su estado original.
- [x] El procesamiento no bloquea la interfaz con 20 páginas admitidas.
- [x] El resultado se valida visualmente en escritorio y móvil.

## 2. Imagen a texto — OCR

### Objetivo principal

Convertir la herramienta en un flujo útil para documentos completos, no únicamente para una imagen aislada.

### Mejoras previstas

- Cargar y ordenar varias imágenes.
- Aceptar PDF y seleccionar las páginas que se reconocerán.
- Aplicar rotación, recorte, contraste y escala de grises antes del reconocimiento.
- Seleccionar una región concreta de la imagen.
- Resaltar palabras o líneas con baja confianza.
- Conservar mejor los saltos de línea y párrafos.
- Añadir idiomas descargables bajo demanda.
- Exportar TXT, texto estructurado y PDF con capa de texto buscable.
- Enviar imágenes desde Escáner a PDF sin volver a seleccionarlas.

### Criterios de aceptación

- [x] Se pueden procesar varias páginas en una sola operación.
- [x] Se puede cancelar el reconocimiento sin dejar trabajadores activos.
- [x] La interfaz identifica visualmente resultados de baja confianza.
- [x] La exportación a PDF produce texto seleccionable y buscable.
- [x] Los modelos descargados y sus tamaños se explican claramente.

## 3. Estudio de audio

### Objetivo principal

Completar la exportación para que el resultado no esté limitado a WAV y mejorar la calidad de las operaciones de unión y normalización.

### Mejoras previstas

- Exportar MP3 y OGG, manteniendo WAV como opción sin pérdida.
- Seleccionar bitrate o perfil de calidad mediante opciones comprensibles.
- Mostrar una estimación del tamaño final.
- Normalizar por sonoridad percibida —LUFS— además de por pico.
- Detectar y eliminar silencios iniciales o finales.
- Añadir crossfade entre pistas unidas.
- Elegir frecuencia de muestreo, mono o estéreo.
- Mostrar advertencias cuando un formato dependa de un motor externo.
- Enviar el audio procesado al Taller de vídeo.

### Criterios de aceptación

- [ ] WAV, MP3 y OGG producen archivos reproducibles.
- [ ] La calidad y el tamaño estimado se muestran antes de exportar.
- [ ] La normalización evita saturación audible.
- [ ] Los crossfades se reflejan en la previsualización y la exportación.
- [ ] La cancelación interrumpe también la codificación.

## 4. Estudio de imágenes

### Objetivo principal

Permitir que el usuario busque un resultado concreto —dimensiones o peso— y tenga mayor control visual sobre cada imagen.

### Mejoras previstas

- Definir un peso máximo objetivo por imagen.
- Ajustar iterativamente calidad y dimensiones para aproximarse al objetivo.
- Añadir recorte visual con proporciones libres y predefinidas.
- Girar y voltear imágenes.
- Permitir o impedir la ampliación de imágenes pequeñas.
- Comparar original y resultado mediante un control antes/después.
- Añadir perfiles para correo, web, miniatura y redes sociales.
- Advertir sobre pérdida de transparencia al convertir a JPEG.
- Añadir AVIF cuando el navegador o el motor local lo soporten de forma estable.

### Criterios de aceptación

- [ ] El peso objetivo produce resultados razonablemente cercanos sin superar el límite cuando sea posible.
- [ ] El recorte funciona con ratón, teclado y pantalla táctil.
- [ ] Los perfiles explican dimensiones, formato y calidad aplicados.
- [ ] La interfaz evita ampliaciones involuntarias.
- [ ] La comparación no duplica innecesariamente archivos grandes en memoria.

## 5. Organizar PDF

### Objetivo principal

Hacer eficientes las operaciones con documentos extensos y reducir errores accidentales.

### Mejoras previstas

- Seleccionar varias páginas mediante clic, teclado y rangos.
- Girar, eliminar, mover o duplicar la selección completa.
- Añadir deshacer y rehacer.
- Permitir introducir rangos como `1-5, 8, 10-12`.
- Añadir números de página opcionales.
- Añadir compresión básica del documento final.
- Mostrar claramente PDF protegidos o incompatibles.
- Virtualizar miniaturas cuando el documento sea grande.

### Criterios de aceptación

- [ ] Las acciones por lotes son accesibles con teclado.
- [ ] Deshacer restaura orden, rotación, duplicados y eliminaciones.
- [ ] La exportación conserva correctamente las páginas seleccionadas.
- [ ] Los documentos cercanos al límite no bloquean la interfaz.
- [ ] Se muestran mensajes específicos para PDF protegidos o dañados.

## 6. Flujo «Abrir en otra herramienta»

### Objetivo principal

Conectar las utilidades sin obligar al usuario a descargar y volver a seleccionar el mismo archivo.

### Flujos iniciales

- Escáner a PDF → Imagen a texto.
- Escáner a PDF → Organizar PDF.
- Imagen a texto → Organizar PDF cuando exista un PDF buscable.
- Limpiar metadatos → Estudio de imágenes.
- Estudio de imágenes → Escáner a PDF.
- Estudio de audio → Taller de vídeo.

### Requisitos técnicos

- Transferir el resultado en memoria cuando el tamaño lo permita.
- Utilizar almacenamiento local temporal únicamente cuando sea necesario.
- Mostrar qué archivo y qué tamaño se transferirán.
- Caducar y eliminar automáticamente los recursos temporales.
- Ofrecer un botón para borrar inmediatamente los archivos temporales.
- No utilizar servidores como intermediarios.

### Criterios de aceptación

- [ ] El usuario entiende qué archivo pasará a la otra herramienta.
- [ ] La transferencia funciona sin conexión después de haber cargado ambas herramientas.
- [ ] Los recursos temporales se eliminan al terminar o caducar.
- [ ] Los errores de memoria ofrecen como alternativa descargar el archivo.

## 7. Conversor de datos

### Objetivo principal

Pasar de una conversión básica a una preparación de datos comprensible y segura.

### Mejoras previstas

- Indicar línea, columna y causa de los errores de análisis.
- Elegir delimitador, comillas, encabezados y codificación de CSV/TSV.
- Aplanar JSON anidado mediante reglas configurables.
- Añadir YAML y NDJSON; si no se implementan, retirar esas palabras clave del catálogo.
- Reordenar, renombrar y eliminar columnas.
- Filtrar filas y eliminar duplicados.
- Detectar tipos sin modificar identificadores, códigos postales o ceros iniciales.
- Procesar archivos grandes en un Web Worker o por bloques.
- Previsualizar más registros mediante una tabla virtualizada.

### Criterios de aceptación

- [ ] Los errores señalan una ubicación útil para corregirlos.
- [ ] Los ceros iniciales se conservan cuando el usuario lo solicite.
- [ ] Las transformaciones se pueden previsualizar antes de descargar.
- [ ] Los formatos anunciados en el catálogo coinciden con los realmente soportados.
- [ ] Archivos próximos al límite no congelan la interfaz.

## 8. Taller de vídeo

### Objetivo principal

Mejorar la precisión visual de la edición y explicar el costo del procesamiento antes de comenzar.

### Mejoras previstas

- Añadir una línea de tiempo con miniaturas.
- Mover los puntos de inicio y final mediante tiradores visuales.
- Recortar espacialmente con un marco ajustable.
- Girar y voltear el vídeo.
- Añadir perfiles para redes sociales y tamaños frecuentes.
- Estimar duración, tamaño y tiempo de codificación.
- Controlar posición, tamaño, tipografía, color y fondo de los subtítulos ya admitidos.
- Permitir una cola de varios vídeos.
- Mejorar la recuperación cuando FFmpeg no pueda cargarse.

### Criterios de aceptación

- [ ] Los controles visuales y los valores numéricos permanecen sincronizados.
- [ ] El recorte espacial coincide con el archivo exportado.
- [ ] Los perfiles explican claramente qué modificarán.
- [ ] Los subtítulos se ven igual en la previsualización y el resultado.
- [ ] Los fallos del motor ofrecen reintento y explicación comprensible.

## 9. Estudio MIDI

### Objetivo principal

Facilitar la edición musical de proyectos medianos y evitar la pérdida accidental del trabajo.

### Mejoras previstas

- Seleccionar, mover, copiar, pegar y eliminar varias notas.
- Cambiar duración arrastrando el borde de una nota.
- Añadir una región de reproducción en bucle.
- Incorporar metrónomo y cuenta previa.
- Configurar compás y tonalidad.
- Añadir un carril visual de velocidad.
- Incorporar mapa de percusión.
- Exportar una mezcla de audio además del archivo MIDI.
- Guardar borradores automáticamente en almacenamiento local.
- Permitir descargar y restaurar un archivo de proyecto CeroNube.

### Criterios de aceptación

- [ ] Las operaciones múltiples se pueden deshacer y rehacer.
- [ ] La reproducción en bucle no acumula voces ni temporizadores.
- [ ] El borrador se recupera después de recargar la página.
- [ ] El usuario puede eliminar definitivamente los proyectos locales.
- [ ] La exportación MIDI mantiene pistas, tempo y velocidades.

## 10. Laboratorio de fuentes

### Objetivo principal

Mejorar la evaluación de familias tipográficas y el trabajo con fuentes variables.

### Mejoras previstas

- Comparar dos o más fuentes con el mismo texto y tamaño.
- Detectar fuentes variables y mostrar controles para cada eje.
- Probar ligaduras, kerning y funciones OpenType.
- Mostrar cobertura Unicode por bloques y alfabetos.
- Comparar el tamaño original con WOFF/WOFF2 y subconjuntos.
- Generar CSS para varios pesos y estilos de una familia.
- Advertir sobre pérdidas de ejes o tablas al convertir.
- Permitir exportar una ficha técnica de la fuente.

### Criterios de aceptación

- [ ] Los ejes variables detectados se pueden previsualizar.
- [ ] La comparación mantiene el mismo contenido y condiciones visuales.
- [ ] El CSS generado incluye formato, peso, estilo y estrategia de carga.
- [ ] Las advertencias describen las tablas o funciones que podrían perderse.

## 11. Limpiar metadatos

### Objetivo principal

Ampliar la cobertura y permitir limpiar varias imágenes con verificación del resultado.

### Mejoras previstas

- Procesar imágenes por lotes.
- Inspeccionar EXIF, XMP, IPTC y campos textuales compatibles.
- Permitir conservar orientación y perfil de color.
- Generar un informe antes/después.
- Volver a analizar automáticamente el archivo limpio.
- Descargar múltiples resultados en ZIP.
- Añadir formatos adicionales solo cuando la limpieza sea verificable.

### Criterios de aceptación

- [ ] Cada resultado se vuelve a inspeccionar antes de marcarse como limpio.
- [ ] El usuario puede identificar qué campos se eliminaron o conservaron.
- [ ] La orientación visual no cambia accidentalmente.
- [ ] Los lotes generan nombres únicos y predecibles.

## 12. Gestor de archivos ZIP

### Objetivo principal

Hacer más comprensible la estructura de archivos y mejorar el comportamiento con archivos grandes.

### Mejoras previstas

- Añadir vista de árbol expandible.
- Seleccionar, renombrar, eliminar o extraer carpetas completas.
- Explicar y resolver nombres duplicados antes de crear el ZIP.
- Previsualizar imágenes y PDF pequeños además de texto.
- Mostrar el tamaño esperado antes de comprimir.
- Validar integridad y errores CRC cuando la biblioteca lo permita.
- Investigar procesamiento por streaming o escritura mediante File System Access API.
- Mantener una alternativa compatible basada en descarga normal.

### Criterios de aceptación

- [ ] Las rutas anidadas se muestran y manipulan sin ambigüedad.
- [ ] Ninguna extracción permite rutas absolutas o segmentos `../`.
- [ ] Los conflictos de nombres requieren una decisión clara.
- [ ] La interfaz mantiene su capacidad de respuesta cerca de los límites actuales.

## 13. Taller EPUB

### Objetivo principal

Mejorar la edición editorial y ofrecer una validación más clara antes de descargar el libro.

### Mejoras previstas

- Añadir vista dividida entre contenido y previsualización.
- Buscar y reemplazar en todos los capítulos.
- Crear índices con varios niveles.
- Editar editorial, fecha, descripción, identificador e ISBN.
- Editar el CSS del libro con previsualización segura.
- Optimizar imágenes y avisar sobre recursos excesivos.
- Mostrar vista previa en tamaños de lector diferentes.
- Descargar un informe de validación.
- Explicar claramente las diferencias de compatibilidad entre EPUB 2 y EPUB 3.

### Criterios de aceptación

- [ ] La previsualización se actualiza sin ejecutar scripts del libro.
- [ ] Buscar y reemplazar permite revisar cambios antes de aplicarlos.
- [ ] El índice multinivel se refleja en navegación y contenido.
- [ ] La validación diferencia errores, advertencias y recomendaciones.
- [ ] Reabrir el EPUB exportado conserva contenido, orden y metadatos.

---

## Mejoras transversales

Estas tareas pueden implementarse gradualmente, pero deben utilizar componentes y comportamientos compartidos.

### Presets comprensibles

- Utilizar nombres orientados a resultados: correo, web, documento legible, redes sociales o máxima calidad.
- Mostrar siempre los valores técnicos que aplica cada preset.
- Permitir modificar el preset sin ocultar los ajustes resultantes.

### Estimaciones previas

- Tamaño aproximado del resultado.
- Tiempo estimado o nivel de esfuerzo del dispositivo.
- Memoria necesaria cuando pueda calcularse.
- Motores o modelos externos que se descargarán.
- Compatibilidad conocida del navegador.

### Historial local opcional

- Guardar únicamente con autorización clara del usuario.
- Establecer caducidad automática.
- Mostrar espacio utilizado.
- Permitir eliminar resultados individuales o todo el historial.
- No sincronizar ni transmitir este historial.

### Experiencia uniforme

- Estados vacíos, carga, progreso, éxito y error consistentes.
- Botones de cancelar, limpiar, restablecer y descargar con los mismos patrones.
- Mensajes de límites antes de seleccionar archivos.
- Atajos de teclado documentados donde resulten útiles.
- Confirmación antes de perder un trabajo que haya requerido edición manual.

## Verificación mínima para completar una mejora

Antes de marcar una tarea como `Completada`, se debe registrar:

- [ ] Compilación de producción satisfactoria.
- [ ] Lint sin errores en los archivos modificados.
- [ ] Pruebas automatizadas nuevas o actualizadas.
- [ ] Prueba manual del flujo principal.
- [ ] Prueba de archivo inválido o incompatible.
- [ ] Prueba cerca del límite de tamaño aplicable.
- [ ] Prueba de cancelación y limpieza.
- [ ] Prueba en escritorio.
- [ ] Prueba en vista móvil.
- [ ] Revisión de accesibilidad mediante teclado.
- [ ] Confirmación de que el archivo no se transmite a un servidor.
- [ ] Actualización de metadatos, textos de ayuda o límites si corresponde.

## Tabla de seguimiento

Esta tabla debe actualizarse en cada sesión de trabajo relacionada con las mejoras.

| ID | Herramienta o área | Mejora activa | Estado | Responsable | Última actualización | Próximo paso | Bloqueos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M-01 | Escáner a PDF | Corrección real de perspectiva | En pruebas | Codex | 2026-09-17 | Validar un lote de 20 páginas y completar pruebas táctiles/móviles | — |
| M-02 | Imagen a texto | OCR multipágina y PDF buscable | En pruebas | Codex | 2026-09-17 | Validar reconocimiento real, cancelación y selección del texto exportado en varios navegadores | — |
| M-03 | Estudio de audio | Exportación MP3 y OGG | Pendiente | — | — | Evaluar reutilización del motor FFmpeg existente | — |
| M-04 | Estudio de imágenes | Peso objetivo y recorte visual | Pendiente | — | — | Diseñar algoritmo iterativo y control de recorte | — |
| M-05 | Organizar PDF | Acciones por lotes y deshacer | Pendiente | — | — | Diseñar modelo de selección e historial | — |
| M-06 | Plataforma | Abrir en otra herramienta | Pendiente | — | — | Diseñar contrato de transferencia local | — |
| M-07 | Conversor de datos | Limpieza y transformación avanzada | Pendiente | — | — | Priorizar controles CSV y errores con ubicación | — |
| M-08 | Taller de vídeo | Línea de tiempo visual | Pendiente | — | — | Diseñar miniaturas y tiradores de recorte | — |
| M-09 | Estudio MIDI | Guardado local y edición múltiple | Pendiente | — | — | Definir formato de proyecto local | — |
| M-10 | Laboratorio de fuentes | Comparación y fuentes variables | Pendiente | — | — | Investigar detección de ejes OpenType | — |
| M-11 | Limpiar metadatos | Inspección y limpieza por lotes | Pendiente | — | — | Definir modelo de lote y verificación posterior | — |
| M-12 | Gestor ZIP | Vista de árbol y gestión de carpetas | Pendiente | — | — | Diseñar estructura y acciones de carpetas | — |
| M-13 | Taller EPUB | Edición y validación editorial | Pendiente | — | — | Priorizar vista dividida y búsqueda global | — |

## Plantilla obligatoria para registrar avances

Copiar esta plantilla al inicio del registro cada vez que se realice trabajo:

```md
### AAAA-MM-DD — M-XX — Título breve

- **Estado anterior:** Pendiente / En análisis / En desarrollo / En pruebas / Bloqueada.
- **Estado nuevo:** En análisis / En desarrollo / En pruebas / Completada / Desplegada / Descartada.
- **Trabajo realizado:** Descripción concreta de lo implementado o analizado.
- **Archivos modificados:** Lista de rutas principales.
- **Decisiones técnicas:** Decisiones, alternativas evaluadas y motivos.
- **Pruebas realizadas:** Comandos, escenarios manuales y resultados.
- **Limitaciones o riesgos:** Problemas conocidos y casos todavía no cubiertos.
- **Próximo paso:** Una acción concreta y verificable.
- **Commit o despliegue:** Identificador o enlace, si existe.
```

## Registro de avances

Las entradas nuevas deben colocarse inmediatamente debajo de este texto, dejando la más reciente primero.

### 2026-10-08 — M-01 y M-02 — auditoría y preparación de publicación

- **Estado anterior:** En pruebas, sin commit ni despliegue.
- **Estado nuevo:** Completada; pendiente verificación pública para marcar Desplegada.
- **Trabajo realizado:** Revisados los cambios pendientes, corregidas cancelación OCR, alineación de PDF, límites de rasterización, guardas de cargas y liberación de recursos. Añadida explicación de edición TXT frente a PDF. Escáner con prueba de 20 páginas, cancelación, teclado e inválidos; OCR real con imágenes/PDF, TXT, PDF con texto extraíble, límite de 30 páginas y cancelación.
- **Archivos modificados:** componentes del escáner/OCR, motores `lib/perspective.ts` y `lib/ocr-document.ts`, páginas, catálogo y `tests/document-tools.test.mjs` más pruebas unitarias.
- **Pruebas realizadas:** npm ci, lint, TypeScript, build, 10 pruebas unitarias y 9 flujos de navegador; verificación adicional de texto PDF. Pantallas móviles oscuras revisadas. Sin solicitudes POST/PUT/PATCH durante los flujos instrumentados.
- **Limitaciones:** Ver `AUDITORIA_PROYECTO.md`; PDF conserva reconocimiento por página, TXT/copia admiten corrección completa; descarga inicial puede requerir terminar al cancelar. M-06 y mejoras adicionales quedan pendientes.
- **Próximo paso:** Publicar por main y comprobar build de Cloudflare y sitio público.
- **Autorización actual:** El usuario solicitó explícitamente publicar las actualizaciones el 8 de octubre; sustituye la instrucción histórica de no publicar del 17 de septiembre.
### 2026-09-17 — M-02 — OCR multipágina y PDF buscable

- **Estado anterior:** En desarrollo.
- **Estado nuevo:** En pruebas.
- **Trabajo realizado:** Se añadió carga conjunta de imágenes y PDF, preparación local de páginas, ordenación, giro y mejora visual por página, reconocimiento secuencial con un único trabajador, progreso global, cancelación, edición del texto, avisos de baja confianza y exportación TXT o PDF buscable con una capa de texto invisible alineada con las palabras reconocidas.
- **Archivos modificados:** `components/ocr-studio.tsx`, `lib/ocr-document.ts`, `tests/ocr-document.test.mjs`, `app/herramientas/ocr/page.tsx`, `components/tool-directory.tsx`, `lib/site.ts` y `MEJORAS_HERRAMIENTAS_EXISTENTES.md`.
- **Decisiones técnicas:** Los PDF se rasterizan localmente con PDF.js antes del OCR; Tesseract reutiliza un solo trabajador para todas las páginas y se termina tanto al cancelar como al desmontar la pantalla; el PDF buscable se compone localmente con PDF-Lib. Se informa el tamaño aproximado de la descarga inicial del motor y de los idiomas.
- **Pruebas realizadas:** Pruebas automatizadas de aplanado de palabras, conservación del número de página y generación/carga de PDF; TypeScript sin errores; lint sin errores; compilación de producción satisfactoria; carga local de la pantalla sin errores ni advertencias en consola.
- **Limitaciones o riesgos:** Falta probar el reconocimiento completo descargando modelos reales, archivos inválidos, cancelación durante OCR, el límite de 30 páginas, selección de texto en lectores PDF distintos y vista móvil con documentos reales. La selección de una región concreta y la exportación estructurada siguen pendientes como ampliaciones.
- **Próximo paso:** Ejecutar la matriz manual con imágenes y PDF reales en escritorio y móvil antes de marcar M-02 como completada.
- **Commit o despliegue:** Sin commit y sin despliegue público por indicación del usuario.

### 2026-09-17 — M-01 — Corrección real de perspectiva

- **Estado anterior:** En desarrollo.
- **Estado nuevo:** En pruebas.
- **Trabajo realizado:** Se sustituyó el recorte rectangular por transformación de perspectiva de cuatro puntos, detección automática inicial, edición manual con ratón, tacto o teclado, previsualización corregida, ajustes independientes de giro, brillo, contraste y color por página, captura desde cámara y controles de formato, margen y calidad del PDF. La exportación ofrece progreso y cancelación.
- **Archivos modificados:** `components/document-scanner.tsx`, `lib/perspective.ts`, `tests/perspective.test.mjs`, `app/herramientas/escaner/page.tsx`, `components/tool-directory.tsx`, `lib/site.ts` y `MEJORAS_HERRAMIENTAS_EXISTENTES.md`.
- **Decisiones técnicas:** Se implementó una homografía local sin enviar imágenes a servidores. La detección usa una muestra reducida y siempre permite corrección manual. La previsualización y la exportación comparten el mismo proceso de renderizado para evitar diferencias; durante el cálculo se cede periódicamente el control a la interfaz.
- **Pruebas realizadas:** Pruebas automatizadas de proyección, dimensiones, detección de una hoja y recuperación segura; TypeScript sin errores; lint sin errores; compilación de producción satisfactoria; carga local de la pantalla sin errores ni advertencias en consola.
- **Limitaciones o riesgos:** Falta la prueba manual con fotografías reales, un lote de 20 páginas, archivo inválido, cancelación bajo carga y validación táctil/móvil. La transferencia directa a OCR u Organizar PDF pertenece a M-06 y no se incluyó en esta entrega.
- **Próximo paso:** Ejecutar pruebas visuales con documentos inclinados y un lote cercano al límite antes de marcar M-01 como completada.
- **Commit o despliegue:** Sin commit y sin despliegue público por indicación del usuario.

### 2026-09-17 — Plan inicial

- **Estado anterior:** No existía una hoja de ruta consolidada para mejorar las herramientas publicadas.
- **Estado nuevo:** Pendiente.
- **Trabajo realizado:** Se documentaron las mejoras recomendadas, su orden de implementación, criterios de aceptación y el sistema obligatorio de seguimiento.
- **Archivos modificados:** `MEJORAS_HERRAMIENTAS_EXISTENTES.md`.
- **Decisiones técnicas:** Se priorizaron mejoras que completan flujos ya existentes y se mantuvieron descartadas las herramientas no implementadas de `HERRAMIENTAS_POR_IMPLEMENTAR.md`.
- **Pruebas realizadas:** Revisión manual de estructura y consistencia del documento.
- **Limitaciones o riesgos:** Las estimaciones de complejidad deberán ajustarse después del análisis técnico de cada mejora.
- **Próximo paso:** Iniciar M-01 con el diseño técnico y visual de la corrección de perspectiva.
- **Commit o despliegue:** Pendiente.
