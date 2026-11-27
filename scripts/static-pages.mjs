// Builds plain pages that search engines can read, from the same data as the map:
//   site/books/index.html               all 66 books with their connection counts
//   site/books/<book>/index.html        one page per book: most connected books, most connected verses, chapters
//   site/verse/<book-c-v>/index.html    the most connected verses: strongest connections, original text
//   site/cross-references/index.html    "How many cross references are in the Bible?"
// Only references, counts and the Hebrew and Greek text (STEP Bible, CC BY 4.0) are shown: no translation text.
// The pages are built in CI and not kept in git. Usage: node scripts/static-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const BASE = 'https://bibleconnections.app/';
export const VERSE_PAGES = 1000;   // how many of the most connected verses get their own page
const DEFAULT_VOTES = 7;           // the map's default strength filter (DEFAULT_VOTES in app.js)

const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(SITE, p), 'utf8'));
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- data ----------
export function load() {
  const meta = readJSON('data/books.json'), B = meta.books;
  const raw = new Uint16Array(fs.readFileSync(path.join(SITE, 'data/refs.bin')).buffer.slice(0));
  const N = raw.length / 4, F = new Uint16Array(N), T = new Uint16Array(N), E = new Uint16Array(N), V = new Uint16Array(N);
  for (let i = 0; i < N; i++) { F[i] = raw[i * 4]; T[i] = raw[i * 4 + 1]; E[i] = raw[i * 4 + 2]; V[i] = raw[i * 4 + 3]; }
  const TOTAL = meta.totalVerses, vb = new Uint8Array(TOTAL), vc = new Uint16Array(TOTAL), vn = new Uint16Array(TOTAL);
  B.forEach((b, bi) => { let k = b.start; b.chapters.forEach((n, ci) => { for (let v = 1; v <= n; v++, k++) { vb[k] = bi; vc[k] = ci + 1; vn[k] = v; } }); b.slug = slugify(b.name); b.nt = bi >= 39; });
  // connections touching each verse, both directions, as the map shows them
  const deg = new Uint16Array(TOTAL), refsOf = Array.from({ length: TOTAL }, () => []);
  for (let i = 0; i < N; i++) { deg[F[i]]++; refsOf[F[i]].push(i); if (T[i] !== F[i]) { deg[T[i]]++; refsOf[T[i]].push(i); } }
  const order = [...Array(TOTAL).keys()].filter(v => deg[v] > 0).sort((a, b) => deg[b] - deg[a] || a - b);
  const pages = new Set(order.slice(0, VERSE_PAGES));
  return { meta, B, N, F, T, E, V, TOTAL, vb, vc, vn, deg, refsOf, order, pages };
}
const label = (D, k) => `${D.B[D.vb[k]].name} ${D.vc[k]}:${D.vn[k]}`;
const rangeLabel = (D, a, z) => (z === a ? label(D, a) : D.vb[z] === D.vb[a] && D.vc[z] === D.vc[a] ? `${label(D, a)}-${D.vn[z]}` : `${label(D, a)}-${D.vb[z] === D.vb[a] ? '' : D.B[D.vb[z]].name + ' '}${D.vc[z]}:${D.vn[z]}`);
const verseSlug = (D, k) => `${D.B[D.vb[k]].slug}-${D.vc[k]}-${D.vn[k]}`;
export function urls(D) {
  return ['books/', ...D.B.map(b => `books/${b.slug}/`), ...[...D.pages].map(k => `verse/${verseSlug(D, k)}/`), 'cross-references/', 'topics/', ...topicList().map(t => `topics/${t.id}/`)];
}

// ---------- page frame ----------
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
const fmt = (n) => n.toLocaleString('en-US');
const mapURL = (q) => `/?ref=${encodeURIComponent(q).replace(/%20/g, '+')}`;
const chevron = '<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function page({ file, title, description, crumbs, body, nav = '' }) {
  const url = BASE + file.replace(/index\.html$/, '');
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: BASE + href.replace(/^\//, '') })) };
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#000000">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bible Connections">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE}og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="A rainbow of arcs connecting passages across the Bible">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/pages.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script>
    (function () {
      var get = function (k, d) { try { var v = JSON.parse(localStorage.getItem('bc.' + k)); return v === null ? d : v; } catch (e) { return d; } };
      var a = get('appearance', 'system'), root = document.documentElement;
      root.dataset.theme = a === 'light' || (a === 'system' && !matchMedia('(prefers-color-scheme: dark)').matches) ? 'light' : 'dark';
      root.dataset.textsize = get('textsize', 'standard');
      root.dataset.readable = get('readable', false) ? 'on' : 'off';
      root.dataset.contrast = get('contrast', false) || matchMedia('(prefers-contrast: more)').matches ? 'more' : 'normal';
    })();
  </script>
</head>
<body class="static">
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <a class="brand" href="/"><img src="/icons/icon.svg" alt="" width="34" height="34"><span>Bible Connections</span></a>
    <nav aria-label="Pages">
      <a href="/">Open the map</a>
      <a href="/books/"${nav === 'books' ? ' aria-current="page"' : ''}>Books</a>
      <a href="/cross-references/"${nav === 'count' ? ' aria-current="page"' : ''}>How many?</a>
      <a href="/topics/"${nav === 'topics' ? ' aria-current="page"' : ''}>Topics</a>
    </nav>
  </header>
  <main id="main">
    <nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([name, href], i) => `<li>${i < crumbs.length - 1 ? `<a href="${href}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`}</li>`).join('')}</ol></nav>
${body}
  </main>
  <footer class="foot"><p>Cross references from <a href="https://www.openbible.info/labs/cross-references/" rel="noopener">OpenBible.info</a> (CC BY 4.0). Hebrew and Greek from <a href="https://www.stepbible.org/" rel="noopener">STEP Bible</a> (CC BY 4.0). Passages open on Bible.com; no Bible translation is stored on this site. · <a href="/privacy.html">Privacy</a></p></footer>
  <script src="/chrome.js"></script>
</body>
</html>
`;
  const out = path.join(SITE, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
const stats = (items) => `<ul class="stats">${items.map(([n, l]) => `<li><span class="stat-n">${n}</span><span class="stat-l">${esc(l)}</span></li>`).join('')}</ul>`;
const actions = (ref, read) => `<p class="actions"><a class="btn" href="${mapURL(ref)}">See it on the map</a>${read ? `<a class="btn tinted" href="${read}" rel="noopener">Read on Bible.com<span class="sr-only"> (opens Bible.com)</span></a>` : ''}</p>`;
const readURL = (b, c, v) => `https://www.bible.com/bible/111/${b.usfm}.${c}${v ? '.' + v : ''}.NIV`;
// a list row: title, optional detail, a count and a relative bar
const row = (href, title, detail, n, max) => `<li><a href="${href}"><span class="row-main"><span class="row-title">${esc(title)}</span>${detail ? `<span class="row-detail">${esc(detail)}</span>` : ''}</span><span class="row-end"><span class="meter" aria-hidden="true"><span style="width:${Math.max(4, Math.round(100 * n / max))}%"></span></span><span class="row-n">${fmt(n)}</span>${chevron}</span></a></li>`;
const verseHref = (D, k) => (D.pages.has(k) ? `/verse/${verseSlug(D, k)}/` : mapURL(label(D, k)));

// ---------- builders ----------
function bookPages(D) {
  const { B, N, F, T, vb, vc, deg } = D;
  const per = B.map(() => ({ total: 0, within: 0, other: new Uint32Array(66), chap: null }));
  B.forEach((b, i) => { per[i].chap = new Uint32Array(b.chapters.length); });
  for (let i = 0; i < N; i++) {
    const a = vb[F[i]], z = vb[T[i]];
    per[a].total++; per[a].chap[vc[F[i]] - 1]++;
    if (a === z) per[a].within++; else { per[z].total++; per[z].chap[vc[T[i]] - 1]++; per[a].other[z]++; per[z].other[a]++; }
  }
  const rankAll = B.map((b, i) => [i, per[i].total]).sort((x, y) => y[1] - x[1]);
  // index
  const maxTotal = rankAll[0][1];
  const testament = (from, to, name) => `<h2>${name}</h2><ul class="list">${B.slice(from, to).map((b, i) => row(`/books/${b.slug}/`, b.name, `${b.chapters.length} chapters`, per[from + i].total, maxTotal)).join('')}</ul>`;
  page({
    file: 'books/index.html', nav: 'books', title: 'Cross references by book · Bible Connections',
    description: 'All 66 books of the Bible with how many cross references each one has, the books it connects to most and its most connected verses.',
    crumbs: [['Bible Connections', '/'], ['Books', '/books/']],
    body: `    <h1>Cross references by book</h1>
    <p class="lede">How each book of the Bible connects to the rest. Bars show how many connections a book has; ${esc(B[rankAll[0][0]].name)} has the most.</p>
    ${testament(0, 39, 'Old Testament')}
    ${testament(39, 66, 'New Testament')}`,
  });
  // one page per book
  B.forEach((b, bi) => {
    const p = per[bi], links = [...p.other].map((n, j) => [j, n]).filter(x => x[1] && x[0] !== bi).sort((x, y) => y[1] - x[1]);
    const topVerses = [];
    for (let k = b.start; k < b.start + b.chapters.reduce((s, n) => s + n, 0); k++) if (deg[k]) topVerses.push(k);
    topVerses.sort((x, y) => deg[y] - deg[x] || x - y);
    const top = topVerses.slice(0, 12), crossT = links.filter(([j]) => B[j].nt !== b.nt).reduce((s, x) => s + x[1], 0);
    const rank = rankAll.findIndex(x => x[0] === bi) + 1;
    const maxC = Math.max(...p.chap);
    const lead = links.length ? `${b.name} takes part in ${fmt(p.total)} cross references and connects to ${links.length} other books, most often ${B[links[0][0]].name} (${fmt(links[0][1])}).` : '';
    page({
      file: `books/${b.slug}/index.html`, nav: 'books', title: `${b.name} cross references: ${fmt(p.total)} connections · Bible Connections`,
      description: `${lead} See its most connected verses and explore them on an interactive map.`,
      crumbs: [['Bible Connections', '/'], ['Books', '/books/'], [b.name, `/books/${b.slug}/`]],
      body: `    <h1>${esc(b.name)}</h1>
    <p class="lede">${esc(lead)}</p>
    ${stats([[fmt(p.total), 'connections'], [String(links.length), 'books linked'], [fmt(crossT), b.nt ? 'with the Old Testament' : 'with the New Testament'], [`${rank} of 66`, 'most connected']])}
    ${actions(b.name + ' 1', readURL(b, 1))}
    <h2>Most connected books</h2>
    <ul class="list">${links.slice(0, 10).map(([j, n]) => row(`/books/${B[j].slug}/`, B[j].name, B[j].nt ? 'New Testament' : 'Old Testament', n, links[0][1])).join('')}</ul>
    <h2>Most connected verses</h2>
    <ul class="list">${top.map(k => row(verseHref(D, k), label(D, k), '', deg[k], deg[top[0]])).join('')}</ul>
    <h2>Chapters</h2>
    <p class="hint">Darker squares have more connections. Tap one to see it on the map.</p>
    <ol class="chapters">${[...p.chap].map((n, ci) => `<li><a href="${mapURL(`${b.name} ${ci + 1}`)}" style="--w:${(0.15 + 0.85 * n / maxC).toFixed(2)}" aria-label="Chapter ${ci + 1}, ${fmt(n)} connections">${ci + 1}</a></li>`).join('')}</ol>`,
    });
  });
  return per;
}

function versePages(D) {
  const { B, F, T, E, V, vb, vc, vn, deg, refsOf, order } = D;
  const text = {};
  const original = (k) => {
    const bi = vb[k]; text[bi] = text[bi] || readJSON(`data/text/${bi}.json`);
    const w = (text[bi].v[k - text[bi].s] || '').split('~').filter(Boolean).map(x => x.split('|'));
    return w.length ? { words: w.map(x => x[0]).join(' '), translit: w.map(x => x[1]).join(' '), heb: bi < 39 } : null;
  };
  for (const k of D.pages) {
    const b = B[vb[k]], ref = label(D, k), rank = order.indexOf(k) + 1;
    const seen = new Map();
    for (const i of refsOf[k]) {
      const [a, z] = F[i] === k ? [T[i], E[i]] : [F[i], F[i]];
      const key = a + '-' + z, cur = seen.get(key);
      if (!cur || cur.v < V[i]) seen.set(key, { a, z, v: V[i] });
    }
    const list = [...seen.values()].sort((x, y) => y.v - x.v || x.a - y.a);
    const books = new Map();
    list.forEach(x => books.set(vb[x.a], (books.get(vb[x.a]) || 0) + 1));
    const bookList = [...books].sort((x, y) => y[1] - x[1]);
    const ot = list.filter(x => vb[x.a] < 39).length, o = original(k);
    const strongest = list.slice(0, 3).map(x => rangeLabel(D, x.a, x.z)).join(', ');
    const lead = `${ref} connects to ${fmt(list.length)} passages in ${books.size} books of the Bible. The strongest links are ${strongest}.`;
    page({
      file: `verse/${verseSlug(D, k)}/index.html`, title: `${ref} cross references: ${fmt(list.length)} connections · Bible Connections`,
      description: `${lead} Explore them on an interactive map and read them on Bible.com.`,
      crumbs: [['Bible Connections', '/'], ['Books', '/books/'], [b.name, `/books/${b.slug}/`], [ref, `/verse/${verseSlug(D, k)}/`]],
      body: `    <h1>${esc(ref)}</h1>
    <p class="lede">${esc(lead)}</p>
    ${stats([[fmt(list.length), 'connections'], [String(books.size), 'books'], [fmt(ot), 'in the Old Testament'], [fmt(list.length - ot), 'in the New Testament']])}
    ${actions(ref, readURL(b, vc[k], vn[k]))}
    ${o ? `<section class="original" aria-labelledby="orig"><h2 id="orig">${o.heb ? 'Hebrew' : 'Greek'} text</h2>
      <p class="orig-text" lang="${o.heb ? 'he' : 'grc'}" dir="${o.heb ? 'rtl' : 'ltr'}">${esc(o.words)}</p>
      <p class="orig-translit">${esc(o.translit)}</p></section>` : ''}
    <h2>Strongest connections</h2>
    <p class="hint">Bars show how strongly readers tie each passage to ${esc(ref)}, from OpenBible.info votes.</p>
    <ul class="list">${list.slice(0, 25).map(x => row(D.pages.has(x.a) && x.z === x.a ? `/verse/${verseSlug(D, x.a)}/` : mapURL(rangeLabel(D, x.a, x.z)), rangeLabel(D, x.a, x.z), B[vb[x.a]].nt ? 'New Testament' : 'Old Testament', x.v, list[0].v)).join('')}</ul>
    ${list.length > 25 ? `<p class="hint"><a href="${mapURL(ref)}">See all ${fmt(list.length)} on the map</a></p>` : ''}
    <h2>Books it connects to</h2>
    <ul class="list">${bookList.slice(0, 8).map(([j, n]) => row(`/books/${B[j].slug}/`, B[j].name, '', n, bookList[0][1])).join('')}</ul>
    <p class="hint">${esc(ref)} is number ${fmt(rank)} of the most connected verses in the Bible.</p>`,
    });
  }
}

function countPage(D, per) {
  const s = readJSON('content/dataset-stats.json'), { B, N, F, T, V, vb, order } = D;
  let shown = 0, cross = 0;
  for (let i = 0; i < N; i++) { if (V[i] >= DEFAULT_VOTES) shown++; if ((vb[F[i]] < 39) !== (vb[T[i]] < 39)) cross++; }
  const pct = (n) => `${(100 * n / s.total).toFixed(1)}%`;
  const pairs = new Map();
  for (let i = 0; i < N; i++) { const a = vb[F[i]], z = vb[T[i]]; if (a === z) continue; const key = Math.min(a, z) * 100 + Math.max(a, z); pairs.set(key, (pairs.get(key) || 0) + 1); }
  const topPairs = [...pairs].sort((x, y) => y[1] - x[1]).slice(0, 8);
  const top = order.slice(0, 10);
  const q = (h, a) => `<section class="qa"><h2>${esc(h)}</h2>${a}</section>`;
  page({
    file: 'cross-references/index.html', nav: 'count', title: `How many cross references are in the Bible? ${fmt(s.total)} · Bible Connections`,
    description: `There are ${fmt(s.total)} cross references in the OpenBible.info dataset, the largest open set. Here is how they break down, and why other sources give different numbers.`,
    crumbs: [['Bible Connections', '/'], ['How many cross references?', '/cross-references/']],
    body: `    <h1>How many cross references are in the Bible?</h1>
    <p class="lede">There are <strong>${fmt(s.total)}</strong> cross references in the OpenBible.info dataset, the largest openly licensed set. It is based on the Treasury of Scripture Knowledge, and readers vote on how strongly each pair of passages is linked.</p>
    ${stats([[fmt(s.total), 'in the full dataset'], [fmt(N), 'on the map (3+ votes)'], [fmt(shown), 'shown at first'], ['66', 'books']])}
    ${q('Why do other sources give different numbers?', `<p>Cross references are chosen by editors, so no two study Bibles agree. A printed study Bible may list 60,000 to 100,000; the Treasury of Scripture Knowledge lists far more. A number quoted without a source is usually one edition's margin notes.</p>
      <p>Bible Connections loads the ${fmt(N)} links that at least three readers agree on, and first shows the ${fmt(shown)} strongest so the map stays readable. Move the strength slider to see more or fewer.</p>`)}
    ${q('How do they split between the testaments?', `<ul class="list plain">
      <li><span class="row-main"><span class="row-title">Old Testament to Old Testament</span></span><span class="row-n">${fmt(s.otot)} · ${pct(s.otot)}</span></li>
      <li><span class="row-main"><span class="row-title">New Testament to New Testament</span></span><span class="row-n">${fmt(s.ntnt)} · ${pct(s.ntnt)}</span></li>
      <li><span class="row-main"><span class="row-title">Between the testaments</span></span><span class="row-n">${fmt(s.cross)} · ${pct(s.cross)}</span></li></ul>
      <p>About one link in five crosses from one testament to the other: that is the band of long arcs across the whole map. <a href="/?view=map&amp;from=ot&amp;to=nt">See only those</a>.</p>`)}
    ${q('Which verses have the most cross references?', `<ul class="list">${top.map(k => row(verseHref(D, k), label(D, k), '', D.deg[k], D.deg[top[0]])).join('')}</ul>`)}
    ${q('Which books are linked most?', `<ul class="list">${topPairs.map(([key, n]) => { const a = Math.floor(key / 100), z = key % 100; return row(`/books/${B[a].slug}/`, `${B[a].name} and ${B[z].name}`, '', n, topPairs[0][1]); }).join('')}</ul>
      <p>The most connected book overall is ${esc(B[per.map((p, i) => [i, p.total]).sort((x, y) => y[1] - x[1])[0][0]].name)}. <a href="/books/">See every book</a>.</p>`)}
    ${q('Where does the data come from?', `<p>The cross references are from <a href="https://www.openbible.info/labs/cross-references/" rel="noopener">OpenBible.info</a> (CC BY 4.0, ${esc(s.sourceDate)} edition). Counts on this page use the full file; lists use the links on the map. No Bible translation is stored on this site: every passage opens on Bible.com.</p>`)}
    ${actions('', '').replace(/href="[^"]+"/, 'href="/?view=map"').replace('See it on the map', 'Explore the map')}`,
  });
}


// ---------- topic pages: "Bible verses about anxiety" and the rest, from the same topics and word index as the map ----------
// how someone might feel, for the topics the welcome page offers under "How are you feeling?" (FEELINGS in app.js)
const FEELING_OF = { anxiety: 'anxious', fear: 'afraid', comfort: 'grieving', rest: 'tired', forgiveness: 'guilty', anger: 'angry', temptation: 'tempted', strength: 'weak', patience: 'waiting', suffering: 'suffering', thanks: 'thankful', joy: 'joyful' };
export function topicList() { return readJSON('content/topics.json'); }
function topicPages(D) {
  const { B, N, F, T, E, V, vb, vc, vn, deg } = D, TOP = topicList();
  const idx = readJSON('data/words.json'), keys = Object.keys(idx);
  const decode = (str) => { let v = 0; return str.split(',').map(d => (v += parseInt(d, 36))); };
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const built = TOP.map(t => {
    // the same matching as the map: each key word, plus forms up to three letters longer (worry, worried, worries)
    const set = new Set();
    // skip: word forms that mean something else (kinds, restore); exclude: verses that use the word in another sense
    const skip = new Set(t.skip || []), osis = (v) => `${B[vb[v]].osis}.${vc[v]}.${vn[v]}`, drop = new Set(t.exclude || []);
    for (const w of t.words) for (const k of keys.filter(k => !skip.has(k) && (k === w || (k.startsWith(w) && k.length - w.length <= 3)))) for (const v of decode(idx[k])) if (!drop.has(osis(v))) set.add(v);
    const verses = [...set].sort((a, b) => a - b);
    const inSet = new Uint8Array(D.TOTAL); for (const v of verses) inSet[v] = 1;
    const top = verses.filter(v => deg[v]).sort((a, b) => deg[b] - deg[a] || a - b).slice(0, 20);
    // the strongest links between two verses that are both about this topic
    const links = [];
    for (let i = 0; i < N; i++) if (inSet[F[i]] && inSet[T[i]] && vb[F[i]] !== vb[T[i]]) links.push(i);
    links.sort((a, b) => V[b] - V[a]);
    return { t, slug: t.id, verses, top, links: links.slice(0, 8) };
  }).filter(x => x.top.length >= 3);
  const read = (k) => readURL(B[vb[k]], vc[k], vn[k]);
  const verseRow = (k, max) => `<li class="topic-row"><a href="${verseHref(D, k)}"><span class="row-main"><span class="row-title">${esc(label(D, k))}</span><span class="row-detail">${B[vb[k]].nt ? 'New Testament' : 'Old Testament'}</span></span><span class="row-end"><span class="meter" aria-hidden="true"><span style="width:${Math.max(4, Math.round(100 * deg[k] / max))}%"></span></span><span class="row-n">${fmt(deg[k])}</span>${chevron}</span></a><a class="row-read" href="${read(k)}" rel="noopener">Read<span class="sr-only"> ${esc(label(D, k))} on Bible.com</span></a></li>`;
  for (const x of built) {
    const name = lower(x.t.name), feel = FEELING_OF[x.t.id];
    const lead = `${fmt(x.verses.length)} verses in the Bible use words such as ${x.t.words.slice(0, 3).map(w => `“${w}”`).join(', ')}. These are the ones other passages point to most, so they are a good place to start${feel ? ` when you feel ${feel}` : ''}.`;
    page({
      file: `topics/${x.slug}/index.html`, nav: 'topics', title: `Bible verses about ${name} · Bible Connections`,
      description: `Bible verses about ${name}: the ${x.top.length} most connected passages, and how they link across the Bible. Read each one on Bible.com in your own translation.`,
      crumbs: [['Bible Connections', '/'], ['Topics', '/topics/'], [x.t.name, `/topics/${x.slug}/`]],
      body: `    <h1>Bible verses about ${esc(name)}</h1>
    <p class="lede">${esc(lead)}</p>
    <p class="actions"><a class="btn" href="/?topic=${encodeURIComponent(x.t.id)}">See them on the map</a></p>
    <h2>Most connected verses</h2>
    <p class="hint">The number is how many cross references each verse has. Tap a verse to see what it connects to.</p>
    <ul class="list">${x.top.map(k => verseRow(k, deg[x.top[0]])).join('')}</ul>
    ${x.links.length ? `<h2>How they connect</h2>
    <p class="hint">Pairs of these verses that point to each other across different books, strongest first.</p>
    <ul class="list">${x.links.map(i => `<li><a href="/?c=${D.B[vb[F[i]]].osis}.${vc[F[i]]}.${vn[F[i]]}~${D.B[vb[T[i]]].osis}.${vc[T[i]]}.${vn[T[i]]}"><span class="row-main"><span class="row-title">${esc(label(D, F[i]))} and ${esc(rangeLabel(D, T[i], E[i]))}</span><span class="row-detail">${fmt(V[i])} readers agree</span></span><span class="row-end">${chevron}</span></a></li>`).join('')}</ul>` : ''}
    <p class="hint">Topics are found by key words in the Berean Standard Bible, so this is a starting point rather than a complete list. No Bible translation is stored on this site: every passage opens on Bible.com.</p>
    <h2>Related topics</h2>
    <ul class="chip-row">${[1, 2, 3, 5, 8, 13, 21, 34].map(n => built[(built.indexOf(x) + n) % built.length]).filter((y, n, arr) => y !== x && arr.indexOf(y) === n).map(y => `<li><a href="/topics/${y.slug}/">${esc(y.t.name)}</a></li>`).join('')}</ul>`,
    });
  }
  // index, with the feelings first
  const feelings = built.filter(x => FEELING_OF[x.t.id]), rest = built.filter(x => !FEELING_OF[x.t.id]);
  const tile = (x) => `<li><a href="/topics/${x.slug}/"><span class="row-main"><span class="row-title">${esc(x.t.name)}</span><span class="row-detail">${fmt(x.verses.length)} verses</span></span><span class="row-end">${chevron}</span></a></li>`;
  page({
    file: 'topics/index.html', nav: 'topics', title: 'Bible verses by topic · Bible Connections',
    description: 'Bible verses about anxiety, fear, grief, forgiveness, hope and 37 more topics: the most connected passages for each, and how they link across the Bible.',
    crumbs: [['Bible Connections', '/'], ['Topics', '/topics/']],
    body: `    <h1>Bible verses by topic</h1>
    <p class="lede">For each topic, the verses other passages point to most, and how they connect. Every passage opens on Bible.com in your own translation.</p>
    <h2>How are you feeling?</h2>
    <ul class="list">${feelings.map(x => tile(x).replace(esc(x.t.name), `${esc(FEELING_OF[x.t.id].charAt(0).toUpperCase() + FEELING_OF[x.t.id].slice(1))}: ${esc(lower(x.t.name))}`)).join('')}</ul>
    <h2>More topics</h2>
    <ul class="list">${rest.map(tile).join('')}</ul>`,
  });
  return built;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const D = load();
  for (const d of ['books', 'verse', 'cross-references', 'topics']) fs.rmSync(path.join(SITE, d), { recursive: true, force: true });
  const per = bookPages(D);
  versePages(D);
  countPage(D, per);
  const topics = topicPages(D);
  console.log(`Wrote ${urls(D).length} pages: books, ${D.pages.size} verses, how many, ${topics.length} topics`);
}
