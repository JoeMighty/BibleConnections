const { test, expect } = require('@playwright/test');

test('journey steps, notes and plan days can be read aloud and stopped', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bc.tipsSeen', 'true');
    // record what would be spoken instead of using a real voice
    window.__said = [];
    window.speechSynthesis.speak = (u) => { window.__said.push({ text: u.text, lang: u.lang }); };
    window.speechSynthesis.cancel = () => {};
  });
  await page.goto('/?journey=lamb&step=1');
  await page.waitForSelector('body[data-ready=true]');
  const btn = page.locator('#panel .speak-btn').first();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  const said = await page.evaluate(() => window.__said[0]);
  expect(said.text.length).toBeGreaterThan(40);
  expect(said.text).not.toMatch(/Listen|Previous|Next step/);
  expect(said.lang).toBe('en-US');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/?plan=year&day=1');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panel .speak-btn')).toBeVisible();
  await page.goto('/?c=Rom.8.28~Gen.50.20');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#connNote .speak-btn')).toBeVisible();
});
