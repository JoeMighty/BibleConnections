const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const pages = [
  ['home', '/'],
  ['verse', '/?ref=John+3%3A16'],
  ['connection', '/?c=Rom.8.28~Gen.50.20'],
  ['journey', '/?journey=lamb&step=1'],
  ['insights', '/?view=insights'],
];

for (const theme of ['dark', 'light']) {
  for (const [name, url] of pages) {
    test(`no accessibility violations: ${name} (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('bc.appearance', JSON.stringify(t)), theme);
      await page.goto(url);
      await page.waitForSelector('body[data-ready=true]');
      await page.evaluate(() => { document.getElementById('filtersBox').open = true; });
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
      expect(summary).toEqual([]);
    });
  }
}

test('settings and about dialogs are accessible', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready=true]');
  for (const id of ['settingsBtn', 'aboutBtn']) {
    await page.click('#' + id);
    const results = await new AxeBuilder({ page }).include('dialog[open]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map(v => v.id)).toEqual([]);
    await page.keyboard.press('Escape');
  }
});
