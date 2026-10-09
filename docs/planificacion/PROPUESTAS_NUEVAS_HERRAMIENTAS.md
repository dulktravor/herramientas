# Diez propuestas de herramientas para CeroNube

Fecha: 8 de octubre de 2026. Estado del documento: especificaciones y seguimiento de implementación.

Estas propuestas desarrollan las diez oportunidades de la [auditoría comparativa](../auditorias/AUDITORIA_COMPARATIVA.md). **N-01 a N-06 están implementadas, publicadas y comprobadas en la página oficial** el 8 de octubre de 2026; N-07 a N-10 siguen pendientes de implementación. Las especificaciones siguientes conservan el alcance de planificación; las decisiones y límites del código entregado se documentan en las notas de implementación y el registro enlazados en Seguimiento. La evidencia de publicación está en el [registro de despliegue](../historial/REGISTRO_DESPLIEGUE.md).

## Objetivo y condiciones de CeroNube

Ampliar la utilidad cotidiana de CeroNube con tareas comprensibles para estudiantes, hogares, profesionales y pequeños negocios, manteniendo las condiciones del [catálogo](../producto/HERRAMIENTAS_POR_IMPLEMENTAR.md) y del [sistema de diseño](../diseno/DESIGN.md).

Cada herramienta debe cumplir estas condiciones:

- Procesar entradas y archivos dentro del navegador, sin enviarlos a una API o servidor para transformarlos.
- Permitir el uso sin cuenta obligatoria y entregar resultados copiables, descargables o imprimibles según la tarea.
- Mantener entradas y resultados en memoria por defecto. Cualquier guardado de contenido debe ser una acción explícita, con una forma clara de eliminarlo.
- Excluir textos, contraseñas, nombres de archivos y resultados de medición, publicidad, logs y enlaces compartibles.
- Explicar formatos, compatibilidad y límites antes de empezar. Una incompatibilidad local termina en un mensaje útil, sin procesamiento remoto alternativo.
- Mostrar selección, progreso, cancelación cuando proceda, resultado, errores y limpieza de la sesión. Liberar recursos al cambiar de entrada o salir.
- Funcionar con teclado, pantallas móviles y los temas existentes; evitar acciones que dependan únicamente del color.
- Explicar y cargar por separado cualquier motor o recurso pesado. No afirmar funcionamiento sin conexión hasta haberlo comprobado con los recursos necesarios.

Servir la web o descargar una biblioteca puede producir conexiones. La condición es que esas conexiones no transporten contenido de las entradas ni resultados. Debe verificarse durante el flujo completo de cada herramienta.

## Resumen y orden sugerido

La prioridad es cualitativa: combina utilidad general, complejidad probable y ajuste a la política. No representa una medición de demanda ni una estimación de horas.

| ID | Propuesta | Prioridad | Integración propuesta | Estado |
| --- | --- | --- | --- | --- |
| N-01 | Crear y leer QR | Alta | Página nueva: `/herramientas/qr` | Desplegada y verificada |
| N-02 | Limpiar y ordenar texto | Alta | Taller nuevo: `/herramientas/texto` | Desplegada y verificada |
| N-03 | Generar contraseñas y frases | Alta | Página nueva: `/herramientas/contrasenas` | Desplegada y verificada |
| N-04 | Convertir unidades | Alta | Página nueva: `/herramientas/unidades` | Desplegada y verificada |
| N-05 | Calcular fechas y horarios | Alta-media | Taller nuevo: `/herramientas/fechas` | Desplegada y verificada |
| N-06 | Convertir y revisar colores | Alta | Taller nuevo: `/herramientas/colores` | Desplegada y verificada |
| N-07 | Renombrar archivos por lotes | Alta | Ampliación del módulo ZIP; acceso por tarea | Pendiente de implementación |
| N-08 | Crear códigos de barras | Alta-media | Página nueva: `/herramientas/codigos-de-barras` | Pendiente de implementación |
| N-09 | Generar documentos imprimibles | Alta-media | Página nueva: `/herramientas/imprimibles`; reutiliza utilidades PDF | Pendiente de implementación |
| N-10 | Preparar archivos para compartir | Alta-media | Flujo compuesto en el módulo ZIP | Pendiente de implementación |

Las diez propuestas no obligan a crear diez motores o páginas independientes. N-07 y N-10 deben compartir la infraestructura ZIP y distinguirse por su tarea. Los nombres y las rutas se revisarán frente al catálogo al implementarlas.

## N-01. Crear y leer QR

**Necesidad:** preparar un QR para un enlace, un texto, una red Wi-Fi o un contacto; leer uno recibido como imagen. Útil para compartir información en carteles, clases, tarjetas y el hogar.

**Alcance inicial:** formularios para texto, URL, Wi-Fi y contacto; vista previa; exportación PNG y SVG; lectura de una imagen local. La cámara es una ampliación opcional y solicita permiso únicamente cuando la persona inicia ese modo.

**Entrada y salida:** campos de texto o imagen seleccionada → QR descargable o contenido decodificado, visible y copiable.

**Implementación candidata:** evaluar [node-qrcode](https://github.com/soldair/node-qrcode) para generación y [ZXing Browser](https://github.com/zxing-js/browser) para lectura. Son candidatas de la investigación previa, no dependencias aprobadas o instaladas. Cargar la lectura cuando se necesite.

**Límites y decisiones:** validar la capacidad real del formato; rechazar entradas excesivas con explicación; conservar margen y contraste; escapar caracteres de Wi-Fi y contactos. Mostrar las URL completas y su protocolo. La contraseña Wi-Fi recibe el mismo trato privado que una contraseña generada. Un enlace abierto por el usuario puede llevar a otro servicio; el lector no debe abrirlo automáticamente.

**Criterios de aceptación:**

- [ ] Un QR generado se vuelve a leer con un lector independiente usando entradas sintéticas.
- [ ] Se prueban acentos, saltos de línea, caracteres especiales y datos Wi-Fi.
- [ ] Se muestra el contenido decodificado antes de ofrecer cualquier acción para abrirlo.
- [ ] Descargar PNG/SVG no requiere peticiones con el contenido.
- [ ] Si se incorpora cámara, denegar permisos no bloquea la lectura de imágenes y detener el modo libera la cámara.

## N-02. Limpiar y ordenar texto

**Necesidad:** corregir texto copiado, depurar listas y contar palabras para escritos, tareas y trabajo administrativo.

**Alcance inicial:** pegar texto o abrir TXT; quitar espacios repetidos, líneas vacías y líneas duplicadas; cambiar mayúsculas/minúsculas; ordenar líneas; contar caracteres, palabras y líneas. Cada transformación se activa de forma visible. Ofrecer vista original/resultado, deshacer, copiar y descargar TXT.

**Entrada y salida:** texto pegado o TXT → texto transformado y resumen de cambios.

**Implementación candidata:** funciones TypeScript locales; Worker para operaciones que puedan bloquear la interfaz. Un taller reúne las operaciones relacionadas.

**Límites y decisiones:** definir si las líneas duplicadas se comparan exactamente o ignorando espacios/mayúsculas; conservar por defecto el contenido que no se haya pedido transformar. Explicar orden alfabético y numérico, tratamiento de acentos y saltos de línea. Detectar problemas de codificación en lugar de reemplazar caracteres silenciosamente. Medir el tamaño máximo de TXT antes de fijar el límite público.

**Criterios de aceptación:**

- [ ] La vista previa permite conocer el resultado antes de sustituir la entrada.
- [ ] Deshacer restaura la versión previa y reiniciar elimina el contenido de la sesión.
- [ ] Las pruebas cubren tildes, ñ, emoji, tabulaciones, finales de línea distintos y entrada vacía.
- [ ] Copiar y descargar conservan exactamente el resultado mostrado.
- [ ] Las entradas grandes admitidas mantienen la interfaz operativa; una entrada fuera de límite se explica antes de procesar.

## N-03. Generar contraseñas y frases

**Necesidad:** crear credenciales y frases aleatorias sin entregar el resultado a un servicio externo.

**Alcance inicial:** generar una contraseña eligiendo longitud y grupos de caracteres; generar una frase con un diccionario incluido en el proyecto, cantidad de palabras y separador. Mostrar el resultado, regenerar y copiar por acción explícita. No conservar un historial de secretos.

**Entrada y salida:** preferencias de generación → contraseña o frase creada localmente.

**Implementación candidata:** aleatoriedad mediante [Crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues). Revisar el muestreo para evitar sesgo y el algoritmo usado si se exige presencia de cada grupo. Verificar licencia, composición y tamaño del diccionario antes de incluirlo.

**Límites y decisiones:** las longitudes y cantidades admitidas se fijarán después de revisar el algoritmo y la usabilidad. Explicar que la seguridad también depende del uso y del servicio de destino. No prometer invulnerabilidad ni usar `Math.random`. No almacenar secretos en URL, almacenamiento persistente, eventos o consola. Si falla la fuente aleatoria, detener la generación con un mensaje claro.

**Criterios de aceptación:**

- [ ] El código utiliza una fuente criptográfica y un muestreo sin sesgo; se revisan las combinaciones de opciones.
- [ ] Las opciones elegidas se cumplen sin ajustes silenciosos ni resultados vacíos.
- [ ] La frase usa exclusivamente un diccionario local con licencia documentada.
- [ ] Generar y copiar no producen solicitudes, logs ni almacenamiento con el resultado.
- [ ] Limpiar la sesión y salir eliminan el estado de la herramienta; se explica que el portapapeles depende del sistema del usuario.

## N-04. Convertir unidades

**Necesidad:** resolver conversiones cotidianas para estudio, cocina, bricolaje y tamaños de archivos.

**Alcance inicial:** longitud, masa, temperatura, área, volumen y almacenamiento digital; cantidad de origen, unidad de destino, intercambio de unidades y resultado copiable. Mostrar precisión y redondeo aplicado.

**Entrada y salida:** número y unidades → resultado numérico identificado con su unidad.

**Implementación candidata:** tablas y fórmulas incluidas en el cliente. Antes de implementar, documentar fuentes de referencia para cada factor y los desplazamientos de temperatura. No requiere consultar una API por conversión.

**Límites y decisiones:** distinguir MB de MiB; área y volumen usan factores distintos de longitud. Admitir decimales habituales en español con una regla explícita para coma, punto y separadores de miles; rechazar entradas ambiguas. Detectar resultados no finitos y valores fuera de rango. Las divisas, cotizaciones y tarifas no forman parte del alcance inicial.

**Criterios de aceptación:**

- [ ] Cada familia dispone de referencias y ejemplos verificables, incluyendo temperatura y almacenamiento binario/decimal.
- [ ] Las conversiones de ida y vuelta cumplen la tolerancia documentada.
- [ ] La precisión elegida no cambia el valor interno prematuramente.
- [ ] Cero, negativos admitidos, decimales y entradas inválidas reciben un tratamiento coherente.
- [ ] Copiar incluye una identificación inequívoca de la unidad y ninguna conversión requiere conexión.

## N-05. Calcular fechas y horarios

**Necesidad:** calcular días entre fechas, sumar o restar días y conocer una hora equivalente en otra zona para viajes, reuniones y plazos personales.

**Alcance inicial:** diferencia entre fechas de calendario; sumar/restar días; conversión de fecha y hora entre zonas seleccionadas. Mostrar la zona usada y si el cálculo incluye los extremos. Días hábiles opcionales con fines de semana definidos y festivos introducidos por el usuario.

**Entrada y salida:** fechas o fecha/hora con zona → diferencia, fecha calculada o equivalencia horaria.

**Implementación candidata:** APIs de fecha e internacionalización del navegador y una estrategia verificada para convertir horas locales en instantes. Elegir una biblioteca solo si resuelve casos que las utilidades disponibles no cubren. El formato visual y la conversión temporal deben revisarse por separado.

**Límites y decisiones:** distinguir una fecha de calendario de un instante con zona; no asumir que cada día dura siempre 24 horas. Mostrar la zona detectada inicialmente y permitir cambiarla. Resolver explícitamente horas ambiguas o inexistentes por cambios de horario estacional. No cargar calendarios de festivos desde un servicio externo.

**Criterios de aceptación:**

- [ ] Se prueban años bisiestos, fin de mes, cruce de año y orden invertido de fechas.
- [ ] El resultado diferencia días de calendario y duración transcurrida cuando corresponda.
- [ ] Se prueban zonas con y sin cambios estacionales, incluyendo horas ambiguas e inexistentes.
- [ ] Las reglas sobre extremos y días hábiles son visibles y reproducibles.
- [ ] Los resultados indican la zona y utilizan una fecha inequívoca al copiar.

## N-06. Convertir y revisar colores

**Necesidad:** preparar colores coherentes para presentaciones, carteles y diseños; comprobar la legibilidad de texto sobre un fondo.

**Alcance inicial:** introducir o seleccionar un color, convertir HEX/RGB/HSL, crear una paleta manual y comparar texto/fondo. Mostrar muestras y valores copiables; descargar la paleta como archivo de texto o JSON.

**Entrada y salida:** colores y opacidad → valores equivalentes, paleta y relación de contraste.

**Implementación candidata:** fórmulas locales. Documentar la especificación y versión aplicadas al cálculo de contraste antes de implementarlo; comprobar conversión, luminancia y composición de transparencias.

**Límites y decisiones:** el alcance inicial se limita a los formatos y espacio de color expresamente admitidos. Con transparencia, solicitar o mostrar el fondo efectivo. Explicar el efecto del tamaño del texto en la interpretación del contraste. El resultado evalúa esa combinación; no certifica la accesibilidad de una página completa.

**Criterios de aceptación:**

- [ ] Conversión de ida y vuelta y contraste coinciden con casos de referencia documentados.
- [ ] Opacidad y fondo efectivo están visibles y participan en el cálculo.
- [ ] Las entradas inválidas no se convierten silenciosamente en otro color.
- [ ] Muestras y resultados disponen de etiquetas utilizables con teclado y lector de pantalla.
- [ ] Exportar la paleta conserva nombres y valores sin recurrir a una API de colores.

## N-07. Renombrar archivos por lotes

**Necesidad:** ordenar fotos, apuntes y documentos con nombres consistentes antes de archivarlos o enviarlos.

**Alcance inicial:** seleccionar archivos, añadir prefijo/sufijo, sustituir texto y numerar; vista antes/después; ajuste de orden; descarga de copias en ZIP con los nuevos nombres. Conservar extensiones por defecto.

**Entrada y salida:** archivos y reglas → tabla de nombres propuestos y ZIP descargable.

**Implementación candidata:** File API y la infraestructura JSZip existente. Evaluar junto a N-10 un modelo común de selección, límites, cancelación y nombres seguros. Presentar el flujo como una tarea del módulo ZIP.

**Límites y decisiones:** no modificar originales en disco en el alcance inicial. Detectar duplicados, nombres vacíos, separadores de ruta y nombres incompatibles con sistemas habituales. Resolver colisiones con aviso y vista previa, nunca sobrescribiendo silenciosamente. Definir cantidad y volumen máximo después de medir memoria y generación del ZIP; mostrar el límite antes de seleccionar.

**Criterios de aceptación:**

- [ ] El archivo extraído conserva los mismos bytes del original y solo cambia el nombre solicitado.
- [ ] Se prueban tildes, nombres repetidos, diferencias de mayúsculas y múltiples puntos/extensiones.
- [ ] La vista previa coincide con todos los nombres del ZIP y explica las colisiones resueltas.
- [ ] El orden de numeración se puede comprobar y ajustar antes de generar.
- [ ] Cancelar o limpiar libera referencias a archivos y resultados; el tamaño fuera de límite se explica.

## N-08. Crear códigos de barras

**Necesidad:** crear etiquetas para inventario doméstico, material escolar o identificación interna de un pequeño negocio.

**Alcance inicial:** CODE128 y EAN-13, con validación específica; vista previa; SVG/PNG; hoja imprimible de etiquetas con medidas y separación configurables. Permitir empezar por un único código antes de añadir lotes.

**Entrada y salida:** identificador y ajustes de etiqueta → código e impresión local.

**Implementación candidata:** elegir una biblioteca cliente después de revisar licencia, mantenimiento, tamaño y soporte de los formatos. Registrar la dependencia y las fuentes de validación en la implementación. Reutilizar la maquetación imprimible de N-09 cuando convenga.

**Límites y decisiones:** cada formato tiene reglas propias de caracteres, longitud y dígito de control. Definir si EAN-13 recibe 12 dígitos para calcular el control o 13 para validarlo y explicarlo en la interfaz. Respetar márgenes y medidas legibles. Crear un EAN no concede un identificador comercial registrado ni verifica su asignación.

**Criterios de aceptación:**

- [ ] Se validan entradas correctas, incorrectas y dígitos de control con fuentes documentadas.
- [ ] Un lector independiente reconoce las exportaciones usando identificadores de prueba.
- [ ] PNG y SVG representan el mismo contenido y preservan márgenes.
- [ ] La hoja impresa mantiene medidas comprobadas a escala indicada y advierte sobre ajuste automático de impresión.
- [ ] No se consulta un catálogo externo para generar o validar los códigos.

## N-09. Generar documentos imprimibles

**Necesidad:** preparar listas de tareas, fichas, etiquetas y presupuestos sencillos sin subir datos personales.

**Alcance inicial:** un conjunto breve de plantillas incluidas en el proyecto; formulario local; tamaño de papel y previsualización; descarga PDF e impresión. Exportación e importación manual de un borrador con formato documentado, si se incluye en la primera versión.

**Entrada y salida:** campos y ajustes de plantilla → documento PDF; borrador local opcional.

**Implementación candidata:** reutilizar `pdf-lib` y utilidades del módulo PDF. Fuentes con licencia compatible y caracteres españoles; plantillas versionadas con la aplicación. Compartir componentes de impresión con N-08 sin duplicar la lógica.

**Límites y decisiones:** datos en memoria por defecto. El borrador exportado puede contener información personal y la interfaz debe indicarlo. Prevenir recortes por textos largos, errores de paginación y discrepancias entre vista previa y PDF. Un presupuesto básico no equivale a un sistema de facturación fiscal ni acredita cumplimiento tributario.

**Criterios de aceptación:**

- [ ] Cada plantilla se prueba con campos vacíos, textos extensos, tildes, ñ y varias páginas.
- [ ] El PDF mantiene márgenes, fuentes y saltos de página al abrirlo en un visor independiente.
- [ ] La previsualización corresponde al documento descargado y al tamaño de papel elegido.
- [ ] Si hay borradores, importar/exportar conserva sus datos y rechaza formatos inválidos sin ejecutar contenido.
- [ ] Limpiar elimina el estado; rellenar, previsualizar y exportar no envían datos ni solicitan plantillas con contenido personal.

## N-10. Preparar archivos para compartir

**Necesidad:** revisar un conjunto de archivos y entregar un paquete claro con un listado de lo que contiene.

**Alcance inicial:** selección de archivos, lista revisable con nombre/tamaño, eliminación de elementos, reglas de nombre compartidas con N-07 y ZIP descargable. Incluir un manifiesto TXT o JSON. Las huellas SHA-256 son una función opcional a evaluar después del flujo básico.

**Entrada y salida:** archivos seleccionados y ajustes → paquete ZIP y manifiesto; huellas opcionales por archivo.

**Implementación candidata:** ampliar la herramienta ZIP existente. Si se incorporan huellas, decidir entre una API local con límite de entrada completa y un motor incremental para volúmenes mayores, después de evaluar memoria y dependencias. No se necesita un servicio de alojamiento o de enlaces de descarga.

**Límites y decisiones:** compartir consiste en preparar la descarga; el usuario decide posteriormente dónde enviar el paquete. No introducir nombres ni contenido en URL. Un manifiesto revela los nombres que contiene y debe ser revisable. Una huella comprueba bytes frente a una referencia; no detecta malware ni anonimiza. No prometer eliminación de metadatos de formatos que no se inspeccionan. Esta propuesta no reactiva automáticamente un verificador independiente descartado previamente.

**Criterios de aceptación:**

- [ ] El paquete contiene exactamente los elementos confirmados y permite retirar cualquiera antes de generarlo.
- [ ] El manifiesto coincide con nombres y tamaños finales y tiene un nombre sin colisión con las entradas.
- [ ] Los archivos extraídos conservan su contenido; cualquier transformación futura debe indicarse y elegirse expresamente.
- [ ] Si hay SHA-256, se comparan resultados con una implementación independiente y se prueban límites/cancelación.
- [ ] Preparar el paquete no sube archivos, crea enlaces con datos ni modifica originales.

## Fases sugeridas y dependencias

1. **Utilidades ligeras:** N-02, N-04 y N-06. Validar patrones de entrada, vista previa, copiar, descargar y limpiar, sin motores pesados.
2. **Generación y lectura:** N-01 y N-03. Revisar QR con lectura independiente y el algoritmo aleatorio con especial atención al manejo de secretos.
3. **Fechas:** N-05. Resolver y probar zonas, cambios estacionales y reglas de calendario antes de anunciar la herramienta.
4. **Archivos:** N-07 y N-10. Compartir selección y nombres; medir memoria y límites sobre la infraestructura ZIP existente.
5. **Impresión:** N-08 y N-09. Compartir exportación y maquetación; verificar lectores y documentos impresos.

El orden de estas fases responde a dependencias y validación técnica; no altera los identificadores ni constituye un compromiso de calendario. Las [mejoras de herramientas existentes](MEJORAS_HERRAMIENTAS_EXISTENTES.md) conservan su seguimiento separado.

Antes de adoptar una dependencia, registrar versión, licencia, mantenimiento, tamaño de descarga, carga diferida y permisos. Las ideas extraídas de otras páginas no autorizan copiar código sin revisar su licencia. Los límites numéricos definitivos deben salir de mediciones y mostrarse tanto en interfaz como en documentación.

## Validación común antes de publicar

- [ ] Confirmar funcionamiento local con entradas sintéticas e inspeccionar solicitudes durante selección, transformación, copia y descarga.
- [ ] Repetir la comprobación con servicios opcionales rechazados y aceptados; ninguna entrada, nombre o resultado aparece en peticiones, URL, logs o eventos.
- [ ] Comprobar entrada vacía, inválida, dentro y fuera de límite; error de permisos cuando aplique; cancelación, repetición y limpieza.
- [ ] Verificar teclado, lector de pantalla, móvil y temas. Los errores deben identificar qué corregir.
- [ ] Aplicar pruebas específicas a los algoritmos y formatos, no solo comprobar que la página carga.
- [ ] Medir rendimiento y memoria para establecer límites públicos y liberar recursos.
- [ ] Añadir al catálogo, portada, navegación y metadatos únicamente capacidades terminadas y comprobadas.
- [ ] Ejecutar los controles aplicables de la [guía de despliegue](../operacion/GUIA_DESPLIEGUE_ACTUALIZACIONES.md), verificar la versión pública y registrar evidencia en el [historial](../historial/REGISTRO_DESPLIEGUE.md).

## Seguimiento

Estados sugeridos: pendiente de implementación, en análisis, en desarrollo, en pruebas, bloqueada, completada, desplegada o descartada. «Completada» requiere cumplir el alcance acordado; «desplegada» requiere comprobación en la página oficial. Si cambia el alcance, actualizar la propuesta antes de anunciarla.

| Fecha | Propuesta | Estado | Cambio y evidencia |
| --- | --- | --- | --- |
| 2026-10-08 | N-01 a N-10 | Pendiente de implementación | Especificación inicial basada en la auditoría comparativa. Sin cambios de código ni nuevas herramientas publicadas. |
| 2026-10-08 | N-01 | Completada; publicación pendiente | Generación y lectura local QR, PNG/SVG, Wi-Fi y vCard. Cinco pruebas de algoritmo y flujo de navegador aprobados. [Decisiones y límites](N-01_IMPLEMENTACION.md). |
| 2026-10-08 | N-02 | Completada; publicación pendiente | Taller TXT con Worker, vista previa, deshacer, copiar y descargar. Diez pruebas de algoritmo y cinco de navegador aprobadas. [Decisiones y límites](N-02_IMPLEMENTACION.md). |
| 2026-10-08 | N-03 | Completada; publicación pendiente | Contraseñas criptográficas y frases EFF locales. Diez pruebas de algoritmo y cinco de navegador aprobadas. [Decisiones y límites](N-03_IMPLEMENTACION.md). |
| 2026-10-08 | N-01 a N-03 | Desplegadas y verificadas | Commit `b63011f7e7a7f678222414911959b33a946dacad`; Cloudflare Workers y Pages correctos. Quince comprobaciones de navegador aprobadas en producción y 23 rutas HTTP 200. [Registro público](../historial/REGISTRO_DESPLIEGUE.md). |
| 2026-10-08 | N-04 a N-06 | Desplegadas y verificadas | Commit `4bf5f6acddb2bf8a7e7e6d8258f859f4dca35a7c`; Cloudflare Workers y Pages correctos. Treinta pruebas de algoritmos nuevos, 35 de regresión y 21 comprobaciones de navegador en producción aprobadas; 26 rutas HTTP 200. [Decisiones, límites y evidencia](../historial/REGISTRO_DESPLIEGUE.md). |

Validación conjunta local: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`; 25 pruebas de los algoritmos nuevos, 10 de regresión existentes y 15 comprobaciones de navegador en Chrome instalado contra el build servido por Wrangler. Las mismas 15 comprobaciones pasan también en la página oficial después del despliegue. Las cuatro comprobaciones comunes verifican directorio/sitemap, exclusión de scripts opcionales con consentimiento aceptado, entrada desde otro documento y ancho 320 px en ambos temas. Se revisaron capturas móviles. No se certifican otros navegadores ni trabajo sin conexión.

QR, texto y contraseñas se aíslan de medición/publicidad opcionales, incluso con consentimiento aceptado. La navegación desde el directorio abre un documento nuevo; el proveedor compartido también impide montar los campos si quedan scripts opcionales de una navegación previa. Se verifican copia/descarga, limpieza, cancelación cuando aplica y retorno mediante historial con entradas sintéticas.

En cada avance registrar ID, alcance entregado, decisiones, pruebas, limitaciones y referencia al commit o despliegue cuando exista. Conservar las fuentes y el alcance documental de la [auditoría original](../auditorias/AUDITORIA_COMPARATIVA.md); este documento desarrolla propuestas, no certifica los sitios comparados.
