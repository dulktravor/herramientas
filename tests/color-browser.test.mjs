import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const base = process.env.COLOR_TEST_URL || 'http://127.0.0.1:3000';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });
test.setTimeout(60000);

async function start(page, consent = 'essential') {
  await page.addInitScript((choice) => localStorage.setItem('herramientas-consent-v2', choice), consent);
  await page.goto(`${base}/herramientas/colores`);
  await expect(page.getByRole('heading', { name: 'Convertir y revisar colores', exact: true })).toBeVisible();
  await expect(page.locator('#cloudflare-web-analytics, #google-adsense, .adsbygoogle')).toHaveCount(0);
}
async function save(page, format) {
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: `Descargar ${format.toUpperCase()}`, exact: true }).click();
  const file = await waiting;
  return { name: file.suggestedFilename(), content: await fs.readFile(await file.path(), 'utf8') };
}

for (const consent of ['essential', 'all']) test(`conversiones, copia, exportación y limpieza privadas con consentimiento ${consent}`, async ({ page }) => {
  const requests = [];
  const logs = [], errors = [];
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url(), body: request.postData() }));
  page.on('console', (message) => logs.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page, consent);
  await page.evaluate(() => { window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } }); });
  await page.getByLabel('Color para convertir', { exact: true }).fill('hsla(120, 100%, 50%, 0.5)');
  await expect(page.getByTestId('color-hex')).toHaveText('#00FF0080');
  await expect(page.getByTestId('color-rgb')).toHaveText('rgba(0, 255, 0, 0.5)');
  await page.getByRole('button', { name: 'Copiar RGB', exact: true }).click();
  expect(await page.evaluate(() => window.__copied)).toBe('rgba(0, 255, 0, 0.5)');
  const privateValue = 'rgba(17.125, 93.25, 203.75, 0.375)';
  await page.getByLabel('Color para convertir', { exact: true }).fill(privateValue);
  await page.getByRole('button', { name: 'Copiar RGB', exact: true }).click();
  expect(await page.evaluate(() => window.__copied)).toBe(privateValue);
  await page.getByLabel('Nombre del color', { exact: true }).fill('Cartel ñ 😀 privado prueba');
  await page.getByRole('button', { name: 'Añadir a la paleta', exact: true }).click();
  const json = await save(page, 'json');
  expect(json.name).toBe('paleta-ceronube.json');
  expect(JSON.parse(json.content).colors[0]).toMatchObject({ name: 'Cartel ñ 😀 privado prueba', hex: '#115DCC60', rgb: privateValue, rgba: { r: 17.125, g: 93.25, b: 203.75, a: 0.375 } });
  expect((await save(page, 'txt')).content).toContain('Cartel ñ 😀 privado prueba\nHEX: #115DCC60');
  expect(requests.some((request) => ['POST', 'PUT', 'PATCH'].includes(request.method))).toBe(false);
  expect(requests.some((request) => /cloudflareinsights|googlesyndication/.test(request.url))).toBe(false);
  for (const marker of ['Cartel ñ 😀 privado prueba', privateValue, '#115DCC60']) {
    expect(requests.some((request) => decodeURIComponent(request.url).includes(marker) || request.body?.includes(marker))).toBe(false);
    expect(logs.some((message) => message.includes(marker))).toBe(false);
  }
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('herramientas-consent-v2'))).toBe(consent);
  const storage = await page.evaluate(() => JSON.stringify({ local: Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]), session: Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key)]), href: location.href }));
  expect(storage).not.toContain('Cartel');
  expect(storage).not.toContain(privateValue);
  expect(storage).not.toContain('#115DCC60');
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
  await expect(page.getByLabel('Color para convertir', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Nombre del color', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Descargar JSON', exact: true })).toBeDisabled();
  await expect(page.getByText('Tu paleta está vacía.', { exact: true })).toBeVisible();
});

test('contraste compone transparencias y base explícita; inválidos eliminan resultados', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  await expect(page.getByTestId('contrast-ratio')).toHaveText('21.00:1');
  await page.getByLabel('Color del texto', { exact: true }).fill('#777');
  await expect(page.getByTestId('contrast-ratio')).toHaveText('4.48:1');
  await expect(page.getByText('AA texto normal (4.5:1):', { exact: false }).first()).toContainText('No cumple');
  await page.getByLabel('Color del texto', { exact: true }).fill('rgba(0, 0, 0, .5)');
  await page.getByLabel('Color del fondo', { exact: true }).fill('rgba(255, 0, 0, .5)');
  await expect(page.getByTestId('effective-background')).toHaveText('rgb(255, 127.5, 127.5)');
  await expect(page.getByTestId('effective-foreground')).toHaveText('rgb(127.5, 63.75, 63.75)');
  await page.getByLabel('Fondo base opaco', { exact: true }).fill('#000');
  await expect(page.getByTestId('effective-background')).toHaveText('rgb(127.5, 0, 0)');
  await expect(page.getByTestId('effective-foreground')).toHaveText('rgb(63.75, 0, 0)');
  await page.getByLabel('Fondo base opaco', { exact: true }).fill('#FFF8');
  await expect(page.getByRole('alert')).toContainText('opaco');
  await expect(page.getByTestId('contrast-ratio')).toHaveCount(0);
  await page.getByLabel('Fondo base opaco', { exact: true }).fill('#FFF');
  await page.getByLabel('Color para convertir', { exact: true }).fill('rgb(256, 0, 0)');
  await expect(page.getByRole('alert')).toContainText('entre 0 y 255');
  await expect(page.getByTestId('color-rgb')).toHaveCount(0);
  await page.getByLabel('Color para convertir', { exact: true }).fill('#F00');
  await page.locator('#color-source-alpha').focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < 50; step++) await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('color-rgb')).toHaveText('rgba(255, 0, 0, 0.5)');
  expect(errors).toEqual([]);
});

test('copiar denegado tiene alternativa y salir/restaurar limpia colores personales', async ({ page }) => {
  await start(page);
  await page.getByLabel('Color para convertir', { exact: true }).fill('#ABC');
  await page.getByLabel('Nombre del color', { exact: true }).fill('Mi prueba de sesión');
  await page.getByRole('button', { name: 'Añadir a la paleta', exact: true }).click();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } }));
  await page.getByRole('button', { name: 'Copiar HEX', exact: true }).first().click();
  await expect(page.getByRole('alert')).toContainText('no permite copiar');
  await expect(page.getByRole('button', { name: 'Descargar TXT', exact: true })).toBeEnabled();
  await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  await expect(page.getByLabel('Color para convertir', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Descargar TXT', exact: true })).toBeDisabled();
  await page.getByLabel('Color para convertir', { exact: true }).fill('#123456');
  await page.goto(`${base}/`); await page.goBack();
  await expect(page.getByLabel('Color para convertir', { exact: true })).toHaveValue('');
});

test('paleta alcanza límite visible, permite quitar y volver a añadir', async ({ page }) => {
  await start(page);
  await page.getByLabel('Color para convertir', { exact: true }).fill('#123456');
  for (let index = 0; index < 32; index++) {
    await page.getByLabel('Nombre del color', { exact: true }).fill(`Color ${index}`);
    await page.getByRole('button', { name: 'Añadir a la paleta', exact: true }).click();
  }
  await expect(page.getByText('32 de 32 colores.', { exact: true })).toBeVisible();
  await page.getByLabel('Nombre del color', { exact: true }).fill('Color nuevo');
  await expect(page.getByRole('button', { name: 'Añadir a la paleta', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Quitar Color 0 de la paleta', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir a la paleta', exact: true }).click();
  const palette = JSON.parse((await save(page, 'json')).content).colors;
  expect(palette).toHaveLength(32); expect(palette.at(-1).name).toBe('Color nuevo');
});

test('320 px en ambos temas, muestras etiquetadas y controles con teclado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await start(page);
  await page.getByLabel('Color para convertir', { exact: true }).focus();
  await page.keyboard.type('hsl(240, 100%, 50%)');
  await expect(page.getByTestId('color-hex')).toHaveText('#0000FF');
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('figure', { name: 'Muestra del color #0000FF sobre fondo base #FFFFFF', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Usar como texto', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Color del texto', { exact: true })).toHaveValue('rgb(0, 0, 255)');
});
