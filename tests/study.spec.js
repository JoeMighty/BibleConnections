const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.route('https://gc.zgo.at/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
});

test('Study tab opens the study hub', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('[data-nav=study]');
  await expect(page.locator('#panelTitle')).toHaveText('Study');
  await expect(page.locator('.study-card')).toHaveCount(11);
  await expect(page.locator('#panel .cotd')).toBeVisible();
});

test('reading plan progress is saved', async ({ page }) => {
  await page.goto('/?view=plans');
  await ready(page);
  await page.locator('[data-action=openPlan][data-plan=story]').click();
  await expect(page.locator('.step-count').first()).toContainText('Day 1 of');
  await page.click('[data-action=planDone]');
  await expect(page.locator('[data-action=planDone]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/?view=plans');
  await ready(page);
  await expect(page.locator('.journey-card').first()).toContainText('1 of');
  await expect(page.locator('[data-action=openPlan][data-plan=story]')).toContainText('Continue');
});

test('people, places and topics light up their verses', async ({ page }) => {
  await page.goto('/?view=people');
  await ready(page);
  await page.locator('[data-action=entity][data-id=david]').click();
  await expect(page.locator('#panelTitle')).toHaveText('David');
  await expect(page.locator('#contextList')).toContainText('Person: David');
  await expect(page).toHaveURL(/person=david/);
  await page.goto('/?topic=forgiveness');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Forgiveness');
  await expect(page.locator('.verse-list li').first()).toBeVisible();
});

test('guess the connection keeps score', async ({ page }) => {
  await page.goto('/?view=game');
  await ready(page);
  await expect(page.locator('.answer')).toHaveCount(3);
  await page.locator('.answer').first().click();
  await expect(page.locator('.result')).toBeVisible();
  await expect(page.locator('.step-count')).toContainText('of 1');
  await page.click('[data-action=nextQuestion]');
  await expect(page.locator('.answer:not([disabled])')).toHaveCount(3);
});

test('connection of the day is the same all day and shown on the welcome page', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const first = await page.locator('#landingCotd .cotd-refs').textContent();
  await page.reload();
  await ready(page);
  await expect(page.locator('#landingCotd .cotd-refs')).toHaveText(first);
  await page.locator('#landingCotd [data-action=gotoRef]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
});

test('QR code, embed code and suggest a note', async ({ page }) => {
  await page.goto('/?c=Gen.1.3_2Cor.4.6');
  await ready(page);
  await page.click('[data-action=qr]');
  await expect(page.locator('#qrImage svg')).toBeVisible();
  const [qr] = await Promise.all([page.waitForEvent('download'), page.click('#qrDownload')]);
  expect(qr.suggestedFilename()).toBe('bible-connections-qr.png');
  await page.keyboard.press('Escape');
  await page.click('[data-action=embed]');
  await expect(page.locator('#embedCode')).toHaveValue(/<iframe src="[^"]+embed=1" title="Bible Connections: /);
  await page.keyboard.press('Escape');
  const href = await page.locator('a[data-track=suggest]').getAttribute('href');
  expect(href).toContain('github.com/JoeMighty/BibleConnections/issues/new');
  expect(decodeURIComponent(href)).toContain('Gen.1.3');
});

test('embed mode shows only the map with a link to the full site', async ({ page }) => {
  await page.goto('/?embed=1&ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#embedTitle')).toHaveText('John 3:16');
  await expect(page.locator('#embedOpen')).toHaveAttribute('href', /ref=John/);
  await expect(page.locator('#embedOpen')).not.toHaveAttribute('href', /embed=1/);
});

test('poster downloads as SVG and PNG', async ({ page, isMobile }) => {
  test.skip(isMobile);
  test.setTimeout(90_000);
  await page.goto('/?view=study');
  await ready(page);
  await page.click('[data-action=poster]');
  const [svg] = await Promise.all([page.waitForEvent('download'), page.click('#posterSvg')]);
  expect(svg.suggestedFilename()).toBe('bible-connections-poster.svg');
  const [png] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.click('#posterPng')]);
  expect(png.suggestedFilename()).toBe('bible-connections-poster.png');
});

test('usage events are sent for journeys, themes and the game', async ({ page }) => {
  await page.addInitScript(() => {
    window.__events = [];
    Object.defineProperty(window, 'goatcounter', { value: { count: (e) => window.__events.push(e.path) }, configurable: true });
  });
  await page.goto('/?view=game');
  await ready(page);
  await page.locator('.answer').first().click();
  expect(await page.evaluate(() => window.__events)).toContain('event/game/answer');
  await page.goto('/?journey=lamb&step=1');
  await ready(page);
  expect(await page.evaluate(() => window.__events)).toContain('event/journey/lamb');
});

test('Study is translated in Spanish', async ({ page }) => {
  await page.goto('/?view=study&lang=es');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Estudio');
  await expect(page.locator('.study-card').first()).toContainText('Planes de lectura');
});

for (const url of ['/?view=study', '/?plan=story&day=2', '/?view=game', '/?view=people', '/?topic=peace']) {
  test(`no accessibility violations: ${url}`, async ({ page }) => {
    await page.goto(url);
    await ready(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}
