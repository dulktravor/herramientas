import { test, expect } from '@playwright/test';
import { PASSPHRASE_WORDS } from '../lib/passphrase-wordlist.ts';

const base = process.env.PASSWORD_TEST_URL || process.env.DOCUMENT_TEST_URL || 'http://localhost:3000';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });
test.setTimeout(60000);

async function open(page, consent = 'essential') {
  await page.addInitScript((choice) => {
    localStorage.setItem('herramientas-consent-v2', choice);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__passwordCopiedForTest = text; } } });
  }, consent);
  await page.goto(`${base}/herramientas/contrasenas`);
  await expect(page.getByRole('button', { name: 'Generar contraseña', exact: true })).toBeEnabled();
}

for (const consent of ['essential', 'all']) test(`generar, mostrar, regenerar y copiar son locales con consentimiento ${consent}`, async ({ page }) => {
  const requests = [], messages = [], failures = [];
  page.on('request', (request) => requests.push(`${request.url()} ${request.postData() || ''}`));
  page.on('console', (message) => messages.push(message.text()));
  page.on('pageerror', (error) => failures.push(error.message));
  await open(page, consent);
  const result = page.locator('#password-result');
  await expect(result).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Generar contraseña', exact: true }).click();
  const secret = await result.inputValue();
  expect(secret).toHaveLength(20);
  expect(secret).toMatch(/[a-z]/); expect(secret).toMatch(/[A-Z]/); expect(secret).toMatch(/[0-9]/);
  expect(secret).toMatch(/[^a-zA-Z0-9]/);
  await page.getByRole('button', { name: 'Mostrar', exact: true }).click();
  await expect(result).toHaveAttribute('type', 'text');
  await expect(result).toHaveValue(secret);
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Copiado al portapapeles');
  expect(await page.evaluate(() => window.__passwordCopiedForTest)).toBe(secret);
  await page.getByRole('button', { name: 'Regenerar', exact: true }).click();
  const replacement = await result.inputValue();
  expect(replacement).not.toBe(secret);
  await expect(result).toHaveAttribute('type', 'password');
  const storage = await page.evaluate(() => JSON.stringify({ local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])), session: Object.fromEntries(Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key)])), cookie: document.cookie, dataLayer: window.dataLayer }));
  for (const privateValue of [secret, replacement]) {
    expect(storage).not.toContain(privateValue);
    expect(page.url()).not.toContain(encodeURIComponent(privateValue));
    for (const observation of [...requests, ...messages, ...failures]) {
      expect(observation).not.toContain(privateValue);
      expect(observation).not.toContain(encodeURIComponent(privateValue));
    }
  }
  expect(failures).toEqual([]);
  expect(requests.some((request) => /cloudflareinsights|googlesyndication/.test(request))).toBe(false);
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
  await expect(result).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Copiar', exact: true })).toBeDisabled();
});

test('opciones inválidas, grupos únicos, frase y separadores se cumplen sin ajustes', async ({ page }) => {
  await open(page);
  const result = page.locator('#password-result');
  await page.locator('#password-length').fill('129');
  await expect(page.getByRole('alert')).toContainText('entre 4 y 128');
  await expect(page.getByRole('button', { name: 'Generar contraseña', exact: true })).toBeDisabled();
  await page.locator('#password-length').fill('4.5');
  await expect(page.getByRole('button', { name: 'Generar contraseña', exact: true })).toBeDisabled();
  await page.locator('#password-length').fill('16');
  for (const name of ['Minúsculas (a–z)', 'Mayúsculas (A–Z)', 'Símbolos']) await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.getByRole('button', { name: 'Generar contraseña', exact: true }).click();
  expect(await result.inputValue()).toMatch(/^\d{16}$/);
  await page.getByRole('checkbox', { name: 'Números (0–9)', exact: true }).uncheck();
  await expect(result).toHaveValue('');
  await expect(page.getByRole('alert')).toContainText('al menos un grupo');
  await page.getByRole('button', { name: 'Frase aleatoria', exact: true }).click();
  await expect(page.getByText('Diccionario local:', { exact: false })).toContainText('7.776 palabras en inglés');
  await page.locator('#passphrase-words').fill('12');
  await page.evaluate(() => {
    Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value(values) { values.forEach((_, index) => { values[index] = index; }); return values; } });
  });
  for (const [value, separator] of [['hyphen', '-'], ['space', ' '], ['underscore', '_'], ['period', '.']]) {
    await page.locator('#passphrase-separator').selectOption(value);
    await page.getByRole('button', { name: 'Generar frase', exact: true }).click();
    expect((await result.inputValue()).split(separator)).toHaveLength(12);
    expect(await result.inputValue()).toBe(PASSPHRASE_WORDS.slice(0, 12).join(separator));
  }
  await page.evaluate((compoundIndex) => { Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value(values) { values.fill(compoundIndex); return values; } }); }, PASSPHRASE_WORDS.indexOf('t-shirt'));
  await page.locator('#passphrase-words').fill('6');
  for (const [value, separator] of [['space', ' '], ['period', '.'], ['hyphen', '-']]) {
    await page.locator('#passphrase-separator').selectOption(value);
    await page.getByRole('button', { name: 'Generar frase', exact: true }).click();
    expect(await result.inputValue()).toBe(Array(6).fill('t-shirt').join(separator));
  }
  await page.locator('#passphrase-words').fill('5');
  await expect(result).toHaveValue('');
  await expect(page.getByRole('alert')).toContainText('entre 6 y 12');
});

test('fallos de aleatoriedad y portapapeles se explican sin resultado débil', async ({ page }) => {
  await open(page);
  await page.evaluate(() => { Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value() { throw new Error('CRYPTO_SYNTHETIC_FAILURE'); } }); });
  await page.getByRole('button', { name: 'Generar contraseña', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('aleatoriedad criptográfica');
  await expect(page.locator('#password-result')).toHaveValue('');
  await page.reload();
  await page.getByRole('button', { name: 'Generar contraseña', exact: true }).click();
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('no permitió copiar');
  await expect(page.locator('#password-result')).not.toHaveValue('');
});

test('móvil, temas, teclado y salida limpian el campo actual', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await open(page);
  const generate = page.getByRole('button', { name: 'Generar contraseña', exact: true });
  await generate.focus(); await generate.press('Enter');
  const result = page.locator('#password-result');
  await expect(result).not.toHaveValue('');
  const show = page.getByRole('button', { name: 'Mostrar', exact: true });
  await show.focus(); await show.press('Space');
  await expect(result).toHaveAttribute('type', 'text');
  for (const dark of [false, true]) {
    await page.evaluate((useDark) => document.documentElement.classList.toggle('dark', useDark), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name: 'Tu resultado' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Limpiar sesión', exact: true }).click();
  await expect(result).toHaveValue('');
  await generate.click();
  await page.getByRole('link', { name: 'Volver a explorar' }).click();
  await page.goBack();
  await expect(page.locator('#password-result')).toHaveValue('');
});
