// Builds site/og-image.png (the preview shown when the site is shared) from the live map.
// Usage: start a local server (npm run serve), then: node scripts/og-image.js [http://localhost:8000]
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const base = process.argv[2] || 'http://localhost:8000';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await page.goto(base + '/');
  await page.waitForSelector('body[data-ready=true]');
  await page.waitForTimeout(800);
  const img = await page.evaluate(() => document.getElementById('heroCanvas').toDataURL('image/png'));
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await card.setContent(`<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:#08080c;color:#ececf3;
    font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
    <img src="${img}" style="width:900px;height:auto">
    <div style="font-size:58px;font-weight:800;letter-spacing:-.5px">Bible Connections</div>
    <div style="font-size:28px;color:#a7a7bb">See how the whole Bible fits together</div>
  </body></html>`);
  await card.waitForTimeout(200);
  await card.screenshot({ path: path.join(__dirname, '..', 'site', 'og-image.png') });
  await browser.close();
  console.log('Wrote site/og-image.png');
})();
