const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('the twelve days of Christmas plan follows the calendar and feeds the connection of the day', async ({ page }) => {
  await page.goto('/?view=plans&today=2026-12-28');
  await ready(page);
  const card = page.locator('.journey-card', { hasText: 'The twelve days of Christmas' });
  await expect(card).toContainText('Starts on Christmas Day, December 25, 2026.');
  await card.locator('[data-action=openPlan]').click();
  await expect(page.locator('#panel .step-count')).toContainText('Day 4 of 12');
  await expect(page.locator('#panel .step-title')).toHaveText('Rachel weeping');
  await page.goto('/?view=study&today=2026-12-28');
  await ready(page);
  await expect(page.locator('.cotd').first()).toContainText('Jeremiah 31:15');
});

test('Holy Week is dated from Easter, with a journey and a plan in both languages', async ({ page }) => {
  await page.goto('/?view=plans&today=2026-11-08');
  await ready(page);
  await expect(page.locator('.journey-card', { hasText: 'Holy Week' })).toContainText('Starts on Palm Sunday, March 21, 2027.');
  // Good Friday 2027 is 26 March
  await page.goto('/?view=study&today=2027-03-26');
  await ready(page);
  await expect(page.locator('.cotd').first()).toContainText('Psalms 22:1');
  await expect(page.locator('.cotd .tag').first()).toHaveText('Holy Week');
  await page.goto('/?view=study&today=2027-03-28&lang=es');
  await ready(page);
  await expect(page.locator('.cotd .tag').first()).toHaveText('Pascua');
  await page.goto('/?journey=holy-week&step=8');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Holy Week: the road to the cross');
  await expect(page.locator('#panel')).toContainText('Easter Sunday');
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
  await page.goto('/handout.html?journey=holy-week&guide=leader&lang=es');
  await expect(page.locator('h1')).toHaveText('Semana Santa: el camino a la cruz');
});

test('Portuguese book names work in search in any language', async ({ page }) => {
  for (const [q, want] of [['João 3:16', 'John 3:16'], ['Atos 2:1', 'Acts 2:1'], ['1 Coríntios 13', '1 Corinthians 13'], ['Apocalipse 21', 'Revelation 21'], ['Jo 3', 'Joshua 3']]) {
    await page.goto('/?ref=' + encodeURIComponent(q));
    await ready(page);
    await expect(page.locator('#panelTitle'), q).toHaveText(want);
  }
  const pt = await page.evaluate(async () => (await (await fetch('content/i18n/pt.json')).json()));
  expect(pt.books).toHaveLength(66);
  expect(pt.abbr).toHaveLength(66);
});
