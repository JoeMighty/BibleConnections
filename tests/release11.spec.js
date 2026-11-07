const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('prophecy explorer lists chains by group and opens one as stages on the map', async ({ page }) => {
  await page.goto('/?view=prophecy');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Prophecy and fulfilment');
  await expect(page.locator('[data-action=openChain]')).toHaveCount(23);
  let results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
  await page.locator('[data-action=openChain][data-id=bethlehem]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Born in Bethlehem');
  await expect(page).toHaveURL(/prophecy=bethlehem/);
  await expect(page.locator('ol.chain li')).toHaveCount(2);
  await expect(page.locator('ol.chain a').first()).toHaveAttribute('href', /bible\.com\/bible\/.+MIC\.5\.2/);
  results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
  await page.locator('[data-action=mode][data-mode=prophecy]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Prophecy and fulfilment');
});

test('prophecy chains open from a link, in Spanish too', async ({ page }) => {
  await page.goto('/?prophecy=newcovenant&lang=es');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('El nuevo pacto');
  await expect(page.locator('ol.chain li')).toHaveCount(3);
  await expect(page.locator('#panel')).toContainText('Todas las profecías');
});

test('prophecy references point to real verses', async ({ page }) => {
  await page.goto('/?view=prophecy');
  await ready(page);
  const bad = await page.evaluate(async () => {
    const p = await (await fetch('content/prophecy.json')).json();
    const b = (await (await fetch('data/books.json')).json()).books;
    const ok = (o) => { const [bk, c, v] = o.split('.'); const B = b.find(x => x.osis === bk); return B && B.chapters[c - 1] && +v <= B.chapters[c - 1]; };
    return p.groups.flatMap(g => g.chains).flatMap(c => [...c.stages.flatMap(s => [s.ref, s.end]), p.types[c.type] ? null : 'type ' + c.id]).filter(Boolean).filter(r => r.startsWith('type') || !ok(r));
  });
  expect(bad).toEqual([]);
});

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('a collection opens as slides with keyboard navigation and Bible.com links', async ({ page }) => {
  const c = enc({ n: 'The promised King', i: [['Genesis 3:15 ↔ Romans 16:20', '?c=Gen.3.15_Rom.16.20'], ['The suffering servant', '?prophecy=servant'], ['Advent, step 2', '?journey=advent&step=2']] });
  await page.goto('/slides.html?c=' + c);
  await expect(page.locator('.slide:not([hidden]) h1')).toHaveText('The promised King');
  await expect(page.locator('#counter')).toHaveText('1 / 5');
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.slide:not([hidden]) .refs a').first()).toHaveAttribute('href', /bible\.com\/bible\/111\/GEN\.3\.15\.NIV/);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.slide:not([hidden]) ol.stages li')).toHaveCount(3);
  await page.keyboard.press('End');
  await expect(page.locator('#counter')).toHaveText('5 / 5');
  await expect(page.locator('#nextBtn')).toBeDisabled();
  await expect(page).toHaveURL(/#5$/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('slides from the collection view, and a bad link explains itself', async ({ page }) => {
  const c = enc({ n: 'Mine', i: [['John 3:16', '?ref=John+3%3A16']] });
  await page.goto('/?collection=' + c);
  await ready(page);
  await expect(page.locator('a[href^="slides.html?c="]')).toBeVisible();
  await page.goto('/slides.html?c=nonsense');
  await expect(page.locator('.error')).toContainText('could not be opened');
});

test('leader guides have timings, preparation and every step', async ({ page }) => {
  await page.goto('/handout.html?journey=lamb&guide=leader');
  await expect(page.locator('.kicker')).toHaveText('Leader guide');
  await expect(page.locator('ol.steps > li')).toHaveCount(6);
  await expect(page.locator('.summary strong')).toHaveText('About 46 minutes');
  await expect(page.locator('a[href^="handout.html?journey=lamb"]')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.goto('/?journey=lamb&step=1');
  await ready(page);
  await expect(page.locator('a[href*="guide=leader"]').first()).toBeVisible();
});

test('small embed cards for a connection, verse, journey step and prophecy', async ({ page }) => {
  await page.goto('/card.html?c=Gen.3.15_Rom.16.20&theme=dark');
  await expect(page.locator('h1')).toHaveText('Genesis 3:15 ↔ Romans 16:20');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.goto('/card.html?journey=lamb&step=2&lang=es&theme=light');
  await expect(page.locator('.kicker')).toContainText('Paso 2 de 6');
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.goto('/card.html?verse=John.3.16');
  await expect(page.locator('.open')).toHaveAttribute('href', /\?ref=John%203%3A16/);
  await page.goto('/card.html?verse=Nope.1.1');
  await expect(page.locator('main')).toContainText('could not be shown');
});

test('the embed dialog offers a small card and fixed colors', async ({ page }) => {
  await page.goto('/?prophecy=bethlehem');
  await ready(page);
  await page.locator('[data-action=embed]').click();
  await page.locator('label:has(#embedKindCard)').click();
  await expect(page.locator('#embedCode')).toHaveValue(/card\.html\?prophecy=bethlehem/);
  await page.locator('#embedTheme').selectOption('dark');
  await expect(page.locator('#embedCode')).toHaveValue(/theme=dark/);
  await page.goto('/?view=study');
  await ready(page);
  await page.goto('/?prophecy=bethlehem&embed=1&colors=light');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
