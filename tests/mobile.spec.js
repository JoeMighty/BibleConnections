// Phones (0.19): the map gets the room, Places and Me are tabs, search sits behind a button where it is not the next step.
const { test, expect } = require('@playwright/test');
const ready = (page) => page.waitForSelector('body[data-ready=true]');
test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout');
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true')); });

  test('the map keeps most of the space above the sheet, with only Reset and More on it', async ({ page }) => {
    await page.goto('/?ref=John+3%3A16');
    await ready(page);
    await expect(page.locator('#tagline')).toBeHidden();
    await expect(page.locator('.stage-switch')).toBeHidden();
    await expect(page.locator('#zoomIn')).toBeHidden();
    await expect(page.locator('#zoomReset')).toBeVisible();
    // the current item floats on the map: its ✕ clears it, and there is no separate Start over for one item
    await expect(page.locator('.ctx-chip')).toBeVisible();
    await expect(page.locator('#startOver')).toBeHidden();
    const viz = await page.locator('#viz').boundingBox(), vh = page.viewportSize().height;
    expect(viz.height / vh).toBeGreaterThan(0.3);
    await page.click('#moreTools');
    await expect(page.locator('#describeBtn')).toBeVisible();
    await page.click('#describeBtn');
    await expect(page.locator('#describeBtn')).toBeHidden();
  });

  test('search shows on the map and in Study, and the search button opens it anywhere', async ({ page }) => {
    await page.goto('/?view=map');
    await ready(page);
    await expect(page.locator('#search')).toBeVisible();
    await page.goto('/?journey=lamb&step=2');
    await ready(page);
    await expect(page.locator('#search')).toBeHidden();
    await page.click('#searchBtn');
    await expect(page.locator('#search')).toBeFocused();
    await page.fill('#search', 'Romans 8:28');
    await page.keyboard.press('Enter');
    await expect(page.locator('#panelTitle')).toHaveText('Romans 8:28');
    await expect(page.locator('#search')).toBeHidden();
  });

  test('Places is a tab, and other tabs go back to the connections map', async ({ page }) => {
    await page.goto('/?view=map');
    await ready(page);
    await page.click('#placesNav');
    await expect(page.locator('#geoCanvas')).toBeVisible();
    await expect(page.locator('#panelTitle')).toHaveText('Places');
    await expect(page).toHaveURL(/view=places/);
    await page.click('[data-nav=journeys]');
    await expect(page.locator('#viz')).toBeVisible();
    await expect(page.locator('#geo')).toBeHidden();
  });

  test('Me gathers notes, collections, plans, settings and saved items', async ({ page }) => {
    await page.goto('/?ref=Psalm+23%3A1');
    await ready(page);
    await page.locator('[data-action=save]').first().click();
    await page.click('[data-nav=me]');
    await expect(page.locator('#panelTitle')).toHaveText('Me');
    await expect(page).toHaveURL(/view=me/);
    await expect(page.locator('.mini-list').first()).toContainText(/Psalms? 23:1/);
    await page.click('.me-row[data-action=openSettings]');
    await expect(page.locator('#settings')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.click('.me-row[data-mode=notes]');
    await expect(page).toHaveURL(/view=notes/);
  });

  test('Connect two verses is in Study on phones', async ({ page }) => {
    await page.goto('/?view=study');
    await ready(page);
    await expect(page.locator('[data-nav=path]')).toBeHidden();
    await page.click('.study-card[data-mode=path]');
    await expect(page).toHaveURL(/view=path/);
  });
});
