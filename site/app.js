(() => {
  'use strict';

  // ---------- Constants ----------
  const CATEGORIES = {
    law:        { name: 'Law',             dark: '#ff6b6b', light: '#c92a2a' },
    history:    { name: 'History',         dark: '#ffa94d', light: '#d9480f' },
    wisdom:     { name: 'Wisdom & Poetry', dark: '#ffd43b', light: '#a07800' },
    major:      { name: 'Major Prophets',  dark: '#a9e34b', light: '#5c940d' },
    minor:      { name: 'Minor Prophets',  dark: '#38d9a9', light: '#0b7285' },
    gospels:    { name: 'Gospels',         dark: '#4dabf7', light: '#1864ab' },
    acts:       { name: 'Acts',            dark: '#91a7ff', light: '#3b5bdb' },
    paul:       { name: 'Paul’s Letters', dark: '#da77f2', light: '#862e9c' },
    general:    { name: 'General Letters', dark: '#f783ac', light: '#c2255c' },
    revelation: { name: 'Revelation',      dark: '#e9ecef', light: '#343a40' },
  };
  const catKeys = Object.keys(CATEGORIES);
  const PALETTES = {
    dark:  { bg: '#000000', line: '#3a3a4a', sep: '#2a2a38', label: '#c9c9d6', sub: '#9a9aae', sel: '#ffffff', halo: '#000000', marker: '#ffd43b', hoverCh: 'rgba(255,255,255,.18)', focus: '#ffffff', barText: '#08080c' },
    light: { bg: '#ffffff', line: '#b9b9c6', sep: '#d5d5df', label: '#262633', sub: '#55556a', sel: '#111111', halo: '#ffffff', marker: '#c2410c', hoverCh: 'rgba(0,0,0,.10)', focus: '#111111', barText: '#ffffff' },
  };
  // Bible.com (YouVersion) translation ids used for "Read" links. No verse text is hosted on this site.
  // Bible.com (YouVersion) translations for "Read" links, loaded from content/versions.json. No verse text is hosted.
  let VERSIONS = { NIV: { id: 111, name: 'New International Version', lang: 'en' } };
  // Languages for the translation picker, in display order: [English name, native name]
  const LANG_NAMES = {
    en: ['English', 'English'], es: ['Spanish', 'Español'], pt: ['Portuguese', 'Português'], fr: ['French', 'Français'],
    de: ['German', 'Deutsch'], ru: ['Russian', 'Русский'], it: ['Italian', 'Italiano'], ko: ['Korean', '한국어'],
    pcm: ['Nigerian Pidgin', 'Naijá'], yo: ['Yoruba', 'Yorùbá'], ig: ['Igbo', 'Igbo'], ha: ['Hausa', 'Hausa'],
    sw: ['Swahili', 'Kiswahili'], am: ['Amharic', 'አማርኛ'], om: ['Oromo', 'Afaan Oromoo'], ti: ['Tigrinya', 'ትግርኛ'],
    ln: ['Lingala', 'Lingála'], kg: ['Kikongo (Kituba)', 'Kikongo ya Leta'], lua: ['Tshiluba', 'Tshiluba'],
    zu: ['Zulu', 'isiZulu'], xh: ['Xhosa', 'isiXhosa'], af: ['Afrikaans', 'Afrikaans'], ki: ['Kikuyu', 'Gĩkũyũ'], luo: ['Luo', 'Dholuo'],
    tl: ['Tagalog', 'Tagalog'], ceb: ['Cebuano', 'Cebuano'], ilo: ['Ilocano', 'Ilokano'],
    ml: ['Malayalam', 'മലയാളം'], ta: ['Tamil', 'தமிழ்'], te: ['Telugu', 'తెలుగు'], hi: ['Hindi', 'हिन्दी'],
  };
  const pickers = [];
  const VERSION = '0.8.0';
  let CONFIG = {}, PEOPLE = [], TOPICS = [], PLANS = [], FEATURED_WORDS = [];
  const EMBED = new URLSearchParams(location.search).get('embed') === '1';
  const BUCKETS = 32;
  const AXIS_H = 84;          // px reserved under the baseline
  const BAR_MAX = 30;         // px height of the tallest chapter bar
  const MARGIN = 14;
  const PAGE = 60;            // list items per "show more"
  const DEFAULT_VOTES = 7;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (id) => document.getElementById(id);
  const el = {
    viz: $('viz'), base: $('baseCanvas'), overlay: $('overlayCanvas'), tooltip: $('tooltip'),
    loading: $('loading'), legend: $('legend'), tagline: $('tagline'), count: $('count'),
    controls: $('controls'), search: $('search'), searchError: $('searchError'), bookList: $('bookList'),
    theme: $('theme'), fromSel: $('fromSel'), toSel: $('toSel'), votes: $('votes'), votesOut: $('votesOut'),
    notesOnly: $('notesOnly'),
    panel: $('panel'), panelTitle: $('panelTitle'), panelBody: $('panelBody'), announcer: $('announcer'),
    about: $('about'), settings: $('settings'), installBtn: $('installBtn'), installHelp: $('installHelp'),
  };
  const bctx = el.base.getContext('2d');
  const octx = el.overlay.getContext('2d');

  // ---------- Settings (stored per device) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bc.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bc.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  // Language: a ?lang= link wins, then the saved choice, then the browser language.
  const urlLang = new URLSearchParams(location.search).get('lang');
  const LANG = ['en', 'es'].includes(urlLang) ? urlLang
    : store.get('lang', (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');
  document.documentElement.lang = LANG;
  const settings = {
    appearance: store.get('appearance', 'system'),
    contrast: store.get('contrast', false),
    kids: store.get('kids', false),
    version: store.get('version', LANG === 'es' ? 'NVI' : 'NIV'),
    version2: store.get('version2', ''),
  };

  // ---------- Translation ----------
  // English text is the key. A watcher translates text as it appears on the page, so the
  // rest of the code can stay in English. Missing translations simply show the English.
  const I18N = { strings: {}, patterns: [] };
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function tr(text) {
    if (LANG === 'en' || !text) return text;
    const m = String(text).match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = m[2].replace(/\s+/g, ' ');
    if (!core) return text;
    let out = I18N.strings[core];
    if (out === undefined) {
      for (const [re, v] of I18N.patterns) {
        const r = core.match(re);
        if (r) { out = v.replace(/\{(\w+)\}/g, (_, k) => tr(r.groups[k])); break; }
      }
    }
    return out === undefined ? text : m[1] + out + m[3];
  }
  const lastOut = new WeakMap();
  const I18N_ATTRS = ['placeholder', 'aria-label', 'title', 'label', 'alt'];
  function translateText(node) {
    if (lastOut.get(node) === node.data) return;
    const out = tr(node.data);
    if (out !== node.data) node.data = out;
    lastOut.set(node, node.data);
  }
  function translateAttr(elm, a) {
    const v = elm.getAttribute(a);
    if (v === null) return;
    const out = tr(v);
    if (out !== v) elm.setAttribute(a, out);
  }
  function translateTree(root) {
    if (root.nodeType === 3) { if (!root.parentElement?.closest('[lang="en"]')) translateText(root); return; }
    if (root.nodeType !== 1 || root.closest?.('script, style, [lang="en"]')) return;
    for (const a of I18N_ATTRS) if (root.hasAttribute(a)) translateAttr(root, a);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) { if (!n.parentElement.closest('script, style, [lang="en"]')) translateText(n); }
      else for (const a of I18N_ATTRS) if (n.hasAttribute(a)) translateAttr(n, a);
    }
  }
  function startTranslating() {
    if (LANG === 'en') return;
    translateTree(document.body);
    document.title = tr(document.title);
    new MutationObserver((muts) => {
      for (const mu of muts) {
        if (mu.type === 'childList') mu.addedNodes.forEach(translateTree);
        else if (mu.type === 'characterData') { if (!mu.target.parentElement?.closest('[lang="en"]')) translateText(mu.target); }
        else if (mu.type === 'attributes') translateAttr(mu.target, mu.attributeName);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
  }
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const contrastQuery = matchMedia('(prefers-contrast: more)');
  let pal = PALETTES.dark, isLight = false, highContrast = false;
  function applyAppearance() {
    isLight = settings.appearance === 'light' || (settings.appearance === 'system' && !darkQuery.matches);
    highContrast = settings.contrast || contrastQuery.matches;
    pal = isLight ? PALETTES.light : PALETTES.dark;
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    document.documentElement.dataset.contrast = highContrast ? 'more' : 'normal';
    document.documentElement.dataset.kids = settings.kids ? 'on' : 'off';
    document.querySelector('meta[name=theme-color]').content = pal.bg;
    buildColors();
    if (N) { renderLegend(); drawBase(); renderPanel(); }
  }
  darkQuery.addEventListener?.('change', applyAppearance);
  contrastQuery.addEventListener?.('change', applyAppearance);

  // ---------- Data ----------
  // Book order on the line: Bible order or approximate chronological order (by when events happen).
  const CHRONO = 'Gen Job Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Chr Ps 1Kgs Prov Eccl Song 2Chr 2Kgs Jonah Amos Hos Isa Mic Nah Zeph Hab Jer Lam Obad Joel Ezek Dan Ezra Hag Zech Esth Neh Mal Matt Mark Luke John Acts Jas Gal 1Thess 2Thess 1Cor 2Cor Rom Eph Phil Col Phlm 1Tim Titus 1Pet 2Tim 2Pet Heb Jude 1John 2John 3John Rev'.split(' ');
  let POS, INV, CHAP_OF, NT_POS = 0, BOOKS_BY_POS = [], CHAPTERS_BY_POS = [];
  function setOrder(order) {
    POS = new Uint16Array(TOTAL); INV = new Uint16Array(TOTAL);
    const seq = order === 'chrono' ? CHRONO.map(o => BOOKS.findIndex(b => b.osis === o)) : BOOKS.map((_, i) => i);
    let p = 0;
    for (const bi of seq) {
      const b = BOOKS[bi];
      b.pos = p;
      for (let v = b.start; v < b.end; v++) { POS[v] = p; INV[p] = v; p++; }
    }
    BOOKS_BY_POS = seq.map(i => BOOKS[i]);
    CHAPTERS_BY_POS = [...chapters].sort((a, b) => POS[a.start] - POS[b.start]);
    NT_POS = Math.min(...BOOKS.slice(39).map(b => b.pos));
  }
  let BOOKS, TOTAL, N = 0, F, T, E, V, verseBook, verseChap, verseNum, chapters, NT_START;
  const noteMap = new Map();
  let hasNote = new Uint8Array(0);
  let wordIndex = null, INTROS = {}, REFLECT = {};

  async function loadData() {
    const getJSON = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const [meta, bin, themes, notes, journeys, series] = await Promise.all([
      getJSON('data/books.json'),
      fetch('data/refs.bin').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
      getJSON('content/themes.json'), getJSON('content/notes.json'), getJSON('content/journeys.json'),
      getJSON('content/series.json').catch(() => ({ enabled: false })),
      getJSON('content/versions.json').then(list => { VERSIONS = Object.fromEntries(list.map(v => [v.key || v.code, v])); }).catch(() => {}),
      getJSON('content/config.json').then(c => { CONFIG = c; }).catch(() => {}),
      getJSON('content/people-places.json').then(x => { PEOPLE = x; }).catch(() => {}),
      getJSON('content/topics.json').then(x => { TOPICS = x; }).catch(() => {}),
      getJSON('content/plans.json').then(x => { PLANS = x; }).catch(() => {}),
      getJSON('content/words.json').then(x => { FEATURED_WORDS = x.map(w => w.id); }).catch(() => {}),
      getJSON('content/book-intros.json').then(x => { INTROS = Object.fromEntries(x.map(b => [b.osis, b])); }).catch(() => {}),
      getJSON('content/reflect.json').then(x => { REFLECT = x; }).catch(() => {}),
    ]);
    window.THEMES = themes; window.NOTES = notes; window.JOURNEYS = journeys; window.SERIES = series;
    BOOKS = meta.books; TOTAL = meta.totalVerses;
    await applyLanguageData();
    const raw = new Uint16Array(bin);
    const n = raw.length / 4;
    F = new Uint16Array(n); T = new Uint16Array(n); E = new Uint16Array(n); V = new Uint16Array(n);
    for (let i = 0; i < n; i++) { F[i] = raw[i * 4]; T[i] = raw[i * 4 + 1]; E[i] = raw[i * 4 + 2]; V[i] = raw[i * 4 + 3]; }

    verseBook = new Uint8Array(TOTAL); verseChap = new Uint16Array(TOTAL); verseNum = new Uint16Array(TOTAL);
    chapters = [];
    BOOKS.forEach((b, bi) => {
      let s = b.start;
      b.end = b.start + b.chapters.reduce((a, c) => a + c, 0);
      b.chapterStart = [];
      b.chapters.forEach((count, ci) => {
        b.chapterStart.push(s);
        chapters.push({ book: bi, chapter: ci + 1, start: s, count });
        for (let v = 0; v < count; v++) { verseBook[s + v] = bi; verseChap[s + v] = ci + 1; verseNum[s + v] = v + 1; }
        s += count;
      });
    });
    NT_START = BOOKS[39].start;
    CHAP_OF = new Uint16Array(TOTAL);
    chapters.forEach((c, n) => { for (let v = 0; v < c.count; v++) CHAP_OF[c.start + v] = n; });
    setOrder(state.order);

    // "Why it connects" notes, matched to the data in either direction
    const pairKey = (a, b) => Math.min(a, b) * 65536 + Math.max(a, b);
    const wanted = new Map();
    for (const { from: a, to: b, type, note: text } of (window.NOTES || [])) {
      const ia = osisToIndex(a), ib = osisToIndex(b);
      if (ia >= 0 && ib >= 0) wanted.set(pairKey(ia, ib), { type, text });
    }
    hasNote = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const note = wanted.get(pairKey(F[i], T[i]));
      if (note) { hasNote[i] = 1; noteMap.set(i, note); }
    }
    N = n;
  }

  // Spanish book names are always loaded so Spanish references work in any language.
  async function applyLanguageData() {
    const getJSON = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const es = await getJSON('content/i18n/es.json').catch(() => null);
    BOOKS.forEach((b, i) => {
      b.nameEn = b.name; b.nameEs = es ? es.books[i] : b.name;
      b.abbr = LANG === 'es' && es ? es.abbr[i] : b.osis;
      if (LANG === 'es' && es) b.name = es.books[i];
    });
    if (LANG !== 'es' || !es) return;
    I18N.strings = es.strings || {};
    I18N.patterns = Object.entries(es.patterns || {}).map(([k, v]) =>
      [new RegExp('^' + escRe(k).replace(/\\\{(\w+)\\\}/g, '(?<$1>[\\s\\S]+?)') + '$'), v]);
    for (const k of Object.keys(CATEGORIES)) CATEGORIES[k].name = es.categories[k] || CATEGORIES[k].name;
    const [themesEs, journeysEs] = await Promise.all([
      getJSON('content/themes.es.json').catch(() => []), getJSON('content/journeys.es.json').catch(() => []),
    ]);
    for (const t of THEMES) Object.assign(t, themesEs.find(x => x.id === t.id) || {});
    for (const j of JOURNEYS) {
      const x = journeysEs.find(y => y.id === j.id);
      if (!x) continue;
      if (x.name) j.name = x.name;
      if (x.summary) j.summary = x.summary;
      (x.steps || []).forEach((st, n) => { if (j.steps[n]) for (const f of ['title', 'note', 'question']) if (st[f]) j.steps[n][f] = st[f]; });
    }
  }

  function loadWords() {
    if (!wordIndex) wordIndex = fetch('data/words.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    wordIndex.catch(() => { wordIndex = null; });
    return wordIndex;
  }
  function decodePostings(s) { let v = 0; return s.split(',').map(d => (v += parseInt(d, 36))); }

  // ---------- Reference helpers ----------
  function refLabel(start, end = start) {
    const b = BOOKS[verseBook[start]].name, c = verseChap[start], v = verseNum[start];
    if (end === start) return `${b} ${c}:${v}`;
    if (verseBook[end] === verseBook[start] && verseChap[end] === c) return `${b} ${c}:${v}-${verseNum[end]}`;
    return `${b} ${c}:${v} to ${refLabel(end)}`;
  }
  function rangeLabel(r) {
    if (r.entity) return r.entity.name;
    if (r.kind === 'words') return `“${r.query}”`;
    if (r.kind === 'book') return BOOKS[r.book].name;
    if (r.kind === 'chapter') return `${BOOKS[r.book].name} ${r.chapter}`;
    return refLabel(r.start, r.end - 1);
  }
  const toOsis = (v) => `${BOOKS[verseBook[v]].osis}.${verseChap[v]}.${verseNum[v]}`;
  function osisToIndex(osis) {
    const [bk, c, v] = osis.split('.');
    const bi = BOOKS.findIndex(b => b.osis === bk);
    if (bi < 0 || !c || !v) return -1;
    const b = BOOKS[bi];
    const ci = Math.min(Math.max(+c, 1), b.chapters.length) - 1;
    return b.chapterStart[ci] + Math.min(Math.max(+v, 1), b.chapters[ci]) - 1;
  }
  const vLabel = (ver) => (VERSIONS[ver] && VERSIONS[ver].label) || ver;
  // an optional second translation shown next to the first, for comparing
  const second = () => (settings.version2 && VERSIONS[settings.version2] && settings.version2 !== settings.version ? settings.version2 : '');
  function bibleUrl(start, end = start, chapterOnly = false, ver = settings.version) {
    // New Testament only versions open Old Testament passages in the NIV
    if (VERSIONS[ver].nt && verseBook[start] < 39) ver = 'NIV';
    const { id } = VERSIONS[ver], code = VERSIONS[ver].code || ver;
    const b = BOOKS[verseBook[start]], c = verseChap[start];
    if (chapterOnly) return `https://www.bible.com/bible/${id}/${b.usfm}.${c}.${code}`;
    // Bible.com does not support verse ranges in links, so a range opens at its first verse
    return `https://www.bible.com/bible/${id}/${b.usfm}.${c}.${verseNum[start]}.${code}`;
  }

  const ALIASES = {
    jn: 'John', jhn: 'John', mt: 'Matthew', mk: 'Mark', lk: 'Luke', ps: 'Psalms', psalm: 'Psalms', pss: 'Psalms',
    sos: 'Song of Songs', songofsolomon: 'Song of Songs', song: 'Song of Songs', canticles: 'Song of Songs',
    revelations: 'Revelation', rev: 'Revelation', phil: 'Philippians', phm: 'Philemon', philem: 'Philemon',
    jas: 'James', jdg: 'Judges', judg: 'Judges', ezk: 'Ezekiel', eze: 'Ezekiel', prov: 'Proverbs', eccles: 'Ecclesiastes',
    // Spanish
    salmo: 'Psalms', sal: 'Psalms', cantardeloscantares: 'Song of Songs', cantar: 'Song of Songs', apoc: 'Revelation',
    sanjuan: 'John', sanmateo: 'Matthew', sanmarcos: 'Mark', sanlucas: 'Luke', hch: 'Acts', stgo: 'James', ex: 'Exodus',
  };
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/^(iii|3rd|third)\s+/, '3').replace(/^(ii|2nd|second)\s+/, '2').replace(/^(i|1st|first)\s+/, '1')
    .replace(/[^a-z0-9]/g, '');
  function findBook(q, allowPrefix) {
    const n = norm(q);
    if (!n) return -1;
    if (ALIASES[n]) return BOOKS.findIndex(b => b.nameEn === ALIASES[n]);
    const names = (b) => [b.nameEn, b.nameEs, b.osis, b.abbr].map(norm);
    let bi = BOOKS.findIndex(b => names(b).includes(n));
    if (bi < 0 && allowPrefix && n.length >= 2) {
      bi = BOOKS.findIndex(b => norm(LANG === 'es' ? b.nameEs : b.nameEn).startsWith(n));
      if (bi < 0) bi = BOOKS.findIndex(b => names(b).some(x => x.startsWith(n)));
    }
    return bi;
  }
  function parseReference(input) {
    input = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const m = input.trim().match(/^([1-3]?\s*[a-z][a-z .]*?)\s*(\d+)?(?:\s*[:.\s]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/i);
    if (!m) return null;
    // a bare word only counts as a book when it is a full book name ("Mark"); otherwise it is a word search
    const bi = findBook(m[1], !!m[2]);
    if (bi < 0) return null;
    const b = BOOKS[bi];
    if (!m[2]) return { kind: 'book', book: bi, start: b.start, end: b.end };
    const c = +m[2];
    if (c < 1 || c > b.chapters.length) return { error: `${b.name} has ${b.chapters.length} chapters.` };
    const cs = b.chapterStart[c - 1], cn = b.chapters[c - 1];
    if (!m[3]) return { kind: 'chapter', book: bi, chapter: c, start: cs, end: cs + cn };
    const v1 = +m[3], v2 = m[4] ? +m[4] : v1;
    if (v1 < 1 || v1 > cn) return { error: `${b.name} ${c} has ${cn} verses.` };
    return { kind: 'verse', book: bi, start: cs + v1 - 1, end: cs + Math.min(Math.max(v2, v1), cn) };
  }

  // ---------- State ----------
  const state = {
    minVotes: DEFAULT_VOTES, from: 'all', to: 'all', theme: '', colorMode: 'distance', notesOnly: false, order: 'bible',
    focus: null,       // {kind: book|chapter|verse|words, start, end, mask?, verses?, query?}
    selected: -1,      // index into refs
    hover: -1, hoverChapter: -1,
    mode: 'explore',   // explore | journeys | journey | insights
    journey: null,     // {j, step}
  };
  const view = { k: 1, tx: 0, ty: 0, fitK: 1, W: 0, H: 0, dpr: 1 };
  let filtered = new Int32Array(0);
  let focusList = new Int32Array(0);
  let themeMask = null;
  let listShown = PAGE, versesShown = 40;

  // ---------- Filtering ----------
  function selInterval(sel) {
    if (sel === 'all') return [0, TOTAL];
    if (sel === 'ot') return [0, NT_START];
    if (sel === 'nt') return [NT_START, TOTAL];
    const [kind, id] = sel.split(':');
    if (kind === 'book') { const b = BOOKS[+id]; return [b.start, b.end]; }
    const bs = BOOKS.filter(b => b.cat === id);
    return [bs[0].start, bs[bs.length - 1].end];
  }

  function applyFilters({ panel = true } = {}) {
    const [a0, a1] = selInterval(state.from), [b0, b1] = selInterval(state.to);
    const between = !(state.from === 'all' && state.to === 'all');
    const theme = THEMES.find(t => t.id === state.theme);
    themeMask = null;
    if (theme) {
      themeMask = new Uint8Array(TOTAL);
      theme.verses.forEach(o => { const i = osisToIndex(o); if (i >= 0) themeMask[i] = 1; });
    }
    const out = [];
    for (let i = 0; i < N; i++) {
      if (state.notesOnly) { if (!hasNote[i]) continue; }   // notes are shown whatever their strength
      else if (V[i] < state.minVotes) continue;
      const f = F[i], t = T[i];
      if (between) {
        const ok = (f >= a0 && f < a1 && t >= b0 && t < b1) || (f >= b0 && f < b1 && t >= a0 && t < a1);
        if (!ok) continue;
      }
      if (themeMask && !themeMask[f]) {
        let hit = false;
        for (let v = t; v <= E[i]; v++) if (themeMask[v]) { hit = true; break; }
        if (!hit) continue;
      }
      out.push(i);
    }
    filtered = Int32Array.from(out);
    listVersion++;
    if (state.selected >= 0 && !filtered.includes(state.selected)) state.selected = -1;
    topCache = null; statsCache = null;
    computeFocus();
    updateCount();
    drawBase();
    if (panel) renderPanel();
  }

  function touches(i, f) {
    if (f.mask) {
      if (f.mask[F[i]]) return true;
      for (let v = T[i]; v <= E[i]; v++) if (f.mask[v]) return true;
      return false;
    }
    return (F[i] >= f.start && F[i] < f.end) || (T[i] < f.end && E[i] >= f.start);
  }
  function computeFocus() {
    listShown = PAGE; versesShown = 40;
    if (!state.focus) { focusList = new Int32Array(0); return; }
    const out = [];
    for (const i of filtered) if (touches(i, state.focus)) out.push(i);
    out.sort((a, b) => V[b] - V[a]);
    focusList = Int32Array.from(out);
  }

  function updateCount() {
    const fmt = (n) => n.toLocaleString();
    const active = [state.theme, state.from !== 'all', state.to !== 'all', state.minVotes !== DEFAULT_VOTES, state.notesOnly, state.colorMode !== 'distance', state.order !== 'bible'].filter(Boolean).length;
    $('filtersCount').textContent = active ? `${active} active` : '';
    el.count.textContent = `Showing ${fmt(filtered.length)} of ${fmt(N)} connections`;
    el.tagline.textContent = `${fmt(filtered.length)} connections across ${fmt(TOTAL)} verses`;
  }

  // ---------- Color ----------
  let distColors = [], catColors = [];
  function buildColors() {
    distColors = Array.from({ length: BUCKETS }, (_, b) => {
      const t = b / (BUCKETS - 1);
      const l = isLight ? 42 - t * 4 : 60 - t * 6;
      return `hsl(${(285 + t * 195) % 360}, ${isLight ? 85 : 95}%, ${l}%)`;
    });
    catColors = catKeys.map(k => CATEGORIES[k][isLight ? 'light' : 'dark']);
  }
  const catColor = (cat) => catColors[catKeys.indexOf(cat)];
  function bucketOf(i) {
    if (state.colorMode === 'category') return catKeys.indexOf(BOOKS[verseBook[F[i]]].cat);
    const span = Math.abs(POS[T[i]] - POS[F[i]]) / TOTAL;
    return Math.min(BUCKETS - 1, Math.floor(Math.sqrt(span) * BUCKETS));
  }
  const colorOf = (i) => (state.colorMode === 'category' ? catColors[bucketOf(i)] : distColors[bucketOf(i)]);

  function renderLegend() {
    if (state.colorMode === 'distance') {
      const stops = distColors.filter((_, i) => i % 4 === 0).concat(distColors[BUCKETS - 1]).join(',');
      el.legend.innerHTML = `<span>Near</span><span class="grad" style="background:linear-gradient(90deg,${stops})"></span><span>Far apart</span>`;
    } else {
      el.legend.innerHTML = catKeys.map((k, n) => `<span><span class="sw" style="background:${catColors[n]}"></span>${CATEGORIES[k].name}</span>`).join('');
    }
  }

  // ---------- View ----------
  function resize() {
    const r = el.viz.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prevW = view.W, prevFit = view.fitK;
    view.W = r.width; view.H = r.height; view.dpr = dpr;
    for (const c of [el.base, el.overlay]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    // the GL canvas renders at up to 1.5x: its 1 device pixel lines then match the 2D renderer's weight
    if (glr) glr.resize(r.width * Math.min(dpr, 1.5), r.height * Math.min(dpr, 1.5));
    const usableH = view.H - AXIS_H - 20;
    view.fitK = Math.min((view.W - 2 * MARGIN) / TOTAL, (usableH * 2) / TOTAL);
    if (!prevW) resetView(false);
    else {
      const rel = view.k / prevFit;
      const cx = (prevW / 2 - view.tx) / view.k;
      view.k = view.fitK * rel;
      view.tx = view.W / 2 - cx * view.k;
      view.ty = Math.min(view.ty, view.H - AXIS_H);
      clampView();
    }
    drawBase();
  }
  function fitView() {
    const k = view.fitK;
    return { k, tx: (view.W - TOTAL * k) / 2, ty: view.H - AXIS_H };
  }
  function resetView(animate = true) { animateTo(fitView(), animate); }
  function clampView() {
    view.k = Math.min(80, Math.max(view.fitK, view.k));
    const contentW = TOTAL * view.k;
    view.tx = Math.min(view.W * 0.6, Math.max(view.W * 0.4 - contentW, view.tx));
    const maxTy = view.H - AXIS_H + contentW / 2;
    view.ty = Math.min(maxTy, Math.max(AXIS_H, view.ty));
  }
  function zoomAt(px, py, factor) {
    const k0 = view.k;
    const k1 = Math.min(80, Math.max(view.fitK, k0 * factor));
    const f = k1 / k0;
    view.tx = px - (px - view.tx) * f;
    view.ty = py + (view.ty - py) * f;
    view.k = k1;
    if (view.k <= view.fitK * 1.0001) Object.assign(view, fitView());
    clampView();
    drawBase();
  }
  let anim = 0;
  function animateTo(target, animate = true) {
    cancelAnimationFrame(anim);
    if (!animate || reducedMotion) { Object.assign(view, target); clampView(); drawBase(); return; }
    const from = { k: view.k, tx: view.tx, ty: view.ty };
    const t0 = performance.now(), dur = 450;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e);
      const cxFrom = (view.W / 2 - from.tx) / from.k, cxTo = (view.W / 2 - target.tx) / target.k;
      const cx = cxFrom + (cxTo - cxFrom) * e;
      view.k = k; view.tx = view.W / 2 - cx * k;
      view.ty = from.ty + (target.ty - from.ty) * e;
      clampView(); drawBase();
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function zoomToSpan(s, e, padFrac = 0.15) {
    const span = Math.max(e - s, 1);
    const k = Math.min(80, Math.max(view.fitK, (view.W - 2 * MARGIN) / (span * (1 + padFrac * 2))));
    const kh = (view.H - AXIS_H - 30) * 2 / span;
    const kk = Math.max(view.fitK, Math.min(k, kh));
    animateTo({ k: kk, tx: view.W / 2 - ((s + e) / 2) * kk, ty: view.H - AXIS_H }, true);
  }
  const zoomToPair = (a, b) => zoomToSpan(Math.min(POS[a], POS[b]), Math.max(POS[a], POS[b]) + 1, 0.1);
  // a contiguous verse range (a verse, chapter or book) is contiguous in either book order
  const zoomToRange = (s, e, pad) => zoomToSpan(POS[s], POS[s] + (e - s), pad);
  const spanOfPairs = (pairs) => {
    const xs = pairs.flatMap(([a, b]) => [POS[a], POS[b]]);
    zoomToSpan(Math.min(...xs), Math.max(...xs) + 1, 0.08);
  };
  const zoomToRef = (i) => zoomToPair(F[i], T[i]);
  const sx = (x) => view.tx + x * view.k;

  // ---------- Drawing ----------
  let baseQueued = false, overlayQueued = false;
  function drawBase() { if (!baseQueued) { baseQueued = true; requestAnimationFrame(() => { baseQueued = false; paintBase(); paintOverlay(); }); } }
  function drawOverlay() { if (!overlayQueued) { overlayQueued = true; requestAnimationFrame(() => { overlayQueued = false; paintOverlay(); }); } }

  function arcBetween(path, a, b) {
    a = POS[a] + 0.5; b = POS[b] + 0.5;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const r = (hi - lo) / 2 * view.k;
    const cx = view.tx + (lo + hi) / 2 * view.k;
    const W = view.W, by = view.ty;
    if (cx + r < -2 || cx - r > W + 2 || r < 0.35) return false;
    // Only the on-screen part of the circle is drawn: zoomed in, huge arcs become two "legs".
    const s = (by + 2) / r;
    if (s >= 1) {
      path.moveTo(cx + r, by);
      path.arc(cx, by, r, 0, Math.PI, true);
      return true;
    }
    const th = Math.asin(s), dx = r * Math.cos(th);
    let drawn = false;
    if (cx + r >= -2 && cx + dx <= W + 2) { path.moveTo(cx + r, by); path.arc(cx, by, r, 0, -th, true); drawn = true; }
    if (cx - dx >= -2 && cx - r <= W + 2) { path.moveTo(cx - dx, by - r * s); path.arc(cx, by, r, -Math.PI + th, -Math.PI, true); drawn = true; }
    return drawn;
  }
  const arcPath = (path, i) => arcBetween(path, F[i], T[i]);

  // ---------- WebGL renderer (fast path) ----------
  // Every arc is one instance of a shared half-circle drawn as line segments. The GPU places each
  // instance from its two verse positions, so zooming only updates a few numbers per frame.
  // Falls back to the 2D canvas renderer when WebGL2 is not available.
  const glr = (() => {
    const forced = new URLSearchParams(location.search).get('renderer');
    if (forced === 'canvas') return null;
    const canvas = $('glCanvas');
    const gl = canvas && canvas.getContext('webgl2', { alpha: false, antialias: true, preserveDrawingBuffer: true });
    if (!gl) return null;
    // software WebGL (no graphics chip) is slower than the 2D canvas, so only use real GPUs
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    if (forced !== 'webgl' && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) return null;
    const vs = `#version 300 es
      precision highp float;
      in float u; in vec2 ab; in float bucket;
      uniform float k, tx, ty; uniform vec2 size; uniform vec3 colors[32];
      out vec3 col;
      void main() {
        float lo = min(ab.x, ab.y) + 0.5, hi = max(ab.x, ab.y) + 0.5;
        float r = (hi - lo) * 0.5 * k;
        float cx = tx + (lo + hi) * 0.5 * k;
        // segments are packed densely near the ends so zoomed-in "legs" stay smooth
        float ang = 3.14159265 * (0.5 - 0.5 * cos(3.14159265 * u));
        vec2 p = vec2(cx + r * cos(ang), ty - r * sin(ang));
        gl_Position = vec4(p.x / size.x * 2.0 - 1.0, 1.0 - p.y / size.y * 2.0, 0.0, 1.0);
        col = colors[int(bucket)];
      }`;
    const fs = `#version 300 es
      precision mediump float;
      in vec3 col; uniform float alpha; out vec4 outColor;
      void main() { outColor = vec4(col, alpha); }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch { return null; }
    const SEG = 64, uv = new Float32Array(SEG * 2);
    for (let n = 0; n < SEG; n++) { uv[n * 2] = n / SEG; uv[n * 2 + 1] = (n + 1) / SEG; }
    const loc = (n) => gl.getAttribLocation(prog, n), uni = (n) => gl.getUniformLocation(prog, n);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const uBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uBuf); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc('u')); gl.vertexAttribPointer(loc('u'), 1, gl.FLOAT, false, 0, 0);
    const iBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, iBuf);
    gl.enableVertexAttribArray(loc('ab')); gl.vertexAttribPointer(loc('ab'), 2, gl.FLOAT, false, 12, 0); gl.vertexAttribDivisor(loc('ab'), 1);
    gl.enableVertexAttribArray(loc('bucket')); gl.vertexAttribPointer(loc('bucket'), 1, gl.FLOAT, false, 12, 8); gl.vertexAttribDivisor(loc('bucket'), 1);
    const U = { k: uni('k'), tx: uni('tx'), ty: uni('ty'), size: uni('size'), colors: uni('colors'), alpha: uni('alpha') };
    let count = 0, key = null, lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; canvas.hidden = true; drawBase(); });
    const toRGB = (css) => {
      const m = css.match(/^hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)$/);
      if (m) {
        const h = +m[1] / 360, sat = +m[2] / 100, l = +m[3] / 100;
        const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p2 = 2 * l - q;
        const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p2 + (q - p2) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6 : p2; };
        return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
      }
      const n = parseInt(css.slice(1), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    };
    return {
      get ok() { return !lost; },
      canvas,
      resize(w, h) { canvas.width = Math.round(w); canvas.height = Math.round(h); },
      draw(list, bucketFn, palette, alpha, bg) {
        const k2 = list.length + ':' + state.colorMode + ':' + state.order + ':' + (list === filtered ? listVersion : -1);
        if (k2 !== key) {
          // far-reaching arcs first so nearer (smaller) arcs sit on top
          const order = Array.from(list).map(i => [i, bucketFn(i)]).sort((x, y) => y[1] - x[1]);
          const data = new Float32Array(order.length * 3);
          order.forEach(([i, b], n) => { data[n * 3] = POS[F[i]]; data[n * 3 + 1] = POS[T[i]]; data[n * 3 + 2] = b; });
          gl.bindBuffer(gl.ARRAY_BUFFER, iBuf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
          count = order.length; key = k2;
        }
        const [r, g, b] = toRGB(bg);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(r, g, b, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        if (!count) return;
        gl.useProgram(prog); gl.bindVertexArray(vao);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const cols = new Float32Array(32 * 3);
        palette.forEach((c, n) => cols.set(toRGB(c), n * 3));
        gl.uniform3fv(U.colors, cols);
        gl.uniform1f(U.k, view.k); gl.uniform1f(U.tx, view.tx); gl.uniform1f(U.ty, view.ty);
        gl.uniform2f(U.size, view.W, view.H); gl.uniform1f(U.alpha, alpha);
        gl.drawArraysInstanced(gl.LINES, 0, SEG * 2, count);
      },
    };
  })();
  let listVersion = 0;
  document.body.dataset.renderer = glr ? 'webgl' : 'canvas';
  if (!glr) $('glCanvas').hidden = true;

  function paintBase() {
    const ctx = bctx, { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const useGL = glr && glr.ok;
    if (useGL) ctx.clearRect(0, 0, W, H);
    else { ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H); }
    if (!N) return;

    const dim = !!state.focus || state.selected >= 0 || state.mode === 'journey' || state.mode === 'plan' || (state.mode === 'game' && state.game?.answered != null) || (state.mode === 'path' && !!state.path?.edges);
    const nb = state.colorMode === 'category' ? catKeys.length : BUCKETS;
    const zoom = view.k / view.fitK;
    let alpha = Math.min(0.9, Math.max(0.05, 22 / Math.sqrt(Math.max(1, filtered.length)) * Math.sqrt(zoom)));
    if (highContrast) alpha = Math.min(1, alpha * 1.8);
    if (isLight) alpha = Math.min(1, alpha * 1.3);
    if (dim) alpha *= highContrast ? 0.15 : 0.3;
    if (useGL) {
      glr.draw(filtered, bucketOf, state.colorMode === 'category' ? catColors : distColors, Math.min(1, alpha * (highContrast ? 1.3 : 1.15)), pal.bg);
    } else {
      const paths = Array.from({ length: nb }, () => new Path2D());
      for (const i of filtered) arcPath(paths[bucketOf(i)], i);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (zoom > 20 ? 1.2 : 0.8) + (highContrast ? 0.4 : 0);
      // far-reaching arcs first so nearer (smaller) arcs sit on top
      for (let b = nb - 1; b >= 0; b--) {
        ctx.strokeStyle = state.colorMode === 'category' ? catColors[b] : distColors[b];
        ctx.stroke(paths[b]);
      }
      ctx.globalAlpha = 1;
    }
    paintAxis(ctx);
    if (!landing.hidden) paintHero();
  }

  function paintAxis(ctx) {
    const { W, H } = view, y0 = view.ty;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, y0, W, H - y0);
    const focus = state.focus && !state.focus.mask ? state.focus : null;
    const zoomedIn = view.k > 14;
    for (let c = 0; c < chapters.length; c++) {
      const ch = chapters[c];
      const x0 = sx(POS[ch.start]), x1 = x0 + ch.count * view.k;
      if (x1 < 0 || x0 > W) continue;
      const h = zoomedIn ? BAR_MAX : 3 + (ch.count / 176) * BAR_MAX;
      const inFocus = focus && ch.start < focus.end && ch.start + ch.count > focus.start;
      ctx.fillStyle = catColor(BOOKS[ch.book].cat);
      ctx.globalAlpha = focus ? (inFocus ? 1 : 0.35) : (c === state.hoverChapter ? 1 : 0.8);
      ctx.fillRect(x0, y0 + 2, Math.max(0.6, x1 - x0 - (x1 - x0 > 4 ? 1 : 0)), h);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.line;
    ctx.fillRect(0, y0, W, 1);

    // Old / New Testament divider
    const ntx = sx(NT_POS);
    if (ntx > 0 && ntx < W) { ctx.fillStyle = pal.label; ctx.fillRect(Math.round(ntx) - 1, y0, 2, AXIS_H - 6); }

    ctx.textBaseline = 'top';
    const row = [y0 + BAR_MAX + 8, y0 + BAR_MAX + 23];
    const showChapters = view.k * 25 > 24;
    const lastRight = [-Infinity, -Infinity];
    ctx.font = `${highContrast ? 700 : 600} 11px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const b of BOOKS_BY_POS) {
      const x0 = sx(b.pos), x1 = x0 + (b.end - b.start) * view.k;
      if (x1 < 0 || x0 > W) continue;
      ctx.fillStyle = pal.sep;
      ctx.fillRect(x0, y0 + 2, 1, BAR_MAX + 6);
      const w = Math.min(x1, W) - Math.max(x0, 0);
      const label = w > ctx.measureText(b.name).width + 6 ? b.name : b.abbr;
      const lw = ctx.measureText(label).width;
      let cx = (Math.max(x0, 0) + Math.min(x1, W)) / 2;
      if (w > lw + 4) cx = Math.min(Math.max(cx, x0 + lw / 2 + 2), x1 - lw / 2 - 2);
      // stagger over two rows so more names fit when zoomed out
      for (let r = 0; r < (showChapters ? 1 : 2); r++) {
        if (cx - lw / 2 >= lastRight[r] + 5) {
          ctx.fillStyle = pal.label;
          ctx.fillText(label, cx, row[r]);
          lastRight[r] = cx + lw / 2;
          break;
        }
      }
    }
    if (showChapters) {
      ctx.font = `${highContrast ? 600 : 400} 10px system-ui, sans-serif`;
      let last = -Infinity;
      for (const ch of CHAPTERS_BY_POS) {
        const x0 = sx(POS[ch.start]), x1 = x0 + ch.count * view.k;
        if (x1 < 0 || x0 > W) continue;
        const cx = (x0 + x1) / 2;
        if (x1 - x0 >= 16 && cx >= last + 22) { ctx.fillStyle = pal.sub; ctx.fillText(String(ch.chapter), cx, row[1]); last = cx; }
        if (zoomedIn) {
          ctx.fillStyle = pal.barText;
          for (let v = 0; v < ch.count; v++) {
            const vx = sx(POS[ch.start] + v + 0.5);
            if (vx >= 0 && vx <= W) ctx.fillText(String(v + 1), vx, y0 + 12);
          }
        }
      }
    }
    // Testament captions
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillStyle = pal.sub;
    const capY = y0 + AXIS_H - 16;
    if (ntx > 90) { ctx.textAlign = 'right'; ctx.fillText(tr('Old Testament'), Math.min(ntx - 6, W - 6), capY); }
    if (ntx < W - 90) { ctx.textAlign = 'left'; ctx.fillText(tr('New Testament'), Math.max(ntx + 6, 6), capY); }
    ctx.textAlign = 'center';
  }

  function strokePair(ctx, a, b, color, width, alpha = 1) {
    const p = new Path2D();
    if (!arcBetween(p, a, b)) { ctx.fillStyle = color; ctx.fillRect(sx(POS[a] + 0.5) - 1.5, view.ty - 3, 3, 3); return; }
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.stroke(p);
    ctx.globalAlpha = 1;
  }
  function highlightPair(ctx, a, b) {
    strokePair(ctx, a, b, pal.halo, 6, 0.6);
    strokePair(ctx, a, b, pal.sel, 2.5);
    for (const x of [sx(POS[a] + 0.5), sx(POS[b] + 0.5)]) {
      ctx.beginPath(); ctx.arc(x, view.ty, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pal.marker; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = pal.halo; ctx.stroke();
    }
  }

  function paintOverlay() {
    const ctx = octx, { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!N) return;
    if (state.focus && state.mode === 'explore') {
      let a = Math.min(0.95, Math.max(0.35, 60 / Math.sqrt(focusList.length + 1)));
      if (highContrast) a = Math.min(1, a * 1.4);
      const paths = new Map();
      for (const i of focusList) {
        const c = colorOf(i);
        if (!paths.has(c)) paths.set(c, new Path2D());
        arcPath(paths.get(c), i);
      }
      ctx.globalAlpha = a; ctx.lineWidth = highContrast ? 2 : 1.4;
      for (const [c, p] of paths) { ctx.strokeStyle = c; ctx.stroke(p); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.focus;
      if (state.focus.verses) {
        for (const v of state.focus.verses) { const x = sx(POS[v] + 0.5); if (x >= 0 && x <= W) ctx.fillRect(x - 0.75, view.ty - 6, 1.5, 6); }
      } else {
        const x0 = sx(POS[state.focus.start]), x1 = x0 + (state.focus.end - state.focus.start) * view.k;
        ctx.fillRect(x0, view.ty - 1, Math.max(2, x1 - x0), 3);
      }
    }
    if (state.mode === 'journey') { const s = currentStep(); if (s) highlightPair(ctx, s.ia, s.ib); }
    if (state.hover >= 0 && state.hover !== state.selected) strokePair(ctx, F[state.hover], T[state.hover], pal.sel, 1.6, 0.75);
    if (state.selected >= 0) highlightPair(ctx, F[state.selected], T[state.selected]);
    if (state.mode === 'plan' && state.plan) {
      const plan = PLANS.find(x => x.id === state.plan.id);
      for (const it of planDays(plan)[state.plan.day].items) highlightPair(ctx, it.a, it.b);
    }
    if (state.mode === 'game' && state.game && state.game.answered !== null) highlightPair(ctx, F[state.game.i], T[state.game.i]);
    if (state.mode === 'path' && state.path && state.path.edges) {
      const edges = state.path.edges.slice(0, state.path.shown);
      edges.forEach(e => highlightPair(ctx, e.a, e.b));
      ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const nodes = [state.path.edges[0]?.a, ...edges.map(e => e.b)].filter(v => v !== undefined);
      nodes.forEach((v, n) => {
        const x = sx(POS[v] + 0.5), y = view.ty - 16;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = pal.marker; ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillText(String(n + 1), x, y + 0.5);
      });
    }
    if (state.hoverChapter >= 0) {
      const ch = chapters[state.hoverChapter];
      ctx.fillStyle = pal.hoverCh;
      ctx.fillRect(sx(POS[ch.start]), view.ty, Math.max(2, ch.count * view.k), BAR_MAX + 6);
    }
  }

  // ---------- Hit testing ----------
  function hitTest(px, py, tol) {
    if (!N) return -1;
    if (py > view.ty + 2) return -1;
    const pool = state.focus ? focusList : filtered;
    let best = -1, bestD = tol;
    for (const i of pool) {
      const a = POS[F[i]] + 0.5, b = POS[T[i]] + 0.5;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const r = (hi - lo) / 2 * view.k;
      const cx = view.tx + (lo + hi) / 2 * view.k;
      if (px < cx - r - tol || px > cx + r + tol) continue;
      const d = Math.abs(Math.hypot(px - cx, py - view.ty) - r);
      if (d < bestD || (d === bestD && best >= 0 && V[i] > V[best])) { bestD = d; best = i; }
    }
    return best;
  }
  function chapterAt(px, py) {
    if (!N) return -1;   // data still loading
    if (py < view.ty || py > view.ty + BAR_MAX + 30) return -1;
    const x = Math.floor((px - view.tx) / view.k);
    if (x < 0 || x >= TOTAL) return -1;
    return CHAP_OF[INV[x]];
  }

  // ---------- Pointer & keyboard ----------
  const pointers = new Map();
  let drag = null, pinch = null;
  const localPoint = (e) => { const r = el.viz.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  el.viz.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tips')) return;   // let the tips card handle its own clicks
    el.viz.setPointerCapture(e.pointerId);
    const [x, y] = localPoint(e);
    pointers.set(e.pointerId, { x, y });
    if (pointers.size === 1) drag = { x, y, tx: view.tx, ty: view.ty, moved: false, type: e.pointerType };
    else if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), k: view.k, tx: view.tx, ty: view.ty, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
      drag = null;
    }
  });
  el.viz.addEventListener('pointermove', (e) => {
    const [x, y] = localPoint(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x, y });
    if (pinch && pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const k = Math.min(80, Math.max(view.fitK, pinch.k * d / pinch.d));
      const f = k / pinch.k;
      view.k = k;
      view.tx = mx - (pinch.mx - pinch.tx) * f;
      view.ty = my - (pinch.my - pinch.ty) * f;
      clampView(); drawBase();
      return;
    }
    if (drag) {
      const dx = x - drag.x, dy = y - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; el.viz.classList.add('dragging'); hideTooltip(); }
      if (drag.moved) { view.tx = drag.tx + dx; view.ty = drag.ty + dy; clampView(); drawBase(); }
      return;
    }
    if (e.pointerType === 'mouse') hover(x, y);
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const [x, y] = localPoint(e);
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
    if (drag && !drag.moved && e.type === 'pointerup') click(x, y, drag.type === 'mouse' ? 6 : 14);
    drag = null;
    el.viz.classList.remove('dragging');
  }
  el.viz.addEventListener('pointerup', endPointer);
  el.viz.addEventListener('pointercancel', endPointer);
  el.viz.addEventListener('pointerleave', () => { if (!drag) { state.hover = -1; state.hoverChapter = -1; hideTooltip(); drawOverlay(); } });

  el.viz.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = localPoint(e);
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) { view.tx -= e.deltaX; clampView(); drawBase(); return; }
    const scale = e.deltaMode === 1 ? 0.05 : 0.0018;
    zoomAt(x, y, Math.exp(-e.deltaY * scale * (e.ctrlKey ? 4 : 1)));
  }, { passive: false });

  let hoverRaf = 0;
  function hover(x, y) {
    cancelAnimationFrame(hoverRaf);
    hoverRaf = requestAnimationFrame(() => {
      const ch = chapterAt(x, y);
      const h = ch >= 0 ? -1 : hitTest(x, y, 6);
      if (h !== state.hover || ch !== state.hoverChapter) { state.hover = h; state.hoverChapter = ch; drawOverlay(); }
      if (h >= 0) showTooltip(x, y, `${refLabel(F[h])} ↔ ${refLabel(T[h], E[h])}${hasNote[h] ? ' · has a note' : ''}`);
      else if (ch >= 0) { const c = chapters[ch]; showTooltip(x, y, `${BOOKS[c.book].name} ${c.chapter} (${c.count} verses)`); }
      else hideTooltip();
    });
  }
  function showTooltip(x, y, text) {
    el.tooltip.textContent = text;
    el.tooltip.hidden = false;
    const w = el.tooltip.offsetWidth;
    el.tooltip.style.left = Math.min(view.W - w / 2 - 4, Math.max(w / 2 + 4, x)) + 'px';
    el.tooltip.style.top = Math.max(40, y) + 'px';
  }
  function hideTooltip() { el.tooltip.hidden = true; }

  function click(x, y, tol) {
    const ch = chapterAt(x, y);
    if (ch >= 0) {
      const c = chapters[ch];
      setFocus({ kind: 'chapter', book: c.book, chapter: c.chapter, start: c.start, end: c.start + c.count });
      return;
    }
    const i = hitTest(x, y, tol);
    if (i >= 0) selectRef(i);
    else if (state.selected >= 0) { state.selected = -1; drawBase(); renderPanel(); syncURL(true); }
  }

  el.viz.addEventListener('keydown', (e) => {
    const step = view.W * 0.12;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft': view.tx += step; clampView(); drawBase(); break;
      case 'ArrowRight': view.tx -= step; clampView(); drawBase(); break;
      case 'ArrowUp': view.ty += step; clampView(); drawBase(); break;
      case 'ArrowDown': view.ty -= step; clampView(); drawBase(); break;
      case '+': case '=': zoomAt(view.W / 2, view.ty, 1.5); break;
      case '-': case '_': zoomAt(view.W / 2, view.ty, 1 / 1.5); break;
      case '0': resetView(); break;
      case 'n': case 'N': case ']': if (state.mode === 'journey') goStep(1); else stepSelection(1); break;
      case 'p': case 'P': case '[': if (state.mode === 'journey') goStep(-1); else stepSelection(-1); break;
      case 'Escape': clearAll(); break;
      case 'd': case 'D': describeAloud(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  let topCache = null;
  function topList() {
    if (!topCache) topCache = Int32Array.from(filtered).sort((a, b) => V[b] - V[a]);
    return topCache;
  }
  const currentList = () => (state.focus ? focusList : topList());
  function stepSelection(dir) {
    const list = currentList();
    if (!list.length) return;
    let idx = list.indexOf(state.selected);
    idx = idx < 0 ? (dir > 0 ? 0 : list.length - 1) : (idx + dir + list.length) % list.length;
    selectRef(list[idx]);
  }

  $('zoomIn').addEventListener('click', () => zoomAt(view.W / 2, view.ty, 1.6));
  $('zoomOut').addEventListener('click', () => zoomAt(view.W / 2, view.ty, 1 / 1.6));
  $('zoomReset').addEventListener('click', () => resetView());
  window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 80); });

  // ---------- Selection ----------
  function announce(msg) { el.announcer.textContent = ''; setTimeout(() => { el.announcer.textContent = msg; }, 30); }

  function selectRef(i, opts = {}) {
    state.mode = 'explore'; state.journey = null; updateNav();
    state.selected = i;
    drawBase(); renderPanel(); syncURL(true);
    announce(`${refLabel(F[i])} connects to ${refLabel(T[i], E[i])}, ${V[i]} votes.${hasNote[i] ? ' Has a note.' : ''}`);
    if (opts.zoom) zoomToRef(i);
  }
  function setFocus(range, opts = {}) {
    state.mode = 'explore'; state.journey = null; updateNav();
    state.focus = range;
    state.selected = -1;
    computeFocus();
    drawBase(); renderPanel(); syncURL(true);
    announce(`${rangeLabel(range)}: ${focusList.length.toLocaleString()} connections.`);
    if (opts.zoom) {
      if (range.kind === 'words') resetView();
      else zoomToRange(range.start, range.end, range.kind === 'verse' ? 40 : 0.6);
    }
  }
  function clearAll() {
    state.focus = null; state.selected = -1; focusList = new Int32Array(0);
    if (state.mode === 'journey') { state.mode = 'journeys'; state.journey = null; }
    drawBase(); renderPanel(); syncURL(true);
    announce('Selection cleared.');
  }

  // ---------- Panel ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const ext = (href, html, cls = 'btn ghost small') =>
    `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${html}<span class="sr-only"> (opens Bible.com in a new tab)</span> <span aria-hidden="true">↗</span></a>`;

  function refCard(start, end, color) {
    return `<div class="verse-card" style="--c:${color}">
      <p class="ref">${esc(refLabel(start, end))}</p>
      <div class="actions tight">
        ${ext(bibleUrl(start, end), `Read in ${esc(vLabel(settings.version))}<span class="sr-only">: ${esc(refLabel(start, end))}</span>`, 'btn small')}
        ${ext(bibleUrl(start, start, true), `Whole chapter<span class="sr-only">: ${esc(BOOKS[verseBook[start]].name)} ${verseChap[start]}</span>`)}
        ${listenBtn(start)}
      </div>
      ${second() ? `<div class="actions tight compare-row">
        ${ext(bibleUrl(start, end, false, second()), `Read in ${esc(vLabel(second()))}<span class="sr-only">: ${esc(refLabel(start, end))}</span>`, 'btn ghost small')}
        ${ext(bibleUrl(start, start, true, second()), `Whole chapter in ${esc(vLabel(second()))}<span class="sr-only">: ${esc(BOOKS[verseBook[start]].name)} ${verseChap[start]}</span>`)}
        ${listenBtn(start, second())}` : ''}
      </div></div>`;
  }
  // small "Read" links for lists, plus the comparison translation when one is chosen
  // "Listen" opens the chapter in Bible.com's audio Bible, for translations that have one
  const HEADPHONES = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5.5A1.5 1.5 0 0 1 4 18.5zM20 14h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>';
  function audioUrl(start, ver = settings.version) {
    if (VERSIONS[ver].nt && verseBook[start] < 39) ver = 'NIV';
    const V0 = VERSIONS[ver];
    if (!V0.audio) return '';
    return `https://www.bible.com/audio-bible/${V0.id}/${BOOKS[verseBook[start]].usfm}.${verseChap[start]}.${V0.code || ver}`;
  }
  const listenBtn = (start, ver = settings.version) => {
    const u = audioUrl(start, ver);
    if (!u) return '';
    const label = `Listen to ${BOOKS[verseBook[start]].name} ${verseChap[start]} in ${vLabel(ver)}`;
    return `<a class="btn ghost small listen" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(label)}">${HEADPHONES}<span class="sr-only">${esc(label)} (opens Bible.com in a new tab)</span></a>`;
  };
  const miniRead = (v) => ext(bibleUrl(v), `Read<span class="sr-only"> ${esc(refLabel(v))} in ${esc(vLabel(settings.version))}</span>`, 'mini-link')
    + (second() ? ` ${ext(bibleUrl(v, v, false, second()), `${esc(vLabel(second()))}<span class="sr-only">: ${esc(refLabel(v))}</span>`, 'mini-link')}` : '');
  const readBoth = (v, text) => ext(bibleUrl(v), `${text} in ${esc(vLabel(settings.version))}`)
    + (second() ? ext(bibleUrl(v, v, false, second()), `${text} in ${esc(vLabel(second()))}`) : '');
  const noteHTML = (n) => `<div class="note"><p class="note-head"><span class="tag">${esc(n.type)}</span> Why it connects</p><p${LANG !== 'en' ? ' lang="en"' : ''}>${esc(n.text)}</p>${LANG !== 'en' ? '<p class="hint">Note available in English only.</p>' : ''}</div>`;

  function connItem(i, otherSide) {
    const cur = i === state.selected ? ' aria-current="true"' : '';
    const label = otherSide ? otherSideLabel(i) : `${refLabel(F[i])} ↔ ${refLabel(T[i], E[i])}`;
    const note = hasNote[i] ? '<span class="note-dot">note</span>' : '';
    return `<li><button type="button" class="conn-item" data-ref="${i}"${cur}>
      <span class="dot" style="background:${colorOf(i)}" aria-hidden="true"></span>
      <span class="label">${esc(label)}</span>${note}<span class="votes">${V[i]} votes</span></button></li>`;
  }
  function otherSideLabel(i) {
    const f = state.focus;
    if (f.mask) return `${refLabel(F[i])} ↔ ${refLabel(T[i], E[i])}`;
    const single = f.kind === 'verse' && f.end - f.start === 1;
    const fromIn = F[i] >= f.start && F[i] < f.end;
    const toIn = T[i] < f.end && E[i] >= f.start;
    if (fromIn && toIn) return `${refLabel(F[i])} ↔ ${refLabel(T[i], E[i])}`;
    if (fromIn) return single ? refLabel(T[i], E[i]) : `${refLabel(F[i])} → ${refLabel(T[i], E[i])}`;
    return single ? refLabel(F[i]) : `${refLabel(F[i])} → ${refLabel(T[i], E[i])}`;
  }
  function listHTML(list, otherSide) {
    if (!list.length) return '<p class="muted">No connections match the current filters. Try lowering the minimum strength.</p>';
    const shown = Math.min(listShown, list.length);
    let html = `<ul class="conn-list" aria-label="Connections, strongest first">`;
    for (let n = 0; n < shown; n++) html += connItem(list[n], otherSide);
    html += '</ul>';
    if (shown < list.length) html += `<div class="actions"><button type="button" class="btn ghost small" data-action="more">Show more (${(list.length - shown).toLocaleString()} left)</button></div>`;
    return html;
  }
  const shareButtons = () => {
    const saved = isSaved();
    return `<button type="button" class="btn ghost small" data-action="save" aria-pressed="${saved}">${saved ? '★ Saved' : '☆ Save'}</button>
      <button type="button" class="btn ghost small" data-action="share">${navigator.share ? 'Share' : 'Copy link'}</button>
      <button type="button" class="btn ghost small" data-action="copy">Copy references</button>
      <button type="button" class="btn ghost small" data-action="image">Save image</button>
      <button type="button" class="btn ghost small" data-action="addToCollection">Add to collection</button>
      ${state.selected >= 0 && state.mode === 'explore' ? '<button type="button" class="btn ghost small" data-action="story">Story image</button>' : ''}
      <button type="button" class="btn ghost small" data-action="qr">QR code</button>
      <button type="button" class="btn ghost small" data-action="embed">Embed</button>`;
  };

  function renderPanel() {
    let title = 'Explore', html = '';
    const theme = THEMES.find(t => t.id === state.theme);
    const i = state.selected;

    if (state.mode === 'journeys') [title, html] = journeysHTML();
    else if (state.mode === 'journey') [title, html] = journeyStepHTML();
    else if (state.mode === 'insights') [title, html] = insightsHTML();
    else if (state.mode === 'series') [title, html] = seriesHTML();
    else if (state.mode === 'path') [title, html] = pathHTML();
    else if (state.mode === 'study') [title, html] = studyHTML();
    else if (state.mode === 'plans') [title, html] = plansHTML();
    else if (state.mode === 'plan' && state.plan) [title, html] = planHTML();
    else if (state.mode === 'people') [title, html] = peopleHTML();
    else if (state.mode === 'topics') [title, html] = topicsHTML();
    else if (state.mode === 'game') [title, html] = gameHTML();
    else if (state.mode === 'wordstudy') [title, html] = wordStudyHTML();
    else if (state.mode === 'notes') [title, html] = notesHTML();
    else if (state.mode === 'places') [title, html] = placesHTML();
    else if (state.mode === 'shared') [title, html] = sharedHTML();
    else if (state.mode === 'collections') [title, html] = collectionsHTML();
    else if (state.mode === 'collection' && state.collection) [title, html] = collectionHTML();
    else if (i >= 0) {
      title = 'Connection';
      const color = colorOf(i);
      html += refCard(F[i], F[i], color) + `<p class="link-arrow" aria-hidden="true">connects to</p>` + refCard(T[i], E[i], color);
      const n = noteMap.get(i);
      if (n) html += noteHTML(n);
      else html += `<p class="hint">No note yet for this connection. <a href="${esc(suggestUrl(i))}" target="_blank" rel="noopener" data-track="suggest">Suggest a note<span class="sr-only"> (opens GitHub in a new tab)</span></a></p>`;
      html += `<p class="muted">Strength: ${V[i]} votes on OpenBible.info</p>
        <div class="actions"><button type="button" class="btn small" data-action="zoomRef">Zoom to this arc</button>${shareButtons()}</div>
        <div class="actions">
          <button type="button" class="btn ghost small" data-action="focusVerse" data-v="${F[i]}">All links for ${esc(refLabel(F[i]))}</button>
          <button type="button" class="btn ghost small" data-action="focusVerse" data-v="${T[i]}">All links for ${esc(refLabel(T[i]))}</button>
        </div>
        <div class="actions"><button type="button" class="btn ghost small" data-action="deselect">${state.focus ? 'Back to ' + esc(rangeLabel(state.focus)) : 'Close'}</button></div>`;
    } else if (state.focus) {
      const f = state.focus;
      title = rangeLabel(f);
      if (f.kind === 'words') {
        if (f.entity && f.entity.type === 'word') {
          const w = f.entity.word, heb = f.entity.id[0] === 'H';
          html += `<p class="lemma" lang="${heb ? 'he' : 'el'}"${heb ? ' dir="rtl"' : ''}>${esc(w.l)}</p>
            <p><strong>${esc(w.t)}</strong> · ${esc(w.g)} · <span class="muted">${heb ? 'Hebrew' : 'Greek'} ${esc(f.entity.id)}</span></p>
            ${w.d ? `<p class="hint" lang="en">${esc(w.d)}</p>` : ''}
            ${w.v ? `<p>Used in ${w.n.toLocaleString()} verses, touching ${focusList.length.toLocaleString()} connections.</p>` : `<p>This word appears in ${w.n.toLocaleString()} verses, too many to show on the map.</p>`}
            <div id="wordDetail" data-code="${esc(f.entity.id)}"><p class="muted">Loading the full word study…</p></div>
            <p class="hint">Hebrew and Greek data from <a href="https://www.stepbible.org" rel="noopener">STEP Bible</a>, licensed CC BY 4.0. Dictionary entries are from Brown-Driver-Briggs and Abbott-Smith (public domain).</p>`;
        } else if (f.entity && f.entity.type === 'geo') {
          const P0 = f.entity.place;
          html += `<canvas class="places-map mini" id="geoMini" data-i="${P0.i}" role="img" aria-label="Map showing ${esc(P0.label)}"></canvas>
            <p>${esc(P0.label)} <span class="muted">(${esc(P0.type)})</span> is mentioned in ${f.verses.length.toLocaleString()} verse${f.verses.length === 1 ? '' : 's'}, touching ${focusList.length.toLocaleString()} connections. ${confText(P0.conf)}</p>
            <p class="hint">Location from <a href="https://www.openbible.info/geo/" rel="noopener">OpenBible.info</a> (CC BY 4.0).</p>`;
        } else if (f.entity) html += `${f.entity.description ? `<p>${esc(f.entity.description)}</p>` : ''}<p>Found in ${f.verses.length.toLocaleString()} verses, touching ${focusList.length.toLocaleString()} connections.</p>`;
        else html += `<p>${f.verses.length.toLocaleString()} verse${f.verses.length === 1 ? ' contains' : 's contain'} ${esc(rangeLabel(f))}, touching ${focusList.length.toLocaleString()} connections.</p>`;
        html += `
          ${f.entity && f.entity.type === 'word' ? '' : '<p class="hint">Word search uses the wording of the Berean Standard Bible, so results may differ slightly from other translations.</p>'}
          <div class="actions">${shareButtons()}<button type="button" class="btn ghost small" data-action="clear">Clear</button></div>
          <h3>Verses</h3><ul class="verse-list">`;
        const vs = Math.min(versesShown, f.verses.length);
        for (let n = 0; n < vs; n++) {
          const v = f.verses[n];
          html += `<li><button type="button" class="link-btn" data-action="focusVerse" data-v="${v}">${esc(refLabel(v))}</button> ${miniRead(v)}</li>`;
        }
        html += '</ul>';
        if (vs < f.verses.length) html += `<div class="actions"><button type="button" class="btn ghost small" data-action="moreVerses">Show more verses (${(f.verses.length - vs).toLocaleString()} left)</button></div>`;
        html += `<h3>Connections</h3>` + listHTML(focusList, true);
      } else {
        const single = f.kind === 'verse' && f.end - f.start === 1;
        if (f.kind === 'verse') html += refCard(f.start, f.end - 1, pal.focus);
        else {
          const label = f.kind === 'book' ? `${BOOKS[f.book].name} 1` : rangeLabel(f);
          html += `<div class="actions">${ext(bibleUrl(f.start, f.start, true), `Read ${esc(label)} in ${esc(vLabel(settings.version))}`, 'btn small')}${listenBtn(f.start)}${second() ? ext(bibleUrl(f.start, f.start, true, second()), `Read ${esc(label)} in ${esc(vLabel(second()))}`, 'btn ghost small') + listenBtn(f.start, second()) : ''}</div>`;
        }
        html += `<p>${focusList.length.toLocaleString()} connection${focusList.length === 1 ? '' : 's'} with the current filters.</p>
          <p class="summary">${esc(describeView())}</p>
          <div class="actions"><button type="button" class="btn ghost small" data-action="zoomFocus">Zoom to ${esc(rangeLabel(f))}</button>`;
        if (f.kind !== 'book') html += `<button type="button" class="btn ghost small" data-action="focusBook" data-b="${f.book}">Whole book</button>`;
        html += `${shareButtons()}<button type="button" class="btn ghost small" data-action="clear">Clear</button></div>`;
        if (single) html += passageStudyHTML(f.start);
        else html += `<h3>Connections</h3>` + listHTML(focusList, true);
      }
    } else {
      if (theme) {
        title = theme.name;
        html += `<p>${esc(theme.description)}</p><h3>Key verses</h3><ul class="chip-list">`;
        for (const o of theme.verses) {
          const v = osisToIndex(o);
          if (v >= 0) html += `<li><button type="button" class="chip" data-action="focusVerse" data-v="${v}">${esc(refLabel(v))}</button></li>`;
        }
        html += '</ul>';
      } else {
        html += `<p>Each arc joins two passages that point to each other. Tap or click an arc to see the connection and read it on Bible.com. Tap a bar along the bottom to see a chapter’s connections.</p>
          <p class="muted">Try <button type="button" class="chip" data-action="search" data-q="John 3:16">John 3:16</button> <button type="button" class="chip" data-action="search" data-q="Isaiah 53">Isaiah 53</button> <button type="button" class="chip" data-action="search" data-q="shepherd">shepherd</button>
          or take a <button type="button" class="chip" data-action="mode" data-mode="journeys">guided journey</button></p>`;
      }
      html += savedRecentHTML();
      html += `<h3>Strongest connections</h3>` + listHTML(topList(), false);
    }
    el.panelTitle.textContent = title;
    el.panelBody.innerHTML = html;
    renderContext();
    fillStudy();
  }

  // ---------- Journeys ----------
  let journeySteps = [];
  function prepareJourneys() {
    journeySteps = (window.JOURNEYS || []).map(j => j.steps.map(s => ({ ...s, ia: osisToIndex(s.a), ib: osisToIndex(s.b) })).filter(s => s.ia >= 0 && s.ib >= 0));
  }
  const currentStep = () => (state.journey ? journeySteps[state.journey.j]?.[state.journey.step] : null);
  function journeysHTML() {
    const card = (j, n) => `<li class="journey-card"><h3>${esc(j.name)}</h3><p>${esc(j.summary)}</p>
        <div class="actions tight">
          <button type="button" class="btn small" data-action="startJourney" data-j="${n}">Start<span class="sr-only"> ${esc(j.name)}</span> (${journeySteps[n].length} steps)</button>
          <button type="button" class="btn ghost small" data-action="presentJourney" data-j="${n}">Present<span class="sr-only"> ${esc(j.name)}</span></button>
          <a class="btn ghost small" href="handout.html?journey=${esc(j.id)}${LANG !== 'en' ? '&lang=' + LANG : ''}" target="_blank" rel="noopener">Handout<span class="sr-only"> for ${esc(j.name)} (opens in a new tab)</span></a>
        </div></li>`;
    const all = JOURNEYS.map((j, n) => [j, n]);
    const kids = all.filter(([j]) => j.kids), grown = all.filter(([j]) => !j.kids);
    const groups = settings.kids ? [['For kids', kids], ['More journeys', grown]] : [['Journeys', grown], ['For kids', kids]];
    let html = '<p>Short guided tours through the story of Scripture. Each step lights up one connection and explains it.</p>';
    for (const [label, list] of groups) if (list.length) html += `<h3>${label}</h3><ul class="journey-list">${list.map(([j, n]) => card(j, n)).join('')}</ul>`;
    html += '<div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="explore">Back to explore</button></div>';
    return ['Guided journeys', html];
  }
  function journeyStepHTML() {
    const { j, step } = state.journey;
    const J = JOURNEYS[j], steps = journeySteps[j], s = steps[step];
    let html = `<p class="step-count">${esc(J.name)} · Step ${step + 1} of ${steps.length}</p>
      <div class="progress" aria-hidden="true"><span style="width:${((step + 1) / steps.length) * 100}%"></span></div>
      <h3 class="step-title">${esc(s.title)}</h3><p class="step-note">${esc(s.note)}</p>
      ${s.question ? `<div class="question"><p class="note-head">Talk about it</p><p>${esc(s.question)}</p></div>` : ''}`;
    html += refCard(s.ia, s.ia, pal.marker) + `<p class="link-arrow" aria-hidden="true">connects to</p>` + refCard(s.ib, s.ib, pal.marker);
    html += `<div class="actions nav-row">
      <button type="button" class="btn ghost" data-action="stepPrev" ${step === 0 ? 'disabled' : ''}>Previous</button>
      ${step < steps.length - 1 ? '<button type="button" class="btn" data-action="stepNext">Next step</button>' : '<button type="button" class="btn" data-action="mode" data-mode="journeys">Finish</button>'}
    </div><div class="actions">
      <button type="button" class="btn ghost small" data-action="present">Present</button>
      <a class="btn ghost small" href="handout.html?journey=${esc(J.id)}${LANG !== 'en' ? '&lang=' + LANG : ''}" target="_blank" rel="noopener">Printable handout<span class="sr-only"> (opens in a new tab)</span></a>
      ${shareButtons()}<button type="button" class="btn ghost small" data-action="mode" data-mode="journeys">All journeys</button></div>`;
    return [J.name, html];
  }
  function startJourney(j, step = 0) {
    track('journey/' + JOURNEYS[j].id, JOURNEYS[j].name);
    state.mode = 'journey'; state.journey = { j, step }; state.selected = -1; state.focus = null;
    updateNav(); showStep();
  }
  function goStep(d) {
    const n = state.journey.step + d;
    if (n < 0 || n >= journeySteps[state.journey.j].length) return;
    state.journey.step = n;
    showStep();
  }
  function showStep() {
    const s = currentStep();
    drawBase(); renderPanel(); renderPresenter(); syncURL(true);
    zoomToPair(s.ia, s.ib);
    announce(`Step ${state.journey.step + 1}: ${s.title}. ${refLabel(s.ia)} connects to ${refLabel(s.ib)}.`);
  }

  // ---------- Presenter mode ----------
  const presenter = $('presenter');
  function enterPresenter() {
    if (state.mode !== 'journey') return;
    document.body.classList.add('presenting');
    presenter.hidden = false;
    document.documentElement.requestFullscreen?.().catch(() => { /* fullscreen not allowed */ });
    presenterContrastWas = settings.contrast; settings.contrast = true; applyAppearance();
    requestAnimationFrame(() => { resize(); renderPresenter(); const st = currentStep(); zoomToPair(st.ia, st.ib); $('presNext').focus({ preventScroll: true }); presenter.scrollTop = 0; });
  }
  let presenterContrastWas = false;
  function exitPresenter() {
    if (presenter.hidden) return;
    document.body.classList.remove('presenting');
    presenter.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    settings.contrast = presenterContrastWas; applyAppearance();
    requestAnimationFrame(() => { resize(); const st = currentStep(); if (st) zoomToPair(st.ia, st.ib); focusPanelHeading(); });
  }
  function renderPresenter() {
    if (presenter.hidden || state.mode !== 'journey') return;
    const { j, step } = state.journey, J = JOURNEYS[j], steps = journeySteps[j], st = steps[step];
    $('presMeta').textContent = `${J.name} · Step ${step + 1} of ${steps.length}`;
    $('presTitle').textContent = st.title;
    $('presRefs').textContent = `${refLabel(st.ia)}  ↔  ${refLabel(st.ib)}`;
    $('presNote').textContent = st.note;
    $('presQuestion').textContent = st.question || '';
    $('presQuestion').hidden = !st.question;
    $('presPrev').disabled = step === 0;
    $('presNext').textContent = step < steps.length - 1 ? 'Next' : 'Finish';
  }
  $('presPrev').addEventListener('click', () => goStep(-1));
  $('presNext').addEventListener('click', () => {
    if (state.journey.step < journeySteps[state.journey.j].length - 1) goStep(1);
    else { exitPresenter(); setMode('journeys'); }
  });
  $('presExit').addEventListener('click', exitPresenter);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !presenter.hidden) exitPresenter(); });
  document.addEventListener('keydown', (e) => {
    if (presenter.hidden) return;
    // works with presentation clickers, which send arrow, page or space keys
    if (['ArrowRight', 'PageDown'].includes(e.key) || ([' ', 'Enter'].includes(e.key) && !e.target.closest('button'))) { e.preventDefault(); $('presNext').click(); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); goStep(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); exitPresenter(); }
  });

  // ---------- Sermon series ----------
  function seriesHTML() {
    const S = window.SERIES || {};
    let html = `<p>${esc(S.description || '')}</p><ol class="series-list">`;
    for (const p of S.passages || []) {
      const r = parseReference(p.ref);
      if (!r || r.error) continue;
      html += `<li><p class="series-title">${esc(p.title || '')}</p>
        <div class="actions tight"><button type="button" class="btn small" data-action="focusRef" data-q="${esc(p.ref)}">Explore ${esc(rangeLabel(r))}</button>
        ${ext(bibleUrl(r.start, r.kind === 'verse' ? r.end - 1 : r.start, r.kind !== 'verse'), `Read in ${esc(vLabel(settings.version))}<span class="sr-only">: ${esc(rangeLabel(r))}</span>`)}
        ${second() ? ext(bibleUrl(r.start, r.kind === 'verse' ? r.end - 1 : r.start, r.kind !== 'verse', second()), `Read in ${esc(vLabel(second()))}<span class="sr-only">: ${esc(rangeLabel(r))}</span>`) : ''}</div></li>`;
    }
    html += '</ol><div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="explore">Back to explore</button></div>';
    return [S.title || 'Series', html];
  }

  // ---------- First-time tips ----------
  function maybeShowTips() {
    if (EMBED || store.get('tipsSeen', false) || isLanding() || document.body.classList.contains('presenting')) return;
    $('tips').hidden = false;
  }
  $('tipsClose').addEventListener('click', () => { $('tips').hidden = true; store.set('tipsSeen', true); el.viz.focus(); });

  // ---------- How are these connected? (shortest chain of cross references) ----------
  let graph = null;
  function buildGraph() {
    // undirected adjacency in compressed form, strongest links first so ties favor well-supported chains
    const deg = new Uint32Array(TOTAL + 1);
    for (let i = 0; i < N; i++) { deg[F[i] + 1]++; deg[T[i] + 1]++; }
    for (let v = 0; v < TOTAL; v++) deg[v + 1] += deg[v];
    const nbr = new Uint16Array(deg[TOTAL]), via = new Int32Array(deg[TOTAL]), fill = deg.slice(0, TOTAL);
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => V[b] - V[a]);
    for (const i of order) {
      nbr[fill[F[i]]] = T[i]; via[fill[F[i]]++] = i;
      nbr[fill[T[i]]] = F[i]; via[fill[T[i]]++] = i;
    }
    graph = { start: deg, nbr, via };
  }
  function shortestChain(from, to, maxDepth = 8) {
    if (!graph) buildGraph();
    const prev = new Int32Array(TOTAL).fill(-2), prevEdge = new Int32Array(TOTAL).fill(-1);
    let frontier = [];
    for (let v = from.start; v < from.end; v++) { prev[v] = -1; frontier.push(v); }
    for (let v = from.start; v < from.end; v++) if (v >= to.start && v < to.end) return { edges: [], same: true };
    for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
      const next = [];
      for (const u of frontier) {
        for (let k = graph.start[u]; k < graph.start[u + 1]; k++) {
          const w = graph.nbr[k];
          if (prev[w] !== -2) continue;
          prev[w] = u; prevEdge[w] = graph.via[k];
          if (w >= to.start && w < to.end) {
            const edges = [];
            for (let x = w; prev[x] !== -1; x = prev[x]) edges.unshift({ a: prev[x], b: x, i: prevEdge[x] });
            return { edges };
          }
          next.push(w);
        }
      }
      frontier = next;
    }
    return { edges: null };
  }
  function findPath(fromText, toText, { push = true } = {}) {
    const a = parseReference(fromText), b = parseReference(toText);
    state.mode = 'path'; state.selected = -1; state.focus = null; state.journey = null;
    state.path = { fromText, toText, error: '' };
    if (push) track('connect', `${fromText} to ${toText}`);
    if (!a || a.error || !b || b.error) {
      state.path.error = (a && a.error) || (b && b.error) || 'Enter two references, for example Genesis 3:15 and Revelation 12:9.';
    } else {
      const res = shortestChain(a, b);
      Object.assign(state.path, { fromLabel: rangeLabel(a), toLabel: rangeLabel(b), edges: res.edges, same: res.same, shown: 0 });
    }
    updateNav(); drawBase(); renderPanel(); syncURL(push);
    const P = state.path;
    if (P.edges && P.edges.length) {
      spanOfPairs(P.edges.map(e => [e.a, e.b]));
      animatePath();
      announce(`Found a chain of ${P.edges.length} link${P.edges.length === 1 ? '' : 's'} from ${P.fromLabel} to ${P.toLabel}.`);
    } else if (P.error) announce(P.error);
    else announce(`No chain found between ${P.fromLabel} and ${P.toLabel}.`);
  }
  let pathTimer = 0;
  function animatePath() {
    clearInterval(pathTimer);
    const P = state.path;
    if (!P || !P.edges) return;
    if (reducedMotion) { P.shown = P.edges.length; drawOverlay(); return; }
    P.shown = 0; drawOverlay();
    pathTimer = setInterval(() => {
      if (state.mode !== 'path' || state.path !== P) { clearInterval(pathTimer); return; }
      P.shown++; drawOverlay();
      if (P.shown >= P.edges.length) clearInterval(pathTimer);
    }, 650);
  }
  function pathHTML() {
    const P = state.path || {};
    let html = `<p>Pick any two passages and see the shortest chain of cross references that links them.</p>
      <form class="path-form" id="pathForm">
        <div class="field"><label for="pathFrom">From</label><input id="pathFrom" type="search" list="bookList" value="${esc(P.fromText || '')}" placeholder="e.g. Genesis 3:15" autocomplete="off"></div>
        <div class="field"><label for="pathTo">To</label><input id="pathTo" type="search" list="bookList" value="${esc(P.toText || '')}" placeholder="e.g. Revelation 12:9" autocomplete="off"></div>
        <button type="submit" class="btn">Find the link</button>
      </form>
      <p class="hint">Try <button type="button" class="chip" data-action="pathExample" data-a="Genesis 3:15" data-b="Revelation 12:9">Genesis 3:15 to Revelation 12:9</button>
      <button type="button" class="chip" data-action="pathExample" data-a="Exodus 12" data-b="John 1:29">Exodus 12 to John 1:29</button></p>`;
    if (P.error) html += `<p class="field-error" role="alert">${esc(P.error)}</p>`;
    else if (P.same) html += `<p>Those passages overlap, so they are already connected.</p>`;
    else if (P.edges === null) html += `<p>No chain of 8 links or fewer was found between ${esc(P.fromLabel)} and ${esc(P.toLabel)}. Try a nearby verse or a whole chapter.</p>`;
    else if (P.edges) {
      html += `<h3>${P.edges.length} link${P.edges.length === 1 ? '' : 's'} from ${esc(P.fromLabel)} to ${esc(P.toLabel)}</h3><ol class="chain">`;
      html += `<li><span class="chain-num" aria-hidden="true">1</span><div><p class="ref">${esc(refLabel(P.edges[0].a))}</p>${miniRead(P.edges[0].a)}</div></li>`;
      P.edges.forEach((e, n) => {
        const note = noteMap.get(e.i);
        html += `<li><span class="chain-num" aria-hidden="true">${n + 2}</span><div><p class="ref">${esc(refLabel(e.b))} <span class="votes">${V[e.i]} votes</span></p>
          ${note ? `<p class="chain-note"${LANG !== 'en' ? ' lang="en"' : ''}>${esc(note.text)}</p>` : ''}
          ${miniRead(e.b)}</div></li>`;
      });
      html += `</ol><div class="actions"><button type="button" class="btn ghost small" data-action="replayPath">Play again</button>${shareButtons()}</div>`;
    }
    html += `<div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="explore">Back to explore</button></div>`;
    return ['How are these connected?', html];
  }
  el.panelBody.addEventListener('submit', (e) => {
    if (e.target.id !== 'pathForm') return;
    e.preventDefault();
    findPath($('pathFrom').value, $('pathTo').value);
    focusPanelHeading();
  });
  el.panelBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action=pathExample]');
    if (btn) { findPath(btn.dataset.a, btn.dataset.b); focusPanelHeading(); }
  });

  // ---------- Saved items and recently viewed (stored on this device only) ----------
  function currentEntry() {
    let label = '';
    if (state.mode === 'journey' && state.journey) label = `${JOURNEYS[state.journey.j].name}, step ${state.journey.step + 1}`;
    else if (state.mode === 'path' && state.path && state.path.edges) label = `${state.path.fromLabel} to ${state.path.toLabel}`;
    else if (state.mode === 'explore' && state.selected >= 0) label = `${refLabel(F[state.selected])} ↔ ${refLabel(T[state.selected], E[state.selected])}`;
    else if (state.mode === 'explore' && state.focus) label = rangeLabel(state.focus);
    else if (state.mode === 'explore' && state.theme) label = `Theme: ${THEMES.find(t => t.id === state.theme).name}`;
    return label ? { label, url: location.search } : null;
  }
  const isSaved = () => store.get('saved', []).some(x => x.url === location.search);
  function toggleSave() {
    const entry = currentEntry();
    if (!entry) return;
    let saved = store.get('saved', []);
    if (saved.some(x => x.url === entry.url)) { saved = saved.filter(x => x.url !== entry.url); announce('Removed from saved.'); }
    else { saved.unshift(entry); announce('Saved on this device.'); }
    store.set('saved', saved.slice(0, 50));
    renderPanel();
    el.panelBody.querySelector('[data-action=save]')?.focus();
  }
  function removeSaved(url) { store.set('saved', store.get('saved', []).filter(x => x.url !== url)); announce('Removed from saved.'); }
  function recordRecent() {
    const entry = currentEntry();
    if (!entry) return;
    const recent = store.get('recent', []).filter(x => x.url !== entry.url);
    recent.unshift(entry);
    store.set('recent', recent.slice(0, 10));
  }
  function savedRecentHTML() {
    const saved = store.get('saved', []), recent = store.get('recent', []);
    let html = '';
    if (saved.length) {
      html += `<h3>Saved</h3><ul class="mini-list">${saved.map(x => `<li><button type="button" class="link-btn" data-action="goto" data-url="${esc(x.url)}">${esc(x.label)}</button>
        <button type="button" class="ctx-x" data-action="unsave" data-url="${esc(x.url)}" aria-label="Remove ${esc(x.label)} from saved">✕</button></li>`).join('')}</ul>`;
    }
    if (recent.length) {
      html += `<h3>Recently viewed</h3><ul class="mini-list">${recent.slice(0, 6).map(x => `<li><button type="button" class="link-btn" data-action="goto" data-url="${esc(x.url)}">${esc(x.label)}</button></li>`).join('')}</ul>
        <div class="actions tight"><button type="button" class="btn ghost small" data-action="clearRecent">Clear recently viewed</button></div>`;
    }
    return html;
  }
  function renderLandingRecent() {
    const recent = store.get('recent', []).slice(0, 3), box = $('landingRecent');
    box.hidden = !recent.length;
    box.innerHTML = recent.length ? `<h3>Pick up where you left off</h3><ul class="chip-list">${recent.map(x => `<li><button type="button" class="chip" data-goto="${esc(x.url)}">${esc(x.label)}</button></li>`).join('')}</ul>` : '';
  }
  function goTo(url) {
    history.pushState(null, '', url || '?view=map');
    applyLocation();
    focusPanelHeading();
  }

  // ---------- Save an image of the current view ----------
  async function exportImage() {
    const W = view.W, H = view.H, foot = 64, scale = 2;
    const c = document.createElement('canvas');
    c.width = W * scale; c.height = (H + foot) * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H + foot);
    for (const src of [$('glCanvas'), el.base, el.overlay]) if (src && !src.hidden && src.width) ctx.drawImage(src, 0, 0, W, H);
    const items = contextItems().map(x => x[1]);
    const title = items.length ? items.map(tr).join(' · ') : tr('The whole Bible');
    ctx.fillStyle = pal.label; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(title.length > 110 ? title.slice(0, 107) + '…' : title, 14, H + 26);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = pal.sub;
    ctx.fillText(`Bible Connections · ${location.host}${location.pathname} · ${tr('Cross references: OpenBible.info (CC BY 4.0)')}`, 14, H + 48);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!blob) { announce('Sorry, the image could not be created.'); return; }
    const file = new File([blob], 'bible-connections.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file], title: 'Bible Connections' }); return; } catch { /* cancelled, fall back to download */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    announce('Image saved.'); flash('Image saved');
  }
  $('saveImage').addEventListener('click', exportImage);

  // ---------- Usage events (only when visit counting is on; no personal data) ----------
  function track(name, title) {
    try { window.goatcounter?.count?.({ path: `event/${name}`, title: title || name, event: true }); } catch { /* stats unavailable */ }
  }

  // ---------- Study hub ----------
  const STUDY_MODES = ['study', 'plans', 'plan', 'people', 'topics', 'game', 'insights', 'wordstudy', 'collections', 'collection'];
  const nameOf = (x) => (LANG === 'es' && x.name_es) || x.name;
  const descOf = (x) => (LANG === 'es' && x.description_es) || x.description;
  function studyHTML() {
    const cards = [
      ['plans', 'Reading plans', 'Follow the connections a few at a time, with your progress saved on this device.'],
      ['people', 'People and places', 'See where a person or place appears across the whole Bible.'],
      ['topics', 'Topics', 'Explore what Scripture says about worry, forgiveness, money, rest and more.'],
      ['wordstudy', 'Word study', 'Follow a Hebrew or Greek word, such as hesed or agape, through the Bible.'],
      ['notes', 'My notes', 'Your own notes on any verse, kept on this device. Export them to keep a copy.'],
      ['places', 'Places on a map', 'See where places named in the Bible were, and every verse that mentions them.'],
      ['shared', 'Shared connections', 'Pick two passages and find the passages they both link to.'],
      ['collections', 'Collections', 'Group connections and verses for a sermon or small group, and share them as one link.'],
      ['game', 'Guess the connection', 'A quick quiz for you or your small group.'],
      ['insights', 'Insights', 'The most connected verses and chapters, and links between categories.'],
    ];
    let html = '<ul class="study-list">';
    for (const [mode, title, text] of cards) {
      html += `<li><button type="button" class="study-card" data-action="mode" data-mode="${mode}"><strong>${title}</strong><span>${text}</span></button></li>`;
    }
    html += `<li><button type="button" class="study-card" data-action="poster"><strong>Print a poster</strong><span>Download the whole map as a high-resolution image for printing.</span></button></li></ul>`;
    const cotd = connectionOfTheDay();
    if (cotd >= 0) html += `<h3>Connection of the day</h3>${cotdHTML(cotd)}`;
    html += feedsHTML();
    return ['Study', html];
  }

  function feedsHTML() {
    const base = location.origin + location.pathname;
    return `<h3>Get it every day</h3><p>Subscribe once and the connection of the day comes to you.</p>
      <div class="actions tight">
        <a class="btn ghost small" href="${esc(base.replace(/^https?:/, 'webcal:'))}feeds/daily.ics" data-track="feed/calendar">Add to calendar</a>
        <a class="btn ghost small" href="${esc(base)}feeds/daily.xml" data-track="feed/rss">RSS feed</a>
      </div>`;
  }

  // ---------- Connection of the day ----------
  let notedList = null;
  function connectionOfTheDay() {
    if (!notedList) notedList = [...noteMap.keys()].sort((a, b) => a - b);
    if (!notedList.length) return -1;
    const day = Math.floor(Date.now() / 86400000);
    // the same connection for everyone on a given day, moving through all noted connections
    return notedList[(Math.imul(day, 2654435761) >>> 0) % notedList.length];
  }
  function cotdHTML(i) {
    const n = noteMap.get(i);
    return `<div class="cotd">
      <p class="cotd-refs">${esc(refLabel(F[i]))} <span aria-hidden="true">↔</span><span class="sr-only"> and </span> ${esc(refLabel(T[i], E[i]))}</p>
      <p><span class="tag">${esc(n.type)}</span></p>
      <p${LANG !== 'en' ? ' lang="en"' : ''}>${esc(n.text)}</p>
      <div class="actions tight">
        <button type="button" class="btn small" data-action="gotoRef" data-ref="${i}" data-cotd="1">See it on the map</button>
        ${readBoth(F[i], `Read ${esc(refLabel(F[i]))}`)}
        ${readBoth(T[i], `Read ${esc(refLabel(T[i]))}`)}
        <button type="button" class="btn ghost small" data-action="story" data-ref="${i}" data-keep="1">Story image</button>
      </div></div>`;
  }

  // ---------- Reading plans ----------
  function strongestFor(v, preferNoted = true) {
    let best = -1;
    for (let i = 0; i < N; i++) {
      if (F[i] !== v && T[i] !== v) continue;
      const score = V[i] + (preferNoted && hasNote[i] ? 100000 : 0);
      if (best < 0 || score > V[best] + (preferNoted && hasNote[best] ? 100000 : 0)) best = i;
    }
    return best;
  }
  const planCache = new Map();
  function planDays(plan) {
    if (planCache.has(plan.id)) return planCache.get(plan.id);
    let items = [];
    if (plan.source === 'journeys') {
      JOURNEYS.forEach((j, jn) => journeySteps[jn].forEach(s => items.push({ a: s.ia, b: s.ib, title: s.title, note: s.note, group: j.name })));
    } else if (plan.source === 'theme') {
      const t = THEMES.find(x => x.id === plan.theme);
      for (const o of t.verses) {
        const v = osisToIndex(o), i = strongestFor(v);
        if (i >= 0) items.push({ a: v, b: F[i] === v ? T[i] : F[i], ref: i });
      }
    }
    let days = [];
    if (plan.source === 'themes') {
      days = THEMES.map(t => ({ title: nameOf(t), items: t.verses.slice(0, plan.perDay).map(o => {
        const v = osisToIndex(o), i = strongestFor(v);
        return i >= 0 ? { a: v, b: F[i] === v ? T[i] : F[i], ref: i } : null;
      }).filter(Boolean) }));
    } else {
      for (let n = 0; n < items.length; n += plan.perDay) days.push({ title: items[n].group || '', items: items.slice(n, n + plan.perDay) });
    }
    planCache.set(plan.id, days);
    return days;
  }
  const planProgress = (id) => (store.get('plans', {})[id] || { done: [] });
  function setPlanDone(id, day, done) {
    const all = store.get('plans', {});
    const p = all[id] || { done: [] };
    p.done = done ? [...new Set([...p.done, day])] : p.done.filter(d => d !== day);
    all[id] = p; store.set('plans', all);
  }
  function plansHTML() {
    let html = '<p>Short daily readings that follow the connections. Your progress is saved on this device.</p><ul class="journey-list">';
    for (const plan of PLANS) {
      const days = planDays(plan), done = planProgress(plan.id).done.length;
      const next = Math.min(days.length - 1, firstUndone(plan));
      html += `<li class="journey-card"><h3>${esc(nameOf(plan))}</h3><p>${esc(descOf(plan))}</p>
        <div class="progress" role="img" aria-label="${done} of ${days.length} days done"><span style="width:${(done / days.length) * 100}%"></span></div>
        <p class="step-count">${done} of ${days.length} days done</p>
        <div class="actions tight"><button type="button" class="btn small" data-action="openPlan" data-plan="${plan.id}" data-day="${next}">${done ? 'Continue' : 'Start'}<span class="sr-only"> ${esc(nameOf(plan))}</span></button></div></li>`;
    }
    return ['Reading plans', html + '</ul><div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>'];
  }
  function firstUndone(plan) {
    const done = new Set(planProgress(plan.id).done), days = planDays(plan);
    for (let d = 0; d < days.length; d++) if (!done.has(d)) return d;
    return 0;
  }
  function planHTML() {
    const plan = PLANS.find(p => p.id === state.plan.id), days = planDays(plan), d = state.plan.day, day = days[d];
    const done = new Set(planProgress(plan.id).done);
    let html = `<p class="step-count">${esc(nameOf(plan))} · Day ${d + 1} of ${days.length}</p>
      <div class="progress" aria-hidden="true"><span style="width:${(done.size / days.length) * 100}%"></span></div>`;
    if (day.title) html += `<h3 class="step-title">${esc(day.title)}</h3>`;
    for (const it of day.items) {
      const note = it.note || (it.ref !== undefined && noteMap.get(it.ref)?.text);
      html += `<div class="plan-item">${it.title ? `<p class="series-title">${esc(it.title)}</p>` : ''}
        ${refCard(it.a, it.a, pal.marker)}<p class="link-arrow" aria-hidden="true">connects to</p>${refCard(it.b, it.b, pal.marker)}
        ${note ? `<p${!it.note && LANG !== 'en' ? ' lang="en"' : ''}>${esc(note)}</p>` : ''}</div>`;
    }
    const isDone = done.has(d);
    html += `<div class="actions"><button type="button" class="btn${isDone ? ' ghost' : ''}" data-action="planDone" aria-pressed="${isDone}">${isDone ? '✓ Day complete' : 'Mark day complete'}</button></div>
      <div class="actions nav-row">
        <button type="button" class="btn ghost" data-action="planDay" data-day="${d - 1}" ${d === 0 ? 'disabled' : ''}>Previous day</button>
        <button type="button" class="btn ghost" data-action="planDay" data-day="${d + 1}" ${d === days.length - 1 ? 'disabled' : ''}>Next day</button>
      </div><div class="actions"><button type="button" class="btn ghost small" data-action="planCalendar">Add reminders to calendar</button>${shareButtons()}<button type="button" class="btn ghost small" data-action="mode" data-mode="plans">All plans</button></div>`;
    return [nameOf(plan), html];
  }
  function openPlan(id, day, { push = true } = {}) {
    const plan = PLANS.find(p => p.id === id);
    if (!plan) return;
    const days = planDays(plan);
    state.mode = 'plan'; state.plan = { id, day: Math.max(0, Math.min(days.length - 1, day)) };
    state.selected = -1; state.focus = null; state.journey = null;
    updateNav(); drawBase(); renderPanel(); syncURL(push);
    const its = days[state.plan.day].items;
    if (its.length) {
      spanOfPairs(its.map(x => [x.a, x.b]));
    }
    announce(`${nameOf(plan)}, day ${state.plan.day + 1}.`);
  }

  // ---------- People, places and topics ----------
  function entityListHTML(list, label) {
    return `<h3>${label}</h3><ul class="chip-list">${list.map(e => `<li><button type="button" class="chip" data-action="entity" data-type="${e.type || 'topic'}" data-id="${e.id}">${esc(nameOf(e))}</button></li>`).join('')}</ul>`;
  }
  function peopleHTML() {
    const html = `<p>Choose a person or place to light up every verse that mentions them and the connections around them.</p>
      ${entityListHTML(PEOPLE.filter(e => e.type === 'person'), 'People')}${entityListHTML(PEOPLE.filter(e => e.type === 'place'), 'Places')}
      <p class="hint">Names are matched in the Berean Standard Bible, so a name shared by several people (such as Mary or John) shows all of them.</p>
      <div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>`;
    return ['People and places', html];
  }
  function topicsHTML() {
    const html = `<p>Choose a topic to see the verses about it and how they connect.</p>${entityListHTML(TOPICS.map(t => ({ ...t, type: 'topic' })), 'Topics')}
      <p class="hint">Topics are found by key words in the Berean Standard Bible, so they are a starting point rather than a complete list.</p>
      <div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>`;
    return ['Topics', html];
  }
  async function entitySearch(type, id) {
    const e = type === 'topic' ? TOPICS.find(t => t.id === id) : PEOPLE.find(p => p.id === id && p.type === type);
    if (!e) return null;
    let idx;
    try { idx = await loadWords(); } catch { return null; }
    const set = new Set();
    const keys = type === 'topic' ? Object.keys(idx) : null;
    for (const w of e.words) {
      const matches = type === 'topic' ? keys.filter(k => k === w || (k.startsWith(w) && k.length - w.length <= 3)) : (idx[w] ? [w] : []);
      for (const k of matches) for (const v of decodePostings(idx[k])) set.add(v);
    }
    if (!set.size) return null;
    const verses = Int32Array.from(set).sort();
    const mask = new Uint8Array(TOTAL);
    for (const v of verses) mask[v] = 1;
    return { kind: 'words', query: nameOf(e), entity: { type, id, name: nameOf(e), description: type === 'topic' ? '' : descOf(e) }, verses, mask, start: verses[0], end: verses[verses.length - 1] + 1 };
  }
  async function openEntity(type, id, opts = {}) {
    const f = await entitySearch(type, id);
    if (!f) return;
    track(`${type}/${id}`, f.entity.name);
    setFocus(f, { zoom: true, ...opts });
  }

  // ---------- Guess the connection ----------
  function newQuestion() {
    if (!notedList) connectionOfTheDay();
    const pick = () => notedList[Math.floor(Math.random() * notedList.length)];
    const i = pick(), flip = Math.random() < 0.5;
    const a = flip ? T[i] : F[i], correct = flip ? F[i] : T[i];
    const options = [correct], books = new Set([verseBook[correct], verseBook[a]]);
    let guard = 0;
    while (options.length < 3 && guard++ < 200) {
      const j = pick(), v = Math.random() < 0.5 ? F[j] : T[j];
      if (books.has(verseBook[v]) || options.includes(v)) continue;
      books.add(verseBook[v]); options.push(v);
    }
    options.sort(() => Math.random() - 0.5);
    state.game = { i, a, correct, options, answered: null };
  }
  function gameHTML() {
    if (!state.game) newQuestion();
    const g = state.game, sc = store.get('game', { right: 0, total: 0, streak: 0, best: 0 });
    let html = `<p>Which passage is linked to <strong>${esc(refLabel(g.a))}</strong>? Read it first if you like.</p>
      <div class="actions tight">${readBoth(g.a, `Read ${esc(refLabel(g.a))}`)}</div>
      <ul class="answer-list" aria-label="Answers">`;
    for (const v of g.options) {
      const state2 = g.answered === null ? '' : v === g.correct ? ' correct' : v === g.answered ? ' wrong' : '';
      html += `<li><button type="button" class="answer${state2}" data-action="answer" data-v="${v}" ${g.answered !== null ? 'disabled' : ''}>${esc(refLabel(v))}${state2 === ' correct' ? '<span class="sr-only"> (correct answer)</span>' : state2 === ' wrong' ? '<span class="sr-only"> (your answer)</span>' : ''}</button></li>`;
    }
    html += '</ul>';
    if (g.answered !== null) {
      const ok = g.answered === g.correct, n = noteMap.get(g.i);
      html += `<p class="result ${ok ? 'ok' : 'no'}" role="status">${ok ? 'Correct!' : `Not quite. The answer is ${esc(refLabel(g.correct))}.`}</p>
        ${n ? `<div class="note"><p class="note-head"><span class="tag">${esc(n.type)}</span> Why it connects</p><p${LANG !== 'en' ? ' lang="en"' : ''}>${esc(n.text)}</p></div>` : ''}
        <div class="actions"><button type="button" class="btn" data-action="nextQuestion">Next question</button>${readBoth(g.correct, `Read ${esc(refLabel(g.correct))}`)}</div>`;
    }
    html += `<p class="step-count">Score: ${sc.right} of ${sc.total} · Streak: ${sc.streak} · Best streak: ${sc.best}</p>
      <div class="actions"><button type="button" class="btn ghost small" data-action="resetGame">Reset score</button><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>`;
    return ['Guess the connection', html];
  }
  function answerQuestion(v) {
    const g = state.game;
    if (!g || g.answered !== null) return;
    g.answered = v;
    const ok = v === g.correct, sc = store.get('game', { right: 0, total: 0, streak: 0, best: 0 });
    sc.total++; if (ok) { sc.right++; sc.streak++; sc.best = Math.max(sc.best, sc.streak); } else sc.streak = 0;
    store.set('game', sc);
    track('game/answer', ok ? 'correct' : 'wrong');
    drawBase(); renderPanel();
    zoomToPair(F[g.i], T[g.i]);
    el.panelBody.querySelector('.result')?.focus?.();
  }

  // ---------- QR code ----------
  function cleanUrl() { const u = new URL(location.href); u.searchParams.delete('embed'); return u.toString(); }
  function openQR() {
    if (typeof qrcode !== 'function') return;
    const url = cleanUrl(), qr = qrcode(0, 'M');
    qr.addData(url); qr.make();
    $('qrImage').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true, alt: `QR code for ${url}` });
    $('qrLabel').textContent = contextItems().map(x => tr(x[1])).join(' · ') || tr('The whole Bible');
    $('qrUrl').textContent = url;
    $('qrDialog').showModal();
    $('qrDialog').dataset.url = url;
    track('share/qr');
  }
  $('qrDownload').addEventListener('click', () => {
    const qr = qrcode(0, 'M'); qr.addData($('qrDialog').dataset.url); qr.make();
    const n = qr.getModuleCount(), cell = 16, pad = 4 * cell, size = n * cell + pad * 2;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) ctx.fillRect(pad + col * cell, pad + r * cell, cell, cell);
    c.toBlob(b => downloadBlob(b, 'bible-connections-qr.png'), 'image/png');
  });
  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  // ---------- Embed ----------
  function openEmbed() {
    const u = new URL(cleanUrl()); u.searchParams.set('embed', '1');
    const label = contextItems().map(x => x[1]).join(', ') || 'The whole Bible';
    const h = $('embedHeight').value;
    $('embedCode').value = `<iframe src="${u}" title="Bible Connections: ${label.replace(/"/g, '&quot;')}" width="100%" height="${h}" style="border:0;border-radius:12px" loading="lazy" allow="fullscreen"></iframe>`;
    $('embedDialog').showModal();
    track('share/embed');
  }
  $('embedHeight').addEventListener('change', openEmbed);
  $('embedCopy').addEventListener('click', () => copyText($('embedCode').value));

  // ---------- Poster ----------
  function posterSVG({ dark, category }) {
    const W = 4800, M = 160, inner = W - 2 * M, k = inner / TOTAL, R = (TOTAL * k) / 2;
    const by = M + R + 40, H = by + 520;
    const bg = dark ? '#000000' : '#ffffff', fg = dark ? '#ffffff' : '#000000', sub = dark ? '#a1a1aa' : '#52525b';
    const isL = !dark, cols = category ? catKeys.map(c => CATEGORIES[c][isL ? 'light' : 'dark'])
      : Array.from({ length: BUCKETS }, (_, b) => { const t = b / (BUCKETS - 1); return `hsl(${(285 + t * 195) % 360}, ${isL ? 85 : 95}%, ${isL ? 42 - t * 4 : 60 - t * 6}%)`; });
    const nb = cols.length, paths = Array.from({ length: nb }, () => []);
    for (const i of filtered) {
      const a = M + (Math.min(POS[F[i]], POS[T[i]]) + 0.5) * k, b = M + (Math.max(POS[F[i]], POS[T[i]]) + 0.5) * k, r = (b - a) / 2;
      if (r < 0.2) continue;
      const bucket = category ? catKeys.indexOf(BOOKS[verseBook[F[i]]].cat) : Math.min(BUCKETS - 1, Math.floor(Math.sqrt(Math.abs(POS[T[i]] - POS[F[i]]) / TOTAL) * BUCKETS));
      paths[bucket].push(`M${a.toFixed(1)} ${by}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${b.toFixed(1)} ${by}`);
    }
    const alpha = Math.min(0.9, Math.max(0.06, 30 / Math.sqrt(Math.max(1, filtered.length))));
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, Arial, sans-serif">
<rect width="100%" height="100%" fill="${bg}"/><g fill="none" stroke-width="1.6" stroke-opacity="${alpha.toFixed(3)}">`;
    for (let b = nb - 1; b >= 0; b--) if (paths[b].length) s += `<path stroke="${cols[b]}" d="${paths[b].join('')}"/>`;
    s += `</g><g>`;
    let lastRight = [-1e9, -1e9];
    BOOKS_BY_POS.forEach(bk => {
      const x0 = M + bk.pos * k, x1 = M + (bk.pos + bk.end - bk.start) * k, col = CATEGORIES[bk.cat][isL ? 'light' : 'dark'];
      s += `<rect x="${x0.toFixed(1)}" y="${by + 6}" width="${Math.max(1, x1 - x0 - 2).toFixed(1)}" height="14" fill="${col}"/>`;
      const label = (x1 - x0) > bk.name.length * 15 ? bk.name : bk.abbr, cx = (x0 + x1) / 2, w = label.length * 15;
      for (let row = 0; row < 2; row++) if (cx - w / 2 > lastRight[row] + 8) {
        s += `<text x="${cx.toFixed(1)}" y="${by + 60 + row * 36}" font-size="26" fill="${sub}" text-anchor="middle">${esc(label)}</text>`;
        lastRight[row] = cx + w / 2; break;
      }
    });
    const ntx = M + NT_POS * k;
    s += `<rect x="${ntx - 1.5}" y="${by}" width="3" height="120" fill="${fg}"/>
<text x="${ntx - 16}" y="${by + 150}" font-size="28" fill="${sub}" text-anchor="end">${esc(tr('Old Testament'))}</text>
<text x="${ntx + 16}" y="${by + 150}" font-size="28" fill="${sub}">${esc(tr('New Testament'))}</text>
<text x="${W / 2}" y="${by + 300}" font-size="110" font-weight="700" fill="${fg}" text-anchor="middle">Bible Connections</text>
<text x="${W / 2}" y="${by + 380}" font-size="40" fill="${sub}" text-anchor="middle">${esc(`${filtered.length.toLocaleString()} ${tr('cross references')}`)} · ${esc(tr('Cross references: OpenBible.info (CC BY 4.0)'))} · joemighty.github.io/BibleConnections</text>
</g></svg>`;
    return { svg: s, W, H };
  }
  async function makePoster(format) {
    const dark = $('posterDark').checked, category = $('posterCategory').checked;
    const { svg, W, H } = posterSVG({ dark, category });
    track('poster/' + format);
    if (format === 'svg') { downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'bible-connections-poster.svg'); return; }
    const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.src = url;
    try { await img.decode(); } catch { announce('Sorry, the poster image could not be created. Try the SVG version.'); return; }
    const scale = 3840 / W, c = document.createElement('canvas');
    c.width = 3840; c.height = Math.round(H * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob(b => downloadBlob(b, 'bible-connections-poster.png'), 'image/png');
  }
  $('posterSvg').addEventListener('click', () => makePoster('svg'));
  $('posterPng').addEventListener('click', () => makePoster('png'));

  // ---------- Suggest a note ----------
  function suggestUrl(i) {
    const label = `${refLabel(F[i])} and ${refLabel(T[i], E[i])}`;
    const q = new URLSearchParams({
      template: 'content_suggestion.yml', labels: 'content', title: `Note: ${label}`, kind: 'A new or better note',
      from: toOsis(F[i]), to: toOsis(T[i]),
      details: `Link: ${cleanUrl()}`,
    });
    return `https://github.com/JoeMighty/BibleConnections/issues/new?${q}`;
  }

  // ---------- Word study: original Hebrew and Greek words (STEP Bible data, CC BY 4.0) ----------
  let strongsPromise = null, STRONGS = null;
  function loadStrongs() {
    if (!strongsPromise) strongsPromise = fetch('data/strongs.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    strongsPromise.then(d => { STRONGS = d; }, () => { strongsPromise = null; });
    return strongsPromise;
  }
  const plain = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.'’ʼ]/g, '').toLowerCase();
  const wordLabel = (code, w) => `${w.t} (${w.g})`;
  function wordChip(code) {
    const w = STRONGS[code];
    return `<li><button type="button" class="chip" data-action="openWord" data-code="${code}">${esc(w.t)} <span class="muted">${esc(w.g)}</span></button></li>`;
  }
  function wordStudyHTML() {
    if (!STRONGS) {
      loadStrongs().then(() => { if (state.mode === 'wordstudy') renderPanel(); }, () => {});
      return ['Word study', '<p class="muted">Loading Hebrew and Greek words…</p>'];
    }
    const heb = FEATURED_WORDS.filter(c => c.startsWith('H') && STRONGS[c]), grk = FEATURED_WORDS.filter(c => c.startsWith('G') && STRONGS[c]);
    const html = `<p>Explore a word from the original Hebrew or Greek and see every verse where it is used.</p>
      <div class="field"><label for="wordQ">Search by English meaning, Hebrew or Greek word, or Strong’s number</label>
      <input id="wordQ" type="search" placeholder="e.g. love, shalom or G26" autocomplete="off" spellcheck="false"></div>
      <div id="wordResults" aria-live="polite"></div>
      <h3>Hebrew (Old Testament)</h3><ul class="chip-list">${heb.map(wordChip).join('')}</ul>
      <h3>Greek (New Testament)</h3><ul class="chip-list">${grk.map(wordChip).join('')}</ul>
      <p class="hint">Hebrew and Greek data from <a href="https://www.stepbible.org" rel="noopener">STEP Bible</a>, licensed CC BY 4.0.</p>
      <div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>`;
    return ['Word study', html];
  }
  let wordT = 0;
  el.panelBody.addEventListener('input', (e) => {
    if (e.target.id !== 'wordQ') return;
    clearTimeout(wordT);
    wordT = setTimeout(() => {
      const q = plain(e.target.value.trim()), box = $('wordResults');
      if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; return; }
      const code = q.toUpperCase().match(/^([GH])0*(\d{1,4})$/);
      const hits = [];
      for (const [c, w] of Object.entries(STRONGS)) {
        let score = 0;
        if (code && c === code[1] + code[2].padStart(4, '0')) score = 1e9;
        else if (plain(w.t) === q || plain(w.g) === q) score = 1e6 + w.n;
        else if (plain(w.t).startsWith(q)) score = 5e5 + w.n;
        else if (plain(w.g).split(/[^a-z]+/).includes(q)) score = 1e5 + w.n;
        if (score) hits.push([score, c]);
      }
      hits.sort((a, b) => b[0] - a[0]);
      box.innerHTML = hits.length
        ? `<p class="muted">${hits.length.toLocaleString()} matching word${hits.length === 1 ? '' : 's'}</p><ul class="conn-list">${hits.slice(0, 25).map(([, c]) => {
          const w = STRONGS[c];
          return `<li><button type="button" class="conn-item" data-action="openWord" data-code="${c}"><span class="label"><span lang="${c[0] === 'H' ? 'he' : 'el'}">${esc(w.l)}</span> · ${esc(w.t)} · ${esc(w.g)}</span><span class="votes">${w.n.toLocaleString()} verses</span></button></li>`;
        }).join('')}</ul>`
        : '<p class="muted">No words found. Try another English word.</p>';
    }, 150);
  });
  async function openWord(code, opts = {}) {
    let d;
    try { d = await loadStrongs(); } catch { announce('Word study could not load. Check your connection.'); return; }
    const w = d[code];
    if (!w) return;
    const verses = w.v ? Int32Array.from(decodePostings(w.v)) : new Int32Array(0);
    const mask = new Uint8Array(TOTAL);
    for (const v of verses) mask[v] = 1;
    track('word/' + code, w.t);
    setFocus({ kind: 'words', query: wordLabel(code, w), verses, mask, start: verses[0] || 0, end: (verses[verses.length - 1] || 0) + 1,
      entity: { type: 'word', id: code, name: wordLabel(code, w), word: w } }, { zoom: true, ...opts });
  }


  // ---------- Passage explorer and full word study ----------
  // Original language text and lexicon from STEP Bible (CC BY 4.0). No English Bible text is shown.
  const textCache = new Map(), lexCache = new Map();
  const fetchJSON = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  function loadBookText(bi) {
    if (!textCache.has(bi)) textCache.set(bi, fetchJSON(`data/text/${bi}.json`).catch(e => { textCache.delete(bi); throw e; }));
    return textCache.get(bi);
  }
  function loadLex(code) {
    const shard = code.slice(0, 3);
    if (!lexCache.has(shard)) lexCache.set(shard, fetchJSON(`data/lex/${shard}.json`).catch(e => { lexCache.delete(shard); throw e; }));
    return lexCache.get(shard).then(d => d[code]);
  }
  const LANG_NAME = { H: 'Hebrew', A: 'Aramaic', G: 'Greek' };
  const langAttr = (l) => (l === 'G' ? 'el' : l === 'A' ? 'arc' : 'he');

  // readable descriptions of grammar codes (Robinson codes for Greek, OSHB codes for Hebrew and Aramaic)
  const G_CASE = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
  const NUM = { S: 'singular', P: 'plural', s: 'singular', p: 'plural', d: 'dual' };
  const G_GEN = { M: 'masculine', F: 'feminine', N: 'neuter' };
  const G_TENSE = { P: 'present', I: 'imperfect', F: 'future', A: 'aorist', R: 'perfect', L: 'pluperfect', X: 'no tense' };
  const G_VOICE = { A: 'active', M: 'middle', P: 'passive', E: 'middle or passive', D: 'middle', O: 'passive', N: 'middle or passive' };
  const G_MOOD = { I: 'indicative', S: 'subjunctive', O: 'optative', M: 'imperative', N: 'infinitive', P: 'participle' };
  const G_POS = { N: 'noun', A: 'adjective', T: 'article', V: 'verb', P: 'personal pronoun', R: 'relative pronoun', D: 'demonstrative pronoun',
    C: 'reciprocal pronoun', F: 'reflexive pronoun', I: 'interrogative pronoun', K: 'correlative pronoun', Q: 'correlative pronoun', S: 'possessive pronoun', X: 'indefinite pronoun',
    ADV: 'adverb', CONJ: 'conjunction', PREP: 'preposition', PRT: 'particle', INJ: 'interjection', COND: 'conditional', HEB: 'Hebrew word', ARAM: 'Aramaic word' };
  function cng(x) {
    const m = x.match(/^([123])?([NGDAV])?([SP])?([MFN])?/);
    if (!m) return [];
    return [m[1] && `${m[1]}${m[1] === '1' ? 'st' : m[1] === '2' ? 'nd' : 'rd'} person`, G_CASE[m[2]], NUM[m[3]], G_GEN[m[4]]].filter(Boolean);
  }
  function greekGrammar(code) {
    const [pos, a = '', b = ''] = code.split('-');
    if (pos === 'V') {
      const m = a.match(/^(2)?([PIFARLX])([AMPEDON])([ISOMNP])$/);
      if (!m) return 'verb';
      const parts = ['verb', (m[1] ? 'second ' : '') + G_TENSE[m[2]], G_VOICE[m[3]], G_MOOD[m[4]]];
      if (b) parts.push(...(m[4] === 'P' ? cng(b) : cng(b.replace(/^([123])([SP])$/, '$1$2'))));
      return parts.join(', ');
    }
    return [G_POS[pos] || pos.toLowerCase(), ...cng(a)].join(', ');
  }
  const H_POS = { A: 'adjective', C: 'conjunction', D: 'adverb', N: 'noun', P: 'pronoun', R: 'preposition', S: 'suffix', T: 'particle', V: 'verb' };
  const H_STEM = { q: 'qal', N: 'niphal', p: 'piel', P: 'pual', h: 'hiphil', H: 'hophal', t: 'hithpael', o: 'polel', O: 'polal', r: 'hithpolel',
    m: 'poel', M: 'poal', k: 'palel', K: 'pulal', Q: 'qal passive', l: 'pilpel', L: 'polpal', f: 'hithpalpel', D: 'nithpael', j: 'pealal',
    i: 'pilel', u: 'hothpaal', c: 'tiphil', v: 'hishtaphel', w: 'nithpalel', y: 'nithpoel', z: 'hithpoel' };
  const A_STEM = { q: 'peal', Q: 'peil', u: 'hithpeel', p: 'pael', P: 'ithpaal', M: 'hithpaal', a: 'aphel', h: 'haphel', s: 'saphel', e: 'shaphel',
    H: 'hophal', i: 'ithpeel', t: 'hishtaphel', v: 'ishtaphel', w: 'hithaphel', o: 'polel', z: 'ithpoel', r: 'hithpolel', f: 'hithpalpel',
    b: 'hephal', c: 'tiphel', m: 'poel', l: 'palpel', L: 'ithpalpel', O: 'ithpolel', G: 'ittaphal' };
  const H_VTYPE = { p: 'perfect', q: 'sequential perfect', i: 'imperfect', w: 'sequential imperfect', h: 'cohortative', j: 'jussive',
    v: 'imperative', r: 'active participle', s: 'passive participle', a: 'infinitive absolute', c: 'infinitive construct' };
  const H_GEN = { m: 'masculine', f: 'feminine', b: 'both genders', c: 'common' };
  const H_STATE = { a: 'absolute', c: 'construct', d: 'determined' };
  function hebrewGrammar(lang, code) {
    const pos = code[0], rest = code.slice(1);
    const pgn = (x) => { const m = x.match(/^([123])?([mfbc])?([spd])?([acd])?/) || []; return [m[1] && `${m[1]}${m[1] === '1' ? 'st' : m[1] === '2' ? 'nd' : 'rd'} person`, H_GEN[m[2]], NUM[m[3]], H_STATE[m[4]]].filter(Boolean); };
    if (pos === 'V') {
      const stem = (lang === 'A' ? A_STEM : H_STEM)[rest[0]], type = H_VTYPE[rest[1]];
      return ['verb', stem, type, ...pgn(rest.slice(2))].filter(Boolean).join(', ');
    }
    if (pos === 'N') return [rest[0] === 'p' ? 'proper noun' : rest[0] === 'g' ? 'gentilic noun' : 'noun', ...pgn(rest.slice(1))].join(', ');
    if (pos === 'A') return [{ a: 'adjective', c: 'number', g: 'gentilic adjective', o: 'ordinal number' }[rest[0]] || 'adjective', ...pgn(rest.slice(1))].join(', ');
    if (pos === 'P') return [{ d: 'demonstrative pronoun', f: 'indefinite pronoun', i: 'interrogative pronoun', p: 'personal pronoun', r: 'relative pronoun' }[rest[0]] || 'pronoun', ...pgn(rest.slice(1))].join(', ');
    if (pos === 'T') return { a: 'particle of affirmation', d: 'definite article', e: 'particle of exhortation', i: 'interrogative particle', j: 'interjection', m: 'demonstrative particle', n: 'negative particle', o: 'object marker', r: 'relative particle' }[rest[0]] || 'particle';
    return H_POS[pos] || code;
  }
  function grammarText(g) {
    const [lang, code = ''] = g.split(':');
    if (!code) return '';
    return (lang === 'G' ? greekGrammar(code) : hebrewGrammar(lang, code)).split(', ').map(tr).join(', ');
  }

  // approximate English sounding pronunciation with the stressed syllable in capitals
  function pronounce(code, lemma, translit) {
    if (!translit) return '';
    let sylls;
    if (code[0] === 'H') {
      sylls = translit.toLowerCase().replace(/['ʼ’]/g, '').split(/[.\-\s]+/).filter(Boolean);
      const stress = /֫/.test(lemma) && sylls.length > 1 ? sylls.length - 2 : sylls.length - 1;
      const sound = (x) => x.replace(/ch|kh/g, 'kh').replace(/a/g, 'ah').replace(/e/g, 'eh').replace(/i/g, 'ee').replace(/o/g, 'oh').replace(/u/g, 'oo').replace(/hh/g, 'h');
      return sylls.map((x, n) => (n === stress ? sound(x).toUpperCase() : sound(x))).join('-');
    }
    // Greek: split into syllables around vowel groups, stress from the accent in the Greek lemma
    const t = translit.toLowerCase();
    const parts = t.match(/[^aeiouyēō]*(?:ai|ei|oi|ui|au|eu|ēu|ou|[aeiouyēō])(?:[^aeiouyēō]*$)?/g) || [t];
    sylls = [];
    for (const p of parts) {
      const m = p.match(/^([^aeiouyēō]*)(.*)$/);
      if (sylls.length && m[1].length > 1) { sylls[sylls.length - 1] += m[1][0]; sylls.push(m[1].slice(1) + m[2]); } else sylls.push(p);
    }
    const nf = lemma.normalize('NFD');
    const vowelGroups = nf.match(/(?:[αεηιουω][̀-ͯ]*(?:[ιυ](?![̈])[̀-ͯ]*)?)/gi) || [];
    let fromEnd = vowelGroups.length - 1 - vowelGroups.findIndex(g => /[̀́͂]/.test(g));
    if (fromEnd >= vowelGroups.length || fromEnd < 0) fromEnd = 0;
    const stress = Math.max(0, sylls.length - 1 - fromEnd);
    const sound = (x) => x.replace(/ou/g, 'oo').replace(/ai/g, 'eye').replace(/ei/g, 'ay').replace(/oi/g, 'oy').replace(/au/g, 'ow').replace(/eu/g, 'yoo')
      .replace(/ē/g, 'ay').replace(/ō/g, 'oh').replace(/ch/g, 'kh').replace(/ph/g, 'f').replace(/a(?![hy])/g, 'ah').replace(/(?<![ay])e(?!y)/g, 'eh').replace(/i(?!e)/g, 'ee').replace(/y/g, 'ee');
    return sylls.map((x, n) => (n === stress ? sound(x).toUpperCase() : sound(x))).join('-');
  }

  // light markup from the lexicon: **bold**, _italic_, [[Ref.1.2|label]]
  function lexMarkup(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>')
      .replace(/\[\[([^|\]]+)\|([^\]]*)\]\]/g, (m, r, l) => {
        const v = osisToIndex(r.replace(/^Jude\.(\d+)$/, 'Jude.1.$1'));
        return v >= 0 ? `<button type="button" class="link-btn" data-action="focusVerse" data-v="${v}">${l || esc(refLabel(v))}</button>` : l;
      }).replace(/\n/g, '<br>');
  }

  function versesByBook(verses) {
    const counts = new Map();
    for (const v of verses) counts.set(verseBook[v], (counts.get(verseBook[v]) || 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }
  async function wordDetailHTML(code) {
    const [d, w] = await Promise.all([loadLex(code), loadStrongs().then(x => x[code])]);
    if (!d || !w) return '<p class="muted">No further details for this word.</p>';
    const verses = w.v ? decodePostings(w.v) : [];
    const lang = d.lang;
    let html = `<dl class="word-facts">
      <div><dt>Language</dt><dd>${LANG_NAME[lang]}</dd></div>
      <div><dt>Strong’s number</dt><dd>${esc(code.replace(/^([GH])0+/, '$1'))} <span class="muted">(${esc(code)})</span></dd></div>
      <div><dt>Say it</dt><dd>${esc(pronounce(code, w.l, w.t))} <span class="muted">(approximate)</span></dd></div>
      ${d.pos ? `<div><dt>Part of speech</dt><dd>${esc(greekOrHebPos(d.pos))}</dd></div>` : ''}
    </dl>`;
    if (d.senses) {
      html += `<h3>Meanings in context</h3><p class="hint">The same word can carry different shades of meaning. Choose one to see only those verses.</p><ul class="sense-list">`;
      for (const [x, gloss, n, vs] of d.senses) html += `<li><button type="button" class="conn-item" ${vs ? `data-action="openSense" data-code="${esc(code)}" data-sense="${esc(x)}"` : 'disabled'}><span class="label">${esc(gloss)} <span class="muted">${esc(x)}</span></span><span class="votes">${n.toLocaleString()} verse${n === 1 ? '' : 's'}</span></button></li>`;
      html += '</ul>';
    }
    if (verses.length) {
      const ot = verses.filter(v => verseBook[v] < 39).length;
      const books = versesByBook(verses).slice(0, 8), max = books[0][1];
      html += `<h3>Where it is used</h3><p>${ot ? `${ot.toLocaleString()} in the Old Testament` : ''}${ot && ot < verses.length ? ' and ' : ''}${ot < verses.length ? `${(verses.length - ot).toLocaleString()} in the New Testament` : ''}.</p>
        <ul class="book-bars" aria-label="Books where this word is used most">${books.map(([b, n]) => `<li><button type="button" class="link-btn" data-action="focusBook" data-b="${b}">${esc(BOOKS[b].name)}</button><span class="bar" style="--w:${Math.max(4, (n / max) * 100)}%" aria-hidden="true"></span><span class="count">${n}</span></li>`).join('')}</ul>`;
    }
    if (d.forms && d.forms.length) {
      html += `<h3>Forms in the text</h3><table class="forms"><caption class="sr-only">Most common forms of this word</caption><thead><tr><th scope="col">Form</th><th scope="col">Grammar</th><th scope="col">Times</th></tr></thead><tbody>`;
      for (const [form, gram, n] of d.forms) html += `<tr><td lang="${langAttr(gram[0])}"${gram[0] !== 'G' ? ' dir="rtl"' : ''}>${esc(form)}</td><td>${esc(grammarText(gram))}</td><td>${n}</td></tr>`;
      html += '</tbody></table>';
    }
    const related = (d.related || []).filter(c => STRONGS[c]);
    if (related.length) html += `<h3>Related words</h3><ul class="chip-list">${related.map(c => `<li><button type="button" class="chip" data-action="openWord" data-code="${c}"><span lang="${c[0] === 'H' ? 'he' : 'el'}">${esc(STRONGS[c].l)}</span> ${esc(STRONGS[c].t)} <span class="muted">${esc(STRONGS[c].g)}</span></button></li>`).join('')}</ul>`;
    if (LANG !== 'en') html += '<p class="hint">Word meanings and the dictionary entry are in English.</p>';
    if (d.def) html += `<details class="lexicon"><summary>Dictionary entry</summary><div lang="en">${lexMarkup(d.def)}</div></details>`;
    return html;
  }
  function greekOrHebPos(p) {
    const k = p.split(':')[1] || p;
    const map = { N: 'noun', V: 'verb', A: 'adjective', ADV: 'adverb', CONJ: 'conjunction', PREP: 'preposition', PRT: 'particle', INJ: 'interjection', 'N-M': 'noun, masculine', 'N-F': 'noun, feminine', 'N-N': 'noun, neuter', 'N-PRI': 'proper name', 'N-M-P': 'proper name (person)', 'N-F-P': 'proper name (person)', 'N-M-L': 'proper name (place)', 'N-F-L': 'proper name (place)', R: 'preposition', D: 'adverb', C: 'conjunction', T: 'particle', P: 'pronoun' };
    return map[k] || map[k.split('-')[0]] || k;
  }
  async function openSense(code, sense) {
    const [d, all] = await Promise.all([loadLex(code), loadStrongs()]);
    const s = d && d.senses && d.senses.find(x => x[0] === sense), w = all[code];
    if (!s || !s[3]) return;
    const verses = Int32Array.from(decodePostings(s[3]));
    const mask = new Uint8Array(TOTAL);
    for (const v of verses) mask[v] = 1;
    setFocus({ kind: 'words', query: `${w.t} (${s[1]})`, verses, mask, start: verses[0], end: verses[verses.length - 1] + 1,
      entity: { type: 'word', id: code, name: `${w.t}: ${s[1]}`, word: { ...w, n: verses.length } } }, { zoom: true });
  }

  function passageStudyHTML(v) {
    const b = BOOKS[verseBook[v]], c = verseChap[v], n = verseNum[v], inChap = b.chapters[c - 1];
    const intro = INTROS[b.osis], cat = b.cat;
    const ot = [], nt = [];
    for (const i of focusList) { const other = F[i] === v ? T[i] : F[i]; (verseBook[other] < 39 ? ot : nt).push(i); }
    const q = (REFLECT[cat] || {})[LANG] || (REFLECT[cat] || {}).en || [];
    const noted = [...focusList].filter(i => hasNote[i]).slice(0, 6);
    return `<section class="study-sec" aria-labelledby="secContext"><h3 id="secContext">In context</h3>
        <p>Verse ${n} of ${inChap} in ${esc(b.name)} ${c} · <span class="muted">${esc(CATEGORIES[cat].name)}</span></p>
        <div class="actions tight">
          ${v > b.start ? `<button type="button" class="btn ghost small" data-action="focusVerse" data-v="${v - 1}">Previous verse<span class="sr-only">: ${esc(refLabel(v - 1))}</span></button>` : ''}
          ${v < b.end - 1 ? `<button type="button" class="btn ghost small" data-action="focusVerse" data-v="${v + 1}">Next verse<span class="sr-only">: ${esc(refLabel(v + 1))}</span></button>` : ''}
        </div>
        ${intro ? `<p class="book-intro"><strong>About ${esc(b.name)}:</strong> ${esc(LANG === 'es' && intro.about_es ? intro.about_es : intro.about)}</p>` : ''}
      </section>
      <section class="study-sec" aria-labelledby="secOrig"><h3 id="secOrig">Original text</h3>
        <div id="origText" data-v="${v}"><p class="muted">Loading the original text…</p></div>
      </section>
      <section class="study-sec" aria-labelledby="secPeople"><h3 id="secPeople">People, places and topics</h3>
        <div id="verseEntities" data-v="${v}"><p class="muted">Looking for people, places and topics…</p></div>
        <div id="versePlaces" data-v="${v}"></div>
      </section>
      ${noted.length ? `<section class="study-sec" aria-labelledby="secNotes"><h3 id="secNotes">Explained connections</h3><ul class="conn-list">${noted.map(i => connItem(i, true)).join('')}</ul></section>` : ''}
      <section class="study-sec" aria-labelledby="secRefs"><h3 id="secRefs">Connections</h3>
        <p>${ot.length.toLocaleString()} to the Old Testament and ${nt.length.toLocaleString()} to the New Testament, strongest first.</p>
        <h4>Old Testament</h4>${ot.length ? listHTML(ot, true) : '<p class="muted">None with the current filters.</p>'}
        <h4>New Testament</h4>${nt.length ? listHTML(nt, true) : '<p class="muted">None with the current filters.</p>'}
      </section>
      <section class="study-sec" aria-labelledby="secNote"><h3 id="secNote">My notes</h3>
        <label for="verseNote" class="sr-only">My notes on ${esc(refLabel(v))}</label>
        <textarea id="verseNote" data-key="${esc(noteKey(v))}" rows="4" placeholder="Write what you notice, questions or a prayer…">${esc((getNotes()[noteKey(v)] || {}).text || '')}</textarea>
        <p class="hint"><span id="noteStatus" role="status">Kept on this device only.</span> <button type="button" class="link-btn" data-action="mode" data-mode="notes">All my notes</button></p>
      </section>
      ${q.length ? `<section class="study-sec" aria-labelledby="secReflect"><h3 id="secReflect">Reflect</h3><ol class="reflect">${q.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <p class="hint">General questions for personal or group study.</p></section>` : ''}
      <div class="actions"><a class="btn ghost small" href="handout.html?verse=${esc(toOsis(v))}${LANG !== 'en' ? '&lang=' + LANG : ''}" target="_blank" rel="noopener">Printable handout<span class="sr-only"> for ${esc(refLabel(v))} (opens in a new tab)</span></a></div>`;
  }

  function fillStudy() {
    const gm = $('geoMini');
    if (gm) loadPlaces().then(d => { const P0 = d.places[+gm.dataset.i]; const near = P0.lon > 33.7 && P0.lon < 36.9 && P0.lat > 29.4 && P0.lat < 33.6; drawPlaces(gm, { view: near ? 'israel' : 'lands', highlight: [P0.i], labels: false }); }, () => {});
    const pm = $('placesMap');
    if (pm) drawPlaces(pm, { view: pm.dataset.view });
    const vp = $('versePlaces');
    if (vp) {
      const v = +vp.dataset.v;
      loadPlaces().then(d => {
        if (!vp.isConnected) return;
        const here = d.places.filter(p => decodePostings(p.vs).includes(v));
        if (!here.length) return;
        vp.innerHTML = `<p class="muted">Places in this verse</p><ul class="chip-list">${here.map(p => `<li><button type="button" class="chip" data-action="openGeo" data-i="${p.i}">${esc(p.label)} <span class="muted">place</span></button></li>`).join('')}</ul>
          <canvas class="places-map mini" id="versePlacesMap" role="img" aria-label="Map of the places in this verse"></canvas>`;
        const all = here.every(p => p.lon > 33.7 && p.lon < 36.9 && p.lat > 29.4 && p.lat < 33.6);
        drawPlaces($('versePlacesMap'), { view: all ? 'israel' : 'lands', highlight: here.map(p => p.i), labels: false });
      }, () => {});
    }
    const wd = $('wordDetail');
    if (wd) wordDetailHTML(wd.dataset.code).then(h => { if (wd.isConnected) wd.innerHTML = h; }, () => { if (wd.isConnected) wd.innerHTML = '<p class="muted">The full word study could not load. Check your connection.</p>'; });
    const ot = $('origText');
    if (ot) {
      const v = +ot.dataset.v;
      Promise.all([loadBookText(verseBook[v]), loadStrongs()]).then(([t]) => {
        if (!ot.isConnected) return;
        const words = (t.v[v - t.s] || '').split('~').filter(Boolean).map(x => x.split('|'));
        if (!words.length) { ot.innerHTML = '<p class="muted">No original text for this verse.</p>'; return; }
        const lang = words[0][3][0], rtl = lang !== 'G';
        const aram = words.filter(w => w[3][0] === 'A').length;
        const langNote = lang === 'G' ? 'Greek' : !aram ? 'Hebrew' : aram === words.length ? 'Aramaic' : 'Hebrew and Aramaic';
        ot.innerHTML = `<p class="muted">Language: ${langNote}</p>
          <ol class="orig${rtl ? ' rtl' : ''}" lang="${langAttr(aram === words.length ? 'A' : lang)}"${rtl ? ' dir="rtl"' : ''} aria-label="Original words. Choose a word to study it.">${words.map(([surf, tr, code, gram]) => {
            const base = code.replace(/[A-Z]$/, ''), w = STRONGS[base];
            const gloss = w ? w.g : '';
            const inner = `<span class="o-word">${esc(surf)}</span><span class="o-tr" lang="en" dir="ltr">${esc(tr.replace(/\./g, ''))}</span><span class="o-gl" lang="en" dir="ltr">${esc(gloss)}</span>`;
            return `<li>${w ? `<button type="button" class="orig-word" data-action="openWord" data-code="${base}" title="${esc(grammarText(gram))}">${inner}<span class="sr-only">, ${esc(grammarText(gram))}. Study this word</span></button>` : `<span class="orig-word">${inner}</span>`}</li>`;
          }).join('')}</ol>
          <p class="hint">Each word shows its pronunciation and dictionary meaning, not a translation of the verse. Choose a word to study it. Text from STEP Bible (CC BY 4.0).</p>`;
      }, () => { if (ot.isConnected) ot.innerHTML = '<p class="muted">The original text could not load. Check your connection.</p>'; });
    }
    const ve = $('verseEntities');
    if (ve) {
      const v = +ve.dataset.v;
      loadWords().then(idx => {
        if (!ve.isConnected) return;
        const has = (words) => words.some(wd => { const s = idx[wd]; return s && decodePostings(s).includes(v); });
        const ppl = (PEOPLE || []).filter(p => has(p.words)), tps = (TOPICS || []).filter(t => has(t.words));
        const nm = (x) => (LANG === 'es' && x.name_es) || x.name;
        ve.innerHTML = ppl.length || tps.length
          ? `<ul class="chip-list">${ppl.map(p => `<li><button type="button" class="chip" data-action="entity" data-type="${p.type === 'place' ? 'place' : 'person'}" data-id="${esc(p.id)}">${esc(nm(p))} <span class="muted">${p.type === 'place' ? 'place' : 'person'}</span></button></li>`).join('')}${tps.map(t => `<li><button type="button" class="chip" data-action="entity" data-type="topic" data-id="${esc(t.id)}">${esc(nm(t))} <span class="muted">topic</span></button></li>`).join('')}</ul>`
          : '<p class="muted">None of the site’s people, places or topics are named in this verse.</p>';
      }, () => { if (ve.isConnected) ve.innerHTML = ''; });
    }
  }


  // ---------- My notes: personal study notes, kept on this device only ----------
  const getNotes = () => store.get('notes', {});
  const noteKey = (v) => toOsis(v);
  let noteTimer = 0;
  el.panelBody.addEventListener('input', (e) => {
    if (e.target.id !== 'verseNote') return;
    clearTimeout(noteTimer);
    const key = e.target.dataset.key, text = e.target.value;
    noteTimer = setTimeout(() => {
      const all = getNotes();
      if (text.trim()) all[key] = { text, t: Date.now() }; else delete all[key];
      store.set('notes', all);
      const st = $('noteStatus');
      if (st) st.textContent = text.trim() ? 'Saved on this device.' : 'Note removed.';
    }, 400);
  });
  function notesHTML() {
    const all = Object.entries(getNotes()).map(([k, n]) => [k, n, osisToIndex(k)]).filter(x => x[2] >= 0).sort((a, b) => a[2] - b[2]);
    let html = `<p>Notes you write on any verse are kept on this device only. Nobody else can see them. Export them to keep a copy or move them to another device.</p>
      <div class="actions tight">
        <button type="button" class="btn small" data-action="exportNotes"${all.length ? '' : ' disabled'}>Export notes</button>
        <label class="btn ghost small file-btn">Import notes<input type="file" id="importNotes" accept="application/json,.json"></label>
      </div><p id="notesMsg" class="hint" role="status"></p>`;
    if (!all.length) html += '<p class="muted">No notes yet. Open any verse and write in the My notes box.</p>';
    else html += `<h3>${all.length} note${all.length === 1 ? '' : 's'}</h3><ul class="notes-list">${all.map(([k, n, v]) => `<li>
        <button type="button" class="link-btn" data-action="focusVerse" data-v="${v}">${esc(refLabel(v))}</button>
        <p>${esc(n.text.length > 220 ? n.text.slice(0, 217) + '…' : n.text)}</p>
        <button type="button" class="btn ghost small" data-action="deleteNote" data-key="${esc(k)}">Delete<span class="sr-only"> note on ${esc(refLabel(v))}</span></button></li>`).join('')}</ul>`;
    html += '<div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>';
    return ['My notes', html];
  }
  function exportNotes() {
    const blob = new Blob([JSON.stringify({ app: 'Bible Connections', type: 'notes', version: 1, notes: getNotes() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `bible-connections-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    announce('Notes exported.');
  }
  el.panelBody.addEventListener('change', async (e) => {
    if (e.target.id !== 'importNotes' || !e.target.files[0]) return;
    let added = 0;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      const incoming = data && data.notes && typeof data.notes === 'object' ? data.notes : null;
      if (!incoming) throw new Error('format');
      const all = getNotes();
      for (const [k, n] of Object.entries(incoming)) {
        if (osisToIndex(k) < 0 || !n || typeof n.text !== 'string') continue;
        if (!all[k] || (n.t || 0) > (all[k].t || 0)) { all[k] = { text: n.text.slice(0, 20000), t: n.t || Date.now() }; added++; }
      }
      store.set('notes', all);
      renderPanel();
      const msg = `Imported ${added} note${added === 1 ? '' : 's'}.`;
      if ($('notesMsg')) $('notesMsg').textContent = msg;
      announce(msg);
    } catch {
      if ($('notesMsg')) $('notesMsg').textContent = 'That file could not be read. Choose a notes file exported from Bible Connections.';
    }
  });

  // ---------- Places map (OpenBible.info Bible Geocoding Data, CC BY 4.0; Natural Earth coastline) ----------
  let placesPromise = null, PLACES = null;
  function loadPlaces() {
    if (!placesPromise) placesPromise = fetchJSON('data/places.json').then(d => {
      d.places = d.places.map(([name, lon, lat, conf, type, vs], i) => ({ i, name, label: name.replace(/ \d+$/, ''), lon, lat, conf, type, vs, n: vs.split(',').length }));
      PLACES = d; return d;
    }).catch(e => { placesPromise = null; throw e; });
    return placesPromise;
  }
  const PLACE_VIEWS = { lands: [-10, 12, 62, 46], israel: [33.7, 29.4, 36.9, 33.6] };
  function drawPlaces(canvas, { view = 'lands', highlight = [], labels = true } = {}) {
    const d = PLACES; if (!d || !canvas.isConnected) return;
    const [w0, s0, e0, n0] = PLACE_VIEWS[view] || view;
    const css = getComputedStyle(document.documentElement);
    const W = canvas.clientWidth, k = Math.cos(((s0 + n0) / 2) * Math.PI / 180);
    const H = Math.round(W * (n0 - s0) / ((e0 - w0) * k));
    canvas.style.height = H + 'px';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const X = (lon) => (lon - w0) / (e0 - w0) * W, Y = (lat) => (n0 - lat) / (n0 - s0) * H;
    ctx.fillStyle = css.getPropertyValue('--map-water').trim() || '#1b2a3a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = css.getPropertyValue('--map-land').trim() || '#2c2c2e';
    for (const r of d.land) { ctx.beginPath(); for (let j = 0; j < r.length; j += 2) (j ? ctx.lineTo : ctx.moveTo).call(ctx, X(r[j]), Y(r[j + 1])); ctx.closePath(); ctx.fill(); }
    const dot = css.getPropertyValue('--link').trim(), hl = pal.marker, ink = css.getPropertyValue('--text').trim(), bg = css.getPropertyValue('--map-land').trim();
    const visible = d.places.filter(p => p.lon >= w0 && p.lon <= e0 && p.lat >= s0 && p.lat <= n0);
    canvas._hit = [];
    for (const p of visible) {
      const r = Math.max(1.6, Math.min(6, Math.log2(p.n + 1) * (view === 'lands' ? 0.7 : 1)));
      ctx.globalAlpha = p.conf === 2 ? 0.9 : p.conf === 1 ? 0.6 : 0.3;
      ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(X(p.lon), Y(p.lat), r, 0, 7); ctx.fill();
      canvas._hit.push([X(p.lon), Y(p.lat), p.i]);
    }
    ctx.globalAlpha = 1;
    const boxes = [];
    const label = (p, bold) => {
      const x = X(p.lon), y = Y(p.lat);
      ctx.font = `${bold ? 600 : 500} ${bold ? 13 : 11}px ${css.getPropertyValue('--font')}`;
      const tw = ctx.measureText(p.label).width, bx = [x + 6, y - 7, x + 10 + tw, y + 7];
      if (!bold && (bx[2] > W || boxes.some(b => !(bx[2] < b[0] || bx[0] > b[2] || bx[3] < b[1] || bx[1] > b[3])))) return;
      boxes.push(bx);
      ctx.lineWidth = 3; ctx.strokeStyle = bg; ctx.strokeText(p.label, x + 7, y + 4);
      ctx.fillStyle = ink; ctx.fillText(p.label, x + 7, y + 4);
    };
    for (const i of highlight) {
      const p = d.places[i];
      ctx.fillStyle = hl; ctx.strokeStyle = bg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(p.lon), Y(p.lat), 6, 0, 7); ctx.fill(); ctx.stroke();
      label(p, true);
    }
    if (labels) for (const p of visible.filter(p => p.conf === 2).slice(0, view === 'lands' ? 28 : 40)) label(p, false);
  }
  function placesHTML() {
    if (!PLACES) {
      loadPlaces().then(() => { if (state.mode === 'places') renderPanel(); }, () => {});
      return ['Places', '<p class="muted">Loading the map…</p>'];
    }
    const view = state.placesView || 'lands';
    const top = PLACES.places.filter(p => p.conf >= 1).slice(0, 40);
    return ['Places', `<p>See where the places named in the Bible were. Choose a place to see every verse that mentions it.</p>
      <div class="actions tight" role="group" aria-label="Map area">
        <button type="button" class="btn ${view === 'lands' ? '' : 'ghost '}small" data-action="placesView" data-view="lands" aria-pressed="${view === 'lands'}">Bible lands</button>
        <button type="button" class="btn ${view === 'israel' ? '' : 'ghost '}small" data-action="placesView" data-view="israel" aria-pressed="${view === 'israel'}">Israel and nearby</button>
      </div>
      <canvas class="places-map" id="placesMap" data-view="${view}" role="img" aria-label="Map of ${PLACES.places.length.toLocaleString()} places named in the Bible. Use the list below to choose a place."></canvas>
      <div class="field"><label for="placeQ">Find a place</label><input id="placeQ" type="search" placeholder="e.g. Bethlehem" autocomplete="off" spellcheck="false"></div>
      <div id="placeResults" aria-live="polite"></div>
      <h3>Most mentioned</h3><ul class="chip-list">${top.map(p => `<li><button type="button" class="chip" data-action="openGeo" data-i="${p.i}">${esc(p.label)} <span class="muted">${p.n}</span></button></li>`).join('')}</ul>
      <p class="hint">Locations from <a href="https://www.openbible.info/geo/" rel="noopener">OpenBible.info</a> (CC BY 4.0). Coastline from Natural Earth. Lighter dots are places whose location is less certain.</p>
      <div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>`];
  }
  const confText = (c) => (c === 2 ? 'Location known with confidence.' : c === 1 ? 'Location is likely but not certain.' : 'Location is uncertain.');
  async function openGeo(ref, opts = {}) {
    const d = await loadPlaces();
    const p = typeof ref === 'number' ? d.places[ref] : d.places.find(x => x.name === ref || x.label === ref);
    if (!p) return;
    const verses = Int32Array.from(decodePostings(p.vs));
    const mask = new Uint8Array(TOTAL);
    for (const v of verses) mask[v] = 1;
    track('geo/' + p.name, p.label);
    setFocus({ kind: 'words', query: p.label, verses, mask, start: verses[0], end: verses[verses.length - 1] + 1,
      entity: { type: 'geo', id: p.name, name: p.label, place: p } }, { zoom: true, ...opts });
  }
  el.panelBody.addEventListener('click', (e) => {
    const c = e.target.closest('canvas.places-map');
    if (!c || !c._hit) return;
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 14;
    for (const [hx, hy, i] of c._hit) { const dd = Math.hypot(hx - x, hy - y); if (dd < bd) { bd = dd; best = i; } }
    if (best !== null) openGeo(best).then(focusPanelHeading);
  });
  el.panelBody.addEventListener('input', (e) => {
    if (e.target.id !== 'placeQ' || !PLACES) return;
    const q = plain(e.target.value.trim()), box = $('placeResults');
    if (q.length < 2) { box.innerHTML = ''; return; }
    const hits = PLACES.places.filter(p => plain(p.label).includes(q)).sort((a, b) => (plain(b.label).startsWith(q) - plain(a.label).startsWith(q)) || b.n - a.n).slice(0, 20);
    box.innerHTML = hits.length ? `<ul class="conn-list">${hits.map(p => `<li><button type="button" class="conn-item" data-action="openGeo" data-i="${p.i}"><span class="label">${esc(p.label)} <span class="muted">${esc(p.type)}${p.conf < 2 ? ', location less certain' : ''}</span></span><span class="votes">${p.n} verse${p.n === 1 ? '' : 's'}</span></button></li>`).join('')}</ul>` : '<p class="muted">No places found.</p>';
  });

  // ---------- Shared connections: passages that two verses both link to ----------
  function neighbours(r) {
    const m = new Map();
    const add = (v, w) => { if (v >= r.start && v < r.end) return; m.set(v, (m.get(v) || 0) + w); };
    for (let i = 0; i < N; i++) {
      if (F[i] >= r.start && F[i] < r.end) for (let v = T[i]; v <= E[i]; v++) add(v, V[i]);
      else if (T[i] < r.end && E[i] >= r.start) add(F[i], V[i]);
    }
    return m;
  }
  function findShared(aText, bText, { push = true } = {}) {
    const a = parseReference(aText), b = parseReference(bText);
    state.mode = 'shared'; state.selected = -1; state.focus = null; state.journey = null;
    const S = state.shared = { aText, bText, error: '' };
    if (!a || a.error || !b || b.error) S.error = (a && a.error) || (b && b.error) || 'Enter two references, for example Psalm 23 and John 10.';
    else {
      const na = neighbours(a), nb = neighbours(b), list = [];
      for (const [v, w] of na) if (nb.has(v) && !(v >= b.start && v < b.end)) list.push([v, w + nb.get(v)]);
      list.sort((x, y) => y[1] - x[1]);
      let direct = false;
      for (let i = 0; i < N && !direct; i++) {
        const fa = F[i] >= a.start && F[i] < a.end, fb = F[i] >= b.start && F[i] < b.end;
        const ta = T[i] < a.end && E[i] >= a.start, tb = T[i] < b.end && E[i] >= b.start;
        direct = (fa && tb) || (fb && ta);
      }
      Object.assign(S, { aLabel: rangeLabel(a), bLabel: rangeLabel(b), list, direct, a, b });
      if (push) track('shared', `${aText} and ${bText}`);
    }
    updateNav(); drawBase(); renderPanel(); syncURL(push);
    announce(S.error || `${S.list.length} passage${S.list.length === 1 ? '' : 's'} connect to both ${S.aLabel} and ${S.bLabel}.`);
  }
  function sharedHTML() {
    const S = state.shared || {};
    let html = `<p>Pick two passages to find the passages that both of them link to. Good for spotting themes they share.</p>
      <form class="path-form" id="sharedForm">
        <div class="field"><label for="sharedA">First passage</label><input id="sharedA" type="search" list="bookList" value="${esc(S.aText || '')}" placeholder="e.g. Psalm 23" autocomplete="off"></div>
        <div class="field"><label for="sharedB">Second passage</label><input id="sharedB" type="search" list="bookList" value="${esc(S.bText || '')}" placeholder="e.g. John 10" autocomplete="off"></div>
        <button type="submit" class="btn">Find shared links</button>
      </form>
      <p class="hint">Try <button type="button" class="chip" data-action="sharedExample" data-a="Psalm 23" data-b="John 10">Psalm 23 and John 10</button>
      <button type="button" class="chip" data-action="sharedExample" data-a="Genesis 22" data-b="Hebrews 11">Genesis 22 and Hebrews 11</button></p>`;
    if (S.error) html += `<p class="field-error" role="alert">${esc(S.error)}</p>`;
    else if (S.list) {
      html += `<h3>${S.list.length.toLocaleString()} shared passage${S.list.length === 1 ? '' : 's'}</h3>
        <p>${S.direct ? `${esc(S.aLabel)} and ${esc(S.bLabel)} also link to each other directly.` : `${esc(S.aLabel)} and ${esc(S.bLabel)} do not link to each other directly.`}</p>`;
      if (S.list.length) {
        html += `<ol class="verse-list shared-list">${S.list.slice(0, 40).map(([v]) => `<li><button type="button" class="link-btn" data-action="focusVerse" data-v="${v}">${esc(refLabel(v))}</button> ${miniRead(v)}</li>`).join('')}</ol>
          ${S.list.length > 40 ? `<p class="hint">Showing the 40 strongest of ${S.list.length.toLocaleString()}.</p>` : ''}
          <div class="actions"><button type="button" class="btn small" data-action="sharedMap">Show on the map</button>${shareButtons()}</div>`;
      } else html += '<p class="muted">No passages link to both. Try whole chapters instead of single verses.</p>';
    }
    html += `<div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="path">How are these connected?</button><button type="button" class="btn ghost small" data-action="mode" data-mode="explore">Back to explore</button></div>`;
    return ['Shared connections', html];
  }
  function sharedOnMap() {
    const S = state.shared;
    if (!S || !S.list) return;
    const vs = new Set(S.list.map(x => x[0]));
    for (let v = S.a.start; v < S.a.end; v++) vs.add(v);
    for (let v = S.b.start; v < S.b.end; v++) vs.add(v);
    const verses = Int32Array.from([...vs].sort((x, y) => x - y)), mask = new Uint8Array(TOTAL);
    for (const v of verses) mask[v] = 1;
    setFocus({ kind: 'words', query: `${S.aLabel} and ${S.bLabel}`, verses, mask, start: verses[0], end: verses[verses.length - 1] + 1,
      entity: { type: 'shared', id: `${S.aText}~${S.bText}`, name: `Shared by ${S.aLabel} and ${S.bLabel}` } }, { zoom: true });
  }
  el.panelBody.addEventListener('submit', (e) => {
    if (e.target.id !== 'sharedForm') return;
    e.preventDefault();
    findShared($('sharedA').value, $('sharedB').value);
  });

  // ---------- Collections ----------
  const getCollections = () => store.get('collections', []);
  const saveCollections = (c) => store.set('collections', c);
  let colPlay = null;   // { items, name, idx } while stepping through a collection
  function openAddToCollection() {
    const entry = currentEntry();
    if (!entry) { announce('Open a verse, connection, journey step or search first.'); return; }
    const cols = getCollections();
    $('colSelect').innerHTML = cols.map((c, n) => `<option value="${n}">${esc(c.name)} (${c.items.length})</option>`).join('') + '<option value="new">New collection…</option>';
    $('colSelect').value = cols.length ? '0' : 'new';
    $('colNewWrap').hidden = !!cols.length;
    $('colNewName').value = '';
    $('colItemLabel').textContent = entry.label;
    $('collectionDialog').showModal();
  }
  $('colSelect').addEventListener('change', () => { $('colNewWrap').hidden = $('colSelect').value !== 'new'; if (!$('colNewWrap').hidden) $('colNewName').focus(); });
  $('colAdd').addEventListener('click', (e) => {
    e.preventDefault();
    const entry = currentEntry(), cols = getCollections();
    let n = $('colSelect').value;
    if (n === 'new') {
      const name = $('colNewName').value.trim();
      if (!name) { $('colNewName').focus(); return; }
      cols.push({ id: Date.now().toString(36), name, items: [] }); n = cols.length - 1;
    }
    const col = cols[+n];
    if (!col.items.some(x => x.url === entry.url)) col.items.push(entry);
    saveCollections(cols);
    $('collectionDialog').close();
    announce(`Added to ${col.name}.`); flash('Added');
    track('collection/add');
  });
  function encodeCollection(col) {
    const json = JSON.stringify({ n: col.name, i: col.items.map(x => [x.label, x.url]) });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeCollection(s) {
    try {
      const json = decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
      const o = JSON.parse(json);
      return { name: String(o.n).slice(0, 80), items: (o.i || []).slice(0, 50).map(([label, url]) => ({ label: String(label).slice(0, 120), url: String(url).startsWith('?') ? String(url) : '?view=map' })) };
    } catch { return null; }
  }
  function collectionsHTML() {
    const cols = getCollections();
    let html = '<p>Group connections, verses, journey steps and searches into a collection, for a sermon, a lesson or a small group. Use “Add to collection” on any view.</p>';
    if (!cols.length) html += '<p class="muted">You have no collections yet.</p>';
    else html += `<ul class="journey-list">${cols.map((c, n) => `<li class="journey-card"><h3>${esc(c.name)}</h3><p>${c.items.length} item${c.items.length === 1 ? '' : 's'}</p>
      <div class="actions tight"><button type="button" class="btn small" data-action="openCollection" data-n="${n}">Open<span class="sr-only"> ${esc(c.name)}</span></button>
      <button type="button" class="btn ghost small" data-action="deleteCollection" data-n="${n}">Delete<span class="sr-only"> ${esc(c.name)}</span></button></div></li>`).join('')}</ul>`;
    return ['Collections', html + '<div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="study">Back to study</button></div>'];
  }
  function collectionHTML() {
    const col = state.collection;
    let html = col.shared ? '<p class="muted">Someone shared this collection with you.</p>' : '';
    html += `<ol class="series-list">${col.items.map((x, n) => `<li><p class="series-title">${esc(x.label)}</p><div class="actions tight">
      <button type="button" class="btn small" data-action="playCollection" data-idx="${n}">Open</button>
      ${col.shared ? '' : `<button type="button" class="btn ghost small" data-action="removeItem" data-idx="${n}">Remove<span class="sr-only"> ${esc(x.label)}</span></button>`}</div></li>`).join('')}</ol>`;
    if (!col.items.length) html += '<p class="muted">This collection is empty.</p>';
    html += `<div class="actions">${col.items.length ? '<button type="button" class="btn" data-action="playCollection" data-idx="0">Step through</button>' : ''}
      <button type="button" class="btn ghost small" data-action="shareCollection">Share collection</button>
      ${col.shared ? '<button type="button" class="btn ghost small" data-action="keepCollection">Save to my collections</button>' : ''}
      <button type="button" class="btn ghost small" data-action="mode" data-mode="collections">All collections</button></div>`;
    return [col.name, html];
  }
  function openCollection(col, { push = true } = {}) {
    state.mode = 'collection'; state.collection = col; state.selected = -1; state.focus = null; state.journey = null;
    updateNav(); drawBase(); renderPanel(); syncURL(push);
  }
  function renderColBar() {
    const bar = $('colBar');
    bar.hidden = !colPlay;
    if (!colPlay) return;
    $('colBarText').textContent = `${colPlay.name} · ${colPlay.idx + 1} of ${colPlay.items.length}`;
    $('colPrev').disabled = colPlay.idx === 0;
    $('colNext').disabled = colPlay.idx === colPlay.items.length - 1;
  }
  async function playCollection(idx) {
    const col = state.collection || colPlay?.col;
    colPlay = { col, name: col.name, items: col.items, idx };
    history.pushState(null, '', col.items[idx].url);
    await applyLocation();
    renderColBar();
    focusPanelHeading();
  }
  $('colPrev').addEventListener('click', () => playCollection(colPlay.idx - 1));
  $('colNext').addEventListener('click', () => playCollection(colPlay.idx + 1));
  $('colExit').addEventListener('click', () => { const col = colPlay.col; colPlay = null; renderColBar(); openCollection(col); focusPanelHeading(); });

  // ---------- Calendar reminders for reading plans ----------
  function planCalendar() {
    const plan = PLANS.find(p => p.id === state.plan.id), days = planDays(plan);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const esc2 = (x) => String(x).replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
    const start = new Date(); start.setDate(start.getDate() + 1);
    const base = location.origin + location.pathname;
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Bible Connections//Reading plan//EN\r\nCALSCALE:GREGORIAN\r\n';
    const done = new Set(planProgress(plan.id).done);
    let n = 0;
    days.forEach((day, d) => {
      if (done.has(d)) return;
      const date = new Date(start); date.setDate(start.getDate() + n++);
      const url = `${base}?plan=${plan.id}&day=${d + 1}`;
      ics += `BEGIN:VEVENT\r\nUID:${plan.id}-${d + 1}-${fmt(date)}@bibleconnections\r\nDTSTAMP:${fmt(new Date())}T000000Z\r\nDTSTART:${fmt(date)}T070000\r\nDURATION:PT15M\r\n`
        + `SUMMARY:${esc2(`${nameOf(plan)}: day ${d + 1}`)}\r\nDESCRIPTION:${esc2(`${day.title ? day.title + '\n' : ''}${url}`)}\r\nURL:${url}\r\n`
        + 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Bible Connections reading\r\nTRIGGER:PT0M\r\nEND:VALARM\r\nEND:VEVENT\r\n';
    });
    ics += 'END:VCALENDAR\r\n';
    downloadBlob(new Blob([ics], { type: 'text/calendar' }), `bible-connections-${plan.id}.ics`);
    track('plan/calendar', plan.id);
    announce('Calendar file downloaded. Open it to add a daily reminder at 7 am.');
  }

  // ---------- Story image (tall image for social media stories) ----------
  function wrapText(ctx, text, maxW) {
    const words = text.split(/\s+/), lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  async function storyImage(i) {
    const W = 1080, H = 1920, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const font = (w, s) => `${w} ${s}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // a single glowing arc between the two passages
    const g = ctx.createLinearGradient(140, 0, W - 140, 0);
    g.addColorStop(0, '#da77f2'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, '#38d9a9');
    ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(W / 2, 760, W / 2 - 140, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#ffd60a';
    for (const x of [140, W - 140]) { ctx.beginPath(); ctx.arc(x, 760, 18, 0, Math.PI * 2); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#5eb0ff'; ctx.font = font(700, 34);
    ctx.fillText(tr('Connection').toUpperCase(), W / 2, 200);
    ctx.fillStyle = '#fff'; ctx.font = font(700, 64);
    ctx.fillText(refLabel(F[i]), W / 2, 880);
    ctx.fillStyle = 'rgba(235,235,245,.7)'; ctx.font = font(500, 40);
    ctx.fillText(tr('connects to'), W / 2, 950);
    ctx.fillStyle = '#fff'; ctx.font = font(700, 64);
    ctx.fillText(refLabel(T[i], E[i]), W / 2, 1040);
    const n = noteMap.get(i);
    if (n) {
      ctx.font = font(400, 42); ctx.fillStyle = 'rgba(235,235,245,.9)';
      wrapText(ctx, n.text, W - 200).slice(0, 7).forEach((l, k) => ctx.fillText(l, W / 2, 1160 + k * 60));
    }
    ctx.font = font(700, 44); ctx.fillStyle = '#fff'; ctx.fillText('Bible Connections', W / 2, H - 170);
    ctx.font = font(400, 30); ctx.fillStyle = 'rgba(235,235,245,.7)';
    ctx.fillText(`${location.host}${location.pathname}`, W / 2, H - 120);
    ctx.font = font(400, 24); ctx.fillText(tr('Cross references: OpenBible.info (CC BY 4.0)'), W / 2, H - 76);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'bible-connection-story.png', { type: 'image/png' });
    track('share/story');
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file] }); return; } catch { /* fall back to download */ }
    }
    downloadBlob(blob, file.name);
    announce('Story image saved.');
  }

  // ---------- Describe this view (plain-language summary) ----------
  function describeView() {
    const fmt = (n) => n.toLocaleString();
    const topBooks = (list, side) => {
      const count = new Map();
      for (const i of list) for (const v of side(i)) { const b = verseBook[v]; count.set(b, (count.get(b) || 0) + 1); }
      return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b, n]) => `${BOOKS[b].name} (${fmt(n)})`);
    };
    if (state.selected >= 0) {
      const i = state.selected, n = noteMap.get(i);
      const same = verseBook[F[i]] === verseBook[T[i]];
      const testament = (v) => (v < NT_START ? 'Old' : 'New');
      return `${refLabel(F[i])} in the ${testament(F[i])} Testament links to ${refLabel(T[i], E[i])} in the ${testament(T[i])} Testament${same ? ', in the same book' : ''}. ${V[i]} people confirmed this link.${n ? ` It is a ${n.type.toLowerCase()} connection.` : ''}`;
    }
    if (state.focus && focusList.length) {
      const f = state.focus;
      const inside = (v) => (f.mask ? f.mask[v] : v >= f.start && v < f.end);
      const others = topBooks(focusList, (i) => [inside(F[i]) ? T[i] : F[i]]);
      const nt = [...focusList].filter(i => (inside(F[i]) ? T[i] : F[i]) >= NT_START).length;
      return `${rangeLabel(f)} has ${fmt(focusList.length)} connections. Most lead to ${others.join(', ')}. ${Math.round(nt / focusList.length * 100)}% reach the New Testament.`;
    }
    if (state.focus) return `${rangeLabel(state.focus)} has no connections with the current filters.`;
    const books = topBooks(filtered, (i) => [F[i], T[i]]);
    return `Showing ${fmt(filtered.length)} connections. The most connected books are ${books.join(', ')}.`;
  }
  function describeAloud() {
    const text = tr(describeView());
    announce(text);
    flash(text.length > 90 ? text.slice(0, 87) + '…' : text);
    track('describe');
  }
  $('describeBtn').addEventListener('click', describeAloud);

  // ---------- Error reports (counted privately with visit stats, at most 3 per visit) ----------
  let errorsSent = 0;
  function reportError(msg) {
    if (errorsSent >= 3) return;
    errorsSent++;
    track('error', String(msg || 'unknown').slice(0, 120));
  }
  window.addEventListener('error', (e) => reportError(e.message));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason && (e.reason.message || e.reason)));

  // ---------- Insights ----------
  let statsCache = null;
  function computeStats() {
    if (statsCache) return statsCache;
    const deg = new Uint32Array(TOTAL), chap = new Uint32Array(chapters.length);
    const chapOf = new Uint16Array(TOTAL);
    chapters.forEach((c, n) => { for (let v = 0; v < c.count; v++) chapOf[c.start + v] = n; });
    const nc = catKeys.length, matrix = Array.from({ length: nc }, () => new Uint32Array(nc));
    const catIdx = BOOKS.map(b => catKeys.indexOf(b.cat));
    let otot = 0, otnt = 0, ntnt = 0;
    for (const i of filtered) {
      const f = F[i], t = T[i];
      deg[f]++; deg[t]++;
      chap[chapOf[f]]++; chap[chapOf[t]]++;
      const a = catIdx[verseBook[f]], b = catIdx[verseBook[t]];
      matrix[Math.min(a, b)][Math.max(a, b)]++;
      const fo = f < NT_START, to = t < NT_START;
      if (fo && to) otot++; else if (!fo && !to) ntnt++; else otnt++;
    }
    const top = (arr, n) => Array.from(arr.keys()).sort((a, b) => arr[b] - arr[a]).slice(0, n).filter(k => arr[k] > 0);
    statsCache = { deg, chap, matrix, otot, otnt, ntnt, topVerses: top(deg, 15), topChapters: top(chap, 10) };
    return statsCache;
  }
  function insightsHTML() {
    const s = computeStats();
    const fmt = (n) => n.toLocaleString();
    const total = Math.max(1, filtered.length);
    const pct = (n) => Math.round(n / total * 100) + '%';
    let html = `<p class="muted">Based on the ${fmt(filtered.length)} connections that match your current filters.</p>
      <dl class="stat-grid">
        <div><dt>Within the Old Testament</dt><dd>${fmt(s.otot)} <span>${pct(s.otot)}</span></dd></div>
        <div><dt>Old to New Testament</dt><dd>${fmt(s.otnt)} <span>${pct(s.otnt)}</span></dd></div>
        <div><dt>Within the New Testament</dt><dd>${fmt(s.ntnt)} <span>${pct(s.ntnt)}</span></dd></div>
      </dl>
      <h3>Most connected verses</h3><ol class="rank-list">`;
    const maxV = s.deg[s.topVerses[0]] || 1;
    for (const v of s.topVerses) html += `<li><button type="button" class="link-btn" data-action="focusVerse" data-v="${v}">${esc(refLabel(v))}</button><span class="bar" style="--w:${s.deg[v] / maxV * 100}%" aria-hidden="true"></span><span class="num">${fmt(s.deg[v])}</span></li>`;
    html += `</ol><h3>Most connected chapters</h3><ol class="rank-list">`;
    const maxC = s.chap[s.topChapters[0]] || 1;
    for (const c of s.topChapters) {
      const ch = chapters[c];
      html += `<li><button type="button" class="link-btn" data-action="focusChapter" data-c="${c}">${esc(BOOKS[ch.book].name)} ${ch.chapter}</button><span class="bar" style="--w:${s.chap[c] / maxC * 100}%" aria-hidden="true"></span><span class="num">${fmt(s.chap[c])}</span></li>`;
    }
    html += `</ol><h3 id="heatTitle">Connections between categories</h3>
      <p class="hint">Stronger color means more connections. Select a cell to show only those connections on the map.</p>
      <div class="heat-wrap" tabindex="0" role="region" aria-labelledby="heatTitle"><table class="heat"><caption class="sr-only">Number of connections between each pair of categories</caption><thead><tr><td></td>`;
    const short = { law: 'Law', history: 'Hist', wisdom: 'Wis', major: 'MjP', minor: 'MnP', gospels: 'Gos', acts: 'Acts', paul: 'Paul', general: 'GenL', revelation: 'Rev' };
    catKeys.forEach(k => { html += `<th scope="col"><abbr title="${esc(CATEGORIES[k].name)}">${short[k]}</abbr></th>`; });
    html += '</tr></thead><tbody>';
    let max = 1;
    for (let a = 0; a < catKeys.length; a++) for (let b = a; b < catKeys.length; b++) max = Math.max(max, s.matrix[a][b]);
    catKeys.forEach((ka, a) => {
      html += `<tr><th scope="row">${esc(CATEGORIES[ka].name)}</th>`;
      catKeys.forEach((kb, b) => {
        const n = s.matrix[Math.min(a, b)][Math.max(a, b)];
        const t = n ? Math.log(n + 1) / Math.log(max + 1) : 0;
        const shown = n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(n);
        html += `<td><button type="button" class="heat-cell" style="--t:${t.toFixed(3)}" data-action="heat" data-a="${ka}" data-b="${kb}"
          aria-label="${shown}: ${esc(CATEGORIES[ka].name)} and ${esc(CATEGORIES[kb].name)}, ${fmt(n)} connections"><span>${shown}</span></button></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div><div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="explore">Back to explore</button></div>';
    return ['Insights', html];
  }

  // ---------- Share / copy ----------
  function shareInfo() {
    const url = location.href;
    if (state.mode === 'journey') {
      const s = currentStep();
      return { title: s.title, text: `${s.title}: ${refLabel(s.ia)} and ${refLabel(s.ib)}\n${s.note}\n${url}`, url };
    }
    if (state.selected >= 0) {
      const i = state.selected, n = noteMap.get(i);
      const text = `${refLabel(F[i])} ↔ ${refLabel(T[i], E[i])}` + (n ? `\n${n.text}` : '') +
        `\n${refLabel(F[i])}: ${bibleUrl(F[i])}\n${refLabel(T[i], E[i])}: ${bibleUrl(T[i], E[i])}`
        + (second() ? `\n${vLabel(second())}: ${bibleUrl(F[i], F[i], false, second())} ${bibleUrl(T[i], T[i], false, second())}` : '') + `\n${url}`;
      return { title: 'Bible connection', text, url };
    }
    if (state.focus) {
      const refs = Array.from(focusList.slice(0, 10), j => `${refLabel(F[j])} ↔ ${refLabel(T[j], E[j])}`).join('\n');
      return { title: `${rangeLabel(state.focus)} connections`, text: `Connections for ${rangeLabel(state.focus)}:\n${refs}\n${url}`, url };
    }
    return { title: 'Bible Connections', text: `Explore the connections across the Bible\n${url}`, url };
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); announce('Copied to clipboard.'); flash('Copied'); }
    catch { announce('Copy failed. Your browser blocked clipboard access.'); flash('Copy failed'); }
  }
  async function share() {
    const info = shareInfo();
    if (navigator.share) { try { await navigator.share({ title: info.title, url: info.url }); } catch { /* cancelled */ } }
    else copyText(info.url);
  }
  let flashT = 0;
  function flash(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('aria-hidden', 'true'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(() => t.classList.remove('show'), 1600);
  }

  // ---------- Panel events ----------
  el.panelBody.addEventListener('click', (e) => {
    const tracked = e.target.closest('a[data-track]');
    if (tracked) track(tracked.dataset.track);
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.ref && !btn.dataset.action) { selectRef(+btn.dataset.ref); focusPanelHeading(); return; }
    const a = btn.dataset.action;
    if (a === 'more') { listShown += PAGE; renderPanel(); el.panelBody.querySelectorAll('.conn-item')[listShown - PAGE]?.focus(); }
    else if (a === 'moreVerses') { versesShown += 40; renderPanel(); el.panelBody.querySelectorAll('.verse-list .link-btn')[versesShown - 40]?.focus(); }
    else if (a === 'zoomRef') zoomToRef(state.selected);
    else if (a === 'focusVerse') { const v = +btn.dataset.v; setFocus({ kind: 'verse', book: verseBook[v], start: v, end: v + 1 }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'focusChapter') { const c = chapters[+btn.dataset.c]; setFocus({ kind: 'chapter', book: c.book, chapter: c.chapter, start: c.start, end: c.start + c.count }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'focusBook') { const b = BOOKS[+btn.dataset.b]; setFocus({ kind: 'book', book: +btn.dataset.b, start: b.start, end: b.end }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'zoomFocus') zoomToRange(state.focus.start, state.focus.end, state.focus.kind === 'verse' ? 40 : 0.6);
    else if (a === 'deselect') { state.selected = -1; drawBase(); renderPanel(); syncURL(true); focusPanelHeading(); }
    else if (a === 'clear') { clearAll(); focusPanelHeading(); }
    else if (a === 'search') { el.search.value = btn.dataset.q; runSearch(); }
    else if (a === 'mode') setMode(btn.dataset.mode);
    else if (a === 'startJourney') { startJourney(+btn.dataset.j); focusPanelHeading(); }
    else if (a === 'stepNext') { goStep(1); focusPanelHeading(); }
    else if (a === 'stepPrev') { goStep(-1); focusPanelHeading(); }
    else if (a === 'present') enterPresenter();
    else if (a === 'qr') openQR();
    else if (a === 'openWord') { openWord(btn.dataset.code).then(focusPanelHeading); }
    else if (a === 'exportNotes') exportNotes();
    else if (a === 'deleteNote') { const all = getNotes(); delete all[btn.dataset.key]; store.set('notes', all); renderPanel(); announce('Note deleted.'); }
    else if (a === 'placesView') { state.placesView = btn.dataset.view; renderPanel(); }
    else if (a === 'openGeo') { openGeo(+btn.dataset.i).then(focusPanelHeading); }
    else if (a === 'sharedExample') { findShared(btn.dataset.a, btn.dataset.b); focusPanelHeading(); }
    else if (a === 'sharedMap') { sharedOnMap(); focusPanelHeading(); }
    else if (a === 'openSense') { openSense(btn.dataset.code, btn.dataset.sense).then(focusPanelHeading); }
    else if (a === 'addToCollection') openAddToCollection();
    else if (a === 'openCollection') { openCollection(getCollections()[+btn.dataset.n]); focusPanelHeading(); }
    else if (a === 'deleteCollection') {
      const cols = getCollections(), c = cols[+btn.dataset.n];
      if (confirm(tr(`Delete the collection “${c.name}”?`))) { cols.splice(+btn.dataset.n, 1); saveCollections(cols); renderPanel(); announce('Collection deleted.'); }
    }
    else if (a === 'removeItem') {
      const cols = getCollections(), c = cols.find(x => x.name === state.collection.name && x.items.length === state.collection.items.length);
      state.collection.items.splice(+btn.dataset.idx, 1);
      if (c) { c.items = state.collection.items; saveCollections(cols); }
      renderPanel(); syncURL(); announce('Removed from collection.');
    }
    else if (a === 'playCollection') playCollection(+btn.dataset.idx);
    else if (a === 'shareCollection') { copyText(location.href); track('collection/share'); }
    else if (a === 'keepCollection') {
      const cols = getCollections(); cols.push({ id: Date.now().toString(36), name: state.collection.name, items: state.collection.items });
      saveCollections(cols); state.collection.shared = false; renderPanel(); announce('Saved to your collections.');
    }
    else if (a === 'planCalendar') planCalendar();
    else if (a === 'story') storyImage(btn.dataset.ref !== undefined ? +btn.dataset.ref : state.selected);
    else if (a === 'embed') openEmbed();
    else if (a === 'poster') { $('posterDialog').showModal(); }
    else if (a === 'openPlan') { openPlan(btn.dataset.plan, +btn.dataset.day); track('plan/' + btn.dataset.plan); focusPanelHeading(); }
    else if (a === 'planDay') { openPlan(state.plan.id, +btn.dataset.day); focusPanelHeading(); }
    else if (a === 'planDone') {
      const done = btn.getAttribute('aria-pressed') !== 'true';
      setPlanDone(state.plan.id, state.plan.day, done);
      if (done) track('plan/day-complete', state.plan.id);
      renderPanel(); el.panelBody.querySelector('[data-action=planDone]')?.focus();
      announce(done ? 'Day marked complete.' : 'Day marked not complete.');
    }
    else if (a === 'entity') { openEntity(btn.dataset.type, btn.dataset.id).then(focusPanelHeading); }
    else if (a === 'answer') answerQuestion(+btn.dataset.v);
    else if (a === 'nextQuestion') { newQuestion(); drawBase(); renderPanel(); el.panelBody.querySelector('.answer')?.focus(); }
    else if (a === 'resetGame') { store.set('game', { right: 0, total: 0, streak: 0, best: 0 }); renderPanel(); announce('Score reset.'); }
    else if (a === 'gotoRef') { if (btn.dataset.cotd) track('cotd'); selectRef(+btn.dataset.ref, { zoom: true }); focusPanelHeading(); }
    else if (a === 'save') toggleSave();
    else if (a === 'image') exportImage();
    else if (a === 'goto') goTo(btn.dataset.url);
    else if (a === 'unsave') { removeSaved(btn.dataset.url); renderPanel(); el.panelBody.querySelector('[data-action=goto]')?.focus(); }
    else if (a === 'clearRecent') { store.set('recent', []); renderPanel(); announce('Recently viewed cleared.'); }
    else if (a === 'replayPath') { animatePath(); }
    else if (a === 'presentJourney') { startJourney(+btn.dataset.j); enterPresenter(); }
    else if (a === 'focusRef') { const r = parseReference(btn.dataset.q); if (r && !r.error) { setFocus(r, { zoom: true }); focusPanelHeading(); } }
    else if (a === 'share') share();
    else if (a === 'copy') copyText(shareInfo().text);
    else if (a === 'heat') {
      state.from = 'cat:' + btn.dataset.a; state.to = 'cat:' + btn.dataset.b;
      el.fromSel.value = state.from; el.toSel.value = state.to;
      $('filtersBox').open = true;
      state.mode = 'explore'; state.focus = null; state.selected = -1; updateNav();
      applyFilters(); resetView(); syncURL(true); focusPanelHeading();
      announce(`Showing ${filtered.length.toLocaleString()} connections between ${CATEGORIES[btn.dataset.a].name} and ${CATEGORIES[btn.dataset.b].name}.`);
    }
  });
  function scrollPanel() {
    const mobile = matchMedia('(max-width: 860px)').matches;
    if (mobile) el.panel.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    else el.panel.parentElement.scrollTop = el.panel.getBoundingClientRect().top - el.panel.parentElement.getBoundingClientRect().top + el.panel.parentElement.scrollTop - 8;
  }
  function focusPanelHeading() {
    requestAnimationFrame(() => { el.panel.focus({ preventScroll: true }); scrollPanel(); });
  }
  function setMode(mode) {
    if (colPlay && mode !== 'explore') { colPlay = null; renderColBar(); }
    if (mode !== 'explore') state.selected = -1;
    state.mode = mode;
    if (mode !== 'journey') state.journey = null;
    updateNav(); drawBase(); renderPanel(); syncURL(true); focusPanelHeading();
  }
  function updateNav() {
    $('homeBtn').setAttribute('aria-pressed', String(!landing.hidden));
    document.querySelectorAll('[data-nav]').forEach(b => {
      const on = state.mode === b.dataset.nav || (b.dataset.nav === 'journeys' && state.mode === 'journey') || (b.dataset.nav === 'study' && STUDY_MODES.includes(state.mode));
      b.setAttribute('aria-pressed', String(on));
    });
  }

  // ---------- Controls ----------
  function buildSelects() {
    const opts = [`<option value="all">Whole Bible</option>`,
      `<optgroup label="Testaments"><option value="ot">Old Testament</option><option value="nt">New Testament</option></optgroup>`,
      `<optgroup label="Categories">${catKeys.map(k => `<option value="cat:${k}">${CATEGORIES[k].name}</option>`).join('')}</optgroup>`,
      `<optgroup label="Books">${BOOKS.map((b, i) => `<option value="book:${i}">${esc(b.name)}</option>`).join('')}</optgroup>`].join('');
    el.fromSel.innerHTML = opts; el.toSel.innerHTML = opts;
    el.theme.innerHTML += THEMES.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    el.bookList.innerHTML = BOOKS.map(b => `<option value="${esc(b.name)}">`).join('');
    if (!VERSIONS[settings.version]) settings.version = 'NIV';
    if (settings.version2 && !VERSIONS[settings.version2]) settings.version2 = '';
    const langs = [...new Set([...Object.keys(LANG_NAMES), ...Object.values(VERSIONS).map(v => v.lang || 'en')])];
    const all = langs.map(lang => {
      const vs = Object.entries(VERSIONS).filter(([, v]) => (v.lang || 'en') === lang);
      if (!vs.length) return '';
      const [en, native] = LANG_NAMES[lang] || [lang, lang];
      const label = en === native ? en : `${native} (${en})`;
      return `<optgroup label="${esc(label)}" data-search="${esc(en + ' ' + native + ' ' + lang)}">${vs.map(([k, v]) => `<option value="${k}" data-search="${esc(k + ' ' + (v.code || ''))}">${esc(v.label || k)}: ${esc(v.name)}</option>`).join('')}</optgroup>`;
    }).join('');
    for (const id of ['versionSel', 'readIn']) $(id).innerHTML = all;
    for (const id of ['version2Sel', 'compareWith']) $(id).innerHTML = '<option value="">None</option>' + all;
    if (!pickers.length) for (const id of ['readIn', 'compareWith', 'versionSel', 'version2Sel']) pickers.push(versionPicker($(id)));
    syncVersionSelects();
  }

  el.fromSel.addEventListener('change', () => { state.from = el.fromSel.value; applyFilters(); syncURL(true); });
  el.toSel.addEventListener('change', () => { state.to = el.toSel.value; applyFilters(); syncURL(true); });
  el.theme.addEventListener('change', () => {
    if (el.theme.value) track('theme/' + el.theme.value); state.theme = el.theme.value; state.focus = null; state.selected = -1; state.mode = 'explore'; state.journey = null; updateNav(); applyFilters(); syncURL(true); });
  el.notesOnly.addEventListener('change', () => { state.notesOnly = el.notesOnly.checked; applyFilters(); syncURL(true); });
  let votesT = 0;
  el.votes.addEventListener('input', () => {
    state.minVotes = +el.votes.value;
    el.votesOut.textContent = el.votes.value;
    clearTimeout(votesT);
    votesT = setTimeout(() => { applyFilters(); syncURL(); }, 60);
  });
  el.controls.addEventListener('change', (e) => {
    if (e.target.name === 'order') {
      state.order = e.target.value; setOrder(state.order); updateCount();
      resetView(false); drawBase(); renderPanel(); syncURL(true);
      track('order/' + state.order);
      announce(state.order === 'chrono' ? 'Books arranged in approximate chronological order.' : 'Books arranged in Bible order.');
      return;
    }
    if (e.target.name === 'colorMode') { state.colorMode = e.target.value; renderLegend(); updateCount(); drawBase(); renderPanel(); syncURL(); }
  });
  el.controls.addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });

  async function runSearch() {
    const q = el.search.value.trim();
    el.searchError.textContent = '';
    if (!q) return;
    const quoted = /^["“].*["”]$/.test(q);
    const r = quoted ? null : parseReference(q);
    if (r && r.error) { el.searchError.textContent = r.error; return; }
    if (r) { setFocus(r, { zoom: true }); focusPanelHeading(); return; }
    const words = await wordSearch(q.replace(/["“”]/g, ''));
    if (!words) return;
    setFocus(words, { zoom: true });
    focusPanelHeading();
  }
  async function wordSearch(q) {
    const terms = (q.toLowerCase().match(/[a-z]+/g) || []).filter(t => t.length >= 3);
    if (!terms.length) { el.searchError.textContent = 'Type a reference like John 3:16, or a word with at least 3 letters.'; return null; }
    let idx;
    try { idx = await loadWords(); }
    catch { el.searchError.textContent = 'Word search could not load. Check your connection and try again.'; return null; }
    const keys = Object.keys(idx);
    let result = null;
    for (const t of terms) {
      // match the word and its longer forms (shepherd, shepherds, shepherding)
      const set = new Set();
      for (const k of keys) if (k === t || (k.startsWith(t) && k.length - t.length <= 4)) for (const v of decodePostings(idx[k])) set.add(v);
      result = result ? new Set([...result].filter(v => set.has(v))) : set;
      if (!result.size) break;
    }
    if (!result || !result.size) { el.searchError.textContent = `No verses found for "${q}". Try another word, or a reference like John 3:16.`; return null; }
    const verses = Int32Array.from(result).sort();
    const mask = new Uint8Array(TOTAL);
    for (const v of verses) mask[v] = 1;
    return { kind: 'words', query: terms.join(' '), verses, mask, start: verses[0], end: verses[verses.length - 1] + 1 };
  }

  // ---------- Translations: one to read in, and an optional one to compare with ----------
  // Searchable translation picker (ARIA combobox). The original <select> stays as the source of truth.
  const fold = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function versionPicker(sel) {
    const wrap = document.createElement('div'); wrap.className = 'vpick';
    const input = document.createElement('input');
    const list = document.createElement('ul');
    input.type = 'text'; input.id = sel.id + 'Pick'; input.className = 'vpick-input';
    input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'Type a language or translation';
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', sel.id + 'List');
    list.id = sel.id + 'List'; list.className = 'vpick-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
    const label = document.querySelector(`label[for="${sel.id}"]`);
    if (label) { label.htmlFor = input.id; list.setAttribute('aria-label', label.textContent); }
    sel.hidden = true; sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel.after(wrap); wrap.append(input, list);
    let items = [], active = -1;
    const sync = () => { const o = sel.selectedOptions[0]; input.value = o ? o.textContent : ''; };
    const setActive = (i) => {
      active = i;
      list.querySelectorAll('[role=option]').forEach(li => li.classList.toggle('active', +li.dataset.i === i));
      const li = i >= 0 && list.querySelector(`[data-i="${i}"]`);
      if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    };
    const render = (q) => {
      const f = fold(q.trim()); items = []; let html = '';
      const opt = (o) => { items.push(o); const i = items.length - 1; return `<li role="option" id="${list.id}-${i}" data-i="${i}" aria-selected="${o.selected}">${esc(o.textContent)}</li>`; };
      for (const node of sel.children) {
        if (node.tagName === 'OPTION') { if (!f || fold(node.textContent).includes(f)) html += opt(node); continue; }
        const groupHit = f && fold(node.label + ' ' + (node.dataset.search || '')).includes(f);
        const opts = [...node.children].filter(o => !f || groupHit || fold(o.textContent + ' ' + (o.dataset.search || '')).includes(f));
        if (opts.length) html += `<li role="presentation" class="vpick-group">${esc(node.label)}</li>` + opts.map(opt).join('');
      }
      list.innerHTML = html || '<li role="presentation" class="vpick-empty">No translations match</li>';
      const cur = items.indexOf(sel.selectedOptions[0]);
      setActive(!f && cur >= 0 ? cur : (items.length ? 0 : -1));
    };
    const open = () => { if (!list.hidden) return; render(''); list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); sync(); };
    const choose = (o) => { const changed = sel.value !== o.value; sel.value = o.value; close(); if (changed) sel.dispatchEvent(new Event('change', { bubbles: true })); };
    input.addEventListener('focus', () => { open(); input.select(); });
    input.addEventListener('click', open);
    input.addEventListener('input', () => { if (list.hidden) { list.hidden = false; input.setAttribute('aria-expanded', 'true'); } render(input.value); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (list.hidden) { open(); return; }
        if (items.length) setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
      } else if (e.key === 'Enter') {
        if (!list.hidden) { e.preventDefault(); if (active >= 0) choose(items[active]); }
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); input.select(); }
      } else if (e.key === 'Tab') close();
    });
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => { const li = e.target.closest('[role=option]'); if (li) choose(items[+li.dataset.i]); });
    wrap.addEventListener('focusout', (e) => { if (!wrap.contains(e.relatedTarget)) close(); });
    sync();
    return { sync };
  }
  function syncVersionSelects() {
    $('versionSel').value = $('readIn').value = settings.version;
    $('version2Sel').value = $('compareWith').value = settings.version2 || '';
    pickers.forEach(p => p.sync());
  }
  function setVersions(v1, v2) {
    settings.version = VERSIONS[v1] ? v1 : settings.version;
    settings.version2 = v2 && VERSIONS[v2] && v2 !== settings.version ? v2 : '';
    store.set('version', settings.version); store.set('version2', settings.version2);
    syncVersionSelects();
    renderPanel();
    if (!landing.hidden) buildLanding();
    track('translation/' + settings.version + (settings.version2 ? '+' + settings.version2 : ''));
    announce(settings.version2 ? `Reading links open in ${vLabel(settings.version)} and ${vLabel(settings.version2)}.` : `Reading links open in ${vLabel(settings.version)}.`);
  }
  $('readIn').addEventListener('change', () => setVersions($('readIn').value, settings.version2));
  $('compareWith').addEventListener('change', () => setVersions(settings.version, $('compareWith').value));

  // ---------- Header: settings, about, install ----------
  // clicking the dimmed area outside a pop-up closes it, like Escape
  for (const d of document.querySelectorAll('dialog')) {
    let downOutside = false;
    const outside = (e) => { const r = d.getBoundingClientRect(); return e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom); };
    d.addEventListener('pointerdown', (e) => { downOutside = outside(e); });
    d.addEventListener('click', (e) => { if (downOutside && outside(e)) d.close(); downOutside = false; });
  }
  $('aboutBtn').addEventListener('click', () => el.about.showModal());
  $('settingsBtn').addEventListener('click', () => el.settings.showModal());
  document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    if (hideLanding()) { setMode(b.dataset.nav); return; }
    const on = b.getAttribute('aria-pressed') === 'true';
    setMode(on ? 'explore' : b.dataset.nav);
  }));

  function initSettingsForm() {
    const f = $('settingsForm');
    f.querySelector(`input[name=appearance][value="${settings.appearance}"]`).checked = true;
    $('contrastToggle').checked = settings.contrast;
    $('kidsToggle').checked = settings.kids;
    f.querySelector(`input[name=language][value="${LANG}"]`).checked = true;
    syncVersionSelects();
    f.addEventListener('change', (e) => {
      if (e.target.name === 'appearance') settings.appearance = e.target.value;
      if (e.target.id === 'contrastToggle') settings.contrast = e.target.checked;
      if (e.target.id === 'kidsToggle') { settings.kids = e.target.checked; store.set('kids', settings.kids); track('kids/' + (settings.kids ? 'on' : 'off')); }
      if (e.target.id === 'versionSel' || e.target.id === 'version2Sel') { setVersions($('versionSel').value, $('version2Sel').value); return; }
      if (e.target.name === 'language' && e.target.value !== LANG) {
        store.set('lang', e.target.value);
        if (!store.get('version', null)) settings.version = e.target.value === 'es' ? 'NVI' : 'NIV';
        const u = new URL(location.href); u.searchParams.delete('lang');
        if (e.target.value !== 'en') u.searchParams.set('lang', e.target.value);
        location.replace(u.toString());
        return;
      }
      store.set('appearance', settings.appearance); store.set('contrast', settings.contrast); store.set('version', settings.version);
      applyAppearance();
    });
  }

  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; el.installBtn.hidden = false; });
  el.installBtn.addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    installEvent = null; el.installBtn.hidden = true;
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ }));
  }

  // ---------- Landing page ----------
  const landing = $('landing'), layout = document.querySelector('.layout');
  const header = document.querySelector('.site-header');
  const setHeaderH = () => document.documentElement.style.setProperty('--header-real', header.getBoundingClientRect().height + 'px');
  if (window.ResizeObserver) new ResizeObserver(setHeaderH).observe(header);
  setHeaderH();
  const isLanding = () => !landing.hidden;

  function showLanding() {
    landing.hidden = false;
    layout.inert = true;
    updateNav();
    document.body.classList.add('landing-open');
    window.scrollTo(0, 0);
    resetView(false);
    paintHero();
    renderLandingRecent();
  }
  function hideLanding() {
    if (landing.hidden) return false;
    landing.hidden = true;
    layout.inert = false;
    updateNav();
    document.body.classList.remove('landing-open');
    window.scrollTo(0, 0);
    return true;
  }
  // The hero picture is a copy of the real map, drawn at the full-Bible view.
  function paintHero() {
    const hero = $('heroCanvas');
    if (!hero || landing.hidden || !N || !view.W) return;
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    const dpr = view.dpr;
    hero.width = Math.round(w * dpr); hero.height = Math.round(h * dpr);
    const ctx = hero.getContext('2d');
    const sw = TOTAL * view.k + 8, sh = TOTAL * view.k / 2 + BAR_MAX + 12;
    const sx0 = view.tx - 4, sy0 = view.ty - TOTAL * view.k / 2 - 4;
    const scale = Math.min(w / sw, h / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, hero.width, hero.height);
    // line the Old and New Testament timeline up with the drawn map
    const axis = $('landingAxis'), inset = (w - dw) / 2 + 4 * scale;
    if (axis) { axis.style.marginLeft = axis.style.marginRight = `${Math.max(0, inset)}px`; }
    if (glr && glr.ok) {
      const gd = glr.canvas.width / view.W;
      ctx.drawImage(glr.canvas, sx0 * gd, sy0 * gd, sw * gd, sh * gd, (w - dw) / 2 * dpr, (h - dh) / 2 * dpr, dw * dpr, dh * dpr);
    }
    ctx.drawImage(el.base, sx0 * dpr, sy0 * dpr, sw * dpr, sh * dpr, (w - dw) / 2 * dpr, (h - dh) / 2 * dpr, dw * dpr, dh * dpr);
  }
  function buildLanding() {
    const fmt = (n) => n.toLocaleString();
    $('landingStats').innerHTML = [
      [fmt(N), 'cross references'], [fmt(TOTAL), 'verses'], ['66', 'books'], [String(JOURNEYS.length), 'guided journeys'],
    ].map(([n, l]) => `<li><strong>${n}</strong> <span>${l}</span></li>`).join('');
    const S = window.SERIES || {};
    $('landingSeries').hidden = !S.enabled;
    if (S.enabled) $('landingSeries').innerHTML = `<p class="eyebrow">Current series</p><h3 class="series-name">${esc(S.title)}</h3><p>${esc(S.description || '')}</p><button type="button" class="btn" data-start="series">See the passages</button>`;
    $('aboutVersion').textContent = VERSION;
    const cotd = connectionOfTheDay();
    $('landingCotd').hidden = cotd < 0;
    if (cotd >= 0) $('landingCotd').innerHTML = `<h3>Connection of the day</h3>${cotdHTML(cotd)}`;
    renderLandingRecent();
    // the timeline under the picture: Old and New Testament widths match their share of verses
    $('landingAxis').style.setProperty('--ot', BOOKS[39].start / TOTAL);
    $('landingThemes').innerHTML = THEMES.map(t => `<li><button type="button" class="chip" data-theme="${t.id}">${esc(t.name)}</button></li>`).join('');
  }
  landing.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.goto) { hideLanding(); goTo(btn.dataset.goto); return; }
    if (btn.dataset.action === 'story') { storyImage(+btn.dataset.ref); return; }
    if (btn.dataset.action === 'gotoRef') { hideLanding(); track('cotd'); selectRef(+btn.dataset.ref, { zoom: true }); focusPanelHeading(); return; }
    if (btn.dataset.start === 'map') {
      hideLanding(); syncURL(true); el.viz.focus(); maybeShowTips();
      announce(`Map of ${filtered.length.toLocaleString()} connections. Use the details panel or arrow keys to explore.`);
    }
    else if (btn.dataset.start === 'journeys') { hideLanding(); setMode('journeys'); }
    else if (btn.dataset.start === 'series') { hideLanding(); setMode('series'); }
    else if (btn.dataset.start === 'study' || btn.dataset.start === 'wordstudy') { hideLanding(); setMode(btn.dataset.start); }
    else if (btn.dataset.start === 'passage') { hideLanding(); el.search.value = 'John 3:16'; runSearch(); focusPanelHeading(); }
    else if (btn.dataset.theme) {
      hideLanding();
      el.theme.value = btn.dataset.theme;
      el.theme.dispatchEvent(new Event('change'));
      focusPanelHeading();
    }
  });
  $('landingSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('landingQ').value.trim();
    if (!q) { $('landingQ').focus(); return; }
    hideLanding();
    el.search.value = q;
    runSearch();
  });
  function goHome() {
    resetState();
    showLanding();
    syncURL(true);
    landing.querySelector('[data-start=map]').focus();
  }
  $('homeLink').addEventListener('click', (e) => { e.preventDefault(); goHome(); });
  $('homeBtn').addEventListener('click', goHome);

  // ---------- "You're viewing" bar and start over ----------
  function resetState() {
    colPlay = null; renderColBar();
    Object.assign(state, { minVotes: DEFAULT_VOTES, from: 'all', to: 'all', theme: '', notesOnly: false, focus: null, selected: -1, mode: 'explore', journey: null, colorMode: 'distance', order: 'bible' });
    if (POS) setOrder('bible');
    syncControls(); renderLegend(); el.search.value = ''; el.searchError.textContent = '';
    updateNav(); applyFilters();
  }
  function startOver() {
    resetState(); resetView(); syncURL(true);
    el.viz.focus();
    announce('Back to the whole Bible. All filters and selections cleared.');
  }
  $('resetAll').addEventListener('click', startOver);

  function contextItems() {
    const items = [];
    const selName = (v) => (v === 'ot' ? 'Old Testament' : v === 'nt' ? 'New Testament' : v.startsWith('cat:') ? CATEGORIES[v.slice(4)].name : BOOKS[+v.slice(5)].name);
    if (state.mode === 'journey' && state.journey) items.push(['journey', `Journey: ${JOURNEYS[state.journey.j].name}, step ${state.journey.step + 1}`]);
    if (state.mode === 'journeys') items.push(['mode', 'Guided journeys']);
    if (state.mode === 'insights') items.push(['mode', 'Insights']);
    if (state.mode === 'study') items.push(['mode', 'Study']);
    if (state.mode === 'plans') items.push(['mode', 'Reading plans']);
    if (state.mode === 'plan' && state.plan) items.push(['mode', `Reading plan: ${nameOf(PLANS.find(p => p.id === state.plan.id))}, day ${state.plan.day + 1}`]);
    if (state.mode === 'people') items.push(['mode', 'People and places']);
    if (state.mode === 'topics') items.push(['mode', 'Topics']);
    if (state.mode === 'game') items.push(['mode', 'Guess the connection']);
    if (state.mode === 'wordstudy') items.push(['mode', 'Word study']);
    if (state.mode === 'collections') items.push(['mode', 'Collections']);
    if (state.mode === 'collection' && state.collection) items.push(['mode', `Collection: ${state.collection.name}`]);
    if (state.mode === 'series') items.push(['mode', (window.SERIES || {}).title || 'Series']);
    if (state.mode === 'path') items.push(['mode', state.path && state.path.edges ? `Link: ${state.path.fromLabel} to ${state.path.toLabel}` : 'How are these connected?']);
    if (state.theme) items.push(['theme', `Theme: ${THEMES.find(t => t.id === state.theme).name}`]);
    if (state.from !== 'all' || state.to !== 'all') items.push(['between', `Between ${state.from === 'all' ? 'Whole Bible' : selName(state.from)} and ${state.to === 'all' ? 'Whole Bible' : selName(state.to)}`]);
    if (state.minVotes !== DEFAULT_VOTES) items.push(['votes', `Strength ${state.minVotes}+ votes`]);
    if (state.notesOnly) items.push(['notes', 'Only with notes']);
    if (state.order === 'chrono') items.push(['order', 'Chronological order']);
    if (state.focus && state.mode === 'explore') {
      const en = state.focus.entity;
      items.push(['focus', en ? `${{ person: 'Person', place: 'Place', topic: 'Topic', word: 'Original word' }[en.type]}: ${en.name}` : state.focus.kind === 'words' ? `Word: ${rangeLabel(state.focus)}` : rangeLabel(state.focus)]);
    }
    if (state.selected >= 0 && state.mode === 'explore') items.push(['selected', `${refLabel(F[state.selected])} ↔ ${refLabel(T[state.selected], E[state.selected])}`]);
    return items;
  }
  function renderContext() {
    const bar = $('contextBar');
    if (!bar || !N) return;
    const items = contextItems();
    if (EMBED) {
      $('embedTitle').textContent = items.map(x => x[1]).join(' · ') || 'The whole Bible';
      $('embedOpen').href = cleanUrl();
    }
    bar.hidden = !items.length;
    if (!items.length) { $('contextList').innerHTML = ''; return; }
    $('contextList').innerHTML = items.map(([k, label]) =>
      `<li class="ctx-chip"><span>${esc(label)}</span><button type="button" class="ctx-x" data-clear="${k}" aria-label="Remove ${esc(label)}">✕</button></li>`).join('');
  }
  $('contextBar').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'startOver') { startOver(); return; }
    const k = btn.dataset.clear;
    if (k === 'journey' || k === 'mode') { setMode('explore'); }
    else if (k === 'theme') { state.theme = ''; el.theme.value = ''; state.focus = null; state.selected = -1; applyFilters(); }
    else if (k === 'between') { state.from = state.to = 'all'; el.fromSel.value = el.toSel.value = 'all'; applyFilters(); }
    else if (k === 'votes') { state.minVotes = DEFAULT_VOTES; syncControls(); applyFilters(); }
    else if (k === 'notes') { state.notesOnly = false; syncControls(); applyFilters(); }
    else if (k === 'order') { state.order = 'bible'; setOrder('bible'); syncControls(); updateCount(); resetView(false); drawBase(); }
    else if (k === 'focus') { state.focus = null; state.selected = -1; focusList = new Int32Array(0); el.search.value = ''; drawBase(); renderPanel(); resetView(); }
    else if (k === 'selected') { state.selected = -1; drawBase(); renderPanel(); }
    syncURL(true);
    announce('Removed. ' + (contextItems().length ? '' : 'Showing the whole Bible.'));
    // keep keyboard focus in the bar so several items can be removed in a row
    requestAnimationFrame(() => ($('contextList').querySelector('.ctx-x') || $('startOverAlt') || el.viz).focus());
  });

  // ---------- URL state (shareable links, back button) ----------
  let restoring = false;
  function syncURL(push = false) {
    let url;
    if (isLanding()) url = location.pathname;
    else {
      const p = new URLSearchParams();
      if (state.minVotes !== DEFAULT_VOTES) p.set('min', state.minVotes);
      if (state.from !== 'all') p.set('from', state.from);
      if (state.to !== 'all') p.set('to', state.to);
      if (state.theme) p.set('theme', state.theme);
      if (state.notesOnly) p.set('notes', '1');
      if (state.colorMode !== 'distance') p.set('color', state.colorMode);
      if (state.order !== 'bible') p.set('order', state.order);
      if (LANG !== 'en') p.set('lang', LANG);
      if (EMBED) p.set('embed', '1');
      if (state.mode === 'journey' && state.journey) { p.set('journey', JOURNEYS[state.journey.j].id); p.set('step', state.journey.step + 1); }
      else if (state.mode === 'plan' && state.plan) { p.set('plan', state.plan.id); p.set('day', state.plan.day + 1); }
      else if (state.mode === 'path' && state.path && state.path.fromLabel) p.set('path', `${state.path.fromLabel}~${state.path.toLabel}`);
      else if (state.mode === 'shared' && state.shared && state.shared.aLabel) p.set('shared', `${state.shared.aLabel}~${state.shared.bLabel}`);
      else if (state.mode === 'collection' && state.collection) p.set('collection', encodeCollection(state.collection));
      else if (['journeys', 'insights', 'series', 'path', 'study', 'plans', 'people', 'topics', 'game', 'wordstudy', 'collections', 'notes', 'places', 'shared'].includes(state.mode)) p.set('view', state.mode);
      else {
        if (state.focus) {
          if (state.focus.entity) p.set(state.focus.entity.type, state.focus.entity.id);
          else if (state.focus.kind === 'words') p.set('q', state.focus.query); else p.set('ref', rangeLabel(state.focus));
        }
        if (state.selected >= 0) p.set('c', `${toOsis(F[state.selected])}_${toOsis(T[state.selected])}`);
      }
      if (![...p.keys()].filter(k => k !== 'lang' && k !== 'embed').length) p.set('view', 'map');
      url = `?${p}`;
    }
    renderContext();
    const current = location.search || location.pathname;
    if (url === current || (url === location.pathname && !location.search)) return;
    if (push && !restoring) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
    if (push && !restoring && !EMBED) recordRecent();
    const sb = el.panelBody.querySelector('[data-action=save]');
    if (sb) { const on = isSaved(); sb.setAttribute('aria-pressed', on); sb.textContent = on ? '★ Saved' : '☆ Save'; }
  }
  function readURL() {
    const p = new URLSearchParams(location.search);
    if (p.has('min')) state.minVotes = Math.min(40, Math.max(3, +p.get('min') || DEFAULT_VOTES));
    const validSel = (v) => v && [...el.fromSel.options].some(o => o.value === v);
    if (validSel(p.get('from'))) state.from = p.get('from');
    if (validSel(p.get('to'))) state.to = p.get('to');
    if (THEMES.some(t => t.id === p.get('theme'))) state.theme = p.get('theme');
    if (p.get('color') === 'category') state.colorMode = 'category';
    state.order = p.get('order') === 'chrono' ? 'chrono' : 'bible';
    if (POS) setOrder(state.order);
    state.notesOnly = p.get('notes') === '1';
    syncControls();
    return p;
  }
  function syncControls() {
    el.votes.value = state.minVotes; el.votesOut.textContent = state.minVotes;
    el.fromSel.value = state.from; el.toSel.value = state.to; el.theme.value = state.theme; el.notesOnly.checked = state.notesOnly;
    el.controls.querySelector(`input[value="${state.colorMode}"]`).checked = true;
    el.controls.querySelector(`input[name=order][value="${state.order}"]`).checked = true;
  }
  function findRef(a, b) {
    let best = -1;
    for (let i = 0; i < N; i++) if ((F[i] === a && T[i] === b) || (F[i] === b && T[i] === a)) { if (best < 0 || V[i] > V[best]) best = i; }
    return best;
  }
  async function restoreFromURL(p) {
    const jn = JOURNEYS.findIndex(j => j.id === p.get('journey'));
    if (jn >= 0) { startJourney(jn, Math.min(journeySteps[jn].length, Math.max(1, +p.get('step') || 1)) - 1); return; }
    if (p.get('plan')) { openPlan(p.get('plan'), (+p.get('day') || 1) - 1, { push: false }); return; }
    for (const type of ['person', 'place', 'topic']) if (p.get(type)) { await openEntity(type, p.get(type)); return; }
    if (p.get('path')) { const [a, b] = p.get('path').split('~'); findPath(a || '', b || '', { push: false }); return; }
    if (p.get('collection')) { const col = decodeCollection(p.get('collection')); if (col) { col.shared = !getCollections().some(c => c.name === col.name && c.items.length === col.items.length); openCollection(col, { push: false }); return; } }
    if (p.get('word')) { await openWord(p.get('word')); return; }
    if (p.get('geo')) { await openGeo(p.get('geo')); return; }
    if (p.get('shared')) { const [a, b] = p.get('shared').split('~'); findShared(a, b || '', { push: false }); return; }
    if (['journeys', 'insights', 'series', 'path', 'study', 'plans', 'people', 'topics', 'game', 'wordstudy', 'collections', 'notes', 'places', 'shared'].includes(p.get('view'))) { state.mode = p.get('view'); updateNav(); drawBase(); renderPanel(); return; }
    if (p.get('ref')) { const r = parseReference(p.get('ref')); if (r && !r.error) setFocus(r, { zoom: !p.get('c') }); }
    else if (p.get('q')) { el.search.value = p.get('q'); const w = await wordSearch(p.get('q')); if (w) setFocus(w, { zoom: true }); }
    if (p.get('c')) {
      const [a, b] = p.get('c').split(/[~_]/).map(osisToIndex);
      const i = a >= 0 && b >= 0 ? findRef(a, b) : -1;
      if (i >= 0) {
        // make sure a shared connection is visible even if the default filters would hide it
        if (!filtered.includes(i)) {
          Object.assign(state, { minVotes: Math.max(3, Math.min(state.minVotes, V[i])), from: 'all', to: 'all', theme: '', notesOnly: false });
          syncControls(); applyFilters({ panel: false });
        }
        selectRef(i, { zoom: true });
      }
    }
  }
  // Load the page state described by the current address (start-up and back/forward buttons).
  async function applyLocation() {
    restoring = true;
    try {
      Object.assign(state, { minVotes: DEFAULT_VOTES, from: 'all', to: 'all', theme: '', notesOnly: false, focus: null, selected: -1, mode: 'explore', journey: null, colorMode: 'distance', order: 'bible' });
    if (POS) setOrder('bible');
      const p = readURL();
      renderLegend(); updateNav(); applyFilters();
      if (![...p.keys()].filter(k => k !== 'embed').length && !EMBED) { showLanding(); return; }
      hideLanding();
      const hasDetail = ['journey', 'ref', 'q', 'c', 'path', 'plan', 'person', 'place', 'topic', 'word'].some(k => p.has(k));
      if (!hasDetail) resetView(false);
      await restoreFromURL(p);
      maybeShowTips();
    } finally {
      restoring = false;
      syncURL();
    }
  }
  window.addEventListener('popstate', () => { if (N) applyLocation(); });

  // ---------- Optional privacy-friendly usage stats (off unless set in content/config.json) ----------
  function loadAnalytics() {
    const a = (CONFIG && CONFIG.analytics) || {};
    // respect Do Not Track and Global Privacy Control
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    let src = '', attrs = {};
    if (a.provider === 'goatcounter' && /^[a-z0-9-]+$/i.test(a.goatcounterCode || '')) {
      src = 'https://gc.zgo.at/count.js'; attrs = { 'data-goatcounter': `https://${a.goatcounterCode}.goatcounter.com/count` };
    } else if (a.provider === 'plausible' && /^[a-z0-9.-]+$/i.test(a.plausibleDomain || '')) {
      src = 'https://plausible.io/js/script.js'; attrs = { 'data-domain': a.plausibleDomain };
    }
    if (!src) return;
    const sc = document.createElement('script');
    sc.async = true; sc.src = src;
    for (const [k, v] of Object.entries(attrs)) sc.setAttribute(k, v);
    document.head.append(sc);
    $('aboutStats').hidden = false;
  }

  // ---------- Boot ----------
  async function init() {
    if (EMBED) { document.body.classList.add('embed'); $('embedBar').hidden = false; }
    applyAppearance();
    try { await loadData(); }
    catch { el.loading.textContent = 'Sorry, the data could not be loaded. Please refresh the page.'; return; }
    startTranslating();
    buildSelects();
    loadAnalytics();
    prepareJourneys();
    initSettingsForm();
    resize();
    el.loading.remove();
    buildLanding();
    await applyLocation();
    if (!isLanding() && location.search !== '?view=map' && !matchMedia('(max-width: 860px)').matches) requestAnimationFrame(scrollPanel);
    document.body.dataset.ready = 'true';
  }
  init();
})();
