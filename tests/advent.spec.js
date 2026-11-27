const { test, expect } = require('@playwright/test');

test('the Advent page lists every day with dates and marks today', async ({ page }) => {
  await page.goto('/advent.html?today=2026-12-03');
  await expect(page.locator('h1')).toHaveText('Advent: promise and fulfilment');
  await expect(page.locator('.advent-day')).toHaveCount(27);
  await expect(page.locator('.advent-day').first()).toContainText('Sunday, November 29');
  await expect(page.locator('.advent-day').last()).toContainText('Friday, December 25');
  await expect(page.locator('.advent-day[aria-current="date"]')).toHaveAttribute('id', 'day-5');
  await expect(page.locator('.advent-today')).toContainText('Day 5 of 27');
  await expect(page.locator('.advent-today .btn').first()).toHaveAttribute('href', './?plan=advent&day=5');
  // passages open on Bible.com, with no translation text on the page
  await expect(page.locator('.advent-day').first().locator('.advent-refs a').first()).toHaveAttribute('href', /bible\.com\/bible\/111\/GEN\.3\.15\.NIV/);
  await expect(page.locator('section h2')).toContainText(['Hope', 'Peace', 'Joy', 'Love']);
});

test('the Advent page shows a start button before Advent, next year after Christmas, and works in Spanish', async ({ page }) => {
  await page.goto('/advent.html?today=2026-11-27');
  await expect(page.locator('.advent-today')).toHaveCount(0);
  await expect(page.locator('main .actions .btn').first()).toHaveText('Start the plan');
  await page.goto('/advent.html?today=2026-12-28');
  await expect(page.locator('.advent-day').first()).toContainText('Sunday, November 28');
  await page.goto('/advent.html?lang=es&today=2026-12-01');
  await expect(page.locator('h1')).toHaveText('Adviento: promesa y cumplimiento');
  await expect(page.locator('.advent-day').first().locator('.advent-refs a').first()).toContainText('Génesis 3:15');
  await expect(page.locator('.advent-today .btn').first()).toHaveAttribute('href', './?plan=advent&day=3&lang=es');
});

test('a day on the Advent page opens that day on the map', async ({ page }) => {
  await page.goto('/advent.html?today=2026-12-03');
  await expect(page.locator('.share-url code')).toHaveText(/\/advent\.html$/);
  await page.locator('.advent-day').nth(2).getByRole('link', { name: 'See it on the map' }).click();
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panelTitle')).not.toHaveText('');
});

test('the welcome page links to the Advent page in season, and the Support page is in More', async ({ page }) => {
  await page.goto('/?today=2026-11-30');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#seasonBanner a[href="advent.html"]')).toBeVisible();
  await expect(page.locator('#seasonBanner [data-action="shareAdvent"]')).toBeVisible();
  await page.goto('/?view=more');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panel a[href="support.html"]')).toBeVisible();
  await expect(page.locator('#panel a[href="advent.html"]')).toBeVisible();
});

test('the Support page lists ways to help, and hides giving until a link is set', async ({ page }) => {
  await page.goto('/support.html');
  await expect(page.locator('h1')).toHaveText('Support Bible Connections');
  await expect(page.locator('main .card')).toHaveCount(4);
  await expect(page.locator('.support-give')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Make a poster' })).toHaveCount(0);
});

test('?poster=1 opens the poster window', async ({ page }) => {
  await page.goto('/?poster=1&view=map');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#posterDialog')).toBeVisible();
});

test('the Support page shows giving buttons once a link is in the config', async ({ page }) => {
  await page.route('**/content/config.json', r => r.fulfill({ json: { support: { give: [{ label: 'Give on Ko-fi', url: 'https://ko-fi.com/example' }, { label: 'Bad', url: 'javascript:alert(1)' }] } } }));
  await page.goto('/support.html');
  await expect(page.locator('.support-give .btn')).toHaveCount(1);
  await expect(page.locator('.support-give .btn')).toHaveAttribute('href', 'https://ko-fi.com/example');
});

test('the Help page answers questions in groups, opens a linked question, and is in every language', async ({ page }) => {
  await page.goto('/help.html#why-can-t-i-read-the-verses-on-this-site');
  await expect(page.locator('h1')).toHaveText('Help and questions');
  expect(await page.locator('details.faq').count()).toBeGreaterThan(15);
  await expect(page.locator('#why-can-t-i-read-the-verses-on-this-site')).toHaveAttribute('open', '');
  await expect(page.locator('#why-can-t-i-read-the-verses-on-this-site p')).toContainText('Bible.com');
  const first = page.locator('details.faq').first();
  await first.locator('summary').click();
  await expect(first.locator('p')).toBeVisible();
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').last().textContent());
  expect(ld['@type']).toBe('FAQPage');
  await expect(page.locator('.faq-more a[href^="mailto:"]')).toHaveCount(1);
  await page.goto('/help.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Ayuda y preguntas');
  await page.goto('/help.html?lang=pt');
  await expect(page.locator('h1')).toHaveText('Ajuda e perguntas');
  await page.goto('/?view=more');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panel a[href="help.html"]')).toBeVisible();
});

test('the Christmas page lists the twelve days from Christmas Day and marks today', async ({ page }) => {
  await page.goto('/christmas.html?today=2026-12-28');
  await expect(page.locator('h1')).toHaveText('The twelve days of Christmas');
  await expect(page.locator('.advent-day')).toHaveCount(12);
  await expect(page.locator('.advent-day').first()).toContainText('Friday, December 25');
  await expect(page.locator('.advent-day').last()).toContainText('Tuesday, January 5');
  await expect(page.locator('.advent-day[aria-current="date"]')).toHaveAttribute('id', 'day-4');
  await expect(page.locator('.advent-today .btn').first()).toHaveAttribute('href', './?plan=christmas&day=4');
  await expect(page.locator('.share-url code')).toHaveText(/\/christmas\.html$/);
  // in early January it is still this season; after 5 January it shows next Christmas
  await page.goto('/christmas.html?today=2027-01-03');
  await expect(page.locator('.advent-day[aria-current="date"]')).toHaveAttribute('id', 'day-10');
  await page.goto('/christmas.html?today=2027-01-10');
  await expect(page.locator('.advent-day').first()).toContainText('Saturday, December 25');
  await page.goto('/christmas.html?lang=es&today=2026-12-25');
  await expect(page.locator('section h2')).toContainText(['Los doce días']);
});

test('on Christmas Day the welcome page links to the Christmas page, and after it too', async ({ page }) => {
  await page.goto('/?today=2026-12-25');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#seasonBanner a[href="christmas.html"]')).toBeVisible();
  await page.goto('/?today=2026-12-30');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#seasonBanner a[href="christmas.html"]')).toBeVisible();
  await expect(page.locator('#seasonBanner [data-action="shareAdvent"][data-page="christmas"]')).toBeVisible();
});
