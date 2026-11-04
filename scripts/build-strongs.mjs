// Builds site/data/strongs.json: for each Hebrew/Greek word (extended Strong's number), its lemma,
// transliteration, short gloss and the verses where it appears.
// Source: STEPBible-Data by Tyndale House / STEP Bible, CC BY 4.0, https://www.STEPBible.org
// Usage: node scripts/build-strongs.mjs <path to a local STEPBible-Data checkout>
import fs from 'node:fs';
import path from 'node:path';

const repo = process.argv[2];
if (!repo) { console.error('Pass the path to a STEPBible-Data checkout'); process.exit(1); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/books.json'), 'utf8'));
const chapterStart = meta.books.map(b => { let s = b.start; return b.chapters.map(n => { const r = s; s += n; return r; }); });

const dir = path.join(repo, 'Translators Amalgamated OT+NT');
const files = ['TAHOT Gen-Deu', 'TAHOT Jos-Est', 'TAHOT Job-Sng', 'TAHOT Isa-Mal', 'TAGNT Mat-Jhn', 'TAGNT Act-Rev']
  .map(p => fs.readdirSync(dir).find(f => f.startsWith(p)));

const bookCodes = [];          // STEP book codes in canonical order -> our book index
const occ = new Map();         // strong -> Set(verse index)
const refRe = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)[^#\t]*#/;
for (const f of files) {
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    const m = line.match(refRe);
    if (!m) continue;
    let bi = bookCodes.indexOf(m[1]);
    if (bi < 0) { bookCodes.push(m[1]); bi = bookCodes.length - 1; }
    const b = meta.books[bi];
    if (!b) continue;
    const ci = Math.min(+m[2], b.chapters.length) - 1;
    const v = chapterStart[bi][ci] + Math.min(+m[3], b.chapters[ci]) - 1;
    const cols = line.split('\t');
    const isGreek = f.startsWith('TAGNT');
    const tagCol = isGreek ? cols[3] : cols[4];
    if (!tagCol) continue;
    const strongs = isGreek
      ? [(tagCol.match(/G\d{4}[A-Z]?/) || [])[0]]
      : (tagCol.match(/\{(H\d{4}[A-Z]?)\}/g) || []).map(x => x.slice(1, -1));
    for (const s of strongs) {
      if (!s || /^H9\d{3}/.test(s)) continue;           // skip Hebrew prefixes and suffixes
      if (!occ.has(s)) occ.set(s, new Set());
      occ.get(s).add(v);
    }
  }
}
if (bookCodes.length !== 66) throw new Error('Expected 66 books, found ' + bookCodes.length);

// lexicons
const lex = new Map();
for (const f of fs.readdirSync(path.join(repo, 'Lexicons')).filter(f => /^TBES[GH]/.test(f))) {
  for (const line of fs.readFileSync(path.join(repo, 'Lexicons', f), 'utf8').split('\n')) {
    const c = line.split('\t');
    c[0] = (c[0] || '').toUpperCase();
    if (!/^[GH]\d{4}[A-Z]?$/.test(c[0]) || lex.has(c[0])) continue;
    const def = (c[7] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    lex.set(c[0], { lemma: c[3], translit: c[4], gloss: c[6], def: def.length > 110 ? def.slice(0, 107).replace(/\s\S*$/, '') + '…' : def });
  }
}

// group sense variants (H7965G, H7965I, ...) under the base number, labeled from the most frequent one
const groups = new Map();
for (const [s, set] of occ) {
  const base = s.replace(/[A-Z]$/, '');
  if (!groups.has(base)) groups.set(base, { verses: new Set(), best: s, bestN: 0 });
  const g = groups.get(base);
  for (const v of set) g.verses.add(v);
  if (set.size > g.bestN && (lex.get(s) || lex.get(base))) { g.best = s; g.bestN = set.size; }
}
const out = {};
let postings = 0;
for (const [base, g] of groups) {
  const L = lex.get(g.best) || lex.get(base) || lex.get(base + 'A') || lex.get(base + 'G');
  if (!L) continue;
  const verses = [...g.verses].sort((a, b) => a - b);
  const entry = { l: L.lemma, t: L.translit, g: L.gloss, d: L.def, n: verses.length };
  // very common words (articles, "and", "the Lord") are listed but without verse lists
  if (verses.length <= 2500) {
    let prev = 0;
    entry.v = verses.map(v => { const d = v - prev; prev = v; return d.toString(36); }).join(',');
    postings += verses.length;
  }
  out[base] = entry;
}
fs.writeFileSync(path.join(ROOT, 'site/data/strongs.json'), JSON.stringify(out));
console.log(`Words: ${Object.keys(out).length}, verse links: ${postings}`);
