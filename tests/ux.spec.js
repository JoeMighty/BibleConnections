const { test, expect } = require('@playwright/test');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('the back button steps back through what was opened', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('#panelBack')).toBeHidden();
  await page.locator('#panel [data-action=focusVerse]').first().click();
  await expect(page.locator('#panelTitle')).not.toHaveText('John 3:16');
  await expect(page.locator('#panelBack')).toBeVisible();
  await page.locator('#panelBack').click();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await expect(page.locator('#panelBack')).toBeHidden();
});

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'the details sheet is for phones');
  test('details slide up as a sheet, and the map keeps the space above it', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
    await page.goto('/?view=map');
    await ready(page);
    const handle = page.locator('#sheetHandle');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    const low = await page.locator('.sidebar').boundingBox();
    // a link to a verse opens the sheet half way, with the verse straight under the search box
    await page.goto('/?ref=John+3%3A16');
    await ready(page);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    const half = await page.locator('.sidebar').boundingBox();
    expect(half.height).toBeGreaterThan(low.height);
    await expect(page.locator('#panelTitle')).toBeInViewport();
    // the map is resized to the space above the sheet
    const viz = await page.locator('#viz').boundingBox();
    expect(viz.y + viz.height).toBeLessThanOrEqual(half.y + 12);
    // tapping the handle opens it fully, and again brings it back
    await handle.click();
    await page.waitForTimeout(400);
    expect((await page.locator('.sidebar').boundingBox()).height).toBeGreaterThan(half.height);
    await handle.click();
    await page.waitForTimeout(400);
    expect(Math.round((await page.locator('.sidebar').boundingBox()).height)).toBe(Math.round(half.height));
  });
});

test('a word search also lists matching people, topics, words, journeys and prophecies', async ({ page }) => {
  await page.goto('/?q=shepherd');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('“shepherd”');
  const also = page.locator('#alsoFound');
  await expect(also).toContainText('Also found');
  await expect(also).toContainText('Shepherd and sheep');
  await expect(also).toContainText('Jesus, the Good Shepherd');
  await expect(also.locator('[data-action=openWord]').first()).toBeVisible();
  await also.locator('[data-action=openChain]').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('The shepherd');
});

test('verse sections open and close, and the choice is remembered', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const orig = page.locator('[data-sec=secOrig]');
  await expect(orig).toHaveAttribute('open', '');
  await orig.locator('> summary').click();
  await expect(orig).not.toHaveAttribute('open', '');
  await page.goto('/?ref=Romans+8%3A28');
  await ready(page);
  await expect(page.locator('[data-sec=secOrig]')).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-sec=secOrig] > summary')).toHaveText('Original text');
});
