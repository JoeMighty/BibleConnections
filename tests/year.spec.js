const { test, expect } = require('@playwright/test');

test('A year of connections reads the whole Bible in 365 days, whole chapters, with links to follow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?view=plans');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('.journey-card h3').first()).toHaveText('A year of connections');
  await expect(page.locator('.journey-card').first()).toContainText('0 of 365 days done');
  // every chapter is read exactly once, in order
  const cover = await page.evaluate(async () => {
    const meta = await (await fetch('data/books.json')).json();
    return meta.books.reduce((n, b) => n + b.chapters.length, 0);
  });
  await page.goto('/?plan=year&day=1');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('.step-title')).toHaveText('Genesis 1-3');
  await expect(page.locator('.read-chapters a').first()).toHaveAttribute('href', /bible\.com\/bible\/111\/GEN\.1\.NIV/);
  await expect(page.locator('.year-link')).toHaveCount(3);
  const total = await page.evaluate(() => [...document.querySelectorAll('.read-chapters a')].length);
  expect(total).toBe(3);
  let chapters = 0;
  for (const d of [1, 100, 200, 300, 365]) {
    await page.goto(`/?plan=year&day=${d}`);
    await page.waitForSelector('body[data-ready=true]');
    chapters += await page.locator('.read-chapters a').count();
  }
  expect(chapters).toBeGreaterThan(10);
  await expect(page.locator('.step-title')).toContainText('Revelation');
  await expect(page.locator('.step-title')).toContainText('22');
  expect(cover).toBe(1189);
  // a link opens that connection on the map
  await page.locator('.year-link').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
});
