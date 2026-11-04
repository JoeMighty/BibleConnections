const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('child_process');
const fs = require('fs');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.route('https://gc.zgo.at/**', (route) => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
});

test('word study finds Hebrew and Greek words and lights up their verses', async ({ page }) => {
  await page.goto('/?view=wordstudy');
  await ready(page);
  await expect(page.locator('[data-action=openWord][data-code=H2617]')).toBeVisible();
  await page.fill('#wordQ', 'agape');
  await expect(page.locator('#wordResults .conn-item').first()).toContainText('agapē');
  await page.locator('[data-action=openWord][data-code=H2617]').click();
  await expect(page.locator('.lemma')).toBeVisible();
  await expect(page.locator('#contextList')).toContainText('Original word: che.sed');
  await expect(page).toHaveURL(/word=H2617/);
  await expect(page.locator('#panel')).toContainText('STEP Bible');
});

test('chronological order reshapes the map and is shareable', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.locator('#filtersBox summary').click();
  await page.locator('label:has(input[name=order][value=chrono])').click();
  await expect(page).toHaveURL(/order=chrono/);
  await expect(page.locator('#contextList')).toContainText('Chronological order');
  // Job now sits right after Genesis
  const order = await page.evaluate(() => 0);
  await page.locator('[data-clear=order]').click();
  await expect(page).not.toHaveURL(/order=chrono/);
});

test('collections can be built, stepped through and shared', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await page.click('[data-action=addToCollection]');
  await page.fill('#colNewName', 'Sunday');
  await page.click('#colAdd');
  await page.goto('/?c=Rom.8.28_Gen.50.20');
  await ready(page);
  await page.click('[data-action=addToCollection]');
  await page.click('#colAdd');
  await page.goto('/?view=collections');
  await ready(page);
  await page.locator('[data-action=openCollection]').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('Sunday');
  await expect(page.locator('.series-list li')).toHaveCount(2);
  const shared = page.url();
  expect(shared).toContain('collection=');
  await page.click('[data-action=playCollection][data-idx="0"]');
  await expect(page.locator('#colBarText')).toHaveText('Sunday · 1 of 2');
  await page.click('#colNext');
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await expect(page.locator('#colBarText')).toHaveText('Sunday · 2 of 2');
  // a fresh visitor opening the shared link sees it and can save it
  const other = await page.context().browser().newPage();
  await other.route('https://gc.zgo.at/**', (route) => route.fulfill({ body: '' }));
  await other.goto(shared);
  await ready(other);
  await expect(other.locator('#panelTitle')).toHaveText('Sunday');
  await expect(other.locator('[data-action=keepCollection]')).toBeVisible();
  await other.close();
});

test('kids mode shows kids journeys first with bigger text', async ({ page }) => {
  await page.goto('/?view=journeys');
  await ready(page);
  await page.click('#settingsBtn');
  await page.locator('label[for=kidsToggle]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-kids', 'on');
  await page.click('[data-nav=journeys]');
  await page.click('[data-nav=journeys]');
  await expect(page.locator('#panelBody h3').first()).toHaveText('For kids');
  await expect(page.locator('.journey-card').first()).toContainText('God keeps His promises');
});

test('reading plan reminders download as a calendar file', async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.goto('/?plan=messiah&day=1');
  await ready(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=planCalendar]')]);
  expect(dl.suggestedFilename()).toBe('bible-connections-messiah.ics');
  const text = fs.readFileSync(await dl.path(), 'utf8');
  expect(text).toContain('BEGIN:VEVENT');
  expect(text).toContain('plan=messiah&day=1');
});

test('story image downloads for a connection', async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.goto('/?c=Rom.8.28_Gen.50.20');
  await ready(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#panel [data-action=story]')]);
  expect(dl.suggestedFilename()).toBe('bible-connection-story.png');
});

test('describe this view summarizes the map for screen readers', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('.summary')).toContainText('John 3:16 has');
  await page.click('#describeBtn');
  await expect(page.locator('#announcer')).toContainText('connections');
});

test('the daily feeds match the site and are valid', async ({ page, request }) => {
  execFileSync('node', ['scripts/feeds.mjs']);
  const rss = await (await request.get('/feeds/daily.xml')).text();
  const ics = await (await request.get('/feeds/daily.ics')).text();
  expect(rss).toContain('<rss version="2.0">');
  expect(ics).toContain('BEGIN:VCALENDAR');
  await page.goto('/');
  await ready(page);
  const refs = (await page.locator('#landingCotd .cotd-refs').textContent()).replace(/\s*↔\s*and\s*/, ' and ').replace(/\s+/g, ' ').trim();
  expect(rss).toContain(`<title>${refs}</title>`);
});

test('approved note suggestions become note changes', () => {
  const body = '### First passage (for notes)\n\nGen.1.3\n\n### Second passage (for notes)\n\n2Cor.4.6\n\n### Kind of connection (for notes)\n\nEcho\n\n### Why do these passages connect? (for notes)\n\nGod spoke light into darkness at creation, and shines it in our hearts.\n';
  const p = 'site/content/notes.json', before = fs.readFileSync(p, 'utf8');
  try {
    const out = execFileSync('node', ['scripts/issue-to-note.mjs'], { env: { ...process.env, ISSUE_BODY: body, GITHUB_OUTPUT: '' } }).toString();
    expect(out).toContain('note for Gen.1.3 and 2Cor.4.6');
    expect(JSON.parse(fs.readFileSync(p, 'utf8')).some(n => n.from === 'Gen.1.3' && n.to === '2Cor.4.6')).toBe(true);
  } finally { fs.writeFileSync(p, before); }
});

test('errors are reported to visit stats at most three times', async ({ page }) => {
  page.removeAllListeners('pageerror');
  await page.addInitScript(() => {
    window.__events = [];
    Object.defineProperty(window, 'goatcounter', { value: { count: (e) => window.__events.push(e.path) }, configurable: true });
  });
  await page.goto('/?view=map');
  await ready(page);
  await page.evaluate(() => { for (let k = 0; k < 5; k++) setTimeout(() => { throw new Error('test ' + k); }); });
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__events)).filter(e => e === 'event/error').length).toBe(3);
});

test('suggest a note pre-fills both passages', async ({ page }) => {
  await page.goto('/?c=Gen.1.3_2Cor.4.6');
  await ready(page);
  const href = await page.locator('a[data-track=suggest]').getAttribute('href');
  expect(href).toContain('from=Gen.1.3');
  expect(href).toContain('to=2Cor.4.6');
});

for (const url of ['/?view=wordstudy', '/?word=G0026', '/?view=collections', '/?view=map&order=chrono']) {
  test(`no accessibility violations: ${url}`, async ({ page }) => {
    await page.goto(url);
    await ready(page);
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

test('an optional second translation adds comparison links without changing the site language', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('.compare-row')).toHaveCount(0);
  await page.selectOption('#compareWith', 'MALOVBSI');
  const second = page.locator('.verse-card .compare-row a').first();
  await expect(second).toHaveAttribute('href', 'https://www.bible.com/bible/1693/JHN.3.16.MALOVBSI');
  await expect(second).toContainText('Read in Malayalam OV');
  await expect(page.locator('.verse-card a').first()).toHaveAttribute('href', 'https://www.bible.com/bible/111/JHN.3.16.NIV');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  // the choice is remembered and mirrored in Settings
  await page.reload();
  await ready(page);
  await expect(page.locator('#compareWith')).toHaveValue('MALOVBSI');
  await expect(page.locator('#version2Sel')).toHaveValue('MALOVBSI');
  // choosing None goes back to one translation
  await page.selectOption('#compareWith', '');
  await expect(page.locator('.compare-row')).toHaveCount(0);
});

test('the reading translation can be changed without opening Settings', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await page.selectOption('#readIn', 'IRVMAL');
  await expect(page.locator('.verse-card a').first()).toHaveAttribute('href', 'https://www.bible.com/bible/1912/JHN.3.16.IRVMAL');
  await expect(page.locator('#versionSel')).toHaveValue('IRVMAL');
});
