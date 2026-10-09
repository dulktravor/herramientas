import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const base = process.env.NEW_TOOLS_TEST_URL || 'http://localhost:3000';
const utilityPaths = ['qr', 'texto', 'contrasenas', 'unidades', 'fechas', 'colores'];
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } });
test.setTimeout(60000);

test('catálogo, filtro y sitemap incluyen las seis utilidades', async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem('herramientas-consent-v2', 'essential'));
  await page.goto(base);
  await page.getByRole('button', { name: 'Utilidades', exact: true }).click();
  await expect(page.getByText('6 resultados', { exact: true })).toBeVisible();
  for (const path of utilityPaths) {
    await expect(page.locator(`#herramientas a[href="/herramientas/${path}"]`)).toBeVisible();
  }
  const sitemap = await request.get(base + '/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  for (const path of utilityPaths) expect(xml).toContain(`/herramientas/${path}`);
});

test('las utilidades excluyen scripts opcionales aunque el consentimiento esté aceptado', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('herramientas-consent-v2', 'all'));
  const external = [];
  page.on('request', request => {
    if (/cloudflareinsights|googlesyndication/.test(request.url())) external.push(request.url());
  });
  for (const path of utilityPaths) {
    await page.goto(`${base}/herramientas/${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#cloudflare-web-analytics, #google-adsense, .adsbygoogle')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('herramientas-consent-v2'))).toBe('all');
  }
  expect(external).toEqual([]);
});

test('entrar desde el directorio inicia un documento sin código opcional previo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('herramientas-consent-v2', 'all'));
  await page.route(/cloudflareinsights|googlesyndication/, route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  for (const path of ['unidades', 'fechas', 'colores', 'contrasenas']) {
    await page.goto(base);
    await page.evaluate(() => {
      window.previousOptionalDocument = true;
      const script = document.createElement('script');
      script.id = 'google-adsense';
      document.head.append(script);
    });
    await page.locator(`#herramientas a[href="/herramientas/${path}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => window.previousOptionalDocument)).toBeUndefined();
    await expect(page.locator('#google-adsense, #cloudflare-web-analytics')).toHaveCount(0);
  }
});

test('las seis páginas se adaptan a móvil y ambos temas', async ({ page }) => {
  await fs.mkdir('work/new-tools-previews', { recursive: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => localStorage.setItem('herramientas-consent-v2', 'essential'));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of utilityPaths) {
    for (const theme of ['light', 'dark']) {
      await page.addInitScript(value => localStorage.setItem('ceronube-theme', value), theme);
      await page.goto(`${base}/herramientas/${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await page.screenshot({ path: `work/new-tools-previews/${path}-${theme}-mobile.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
