// Screenshot tests: catch accidental visual changes to the interface.
// Baselines are created on GitHub by the "Update screenshot baselines" workflow, so they match the CI fonts.
// Each test is skipped until its baseline exists.
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.use({ serviceWorkers: 'block', colorScheme: 'dark' });

const shots = [
  ['welcome', '/'],
  ['study', '/?view=study'],
  ['journey', '/?journey=lamb&step=2'],
  ['connection', '/?c=Rom.8.28_Gen.50.20'],
];

for (const [name, url] of shots) {
  test(`looks right: ${name}`, async ({ page, isMobile }, info) => {
    test.skip(isMobile, 'desktop only');
    test.skip(!fs.existsSync(info.snapshotPath(`${name}.png`)) && !process.env.UPDATE_BASELINES, 'no baseline yet');
    await page.addInitScript(() => { localStorage.setItem('bc.tipsSeen', 'true'); });
    await page.route('https://gc.zgo.at/**', (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
    await page.goto(url);
    await page.waitForSelector('body[data-ready=true]');
    await page.waitForTimeout(800);
    // the map and the daily connection change, so they are masked
    await expect(page).toHaveScreenshot(`${name}.png`, {
      mask: [page.locator('canvas'), page.locator('.cotd'), page.locator('.tagline')],
      maxDiffPixelRatio: 0.02,
    });
  });
}
