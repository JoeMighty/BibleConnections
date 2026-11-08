const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
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
  await expect(page.locator('.journey-card', { has: page.locator('h3', { hasText: /^Holy Week$/ }) })).toContainText('Starts on Palm Sunday, March 21, 2027.');
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

test('Lent is dated from Easter, has 39 days, and leads into Holy Week', async ({ page }) => {
  await page.goto('/?view=plans&today=2026-11-08');
  await ready(page);
  await expect(page.locator('.journey-card', { hasText: 'Lent' })).toContainText('Starts on Ash Wednesday, February 10, 2027.');
  // Ash Wednesday 2027 is 10 February, and the day before Palm Sunday is day 39
  await page.goto('/?view=study&today=2027-02-10');
  await ready(page);
  await expect(page.locator('.cotd .tag').first()).toHaveText('Lent');
  await expect(page.locator('.cotd').first()).toContainText('Genesis 3:19');
  await page.goto('/?view=study&today=2027-03-21');
  await ready(page);
  await expect(page.locator('.cotd .tag').first()).toHaveText('Holy Week');
});

test('the welcome page shows the season, or the next one coming up', async ({ page }) => {
  await page.goto('/?today=2026-11-08');
  await ready(page);
  await expect(page.locator('#seasonBanner')).toContainText('Advent starts on Sunday, November 29.');
  await page.goto('/?today=2027-02-10');
  await ready(page);
  await expect(page.locator('#seasonBanner')).toContainText('Lent · Day 1 of 39');
  await page.locator('#seasonBanner [data-season-plan]').click();
  await expect(page.locator('#panel .step-count')).toContainText('Day 1 of 39');
  await page.goto('/?today=2026-12-01&lang=es');
  await ready(page);
  await expect(page.locator('#seasonBanner')).toContainText('Adviento · Día 3 de 27');
  await expect(page.locator('#seasonBanner [data-season-journey]')).toBeVisible();
  await page.goto('/?today=2027-05-01');
  await ready(page);
  await expect(page.locator('#seasonBanner')).toBeHidden();
});

test('an approved weak link report becomes an entry in weak-links.json', async () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const file = path.join(os.tmpdir(), `weak-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ hidden: [] }));
  const run = (body) => execFileSync('node', ['scripts/issue-to-weak-link.mjs'], { encoding: 'utf8', env: { ...process.env, ISSUE_BODY: body, WEAK_LINKS_FILE: file, GITHUB_OUTPUT: '' } });
  const body = '### First passage\n\nGen.1.1\n\n### Second passage\n\nJohn.1.1\n\n### What is wrong with it?\n\nIt only matches a common word\n\n### Details\n\n_No response_';
  expect(run(body)).toContain('Hidden Gen.1.1 and John.1.1');
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).hidden).toEqual([['Gen.1.1', 'John.1.1', 'It only matches a common word']]);
  expect(run(body)).toContain('already hidden');
  expect(run('### First passage\n\nGenesis 1\n\n### Second passage\n\nnothing')).toContain('Not a complete weak link report');
  fs.unlinkSync(file);
  // the real list is valid
  const real = JSON.parse(fs.readFileSync('site/content/weak-links.json', 'utf8'));
  expect(Array.isArray(real.hidden)).toBe(true);
});
