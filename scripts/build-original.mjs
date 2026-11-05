// Builds the original language data for the passage explorer and word study:
//   site/data/text/<book>.json  Hebrew, Aramaic and Greek words of each verse (no English text)
//   site/data/lex/<shard>.json  full lexicon entries, meanings by context, grammatical forms, related words
// Sources (CC BY 4.0, STEPBible.org by Tyndale House): TAHOT (Westminster Leningrad Codex based Hebrew),
// TAGNT (Greek New Testament, words found in NA28), TBESH and TBESG (brief lexicons from BDB and Abbott-Smith).
// Usage: node scripts/build-original.mjs <path to a local STEPBible-Data checkout>
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

// strip Hebrew cantillation marks (keep vowels) so the words read cleanly
const clean = (s) => s.replace(/[֑-ֽ֯׀׃-׆]/g, '').replace(/[/\\]/g, '');
const bookCodes = [];
const text = meta.books.map(() => new Map());   // book -> verse index -> words
const occ = new Map();                          // extended code -> Set(verse)
const forms = new Map();                        // base code -> Map("surface\tgram" -> count)
const langCount = new Map();                    // base code -> {H, A}
const refRe = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)[^#\t]*#\d+=([A-Za-z]+)/;
for (const f of files) {
  const greek = f.startsWith('TAGNT');
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    const m = line.match(refRe);
    if (!m) continue;
    if (greek ? !m[4].includes('N') : !m[4].startsWith('L')) continue;   // NA28 words / Leningrad codex words
    let bi = bookCodes.indexOf(m[1]);
    if (bi < 0) { bookCodes.push(m[1]); bi = bookCodes.length - 1; }
    const b = meta.books[bi];
    if (!b) continue;
    const ci = Math.min(+m[2], b.chapters.length) - 1;
    const v = chapterStart[bi][ci] + Math.min(+m[3], b.chapters[ci]) - 1;
    const c = line.split('\t');
    let surface, translit, code, gram;
    if (greek) {
      const gm = c[1].match(/^(.*?)\s*\((.*)\)\s*$/) || [, c[1], ''];
      surface = gm[1].trim(); translit = gm[2];
      const sg = (c[3] || '').split('=');
      code = (sg[0].match(/G\d{4}[A-Z]?/) || [])[0]; gram = 'G:' + (sg[1] || '');
    } else {
      surface = clean(c[1]); translit = c[2].replace(/[/\\]/g, '').replace(/-$/, '');
      const parts = (c[4] || '').split(/[/\\]/), gparts = (c[5] || '').split(/[/\\]/);
      const k = parts.findIndex(p => p.startsWith('{'));
      code = k >= 0 ? parts[k].slice(1, -1) : null;
      const lang = (c[5] || 'H')[0];
      const gp = gparts[k >= 0 ? k : 0] || '';
      gram = lang + ':' + (k === 0 ? gp.slice(1) : gp);
      if (code) { const base = code.replace(/[A-Z]$/, ''); const lc = langCount.get(base) || { H: 0, A: 0 }; lc[lang === 'A' ? 'A' : 'H']++; langCount.set(base, lc); }
    }
    if (!surface) continue;
    if (!text[bi].has(v)) text[bi].set(v, []);
    text[bi].get(v).push([surface, translit, code || '', gram]);
    if (!code || /^H9\d{3}/.test(code)) continue;
    if (!occ.has(code)) occ.set(code, new Set());
    occ.get(code).add(v);
    const base = code.replace(/[A-Z]$/, '');
    if (!forms.has(base)) forms.set(base, new Map());
    const key = surface.replace(/[.,;:·!?“”‘’()\[\]¶]/g, '') + '\t' + gram;
    forms.get(base).set(key, (forms.get(base).get(key) || 0) + 1);
  }
}
if (bookCodes.length !== 66) throw new Error('Expected 66 books, found ' + bookCodes.length);

// text files, one per book
fs.mkdirSync(path.join(ROOT, 'site/data/text'), { recursive: true });
let words = 0;
text.forEach((map, bi) => {
  const b = meta.books[bi], n = b.chapters.reduce((a, x) => a + x, 0);
  const verses = Array.from({ length: n }, (_, k) => (map.get(b.start + k) || []).map(w => w.join('|')).join('~'));
  words += [...map.values()].reduce((a, x) => a + x.length, 0);
  fs.writeFileSync(path.join(ROOT, `site/data/text/${bi}.json`), JSON.stringify({ s: b.start, v: verses }));
});

// lexicon
const lex = new Map();
const lemmaToCode = new Map();
for (const f of fs.readdirSync(path.join(repo, 'Lexicons')).filter(f => /^TBES[GH]/.test(f))) {
  for (const line of fs.readFileSync(path.join(repo, 'Lexicons', f), 'utf8').split('\n')) {
    const c = line.split('\t');
    const id = (c[0] || '').toUpperCase();
    if (!/^[GH]\d{4}$/.test(id)) continue;
    const ext = ((c[1] || '').match(/^[GH]\d{4}[A-Z]?/i) || [id])[0].toUpperCase();
    if (!lex.has(ext)) lex.set(ext, { lemma: c[3], translit: c[4], pos: c[5], gloss: c[6], def: c[7] || '' });
    const bare = clean(c[3] || '').normalize('NFC');
    if (bare && !lemmaToCode.has(bare)) lemmaToCode.set(bare, id);
  }
}
// turn the lexicon's light HTML into a small safe markup: **bold**, _italic_, line breaks, [[ref|label]]
function cleanDef(h) {
  return h
    .replace(/<ref='([^']+)'>([^<]*)<\/ref>/g, (_, r, l) => `[[${r.replace(/\.$/, '')}|${l.replace(/[;.,]$/, '')}]]`)
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/?b>/gi, '**').replace(/<\/?i>/gi, '_')
    .replace(/<[^>]+>/g, '').replace(/__/g, '').replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}
const sizeLimit = 6000;
const shards = new Map();
const bases = new Set([...occ.keys()].map(c => c.replace(/[A-Z]$/, '')));
for (const base of bases) {
  const variants = [...occ.keys()].filter(c => c.replace(/[A-Z]$/, '') === base);
  const L = lex.get(base) || lex.get(variants[0]) || lex.get(base + 'A') || lex.get(base + 'G');
  if (!L) continue;
  let def = cleanDef(L.def);
  if (def.length > sizeLimit) def = def.slice(0, sizeLimit).replace(/\s\S*$/, '') + '…';
  // meanings by context: each extended Strong's number with its own gloss and verses
  const senses = variants.map(x => {
    const S = lex.get(x) || L, vs = [...occ.get(x)].sort((a, b) => a - b);
    let prev = 0;
    return [x, S.gloss, vs.length, vs.length <= 2500 ? vs.map(v => { const d = v - prev; prev = v; return d.toString(36); }).join(',') : ''];
  }).sort((a, b) => b[2] - a[2]);
  const f = [...(forms.get(base) || new Map())].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => [...k.split('\t'), n]);
  // related words: other lexicon words named in this entry
  const related = [];
  for (const m of L.def.matchAll(/[֐-׿Ͱ-Ͽἀ-῿]+/g)) {
    const code = lemmaToCode.get(clean(m[0]).normalize('NFC'));
    if (code && code !== base && !related.includes(code)) related.push(code);
    if (related.length >= 12) break;
  }
  const lc = langCount.get(base);
  const lang = base[0] === 'G' ? 'G' : (lc && lc.A > lc.H ? 'A' : 'H');
  const entry = { lang, pos: L.pos, def, senses: senses.length > 1 ? senses : undefined, forms: f, related };
  const shard = base.slice(0, 3);
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[base] = entry;
}
// Greek words linked to the Hebrew words they stand for (from the lexicon's Septuagint notes), used to find
// words two passages share across the two Testaments
const equiv = {};
for (const sh of shards.values()) for (const [code, e] of Object.entries(sh)) {
  if (code[0] !== 'G') continue;
  const heb = (e.related || []).filter(c => c[0] === 'H');
  if (heb.length) equiv[code] = heb;
}
fs.writeFileSync(path.join(ROOT, 'site/data/equiv.json'), JSON.stringify(equiv));
fs.mkdirSync(path.join(ROOT, 'site/data/lex'), { recursive: true });
for (const [k, v] of shards) fs.writeFileSync(path.join(ROOT, `site/data/lex/${k}.json`), JSON.stringify(v));
console.log(`Words in text: ${words}, lexicon entries: ${[...shards.values()].reduce((a, s) => a + Object.keys(s).length, 0)}, shards: ${shards.size}`);
