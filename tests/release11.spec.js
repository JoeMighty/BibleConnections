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
