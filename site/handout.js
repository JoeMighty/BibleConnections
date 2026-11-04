// Printable handouts: a journey (?journey=id) or a single passage (?verse=John.3.16).
// References, notes, original language words and questions only. No translation text.
(async () => {
  const main = document.getElementById('handout');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang');
  if (!['en', 'es'].includes(lang)) { try { lang = JSON.parse(localStorage.getItem('bc.lang')) || 'en'; } catch { lang = 'en'; } }
  const ES = {
    'Print or save as PDF': 'Imprimir o guardar como PDF', 'Back to Bible Connections': 'Volver a Bible Connections',
    'Read {a} and {b}': 'Lee {a} y {b}', 'Journey not found.': 'Recorrido no encontrado.', 'Choose a journey': 'Elige un recorrido',
    'Read each passage in your own Bible or at bible.com. Cross references from OpenBible.info (CC BY 4.0).': 'Lee cada pasaje en tu propia Biblia o en bible.com. Referencias cruzadas de OpenBible.info (CC BY 4.0).',
    'Made with Bible Connections,': 'Hecho con Bible Connections,',
    'Passage study': 'Estudio del pasaje', 'About {b}': 'Acerca de {b}', 'Original {l} words': 'Palabras originales en {l}',
    'Hebrew': 'hebreo', 'Greek': 'griego', 'Aramaic': 'arameo', 'Hebrew and Aramaic': 'hebreo y arameo',
    'Each word shows its pronunciation and dictionary meaning, not a translation of the verse.': 'Cada palabra muestra su pronunciación y su significado de diccionario, no una traducción del versículo.',
    'Strongest connections': 'Conexiones más fuertes', 'Read these passages in your own Bible or at bible.com.': 'Lee estos pasajes en tu propia Biblia o en bible.com.',
    'Reflect': 'Reflexiona', 'My notes': 'Mis notas', 'Verse not found.': 'Versículo no encontrado.', 'Open the map': 'Abrir el mapa',
    'Read {r} in your own Bible or at bible.com before you begin.': 'Lee {r} en tu propia Biblia o en bible.com antes de empezar.',
    'Original language text and word meanings from STEP Bible (CC BY 4.0). Cross references from OpenBible.info (CC BY 4.0).': 'Texto en el idioma original y significados de palabras de STEP Bible (CC BY 4.0). Referencias cruzadas de OpenBible.info (CC BY 4.0).', 'Handout': 'Hoja', 'Sorry, the handout could not be loaded. Please try again.': 'Lo sentimos, no se pudo cargar la hoja. Inténtalo de nuevo.',
  };
  const t = (k, v = {}) => (lang === 'es' && ES[k] ? ES[k] : k).replace(/\{(\w+)\}/g, (_, x) => v[x]);
  document.documentElement.lang = lang;
  document.getElementById('printBtn').textContent = t('Print or save as PDF');
  document.getElementById('backLink').textContent = t('Back to Bible Connections');
  try {
    const [meta, journeys, es, jes] = await Promise.all([
      fetch('data/books.json').then(r => r.json()),
      fetch('content/journeys.json').then(r => r.json()),
      lang === 'es' ? fetch('content/i18n/es.json').then(r => r.json()) : null,
      lang === 'es' ? fetch('content/journeys.es.json').then(r => r.json()).catch(() => []) : [],
    ]);
    if (es) meta.books.forEach((b, i) => { b.name = es.books[i]; });
    for (const j of journeys) {
      const x = jes.find(y => y.id === j.id);
      if (!x) continue;
      Object.assign(j, { name: x.name || j.name, summary: x.summary || j.summary });
      (x.steps || []).forEach((st, n) => Object.assign(j.steps[n], st));
    }
    if (params.get('verse')) { await passage(meta, params.get('verse'), es); return; }
    const id = params.get('journey');
    const j = journeys.find(x => x.id === id);
    if (!j) { main.innerHTML = `<p class="error">${t('Journey not found.')} <a href="./?view=journeys">${t('Choose a journey')}</a>.</p>`; return; }
    const books = new Map(meta.books.map(b => [b.osis, b.name]));
    const label = (osis) => { const [b, c, v] = osis.split('.'); return `${books.get(b) || b} ${c}:${v}`; };
    document.title = `${j.name} · ${t('Handout')} · Bible Connections`;
    document.getElementById('backLink').href = `./?journey=${encodeURIComponent(j.id)}&step=1${lang !== 'en' ? '&lang=' + lang : ''}`;
    main.innerHTML = `<h1>${esc(j.name)}</h1><p class="summary">${esc(j.summary)}</p>
      <ol class="steps">${j.steps.map(s => `<li>
        <h2>${esc(s.title)}</h2>
        <p class="refs">${esc(t('Read {a} and {b}', { a: label(s.a), b: label(s.b) }))}</p>
        <p>${esc(s.note)}</p>
        ${s.question ? `<p class="q">${esc(s.question)}</p><div class="lines" aria-hidden="true"></div>` : ''}
      </li>`).join('')}</ol>
      <footer>${t('Read each passage in your own Bible or at bible.com. Cross references from OpenBible.info (CC BY 4.0).')}
      ${t('Made with Bible Connections,')} ${esc(location.origin + location.pathname.replace(/handout\.html$/, ''))}</footer>`;
  } catch {
    main.innerHTML = `<p class="error">${t('Sorry, the handout could not be loaded. Please try again.')}</p>`;
  }

  // ---------- Passage handout ----------
  async function passage(meta, osis, es) {
    const B = meta.books;
    B.forEach(b => { let s0 = b.start; b.chapterStart = b.chapters.map(n => { const r = s0; s0 += n; return r; }); });
    const [bk, c, vn] = osis.split('.');
    const bi = B.findIndex(b => b.osis === bk);
    const b = B[bi];
    if (!b || !b.chapters[c - 1] || vn < 1 || vn > b.chapters[c - 1]) { main.innerHTML = `<p class="error">${t('Verse not found.')} <a href="./?view=map">${t('Open the map')}</a>.</p>`; return; }
    const v = b.chapterStart[c - 1] + (+vn) - 1;
    const where = (x) => { let k = B.length - 1; while (B[k].start > x) k--; const bb = B[k]; let ch = bb.chapterStart.length - 1; while (bb.chapterStart[ch] > x) ch--; return [k, ch + 1, x - bb.chapterStart[ch] + 1]; };
    const lab = (x, y = x) => { const [k1, c1, v1] = where(x); if (y === x) return `${B[k1].name} ${c1}:${v1}`; const [k2, c2, v2] = where(y); return k1 === k2 && c1 === c2 ? `${B[k1].name} ${c1}:${v1}-${v2}` : `${B[k1].name} ${c1}:${v1} to ${B[k2].name} ${c2}:${v2}`; };
    const ref = lab(v);
    const [bin, intros, reflect, notes, text, strongs] = await Promise.all([
      fetch('data/refs.bin').then(r => r.arrayBuffer()),
      fetch('content/book-intros.json').then(r => r.json()).catch(() => []),
      fetch('content/reflect.json').then(r => r.json()).catch(() => ({})),
      fetch('content/notes.json').then(r => r.json()).catch(() => []),
      fetch(`data/text/${bi}.json`).then(r => r.json()).catch(() => null),
      fetch('data/strongs.json').then(r => r.json()).catch(() => ({})),
    ]);
    const raw = new Uint16Array(bin), conns = [];
    for (let i = 0; i < raw.length; i += 4) {
      const f = raw[i], to = raw[i + 1], e = raw[i + 2], votes = raw[i + 3];
      if (f === v) conns.push([to, e, votes]);
      else if (to <= v && v <= e) conns.push([f, f, votes]);
    }
    conns.sort((x, y) => y[2] - x[2]);
    const seen = new Set();
    const uniq = conns.filter(([a, z]) => { const key = a + '-' + z; if (seen.has(key)) return false; seen.add(key); return true; });
    const toOsis = (x) => { const [k, cc, vv] = where(x); return `${B[k].osis}.${cc}.${vv}`; };
    const noteFor = (a, z) => notes.find(n => (n.from === toOsis(a) && n.to === toOsis(z)) || (n.from === toOsis(z) && n.to === toOsis(a)));
    const intro = intros.find(x => x.osis === b.osis);
    const qs = (reflect[b.cat] || {})[lang] || (reflect[b.cat] || {}).en || [];
    let mine = '';
    try { mine = ((JSON.parse(localStorage.getItem('bc.notes')) || {})[`${b.osis}.${c}.${vn}`] || {}).text || ''; } catch { /* storage unavailable */ }
    const words = text ? (text.v[v - text.s] || '').split('~').filter(Boolean).map(x => x.split('|')) : [];
    const aram = words.filter(w => w[3][0] === 'A').length, greek = bi >= 39;
    const langName = t(greek ? 'Greek' : !aram ? 'Hebrew' : aram === words.length ? 'Aramaic' : 'Hebrew and Aramaic');
    document.title = `${ref} · ${t('Handout')} · Bible Connections`;
    document.getElementById('backLink').href = `./?ref=${encodeURIComponent(ref)}${lang !== 'en' ? '&lang=' + lang : ''}`;
    main.innerHTML = `<p class="kicker">${t('Passage study')}</p><h1>${esc(ref)}</h1>
      <p class="summary">${esc(t('Read {r} in your own Bible or at bible.com before you begin.', { r: ref }))}</p>
      ${intro ? `<section><h2>${esc(t('About {b}', { b: b.name }))}</h2><p>${esc(lang === 'es' && intro.about_es ? intro.about_es : intro.about)}</p></section>` : ''}
      ${words.length ? `<section><h2>${esc(t('Original {l} words', { l: langName }))}</h2>
        <ol class="orig" lang="${greek ? 'el' : 'he'}"${greek ? '' : ' dir="rtl"'}>${words.map(([w, tr, code]) => {
          const g = (strongs[code.replace(/[A-Z]$/, '')] || {}).g || '';
          return `<li><span class="w">${esc(w)}</span><span class="tr" lang="en" dir="ltr">${esc(tr.replace(/\./g, ''))}</span><span class="gl" lang="en" dir="ltr">${esc(g)}</span></li>`;
        }).join('')}</ol><p class="hint">${t('Each word shows its pronunciation and dictionary meaning, not a translation of the verse.')}</p></section>` : ''}
      ${uniq.length ? `<section><h2>${t('Strongest connections')}</h2><p class="hint">${t('Read these passages in your own Bible or at bible.com.')}</p>
        <ol class="conns">${uniq.slice(0, 10).map(([a, z]) => { const n = noteFor(v, a); return `<li><strong>${esc(lab(a, z))}</strong>${n && lang === 'en' ? `<br><span class="note">${esc(n.note)}</span>` : ''}</li>`; }).join('')}</ol></section>` : ''}
      ${qs.length ? `<section><h2>${t('Reflect')}</h2><ol class="qs">${qs.map(q => `<li><p>${esc(q)}</p><div class="lines" aria-hidden="true"></div></li>`).join('')}</ol></section>` : ''}
      <section><h2>${t('My notes')}</h2>${mine ? `<p class="mine">${esc(mine)}</p>` : '<div class="lines tall" aria-hidden="true"></div>'}</section>
      <footer>${t('Original language text and word meanings from STEP Bible (CC BY 4.0). Cross references from OpenBible.info (CC BY 4.0).')}
      ${t('Made with Bible Connections,')} ${esc(location.origin + location.pathname.replace(/handout\.html$/, ''))}</footer>`;
  }
})();
