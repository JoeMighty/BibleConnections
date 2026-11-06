// How to use and Roadmap pages: content from content/guide.json and content/roadmap.json.
(async () => {
  const main = document.getElementById('main');
  const page = document.body.dataset.page;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang');
  if (!['en', 'es'].includes(lang)) { try { lang = JSON.parse(localStorage.getItem('bc.lang')) || 'en'; } catch { lang = 'en'; } }
  if (!['en', 'es'].includes(lang)) lang = 'en';
  document.documentElement.lang = lang;
  const ES = {
    'Open the map': 'Abrir el mapa', 'How to use': 'Cómo usarlo', 'Roadmap': 'Hoja de ruta', 'Changelog': 'Cambios', 'Created by': 'Creado por', 'Skip to content': 'Ir al contenido',
    'How to use Bible Connections': 'Cómo usar Bible Connections',
    'Short guides to everything you can do on the site. Each one has a button to try it straight away.': 'Guías breves de todo lo que puedes hacer en el sitio. Cada una tiene un botón para probarla enseguida.',
    'Try it': 'Pruébalo', 'Sections': 'Secciones',
    'What is new, what we are working on, and what is planned. Ideas and feedback are welcome on GitHub.': 'Lo nuevo, en qué estamos trabajando y lo que está planeado. Las ideas y comentarios son bienvenidos en GitHub.',
    'In progress': 'En curso', 'Planned': 'Planeado', 'Shipped': 'Disponible', 'Features you can use today.': 'Funciones que puedes usar hoy.',
    'Plans can change. Dates are not promised.': 'Los planes pueden cambiar. No se prometen fechas.', 'Suggest an idea': 'Sugerir una idea',
    'Sorry, this page could not load. Please try again.': 'Lo sentimos, no se pudo cargar esta página. Inténtalo de nuevo.',
  };
  const t = (k) => (lang === 'es' && ES[k]) || k;
  const pick = (o, k) => (lang === 'es' && o[k + '_es']) || o[k];
  const withLang = (u) => (lang === 'en' ? u : u + (u.includes('?') ? '&' : '?') + 'lang=' + lang);
  for (const [id, key] of [['navHome', 'Open the map'], ['navGuide', 'How to use'], ['navRoadmap', 'Roadmap'], ['changelogLink', 'Changelog']]) {
    const a = document.getElementById(id);
    if (a) { a.textContent = t(key); if (a.getAttribute('href') && !a.href.includes('github')) a.setAttribute('href', withLang(a.getAttribute('href'))); }
  }
  document.getElementById('homeLink').setAttribute('href', withLang('./'));
  document.querySelector('.skip').textContent = t('Skip to content');
  document.querySelector('.foot p').firstChild.textContent = t('Created by') + ' ';
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    if (page === 'guide') {
      const groups = await (await fetch('content/guide.json')).json();
      document.title = `${t('How to use Bible Connections')}`;
      main.innerHTML = `<h1>${esc(t('How to use Bible Connections'))}</h1>
        <p class="lede">${esc(t('Short guides to everything you can do on the site. Each one has a button to try it straight away.'))}</p>
        <nav aria-label="${esc(t('Sections'))}"><ul class="toc">${groups.map(g => `<li><a href="#${slug(g.group)}">${esc(pick(g, 'group'))}</a></li>`).join('')}</ul></nav>
        ${groups.map(g => `<section aria-labelledby="${slug(g.group)}"><h2 id="${slug(g.group)}">${esc(pick(g, 'group'))}</h2>
          <ul class="cards">${g.items.map(it => `<li class="card"><h3>${esc(pick(it, 'title'))}</h3><p>${esc(pick(it, 'what'))}</p>
            <ol>${(pick(it, 'steps') || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            ${it.try ? `<p class="try"><a href="${esc(withLang('./' + it.try))}">${esc(t('Try it'))}: ${esc(pick(it, 'try_label'))}</a></p>` : ''}</li>`).join('')}</ul></section>`).join('')}`;
    } else {
      const r = await (await fetch('content/roadmap.json')).json();
      document.title = `${t('Roadmap')} · Bible Connections`;
      main.innerHTML = `<h1>${esc(t('Roadmap'))}</h1>
        <p class="lede">${esc(t('What is new, what we are working on, and what is planned. Ideas and feedback are welcome on GitHub.'))}</p>
        <ul class="legend"><li><span class="pill progress">${esc(t('In progress'))}</span></li><li><span class="pill planned">${esc(t('Planned'))}</span></li><li><span class="pill shipped">${esc(t('Shipped'))}</span></li></ul>
        <section aria-labelledby="progress"><h2 id="progress">${esc(t('In progress'))}</h2>
          <ul class="road progress">${r.in_progress.map(x => `<li><h3>${esc(pick(x, 'title'))}</h3><p>${esc(pick(x, 'text'))}</p></li>`).join('')}</ul></section>
        <section aria-labelledby="planned"><h2 id="planned">${esc(t('Planned'))}</h2>
          <p class="lede">${esc(t('Plans can change. Dates are not promised.'))} <a href="https://github.com/JoeMighty/BibleConnections/issues/new/choose" rel="noopener">${esc(t('Suggest an idea'))}</a></p>
          ${r.planned.map(g => `<p class="when">${esc(pick(g, 'when'))}</p><ul class="road">${g.items.map(x => `<li><h3>${esc(pick(x, 'title'))}</h3><p>${esc(pick(x, 'text'))}</p></li>`).join('')}</ul>`).join('')}</section>
        <section aria-labelledby="shipped"><h2 id="shipped">${esc(t('Shipped'))}</h2><p class="lede">${esc(t('Features you can use today.'))}</p>
          <div class="shipped-list">${r.shipped.map(s => `<div class="release"><h3>${esc(pick(s, 'version'))}</h3><ul>${(pick(s, 'items') || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
    }
  } catch {
    main.innerHTML = `<p class="loading">${esc(t('Sorry, this page could not load. Please try again.'))}</p>`;
  }
})();
