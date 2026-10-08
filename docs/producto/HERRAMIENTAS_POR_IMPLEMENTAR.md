# Catálogo y propuestas de CeroNube

Revisión: 8 de octubre de 2026. Este documento sustituye la lista antigua que presentaba herramientas publicadas como pendientes.

## Catálogo implementado

La fuente ejecutable es `lib/site.ts`; el directorio está en `components/tool-directory.tsx`.

| Herramienta | Ruta | Seguimiento |
| --- | --- | --- |
| Crear y leer QR | `/herramientas/qr` | N-01; comprobada localmente, publicación pendiente |
| Limpiar y ordenar texto | `/herramientas/texto` | N-02; comprobada localmente, publicación pendiente |
| Generar contraseñas y frases | `/herramientas/contrasenas` | N-03; comprobada localmente, publicación pendiente |
| Estudio de imágenes | `/herramientas/imagenes` | M-04 |
| Organizar PDF | `/herramientas/pdf` | M-05 |
| Limpiar metadatos | `/herramientas/metadatos` | M-11 |
| Imagen a texto | `/herramientas/ocr` | M-02 |
| Conversor de datos | `/herramientas/datos` | M-07 |
| Escáner a PDF | `/herramientas/escaner` | M-01 |
| Estudio de audio | `/herramientas/audio` | M-03 |
| Estudio MIDI | `/herramientas/midi` | M-09 |
| Taller de vídeo | `/herramientas/video` | M-08 |
| Gestor ZIP | `/herramientas/zip` | M-12 |
| Laboratorio de fuentes | `/herramientas/fuentes` | M-10 |
| Taller EPUB | `/herramientas/epub` | M-13 |

Las ampliaciones se mantienen en [MEJORAS_HERRAMIENTAS_EXISTENTES.md](../planificacion/MEJORAS_HERRAMIENTAS_EXISTENTES.md). El estado de publicación se confirma en [REGISTRO_DESPLIEGUE.md](../historial/REGISTRO_DESPLIEGUE.md).

## Nuevas propuestas investigadas

La auditoría de competidores y la priorización están en [AUDITORIA_COMPARATIVA.md](../auditorias/AUDITORIA_COMPARATIVA.md). Las candidatas se evalúan para procesamiento local, utilidad general, accesibilidad y límites claros. Una recomendación no equivale a una herramienta implementada o publicada.

El alcance inicial, las dependencias candidatas y los criterios de aceptación de las diez oportunidades se desarrollan en [PROPUESTAS_NUEVAS_HERRAMIENTAS.md](../planificacion/PROPUESTAS_NUEVAS_HERRAMIENTAS.md). N-01 a N-03 están completadas y comprobadas localmente, pendientes de publicación; N-04 a N-10 siguen pendientes de implementación.

## Propuestas históricas sin reactivación

La hoja de ruta anterior incluía editor de subtítulos, visor/conversor 3D, DOCX a Markdown/HTML, cifrado de archivos, verificación de hashes, inspector hexadecimal, comparador de archivos, conversor Markdown/HTML, visor EML y reparador STL. Se conserva su existencia como antecedente; esta revisión no autoriza su implementación ni revoca descartes anteriores. Las especificaciones originales siguen recuperables en Git.

Al evaluar nuevas propuestas hay que señalar coincidencias con estos antecedentes y separar una mejora de las herramientas existentes de una utilidad independiente.

## Criterios obligatorios

- Archivos y contenido procesados dentro del navegador, sin envío a APIs ni servidores.
- Sin cuenta obligatoria y con resultados descargables o copiables.
- Motores/modelos descargados bajo demanda y explicados antes de utilizarlos.
- Límites de tamaño, memoria, formatos y compatibilidad visibles.
- Vacío, progreso, cancelación/limpieza, éxito y errores comprensibles.
- Liberación de recursos temporales; operaciones costosas fuera del hilo principal cuando sea viable.
- Teclado, tacto, móvil y ambos temas comprobados.
- HTML y documentos activos sanitizados; recursos remotos bloqueados por defecto en previsualizaciones.
- Medición/publicidad opcionales, separadas del procesamiento de archivos.
- Catálogo, SEO y sitemap coherentes con funciones realmente disponibles.
