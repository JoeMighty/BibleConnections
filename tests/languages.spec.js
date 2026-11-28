const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const CASES = [
  ['fr', 'Jean 3:16', 'Jean 3:16', 'https://www.bible.com/bible/152/JHN.3.16.S21', 'Explorer'],
  ['ko', '요한복음 3:16', '요한복음 3:16', 'https://www.bible.com/bible/88/JHN.3.16.KRV', '탐험'],
  ['zh', '约翰福音 3:16', '约翰福音 3:16', 'https://www.bible.com/bible/48/JHN.3.16.CUNPSS', '探索'],
];
for (const [lang, q, title, read, explore] of CASES) {
  test(`the site works in ${lang}: interface, search by its book names, its Bible, and pages`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
    await page.goto(`/?lang=${lang}`);
    await page.waitForSelector('body[data-ready=true]');
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('[data-nav=explore]').first()).toContainText(explore);
    await page.locator('#landingQ').fill(q);
    await page.locator('#landingSearch').evaluate(f => f.requestSubmit());
    await expect(page.locator('#panelTitle')).toHaveText(title);
    await expect(page.locator('.verse-card a').first()).toHaveAttribute('href', read);
    // English book names still work in any language
    await page.goto(`/?lang=${lang}&ref=Romans+8%3A28`);
    await page.waitForSelector('body[data-ready=true]');
    await expect(page.locator('#panelTitle')).not.toHaveText(/Romans/);
    await page.goto(`/help.html?lang=${lang}`);
    await expect(page.locator('h1')).not.toHaveText('Help and questions');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test('Settings offers all six languages and the footers link them', async ({ page }) => {
  await page.goto('/guide.html');
  for (const l of ['es', 'pt', 'fr', 'ko', 'zh']) await expect(page.locator(`.foot-lang a[hreflang="${l === 'zh' ? 'zh' : l}"], .foot-lang a[href*="lang=${l}"]`).first()).toBeVisible();
  await page.goto('/');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#settings input[name=language]')).toHaveCount(6);
});
