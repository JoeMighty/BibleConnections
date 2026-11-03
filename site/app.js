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
    paul:       { name: 'Paul\'s Letters', dark: '#da77f2', light: '#862e9c' },
    general:    { name: 'General Letters', dark: '#f783ac', light: '#c2255c' },
    revelation: { name: 'Revelation',      dark: '#e9ecef', light: '#343a40' },
  };
  const catKeys = Object.keys(CATEGORIES);
  const PALETTES = {
    dark:  { bg: '#08080c', line: '#3a3a4a', sep: '#2a2a38', label: '#c9c9d6', sub: '#9a9aae', sel: '#ffffff', halo: '#000000', marker: '#ffd43b', hoverCh: 'rgba(255,255,255,.18)', focus: '#ffffff', barText: '#08080c' },
    light: { bg: '#fbfbfd', line: '#b9b9c6', sep: '#d5d5df', label: '#262633', sub: '#55556a', sel: '#111111', halo: '#ffffff', marker: '#c2410c', hoverCh: 'rgba(0,0,0,.10)', focus: '#111111', barText: '#ffffff' },
  };
  // Bible.com (YouVersion) translation ids used for "Read" links. No verse text is hosted on this site.
  const VERSIONS = {
    NIV: { id: 111, name: 'New International Version' },
    NLT: { id: 116, name: 'New Living Translation' },
    ESV: { id: 59, name: 'English Standard Version' },
    CSB: { id: 1713, name: 'Christian Standard Bible' },
    NKJV: { id: 114, name: 'New King James Version' },
    KJV: { id: 1, name: 'King James Version' },
    AMP: { id: 1588, name: 'Amplified Bible' },
    MSG: { id: 97, name: 'The Message' },
    NASB2020: { id: 2692, name: 'New American Standard Bible 2020' },
  };
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
  const settings = {
    appearance: store.get('appearance', 'system'),
    contrast: store.get('contrast', false),
    version: VERSIONS[store.get('version', 'NIV')] ? store.get('version', 'NIV') : 'NIV',
  };
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const contrastQuery = matchMedia('(prefers-contrast: more)');
  let pal = PALETTES.dark, isLight = false, highContrast = false;
  function applyAppearance() {
    isLight = settings.appearance === 'light' || (settings.appearance === 'system' && !darkQuery.matches);
    highContrast = settings.contrast || contrastQuery.matches;
    pal = isLight ? PALETTES.light : PALETTES.dark;
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    document.documentElement.dataset.contrast = highContrast ? 'more' : 'normal';
    document.querySelector('meta[name=theme-color]').content = pal.bg;
    buildColors();
    if (N) { renderLegend(); drawBase(); renderPanel(); }
  }
  darkQuery.addEventListener?.('change', applyAppearance);
  contrastQuery.addEventListener?.('change', applyAppearance);

  // ---------- Data ----------
  let BOOKS, TOTAL, N = 0, F, T, E, V, verseBook, verseChap, verseNum, chapters, NT_START;
  const noteMap = new Map();
  let hasNote = new Uint8Array(0);
  let wordIndex = null;

  async function loadData() {
    const [meta, bin] = await Promise.all([
      fetch('data/books.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch('data/refs.bin').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    ]);
    BOOKS = meta.books; TOTAL = meta.totalVerses;
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

    // "Why it connects" notes, matched to the data in either direction
    const pairKey = (a, b) => Math.min(a, b) * 65536 + Math.max(a, b);
    const wanted = new Map();
    for (const [a, b, type, text] of (window.NOTES || [])) {
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
  function bibleUrl(start, end = start, chapterOnly = false) {
    const ver = settings.version, id = VERSIONS[ver].id;
    const b = BOOKS[verseBook[start]], c = verseChap[start];
    if (chapterOnly) return `https://www.bible.com/bible/${id}/${b.usfm}.${c}.${ver}`;
    let v = String(verseNum[start]);
    if (end > start && verseBook[end] === verseBook[start] && verseChap[end] === c) v += '-' + verseNum[end];
    return `https://www.bible.com/bible/${id}/${b.usfm}.${c}.${v}.${ver}`;
  }

  const ALIASES = {
    jn: 'John', jhn: 'John', mt: 'Matthew', mk: 'Mark', lk: 'Luke', ps: 'Psalms', psalm: 'Psalms', pss: 'Psalms',
    sos: 'Song of Songs', songofsolomon: 'Song of Songs', song: 'Song of Songs', canticles: 'Song of Songs',
    revelations: 'Revelation', rev: 'Revelation', phil: 'Philippians', phm: 'Philemon', philem: 'Philemon',
    jas: 'James', jdg: 'Judges', judg: 'Judges', ezk: 'Ezekiel', eze: 'Ezekiel', prov: 'Proverbs', eccles: 'Ecclesiastes',
  };
  const norm = (s) => s.toLowerCase().trim()
    .replace(/^(iii|3rd|third)\s+/, '3').replace(/^(ii|2nd|second)\s+/, '2').replace(/^(i|1st|first)\s+/, '1')
    .replace(/[^a-z0-9]/g, '');
  function findBook(q, allowPrefix) {
    const n = norm(q);
    if (!n) return -1;
    if (ALIASES[n]) return BOOKS.findIndex(b => b.name === ALIASES[n]);
    let bi = BOOKS.findIndex(b => norm(b.name) === n || norm(b.osis) === n);
    if (bi < 0 && allowPrefix && n.length >= 2) {
      bi = BOOKS.findIndex(b => norm(b.name).startsWith(n));
      if (bi < 0) bi = BOOKS.findIndex(b => norm(b.osis).startsWith(n));
    }
    return bi;
  }
  function parseReference(input) {
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
    minVotes: DEFAULT_VOTES, from: 'all', to: 'all', theme: '', colorMode: 'distance', notesOnly: false,
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
    const active = [state.theme, state.from !== 'all', state.to !== 'all', state.minVotes !== DEFAULT_VOTES, state.notesOnly, state.colorMode !== 'distance'].filter(Boolean).length;
    $('filtersCount').textContent = active ? `${active} active` : '';
    el.count.textContent = `Showing ${fmt(filtered.length)} of ${fmt(N)} connections`;
    el.tagline.textContent = `${fmt(filtered.length)} connections across ${fmt(TOTAL)} verses`;
  }

  // ---------- Colour ----------
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
    const span = Math.abs(T[i] - F[i]) / TOTAL;
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
  const zoomToPair = (a, b) => zoomToSpan(Math.min(a, b), Math.max(a, b) + 1, 0.1);
  const zoomToRef = (i) => zoomToPair(F[i], T[i]);
  const sx = (x) => view.tx + x * view.k;

  // ---------- Drawing ----------
  let baseQueued = false, overlayQueued = false;
  function drawBase() { if (!baseQueued) { baseQueued = true; requestAnimationFrame(() => { baseQueued = false; paintBase(); paintOverlay(); }); } }
  function drawOverlay() { if (!overlayQueued) { overlayQueued = true; requestAnimationFrame(() => { overlayQueued = false; paintOverlay(); }); } }

  function arcBetween(path, a, b) {
    a += 0.5; b += 0.5;
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

  function paintBase() {
    const ctx = bctx, { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    if (!N) return;

    const dim = !!state.focus || state.selected >= 0 || state.mode === 'journey';
    const nb = state.colorMode === 'category' ? catKeys.length : BUCKETS;
    const paths = Array.from({ length: nb }, () => new Path2D());
    for (const i of filtered) arcPath(paths[bucketOf(i)], i);

    const zoom = view.k / view.fitK;
    let alpha = Math.min(0.9, Math.max(0.05, 22 / Math.sqrt(Math.max(1, filtered.length)) * Math.sqrt(zoom)));
    if (highContrast) alpha = Math.min(1, alpha * 1.8);
    if (isLight) alpha = Math.min(1, alpha * 1.3);
    if (dim) alpha *= highContrast ? 0.15 : 0.3;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = (zoom > 20 ? 1.2 : 0.8) + (highContrast ? 0.4 : 0);
    // far-reaching arcs first so nearer (smaller) arcs sit on top
    for (let b = nb - 1; b >= 0; b--) {
      ctx.strokeStyle = state.colorMode === 'category' ? catColors[b] : distColors[b];
      ctx.stroke(paths[b]);
    }
    ctx.globalAlpha = 1;
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
      const x0 = sx(ch.start), x1 = sx(ch.start + ch.count);
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
    const ntx = sx(NT_START);
    if (ntx > 0 && ntx < W) { ctx.fillStyle = pal.label; ctx.fillRect(Math.round(ntx) - 1, y0, 2, AXIS_H - 6); }

    ctx.textBaseline = 'top';
    const row = [y0 + BAR_MAX + 8, y0 + BAR_MAX + 23];
    const showChapters = view.k * 25 > 24;
    const lastRight = [-Infinity, -Infinity];
    ctx.font = `${highContrast ? 700 : 600} 11px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const b of BOOKS) {
      const x0 = sx(b.start), x1 = sx(b.end);
      if (x1 < 0 || x0 > W) continue;
      ctx.fillStyle = pal.sep;
      ctx.fillRect(x0, y0 + 2, 1, BAR_MAX + 6);
      const w = Math.min(x1, W) - Math.max(x0, 0);
      const label = w > ctx.measureText(b.name).width + 6 ? b.name : b.osis;
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
      for (const ch of chapters) {
        const x0 = sx(ch.start), x1 = sx(ch.start + ch.count);
        if (x1 < 0 || x0 > W) continue;
        const cx = (x0 + x1) / 2;
        if (x1 - x0 >= 16 && cx >= last + 22) { ctx.fillStyle = pal.sub; ctx.fillText(String(ch.chapter), cx, row[1]); last = cx; }
        if (zoomedIn) {
          ctx.fillStyle = pal.barText;
          for (let v = 0; v < ch.count; v++) {
            const vx = sx(ch.start + v + 0.5);
            if (vx >= 0 && vx <= W) ctx.fillText(String(v + 1), vx, y0 + 12);
          }
        }
      }
    }
    // Testament captions
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillStyle = pal.sub;
    const capY = y0 + AXIS_H - 16;
    if (ntx > 90) { ctx.textAlign = 'right'; ctx.fillText('Old Testament', Math.min(ntx - 6, W - 6), capY); }
    if (ntx < W - 90) { ctx.textAlign = 'left'; ctx.fillText('New Testament', Math.max(ntx + 6, 6), capY); }
    ctx.textAlign = 'center';
  }

  function strokePair(ctx, a, b, color, width, alpha = 1) {
    const p = new Path2D();
    if (!arcBetween(p, a, b)) { ctx.fillStyle = color; ctx.fillRect(sx(a + 0.5) - 1.5, view.ty - 3, 3, 3); return; }
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.stroke(p);
    ctx.globalAlpha = 1;
  }
  function highlightPair(ctx, a, b) {
    strokePair(ctx, a, b, pal.halo, 6, 0.6);
    strokePair(ctx, a, b, pal.sel, 2.5);
    for (const x of [sx(a + 0.5), sx(b + 0.5)]) {
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
        for (const v of state.focus.verses) { const x = sx(v + 0.5); if (x >= 0 && x <= W) ctx.fillRect(x - 0.75, view.ty - 6, 1.5, 6); }
      } else {
        const x0 = sx(state.focus.start), x1 = sx(state.focus.end);
        ctx.fillRect(x0, view.ty - 1, Math.max(2, x1 - x0), 3);
      }
    }
    if (state.mode === 'journey') { const s = currentStep(); if (s) highlightPair(ctx, s.ia, s.ib); }
    if (state.hover >= 0 && state.hover !== state.selected) strokePair(ctx, F[state.hover], T[state.hover], pal.sel, 1.6, 0.75);
    if (state.selected >= 0) highlightPair(ctx, F[state.selected], T[state.selected]);
    if (state.hoverChapter >= 0) {
      const ch = chapters[state.hoverChapter];
      ctx.fillStyle = pal.hoverCh;
      ctx.fillRect(sx(ch.start), view.ty, Math.max(2, ch.count * view.k), BAR_MAX + 6);
    }
  }

  // ---------- Hit testing ----------
  function hitTest(px, py, tol) {
    if (py > view.ty + 2) return -1;
    const pool = state.focus ? focusList : filtered;
    let best = -1, bestD = tol;
    for (const i of pool) {
      const a = F[i] + 0.5, b = T[i] + 0.5;
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
    if (py < view.ty || py > view.ty + BAR_MAX + 30) return -1;
    const x = (px - view.tx) / view.k;
    if (x < 0 || x >= TOTAL) return -1;
    let lo = 0, hi = chapters.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (chapters[m].start <= x) lo = m; else hi = m - 1; }
    return lo;
  }

  // ---------- Pointer & keyboard ----------
  const pointers = new Map();
  let drag = null, pinch = null;
  const localPoint = (e) => { const r = el.viz.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  el.viz.addEventListener('pointerdown', (e) => {
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
      else zoomToSpan(range.start, range.end, range.kind === 'verse' ? 40 : 0.6);
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
        ${ext(bibleUrl(start, end), `Read in ${settings.version}<span class="sr-only">: ${esc(refLabel(start, end))}</span>`, 'btn small')}
        ${ext(bibleUrl(start, start, true), `Whole chapter<span class="sr-only">: ${esc(BOOKS[verseBook[start]].name)} ${verseChap[start]}</span>`)}
      </div></div>`;
  }
  const noteHTML = (n) => `<div class="note"><p class="note-head"><span class="tag">${esc(n.type)}</span> Why it connects</p><p>${esc(n.text)}</p></div>`;

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
  const shareButtons = () => `<button type="button" class="btn ghost small" data-action="share">${navigator.share ? 'Share' : 'Copy link'}</button>
      <button type="button" class="btn ghost small" data-action="copy">Copy references</button>`;

  function renderPanel() {
    let title = 'Explore', html = '';
    const theme = THEMES.find(t => t.id === state.theme);
    const i = state.selected;

    if (state.mode === 'journeys') [title, html] = journeysHTML();
    else if (state.mode === 'journey') [title, html] = journeyStepHTML();
    else if (state.mode === 'insights') [title, html] = insightsHTML();
    else if (i >= 0) {
      title = 'Connection';
      const color = colorOf(i);
      html += refCard(F[i], F[i], color) + `<p class="link-arrow" aria-hidden="true">connects to</p>` + refCard(T[i], E[i], color);
      const n = noteMap.get(i);
      if (n) html += noteHTML(n);
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
        html += `<p>${f.verses.length.toLocaleString()} verse${f.verses.length === 1 ? '' : 's'} contain ${esc(rangeLabel(f))}, touching ${focusList.length.toLocaleString()} connections.</p>
          <p class="hint">Word search uses the wording of the Berean Standard Bible, so results may differ slightly from other translations.</p>
          <div class="actions">${shareButtons()}<button type="button" class="btn ghost small" data-action="clear">Clear</button></div>
          <h3>Verses</h3><ul class="verse-list">`;
        const vs = Math.min(versesShown, f.verses.length);
        for (let n = 0; n < vs; n++) {
          const v = f.verses[n];
          html += `<li><button type="button" class="link-btn" data-action="focusVerse" data-v="${v}">${esc(refLabel(v))}</button> ${ext(bibleUrl(v), `Read<span class="sr-only"> ${esc(refLabel(v))}</span>`, 'mini-link')}</li>`;
        }
        html += '</ul>';
        if (vs < f.verses.length) html += `<div class="actions"><button type="button" class="btn ghost small" data-action="moreVerses">Show more verses (${(f.verses.length - vs).toLocaleString()} left)</button></div>`;
        html += `<h3>Connections</h3>` + listHTML(focusList, true);
      } else {
        if (f.kind === 'verse') html += refCard(f.start, f.end - 1, pal.focus);
        else {
          const label = f.kind === 'book' ? `${BOOKS[f.book].name} 1` : rangeLabel(f);
          html += `<div class="actions">${ext(bibleUrl(f.start, f.start, true), `Read ${esc(label)} in ${settings.version}`, 'btn small')}</div>`;
        }
        html += `<p>${focusList.length.toLocaleString()} connection${focusList.length === 1 ? '' : 's'} with the current filters.</p>
          <div class="actions"><button type="button" class="btn ghost small" data-action="zoomFocus">Zoom to ${esc(rangeLabel(f))}</button>`;
        if (f.kind !== 'book') html += `<button type="button" class="btn ghost small" data-action="focusBook" data-b="${f.book}">Whole book</button>`;
        html += `${shareButtons()}<button type="button" class="btn ghost small" data-action="clear">Clear</button></div>
          <h3>Connections</h3>` + listHTML(focusList, true);
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
        html += `<p>Each arc joins two passages that point to each other. Tap or click an arc to see the connection and read it on Bible.com. Tap a bar along the bottom to see a chapter's connections.</p>
          <p class="muted">Try <button type="button" class="chip" data-action="search" data-q="John 3:16">John 3:16</button> <button type="button" class="chip" data-action="search" data-q="Isaiah 53">Isaiah 53</button> <button type="button" class="chip" data-action="search" data-q="shepherd">shepherd</button>
          or take a <button type="button" class="chip" data-action="mode" data-mode="journeys">guided journey</button></p>`;
      }
      html += `<h3>Strongest connections</h3>` + listHTML(topList(), false);
    }
    el.panelTitle.textContent = title;
    el.panelBody.innerHTML = html;
    renderContext();
  }

  // ---------- Journeys ----------
  let journeySteps = [];
  function prepareJourneys() {
    journeySteps = (window.JOURNEYS || []).map(j => j.steps.map(s => ({ ...s, ia: osisToIndex(s.a), ib: osisToIndex(s.b) })).filter(s => s.ia >= 0 && s.ib >= 0));
  }
  const currentStep = () => (state.journey ? journeySteps[state.journey.j]?.[state.journey.step] : null);
  function journeysHTML() {
    let html = '<p>Short guided tours through the story of Scripture. Each step lights up one connection and explains it.</p><ul class="journey-list">';
    JOURNEYS.forEach((j, n) => {
      html += `<li class="journey-card"><h3>${esc(j.name)}</h3><p>${esc(j.summary)}</p>
        <button type="button" class="btn small" data-action="startJourney" data-j="${n}">Start<span class="sr-only"> ${esc(j.name)}</span> (${journeySteps[n].length} steps)</button></li>`;
    });
    html += '</ul><div class="actions"><button type="button" class="btn ghost small" data-action="mode" data-mode="explore">Back to explore</button></div>';
    return ['Guided journeys', html];
  }
  function journeyStepHTML() {
    const { j, step } = state.journey;
    const J = JOURNEYS[j], steps = journeySteps[j], s = steps[step];
    let html = `<p class="step-count">${esc(J.name)} · Step ${step + 1} of ${steps.length}</p>
      <div class="progress" aria-hidden="true"><span style="width:${((step + 1) / steps.length) * 100}%"></span></div>
      <h3 class="step-title">${esc(s.title)}</h3><p class="step-note">${esc(s.note)}</p>`;
    html += refCard(s.ia, s.ia, pal.marker) + `<p class="link-arrow" aria-hidden="true">connects to</p>` + refCard(s.ib, s.ib, pal.marker);
    html += `<div class="actions nav-row">
      <button type="button" class="btn ghost" data-action="stepPrev" ${step === 0 ? 'disabled' : ''}>Previous</button>
      ${step < steps.length - 1 ? '<button type="button" class="btn" data-action="stepNext">Next step</button>' : '<button type="button" class="btn" data-action="mode" data-mode="journeys">Finish</button>'}
    </div><div class="actions">${shareButtons()}<button type="button" class="btn ghost small" data-action="mode" data-mode="journeys">All journeys</button></div>`;
    return [J.name, html];
  }
  function startJourney(j, step = 0) {
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
    drawBase(); renderPanel(); syncURL(true);
    zoomToPair(s.ia, s.ib);
    announce(`Step ${state.journey.step + 1}: ${s.title}. ${refLabel(s.ia)} connects to ${refLabel(s.ib)}.`);
  }

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
      <p class="hint">Stronger colour means more connections. Select a cell to show only those connections on the map.</p>
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
        `\n${refLabel(F[i])}: ${bibleUrl(F[i])}\n${refLabel(T[i], E[i])}: ${bibleUrl(T[i], E[i])}\n${url}`;
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
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.ref) { selectRef(+btn.dataset.ref); focusPanelHeading(); return; }
    const a = btn.dataset.action;
    if (a === 'more') { listShown += PAGE; renderPanel(); el.panelBody.querySelectorAll('.conn-item')[listShown - PAGE]?.focus(); }
    else if (a === 'moreVerses') { versesShown += 40; renderPanel(); el.panelBody.querySelectorAll('.verse-list .link-btn')[versesShown - 40]?.focus(); }
    else if (a === 'zoomRef') zoomToRef(state.selected);
    else if (a === 'focusVerse') { const v = +btn.dataset.v; setFocus({ kind: 'verse', book: verseBook[v], start: v, end: v + 1 }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'focusChapter') { const c = chapters[+btn.dataset.c]; setFocus({ kind: 'chapter', book: c.book, chapter: c.chapter, start: c.start, end: c.start + c.count }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'focusBook') { const b = BOOKS[+btn.dataset.b]; setFocus({ kind: 'book', book: +btn.dataset.b, start: b.start, end: b.end }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'zoomFocus') zoomToSpan(state.focus.start, state.focus.end, state.focus.kind === 'verse' ? 40 : 0.6);
    else if (a === 'deselect') { state.selected = -1; drawBase(); renderPanel(); syncURL(true); focusPanelHeading(); }
    else if (a === 'clear') { clearAll(); focusPanelHeading(); }
    else if (a === 'search') { el.search.value = btn.dataset.q; runSearch(); }
    else if (a === 'mode') setMode(btn.dataset.mode);
    else if (a === 'startJourney') { startJourney(+btn.dataset.j); focusPanelHeading(); }
    else if (a === 'stepNext') { goStep(1); focusPanelHeading(); }
    else if (a === 'stepPrev') { goStep(-1); focusPanelHeading(); }
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
    if (mode !== 'explore') state.selected = -1;
    state.mode = mode;
    if (mode !== 'journey') state.journey = null;
    updateNav(); drawBase(); renderPanel(); syncURL(true); focusPanelHeading();
  }
  function updateNav() {
    document.querySelectorAll('[data-nav]').forEach(b => {
      const on = state.mode === b.dataset.nav || (b.dataset.nav === 'journeys' && state.mode === 'journey');
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
    $('versionSel').innerHTML = Object.entries(VERSIONS).map(([k, v]) => `<option value="${k}">${k}: ${esc(v.name)}</option>`).join('');
  }

  el.fromSel.addEventListener('change', () => { state.from = el.fromSel.value; applyFilters(); syncURL(true); });
  el.toSel.addEventListener('change', () => { state.to = el.toSel.value; applyFilters(); syncURL(true); });
  el.theme.addEventListener('change', () => { state.theme = el.theme.value; state.focus = null; state.selected = -1; state.mode = 'explore'; state.journey = null; updateNav(); applyFilters(); syncURL(true); });
  el.notesOnly.addEventListener('change', () => { state.notesOnly = el.notesOnly.checked; applyFilters(); syncURL(true); });
  let votesT = 0;
  el.votes.addEventListener('input', () => {
    state.minVotes = +el.votes.value;
    el.votesOut.textContent = el.votes.value;
    clearTimeout(votesT);
    votesT = setTimeout(() => { applyFilters(); syncURL(); }, 60);
  });
  el.controls.addEventListener('change', (e) => {
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

  // ---------- Header: settings, about, install ----------
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
    $('versionSel').value = settings.version;
    f.addEventListener('change', (e) => {
      if (e.target.name === 'appearance') settings.appearance = e.target.value;
      if (e.target.id === 'contrastToggle') settings.contrast = e.target.checked;
      if (e.target.id === 'versionSel') settings.version = e.target.value;
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
    document.body.classList.add('landing-open');
    landing.scrollTop = 0;
    resetView(false);
    paintHero();
  }
  function hideLanding() {
    if (landing.hidden) return false;
    landing.hidden = true;
    layout.inert = false;
    document.body.classList.remove('landing-open');
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
    ctx.drawImage(el.base, sx0 * dpr, sy0 * dpr, sw * dpr, sh * dpr, (w - dw) / 2 * dpr, (h - dh) / 2 * dpr, dw * dpr, dh * dpr);
  }
  function buildLanding() {
    const fmt = (n) => n.toLocaleString();
    $('landingStats').innerHTML = [
      [fmt(N), 'cross references'], [fmt(TOTAL), 'verses'], ['66', 'books'], [String(JOURNEYS.length), 'guided journeys'],
    ].map(([n, l]) => `<li><strong>${n}</strong><span>${l}</span></li>`).join('');
    $('landingThemes').innerHTML = THEMES.map(t => `<li><button type="button" class="chip" data-theme="${t.id}">${esc(t.name)}</button></li>`).join('');
  }
  landing.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.start === 'map') {
      hideLanding(); syncURL(true); el.viz.focus();
      announce(`Map of ${filtered.length.toLocaleString()} connections. Use the details panel or arrow keys to explore.`);
    }
    else if (btn.dataset.start === 'journeys') { hideLanding(); setMode('journeys'); }
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
    Object.assign(state, { minVotes: DEFAULT_VOTES, from: 'all', to: 'all', theme: '', notesOnly: false, focus: null, selected: -1, mode: 'explore', journey: null, colorMode: 'distance' });
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
    if (state.theme) items.push(['theme', `Theme: ${THEMES.find(t => t.id === state.theme).name}`]);
    if (state.from !== 'all' || state.to !== 'all') items.push(['between', `Between ${state.from === 'all' ? 'Whole Bible' : selName(state.from)} and ${state.to === 'all' ? 'Whole Bible' : selName(state.to)}`]);
    if (state.minVotes !== DEFAULT_VOTES) items.push(['votes', `Strength ${state.minVotes}+ votes`]);
    if (state.notesOnly) items.push(['notes', 'Only with notes']);
    if (state.focus && state.mode === 'explore') items.push(['focus', state.focus.kind === 'words' ? `Word: ${rangeLabel(state.focus)}` : rangeLabel(state.focus)]);
    if (state.selected >= 0 && state.mode === 'explore') items.push(['selected', `${refLabel(F[state.selected])} ↔ ${refLabel(T[state.selected], E[state.selected])}`]);
    return items;
  }
  function renderContext() {
    const bar = $('contextBar');
    if (!bar || !N) return;
    const items = contextItems();
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
      if (state.mode === 'journey' && state.journey) { p.set('journey', JOURNEYS[state.journey.j].id); p.set('step', state.journey.step + 1); }
      else if (state.mode === 'journeys' || state.mode === 'insights') p.set('view', state.mode);
      else {
        if (state.focus) { if (state.focus.kind === 'words') p.set('q', state.focus.query); else p.set('ref', rangeLabel(state.focus)); }
        if (state.selected >= 0) p.set('c', `${toOsis(F[state.selected])}_${toOsis(T[state.selected])}`);
      }
      if (![...p.keys()].length) p.set('view', 'map');
      url = `?${p}`;
    }
    renderContext();
    const current = location.search || location.pathname;
    if (url === current || (url === location.pathname && !location.search)) return;
    if (push && !restoring) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }
  function readURL() {
    const p = new URLSearchParams(location.search);
    if (p.has('min')) state.minVotes = Math.min(40, Math.max(3, +p.get('min') || DEFAULT_VOTES));
    const validSel = (v) => v && [...el.fromSel.options].some(o => o.value === v);
    if (validSel(p.get('from'))) state.from = p.get('from');
    if (validSel(p.get('to'))) state.to = p.get('to');
    if (THEMES.some(t => t.id === p.get('theme'))) state.theme = p.get('theme');
    if (p.get('color') === 'category') state.colorMode = 'category';
    state.notesOnly = p.get('notes') === '1';
    syncControls();
    return p;
  }
  function syncControls() {
    el.votes.value = state.minVotes; el.votesOut.textContent = state.minVotes;
    el.fromSel.value = state.from; el.toSel.value = state.to; el.theme.value = state.theme; el.notesOnly.checked = state.notesOnly;
    el.controls.querySelector(`input[value="${state.colorMode}"]`).checked = true;
  }
  function findRef(a, b) {
    let best = -1;
    for (let i = 0; i < N; i++) if ((F[i] === a && T[i] === b) || (F[i] === b && T[i] === a)) { if (best < 0 || V[i] > V[best]) best = i; }
    return best;
  }
  async function restoreFromURL(p) {
    const jn = JOURNEYS.findIndex(j => j.id === p.get('journey'));
    if (jn >= 0) { startJourney(jn, Math.min(journeySteps[jn].length, Math.max(1, +p.get('step') || 1)) - 1); return; }
    if (p.get('view') === 'journeys' || p.get('view') === 'insights') { state.mode = p.get('view'); updateNav(); drawBase(); renderPanel(); return; }
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
      Object.assign(state, { minVotes: DEFAULT_VOTES, from: 'all', to: 'all', theme: '', notesOnly: false, focus: null, selected: -1, mode: 'explore', journey: null, colorMode: 'distance' });
      const p = readURL();
      renderLegend(); updateNav(); applyFilters();
      if (![...p.keys()].length) { showLanding(); return; }
      hideLanding();
      const hasDetail = ['journey', 'ref', 'q', 'c'].some(k => p.has(k));
      if (!hasDetail) resetView();
      await restoreFromURL(p);
    } finally {
      restoring = false;
      syncURL();
    }
  }
  window.addEventListener('popstate', () => { if (N) applyLocation(); });

  // ---------- Boot ----------
  async function init() {
    applyAppearance();
    try { await loadData(); }
    catch { el.loading.textContent = 'Sorry, the data could not be loaded. Please refresh the page.'; return; }
    buildSelects();
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
