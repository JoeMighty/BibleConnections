// Packs the large data files into smaller ones the site loads first. Run after the data is rebuilt:
//   node scripts/pack-data.mjs
// Writes:
//   site/data/refs.v2.gz        cross references as variable-length numbers, gzip compressed (refs.bin stays as a fallback)
//   site/data/strongs-lite.json each Hebrew and Greek word without its verse list: [lemma, transliteration, gloss, verse count]
//   site/data/entities.json     the verses that name each person, place and topic on the site
//   site/content/i18n/books-es.json  Spanish book names and abbreviations, so English pages can search "Juan 3:16"
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const site = (p) => path.join(ROOT, 'site', p);

// 1. cross references: [from, to, toEnd, votes] quads, sorted by "from"
const raw = new Uint16Array(fs.readFileSync(site('data/refs.bin')).buffer.slice(0));
const out = [];
const varint = (x) => { while (x >= 128) { out.push((x & 127) | 128); x >>>= 7; } out.push(x); };
const zigzag = (x) => (x >= 0 ? x * 2 : -x * 2 - 1);
let prevFrom = 0;
for (let i = 0; i < raw.length; i += 4) {
  const [f, t, e, v] = [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
  varint(zigzag(f - prevFrom)); varint(zigzag(t - f)); varint(e - t); varint(v);
  prevFrom = f;
}
fs.writeFileSync(site('data/refs.v2.gz'), zlib.gzipSync(Buffer.from(out), { level: 9 }));

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

// 4. Spanish book names
const es = JSON.parse(fs.readFileSync(site('content/i18n/es.json'), 'utf8'));
fs.writeFileSync(site('content/i18n/books-es.json'), JSON.stringify({ books: es.books, abbr: es.abbr }));

const size = (p) => (fs.statSync(site(p)).size / 1024).toFixed(0) + ' KB';
console.log(`refs.v2.gz ${size('data/refs.v2.gz')}, strongs-lite.json ${size('data/strongs-lite.json')}, entities.json ${size('data/entities.json')}, books-es.json ${size('content/i18n/books-es.json')}`);
