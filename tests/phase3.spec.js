const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('during Advent the connection of the day follows the Advent plan', async ({ page }) => {
  await page.goto('/?today=2026-11-29');
  await ready(page);
  const cotd = page.locator('#landingCotd');
  await expect(cotd.locator('.cotd-refs')).toContainText('Genesis 3:15');
  await expect(cotd.locator('.tag')).toHaveText('Advent');
  await page.goto('/?today=2026-12-25');
  await ready(page);
  await expect(cotd.locator('.tag')).toHaveText('Christmas');
  await expect(cotd.locator('.cotd-refs')).toContainText('John 1:14');
});

test('over the twelve days of Christmas it follows the Christmas journey, then returns to normal', async ({ page }) => {
  await page.goto('/?today=2026-12-26');
  await ready(page);
  await expect(page.locator('#landingCotd .tag')).toHaveText('Christmas');
  await expect(page.locator('#landingCotd .cotd-refs')).toContainText('John 1:1');
  await page.goto('/?today=2027-01-07');
  await ready(page);
  await expect(page.locator('#landingCotd .tag')).not.toHaveText(/Advent|Christmas/);
});

test('the Advent plan opens on today\'s reading and shows its start date', async ({ page }) => {
  await page.goto('/?view=plans&today=2026-12-03');
  await ready(page);
  const card = page.locator('.journey-card', { hasText: 'Advent: promise and fulfilment' });
  await expect(card).toContainText('Starts on Advent Sunday, November 29, 2026.');
  await card.locator('[data-action=openPlan]').click();
  await expect(page.locator('#panel .step-count')).toContainText('Day 5 of 27');
  await expect(page.locator('#panel .step-title')).toHaveText('Hope: a prophet like Moses');
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
});

test('the seasonal journeys are listed and translated', async ({ page }) => {
  await page.goto('/?view=journeys');
  await ready(page);
  await expect(page.locator('.journey-card h3').first()).toHaveText('Advent: waiting for the King');
  await expect(page.locator('.journey-card h3', { hasText: 'The first Christmas' })).toBeVisible();
  await page.goto('/?view=journeys&lang=es');
  await ready(page);
  await expect(page.locator('.journey-card h3').first()).toHaveText('Adviento: esperando al Rey');
});

test('every Advent reading lights up a real connection', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  const missing = await page.evaluate(async () => {
    const plans = await (await fetch('content/plans.json')).json();
    const meta = await (await fetch('data/books.json')).json();
    const raw = new Uint16Array(await (await fetch('data/refs.bin')).arrayBuffer());
    const idx = new Map();
    meta.books.forEach(b => { let s = b.start; b.chapters.forEach((n, ci) => { for (let v = 1; v <= n; v++) idx.set(`${b.osis}.${ci + 1}.${v}`, s + v - 1); s += n; }); });
    const has = (a, b) => { for (let i = 0; i < raw.length; i += 4) { const f = raw[i], t = raw[i + 1], e = raw[i + 2]; if ((f === a && t <= b && b <= e) || (f === b && t <= a && a <= e)) return true; } return false; };
    return plans.find(p => p.id === 'advent').days.filter(d => !has(idx.get(d.a), idx.get(d.b))).map(d => `${d.a} ${d.b}`);
  });
  expect(missing).toEqual([]);
});
