// Printable journey handout: references, notes and discussion questions only (no Bible text).
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
    'Made with Bible Connections,': 'Hecho con Bible Connections,', 'Handout': 'Hoja', 'Sorry, the handout could not be loaded. Please try again.': 'Lo sentimos, no se pudo cargar la hoja. Inténtalo de nuevo.',
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
})();
