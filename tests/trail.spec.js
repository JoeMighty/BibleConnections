const { test, expect } = require('@playwright/test');

test('a connection can step to the previous and next one in its list', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?ref=John+3%3A16');
  await page.waitForSelector('body[data-ready=true]');
  await page.locator('.conn-item').first().click();
  await expect(page.locator('.conn-pos')).toHaveText(/^1 of \d+$/);
  const first = await page.locator('.verse-card .ref').nth(1).textContent();
  await page.locator('[data-action=stepConn][data-d="1"]').click();
  await expect(page.locator('.conn-pos')).toHaveText(/^2 of \d+$/);
  await expect(page.locator('.verse-card .ref').nth(1)).not.toHaveText(first);
  await page.locator('[data-action=stepConn][data-d="-1"]').click();
  await expect(page.locator('.conn-pos')).toHaveText(/^1 of \d+$/);
});

test('a connection without a note says which original words both passages use', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?ref=John+3%3A16');
  await page.waitForSelector('body[data-ready=true]');
  // step until a connection without a written note shows its shared words
  await page.locator('.conn-item').first().click();
  for (let n = 0; n < 12 && !(await page.locator('#whyLine:not([hidden])').count()); n++) {
    await page.locator('[data-action=stepConn][data-d="1"]').click();
    await page.waitForTimeout(400);
  }
  await expect(page.locator('#whyLine')).toHaveText(/^Both use: /);
});

test('your trail lists what you followed and jumps back to any step', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?ref=John+3%3A16');
  await page.waitForSelector('body[data-ready=true]');
  await page.locator('.conn-item').first().click();
  await expect(page.locator('.trail li')).toHaveCount(2);
  // Next replaces the last step instead of adding one
  await page.locator('[data-action=stepConn][data-d="1"]').click();
  await expect(page.locator('.trail li')).toHaveCount(2);
  // opening the other verse of that connection keeps one step for it (same place, same label)
  await page.locator('[data-action=focusVerse]', { hasNotText: 'John 3:16' }).first().click();
  await expect(page.locator('.trail li')).toHaveCount(2);
  await expect(page.locator('.trail [aria-current]')).toHaveText(await page.locator('#panelTitle').textContent());
  await page.locator('.conn-item').first().click();
  await expect(page.locator('.trail li')).toHaveCount(3);
  await page.locator('.trail [data-goto-trail]').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  // going back to an earlier step trims what came after it
  await expect(page.locator('.trail')).toHaveCount(0);
});
