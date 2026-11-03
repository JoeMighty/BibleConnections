// Printable journey handout: references, notes and discussion questions only (no Bible text).
(async () => {
  const main = document.getElementById('handout');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  try {
    const [meta, journeys] = await Promise.all([
      fetch('data/books.json').then(r => r.json()),
      fetch('content/journeys.json').then(r => r.json()),
    ]);
    const id = new URLSearchParams(location.search).get('journey');
    const j = journeys.find(x => x.id === id);
    if (!j) { main.innerHTML = '<p class="error">Journey not found. <a href="./?view=journeys">Choose a journey</a>.</p>'; return; }
    const books = new Map(meta.books.map(b => [b.osis, b.name]));
    const label = (osis) => { const [b, c, v] = osis.split('.'); return `${books.get(b) || b} ${c}:${v}`; };
    document.title = `${j.name} · Handout · Bible Connections`;
    document.getElementById('backLink').href = `./?journey=${encodeURIComponent(j.id)}&step=1`;
    main.innerHTML = `<h1>${esc(j.name)}</h1><p class="summary">${esc(j.summary)}</p>
      <ol class="steps">${j.steps.map(s => `<li>
        <h2>${esc(s.title)}</h2>
        <p class="refs">Read ${esc(label(s.a))} and ${esc(label(s.b))}</p>
        <p>${esc(s.note)}</p>
        ${s.question ? `<p class="q">${esc(s.question)}</p><div class="lines" aria-hidden="true"></div>` : ''}
      </li>`).join('')}</ol>
      <footer>Read each passage in your own Bible or at bible.com. Cross references from OpenBible.info (CC BY 4.0).
      Made with Bible Connections, ${esc(location.origin + location.pathname.replace(/handout\.html$/, ''))}</footer>`;
  } catch {
    main.innerHTML = '<p class="error">Sorry, the handout could not be loaded. Please try again.</p>';
  }
})();
