// Builds the static data files used by the site.
// Sources (downloaded automatically if missing):
//   Berean Standard Bible (public domain) via github.com/scrollmapper/bible_databases
//   OpenBible.info cross references (CC-BY) via the same repository
// Usage: node scripts/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'data-src');
const OUT = path.join(ROOT, 'site', 'data');
const BASE = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/2025/';
const SOURCES = {
  'BSB.csv': BASE + 'formats/csv/BSB.csv',
  'cross_references.txt': BASE + 'sources/extras/cross_references.txt',
};
const MIN_VOTES = 3; // weakest links kept in the dataset (the UI can raise this)

const BOOKS = [
  ['Genesis','Gen','law'],['Exodus','Exod','law'],['Leviticus','Lev','law'],['Numbers','Num','law'],['Deuteronomy','Deut','law'],
  ['Joshua','Josh','history'],['Judges','Judg','history'],['Ruth','Ruth','history'],['1 Samuel','1Sam','history'],['2 Samuel','2Sam','history'],
  ['1 Kings','1Kgs','history'],['2 Kings','2Kgs','history'],['1 Chronicles','1Chr','history'],['2 Chronicles','2Chr','history'],
  ['Ezra','Ezra','history'],['Nehemiah','Neh','history'],['Esther','Esth','history'],
  ['Job','Job','wisdom'],['Psalms','Ps','wisdom'],['Proverbs','Prov','wisdom'],['Ecclesiastes','Eccl','wisdom'],['Song of Songs','Song','wisdom'],
  ['Isaiah','Isa','major'],['Jeremiah','Jer','major'],['Lamentations','Lam','major'],['Ezekiel','Ezek','major'],['Daniel','Dan','major'],
  ['Hosea','Hos','minor'],['Joel','Joel','minor'],['Amos','Amos','minor'],['Obadiah','Obad','minor'],['Jonah','Jonah','minor'],['Micah','Mic','minor'],
  ['Nahum','Nah','minor'],['Habakkuk','Hab','minor'],['Zephaniah','Zeph','minor'],['Haggai','Hag','minor'],['Zechariah','Zech','minor'],['Malachi','Mal','minor'],
  ['Matthew','Matt','gospels'],['Mark','Mark','gospels'],['Luke','Luke','gospels'],['John','John','gospels'],
  ['Acts','Acts','acts'],
  ['Romans','Rom','paul'],['1 Corinthians','1Cor','paul'],['2 Corinthians','2Cor','paul'],['Galatians','Gal','paul'],['Ephesians','Eph','paul'],
  ['Philippians','Phil','paul'],['Colossians','Col','paul'],['1 Thessalonians','1Thess','paul'],['2 Thessalonians','2Thess','paul'],
  ['1 Timothy','1Tim','paul'],['2 Timothy','2Tim','paul'],['Titus','Titus','paul'],['Philemon','Phlm','paul'],
  ['Hebrews','Heb','general'],['James','Jas','general'],['1 Peter','1Pet','general'],['2 Peter','2Pet','general'],
  ['1 John','1John','general'],['2 John','2John','general'],['3 John','3John','general'],['Jude','Jude','general'],
  ['Revelation','Rev','revelation'],
];

async function ensureSources() {
  fs.mkdirSync(SRC, { recursive: true });
  for (const [file, url] of Object.entries(SOURCES)) {
    const p = path.join(SRC, file);
    if (fs.existsSync(p)) continue;
    console.log('Downloading', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
    fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
  }
}

function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

await ensureSources();
fs.mkdirSync(path.join(OUT, 'text'), { recursive: true });

// ---- Bible text ----
const rows = parseCSV(fs.readFileSync(path.join(SRC, 'BSB.csv'), 'utf8')).slice(1).filter(r => r.length >= 4);
const bookOrder = []; const byBook = new Map();
for (const [b, c, v, t] of rows) {
  if (!byBook.has(b)) { byBook.set(b, []); bookOrder.push(b); }
  const chapters = byBook.get(b);
  const ci = +c - 1, vi = +v - 1;
  (chapters[ci] ||= [])[vi] = t.replace(/\s+/g, ' ').trim();
}
if (bookOrder.length !== 66) throw new Error('Expected 66 books, got ' + bookOrder.length);

const books = []; const osisIndex = new Map();
let verseOffset = 0;
bookOrder.forEach((srcName, bi) => {
  const [name, osis, cat] = BOOKS[bi];
  const chapters = byBook.get(srcName);
  const counts = chapters.map(ch => ch.length);
  for (const ch of chapters) for (let i = 0; i < ch.length; i++) ch[i] ??= '';
  books.push({ name, osis, cat, start: verseOffset, chapters: counts });
  osisIndex.set(osis, bi);
  verseOffset += counts.reduce((a, b) => a + b, 0);
  fs.writeFileSync(path.join(OUT, 'text', `${osis}.json`), JSON.stringify(chapters));
});
const TOTAL = verseOffset;

// chapter start offsets for fast lookup
const chapterStart = books.map(b => { let s = b.start; return b.chapters.map(n => { const r = s; s += n; return r; }); });
function verseIndex(ref) {
  const [osis, c, v] = ref.split('.');
  const bi = osisIndex.get(osis);
  if (bi === undefined) return -1;
  const b = books[bi];
  const ci = Math.min(Math.max(+c, 1), b.chapters.length) - 1;
  const vi = Math.min(Math.max(+v, 1), b.chapters[ci]) - 1; // clamp versification differences
  return chapterStart[bi][ci] + vi;
}

// ---- Cross references ----
const lines = fs.readFileSync(path.join(SRC, 'cross_references.txt'), 'utf8').split('\n').slice(1);
const best = new Map(); // dedupe by (from, toStart)
let skipped = 0;
for (const line of lines) {
  if (!line.trim()) continue;
  const [from, to, votesStr] = line.split('\t');
  const votes = +votesStr;
  if (!(votes >= MIN_VOTES)) continue;
  const [t1, t2 = t1] = to.split('-');
  const a = verseIndex(from), b1 = verseIndex(t1), b2 = verseIndex(t2);
  if (a < 0 || b1 < 0 || b2 < 0 || a === b1) { skipped++; continue; }
  const key = a * TOTAL + b1;
  const prev = best.get(key);
  if (!prev || prev[3] < votes) best.set(key, [a, b1, Math.max(b1, b2), Math.min(votes, 65535)]);
}
const refs = [...best.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
const buf = new Uint16Array(refs.length * 4);
refs.forEach((r, i) => buf.set(r, i * 4));
fs.writeFileSync(path.join(OUT, 'refs.bin'), Buffer.from(buf.buffer));

fs.writeFileSync(path.join(OUT, 'books.json'), JSON.stringify({ totalVerses: TOTAL, minVotes: MIN_VOTES, refCount: refs.length, books }));
console.log(`Books: ${books.length}, verses: ${TOTAL}, cross references: ${refs.length} (skipped ${skipped})`);
