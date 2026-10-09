import { test, expect } from '@playwright/test';

const base = process.env.DATE_TEST_URL || process.env.NEW_TOOLS_TEST_URL || 'http://localhost:3000';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });
test.setTimeout(60000);

async function open(page, consent = 'essential') {
  await page.addInitScript(choice => {
    localStorage.setItem('herramientas-consent-v2', choice);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__datesCopiedForTest = text; } } });
  }, consent);
  await page.goto(`${base}/herramientas/fechas`);
  await expect(page.getByRole('button', { name: 'Calcular', exact: true })).toBeEnabled();
}

for (const consent of ['essential', 'all']) test(`calendario, copia y limpieza son locales con consentimiento ${consent}`, async ({ page }) => {
  const requests = [], logs = [], errors = [];
  page.on('request', request => requests.push(`${request.url()} ${request.postData() || ''}`));
  page.on('console', message => logs.push(message.text()));
  page.on('pageerror', error => errors.push(error.message));
  await open(page, consent);
  await expect(page.locator('#cloudflare-web-analytics, #google-adsense, .adsbygoogle')).toHaveCount(0);
  await page.locator('#date-start').fill('2043-02-17');
  await page.locator('#date-end').fill('2043-02-20');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  const result = page.locator('#date-result');
  await expect(result).toHaveValue(/3 días de calendario/);
  await expect(result).toHaveValue(/No representa una duración en horas/);
  await page.getByRole('checkbox', { name: 'Incluir ambas fechas' }).check();
  await expect(result).toHaveValue('');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(result).toHaveValue(/4 días de calendario/);
  const shown = await result.inputValue();
  await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
  expect(await page.evaluate(() => window.__datesCopiedForTest)).toBe(shown);
  expect(shown).toContain('2043-02-17');
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
  await expect(result).toHaveValue('');
  await expect(page.locator('#date-start')).toHaveValue('');
  await expect(page.locator('#date-end')).toHaveValue('');
  const stored = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
  for (const value of ['2043-02-17', '2043-02-20', shown]) {
    expect(requests.some(request => request.includes(value))).toBe(false);
    expect(logs.some(log => log.includes(value))).toBe(false);
    expect(stored).not.toContain(value);
  }
  expect(requests.some(request => /cloudflareinsights|googlesyndication/.test(request))).toBe(false);
  expect(errors).toEqual([]);
});

test('sumar, restar, invertir fechas y validar entradas no conserva resultados obsoletos', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('fecha completa');
  await page.locator('#date-start').fill('2024-03-01');
  await page.locator('#date-end').fill('2024-02-28');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.locator('#date-result')).toHaveValue(/-2 días de calendario/);
  await page.getByRole('button', { name: 'Sumar o restar días', exact: true }).click();
  await page.locator('#date-amount').fill('-1');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.locator('#date-result')).toHaveValue(/Fecha calculada: 2024-02-29/);
  await page.locator('#date-amount').fill('1.5');
  await expect(page.locator('#date-result')).toHaveValue('');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cantidad entera');
  await page.locator('#date-start').fill('9999-12-31');
  await page.locator('#date-amount').fill('1');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('0001 y 9999');
});

test('zonas equivalentes, hora inexistente y ambas ocurrencias DST requieren decisiones visibles', async ({ page }) => {
  await open(page);
  await expect(page.getByText(/Zona detectada:/)).toBeVisible();
  await page.getByRole('button', { name: 'Convertir horario', exact: true }).click();
  await page.locator('#date-start').fill('2026-10-08');
  await page.locator('#date-time').fill('23:30');
  await page.locator('#date-source-zone').selectOption('America/Bogota');
  await page.locator('#date-target-zone').selectOption('Asia/Tokyo');
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('#date-result')).toHaveValue(/2026-10-09 13:30:00 Asia\/Tokyo \(UTC\+09:00\)/);
  await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
  expect(await page.evaluate(() => window.__datesCopiedForTest)).toContain('Instante UTC: 2026-10-09T04:30:00.000Z');
  await page.locator('#date-source-zone').selectOption('America/New_York');
  await page.locator('#date-target-zone').selectOption('UTC');
  await page.locator('#date-start').fill('2026-03-08');
  await page.locator('#date-time').fill('02:30');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText('no existe');
  await expect(page.locator('#date-result')).toHaveValue('');
  await page.locator('#date-start').fill('2026-11-01');
  await page.locator('#date-time').fill('01:30');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('group', { name: 'Hora repetida: elige una ocurrencia' })).toBeVisible();
  await expect(page.locator('#date-result')).toHaveValue('');
  await expect(page.getByRole('button', { name: /Ocurrencia 1:/ })).toContainText('UTC-04:00');
  await expect(page.getByRole('button', { name: /Ocurrencia 2:/ })).toContainText('UTC-05:00');
  await page.getByRole('button', { name: /Ocurrencia 2:/ }).click();
  await expect(page.locator('#date-result')).toHaveValue(/2026-11-01 06:30:00 UTC/);
  await expect(page.locator('#date-result')).toHaveValue(/ocurrencia 2/);
  await page.locator('form button[type="submit"]').click();
  await page.getByRole('button', { name: /Ocurrencia 1:/ }).click();
  await expect(page.locator('#date-result')).toHaveValue(/2026-11-01 05:30:00 UTC/);
});

test('portapapeles denegado ofrece copia manual y conserva el resultado', async ({ page }) => {
  await open(page);
  await page.locator('#date-start').fill('2026-10-08');
  await page.locator('#date-end').fill('2026-10-10');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('no permitió copiar');
  await expect(page.locator('#date-result')).toHaveValue(/2 días de calendario/);
});

test('320 px, temas, teclado y salida limpian entradas y resultado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await open(page);
  await page.locator('#date-start').fill('2026-10-08');
  await page.locator('#date-end').fill('2026-10-10');
  const calculate = page.getByRole('button', { name: 'Calcular', exact: true });
  await calculate.focus(); await calculate.press('Enter');
  await expect(page.locator('#date-result')).toHaveValue(/2 días de calendario/);
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Convertir horario', exact: true }).click();
    await page.locator('#date-source-zone').selectOption('America/New_York');
    await page.locator('#date-start').fill('2026-11-01');
    await page.locator('#date-time').fill('01:30');
    await page.locator('form button[type="submit"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: /Ocurrencia 1:/ }).focus();
    await page.getByRole('button', { name: /Ocurrencia 1:/ }).press('Enter');
    await expect(page.locator('#date-result')).not.toHaveValue('');
    await page.getByRole('button', { name: 'Días entre fechas', exact: true }).click();
  }
  await page.getByRole('link', { name: 'Volver a explorar' }).click();
  await page.goBack();
  await expect(page.locator('#date-start')).toHaveValue('');
  await expect(page.locator('#date-end')).toHaveValue('');
  await expect(page.locator('#date-result')).toHaveValue('');
});
