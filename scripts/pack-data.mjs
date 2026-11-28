// Packs the large data files into smaller ones the site loads first. Run after the data is rebuilt:
//   node scripts/pack-data.mjs
// Writes:
//   site/data/refs.v3.gz        cross references in columns of variable-length numbers, gzip compressed (refs.bin stays as a fallback)
//   site/data/strongs-lite.json each Hebrew and Greek word without its verse list: [lemma, transliteration, gloss, verse count]
//   site/data/entities.json     the verses that name each person, place and topic on the site
//   site/content/i18n/books-es.json, books-pt.json  book names, so any page can search "Juan 3:16" or "João 3:16"
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const site = (p) => path.join(ROOT, 'site', p);

// 1. cross references: [from, to, toEnd, votes] quads, sorted by "from"
const raw = new Uint16Array(fs.readFileSync(site('data/refs.bin')).buffer.slice(0));
// refs.v3: the count, then one column at a time (gzip packs a column of similar numbers far better than mixed quads).
// "to" is stored as a step from the previous "to" while "from" stays the same, which keeps the numbers small.
const out = [];
const varint = (x) => { while (x >= 128) { out.push((x & 127) | 128); x >>>= 7; } out.push(x); };
const zigzag = (x) => (x >= 0 ? x * 2 : -x * 2 - 1);
const n = raw.length / 4;
varint(n);
for (let i = 0, prev = 0; i < n; i++) { varint(raw[i * 4] - prev); prev = raw[i * 4]; }
for (let i = 0; i < n; i++) { const same = i > 0 && raw[i * 4] === raw[i * 4 - 4]; varint(zigzag(raw[i * 4 + 1] - (same ? raw[i * 4 - 3] : raw[i * 4]))); }
for (let i = 0; i < n; i++) varint(raw[i * 4 + 2] - raw[i * 4 + 1]);
for (let i = 0; i < n; i++) varint(raw[i * 4 + 3]);
fs.writeFileSync(site('data/refs.v3.gz'), zlib.gzipSync(Buffer.from(out), { level: 9 }));
fs.rmSync(site('data/refs.v2.gz'), { force: true });

// 2. slim dictionary for glosses, chips and search; the full file is loaded only for word studies
const strongs = JSON.parse(fs.readFileSync(site('data/strongs.json'), 'utf8'));
const lite = {};
for (const [c, w] of Object.entries(strongs)) lite[c] = [w.l, w.t, w.g, w.n];
fs.writeFileSync(site('data/strongs-lite.json'), JSON.stringify(lite));

// 3. people, places and topics: the same word matching as the verse page (exact words in the word index)
const words = JSON.parse(fs.readFileSync(site('data/words.json'), 'utf8'));
const decode = (s) => { let v = 0; return s.split(',').map(d => (v += parseInt(d, 36))); };
const encode = (vs) => { let p = 0; return vs.map(v => { const d = v - p; p = v; return d.toString(36); }).join(','); };
const entities = {};
const add = (key, list) => {
  const set = new Set();
  for (const w of list) if (words[w]) for (const v of decode(words[w])) set.add(v);
  if (set.size) entities[key] = encode([...set].sort((a, b) => a - b));
};
for (const p of JSON.parse(fs.readFileSync(site('content/people-places.json'), 'utf8'))) add(`${p.type === 'place' ? 'place' : 'person'}:${p.id}`, p.words || []);
for (const t of JSON.parse(fs.readFileSync(site('content/topics.json'), 'utf8'))) add(`topic:${t.id}`, t.words || []);
fs.writeFileSync(site('data/entities.json'), JSON.stringify(entities));

// 4. book names in each interface language, so any page can search "Juan 3:16" or "João 3:16"
for (const lang of ['es', 'pt', 'fr', 'ko', 'zh'].filter(l => fs.existsSync(site(`content/i18n/${l}.json`)))) {
  const t = JSON.parse(fs.readFileSync(site(`content/i18n/${lang}.json`), 'utf8'));
  fs.writeFileSync(site(`content/i18n/books-${lang}.json`), JSON.stringify({ books: t.books, abbr: t.abbr }));
  // the standalone pages (handout, guide, roadmap, slides, card) need only their own strings and the book names
  fs.writeFileSync(site(`content/i18n/pages-${lang}.json`), JSON.stringify({ books: t.books, abbr: t.abbr, content: t.content || [], pages: t.pages || {} }));
}

const size = (p) => (fs.statSync(site(p)).size / 1024).toFixed(0) + ' KB';
console.log(`refs.v3.gz ${size('data/refs.v3.gz')}, strongs-lite.json ${size('data/strongs-lite.json')}, entities.json ${size('data/entities.json')}, books-es.json ${size('content/i18n/books-es.json')}`);
