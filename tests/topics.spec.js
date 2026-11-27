const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('topic pages list the most connected verses about each topic, with links to read and explore', async ({ page }) => {
  await page.goto('/topics/anxiety/');
  await expect(page.locator('h1')).toHaveText('Bible verses about anxiety and worry');
  await expect(page).toHaveTitle(/Bible verses about anxiety and worry/);
  expect(await page.locator('.topic-row').count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('.topic-row .row-read').first()).toHaveAttribute('href', /bible\.com\/bible\/111\//);
  await expect(page.locator('main a.btn').first()).toHaveAttribute('href', '/?topic=anxiety');
  await expect(page.locator('.lede')).toContainText('when you feel anxious');
  // no translation text: only references, counts and links
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://bibleconnections.app/topics/anxiety/');
  await page.locator('main a.btn').first().click();
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panelTitle')).toHaveText(/Anxiety/);
});

test('the topics index puts feelings first and links every topic; pages are accessible', async ({ page }) => {
  await page.goto('/topics/');
  await expect(page.locator('h1')).toHaveText('Bible verses by topic');
  await expect(page.locator('main h2').first()).toHaveText('How are you feeling?');
  expect(await page.locator('main .list a[href^="/topics/"]').count()).toBeGreaterThanOrEqual(40);
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const u of ['/topics/', '/topics/forgiveness/']) {
      await page.goto(u);
      const r = await new AxeBuilder({ page }).analyze();
      expect(r.violations, u + ' ' + scheme).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
