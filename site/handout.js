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
    'Leader guide': 'Guía para el líder', 'About {m} minutes': 'Unos {m} minutos', '{m} min': '{m} min',
    'Before you meet': 'Antes de reunirse', 'Welcome and opening': 'Bienvenida e inicio', 'Close': 'Cierre',
    'Read the passages in each step yourself, in the translation your group will use.': 'Lee tú mismo los pasajes de cada paso, en la traducción que usará el grupo.',
    'Open the journey on a screen, or print a handout for each person.': 'Abre el recorrido en una pantalla o imprime una hoja para cada persona.',
    'Decide who will read each passage aloud, and ask them ahead of time.': 'Decide quién leerá cada pasaje en voz alta y pídeselo con tiempo.',
    'Welcome everyone and pray briefly.': 'Da la bienvenida a todos y oren brevemente.',
    'Say in a sentence where this journey goes: {s}': 'Explica en una frase hacia dónde va este recorrido: {s}',
    'Ask: What do you already know about this theme?': 'Pregunta: ¿Qué sabes ya de este tema?',
    'Ask someone to read {a}, then someone else to read {b}.': 'Pide a alguien que lea {a} y a otra persona que lea {b}.',
    'Leader note': 'Nota para el líder', 'Discuss': 'Conversen', 'Follow up: What does this show us about God? What might it change this week?': 'Para seguir: ¿Qué nos muestra esto de Dios? ¿Qué podría cambiar esta semana?',
    'Keep it short. One good answer is enough before moving on.': 'Sé breve. Una buena respuesta basta antes de seguir.',
    'Ask each person to name one connection that stood out.': 'Pide a cada persona que diga una conexión que le llamó la atención.',
    'Pray together about what you have read.': 'Oren juntos sobre lo que han leído.',
    'Share the link so people can explore more at home.': 'Comparte el enlace para que puedan explorar más en casa.',
    'Ideas for leading with children': 'Ideas para dirigir con niños',
    'Let children find each passage in a children\'s Bible, and act out or draw the story.': 'Deja que los niños busquen cada pasaje en una Biblia para niños, y que representen o dibujen la historia.',
    'Group handout': 'Hoja para el grupo',
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
    if (params.get('guide') === 'leader') { leader(meta, journeys.find(x => x.id === params.get('journey'))); return; }
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

  // ---------- Leader guide: timings, preparation and notes for the person leading a journey ----------
  function leader(meta, j) {
    if (!j) { main.innerHTML = `<p class="error">${t('Journey not found.')} <a href="./?view=journeys">${t('Choose a journey')}</a>.</p>`; return; }
    const books = new Map(meta.books.map(b => [b.osis, b.name]));
    const label = (osis) => { const [b, c, v] = osis.split('.'); return `${books.get(b) || b} ${c}:${v}`; };
    const kids = j.id.startsWith('kids-');
    const per = kids ? 5 : 6, open = 5, close = 5, total = open + close + per * j.steps.length;
    const q = lang !== 'en' ? '&lang=' + lang : '';
    document.title = `${j.name} · ${t('Leader guide')} · Bible Connections`;
    document.getElementById('backLink').href = `./?journey=${encodeURIComponent(j.id)}&step=1${q}`;
    const site = location.origin + location.pathname.replace(/handout\.html$/, '');
    main.innerHTML = `<p class="kicker">${t('Leader guide')}</p><h1>${esc(j.name)}</h1>
      <p class="summary">${esc(j.summary)} <strong>${esc(t('About {m} minutes', { m: total }))}</strong></p>
      <section><h2>${t('Before you meet')}</h2><ul class="check">
        <li>${t('Read the passages in each step yourself, in the translation your group will use.')}</li>
        <li>${t('Open the journey on a screen, or print a handout for each person.')} <a href="handout.html?journey=${encodeURIComponent(j.id)}${q}">${t('Group handout')}</a></li>
        <li>${t('Decide who will read each passage aloud, and ask them ahead of time.')}</li></ul>
        <p class="hint">${t('Follow up: What does this show us about God? What might it change this week?')} ${t('Keep it short. One good answer is enough before moving on.')}</p></section>
      <section><h2><span class="time">${t('{m} min', { m: open })}</span>${t('Welcome and opening')}</h2><ul>
        <li>${t('Welcome everyone and pray briefly.')}</li>
        <li>${esc(t('Say in a sentence where this journey goes: {s}', { s: j.summary }))}</li>
        <li>${t('Ask: What do you already know about this theme?')}</li></ul></section>
      <ol class="steps">${j.steps.map(s => `<li>
        <h2><span class="time">${t('{m} min', { m: per })}</span>${esc(s.title)}</h2>
        <p class="refs">${esc(t('Ask someone to read {a}, then someone else to read {b}.', { a: label(s.a), b: label(s.b) }))}</p>
        <p><strong>${t('Leader note')}:</strong> ${esc(s.note)}</p>
        ${s.question ? `<p><strong>${t('Discuss')}:</strong> ${esc(s.question)}</p>` : ''}
      </li>`).join('')}</ol>
      <section><h2><span class="time">${t('{m} min', { m: close })}</span>${t('Close')}</h2><ul>
        <li>${t('Ask each person to name one connection that stood out.')}</li>
        <li>${t('Pray together about what you have read.')}</li>
        <li>${t('Share the link so people can explore more at home.')} ${esc(site)}?journey=${esc(j.id)}</li></ul></section>
      ${kids ? `<section><h2>${t('Ideas for leading with children')}</h2><p>${t('Let children find each passage in a children\'s Bible, and act out or draw the story.')}</p></section>` : ''}
      <footer>${t('Read each passage in your own Bible or at bible.com. Cross references from OpenBible.info (CC BY 4.0).')}
      ${t('Made with Bible Connections,')} ${esc(site)}</footer>`;
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
