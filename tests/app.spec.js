const { test, expect } = require('@playwright/test');

const ready = (page) => page.waitForSelector('body[data-ready=true]');
// choose a translation in the searchable picker by typing its code
const pickVersion = async (page, id, query) => {
  await page.click(`#${id}Pick`);
  await page.fill(`#${id}Pick`, query);
  await page.keyboard.press('Enter');
};

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('landing page shows on first visit and opens the map', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#landingStats li')).toHaveCount(4);
  await page.click('[data-start=map]');
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#viz')).toBeFocused();
  await expect(page).toHaveURL(/view=map/);
  await page.reload();
  await ready(page);
  await expect(page.locator('#landing')).toBeHidden();
});

test('landing is always the homepage and the back button returns to it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.click('[data-start=map]');
  await expect(page.locator('#landing')).toBeHidden();
  await page.goBack();
  await expect(page.locator('#landing')).toBeVisible();
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#landing')).toBeVisible();
});

test('landing search, theme and journey shortcuts work', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.fill('#landingQ', 'John 3:16');
  await page.press('#landingQ', 'Enter');
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.click('#homeLink');
  await expect(page.locator('#landing')).toBeVisible();
  await page.locator('#landingThemes [data-theme=messiah]').click();
  await expect(page.locator('#theme')).toHaveValue('messiah');
  await page.click('#homeLink');
  await page.click('[data-start=journeys]');
  await expect(page.locator('#panelTitle')).toHaveText('Guided journeys');
});

test('landing is skipped for shared links', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('#landing')).toBeHidden();
});

test('loads the map with the default connections', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('#count')).toContainText('Showing');
  await expect(page.locator('#panelTitle')).toHaveText('Explore');
  await expect(page.locator('.conn-item').first()).toBeVisible();
});

test('search finds verses, chapters and books', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  for (const [q, title] of [['John 3:16', 'John 3:16'], ['1 Cor 13', '1 Corinthians 13'], ['Psalm 23', 'Psalms 23'], ['II Kings 2', '2 Kings 2'], ['Genesis', 'Genesis']]) {
    await page.fill('#search', q);
    await page.press('#search', 'Enter');
    await expect(page.locator('#panelTitle')).toHaveText(title);
  }
  await page.fill('#search', 'John 30');
  await page.press('#search', 'Enter');
  await expect(page.locator('#searchError')).toContainText('21 chapters');
});

test('word search lists verses and connections', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.fill('#search', 'shepherd');
  await page.press('#search', 'Enter');
  await expect(page.locator('#panelTitle')).toHaveText('“shepherd”');
  await expect(page.locator('.verse-list li').first()).toBeVisible();
  await expect(page).toHaveURL(/q=shepherd/);
});

test('verses link to Bible.com in the chosen translation', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const link = page.locator('.verse-card a').first();
  await expect(link).toHaveAttribute('href', 'https://www.bible.com/bible/111/JHN.3.16.NIV');
  await expect(link).toHaveAttribute('target', '_blank');
  await page.click('#settingsBtn');
  await pickVersion(page, 'versionSel', 'ESV');
  await page.click('#settingsForm button.btn:not(#installBtn)');
  await expect(page.locator('.verse-card a').first()).toHaveAttribute('href', 'https://www.bible.com/bible/59/JHN.3.16.ESV');
  await expect(page.locator('.verse-card a').nth(1)).toHaveAttribute('href', 'https://www.bible.com/bible/59/JHN.3.ESV');
});

test('a shared connection link opens that connection with its note', async ({ page }) => {
  await page.goto('/?c=Rom.8.28~Gen.50.20');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await expect(page.locator('.verse-card .ref').first()).toHaveText(/Romans 8:28|Genesis 50:20/);
  await expect(page.locator('.note')).toContainText('Joseph');
});

test('selecting a connection updates the URL for sharing', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.locator('.conn-item').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await expect(page).toHaveURL(/c=[A-Za-z0-9]+\.\d+\.\d+_/);
});

test('copy references puts text on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?c=Rom.8.28~Gen.50.20');
  await ready(page);
  await page.click('[data-action=copy]');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Romans 8:28');
  expect(text).toContain('bible.com');
});

test('guided journey steps forward and back', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('[data-nav=journeys]');
  await expect(page.locator('#panelTitle')).toHaveText('Guided journeys');
  await page.locator('[data-action=startJourney]').first().click();
  await expect(page.locator('.step-count')).toContainText('Step 1 of');
  await page.click('[data-action=stepNext]');
  await expect(page.locator('.step-count')).toContainText('Step 2 of');
  await expect(page).toHaveURL(/journey=lamb&step=2/);
  await page.click('[data-action=stepPrev]');
  await expect(page.locator('.step-count')).toContainText('Step 1 of');
});

test('insights show rankings and the category heatmap filters the map', async ({ page }) => {
  await page.goto('/?view=insights');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Insights');
  await expect(page.locator('.rank-list li')).not.toHaveCount(0);
  await page.locator('.heat-cell[data-a=law][data-b=gospels]').click();
  await expect(page.locator('#fromSel')).toHaveValue('cat:law');
  await expect(page.locator('#toSel')).toHaveValue('cat:gospels');
});

test('notes-only filter shows explained connections', async ({ page }) => {
  await page.goto('/?notes=1');
  await ready(page);
  await page.locator('.conn-item').first().click();
  await expect(page.locator('.note')).toBeVisible();
});

test('light mode and high contrast settings apply and persist', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('#settingsBtn');
  await page.check('input[name=appearance][value=light]');
  await page.check('#contrastToggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  await page.reload();
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('keyboard can explore the map', async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.goto('/?view=map');
  await ready(page);
  await page.focus('#viz');
  await page.keyboard.press('n');
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await page.keyboard.press('Escape');
  await expect(page.locator('#panelTitle')).toHaveText('Explore');
});

test('clicking an arc on the map opens it', async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.goto('/?view=map');
  await ready(page);
  const box = await page.locator('#viz').boundingBox();
  // sweep upwards from the baseline until an arc is hit
  for (let y = box.height - 100; y > 40; y -= 6) {
    await page.mouse.click(box.x + box.width * 0.45, box.y + y);
    if ((await page.locator('#panelTitle').textContent()) === 'Connection') break;
  }
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.goto('/?view=map');
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length >= 10);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await expect(page.locator('#count')).toContainText('Showing');
  await context.setOffline(false);
});

test('you are viewing bar removes items one at a time and start over clears everything', async ({ page }) => {
  await page.goto('/?theme=love&min=10&ref=John+3%3A16');
  await ready(page);
  const bar = page.locator('#contextBar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('.ctx-chip')).toHaveCount(3);
  await bar.locator('[data-clear=votes]').click();
  await expect(bar.locator('.ctx-chip')).toHaveCount(2);
  await expect(page.locator('#votes')).toHaveValue('7');
  await page.click('#startOver');
  await expect(bar).toBeHidden();
  await expect(page.locator('#theme')).toHaveValue('');
  await expect(page.locator('#panelTitle')).toHaveText('Explore');
  await expect(page).toHaveURL(/\?view=map$/);
});

test('browser back steps back through what you looked at', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.fill('#search', 'John 3:16');
  await page.press('#search', 'Enter');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.locator('.conn-item').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await page.goBack();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.goBack();
  await expect(page.locator('#panelTitle')).toHaveText('Explore');
});

test('home button returns to the landing page and clears everything', async ({ page }) => {
  await page.goto('/?theme=love&ref=John+3%3A16');
  await ready(page);
  await page.click('#homeBtn');
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.click('[data-start=map]');
  await expect(page.locator('#contextBar')).toBeHidden();
});

for (const [name, viewport] of [['iPad landscape', { width: 1180, height: 820 }], ['iPad portrait', { width: 820, height: 1180 }], ['phone', { width: 390, height: 664 }]]) {
  test(`landing can be scrolled to the very bottom on ${name}`, async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await ready(page);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const last = page.locator('#landing .credit-line');
    const box = await last.boundingBox();
    // the last line must be fully on screen (and above the tab bar on small screens)
    const tabbar = await page.locator('.header-nav').boundingBox();
    const limit = viewport.width <= 860 ? tabbar.y : viewport.height;
    expect(box.y + box.height).toBeLessThanOrEqual(limit + 1);
    expect(box.y).toBeGreaterThan(0);
  });
}

test('welcome page cards open word study and the passage explorer', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#landingSpectrum span')).toHaveCount(10);
  await page.locator('.way[data-start=wordstudy]').click();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('Word study');
  await page.goto('/');
  await ready(page);
  await page.locator('.way[data-start=passage]').click();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await expect(page.locator('#secContext')).toBeVisible();
});
