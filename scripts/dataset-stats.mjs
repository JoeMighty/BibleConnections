// Counts the full OpenBible.info cross reference file (data-src/cross_references.txt, not in git)
// for the "How many cross references" page. Writes site/content/dataset-stats.json.
// Usage: node scripts/dataset-stats.mjs
import fs from 'node:fs';
const books = JSON.parse(fs.readFileSync(new URL('../site/data/books.json', import.meta.url))).books;
const nt = new Set(books.slice(39).map(b => b.osis));
const lines = fs.readFileSync(new URL('../data-src/cross_references.txt', import.meta.url), 'utf8').trim().split('\n');
const header = lines.shift();
const s = { source: 'OpenBible.info', sourceDate: (header.match(/\d{4}-\d{2}-\d{2}/) || [''])[0], total: 0, otot: 0, ntnt: 0, cross: 0, positive: 0, atLeast3: 0, atLeast10: 0 };
for (const l of lines) {
  const [f, t, v] = l.split('\t');
  const a = nt.has(f.split('.')[0]), b = nt.has(t.split('.')[0]), votes = +v;
  s.total++;
  if (a && b) s.ntnt++; else if (!a && !b) s.otot++; else s.cross++;
  if (votes > 0) s.positive++;
  if (votes >= 3) s.atLeast3++;
  if (votes >= 10) s.atLeast10++;
}
fs.writeFileSync(new URL('../site/content/dataset-stats.json', import.meta.url), JSON.stringify(s, null, 2) + '\n');
console.log(s);
