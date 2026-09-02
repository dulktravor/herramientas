# Sistema de diseño de CeroNube

## 1. Propósito del documento

Este documento define la identidad visual, las reglas de interfaz y los criterios de experiencia de CeroNube. Su objetivo es mantener una expresión reconocible y consistente al crear nuevas páginas, herramientas, piezas de producto o materiales de comunicación.

La referencia ejecutable del sistema está en `app/globals.css` y en los componentes compartidos. Cuando una regla de este documento y la implementación difieran, se debe revisar la intención del cambio y actualizar ambas fuentes en la misma entrega.

## 2. Fundamentos de marca

### Nombre y promesa

- **Marca:** CeroNube
- **Descriptor:** herramientas privadas para tus archivos
- **Línea principal:** “Resuelve aquí. No subas nada.”
- **Firma institucional:** “CeroNube — utilidades que trabajan en tu navegador”

### Propuesta de valor

CeroNube reúne herramientas para imágenes, PDF, audio y datos que priorizan el procesamiento en el dispositivo. La experiencia debe comunicar tres ideas con rapidez:

1. la tarea se puede completar sin crear una cuenta;
2. el archivo permanece en el navegador siempre que la función lo permita;
3. el resultado se obtiene mediante un flujo breve, comprensible y descargable.

### Personalidad

CeroNube es clara, competente, cercana y tranquila. Se comporta como una herramienta confiable: explica lo necesario, no dramatiza la privacidad y no añade pasos para aparentar complejidad.

La marca evita dos extremos:

- el lenguaje intimidante de la ciberseguridad;
- la estética infantil o la promesa de resultados “mágicos”.

### Principios de diseño

#### La tarea primero

Cada página de herramienta presenta pronto el control principal: cargar, pegar, escribir, editar o convertir. La explicación acompaña la acción y no la desplaza debajo de contenido promocional innecesario.

#### Privacidad verificable

Las afirmaciones describen lo que realmente hace cada función. “Procesado en este dispositivo” se usa cuando el proceso ocurre localmente. Si una herramienta necesita descargar un modelo o contactar un servicio externo, debe explicarlo junto al punto de uso.

#### Calidez técnica

La interfaz combina estructura precisa, tipografía nítida y fondos cálidos. Debe sentirse tecnológica sin ser fría y privada sin recurrir a clichés visuales como hackers, candados gigantes o nubes tachadas.

#### Menos decisiones, mejores resultados

Solo se muestran opciones que cambian de forma útil el resultado. Los valores predeterminados deben permitir completar la mayoría de las tareas sin configuración avanzada.

## 3. Identidad visual

### Logotipo

El logotipo horizontal combina el símbolo con la palabra **CeroNube**. “Cero” usa el color de texto principal y “Nube” el color primario. Se emplea en cabeceras, pies y espacios donde haya ancho suficiente.

El símbolo representa un entorno local de navegador que contiene un archivo en movimiento. Sus cuatro colores maestros son:

- petróleo `#083F43`;
- cian `#1EC8C8`;
- arena `#F4EAD7`;
- mandarina `#FF8A3D`.

El símbolo aislado se reserva para favicon, icono de aplicación, avatar social y espacios compactos. Debe conservar siempre su proporción cuadrada y sus formas internas; no se recolorea por categoría ni se reconstruye con iconos genéricos.

### Uso y reducción

- Tamaño habitual del símbolo en navegación: `36 px`.
- Tamaño maestro del SVG: retícula de `48 × 48`.
- Para tamaños muy pequeños se usa el activo vectorial específico, sin añadir texto.
- El área libre mínima alrededor del símbolo equivale aproximadamente a una cuarta parte de su ancho.
- El logotipo no se estira, inclina, encierra en otra forma ni recibe sombras decorativas.

### Activos maestros

- `components/brand-logo.tsx`: símbolo y logotipo usados por la interfaz.
- `public/ceronube-mark.svg`: símbolo reutilizable.
- `public/favicon.svg` y `app/icon.svg`: iconografía del navegador y de la aplicación.
- `public/og.png`: tarjeta horizontal para compartir el sitio.

## 4. Sistema cromático

Los componentes deben consumir variables semánticas; los hexadecimales directos se reservan para la marca, superficies institucionales o identidades especiales de una herramienta.

### Tema claro

| Token | Valor | Uso principal |
| --- | --- | --- |
| `background` | `#F8F3E9` | fondo general cálido |
| `foreground` | `#0A383B` | texto y contenido de alta jerarquía |
| `card` / `popover` | `#FFFDF8` | tarjetas, menús y superficies de trabajo |
| `primary` | `#08666A` | acciones principales, enlaces y énfasis |
| `primary-foreground` | `#FFFAF1` | texto sobre el color primario |
| `secondary` | `#DFF4F1` | etiquetas, iconos y selección suave |
| `secondary-foreground` | `#083F43` | contenido sobre superficies secundarias |
| `muted` | `#EEE8DC` | fondos auxiliares y áreas inactivas |
| `muted-foreground` | `#5D6F6C` | texto secundario y ayudas |
| `accent` | `#FFE1CA` | énfasis cálido puntual |
| `accent-foreground` | `#713915` | texto sobre el acento cálido |
| `border` | `#D8DED6` | divisores y contornos |
| `input` | `#CBD7D2` | borde de campos |
| `ring` | `#1EC8C8` | foco visible |

### Tema oscuro

El modo oscuro es neutro y profundo. El verde de marca funciona como acento; no debe teñir grandes extensiones del fondo.

| Token | Valor | Uso principal |
| --- | --- | --- |
| `background` | `#090C10` | fondo general casi negro |
| `foreground` | `#F1EDE5` | texto principal cálido |
| `card` | `#12171E` | tarjetas y superficies de trabajo |
| `popover` | `#141A22` | capas flotantes |
| `primary` | `#4BD8D3` | acciones y énfasis de marca |
| `primary-foreground` | `#071012` | texto sobre acciones primarias |
| `secondary` | `#1A222B` | selección y superficies secundarias |
| `secondary-foreground` | `#D7F6F3` | contenido secundario destacado |
| `muted` | `#171D25` | áreas auxiliares |
| `muted-foreground` | `#9AA5AF` | texto de apoyo |
| `accent` | `#33241C` | acento cálido oscuro |
| `accent-foreground` | `#FFC79F` | texto del acento cálido |
| `border` | `#29323D` | divisores y contornos |
| `input` | `#343E4A` | campos y estados inactivos |
| `ring` | `#1EC8C8` | foco visible |

### Colores por categoría

Las categorías ayudan a reconocer herramientas, pero nunca sustituyen al nombre o al icono.

| Categoría | Tema claro | Tema oscuro |
| --- | --- | --- |
| Imágenes | fondo `#DFF4F1`, texto `#08666A` | fondo `#17272B`, texto `#66E1DC` |
| PDF | fondo `#FFE1CA`, texto `#713915` | fondo `#30231D`, texto `#FFB27E` |
| Datos | fondo `#083F43`, texto `#F4EAD7` | fondo `#202731`, texto `#F1EDE5` |
| Audio | fondo `#EEE3FF`, texto `#60309A` | fondo `#292033`, texto `#D7B5FF` |
| Vídeo | fondo `#FEE2E2`, texto `#991B1B` | fondo `#331C20`, texto `#FCA5A5` |

### Reglas de contraste

- El texto largo usa `foreground` o `muted-foreground` sobre su superficie semántica.
- El cian brillante no se usa como texto pequeño sobre arena o blanco.
- El mandarina es un detalle de identidad, no el color habitual de acciones.
- Error, éxito y progreso deben incluir texto o iconografía; el color no puede ser la única señal.
- Las superficies institucionales oscuras pueden usar petróleo en tema claro y gris azulado profundo en tema oscuro.

## 5. Tipografía

### Familias

- **Geist Sans:** interfaz completa, títulos, navegación y textos.
- **Geist Mono:** numeración de pasos, datos tabulares, formatos, código y contenido técnico.

No se introducen familias decorativas en el producto. El reconocimiento nace del ritmo, el contraste y la marca, no de mezclar tipografías.

### Jerarquía

| Nivel | Tamaño orientativo | Peso | Interlineado y tracking | Uso |
| --- | --- | --- | --- | --- |
| Hero | `48 px` móvil / `72 px` escritorio | 600 | `0.98`, `-0.055em` | promesa principal de inicio |
| Título de página | `36 px` móvil / `48 px` escritorio | 600 | compacto, `-0.045em` | herramientas e información |
| Título de sección | `30–36 px` | 600 | `-0.035em` | bloques principales |
| Título de tarjeta | `18 px` | 600 | compacto | nombre de herramienta o función |
| Cuerpo destacado | `16–18 px` | 400 | `28 px` | introducciones y mensajes clave |
| Cuerpo | `14–16 px` | 400 | `20–24 px` | instrucciones y descripciones |
| Etiqueta | `12–14 px` | 500–600 | tracking normal o amplio en mayúsculas | categorías, estados y metadatos |

Los títulos usan equilibrio de líneas cuando el navegador lo permite. Los párrafos de lectura se limitan normalmente a `42–65` caracteres por línea.

## 6. Retícula, espacio y adaptación

### Contenedores

- Navegación, secciones principales y pie: máximo `1280 px` (`max-w-7xl`).
- Cabecera de una herramienta: máximo `1152 px` (`max-w-6xl`).
- Hero de inicio: máximo `896 px` (`max-w-4xl`).
- Páginas informativas: máximo `768 px` (`max-w-3xl`).
- Búsqueda de herramientas: máximo `672 px` (`max-w-2xl`).

### Márgenes y ritmo

- Margen lateral: `20 px` en móvil y `32 px` desde `640 px`.
- Separación habitual entre elementos relacionados: `8`, `12` o `16 px`.
- Separación entre bloques de un componente: `20`, `24` o `40 px`.
- Separación entre secciones: `64–96 px` según jerarquía.
- Cabecera fija: `72 px` de alto.

La escala se apoya en múltiplos de `4 px`, con preferencia por `8 px` para el ritmo general.

### Puntos de adaptación

- Base: una columna desde `320 px`.
- `sm` (`640 px`): más aire lateral, acciones en fila y tipografía ampliada.
- `md` (`768 px`): directorio a dos columnas y navegación completa visible.
- `lg` (`1024 px`): directorio a tres columnas y superficies de trabajo divididas.

En móvil se mantiene primero la acción principal. Las etiquetas secundarias pueden ocultarse, pero los botones conservan nombre accesible. Ninguna herramienta debe depender exclusivamente de arrastrar archivos: siempre existe un selector nativo alternativo.

## 7. Formas, bordes y profundidad

La base de radio es `12 px`.

- Campos y botones: `8–12 px`.
- Iconos contenidos: `12–16 px`.
- Tarjetas: `16–18 px`.
- Superficies principales y zonas de carga: `24–26 px`.
- Etiquetas y filtros: radio completo.

La jerarquía se construye primero con contraste de superficie y un contorno fino. Las sombras son suaves y se reservan para elementos interactivos destacados, cabeceras translúcidas, tarjetas al pasar el cursor y el aviso flotante de consentimiento.

- Contorno habitual: `1 px` con `border` o `foreground` al `10%`.
- Sombra de tarjeta interactiva: difusa, baja opacidad y sin negro duro.
- Elevación en hover: hasta `4 px`; nunca debe alterar el flujo del documento.
- Cabecera: fondo al `88%`, desenfoque y borde inferior tenue.

## 8. Iconografía y recursos gráficos

La interfaz usa iconos lineales de Lucide, normalmente de `16` o `20 px`, con grosor consistente. Los iconos acompañan un texto o tienen una etiqueta accesible cuando son la única representación de una acción.

Motivos propios de CeroNube:

- retícula de puntos: tecnología local y organización;
- halo cian con un matiz mandarina: energía contenida en el dispositivo;
- ventana, archivo y líneas de movimiento del símbolo: procesamiento inmediato.

Estos motivos son ambientales y llevan `aria-hidden`. No compiten con controles ni se usan detrás de texto largo.

La fotografía solo se incorpora cuando ayuda a explicar un caso de uso real. Las capturas de producto deben mostrar una tarea concreta, pocos datos y ningún archivo privado identificable.

## 9. Componentes de interfaz

### Cabecera

- Fija al borde superior.
- Logotipo a la izquierda.
- Navegación contextual en el centro o a la derecha cuando hay espacio.
- Selector de tema siempre disponible.
- Acción principal o retorno al listado en el extremo derecho.
- En móvil, la acción puede convertirse en icono, pero conserva `aria-label`.

### Botones

- **Primario:** fondo `primary`, texto `primary-foreground`; una acción principal por bloque.
- **Secundario:** superficie `secondary`; acciones útiles sin prioridad dominante.
- **Contorno:** límites `border`; configuración, reemplazo o acciones alternativas.
- **Fantasma:** navegación local y acciones de baja prioridad.
- **Destructivo:** solo para operaciones irreversibles o errores accionables.

Estados obligatorios: reposo, hover, foco visible, activo, deshabilitado y ocupado cuando la acción tarda. El texto debe describir el resultado: “Descargar PDF” es preferible a “Continuar”.

### Campos

- Etiqueta visible o alternativa `sr-only` cuando el contexto ya identifica el campo.
- Borde completo, fondo compatible con tema y anillo de foco de `3 px`.
- Ayuda breve debajo del control cuando afecta el resultado.
- Errores cerca del campo, con texto claro y `role="alert"` cuando corresponda.
- Los editores de datos o texto reconocido usan Geist Mono.

### Búsqueda y filtros

La búsqueda principal mide `56 px` de alto, usa icono a la izquierda y un ejemplo de intención en el placeholder. Los filtros son píldoras con `aria-pressed`; la selección combina fondo, borde y texto para no depender solo del color. El número de resultados se anuncia con `aria-live="polite"`.

### Tarjetas de herramientas

- Mínimo aproximado de `256 px` de alto.
- Icono de categoría arriba a la izquierda y categoría textual a la derecha.
- Nombre, descripción, estado de procesamiento y ausencia de registro.
- Hover con elevación leve, contorno primario y franja superior.
- Toda la tarjeta puede ser enlace y recibe foco visible.

### Zonas de carga

- Superficie `card`, borde discontinuo con matiz primario y radio grande.
- Icono de `56 px` contenido en una superficie secundaria.
- Instrucción principal, formatos admitidos y selector de archivos.
- El estado de arrastre refuerza el borde y el fondo, sin desplazar contenido.
- La carga inicial se reemplaza por el espacio de trabajo; no se conserva como un paso redundante.

### Superficies de trabajo

Las herramientas usan tarjetas amplias con fondo `card`, radio `24 px`, relleno de `20–24 px` y contorno tenue. Los flujos de comparación dividen origen y resultado; los editores técnicos pueden usar identidades cromáticas propias si mantienen la navegación, la legibilidad y los estados accesibles de CeroNube.

### Etiquetas y estados

Los badges comunican categoría, procesamiento local, disponibilidad o progreso. Tienen forma de píldora, altura compacta y texto explícito. Nunca se utiliza “seguro” como estado genérico si la interfaz no puede demostrarlo.

### Aviso y centro de consentimiento

El aviso aparece como tarjeta flotante inferior, no bloquea la lectura y presenta tres caminos claros: solo necesarias, configurar y aceptar todo. El centro de preferencias usa filas separadas, icono, explicación y control. La elección se confirma mediante mensaje vivo y permanece disponible desde Privacidad.

### Pie

Incluye logotipo, descriptor, navegación informativa, año y línea de marca. Usa una superficie `card` translúcida y un borde superior; no incorpora llamadas comerciales que compitan con el cierre de la página.

## 10. Arquitectura de páginas

### Inicio

Orden recomendado:

1. cabecera fija;
2. sello de procesamiento local;
3. promesa principal y descripción;
4. cifras de producto;
5. búsqueda, filtros y directorio de herramientas;
6. bloque de privacidad con pruebas concretas;
7. flujo de tres pasos;
8. llamada final a elegir una herramienta;
9. pie.

El primer viewport debe identificar la marca y permitir llegar al directorio sin ambigüedad.

### Página de herramienta

Orden recomendado:

1. cabecera con retorno al directorio;
2. badge “Procesado en este dispositivo” cuando sea exacto;
3. nombre y beneficio de la herramienta;
4. superficie de trabajo;
5. progreso, resultado, errores y descarga dentro del mismo contexto;
6. espacio publicitario posterior al trabajo principal;
7. pie.

La publicidad nunca interrumpe la selección, el procesamiento o la descarga.

### Página informativa

Usa una columna estrecha, antetítulo, título, introducción y bloques de lectura. Los títulos internos permanecen en `foreground`, los párrafos en `muted-foreground` y los enlaces se subrayan. Privacidad y términos priorizan precisión sobre mensajes de campaña.

## 11. Tema oscuro

El tema inicial sigue la preferencia del sistema si la persona no ha elegido uno. La preferencia manual se guarda con la clave `ceronube-theme` y se aplica antes de pintar la página para evitar un destello del tema incorrecto.

Reglas de implementación:

- alternar la clase `.dark` en `<html>`;
- sincronizar `color-scheme` con el tema activo;
- definir cada color mediante tokens compartidos;
- comprobar todos los componentes, estados y activos en ambos temas;
- conservar fondos principales casi negros y superficies gris azulado;
- reservar cian y petróleo para acciones, identidad y zonas institucionales;
- no convertir el modo oscuro en una versión verde de la página.

## 12. Movimiento e interacción

El movimiento confirma acciones y refuerza la respuesta del sistema.

- Transiciones habituales: `180–200 ms` con aceleración suave.
- Tarjetas: desplazamiento vertical de `3–4 px` en hover.
- Símbolo del logotipo: rotación máxima de `-3°` en hover.
- Botones: descenso de `1 px` al activarse.
- Cambios de tema: transición breve de fondo y texto.
- Procesos largos: indicador de progreso y mensaje de estado; no usar animación como única explicación.

Con `prefers-reduced-motion: reduce`, se desactivan el desplazamiento suave y las transiciones no esenciales.

## 13. Voz y contenido

### Estilo

- Español claro y neutral.
- Segunda persona singular.
- Verbos de acción al comienzo de instrucciones y botones.
- Frases cortas; tecnicismos solo cuando ayudan a decidir.
- Beneficio antes que mecanismo, salvo en mensajes de privacidad.

### Patrones recomendados

- “Elige tus archivos.”
- “Ajusta el resultado.”
- “Descarga el PDF.”
- “El archivo se procesa en este dispositivo.”
- “La primera ejecución descarga el modelo; el archivo no se envía a CeroNube.”

### Patrones que se evitan

- superlativos sin prueba como “la mejor herramienta”;
- urgencia artificial;
- “100 % seguro” o “totalmente anónimo” sin sustento técnico;
- mensajes vagos como “Ocurrió un error”; se debe indicar qué puede hacer la persona;
- prometer procesamiento local para una función que usa un servicio remoto.

## 14. Accesibilidad

- Compatibilidad desde `320 px` sin desplazamiento horizontal general.
- Orden semántico de encabezados y regiones de navegación identificadas.
- Foco visible de alto contraste en enlaces, botones, tarjetas y campos.
- Controles táctiles de al menos `36–40 px`; aumentar cuando el contexto lo permita.
- Nombre accesible en acciones representadas solo por iconos.
- Iconos decorativos fuera del árbol accesible.
- Mensajes de error con `role="alert"` y cambios no urgentes con `aria-live="polite"`.
- Filtros con estado programático mediante `aria-pressed`.
- Alternativa de teclado y selector de archivos para interacciones de arrastre.
- Contraste revisado tanto en tema claro como oscuro.
- Respeto por la preferencia de movimiento reducido.

## 15. Metadatos y presencia social

La tarjeta social usa formato horizontal `1733 × 917`, el nombre CeroNube y la línea “Resuelve aquí. No subas nada.”. Debe mantener la misma paleta y el símbolo oficial, con texto legible incluso en miniatura.

Metadatos base:

- título: `CeroNube — Resuelve aquí. No subas nada.`;
- descripción: utilidades privadas para imágenes, PDF, audio y datos procesadas en el navegador;
- idioma y localización: español, `es_CO` donde corresponda;
- imagen compartida: `/og.png` con texto alternativo específico.

Las páginas que representen una herramienta deben describir esa herramienta en su título y resumen. No se usan imágenes genéricas que contradigan la promesa de procesamiento local.

## 16. Criterios para nuevas herramientas

Antes de incorporar una herramienta nueva:

1. definir el problema en una frase comprensible;
2. confirmar dónde se procesa cada dato;
3. asignar una categoría, icono y términos de búsqueda;
4. diseñar carga, vacío, procesamiento, éxito y error;
5. ofrecer descarga o copia con nombre de archivo útil;
6. verificar móvil, teclado, tema oscuro y movimiento reducido;
7. documentar cualquier descarga de modelos, limitación del navegador o excepción de privacidad.

No se crea un patrón visual nuevo cuando un componente compartido resuelve la necesidad. Las excepciones se reservan para superficies especializadas —por ejemplo, un editor musical— y deben seguir conectadas al sistema mediante navegación, tipografía, estados y accesibilidad.

## 17. Lista de control visual

- [ ] El nombre CeroNube y su símbolo usan los activos oficiales.
- [ ] La acción principal es evidente y aparece antes que contenido secundario.
- [ ] Los colores provienen de tokens y funcionan en claro y oscuro.
- [ ] El modo oscuro se percibe negro o gris profundo, no verde dominante.
- [ ] La jerarquía tipográfica coincide con la importancia del contenido.
- [ ] Espaciado, radios, bordes y sombras siguen la escala común.
- [ ] Hover, foco, activo, deshabilitado, carga, éxito y error están definidos.
- [ ] La experiencia funciona desde `320 px` y no depende del puntero.
- [ ] Las afirmaciones sobre privacidad coinciden con el comportamiento real.
- [ ] La publicidad y los mensajes institucionales no interrumpen la tarea.
- [ ] El texto es directo, específico y coherente con la voz de CeroNube.
- [ ] Los metadatos y la tarjeta social representan la versión actual de la marca.

## 18. Mapa de implementación

| Área | Fuente principal |
| --- | --- |
| Tokens, temas, selección, movimiento y estilos globales | `app/globals.css` |
| Fuentes, metadatos y aplicación temprana del tema | `app/layout.tsx` |
| Nombre, línea, descripción y catálogo público | `lib/site.ts` |
| Marca vectorial | `components/brand-logo.tsx` |
| Selector de tema | `components/theme-toggle.tsx` |
| Directorio, búsqueda, filtros y tarjetas | `components/tool-directory.tsx` |
| Estructura de herramientas | `components/tool-page-shell.tsx` |
| Estructura de páginas informativas | `components/content-page-shell.tsx` |
| Pie global | `components/site-footer.tsx` |
| Consentimiento y preferencias | `components/consent-provider.tsx` |
| Controles base | `components/ui/` |

Toda evolución visual debe empezar por los tokens o componentes compartidos cuando afecta a más de una página. Los estilos locales se justifican únicamente cuando expresan una función especializada sin romper la identidad general.
