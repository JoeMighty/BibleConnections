const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('a connection shows the original words both passages share, across the Testaments', async ({ page }) => {
  await page.goto('/?ref=Genesis+1%3A1');
  await ready(page);
  await page.locator('#panel .conn-item', { hasText: 'John 1:1' }).first().click();
  const box = page.locator('#commonWords');
  await expect(box.locator('h3')).toHaveText('Words in common');
  const row = box.locator('li', { hasText: 'beginning' });
  await expect(row.locator('[data-code=H7225]')).toBeVisible();
  await expect(row.locator('[data-code=G0746]')).toBeVisible();
  await row.locator('[data-code=G0746]').click();
  await expect(page.locator('#panelTitle')).toContainText('archē');
});

test('a chapter shows key words, places and reflection questions', async ({ page }) => {
  await page.goto('/?ref=John+3');
  await ready(page);
  const rs = page.locator('#rangeStudy');
  await expect(rs).toContainText('About John');
  await expect(rs.locator('h3', { hasText: 'Key words' })).toBeVisible();
  await expect(rs.locator('[data-code=G4100]')).toBeVisible();   // πιστεύω, believe
  await expect(rs.locator('[data-action=openGeo]', { hasText: 'Jordan' })).toBeVisible();
  await expect(rs.locator('.reflect li')).toHaveCount(3);
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
});

test('a book shows the words that stand out in it', async ({ page }) => {
  await page.goto('/?ref=Isaiah');
  await ready(page);
  const rs = page.locator('#rangeStudy');
  await expect(rs.locator('h3', { hasText: 'Key words' })).toBeVisible({ timeout: 15000 });
  await expect(rs.locator('[data-code=H6918]')).toBeVisible();   // קָדוֹשׁ, holy
  await expect(rs.locator('.reflect')).toHaveCount(0);
});
