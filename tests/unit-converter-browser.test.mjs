import { test, expect } from '@playwright/test';

const base = process.env.UNITS_TEST_URL || 'http://127.0.0.1:3000';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });

async function start(page, consent = 'essential') {
  await page.addInitScript(value => localStorage.setItem('herramientas-consent-v2', value), consent);
  await page.goto(`${base}/herramientas/unidades`);
  await expect(page.getByRole('heading', { name: 'Convertir unidades', exact: true })).toBeVisible();
}

test('conversión, cambio de precisión, intercambio y copia con unidad inequívoca', async ({ page }) => {
  await start(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } }));
  const result = page.getByLabel('Resultado de la conversión', { exact: true });
  await page.getByLabel('Cantidad de origen', { exact: true }).fill('1');
  await expect(result).toHaveText('100 cm');
  await page.getByLabel('Unidad de destino', { exact: true }).selectOption('ft');
  await page.getByLabel('Precisión del resultado', { exact: true }).selectOption('3');
  await expect(result).toHaveText('3,28 ft');
  await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
  expect(await page.evaluate(() => window.__copied)).toBe('3,28 ft — Pie internacional');
  await page.getByLabel('Precisión del resultado', { exact: true }).selectOption('10');
  await expect(result).toHaveText('3,280839895 ft');
  await page.getByRole('button', { name: 'Intercambiar unidades', exact: true }).click();
  await expect(page.getByLabel('Cantidad de origen', { exact: true })).toHaveValue('1');
  await expect(result).toHaveText('0,3048 m');
});

test('familias, coma decimal y errores ambiguos o fuera de rango', async ({ page }) => {
  await start(page);
  const amount = page.getByLabel('Cantidad de origen', { exact: true });
  const result = page.getByLabel('Resultado de la conversión', { exact: true });
  await amount.fill('12,5');
  await expect(result).toHaveText('1250 cm');
  await amount.fill('1,234');
  await expect(page.getByRole('alert')).toContainText('ambigua');
  await expect(page.getByRole('button', { name: 'Copiar resultado' })).toBeDisabled();
  await amount.fill('1e309');
  await expect(page.getByRole('alert')).toContainText('fuera del rango');
  await page.getByLabel('Familia de unidades', { exact: true }).selectOption('temperature');
  await amount.fill('-273,16');
  await expect(page.getByRole('alert')).toContainText('cero absoluto');
  await amount.fill('0');
  await expect(result).toHaveText('32 °F');
  await page.getByLabel('Familia de unidades', { exact: true }).selectOption('storage');
  await page.getByLabel('Unidad de origen', { exact: true }).selectOption('mib');
  await page.getByLabel('Unidad de destino', { exact: true }).selectOption('mb');
  await amount.fill('1');
  await expect(result).toHaveText('1,048576 MB');
  await amount.fill('-1');
  await expect(page.getByRole('alert')).toContainText('positivas');
});

test('permiso de copia denegado explica alternativa; limpiar y volver eliminan entrada', async ({ page }) => {
  await start(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } }));
  await page.getByLabel('Cantidad de origen', { exact: true }).fill('9812,45');
  await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('manualmente');
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
  await expect(page.getByLabel('Cantidad de origen', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Copiar resultado' })).toBeDisabled();
  await page.getByLabel('Cantidad de origen', { exact: true }).fill('7654,32');
  await page.getByRole('link', { name: 'Volver a explorar', exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel('Cantidad de origen', { exact: true })).toHaveValue('');
  await page.getByLabel('Cantidad de origen', { exact: true }).fill('456,78');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.getByLabel('Cantidad de origen', { exact: true })).toHaveValue('');
});

test('entradas y resultados no salen en peticiones con consentimiento necesario o completo', async ({ page }) => {
  for (const consent of ['essential', 'all']) {
    await start(page, consent);
    const requests = [];
    const observe = request => requests.push({ url: request.url(), body: request.postData() });
    page.on('request', observe);
    await page.getByLabel('Cantidad de origen', { exact: true }).fill('987654321,1234');
    await expect(page.getByLabel('Resultado de la conversión', { exact: true })).toHaveText('9,876543211e+10 cm');
    await page.getByRole('button', { name: 'Intercambiar unidades', exact: true }).click();
    await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
    await expect(page.locator('#cloudflare-web-analytics, #google-adsense, .adsbygoogle')).toHaveCount(0);
    expect(requests.some(item => /987654321|98765432110|9[,.]876543211/.test(decodeURIComponent(item.url) + (item.body || '')))).toBe(false);
    expect(requests.some(item => /cloudflareinsights|googlesyndication/.test(item.url))).toBe(false);
    page.removeListener('request', observe);
  }
});

test('controles funcionan con teclado en móvil y ambos temas sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.addInitScript(value => localStorage.setItem('ceronube-theme', value), theme);
    await start(page);
    await page.getByLabel('Cantidad de origen', { exact: true }).focus();
    await page.keyboard.type('12.5');
    await expect(page.getByLabel('Resultado de la conversión', { exact: true })).toHaveText('1250 cm');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Unidad de origen', { exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
