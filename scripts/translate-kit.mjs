// Translation kit for a new language: one work folder per language, so several translators can work at once.
//   node scripts/translate-kit.mjs extract fr   writes translations/fr/ (interface strings, page strings,
//                                               written content, journeys and themes, all with English to translate)
//   node scripts/translate-kit.mjs merge fr     writes the translations into the site: content/i18n/fr.json,
//                                               content/journeys.fr.json, content/themes.fr.json and _fr fields
// Portuguese is the model: whatever has a Portuguese translation gets a slot for the new language.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = (f) => path.join(ROOT, 'site/content', f);
const read = (f) => JSON.parse(fs.readFileSync(C(f), 'utf8'));
const write = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n'); };
const [cmd, lang] = process.argv.slice(2);
if (!['extract', 'merge'].includes(cmd) || !/^[a-z]{2,3}$/.test(lang || '')) { console.error('usage: translate-kit.mjs extract|merge <lang>'); process.exit(1); }
const WORK = path.join(ROOT, 'translations', lang);
const CONTENT_FILES = ['plans.json', 'prophecy.json', 'book-intros.json', 'timeline.json', 'people-places.json', 'topics.json', 'guide.json', 'roadmap.json', 'faq.json', 'churches.json', 'privacy.json', 'terms.json', 'accessibility.json', 'credits.json', 'routes.json'];

// every field that has a Portuguese version: "file|path|field" -> English
function walk(file, node, at, out) {
  if (Array.isArray(node)) { node.forEach((x, i) => walk(file, x, `${at}/${i}`, out)); return; }
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) {
    if (k.endsWith('_pt')) { const base = k.slice(0, -3); if (base in node) out[`${file}|${at}|${base}`] = node[base]; }
    else if (typeof node[k] === 'object') walk(file, node[k], `${at}/${k}`, out);
  }
}
const get = (obj, at) => at.split('/').filter(Boolean).reduce((o, k) => o[k], obj);

if (cmd === 'extract') {
  const pt = read('i18n/pt.json');
  // interface: the English keys, with empty slots
  const blank = (o) => Object.fromEntries(Object.keys(o).map(k => [k, '']));
  write(path.join(WORK, 'interface.json'), {
    _note: 'Translate every value. Keys are the English text; keep {placeholders} such as {n}, {a}, {b}, {x}, {q} exactly as they are.',
    books_en: read('../data/books.json').books.map(b => b.name), books: Array(66).fill(''), abbr: Array(66).fill(''),
    categories: Object.fromEntries(Object.keys(pt.categories).map(k => [k, ''])),
    strings: blank(pt.strings), patterns: blank(pt.patterns),
    pages: Object.fromEntries(Object.entries(pt.pages).map(([sec, o]) => [sec, blank(o)])),
  });
  const content = {};
  for (const f of CONTENT_FILES) walk(f, read(f), '', content);
  const reflect = read('reflect.json');
  for (const k of Object.keys(reflect)) content[`reflect.json|/${k}|en`] = reflect[k].en;
  write(path.join(WORK, 'content.json'), { _note: 'Translate every value (strings and lists of strings). Keep Bible references and proper names correct for the language.', ...content });
  write(path.join(WORK, 'journeys.json'), read('journeys.json').map(j => ({ id: j.id, name: j.name, summary: j.summary, steps: j.steps.map(s => ({ title: s.title, note: s.note, question: s.question, ...(s.kid ? { kid: s.kid } : {}) })) })));
  write(path.join(WORK, 'themes.json'), read('themes.json').map(t => ({ id: t.id, name: t.name, description: t.description })));
  console.log(`translations/${lang}: interface ${Object.keys(pt.strings).length} strings, ${Object.keys(pt.patterns).length} patterns, content ${Object.keys(content).length} fields, ${read('journeys.json').length} journeys`);
} else {
  const I = JSON.parse(fs.readFileSync(path.join(WORK, 'interface.json'), 'utf8'));
  const pt = read('i18n/pt.json');
  const fill = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => !k.startsWith('_') && v));
  write(C(`i18n/${lang}.json`), {
    _status: `Draft ${lang} translation, checked against the English. Native review welcome on GitHub.`,
    books: I.books, abbr: I.abbr, content: ['themes', 'journeys'], categories: fill(I.categories),
    strings: fill(I.strings), patterns: fill(I.patterns),
    pages: Object.fromEntries(Object.entries(I.pages).map(([sec, o]) => [sec, fill(o)])),
  });
  const T = JSON.parse(fs.readFileSync(path.join(WORK, 'content.json'), 'utf8'));
  const files = {};
  for (const [key, val] of Object.entries(T)) {
    if (key.startsWith('_') || !val || (Array.isArray(val) && !val.length)) continue;
    const [file, at, field] = key.split('|');
    files[file] ||= read(file);
    const obj = get(files[file], at);
    if (file === 'reflect.json') obj[lang] = val; else obj[`${field}_${lang}`] = val;
  }
  for (const [file, data] of Object.entries(files)) write(C(file), data);
  fs.copyFileSync(path.join(WORK, 'journeys.json'), C(`journeys.${lang}.json`));
  fs.copyFileSync(path.join(WORK, 'themes.json'), C(`themes.${lang}.json`));
  void pt;
  console.log(`merged ${lang}: ${Object.keys(files).length} content files updated`);
}
