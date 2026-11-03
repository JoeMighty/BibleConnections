(() => {
  'use strict';

  // ---------- Constants ----------
  const CATEGORIES = {
    law:        { name: 'Law',              color: '#ff6b6b' },
    history:    { name: 'History',          color: '#ffa94d' },
    wisdom:     { name: 'Wisdom & Poetry',  color: '#ffd43b' },
    major:      { name: 'Major Prophets',   color: '#a9e34b' },
    minor:      { name: 'Minor Prophets',   color: '#38d9a9' },
    gospels:    { name: 'Gospels',          color: '#4dabf7' },
    acts:       { name: 'Acts',             color: '#91a7ff' },
    paul:       { name: 'Paul\'s Letters',  color: '#da77f2' },
    general:    { name: 'General Letters',  color: '#f783ac' },
    revelation: { name: 'Revelation',       color: '#e9ecef' },
  };
  const BUCKETS = 32;
  const AXIS_H = 70;          // px reserved under the baseline
  const BAR_MAX = 30;         // px height of the tallest chapter bar
  const MARGIN = 14;
  const PAGE = 60;            // list items per "show more"
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (id) => document.getElementById(id);
  const el = {
    viz: $('viz'), base: $('baseCanvas'), overlay: $('overlayCanvas'), tooltip: $('tooltip'),
    loading: $('loading'), legend: $('legend'), tagline: $('tagline'), count: $('count'),
    controls: $('controls'), search: $('search'), searchError: $('searchError'), bookList: $('bookList'),
    theme: $('theme'), fromSel: $('fromSel'), toSel: $('toSel'), votes: $('votes'), votesOut: $('votesOut'),
    panel: $('panel'), panelTitle: $('panelTitle'), panelBody: $('panelBody'), announcer: $('announcer'),
    about: $('about'),
  };
  const bctx = el.base.getContext('2d');
  const octx = el.overlay.getContext('2d');

  // ---------- Data ----------
  let BOOKS, TOTAL, N, F, T, E, V, verseBook, verseChap, verseNum, chapters;
  const textCache = new Map();

  async function loadData() {
    const [meta, bin] = await Promise.all([
      fetch('data/books.json').then(r => r.json()),
      fetch('data/refs.bin').then(r => r.arrayBuffer()),
    ]);
    BOOKS = meta.books; TOTAL = meta.totalVerses;
    const raw = new Uint16Array(bin);
    N = raw.length / 4;
    F = new Uint16Array(N); T = new Uint16Array(N); E = new Uint16Array(N); V = new Uint16Array(N);
    for (let i = 0; i < N; i++) { F[i] = raw[i * 4]; T[i] = raw[i * 4 + 1]; E[i] = raw[i * 4 + 2]; V[i] = raw[i * 4 + 3]; }

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
  }

  async function bookText(bi) {
    const osis = BOOKS[bi].osis;
    if (!textCache.has(osis)) textCache.set(osis, fetch(`data/text/${osis}.json`).then(r => r.json()));
    return textCache.get(osis);
  }
  async function rangeText(start, end) {
    const out = [];
    for (let v = start; v <= end && out.length < 40; v++) {
      const bi = verseBook[v];
      const text = await bookText(bi);
      out.push({ v, num: verseNum[v], text: text[verseChap[v] - 1][verseNum[v] - 1] || '' });
    }
    return out;
  }

  // ---------- Reference helpers ----------
  function refLabel(start, end = start) {
    const b = BOOKS[verseBook[start]].name, c = verseChap[start], v = verseNum[start];
    if (end === start) return `${b} ${c}:${v}`;
    if (verseBook[end] === verseBook[start] && verseChap[end] === c) return `${b} ${c}:${v}-${verseNum[end]}`;
    return `${b} ${c}:${v} to ${refLabel(end)}`;
  }
  function rangeLabel(r) {
    if (r.kind === 'book') return BOOKS[r.book].name;
    if (r.kind === 'chapter') return `${BOOKS[r.book].name} ${r.chapter}`;
    return refLabel(r.start, r.end - 1);
  }
  function osisToIndex(osis) {
    const [bk, c, v] = osis.split('.');
    const bi = BOOKS.findIndex(b => b.osis === bk);
    if (bi < 0) return -1;
    const b = BOOKS[bi];
    const ci = Math.min(+c, b.chapters.length) - 1;
    return b.chapterStart[ci] + Math.min(+v, b.chapters[ci]) - 1;
  }

  const ALIASES = {
    jn: 'John', jhn: 'John', mt: 'Matthew', mk: 'Mark', lk: 'Luke', ps: 'Psalms', psalm: 'Psalms', pss: 'Psalms',
    sos: 'Song of Songs', songofsolomon: 'Song of Songs', song: 'Song of Songs', canticles: 'Song of Songs',
    revelations: 'Revelation', rev: 'Revelation', phil: 'Philippians', phm: 'Philemon', philem: 'Philemon',
    jas: 'James', jdg: 'Judges', judg: 'Judges', ezk: 'Ezekiel', eze: 'Ezekiel',
  };
  const norm = (s) => s.toLowerCase().trim()
    .replace(/^(iii|3rd|third)\s+/, '3').replace(/^(ii|2nd|second)\s+/, '2').replace(/^(i|1st|first)\s+/, '1')
    .replace(/[^a-z0-9]/g, '');
  function findBook(q) {
    const n = norm(q);
    if (!n) return -1;
    if (ALIASES[n]) return BOOKS.findIndex(b => b.name === ALIASES[n]);
    let bi = BOOKS.findIndex(b => norm(b.name) === n || norm(b.osis) === n);
    if (bi < 0) bi = BOOKS.findIndex(b => norm(b.name).startsWith(n));
    if (bi < 0) bi = BOOKS.findIndex(b => norm(b.osis).startsWith(n));
    return bi;
  }
  function parseReference(input) {
    const m = input.trim().match(/^([1-3]?\s*[a-z][a-z .]*?)\s*(\d+)?(?:\s*[:.\s]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/i);
    if (!m) return null;
    const bi = findBook(m[1]);
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
    minVotes: 7, from: 'all', to: 'all', theme: '', colorMode: 'distance',
    focus: null,       // {kind, book, chapter?, start, end} range of verses [start, end)
    selected: -1,      // index into refs
    hover: -1, hoverChapter: -1,
  };
  const view = { k: 1, tx: 0, ty: 0, fitK: 1, W: 0, H: 0, dpr: 1 };
  let filtered = new Int32Array(0);   // indices passing filters
  let focusList = new Int32Array(0);  // indices touching the focus range, sorted by votes
  let themeMask = null;
  let listShown = PAGE;

  // ---------- Filtering ----------
  function selInterval(sel) {
    if (sel === 'all') return [0, TOTAL];
    if (sel === 'ot') return [0, BOOKS[39].start];
    if (sel === 'nt') return [BOOKS[39].start, TOTAL];
    const [kind, id] = sel.split(':');
    if (kind === 'book') { const b = BOOKS[+id]; return [b.start, b.end]; }
    const bs = BOOKS.filter(b => b.cat === id);
    return [bs[0].start, bs[bs.length - 1].end];
  }

  function applyFilters() {
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
      if (V[i] < state.minVotes) continue;
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
    if (state.selected >= 0 && !out.includes(state.selected)) state.selected = -1;
    computeFocus();
    updateCount();
    drawBase();
    renderPanel();
  }

  function touches(i, s, e) { return (F[i] >= s && F[i] < e) || (T[i] < e && E[i] >= s); }
  function computeFocus() {
    if (!state.focus) { focusList = new Int32Array(0); return; }
    const { start, end } = state.focus;
    const out = [];
    for (const i of filtered) if (touches(i, start, end)) out.push(i);
    out.sort((a, b) => V[b] - V[a]);
    focusList = Int32Array.from(out);
    listShown = PAGE;
  }

  function updateCount() {
    const fmt = (n) => n.toLocaleString();
    el.count.textContent = `Showing ${fmt(filtered.length)} of ${fmt(N)} connections`;
    el.tagline.textContent = `${fmt(filtered.length)} connections across ${fmt(TOTAL)} verses`;
  }

  // ---------- Colour ----------
  const distColors = Array.from({ length: BUCKETS }, (_, b) => {
    const t = b / (BUCKETS - 1);
    return `hsl(${(285 + t * 195) % 360}, 95%, ${60 - t * 6}%)`;
  });
  const catKeys = Object.keys(CATEGORIES);
  function bucketOf(i) {
    if (state.colorMode === 'category') return catKeys.indexOf(BOOKS[verseBook[F[i]]].cat);
    const span = Math.abs(T[i] - F[i]) / TOTAL;
    return Math.min(BUCKETS - 1, Math.floor(Math.sqrt(span) * BUCKETS));
  }
  function colorOf(i) {
    return state.colorMode === 'category' ? CATEGORIES[catKeys[bucketOf(i)]].color : distColors[bucketOf(i)];
  }

  function renderLegend() {
    if (state.colorMode === 'distance') {
      const stops = distColors.filter((_, i) => i % 4 === 0).concat(distColors[BUCKETS - 1]).join(',');
      el.legend.innerHTML = `<span>Near</span><span class="grad" style="background:linear-gradient(90deg,${stops})"></span><span>Far apart</span>`;
    } else {
      el.legend.innerHTML = catKeys.map(k => `<span><span class="sw" style="background:${CATEGORIES[k].color}"></span>${CATEGORIES[k].name}</span>`).join('');
    }
  }

  // ---------- View ----------
  function resize() {
    const r = el.viz.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prevW = view.W, prevFit = view.fitK;
    view.W = r.width; view.H = r.height; view.dpr = dpr;
    for (const c of [el.base, el.overlay]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    const usableH = view.H - AXIS_H - 20;
    view.fitK = Math.min((view.W - 2 * MARGIN) / TOTAL, (usableH * 2) / TOTAL);
    if (!prevW) resetView(false);
    else {
      // keep the same relative zoom on resize
      const rel = view.k / prevFit;
      const cx = (prevW / 2 - view.tx) / view.k;
      view.k = view.fitK * rel;
      view.tx = view.W / 2 - cx * view.k;
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
    const minK = view.fitK * 0.8, maxK = 80;
    view.k = Math.min(maxK, Math.max(minK, view.k));
    const contentW = TOTAL * view.k;
    view.tx = Math.min(view.W * 0.6, Math.max(view.W * 0.4 - contentW, view.tx));
    const maxTy = view.H - AXIS_H + contentW / 2;
    view.ty = Math.min(maxTy, Math.max(AXIS_H, view.ty));
  }
  function zoomAt(px, py, factor) {
    const k0 = view.k;
    let k1 = Math.min(80, Math.max(view.fitK * 0.8, k0 * factor));
    const f = k1 / k0;
    view.tx = px - (px - view.tx) * f;
    view.ty = py + (view.ty - py) * f;
    view.k = k1;
    // keep the baseline from drifting above the bottom when zooming out to fit
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
      // interpolate zoom in log space for a smooth feel
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e);
      // keep the target centre steady
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
    const tx = view.W / 2 - ((s + e) / 2) * k;
    // fit arcs of this span vertically too
    const kh = (view.H - AXIS_H - 30) * 2 / span;
    const kk = Math.max(view.fitK, Math.min(k, kh));
    animateTo({ k: kk, tx: view.W / 2 - ((s + e) / 2) * kk, ty: view.H - AXIS_H }, true);
  }
  function zoomToRef(i) {
    const lo = Math.min(F[i], T[i]), hi = Math.max(F[i], E[i]);
    zoomToSpan(lo, hi + 1, 0.1);
  }

  const sx = (x) => view.tx + x * view.k;

  // ---------- Drawing ----------
  let baseQueued = false, overlayQueued = false;
  function drawBase() { if (!baseQueued) { baseQueued = true; requestAnimationFrame(() => { baseQueued = false; paintBase(); paintOverlay(); }); } }
  function drawOverlay() { if (!overlayQueued) { overlayQueued = true; requestAnimationFrame(() => { overlayQueued = false; paintOverlay(); }); } }

  function arcPath(path, i) {
    const a = F[i] + 0.5, b = T[i] + 0.5;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const r = (hi - lo) / 2 * view.k;
    const cx = view.tx + (lo + hi) / 2 * view.k;
    const W = view.W, by = view.ty;
    if (cx + r < -2 || cx - r > W + 2 || r < 0.35) return false;
    // Only the part of the circle that is on screen is drawn: when zoomed in, huge arcs
    // become two "legs" and tessellating the whole circle would be very slow.
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

  function paintBase() {
    const ctx = bctx, { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, W, H);
    if (!N) return;

    const dim = !!state.focus || state.selected >= 0;
    const nb = state.colorMode === 'category' ? catKeys.length : BUCKETS;
    const paths = Array.from({ length: nb }, () => new Path2D());
    for (const i of filtered) arcPath(paths[bucketOf(i)], i);

    // fainter when crowded, stronger as you zoom in and fewer arcs overlap
    const zoom = view.k / view.fitK;
    let alpha = Math.min(0.9, Math.max(0.05, 22 / Math.sqrt(Math.max(1, filtered.length)) * Math.sqrt(zoom)));
    if (dim) alpha *= 0.3;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = zoom > 20 ? 1.2 : 0.8;
    // far-reaching arcs first so nearer (smaller) arcs sit on top, as in the classic chart
    for (let b = nb - 1; b >= 0; b--) {
      ctx.strokeStyle = state.colorMode === 'category' ? CATEGORIES[catKeys[b]].color : distColors[b];
      ctx.stroke(paths[b]);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    paintAxis(ctx);
  }

  function paintAxis(ctx) {
    const { W, H } = view, y0 = view.ty;
    // backdrop for the axis area so arcs don't bleed into labels
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, y0, W, H - y0);
    const focus = state.focus;
    // chapter bars
    for (let c = 0; c < chapters.length; c++) {
      const ch = chapters[c];
      const x0 = sx(ch.start), x1 = sx(ch.start + ch.count);
      if (x1 < 0 || x0 > W) continue;
      const h = view.k > 14 ? BAR_MAX : 3 + (ch.count / 176) * BAR_MAX;
      const inFocus = focus && ch.start < focus.end && ch.start + ch.count > focus.start;
      ctx.fillStyle = CATEGORIES[BOOKS[ch.book].cat].color;
      ctx.globalAlpha = focus ? (inFocus ? 1 : 0.35) : (c === state.hoverChapter ? 1 : 0.75);
      ctx.fillRect(x0, y0 + 2, Math.max(0.6, x1 - x0 - (x1 - x0 > 4 ? 1 : 0)), h);
    }
    ctx.globalAlpha = 1;
    // baseline
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(0, y0, W, 1);

    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelY = y0 + BAR_MAX + 10;
    // book labels, or chapter labels when zoomed in
    let lastRight = -Infinity;
    for (const b of BOOKS) {
      const x0 = sx(b.start), x1 = sx(b.end);
      if (x1 < 0 || x0 > W) continue;
      ctx.fillStyle = '#2a2a38';
      ctx.fillRect(x0, y0 + 2, 1, BAR_MAX + 6);
      const w = x1 - x0;
      const full = ctx.measureText(b.name).width, short = ctx.measureText(b.osis).width;
      const label = w > full + 6 ? b.name : w > short + 4 ? b.osis : null;
      if (!label) continue;
      let cx = (Math.max(x0, 0) + Math.min(x1, W)) / 2;
      const lw = ctx.measureText(label).width;
      cx = Math.min(Math.max(cx, x0 + lw / 2 + 2), x1 - lw / 2 - 2);
      if (cx - lw / 2 < lastRight + 4) continue;
      ctx.fillStyle = '#c9c9d6';
      ctx.fillText(label, cx, labelY);
      lastRight = cx + lw / 2;
    }
    // chapter numbers / verse numbers
    const chW = (view.k * 25);
    if (chW > 24) {
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#9a9aae';
      let last = -Infinity;
      for (const ch of chapters) {
        const x0 = sx(ch.start), x1 = sx(ch.start + ch.count);
        if (x1 < 0 || x0 > W) continue;
        const cx = (x0 + x1) / 2;
        if (x1 - x0 < 16 || cx < last + 22) continue;
        ctx.fillText(String(ch.chapter), cx, labelY + 15);
        last = cx;
        if (view.k > 14) {
          for (let v = 0; v < ch.count; v++) {
            const vx = sx(ch.start + v + 0.5);
            if (vx < 0 || vx > W) continue;
            ctx.fillStyle = '#08080c';
            ctx.fillText(String(v + 1), vx, y0 + 12);
            ctx.fillStyle = '#9a9aae';
          }
        }
      }
    }
  }

  function strokeRef(ctx, i, color, width, alpha = 1) {
    const p = new Path2D();
    if (!arcPath(p, i)) {
      // tiny arcs: mark the two endpoints so they're still visible
      ctx.fillStyle = color;
      ctx.fillRect(sx(F[i] + 0.5) - 1.5, view.ty - 3, 3, 3);
      return;
    }
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.stroke(p);
    ctx.globalAlpha = 1;
  }

  function paintOverlay() {
    const ctx = octx, { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!N) return;
    if (state.focus) {
      const n = focusList.length;
      const a = Math.min(0.95, Math.max(0.35, 60 / Math.sqrt(n + 1)));
      ctx.globalCompositeOperation = 'lighter';
      const paths = new Map();
      for (const i of focusList) {
        const c = colorOf(i);
        if (!paths.has(c)) paths.set(c, new Path2D());
        arcPath(paths.get(c), i);
      }
      ctx.globalAlpha = a; ctx.lineWidth = 1.4;
      for (const [c, p] of paths) { ctx.strokeStyle = c; ctx.stroke(p); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // focus marker on baseline
      const x0 = sx(state.focus.start), x1 = sx(state.focus.end);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, view.ty - 1, Math.max(2, x1 - x0), 3);
    }
    if (state.hover >= 0 && state.hover !== state.selected) strokeRef(ctx, state.hover, '#ffffff', 1.6, 0.75);
    if (state.selected >= 0) {
      strokeRef(ctx, state.selected, '#000000', 6, 0.6);
      strokeRef(ctx, state.selected, '#ffffff', 2.5);
      const i = state.selected;
      for (const x of [sx(F[i] + 0.5), sx(T[i] + 0.5)]) {
        ctx.beginPath(); ctx.arc(x, view.ty, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd43b'; ctx.fill();
      }
    }
    if (state.hoverChapter >= 0) {
      const ch = chapters[state.hoverChapter];
      ctx.fillStyle = 'rgba(255,255,255,.18)';
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

  function localPoint(e) { const r = el.viz.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

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
      const k = Math.min(80, Math.max(view.fitK * 0.8, pinch.k * d / pinch.d));
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
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      view.tx -= e.deltaX; clampView(); drawBase(); return;
    }
    const scale = e.deltaMode === 1 ? 0.05 : 0.0018;
    zoomAt(x, y, Math.exp(-e.deltaY * scale * (e.ctrlKey ? 4 : 1)));
  }, { passive: false });

  let hoverRaf = 0;
  function hover(x, y) {
    cancelAnimationFrame(hoverRaf);
    hoverRaf = requestAnimationFrame(() => {
      const ch = chapterAt(x, y);
      const h = ch >= 0 ? -1 : hitTest(x, y, 6);
      if (h !== state.hover || ch !== state.hoverChapter) {
        state.hover = h; state.hoverChapter = ch;
        drawOverlay();
      }
      if (h >= 0) showTooltip(x, y, `${refLabel(F[h])} ↔ ${refLabel(T[h], E[h])}`);
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
    else if (state.selected >= 0) { state.selected = -1; drawBase(); renderPanel(); }
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
      case 'n': case 'N': case ']': stepSelection(1); break;
      case 'p': case 'P': case '[': stepSelection(-1); break;
      case 'Escape': clearAll(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  function currentList() {
    if (state.focus) return focusList;
    return topList();
  }
  let topCache = null;
  function topList() {
    if (topCache && topCache.src === filtered) return topCache.list;
    const list = Int32Array.from(filtered).sort((a, b) => V[b] - V[a]);
    topCache = { src: filtered, list };
    return list;
  }
  function stepSelection(dir) {
    const list = currentList();
    if (!list.length) return;
    let idx = list.indexOf(state.selected);
    idx = idx < 0 ? (dir > 0 ? 0 : list.length - 1) : (idx + dir + list.length) % list.length;
    selectRef(list[idx], { keepFocusOnViz: true });
  }

  $('zoomIn').addEventListener('click', () => zoomAt(view.W / 2, view.ty, 1.6));
  $('zoomOut').addEventListener('click', () => zoomAt(view.W / 2, view.ty, 1 / 1.6));
  $('zoomReset').addEventListener('click', () => resetView());
  window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 80); });

  // ---------- Selection ----------
  function announce(msg) { el.announcer.textContent = ''; setTimeout(() => { el.announcer.textContent = msg; }, 30); }

  function selectRef(i, opts = {}) {
    state.selected = i;
    drawBase();
    renderPanel();
    announce(`${refLabel(F[i])} connects to ${refLabel(T[i], E[i])}, ${V[i]} votes.`);
    if (opts.zoom) zoomToRef(i);
    if (!opts.keepFocusOnViz && opts.focusPanel) el.panel.focus({ preventScroll: false });
  }
  function setFocus(range, opts = {}) {
    state.focus = range;
    state.selected = -1;
    computeFocus();
    drawBase();
    renderPanel();
    announce(`${rangeLabel(range)}: ${focusList.length.toLocaleString()} connections.`);
    if (opts.zoom) zoomToSpan(range.start, range.end, range.kind === 'verse' ? 40 : 0.6);
  }
  function clearAll() {
    state.focus = null; state.selected = -1; focusList = new Int32Array(0);
    drawBase(); renderPanel();
    announce('Selection cleared.');
  }

  // ---------- Panel ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let panelToken = 0;

  async function verseCard(start, end, color) {
    const verses = await rangeText(start, end);
    const body = verses.map(v => (verses.length > 1 ? `<sup>${v.num}</sup>` : '') + esc(v.text)).join(' ');
    const more = end - start + 1 > verses.length ? ' …' : '';
    return `<div class="verse-card" style="--c:${color}">
      <p class="ref"><span>${esc(refLabel(start, end))}</span><span class="muted">BSB</span></p>
      <blockquote>${body}${more}</blockquote></div>`;
  }

  function connItem(i, otherSide) {
    const cur = i === state.selected ? ' aria-current="true"' : '';
    const label = otherSide ? otherSideLabel(i) : `${refLabel(F[i])} ↔ ${refLabel(T[i], E[i])}`;
    return `<li><button type="button" class="conn-item" data-ref="${i}"${cur}>
      <span class="dot" style="background:${colorOf(i)}" aria-hidden="true"></span>
      <span class="label">${esc(label)}</span><span class="votes">${V[i]} votes</span></button></li>`;
  }
  function otherSideLabel(i) {
    const f = state.focus;
    const fromIn = F[i] >= f.start && F[i] < f.end;
    const toIn = T[i] < f.end && E[i] >= f.start;
    if (fromIn && toIn) return `${refLabel(F[i])} ↔ ${refLabel(T[i], E[i])}`;
    if (fromIn) return `${f.kind === 'verse' && f.end - f.start === 1 ? '' : refLabel(F[i]) + ' → '}${refLabel(T[i], E[i])}`;
    return `${refLabel(F[i])}${f.kind === 'verse' && f.end - f.start === 1 ? '' : ' → ' + refLabel(T[i], E[i])}`;
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

  async function renderPanel() {
    const token = ++panelToken;
    let title = 'Explore', html = '';
    const theme = THEMES.find(t => t.id === state.theme);
    const i = state.selected;

    if (i >= 0) {
      title = 'Connection';
      const color = colorOf(i);
      const [a, b] = await Promise.all([verseCard(F[i], F[i], color), verseCard(T[i], E[i], color)]);
      if (token !== panelToken) return;
      html += a + `<p class="link-arrow" aria-hidden="true">connects to</p>` + b;
      html += `<p class="muted">Strength: ${V[i]} votes on OpenBible.info</p>`;
      html += `<div class="actions">
        <button type="button" class="btn small" data-action="zoomRef">Zoom to this arc</button>
        <button type="button" class="btn ghost small" data-action="focusVerse" data-v="${F[i]}">All links for ${esc(refLabel(F[i]))}</button>
        <button type="button" class="btn ghost small" data-action="focusVerse" data-v="${T[i]}">All links for ${esc(refLabel(T[i]))}</button>
      </div>`;
      if (state.focus) html += `<div class="actions"><button type="button" class="btn ghost small" data-action="deselect">Back to ${esc(rangeLabel(state.focus))}</button></div>`;
      else html += `<div class="actions"><button type="button" class="btn ghost small" data-action="deselect">Close</button></div>`;
    } else if (state.focus) {
      const f = state.focus;
      title = rangeLabel(f);
      if (f.kind === 'verse') {
        html += await verseCard(f.start, f.end - 1, '#ffffff');
        if (token !== panelToken) return;
      }
      html += `<p>${focusList.length.toLocaleString()} connection${focusList.length === 1 ? '' : 's'} with the current filters.</p>`;
      html += `<div class="actions">
        <button type="button" class="btn small" data-action="zoomFocus">Zoom to ${esc(rangeLabel(f))}</button>`;
      if (f.kind !== 'book') html += `<button type="button" class="btn ghost small" data-action="focusBook" data-b="${f.book}">Whole book</button>`;
      html += `<button type="button" class="btn ghost small" data-action="clear">Clear</button></div>`;
      html += `<h3>Connections</h3>` + listHTML(focusList, true);
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
        html += `<p>Each arc joins two passages that point to each other. Tap or click an arc to read both verses. Tap a bar along the bottom to see a chapter's connections.</p>
          <p class="muted">Try searching for <button type="button" class="chip" data-action="search" data-q="John 3:16">John 3:16</button> <button type="button" class="chip" data-action="search" data-q="Isaiah 53">Isaiah 53</button> <button type="button" class="chip" data-action="search" data-q="Psalm 23">Psalm 23</button></p>`;
      }
      html += `<h3>Strongest connections</h3>` + listHTML(topList(), false);
    }
    if (token !== panelToken) return;
    el.panelTitle.textContent = title;
    el.panelBody.innerHTML = html;
  }

  el.panelBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.ref) { selectRef(+btn.dataset.ref, { zoom: false }); el.panelTitle.scrollIntoView({ block: 'nearest' }); focusPanelHeading(); return; }
    const a = btn.dataset.action;
    if (a === 'more') { listShown += PAGE; const y = el.panel.scrollTop; renderPanel().then(() => { el.panel.scrollTop = y; const items = el.panelBody.querySelectorAll('.conn-item'); items[listShown - PAGE]?.focus(); }); }
    else if (a === 'zoomRef') zoomToRef(state.selected);
    else if (a === 'focusVerse') { const v = +btn.dataset.v; setFocus({ kind: 'verse', book: verseBook[v], start: v, end: v + 1 }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'focusBook') { const b = BOOKS[+btn.dataset.b]; setFocus({ kind: 'book', book: +btn.dataset.b, start: b.start, end: b.end }, { zoom: true }); focusPanelHeading(); }
    else if (a === 'zoomFocus') zoomToSpan(state.focus.start, state.focus.end, state.focus.kind === 'verse' ? 40 : 0.6);
    else if (a === 'deselect') { state.selected = -1; drawBase(); renderPanel(); focusPanelHeading(); }
    else if (a === 'clear') { clearAll(); focusPanelHeading(); }
    else if (a === 'search') { el.search.value = btn.dataset.q; runSearch(); }
  });
  function focusPanelHeading() { requestAnimationFrame(() => { el.panel.focus({ preventScroll: true }); }); }

  // ---------- Controls ----------
  function buildSelects() {
    const opts = [`<option value="all">Whole Bible</option>`,
      `<optgroup label="Testaments"><option value="ot">Old Testament</option><option value="nt">New Testament</option></optgroup>`,
      `<optgroup label="Categories">${catKeys.map(k => `<option value="cat:${k}">${CATEGORIES[k].name}</option>`).join('')}</optgroup>`,
      `<optgroup label="Books">${BOOKS.map((b, i) => `<option value="book:${i}">${esc(b.name)}</option>`).join('')}</optgroup>`].join('');
    el.fromSel.innerHTML = opts; el.toSel.innerHTML = opts;
    el.theme.innerHTML += THEMES.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    el.bookList.innerHTML = BOOKS.map(b => `<option value="${esc(b.name)}">`).join('');
  }

  el.fromSel.addEventListener('change', () => { state.from = el.fromSel.value; applyFilters(); syncURL(); });
  el.toSel.addEventListener('change', () => { state.to = el.toSel.value; applyFilters(); syncURL(); });
  el.theme.addEventListener('change', () => { state.theme = el.theme.value; state.focus = null; state.selected = -1; applyFilters(); syncURL(); });
  let votesT = 0;
  el.votes.addEventListener('input', () => {
    state.minVotes = +el.votes.value;
    el.votesOut.textContent = el.votes.value;
    clearTimeout(votesT);
    votesT = setTimeout(() => { applyFilters(); syncURL(); }, 60);
  });
  el.controls.addEventListener('change', (e) => {
    if (e.target.name === 'colorMode') { state.colorMode = e.target.value; renderLegend(); drawBase(); renderPanel(); syncURL(); }
  });
  $('resetAll').addEventListener('click', () => {
    Object.assign(state, { minVotes: 7, from: 'all', to: 'all', theme: '', focus: null, selected: -1 });
    el.votes.value = 7; el.votesOut.textContent = '7'; el.fromSel.value = 'all'; el.toSel.value = 'all'; el.theme.value = '';
    applyFilters(); resetView(); syncURL(); announce('Filters reset.');
  });
  el.controls.addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });
  function runSearch() {
    const q = el.search.value;
    el.searchError.textContent = '';
    if (!q.trim()) return;
    const r = parseReference(q);
    if (!r) { el.searchError.textContent = `Couldn't find "${q}". Try a format like John 3:16 or Psalm 23.`; return; }
    if (r.error) { el.searchError.textContent = r.error; return; }
    setFocus(r, { zoom: true });
    syncURL();
    focusPanelHeading();
  }

  $('aboutBtn').addEventListener('click', () => el.about.showModal());

  // ---------- URL state (shareable links) ----------
  function syncURL() {
    const p = new URLSearchParams();
    if (state.minVotes !== 7) p.set('min', state.minVotes);
    if (state.from !== 'all') p.set('from', state.from);
    if (state.to !== 'all') p.set('to', state.to);
    if (state.theme) p.set('theme', state.theme);
    if (state.colorMode !== 'distance') p.set('color', state.colorMode);
    if (state.focus) p.set('ref', rangeLabel(state.focus));
    const s = p.toString();
    history.replaceState(null, '', s ? `?${s}` : location.pathname);
  }
  function readURL() {
    const p = new URLSearchParams(location.search);
    if (p.has('min')) state.minVotes = Math.min(40, Math.max(3, +p.get('min') || 7));
    const validSel = (v) => v && [...el.fromSel.options].some(o => o.value === v);
    if (validSel(p.get('from'))) state.from = p.get('from');
    if (validSel(p.get('to'))) state.to = p.get('to');
    if (THEMES.some(t => t.id === p.get('theme'))) state.theme = p.get('theme');
    if (p.get('color') === 'category') state.colorMode = 'category';
    el.votes.value = state.minVotes; el.votesOut.textContent = state.minVotes;
    el.fromSel.value = state.from; el.toSel.value = state.to; el.theme.value = state.theme;
    el.controls.querySelector(`input[value="${state.colorMode}"]`).checked = true;
    return p.get('ref');
  }

  // ---------- Boot ----------
  async function init() {
    try {
      await loadData();
    } catch (err) {
      el.loading.textContent = 'Sorry, the data could not be loaded. Please refresh the page.';
      return;
    }
    buildSelects();
    const ref = readURL();
    renderLegend();
    resize();
    applyFilters();
    el.loading.remove();
    if (ref) { const r = parseReference(ref); if (r && !r.error) setFocus(r, { zoom: true }); }
    if (matchMedia('(max-width: 860px)').matches) $('filtersBox').open = false;
  }
  init();
})();
