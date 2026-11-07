// Checks the hand-written content (notes, journeys, themes) points at real verses and real connections.
const { test, expect } = require('@playwright/test');

test('notes, journeys and themes resolve to real references', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready=true]');
  const report = await page.evaluate(async () => {
    const meta = await (await fetch('data/books.json')).json();
    const raw = new Uint16Array(await (await fetch('data/refs.bin')).arrayBuffer());
    const idx = new Map();
    meta.books.forEach(b => {
      let s = b.start;
      b.chapters.forEach((n, ci) => { for (let v = 1; v <= n; v++) idx.set(`${b.osis}.${ci + 1}.${v}`, s + v - 1); s += n; });
    });
    const pairs = new Set();
    for (let i = 0; i < raw.length; i += 4) { pairs.add(raw[i] + ':' + raw[i + 1]); pairs.add(raw[i + 1] + ':' + raw[i]); }
    const bad = [], missingPairs = [];
    for (const { from: a, to: b } of window.NOTES) {
      if (!idx.has(a) || !idx.has(b)) bad.push(`note ${a} / ${b}`);
      else if (!pairs.has(idx.get(a) + ':' + idx.get(b))) missingPairs.push(`${a} / ${b}`);
    }
    for (const j of window.JOURNEYS) for (const s of j.steps) {
      for (const r of [s.a, s.b]) if (!idx.has(r)) bad.push(`journey ${j.id} ${r}`);
      if (!s.title || !s.note || !s.question) bad.push(`journey ${j.id} step missing title, note or question`);
    }
    for (const t of window.THEMES) for (const r of t.verses) if (!idx.has(r)) bad.push(`theme ${t.id} ${r}`);
    const words = await (await fetch('data/words.json')).json();
    const people = await (await fetch('content/people-places.json')).json();
    const topics = await (await fetch('content/topics.json')).json();
    for (const e of [...people, ...topics]) for (const w of e.words) if (!words[w] && !Object.keys(words).some(k => k.startsWith(w))) bad.push(`word ${e.id}:${w}`);
    for (const p of await (await fetch('content/plans.json')).json()) {
      if (p.source === 'theme' && !window.THEMES.some(t => t.id === p.theme)) bad.push(`plan ${p.id} theme`);
      if (!p.name || !p.description || !(p.perDay > 0)) bad.push(`plan ${p.id} fields`);
    }
    const strongs = await (await fetch('data/strongs.json')).json();
    for (const w of await (await fetch('content/words.json')).json()) if (!strongs[w.id] || !strongs[w.id].v) bad.push(`featured word ${w.id}`);
    return { bad, missingPairs, notes: window.NOTES.length };
  });
  expect(report.bad).toEqual([]);
  // every note should describe a connection that exists in the cross reference data
  expect(report.missingPairs).toEqual([]);
  expect(report.notes).toBeGreaterThan(300);
});

test('no Bible text is published with the site', async ({ request }) => {
  const res = await request.get('/data/text/John.json');
  expect(res.status()).toBe(404);
});

test('the version shown in About matches the latest release in the changelog', async ({ page }) => {
  const fs = require('fs');
  const latest = fs.readFileSync('CHANGELOG.md', 'utf8').match(/^## \[(\d+\.\d+\.\d+)\]/m)[1];
  expect(fs.readFileSync('site/app.js', 'utf8')).toContain(`const VERSION = '${latest}';`);
  expect(fs.readFileSync('CITATION.cff', 'utf8')).toMatch(new RegExp(`^version: ${latest.replace(/\./g, '\\.')}$`, 'm'));
  await page.goto('/?view=map');
  await page.waitForSelector('body[data-ready=true]');
  await page.click('#aboutBtn');
  await expect(page.locator('#aboutVersion')).toHaveText(latest);
});

test('packed data files match the full ones (run scripts/pack-data.mjs after rebuilding data)', async () => {
  const fs = require('fs'), zlib = require('zlib');
  const raw = new Uint16Array(fs.readFileSync('site/data/refs.bin').buffer.slice(0));
  const bytes = zlib.gunzipSync(fs.readFileSync('site/data/refs.v2.gz'));
  let p = 0, from = 0;
  const next = () => { let x = 0, sh = 0, b; do { b = bytes[p++]; x += (b & 127) * 2 ** sh; sh += 7; } while (b & 128); return x; };
  const unzig = (x) => (x & 1 ? -(x + 1) / 2 : x / 2);
  const out = [];
  while (p < bytes.length) { from += unzig(next()); const to = from + unzig(next()), end = to + next(); out.push(from, to, end, next()); }
  expect(out.length).toBe(raw.length);
  expect(out.every((x, i) => x === raw[i])).toBe(true);
  const full = JSON.parse(fs.readFileSync('site/data/strongs.json', 'utf8')), lite = JSON.parse(fs.readFileSync('site/data/strongs-lite.json', 'utf8'));
  expect(Object.keys(lite).length).toBe(Object.keys(full).length);
  for (const c of ['G0026', 'H7965', 'H0430']) expect(lite[c]).toEqual([full[c].l, full[c].t, full[c].g, full[c].n]);
  const es = JSON.parse(fs.readFileSync('site/content/i18n/es.json', 'utf8')), small = JSON.parse(fs.readFileSync('site/content/i18n/books-es.json', 'utf8'));
  expect(small.books).toEqual(es.books);
  const ent = JSON.parse(fs.readFileSync('site/data/entities.json', 'utf8'));
  expect(Object.keys(ent).length).toBeGreaterThan(80);
});
