const { test, expect } = require('@playwright/test');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test.beforeEach(async ({ page }) => { page.on('pageerror', (e) => { throw e; }); });

test('journey steps show a discussion question', async ({ page }) => {
  await page.goto('/?journey=lamb&step=1');
  await ready(page);
  await expect(page.locator('.question')).toContainText('Talk about it');
});

test('presenter mode steps through a journey with the keyboard', async ({ page }) => {
  await page.goto('/?journey=covenant&step=1');
  await ready(page);
  await page.click('[data-action=present]');
  await expect(page.locator('#presenter')).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('#presMeta')).toContainText('Step 1 of');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#presMeta')).toContainText('Step 2 of');
  await page.keyboard.press('PageUp');
  await expect(page.locator('#presMeta')).toContainText('Step 1 of');
  await page.click('#presExit');
  await expect(page.locator('#presenter')).toBeHidden();
  await expect(page.locator('.site-header')).toBeVisible();
});

test('printable handout lists every step with references and questions', async ({ page }) => {
  await page.goto('/handout.html?journey=exodus');
  await expect(page.locator('h1')).toHaveText('Out of Egypt: the road to freedom');
  await expect(page.locator('ol.steps > li')).toHaveCount(7);
  await expect(page.locator('.refs').first()).toContainText('Exodus 3:7');
  await expect(page.locator('.q').first()).not.toBeEmpty();
});

test('sermon series shows on the landing page when enabled', async ({ page }) => {
  await page.route('**/content/series.json', (route) => route.fulfill({
    json: { enabled: true, title: 'Test Series', description: 'Four weeks', passages: [{ ref: 'John 3:16', title: 'Week 1' }] },
  }));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#landingSeries')).toContainText('Test Series');
  await page.click('[data-start=series]');
  await expect(page.locator('#panelTitle')).toHaveText('Test Series');
  await page.click('[data-action=focusRef]');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
});

test('first-time tips show once', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.click('[data-start=map]');
  await expect(page.locator('#tips')).toBeVisible();
  await page.click('#tipsClose');
  await expect(page.locator('#tips')).toBeHidden();
  await page.reload();
  await ready(page);
  await expect(page.locator('#tips')).toBeHidden();
});

test('about shows the version and a link to what is new', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('#aboutBtn');
  await expect(page.locator('#aboutVersion')).toHaveText(/^\d+\.\d+\.\d+$/);
  await expect(page.locator('#about a', { hasText: 'What’s new' })).toHaveAttribute('href', /CHANGELOG/);
});
