// Makes the app store images: shortcut icons, manifest screenshots, Play Store phone screenshots
// in each listed language, and the 1024 x 500 feature graphic.
// Usage: serve site/ on port 8765 (python3 -m http.server 8765 --directory site), then node scripts/store-images.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/';
const out = (p) => { const u = new URL(`../${p}`, import.meta.url); fs.mkdirSync(new URL('.', u), { recursive: true }); return u.pathname; };
const browser = await chromium.launch();

// shortcut icons: a white symbol on black, the same look as the app icon
const glyph = {
  plans: '<rect x="22" y="26" width="52" height="48" rx="8" fill="none" stroke="#fff" stroke-width="5"/><path d="M22 40h52M36 20v12M60 20v12" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="38" cy="55" r="4" fill="#fff"/><circle cx="58" cy="55" r="4" fill="#fff"/>',
  journeys: '<path d="M24 70c0-18 48-10 48-28S50 24 40 30" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 11"/><circle cx="24" cy="70" r="6" fill="#fff"/><circle cx="40" cy="30" r="8" fill="none" stroke="#fff" stroke-width="5"/>',
  places: '<path d="M48 80s-20-22-20-38a20 20 0 0 1 40 0c0 16-20 38-20 38z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><circle cx="48" cy="42" r="7" fill="#fff"/>',
  study: '<circle cx="42" cy="42" r="17" fill="none" stroke="#fff" stroke-width="5"/><path d="M55 55l15 15" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
};
{
  const page = await browser.newPage({ viewport: { width: 96, height: 96 } });
  for (const [k, g] of Object.entries(glyph)) {
    await page.setContent(`<body style="margin:0;background:#000"><svg width="96" height="96" viewBox="0 0 96 96">${g}</svg></body>`);
    await page.screenshot({ path: out(`site/icons/shortcut-${k}.png`) });
  }
  await page.close();
}

// [name, address, lower the phone sheet so the map has the room]
const scenes = [
  ['map', '?view=map', true],
  ['verse', '?ref=John+3%3A16'],
  ['journey', '?journey=lamb&step=2'],
  ['places', '?route=paul2', true],
  ['prophecy', '?prophecy=servant', true],
  ['plans', '?view=plans'],
  ['home', ''],
];
async function shoot(ctxOpts, lang, list, path) {
  const ctx = await browser.newContext({ colorScheme: 'dark', ...ctxOpts });
  await ctx.addInitScript(() => { for (const k of ['tipsSeen', 'visited']) localStorage.setItem('bc.' + k, 'true'); });
  const page = await ctx.newPage();
  for (const [name, q, low] of list) {
    const sep = q ? '&' : '?';
    await page.goto(BASE + q + (lang !== 'en' ? `${sep}lang=${lang}` : ''));
    await page.waitForSelector('body[data-ready=true]');
    const handle = page.locator('#sheetHandle');
    await page.waitForTimeout(1200);
    if (low && await handle.isVisible() && await handle.getAttribute('aria-expanded') === 'true') {
      // drag the sheet down to its lowest stop
      const b = await handle.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(x, y + i * 30);
      await page.mouse.up();
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out(path(name)), type: 'jpeg', quality: 86 });
  }
  await ctx.close();
}
// Play Store phone screenshots, 1080 x 1920, in every listed language
for (const lang of ['en', 'es', 'pt']) await shoot({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, lang, scenes, (n) => `docs/store/${lang}/phone-${scenes.findIndex(s => s[0] === n) + 1}-${n}.jpg`);
// screenshots in the manifest (shown in the install dialog): a few phone shots and one wide
await shoot({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'en', scenes.slice(0, 4), (n) => `site/screenshots/phone-${n}.jpg`);
await shoot({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 }, 'en', [['map', '?ref=John+3%3A16']], () => 'site/screenshots/wide-map.jpg');

// feature graphic: the arcs of the whole Bible with the name and one line
const tag = { en: 'Every cross reference in the Bible, on one map', es: 'Todas las referencias cruzadas de la Biblia en un mapa', pt: 'Todas as referências cruzadas da Bíblia em um mapa' };
{
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1400, height: 700 } });
  await ctx.addInitScript(() => { for (const k of ['tipsSeen', 'visited']) localStorage.setItem('bc.' + k, 'true'); });
  const page = await ctx.newPage();
  await page.goto(BASE + '?view=map');
  await page.waitForSelector('body[data-ready=true]');
  const box = await page.locator('#viz').boundingBox();
  await page.addStyleTag({ content: 'body * { visibility: hidden !important; } canvas { visibility: visible !important; }' });
  await page.waitForTimeout(1500);
  const arcs = (await page.screenshot({ clip: box })).toString('base64');
  for (const lang of Object.keys(tag)) {
    const g = await browser.newPage({ viewport: { width: 1024, height: 500 } });
    await g.setContent(`<body style="margin:0;width:1024px;height:500px;background:#000;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#fff;position:relative">
      <img src="data:image/png;base64,${arcs}" style="position:absolute;right:-60px;bottom:-10px;width:820px;opacity:.95">
      <div style="position:absolute;left:0;top:0;bottom:0;width:520px;background:linear-gradient(90deg,#000 62%,rgba(0,0,0,0))"></div>
      <div style="position:absolute;left:64px;top:150px;width:430px">
        <div style="font-size:58px;font-weight:700;letter-spacing:-1.5px;line-height:1.05">Bible Connections</div>
        <div style="margin-top:18px;font-size:26px;line-height:1.3;color:rgba(235,235,245,.78)">${tag[lang]}</div>
      </div></body>`);
    await g.screenshot({ path: out(`docs/store/${lang}/feature-graphic.png`) });
    await g.close();
  }
  await ctx.close();
}
fs.copyFileSync(new URL('../site/icons/icon-512.png', import.meta.url), out('docs/store/icon-512.png'));
await browser.close();
console.log('Store images written to docs/store and site/screenshots');
