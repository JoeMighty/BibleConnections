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

test('people and places pages show where each appears and the most connected verses', async ({ page }) => {
  await page.goto('/people/abraham/');
  await expect(page.locator('h1')).toHaveText('Abraham in the Bible');
  await expect(page).toHaveTitle(/Abraham in the Bible: [\d,]+ verses/);
  expect(await page.locator('.topic-row').count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('main a.btn').first()).toHaveAttribute('href', '/?person=abraham');
  await expect(page.locator('main h2', { hasText: 'Where Abraham appears' })).toBeVisible();
  await page.goto('/places/bethlehem/');
  await expect(page.locator('h1')).toHaveText('Bethlehem in the Bible');
  await expect(page.locator('main a.btn').first()).toHaveAttribute('href', '/?place=bethlehem');
  await page.locator('main a.btn').first().click();
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panelTitle')).toHaveText(/Bethlehem/);
  await page.goto('/people/');
  expect(await page.locator('main .list a[href^="/people/"]').count()).toBeGreaterThanOrEqual(30);
  expect(await page.locator('main .list a[href^="/places/"]').count()).toBeGreaterThanOrEqual(15);
  const AxeBuilder = require('@axe-core/playwright').default;
  for (const u of ['/people/', '/people/david/', '/places/jerusalem/']) {
    await page.goto(u);
    expect((await new AxeBuilder({ page }).analyze()).violations, u).toEqual([]);
  }
});

test('topic pages leave out verses that use a key word in another sense', async ({ page }) => {
  await page.goto('/topics/anxiety/');
  await expect(page.locator('main')).not.toContainText('Ezekiel 4:16');
  await page.goto('/topics/kindness/');
  await expect(page.locator('main')).not.toContainText('Ephesians 6:18');
  await page.goto('/topics/rest/');
  await expect(page.locator('main')).not.toContainText('Isaiah 49:6');
});
