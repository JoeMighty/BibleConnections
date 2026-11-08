// Shows how much of the site is translated into each interface language, and what is missing.
//   node scripts/i18n-check.mjs          a summary for every language
//   node scripts/i18n-check.mjs pt       the summary plus every missing interface string for Portuguese
//   node scripts/i18n-check.mjs pt --json  the missing strings as JSON (English key: ""), ready to translate
// Spanish is the reference: every key in es.json should exist in the other languages too.
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8'));
const exists = (p) => fs.existsSync(new URL(`../site/${p}`, import.meta.url));
const ref = read('content/i18n/es.json');
const langs = fs.readdirSync(new URL('../site/content/i18n/', import.meta.url)).map(f => f.match(/^([a-z]{2,3})\.json$/)).filter(Boolean).map(m => m[1]);
const only = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const asJSON = process.argv.includes('--json');

// written content: [file, how to list each translatable item for a language]
const fields = (file, keys, list = (d) => d) => [file, (lang) => {
  const items = list(read(`content/${file}`));
  let total = 0, done = 0;
  for (const it of items) for (const k of keys) {
    if (!(k in it) || it[k] === '' || (Array.isArray(it[k]) && !it[k].length)) continue;
    total++;
    if (it[`${k}_${lang}`] && (!Array.isArray(it[k]) || it[`${k}_${lang}`].length)) done++;
  }
  return [done, total];
}];
const CONTENT = [
  [...fields('plans.json', ['name', 'description'])].map((x, i) => (i ? x : 'plans (names)')),
  [...fields('plans.json', ['title', 'note'], (d) => d.flatMap(p => p.days || []))].map((x, i) => (i ? x : 'plans (daily readings)')),
  [...fields('prophecy.json', ['title', 'summary'], (d) => d.groups.flatMap(g => g.chains))].map((x, i) => (i ? x : 'prophecy (chains)')),
  [...fields('prophecy.json', ['label'], (d) => d.groups.flatMap(g => g.chains.flatMap(c => c.stages)))].map((x, i) => (i ? x : 'prophecy (stages)')),
  fields('book-intros.json', ['about']),
  fields('timeline.json', ['title', 'when'], (d) => d.events),
  fields('people-places.json', ['name', 'description']),
  fields('topics.json', ['name', 'description']),
  fields('guide.json', ['title', 'what', 'steps'], (d) => d.flatMap(g => g.items)),
  fields('roadmap.json', ['title', 'text'], (d) => [...d.in_progress, ...d.planned.flatMap(g => g.items)]),
  ['reflect.json', (lang) => { const r = read('content/reflect.json'); const ks = Object.keys(r); return [ks.filter(k => (r[k][lang] || []).length).length, ks.length]; }],
  ['journeys.json', (lang) => {
    const js = read('content/journeys.json'), tr = exists(`content/journeys.${lang}.json`) ? read(`content/journeys.${lang}.json`) : [];
    const total = js.reduce((n, j) => n + 2 + j.steps.length * 3, 0);
    let done = 0;
    for (const j of js) { const x = tr.find(y => y.id === j.id); if (!x) continue; done += (x.name ? 1 : 0) + (x.summary ? 1 : 0); (x.steps || []).forEach(s => { done += ['title', 'note', 'question'].filter(k => s[k]).length; }); }
    return [done, total];
  }],
  ['themes.json', (lang) => { const ts = read('content/themes.json'), tr = exists(`content/themes.${lang}.json`) ? read(`content/themes.${lang}.json`) : []; return [ts.filter(t => tr.some(x => x.id === t.id && x.name)).length, ts.length]; }],
];

const pct = (d, t) => (t ? Math.floor((d / t) * 100) : 100);
for (const lang of langs.filter(l => l !== 'es' && (!only || l === only)).concat(only === 'es' ? ['es'] : [])) {
  const T = read(`content/i18n/${lang}.json`);
  const missing = { strings: Object.keys(ref.strings).filter(k => !(T.strings || {})[k]), patterns: Object.keys(ref.patterns).filter(k => !(T.patterns || {})[k]) };
  for (const [sec, dict] of Object.entries(ref.pages || {})) missing['pages.' + sec] = Object.keys(dict).filter(k => !((T.pages || {})[sec] || {})[k]);
  if (asJSON) {
    const out = {};
    for (const [sec, keys] of Object.entries(missing)) if (keys.length) out[sec] = Object.fromEntries(keys.map(k => [k, '']));
    console.log(JSON.stringify(out, null, 2));
    continue;
  }
  console.log(`\n${lang.toUpperCase()}${T._status ? `  (${T._status})` : ''}`);
  const row = (name, d, t) => console.log(`  ${name.padEnd(28)} ${String(d).padStart(5)} / ${String(t).padEnd(5)} ${String(pct(d, t)).padStart(3)}%`);
  row('book names', (T.books || []).filter(Boolean).length, 66);
  row('categories', Object.keys(T.categories || {}).length, Object.keys(ref.categories).length);
  for (const [sec, keys] of Object.entries(missing)) {
    const total = sec === 'strings' ? Object.keys(ref.strings).length : sec === 'patterns' ? Object.keys(ref.patterns).length : Object.keys(ref.pages[sec.slice(6)]).length;
    row(sec === 'strings' ? 'interface strings' : sec === 'patterns' ? 'interface patterns' : sec.replace('pages.', 'page: '), total - keys.length, total);
  }
  for (const [file, count] of CONTENT) { const [d, t] = count(lang); row(file, d, t); }
  if (only) for (const [sec, keys] of Object.entries(missing)) if (keys.length) console.log(`\n  Missing ${sec}:\n${keys.map(k => '    ' + k).join('\n')}`);
}
