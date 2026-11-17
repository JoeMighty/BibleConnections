// Draws the picture of the whole map that shows while the map data loads (site/img/map-dark.webp; dark mode only).
// Usage: serve site/ on port 8765, then node scripts/map-placeholder.mjs (needs Python with Pillow for WebP).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/';
const b = await chromium.launch();
for (const theme of ['dark']) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: theme });
  await ctx.addInitScript(() => { localStorage.setItem('bc.tipsSeen', 'true'); });
  const p = await ctx.newPage();
  await p.goto(BASE + '?view=map');
  await p.waitForSelector('body[data-ready=true]');
  await p.waitForTimeout(1200);
  const box = await p.locator('#viz').boundingBox();
  await p.addStyleTag({ content: 'body * { visibility: hidden !important; } canvas { visibility: visible !important; }' });
  // the same fit as resize() in app.js: arcs as wide as the space allows, base line 84 px above the bottom
  const TOTAL = 31102, W = box.width, H = box.height, k = Math.min((W - 28) / TOTAL, ((H - 104) * 2) / TOTAL), w = TOTAL * k;
  const clip = { x: box.x + (W - w) / 2, y: box.y + H - 84 - w / 2, width: w, height: w / 2 + 1 };
  const png = new URL(`../site/img/map-${theme}.png`, import.meta.url).pathname;
  await p.screenshot({ path: png, clip });
  execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}').convert('RGB'); im.thumbnail((720,360)); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=62, method=6)`]);
  execFileSync('rm', [png]);
  await ctx.close();
}
await b.close();
console.log('Wrote site/img/map-dark.webp');
