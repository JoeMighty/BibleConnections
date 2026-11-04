const { test, expect } = require('@playwright/test');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test.beforeEach(async ({ page }) => { page.on('pageerror', (e) => { throw e; }); });

test('finds the chain of links between two passages', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('[data-nav=path]');
  await expect(page.locator('#panelTitle')).toHaveText('How are these connected?');
  await page.fill('#pathFrom', 'Genesis 3:15');
  await page.fill('#pathTo', 'Revelation 12:9');
  await page.press('#pathTo', 'Enter');
  await expect(page.locator('.chain li').first()).toContainText('Genesis 3:15');
  await expect(page.locator('.chain li').last()).toContainText('Revelation 12:9');
  await expect(page).toHaveURL(/path=Genesis/);
});

test('a shared chain link opens the result', async ({ page }) => {
  await page.goto('/?path=Exodus+12~John+1%3A29');
  await ready(page);
  await expect(page.locator('.chain li').last()).toContainText('John 1:29');
});

test('bad references in the chain finder show a helpful message', async ({ page }) => {
  await page.goto('/?view=path');
  await ready(page);
  await page.fill('#pathFrom', 'Nothing 1');
  await page.fill('#pathTo', 'John 3:16');
  await page.press('#pathTo', 'Enter');
  await expect(page.locator('.path-form + .hint + .field-error, .field-error[role=alert]').last()).toBeVisible();
});

test('save, then find it again under Saved and Recently viewed', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.fill('#search', 'John 3:16');
  await page.press('#search', 'Enter');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.click('[data-action=save]');
  await expect(page.locator('[data-action=save]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#startOver');
  await expect(page.locator('.mini-list').first()).toContainText('John 3:16');
  await page.locator('.mini-list [data-action=goto]').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.click('#homeBtn');
  await expect(page.locator('#landingRecent')).toContainText('John 3:16');
});

test('save image downloads a picture of the view', async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#saveImage')]);
  expect(download.suggestedFilename()).toBe('bible-connections.png');
});

test('link preview tags are present', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/);
  expect((await request.get('/og-image.png')).status()).toBe(200);
});

test('WebGL renderer draws the arcs when available', async ({ page, isMobile }) => {
  test.skip(isMobile);
  test.setTimeout(90_000);
  await page.goto('/?view=map&renderer=webgl');
  await ready(page);
  const renderer = await page.evaluate(() => document.body.dataset.renderer);
  test.skip(renderer !== 'webgl', 'WebGL2 not available in this browser');
  await page.waitForTimeout(3000);
  const lit = await page.evaluate(() => {
    const src = document.getElementById('glCanvas');
    const c = document.createElement('canvas'); c.width = 200; c.height = 100;
    const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0, 200, 100);
    const d = ctx.getImageData(0, 0, 200, 100).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 120) n++;
    return n;
  });
  expect(lit).toBeGreaterThan(500);
});

test('falls back to the 2D canvas renderer', async ({ page }) => {
  await page.goto('/?view=map&renderer=canvas');
  await ready(page);
  expect(await page.evaluate(() => document.body.dataset.renderer)).toBe('canvas');
  await expect(page.locator('#count')).toContainText('Showing');
});

test.describe(() => {
test.use({ serviceWorkers: 'block' });
test('usage stats stay off unless configured, and load when switched on', async ({ page }) => {
  await page.route('**/content/config.json', (route) => route.fulfill({ json: { analytics: { provider: '' } } }));
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('script[src*="goatcounter"], script[src*="gc.zgo.at"]')).toHaveCount(0);
  await page.unroute('**/content/config.json');
  await page.route('**/content/config.json', (route) => route.fulfill({ json: { analytics: { provider: 'goatcounter', goatcounterCode: 'example' } } }));
  await page.route('https://gc.zgo.at/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.reload();
  await ready(page);
  await expect(page.locator('script[src="https://gc.zgo.at/count.js"]')).toHaveCount(1);
  await expect(page.locator('#aboutStats')).not.toHaveAttribute('hidden', '');
});

test('the live site counts visits with GoatCounter and respects Do Not Track', async ({ page, context }) => {
  await page.route('https://gc.zgo.at/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('script[data-goatcounter="https://bibleconnections.goatcounter.com/count"]')).toHaveCount(1);
  await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
  await page.reload();
  await ready(page);
  await expect(page.locator('script[data-goatcounter]')).toHaveCount(0);
});
});

test('translation list includes Spanish versions', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('#versionSel optgroup[label="Español (Spanish)"] option[value=NVI]')).toHaveCount(1);
});
