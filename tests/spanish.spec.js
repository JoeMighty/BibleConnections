const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => { page.on('pageerror', (e) => { throw e; }); });

test('Spanish interface with Spanish book names and NVI links', async ({ page }) => {
  await page.goto('/?view=map&lang=es');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('[data-nav=journeys]')).toHaveText('Recorridos');
  await page.fill('#search', 'Juan 3:16');
  await page.press('#search', 'Enter');
  await expect(page.locator('#panelTitle')).toHaveText('Juan 3:16');
  await expect(page.locator('.verse-card a').first()).toHaveAttribute('href', 'https://www.bible.com/bible/128/JHN.3.16.NVI');
  await expect(page.locator('.verse-card a').first()).toContainText('Leer en NVI');
  await expect(page).toHaveURL(/lang=es/);
});

test('Spanish references work with or without accents, and in English mode too', async ({ page }) => {
  await page.goto('/?view=map&lang=es');
  await ready(page);
  for (const [q, title] of [['Genesis 1:1', 'Génesis 1:1'], ['Éxodo 12', 'Éxodo 12'], ['Apocalipsis 21', 'Apocalipsis 21'], ['1 Corintios 13', '1 Corintios 13'], ['Salmo 23', 'Salmos 23']]) {
    await page.fill('#search', q); await page.press('#search', 'Enter');
    await expect(page.locator('#panelTitle')).toHaveText(title);
  }
  await page.goto('/?ref=Apocalipsis+21%3A4');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Revelation 21:4');
});

test('journeys are translated and notes are marked as English', async ({ page }) => {
  await page.goto('/?journey=lamb&step=1&lang=es');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('El Cordero de Dios');
  await expect(page.locator('.question')).toContainText('Para conversar');
  await page.goto('/?c=Rom.8.28_Gen.50.20&lang=es');
  await ready(page);
  await expect(page.locator('.note p[lang=en]')).toContainText('Joseph');
  await expect(page.locator('.note')).toContainText('Nota disponible solo en inglés');
});

test('switching language in Settings reloads in that language', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('#settingsBtn');
  await Promise.all([page.waitForURL(/lang=es/), page.check('input[name=language][value=es]')]);
  await ready(page);
  await expect(page.locator('[data-nav=path]')).toHaveText('Conectar');
  await page.click('#settingsBtn');
  await Promise.all([page.waitForURL((u) => !u.search.includes('lang=es')), page.check('input[name=language][value=en]')]);
  await ready(page);
  await expect(page.locator('[data-nav=path]')).toHaveText('Connect');
});

test('Spanish handout', async ({ page }) => {
  await page.goto('/handout.html?journey=exodus&lang=es');
  await expect(page.locator('h1')).toHaveText('Salida de Egipto: el camino a la libertad');
  await expect(page.locator('.refs').first()).toContainText('Lee Éxodo 3:7');
  await expect(page.locator('#printBtn')).toHaveText('Imprimir o guardar como PDF');
});

for (const url of ['/?lang=es', '/?view=map&lang=es', '/?view=insights&lang=es']) {
  test(`no accessibility violations in Spanish: ${url}`, async ({ page }) => {
    await page.goto(url);
    await ready(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}
