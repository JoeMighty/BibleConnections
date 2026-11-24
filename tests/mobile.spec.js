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

  test('Places is part of Explore, and other tabs go back to the connections map', async ({ page }) => {
    await page.goto('/?view=map');
    await ready(page);
    await page.locator('#panel [data-stage=places]').first().click();
    await expect(page.locator('#geoCanvas')).toBeVisible();
    await expect(page.locator('#panelTitle')).toHaveText('Places');
    await expect(page).toHaveURL(/view=places/);
    await page.click('[data-nav=journeys]');
    await expect(page.locator('#viz')).toBeVisible();
    await expect(page.locator('#geo')).toBeHidden();
  });

  test('Library gathers notes, collections, plans and saved items, and More has Settings', async ({ page }) => {
    await page.goto('/?ref=Psalm+23%3A1');
    await ready(page);
    await page.locator('[data-action=save]').first().click();
    await page.click('[data-nav=library]');
    await expect(page.locator('#panelTitle')).toHaveText('Library');
    await expect(page).toHaveURL(/view=library/);
    await expect(page.locator('.mini-list').first()).toContainText(/Psalms? 23:1/);
    await page.click('[data-nav=more]');
    await page.click('.me-row[data-action=openSettings]');
    await expect(page.locator('#settings')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.click('[data-nav=library]');
    await page.click('.me-row[data-mode=notes]');
    await expect(page).toHaveURL(/view=notes/);
  });

  test('Connect two verses is in Study on phones', async ({ page }) => {
    await page.goto('/?view=study');
    await ready(page);
    await page.click('.me-row[data-mode=path]');
    await expect(page).toHaveURL(/view=path/);
  });
});

test.describe('phones: the map with a thumb', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch');
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true')); });

  test('sliding a finger along the book strip picks a chapter', async ({ page }) => {
    await page.goto('/?view=map');
    await ready(page);
    const box = await page.locator('#viz').boundingBox();
    const y = box.height - 70, xs = [box.width * 0.3, box.width * 0.4, box.width * 0.5];
    await page.evaluate(({ y, xs }) => {
      const v = document.getElementById('viz'), r = v.getBoundingClientRect();
      const ev = (type, x) => v.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: true }));
      ev('pointerdown', xs[0]); ev('pointermove', xs[1]); ev('pointermove', xs[2]);
    }, { y, xs });
    await expect(page.locator('#tooltip')).toBeVisible();
    await page.evaluate(({ y, x }) => {
      const v = document.getElementById('viz'), r = v.getBoundingClientRect();
      v.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: true }));
    }, { y, x: xs[2] });
    await expect(page.locator('#panelTitle')).toHaveText(/^[1-3]?\s?[A-Z][a-z]+( of [A-Z][a-z]+)? \d+$/);
  });

  test('swiping the details sideways moves to the next journey step', async ({ page }) => {
    await page.goto('/?journey=lamb&step=2');
    await ready(page);
    const swipe = (dx) => page.evaluate((dx) => {
      const p = document.getElementById('panel'), r = p.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 120;
      const t = (cx) => new Touch({ identifier: 1, target: p, clientX: cx, clientY: y });
      p.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x)], changedTouches: [t(x)], bubbles: true }));
      p.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx)], bubbles: true }));
    }, dx);
    await swipe(-120);
    await expect(page).toHaveURL(/step=3/);
    await swipe(120);
    await expect(page).toHaveURL(/step=2/);
  });
});

test('after the places map, going home and opening the map or a verse shows the connections map', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?view=places');
  await ready(page);
  await expect(page.locator('#geo')).toBeVisible();
  await page.click('#homeLink');
  await expect(page.locator('#landing')).toBeVisible();
  await page.click('[data-start=map]');
  await expect(page.locator('#viz')).toBeVisible();
  await expect(page.locator('#geo')).toBeHidden();
  await page.goto('/?view=places');
  await ready(page);
  await page.click('#homeLink');
  await page.fill('#landingQ', 'John 3:16');
  await page.press('#landingQ', 'Enter');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await expect(page.locator('#viz')).toBeVisible();
  await expect(page.locator('#geo')).toBeHidden();
});

test('the same five sections on every screen size, and tapping the current tab goes to its start', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('.header-nav [data-nav]')).toHaveText(['Explore', 'Journeys', 'Study', 'Library', 'More']);
  await expect(page.locator('[data-nav=explore]')).toHaveAttribute('aria-pressed', 'true');
  // in a journey step, the Journeys tab goes back to the list of journeys (it does not close it)
  await page.goto('/?journey=lamb&step=2');
  await ready(page);
  await expect(page.locator('[data-nav=journeys]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-nav=journeys]');
  await expect(page.locator('#panelTitle')).toHaveText('Guided journeys');
  await page.click('[data-nav=journeys]');
  await expect(page.locator('#panelTitle')).toHaveText('Guided journeys');
  // on a verse, Explore keeps it; tapping Explore again goes back to the whole map
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await page.click('[data-nav=study]');
  await page.click('[data-nav=explore]');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.click('[data-nav=explore]');
  await expect(page.locator('#panelTitle')).toHaveText('Explore');
  // sections are shown by the tab, not listed in "You're viewing"
  await page.goto('/?view=study');
  await ready(page);
  await expect(page.locator('#contextBar')).toBeHidden();
  // old links to Me still work
  await page.goto('/?view=me');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Library');
});
