const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('the welcome page footer links to How to use and the Roadmap', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready=true]');
  const foot = page.locator('.landing-foot');
  await expect(foot.getByRole('link', { name: 'How to use' })).toHaveAttribute('href', 'guide.html');
  await expect(foot.getByRole('link', { name: 'Roadmap' })).toHaveAttribute('href', 'roadmap.html');
  await foot.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page.locator('h1')).toHaveText('Roadmap');
});

for (const theme of ['light', 'dark']) {
  test(`How to use and Roadmap pages are accessible (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const u of ['/guide.html', '/roadmap.html']) {
      await page.goto(u);
      await expect(page.locator('main h1')).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, u).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('every Try it link in the guide opens something on the site', async ({ page }) => {
  await page.goto('/guide.html');
  const links = await page.locator('.try a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(links.length).toBeGreaterThan(10);
  for (const href of links) {
    await page.goto('/' + href.replace(/^\.\//, ''));
    await page.waitForSelector('body[data-ready=true]');
    await expect(page.locator('#landing'), href).toBeHidden();
    await expect(page.locator('#panelTitle'), href).not.toHaveText('');
    await expect(page.locator('#searchError'), href).toHaveText('');
  }
});

test('the roadmap shows shipped work grayed out, plus work in progress and planned', async ({ page }) => {
  await page.goto('/roadmap.html');
  await expect(page.locator('#progress')).toHaveText('In progress');
  await expect(page.locator('.road.progress li').first()).toContainText('Prophecy and fulfilment explorer');
  await expect(page.locator('.release').first()).toContainText('Live now');
  const shipped = await page.locator('.release li').first().evaluate(e => getComputedStyle(e).color);
  const planned = await page.locator('.road li h3').first().evaluate(e => getComputedStyle(e).color);
  expect(shipped).not.toBe(planned);
});

test('the pages follow the site language', async ({ page }) => {
  await page.goto('/guide.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Cómo usar Bible Connections');
  await expect(page.locator('.try a').first()).toHaveAttribute('href', /lang=es/);
  await page.goto('/roadmap.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Hoja de ruta');
});
