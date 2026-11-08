const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('Portuguese is a full interface language with its own default Bible', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16&lang=pt');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page.locator('#panelTitle')).toHaveText('João 3:16');
  await expect(page.locator('#panel')).toContainText('Texto original');
  // Portuguese readers start in the Nova Versão Internacional (Bible.com id 129)
  await expect(page.locator('#panel a[href*="bible.com/bible/"]').first()).toHaveAttribute('href', /bible\.com\/bible\/129\//);
  // numbers are written the Portuguese way
  await expect(page.locator('header')).toContainText(/\d\.\d{3}/);
  // it is offered in Settings
  await page.locator('#settingsBtn').click();
  await expect(page.locator('input[name=language][value=pt]')).toBeChecked();
});

test('a phone set to Portuguese opens in Portuguese', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'pt-BR' });
  const page = await ctx.newPage();
  await page.goto('/?view=study');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page.locator('#panelTitle')).toHaveText('Estudo');
  await ctx.close();
});

test('Portuguese is complete', async () => {
  const out = execFileSync('node', ['scripts/i18n-check.mjs', 'pt'], { encoding: 'utf8' });
  const rows = out.split('\n').filter(l => /%$/.test(l.trim()));
  expect(rows.length).toBeGreaterThan(15);
  expect(rows.filter(l => !/100%$/.test(l.trim()))).toEqual([]);
});

test('the standalone pages follow the preview language', async ({ page }) => {
  await page.goto('/handout.html?journey=lamb&lang=pt');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page.locator('.refs').first()).toContainText('Gênesis 22:8');
  await page.goto('/card.html?verse=John.3.16&lang=pt');
  await expect(page.locator('h1')).toHaveText('João 3:16');
  await page.goto('/handout.html?journey=lamb&lang=es');
  await expect(page.locator('.refs').first()).toContainText('Lee Génesis 22:8');
});

test('Spanish is complete and the language checker runs', async () => {
  const out = execFileSync('node', ['scripts/i18n-check.mjs', 'es'], { encoding: 'utf8' });
  const rows = out.split('\n').filter(l => /%$/.test(l.trim()));
  expect(rows.length).toBeGreaterThan(15);
  expect(rows.filter(l => !/100%$/.test(l.trim()))).toEqual([]);
});
