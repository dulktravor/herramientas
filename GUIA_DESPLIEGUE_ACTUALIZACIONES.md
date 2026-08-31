# Guía de despliegue de actualizaciones de CeroNube

Esta guía describe el proceso que debe seguirse **cada vez que se modifica CeroNube**, desde la preparación local hasta la comprobación de la versión publicada. Está adaptada a la arquitectura y al alojamiento actuales del proyecto.

## 1. Cómo se publica actualmente

CeroNube utiliza las siguientes piezas:

- **Código fuente:** repositorio `dulktravor/herramientas` en GitHub.
- **Rama de producción:** `main`.
- **Aplicación:** Vinext, React y TypeScript.
- **Compilación:** `npm run build`.
- **Salida de producción:** servidor Worker en `dist/server/` y archivos estáticos en `dist/client/`.
- **Alojamiento:** Cloudflare Workers con Static Assets.
- **URL de producción actual:** <https://herramientas.enrique-lazaro-dulktravor.workers.dev/>.
- **Despliegue automático:** la integración Git configurada en Cloudflare detecta cada `push` a `main`, compila el proyecto y publica la nueva versión.

No existe un archivo de GitHub Actions en el repositorio. La automatización está configurada directamente en el panel de Cloudflare.

### Flujo resumido

```text
Cambios locales
      ↓
Validación con lint y build
      ↓
Commit en Git
      ↓
Push a origin/main
      ↓
Cloudflare compila y despliega
      ↓
Comprobación del sitio publicado
```

## 2. Requisitos del equipo de desarrollo

Antes de desplegar debe estar instalado:

- Git.
- Node.js `22.13.0` o una versión compatible posterior.
- npm.
- Acceso con permiso de escritura al repositorio de GitHub.
- Acceso al proyecto correspondiente en Cloudflare, al menos para consultar los despliegues.

Para confirmar las versiones disponibles:

```powershell
node --version
npm --version
git --version
```

El repositorio debe estar clonado y tener configurado el remoto `origin`:

```powershell
git remote -v
```

El resultado debe apuntar a:

```text
https://github.com/dulktravor/herramientas.git
```

## 3. Preparación de una actualización

### 3.1 Entrar al proyecto

```powershell
Set-Location "C:\Users\User\Downloads\herramientas"
```

### 3.2 Revisar la rama y los cambios existentes

```powershell
git branch --show-current
git status --short
```

La rama de producción es `main`. Antes de editar, hay que identificar cualquier cambio que ya exista para no sobrescribir trabajo ajeno o mezclar modificaciones no relacionadas.

### 3.3 Obtener cambios remotos antes de comenzar

Solo debe hacerse cuando no haya cambios locales incompatibles:

```powershell
git pull --ff-only origin main
```

`--ff-only` evita crear una combinación automática inesperada. Si Git rechaza la operación, primero debe revisarse por qué el historial local y remoto son diferentes.

### 3.4 Instalar dependencias de forma reproducible

En una instalación nueva o después de modificar `package-lock.json`:

```powershell
npm ci
```

Debe utilizarse `npm ci` para reproducir exactamente las versiones guardadas en el archivo de bloqueo. `npm install` se reserva para añadir, retirar o actualizar dependencias deliberadamente.

## 4. Desarrollo y prueba local

### 4.1 Iniciar el entorno de desarrollo

```powershell
npm run dev
```

La terminal mostrará la dirección local, normalmente `http://localhost:3000`. Los cambios se reflejan en este entorno sin afectar la versión pública.

### 4.2 Rutas que deben comprobarse

La profundidad de la prueba depende del cambio. Como mínimo debe probarse la ruta modificada y la navegación relacionada. Para una actualización general deben revisarse:

- `/`
- `/acerca-de`
- `/privacidad`
- `/terminos`
- `/herramientas/imagenes`
- `/herramientas/pdf`
- `/herramientas/metadatos`
- `/herramientas/ocr`
- `/herramientas/datos`
- `/herramientas/escaner`
- `/robots.txt`
- `/sitemap.xml`
- `/ads.txt`

### 4.3 Comprobaciones funcionales según el cambio

#### Cambios visuales

- Revisar escritorio y móvil.
- Revisar tema claro y oscuro.
- Confirmar que no haya texto cortado, desbordamientos ni controles inaccesibles.
- Comprobar navegación con teclado y foco visible.

#### Cambios en herramientas

- Probar un archivo válido.
- Probar un archivo no compatible.
- Probar el estado vacío y la cancelación, si existe.
- Confirmar que la descarga resultante se abre correctamente.
- Confirmar que el archivo permanece en el navegador cuando esa sea la promesa de la herramienta.

#### Cambios de privacidad o anuncios

- Probar “Solo necesarias”.
- Probar anuncios contextuales sin personalización.
- Probar publicidad personalizada.
- Probar la medición de uso de forma independiente.
- Recargar la página y comprobar que la elección se conserva.
- Revisar `/privacidad` y `/ads.txt`.

#### Cambios de marca o SEO

- Revisar título, descripción, URL canónica y metadatos sociales.
- Confirmar favicon, icono e imagen Open Graph.
- Revisar `robots.txt` y `sitemap.xml`.
- Verificar que `NEXT_PUBLIC_SITE_URL` tenga el dominio público correcto.

## 5. Variables de entorno

El archivo `.env.example` documenta las variables admitidas:

```env
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_HOME_SLOT=
NEXT_PUBLIC_ADSENSE_TOOL_SLOT=
NEXT_PUBLIC_CONTACT_EMAIL=
```

### Uso de cada variable

| Variable | Finalidad |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Dominio utilizado en enlaces canónicos, sitemap y metadatos. |
| `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` | Activa Cloudflare Web Analytics cuando el usuario lo autoriza. |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Identificador AdSense con formato `ca-pub-...`. También alimenta `/ads.txt`. |
| `NEXT_PUBLIC_ADSENSE_HOME_SLOT` | Identificador del bloque publicitario de la portada. |
| `NEXT_PUBLIC_ADSENSE_TOOL_SLOT` | Identificador del bloque publicitario de las herramientas. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo mostrado en las páginas institucionales. |

Para desarrollo pueden guardarse valores en un archivo local ignorado por Git, por ejemplo `.env.local`. En producción deben configurarse en el panel de Cloudflare.

> Nunca deben incluirse claves, tokens ni credenciales reales en un commit. Las variables con prefijo `NEXT_PUBLIC_` terminan expuestas al navegador y solo deben contener valores que puedan ser públicos.

Cuando se cambia una variable en Cloudflare hay que iniciar un nuevo despliegue para que el valor forme parte de la compilación publicada.

## 6. Validación obligatoria antes del despliegue

### 6.1 Revisar los archivos modificados

```powershell
git status --short
git diff --check
git diff
```

Debe confirmarse que:

- Solo estén incluidos archivos relacionados con la actualización.
- No haya secretos, archivos `.env`, resultados descargados ni archivos personales.
- No se incluyan `node_modules`, `dist`, `.next`, `.vinext` o `.wrangler`.
- `git diff --check` no muestre errores de espacios en blanco.

### 6.2 Ejecutar el analizador

```powershell
npm run lint
```

No debe continuarse mientras existan errores. Las advertencias deben revisarse y documentarse si deliberadamente se aceptan.

### 6.3 Generar la compilación de producción

```powershell
npm run build
```

Una compilación correcta debe generar, entre otros elementos:

- `dist/server/index.js`
- `dist/server/wrangler.json`
- `dist/client/`

No debe desplegarse una actualización cuya compilación haya fallado, aunque funcione en el servidor de desarrollo.

### 6.4 Repetir pruebas esenciales

Después del build debe repetirse el flujo principal afectado. Para cambios transversales deben comprobarse la portada, una herramienta representativa, privacidad y los archivos técnicos públicos.

## 7. Crear el commit

### 7.1 Añadir únicamente los archivos deseados

Es preferible nombrarlos explícitamente:

```powershell
git add app/privacidad/page.tsx components/consent-provider.tsx
```

Para una actualización amplia, después de revisar cuidadosamente `git status`, puede utilizarse:

```powershell
git add .
```

### 7.2 Revisar exactamente lo que se publicará

```powershell
git diff --cached --check
git diff --cached
```

### 7.3 Crear un mensaje descriptivo

```powershell
git commit -m "feat: describir brevemente la actualización"
```

Prefijos recomendados:

- `feat:` nueva función.
- `fix:` corrección de un error.
- `docs:` documentación.
- `style:` cambio visual sin modificar la lógica.
- `refactor:` reorganización interna.
- `chore:` mantenimiento o configuración.

El commit debe representar una unidad coherente y reversible.

## 8. Despliegue automático a producción

### 8.1 Comprobar que el remoto no avanzó

```powershell
git fetch origin
git status
```

Si existen commits remotos nuevos, deben integrarse y volver a ejecutarse las validaciones antes de publicar.

### 8.2 Enviar el commit

```powershell
git push origin main
```

Este `push` es el evento que inicia el despliegue de producción en Cloudflare.

### 8.3 Qué ejecuta Cloudflare

La integración debe conservar esta configuración:

```text
Build command: npm run build
Deploy command: npx wrangler deploy --config dist/server/wrangler.json
Non-production branch deploy command: npx wrangler versions upload --config dist/server/wrangler.json
Root directory: /
Production branch: main
```

Cloudflare instala las dependencias, crea la salida Vinext, carga el Worker y publica los archivos estáticos asociados. No debe configurarse `dist/client` como un proyecto Pages estático independiente porque esta aplicación necesita `dist/server/index.js` para sus rutas y renderizado.

## 9. Seguimiento del despliegue

Después del `push`:

1. Abrir Cloudflare Dashboard.
2. Entrar en **Workers & Pages**.
3. Seleccionar el Worker de CeroNube.
4. Abrir **Deployments** o el historial de compilaciones.
5. Localizar el despliegue asociado al commit recién enviado.
6. Esperar hasta que figure como correcto.
7. Si falla, abrir los registros de Build y Deploy antes de realizar otro cambio.

No debe asumirse que el sitio está actualizado únicamente porque `git push` terminó correctamente: ese comando confirma la entrega a GitHub, no el resultado final de Cloudflare.

## 10. Verificación posterior a la publicación

Cuando Cloudflare marque el despliegue como correcto:

1. Abrir la URL pública.
2. Forzar una recarga con `Ctrl + F5` para evitar recursos antiguos en caché.
3. Probar la función modificada con datos reales no sensibles.
4. Comprobar consola y solicitudes de red si aparece un comportamiento extraño.
5. Revisar al menos una pantalla móvil.
6. Confirmar que las rutas no modificadas más importantes siguen disponibles.

### Lista mínima de aceptación

- [ ] La portada carga sin errores.
- [ ] La ruta modificada muestra la versión nueva.
- [ ] El flujo principal produce el resultado esperado.
- [ ] No hay errores de ejecución visibles.
- [ ] Navegación, tema claro y tema oscuro continúan funcionando.
- [ ] Privacidad y consentimiento conservan la elección del usuario.
- [ ] `robots.txt`, `sitemap.xml` y `ads.txt` responden cuando el cambio los afecta.
- [ ] El despliegue corresponde al commit esperado.

## 11. Despliegue manual de emergencia

El método normal es el despliegue automático por Git. El despliegue manual solo debe utilizarse si la integración de Cloudflare está temporalmente averiada y el código ya superó todas las validaciones.

Primero debe existir una sesión válida de Wrangler o la variable secreta `CLOUDFLARE_API_TOKEN` en la terminal. Después:

```powershell
npm run build
npm run deploy
```

`npm run deploy` utiliza:

```text
wrangler deploy --config dist/server/wrangler.json
```

Si Wrangler informa que falta `CLOUDFLARE_API_TOKEN`, no se debe pegar el token en el código, en `.env.example`, en el historial de comandos compartido ni en Git. Debe configurarse como secreto del entorno local o utilizar el inicio de sesión autorizado de Wrangler.

Después de un despliegue manual debe registrarse:

- Commit exacto desplegado.
- Persona que lo realizó.
- Motivo por el que no se usó CI/CD.
- Resultado de la verificación posterior.

## 12. Actualizaciones desde ramas distintas de `main`

Las ramas de trabajo no deben sustituir directamente a producción. El flujo recomendado es:

```powershell
git switch -c nombre-de-la-rama
# realizar y validar cambios
git push -u origin nombre-de-la-rama
```

La configuración actual de Cloudflare puede subir una versión no productiva mediante `wrangler versions upload`, pero esa versión no debe considerarse pública hasta integrarla en `main`.

Después de revisión, la rama se fusiona en `main`; el commit resultante activa el despliegue de producción.

## 13. Recuperación cuando una publicación falla

### Caso A: falla la compilación en Cloudflare

1. Leer el primer error real de los registros.
2. Reproducirlo localmente con `npm ci` y `npm run build`.
3. Corregir la causa.
4. Ejecutar nuevamente lint, build y pruebas.
5. Crear un commit correctivo y enviarlo a `main`.

No debe repetirse el despliegue sin cambiar nada salvo que el registro demuestre un fallo temporal de infraestructura.

### Caso B: el despliegue termina, pero la aplicación falla

Si el sitio anterior todavía está disponible desde el historial de Cloudflare, puede restaurarse temporalmente esa versión desde el panel. Después debe corregirse el código y publicarse un commit nuevo.

Si se requiere revertir el cambio mediante Git:

```powershell
git log --oneline
git revert IDENTIFICADOR_DEL_COMMIT
git push origin main
```

`git revert` crea un commit que deshace la actualización y conserva el historial. No debe utilizarse `git reset --hard` ni reescribir el historial de `main` para una recuperación normal.

### Caso C: el código nuevo no aparece

Comprobar, en este orden:

1. Que el commit exista en `origin/main`.
2. Que Cloudflare haya iniciado un despliegue para ese commit.
3. Que el despliegue haya terminado correctamente.
4. Que se esté abriendo el Worker y dominio correctos.
5. Que el navegador no esté mostrando una versión en caché.
6. Que una variable de entorno no haya dejado desactivada la función.

### Caso D: rutas con error 404

Confirmar que el despliegue utiliza `dist/server/wrangler.json` y no únicamente `dist/client`. Vinext genera una aplicación Worker, no un sitio compuesto solamente por un `index.html` estático.

## 14. Cambios de dominio

Cuando se conecte un dominio propio:

1. Añadirlo al Worker desde Cloudflare.
2. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio canónico y protocolo HTTPS.
3. Ejecutar un nuevo despliegue.
4. Confirmar enlaces canónicos, sitemap, Open Graph y redirecciones.
5. Añadir el nuevo dominio a Google Search Console y AdSense cuando corresponda.
6. Mantener el dominio anterior redirigiendo al canónico si Cloudflare lo permite.

## 15. Cambios de AdSense y analítica

Las credenciales reales se configuran en Cloudflare, no en el repositorio. Después de modificarlas debe desplegarse nuevamente.

Para AdSense hay que comprobar:

- Que `NEXT_PUBLIC_ADSENSE_CLIENT_ID` tenga formato `ca-pub-...`.
- Que los identificadores de bloques correspondan a unidades reales.
- Que `/ads.txt` muestre el editor correcto.
- Que los anuncios solo se soliciten según la preferencia elegida.
- Que los espacios publicitarios no se confundan con controles de las herramientas.
- Que no se hagan clics propios sobre anuncios reales durante las pruebas.

Para Cloudflare Web Analytics hay que comprobar que la medición solo se cargue cuando la preferencia correspondiente esté activada.

## 16. Registro de cada publicación

Cada actualización desplegada debería añadirse al final de `REGISTRO_DESPLIEGUE.md` con esta plantilla:

```markdown
## Versión: AAAA-MM-DD — título breve

- **Commit:** identificador corto.
- **Tipo:** función, corrección, contenido, privacidad, SEO o mantenimiento.
- **Cambios:** resumen de lo publicado.
- **Variables modificadas:** ninguna o nombres sin revelar valores.
- **Validaciones:** lint, build y pruebas funcionales realizadas.
- **Despliegue:** automático mediante GitHub → Cloudflare o manual excepcional.
- **Resultado:** correcto, revertido o pendiente.
- **URL verificada:** dirección pública comprobada.
- **Observaciones:** incidencias, decisiones o seguimiento necesario.
```

No deben registrarse tokens, contraseñas, identificadores privados ni datos personales.

## 17. Lista operativa completa

### Antes de programar

- [ ] Confirmar que se está en el repositorio correcto.
- [ ] Revisar rama y estado de Git.
- [ ] Obtener cambios remotos sin sobrescribir trabajo local.
- [ ] Entender el alcance de la actualización.

### Antes del commit

- [ ] Probar localmente la función modificada.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar `git diff --check`.
- [ ] Revisar todos los archivos que se incluirán.
- [ ] Confirmar que no existan secretos.

### Para publicar

- [ ] Crear un commit descriptivo.
- [ ] Ejecutar `git push origin main`.
- [ ] Esperar el resultado de Cloudflare.
- [ ] Revisar registros si el despliegue falla.

### Después de publicar

- [ ] Abrir la URL pública y forzar recarga.
- [ ] Probar la función actualizada.
- [ ] Revisar una muestra de rutas importantes.
- [ ] Confirmar el commit desplegado.
- [ ] Documentar la versión en `REGISTRO_DESPLIEGUE.md`.

## 18. Regla principal

Una actualización no se considera terminada cuando el código funciona localmente ni cuando GitHub recibe el commit. Se considera terminada únicamente cuando:

1. Superó las validaciones locales.
2. Cloudflare desplegó el commit esperado.
3. La versión pública fue comprobada.
4. El resultado quedó registrado.
