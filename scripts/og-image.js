// Builds site/og-image.png (link preview, 1200x630) and docs/social-preview.png (GitHub social preview, 1280x640) from the live map.
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
  for (const [w, h, out] of [[1200, 630, ['site', 'og-image.png']], [1280, 640, ['docs', 'social-preview.png']]]) {
    const card = await browser.newPage({ viewport: { width: w, height: h } });
    await card.setContent(`<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:#000;color:#fff;
      font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
      <img src="${img}" style="width:${Math.round(w * 0.72)}px;height:auto">
      <div style="font-size:60px;font-weight:700;letter-spacing:-1.5px">Bible Connections</div>
      <div style="font-size:28px;color:rgba(235,235,245,.7)">See how the whole Bible fits together</div>
    </body></html>`);
    await card.waitForTimeout(200);
    await card.screenshot({ path: path.join(__dirname, '..', ...out) });
  }
  await browser.close();
  console.log('Wrote site/og-image.png and docs/social-preview.png');
})();
