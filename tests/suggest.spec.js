const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/');
  await page.waitForSelector('body[data-ready=true]');
});

test('typing a book and chapter suggests that chapter and the most connected ones starting the same way', async ({ page }) => {
  await page.locator('#landingQ').fill('Psalm 2');
  const opts = page.locator('#landingQSuggest [role=option]');
  await expect(opts.first()).toContainText('Psalms 2');
  await expect(page.locator('#landingQSuggest')).toContainText('Psalms 23');
});

test('typing a chapter and colon suggests its most connected verses first', async ({ page }) => {
  await page.locator('#landingQ').fill('John 3:');
  await expect(page.locator('#landingQSuggest [role=option]').first()).toContainText('John 3:16');
  await page.locator('#landingQ').fill('John 3:1');
  await expect(page.locator('#landingQSuggest [role=option]').first()).toContainText('John 3:16');
});

test('a reference that does not exist is caught before searching', async ({ page }) => {
  await page.locator('#landingQ').fill('John 40');
  await expect(page.locator('#landingQSuggest .suggest-note')).toHaveText('John has 21 chapters.');
  await page.locator('#landingQ').fill('Jude 1:30');
  await expect(page.locator('#landingQSuggest .suggest-note')).toHaveText('Jude 1 has 25 verses.');
  // picking a suggestion still works with the keyboard
  await page.locator('#landingQ').fill('Romans 8:2');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#panelTitle')).toHaveText(/^Romans 8:2/);
});
