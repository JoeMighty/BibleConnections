const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');
const placesShown = (page) => page.evaluate(() => document.body.classList.contains('stage-places') && !document.getElementById('geo').hidden);

test('the Connections and Places switch changes the main map and the link', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('[data-stage=arcs]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-stage=places]').click();
  expect(await placesShown(page)).toBe(true);
  await expect(page).toHaveURL(/view=places/);
  await expect(page.locator('#panelTitle')).toHaveText('Places');
  await expect(page.locator('#geoCanvas')).toBeVisible();
  await page.locator('[data-stage=arcs]').click();
  expect(await placesShown(page)).toBe(false);
  await expect(page.locator('#panelTitle')).toHaveText('Explore');
  // the M key switches too
  await page.locator('#viz').focus();
  await page.keyboard.press('m');
  expect(await placesShown(page)).toBe(true);
});

test('the places map follows what is open: a chapter, then a place', async ({ page }) => {
  await page.goto('/?ref=Acts+16&stage=places');
  await ready(page);
  expect(await placesShown(page)).toBe(true);
  await expect(page.locator('#panelTitle')).toHaveText('Acts 16');
  await expect(page.locator('#rangeStudy [data-action=toPlaces]')).toBeVisible();
  // choosing a dot opens that place: Philippi is highlighted, so search for it and click it on the map
  await page.goto('/?geo=Philippi&stage=places');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Philippi');
  await expect(page).toHaveURL(/stage=places/);
  const box = await page.locator('#geoCanvas').boundingBox();
  // zoomed in on the open place, only the places nearby are drawn
  expect(await page.evaluate(() => document.getElementById('geoCanvas')._hit.length)).toBeGreaterThan(0);
  // a click on the map centre (where the open place is) keeps it open
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#panelTitle')).toHaveText('Philippi');
});

test('routes draw a journey with numbered stops', async ({ page }) => {
  await page.goto('/?view=places');
  await ready(page);
  await page.locator('[data-action=openRoute][data-id=paul2]').click();
  await expect(page.locator('#panelTitle')).toHaveText("Paul's second journey");
  await expect(page).toHaveURL(/route=paul2/);
  await expect(page.locator('#panel ol.chain li')).toHaveCount(14);
  const results = await new AxeBuilder({ page }).include('#panel').include('.stage-switch').analyze();
  expect(results.violations).toEqual([]);
  await page.goto('/?route=exodus&lang=pt');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('O êxodo');
  expect(await placesShown(page)).toBe(true);
});

test('every route stop is a real place and passage', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  const bad = await page.evaluate(async () => {
    const routes = await (await fetch('content/routes.json')).json();
    const names = new Set((await (await fetch('data/places.json')).json()).places.map(p => p[0]));
    const b = (await (await fetch('data/books.json')).json()).books;
    const ok = (o) => { const [bk, c, v] = o.split('.'); const B = b.find(x => x.osis === bk); return B && B.chapters[c - 1] && +v <= B.chapters[c - 1]; };
    return routes.flatMap(r => r.stops.filter(s => !names.has(s.place) || !ok(s.ref)).map(s => `${r.id} ${s.place} ${s.ref}`));
  });
  expect(bad).toEqual([]);
});

test('the places map can be zoomed with the buttons and the keyboard', async ({ page }) => {
  await page.goto('/?view=places');
  await ready(page);
  const n0 = await page.evaluate(() => document.getElementById('geoCanvas')._hit.length);
  await page.locator('#geoIsrael').click();
  await page.waitForTimeout(200);
  const n1 = await page.evaluate(() => document.getElementById('geoCanvas')._hit.length);
  expect(n1).not.toBe(n0);
  await page.locator('#geo').focus();
  await page.keyboard.press('0');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.getElementById('geoCanvas')._hit.length)).toBe(n0);
});
