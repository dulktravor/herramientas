# Documentación de CeroNube

Organización revisada el 8 de octubre de 2026. El [README principal](../README.md) sigue siendo la entrada al repositorio y contiene las instrucciones de desarrollo.

## Clasificación por tipo de contenido

| Tipo | Carpeta | Documentos y finalidad |
| --- | --- | --- |
| Diseño | `diseno/` | [DESIGN.md](diseno/DESIGN.md): marca, interfaz, accesibilidad y principios de privacidad. |
| Operación | `operacion/` | [GUIA_DESPLIEGUE_ACTUALIZACIONES.md](operacion/GUIA_DESPLIEGUE_ACTUALIZACIONES.md): procedimiento de publicación y comprobación. |
| Historial | `historial/` | [REGISTRO_DESPLIEGUE.md](historial/REGISTRO_DESPLIEGUE.md): versiones, decisiones y evidencia de despliegues. |
| Auditorías | `auditorias/` | [AUDITORIA_PROYECTO.md](auditorias/AUDITORIA_PROYECTO.md): hallazgos internos y seguimiento. [AUDITORIA_COMPARATIVA.md](auditorias/AUDITORIA_COMPARATIVA.md): investigación de otras páginas y fuentes. |
| Producto | `producto/` | [HERRAMIENTAS_POR_IMPLEMENTAR.md](producto/HERRAMIENTAS_POR_IMPLEMENTAR.md): catálogo actual, condiciones de admisión y antecedentes de propuestas. |
| Planificación | `planificacion/` | [MEJORAS_HERRAMIENTAS_EXISTENTES.md](planificacion/MEJORAS_HERRAMIENTAS_EXISTENTES.md): ampliaciones de herramientas actuales. [PROPUESTAS_NUEVAS_HERRAMIENTAS.md](planificacion/PROPUESTAS_NUEVAS_HERRAMIENTAS.md): especificaciones de las diez propuestas de la auditoría comparativa. |

## Dónde registrar cada contenido

- Identidad, componentes visuales y reglas de experiencia: diseño.
- Instrucciones repetibles para ejecutar o publicar: operación.
- Hechos ya ocurridos, versiones y comprobaciones: historial.
- Hallazgos, evidencia, fuentes externas y limitaciones del análisis: auditorías.
- Qué existe en el catálogo y qué condiciones debe cumplir: producto.
- Trabajo futuro, alcance, prioridad y criterios de aceptación: planificación.

Una propuesta permanece en planificación hasta que su implementación y publicación estén verificadas. Un registro histórico conserva lo que sucedió en su fecha, aunque el producto cambie posteriormente.

## Convenciones

- Los enlaces a otros documentos son relativos al Markdown que los contiene.
- Las rutas de código y los comandos de terminal se interpretan desde la raíz del repositorio, salvo indicación explícita.
- Los nombres de archivos citados en entradas históricas pueden corresponder a su ubicación anterior. Los enlaces documentales llevan a su ubicación actual.
- Conservar el README de la raíz, este índice y las instrucciones de agentes o habilidades en las ubicaciones que requieran sus herramientas.
- Esta clasificación abarca la documentación propia del proyecto. Los Markdown de dependencias, compilaciones y resultados personales se mantienen en sus carpetas originales.
- Antes de añadir un documento, comprobar si su contenido encaja en uno existente. Mantener los resultados de una auditoría separados de las especificaciones de implementación.

## Lecturas relacionadas

Para revisar las diez oportunidades: [auditoría comparativa](auditorias/AUDITORIA_COMPARATIVA.md) → [propuestas de implementación](planificacion/PROPUESTAS_NUEVAS_HERRAMIENTAS.md) → [catálogo y condiciones](producto/HERRAMIENTAS_POR_IMPLEMENTAR.md).

Para consultar las decisiones y pruebas de las primeras implementaciones: [QR](planificacion/N-01_IMPLEMENTACION.md), [texto](planificacion/N-02_IMPLEMENTACION.md) y [contraseñas y frases](planificacion/N-03_IMPLEMENTACION.md). Las tres están publicadas y verificadas; la evidencia está en el [registro de despliegue](historial/REGISTRO_DESPLIEGUE.md).

Unidades (N-04), fechas y horarios (N-05) y colores (N-06) también están publicadas y verificadas desde el 8 de octubre de 2026. Sus decisiones, límites y comprobaciones figuran en el [registro de despliegue](historial/REGISTRO_DESPLIEGUE.md).

Para publicar una implementación: [guía de despliegue](operacion/GUIA_DESPLIEGUE_ACTUALIZACIONES.md) → [registro de versiones](historial/REGISTRO_DESPLIEGUE.md).
