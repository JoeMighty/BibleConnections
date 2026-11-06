const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('grammar can be shown under each original word and is remembered', async ({ page }) => {
  await page.goto('/?ref=John+1%3A1');
  await ready(page);
  const btn = page.locator('[data-action=toggleGrammar]');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#origText .o-gr').first()).toBeHidden();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(btn).toHaveText('Hide grammar');
  await expect(page.locator('#origText .o-gr').nth(1)).toHaveText('noun, dative, singular, feminine');
  await page.goto('/?ref=Genesis+1%3A1');
  await ready(page);
  await expect(page.locator('#origText .o-gr').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).include('#origText').analyze();
  expect(results.violations).toEqual([]);
});

test('the timeline lists events by period and links to passages, places and the map', async ({ page }) => {
  await page.goto('/?view=timeline');
  await ready(page);
  await expect(page.locator('.tl-era')).toHaveCount(9);
  await expect(page.locator('ol.timeline li')).toHaveCount(40);
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
  await page.locator('ol.timeline li', { hasText: 'Jesus is born' }).locator('[data-action=focusRange]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Luke 2:1-20');
  await page.goto('/?view=timeline');
  await ready(page);
  await page.locator('[data-action=openEra][data-era=exile]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Exile and return');
  await expect(page).toHaveURL(/era=exile/);
  await page.goto('/?view=timeline');
  await ready(page);
  await page.locator('[data-action=openGeoName][data-name=Patmos]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Patmos');
});

test('timeline references point to real verses and places', async ({ page }) => {
  await page.goto('/?view=timeline');
  await ready(page);
  const bad = await page.evaluate(async () => {
    const t = await (await fetch('content/timeline.json')).json();
    const b = (await (await fetch('data/books.json')).json()).books;
    const ok = (o) => { const [bk, c, v] = o.split('.'); const B = b.find(x => x.osis === bk); return B && B.chapters[c - 1] && +v <= B.chapters[c - 1]; };
    return t.events.flatMap(e => [e.ref, e.end].filter(Boolean)).filter(r => !ok(r));
  });
  expect(bad).toEqual([]);
});
