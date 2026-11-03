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
    return { bad, missingPairs, notes: window.NOTES.length };
  });
  expect(report.bad).toEqual([]);
  // every note should describe a connection that exists in the cross reference data
  expect(report.missingPairs).toEqual([]);
  expect(report.notes).toBeGreaterThan(100);
});

test('no Bible text is published with the site', async ({ request }) => {
  const res = await request.get('/data/text/John.json');
  expect(res.status()).toBe(404);
});
