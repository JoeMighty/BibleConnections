// Collection slides: slides.html?c=<shared collection>. One slide per item, with references and
// links to read them at Bible.com. No translation text is shown.
(async () => {
  const deck = document.getElementById('deck');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem('bc.' + k)); return v === null ? d : v; } catch { return d; } };
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang');
  if (!['en', 'es'].includes(lang)) lang = get('lang', 'en');
  if (!['en', 'es'].includes(lang)) lang = 'en';
  document.documentElement.lang = lang;
  const ES = {
    'Slides': 'Diapositivas', 'Back': 'Volver', 'Light': 'Claro', 'Dark': 'Oscuro', 'Full screen': 'Pantalla completa', 'Exit full screen': 'Salir de pantalla completa',
    'Print or save as PDF': 'Imprimir o guardar como PDF', 'Previous slide': 'Diapositiva anterior', 'Next slide': 'Diapositiva siguiente', 'Slide controls': 'Controles',
    'Loading…': 'Cargando…', '{n} items': '{n} elementos', '1 item': '1 elemento', 'A collection from Bible Connections': 'Una colección de Bible Connections',
    'Read': 'Leer', 'Open on the map': 'Abrir en el mapa', 'connects to': 'se conecta con', 'Step {n}': 'Paso {n}',
    'Read each passage in your own Bible or at bible.com.': 'Lee cada pasaje en tu propia Biblia o en bible.com.',
    'Cross references from OpenBible.info (CC BY 4.0).': 'Referencias cruzadas de OpenBible.info (CC BY 4.0).',
    'Made with Bible Connections': 'Hecho con Bible Connections', 'Thank you': 'Gracias',
    'This collection could not be opened. Ask for the link again.': 'No se pudo abrir esta colección. Pide el enlace de nuevo.',
    'Slide {n} of {t}': 'Diapositiva {n} de {t}', 'Use the arrow keys, a clicker or swipe to move between slides.': 'Usa las flechas, un control remoto o desliza para pasar de diapositiva.',
  };
  const t = (k, v = {}) => (lang === 'es' && ES[k] ? ES[k] : k).replace(/\{(\w+)\}/g, (_, x) => v[x]);
  const pick = (o, k) => (lang === 'es' && o[k + '_es']) || o[k];
  const withLang = (u) => (lang === 'en' ? u : u + (u.includes('?') ? '&' : '?') + 'lang=' + lang);
  for (const [id, k] of [['backLink', 'Back'], ['fullBtn', 'Full screen'], ['printBtn', 'Print or save as PDF']]) document.getElementById(id).textContent = t(k);
  document.getElementById('prevBtn').setAttribute('aria-label', t('Previous slide'));
  document.getElementById('nextBtn').setAttribute('aria-label', t('Next slide'));
  document.querySelector('.bar').setAttribute('aria-label', t('Slide controls'));
  deck.setAttribute('aria-label', t('Slides'));

  // the same encoding the map uses for shared collections
  const decode = (s) => {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
      return { name: String(o.n).slice(0, 80), items: (o.i || []).slice(0, 50).map(([label, url]) => ({ label: String(label).slice(0, 120), url: String(url).startsWith('?') ? String(url) : '?view=map' })) };
    } catch { return null; }
  };
  const col = decode(params.get('c') || '');
  document.getElementById('backLink').href = withLang(col ? './?collection=' + encodeURIComponent(params.get('c')) : './?view=collections');
  if (!col) { deck.innerHTML = `<p class="error">${esc(t('This collection could not be opened. Ask for the link again.'))}</p>`; return; }
  document.title = `${col.name} · ${t('Slides')} · Bible Connections`;

  const [meta, versions, es, prophecy, journeys, jes] = await Promise.all([
    fetch('data/books.json').then(r => r.json()),
    fetch('content/versions.json').then(r => r.json()).catch(() => []),
    lang === 'es' ? fetch('content/i18n/books-es.json').then(r => r.json()).catch(() => null) : null,
    col.items.some(x => x.url.includes('prophecy=')) ? fetch('content/prophecy.json').then(r => r.json()).catch(() => null) : null,
    col.items.some(x => x.url.includes('journey=')) ? fetch('content/journeys.json').then(r => r.json()).catch(() => []) : [],
    lang === 'es' && col.items.some(x => x.url.includes('journey=')) ? fetch('content/journeys.es.json').then(r => r.json()).catch(() => []) : [],
  ]);
  const B = meta.books;
  const enNames = B.map(b => b.name);
  if (es) B.forEach((b, i) => { b.name = es.books[i] || b.name; });
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
  const byName = new Map();
  B.forEach((b, i) => { byName.set(norm(b.name), i); byName.set(norm(enNames[i]), i); byName.set(norm(b.osis), i); });

  // Bible.com links in the reader's chosen translation
  let ver = versions.find(v => v.code === get('version', lang === 'es' ? 'NVI' : 'NIV')) || versions.find(v => v.code === 'NIV') || { id: 111, code: 'NIV' };
  const link = (bi, c, v) => {
    const use = ver.nt && bi < 39 ? (versions.find(x => x.code === 'NIV') || ver) : ver;
    return `https://www.bible.com/bible/${use.id}/${B[bi].usfm}.${c}${v ? '.' + v : ''}.${use.code}`;
  };
  const fromOsis = (o) => { const [bk, c, v] = String(o).split('.'); const bi = B.findIndex(b => b.osis === bk); return bi < 0 ? null : { bi, c: +c, v: +v || 0 }; };
  const label = (r, end) => {
    let s = `${B[r.bi].name} ${r.c}${r.v ? ':' + r.v : ''}`;
    if (end && end.bi === r.bi && end.c === r.c && end.v !== r.v) s += `-${end.v}`;
    return s;
  };
  const refLink = (r, end) => `<a href="${esc(link(r.bi, r.c, r.v))}" target="_blank" rel="noopener">${esc(label(r, end))}<span class="sr-only"> (${esc(t('Read'))}, bible.com)</span></a>`;
  const parseLabel = (s) => {
    const m = String(s).match(/^(.+?)\s+(\d+)(?::(\d+))?/);
    if (!m) return null;
    const bi = byName.get(norm(m[1]));
    return bi === undefined ? null : { bi, c: +m[2], v: +m[3] || 0 };
  };

  // what each item shows depends on the kind of link it is
  function itemSlide(item, n) {
    const q = new URLSearchParams(item.url.slice(1));
    let body = `<h2>${esc(item.label)}</h2>`;
    if (q.get('c')) {
      const [a, b] = q.get('c').split(/[~_]/).map(fromOsis);
      if (a && b) body = `<h2>${esc(item.label)}</h2><ul class="refs"><li>${refLink(a)}</li><li class="arrow" aria-hidden="true">${esc(t('connects to'))}</li><li>${refLink(b)}</li></ul>`;
    } else if (q.get('prophecy') && prophecy) {
      const ch = prophecy.groups.flatMap(g => g.chains).find(c => c.id === q.get('prophecy'));
      if (ch) body = `<p class="kicker">${esc(pick(prophecy.types[ch.type], 'name'))}</p><h2>${esc(pick(ch, 'title'))}</h2>
        <ol class="stages">${ch.stages.map(s => { const a = fromOsis(s.ref), z = s.end ? fromOsis(s.end) : null; return a ? `<li><strong>${esc(pick(s, 'label'))}</strong>${refLink(a, z)}</li>` : ''; }).join('')}</ol>`;
    } else if (q.get('journey')) {
      const j = journeys.find(x => x.id === q.get('journey')), step = Math.max(1, +q.get('step') || 1);
      const s = j && j.steps[step - 1];
      if (s) {
        const x = (jes.find(y => y.id === j.id) || { steps: [] }).steps[step - 1] || {};
        const a = fromOsis(s.a), b = fromOsis(s.b);
        body = `<p class="kicker">${esc((jes.find(y => y.id === j.id) || {}).name || j.name)} · ${esc(t('Step {n}', { n: step }))}</p><h2>${esc(x.title || s.title)}</h2>
          ${a && b ? `<ul class="refs"><li>${refLink(a)}</li><li class="arrow" aria-hidden="true">${esc(t('connects to'))}</li><li>${refLink(b)}</li></ul>` : ''}
          ${(x.question || s.question) ? `<p class="q">${esc(x.question || s.question)}</p>` : ''}`;
      }
    } else if (q.get('ref')) {
      const r = parseLabel(q.get('ref'));
      if (r) body = `<h2>${esc(item.label)}</h2><ul class="refs"><li>${refLink(r)}</li></ul>`;
    }
    return `<section class="slide" aria-roledescription="slide" aria-label="${esc(t('Slide {n} of {t}', { n: n + 2, t: col.items.length + 2 }))}" hidden>
      ${body}<p class="meta"><a href="${esc(withLang('./' + item.url))}">${esc(t('Open on the map'))}</a></p></section>`;
  }

  const site = location.origin + location.pathname.replace(/slides\.html$/, '');
  const total = col.items.length + 2;
  deck.innerHTML = `<section class="slide" aria-roledescription="slide" aria-label="${esc(t('Slide {n} of {t}', { n: 1, t: total }))}">
      <p class="kicker">${esc(t('A collection from Bible Connections'))}</p><h1>${esc(col.name)}</h1>
      <p class="sub">${esc(col.items.length === 1 ? t('1 item') : t('{n} items', { n: col.items.length }))}</p>
      <p class="meta">${esc(t('Use the arrow keys, a clicker or swipe to move between slides.'))}</p></section>
    ${col.items.map(itemSlide).join('')}
    <section class="slide" aria-roledescription="slide" aria-label="${esc(t('Slide {n} of {t}', { n: total, t: total }))}" hidden>
      <h2>${esc(t('Thank you'))}</h2><p class="sub">${esc(t('Read each passage in your own Bible or at bible.com.'))}</p>
      <p class="meta">${esc(t('Cross references from OpenBible.info (CC BY 4.0).'))} ${esc(t('Made with Bible Connections'))}: <a href="${esc(site)}">${esc(site.replace(/^https?:\/\//, ''))}</a></p></section>`;

  // ---------- moving between slides ----------
  const slides = [...deck.querySelectorAll('.slide')];
  const counter = document.getElementById('counter'), prev = document.getElementById('prevBtn'), next = document.getElementById('nextBtn');
  let at = Math.min(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1), slides.length - 1);
  function show(n, focus = false) {
    at = Math.min(Math.max(0, n), slides.length - 1);
    slides.forEach((s, i) => { s.hidden = i !== at; s.classList.toggle('enter', i === at); });
    counter.textContent = `${at + 1} / ${slides.length}`;
    prev.disabled = at === 0; next.disabled = at === slides.length - 1;
    history.replaceState(null, '', '#' + (at + 1));
    if (focus) { slides[at].tabIndex = -1; slides[at].focus({ preventScroll: true }); }
  }
  show(at);
  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('button, a') && (e.key === ' ' || e.key === 'Enter')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'n'].includes(e.key)) { e.preventDefault(); show(at + 1, true); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p'].includes(e.key)) { e.preventDefault(); show(at - 1, true); }
    else if (e.key === 'Home') { e.preventDefault(); show(0, true); }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1, true); }
    else if (e.key === 'f') toggleFull();
  });
  let touch = null;
  deck.addEventListener('touchstart', (e) => { touch = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
  deck.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(at + (dx < 0 ? 1 : -1));
    touch = null;
  });

  // ---------- light or dark, full screen and print ----------
  const themeBtn = document.getElementById('themeBtn');
  const setThemeLabel = () => { themeBtn.textContent = t(document.documentElement.dataset.theme === 'light' ? 'Dark' : 'Light'); };
  setThemeLabel();
  themeBtn.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    try { localStorage.setItem('bc.slidesTheme', JSON.stringify(light ? 'light' : 'dark')); } catch { /* storage unavailable */ }
    setThemeLabel();
  });
  const fullBtn = document.getElementById('fullBtn');
  function toggleFull() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  if (!document.documentElement.requestFullscreen) fullBtn.hidden = true;
  fullBtn.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', () => { fullBtn.textContent = t(document.fullscreenElement ? 'Exit full screen' : 'Full screen'); });
  document.getElementById('printBtn').addEventListener('click', () => window.print());
})();
