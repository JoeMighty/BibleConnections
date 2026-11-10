// How to use and Roadmap pages: content from content/guide.json and content/roadmap.json.
(async () => {
  const main = document.getElementById('main');
  const page = document.body.dataset.page;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const L = window.bcLang;
  await L.ready;
  const t = (k, v) => L.t('pages', k, v), pick = L.pick, withLang = L.withLang;
  for (const [id, key] of [['navHome', 'Open the map'], ['navGuide', 'How to use'], ['navRoadmap', 'Roadmap'], ['changelogLink', 'Changelog'], ['privacyLink', 'Privacy']]) {
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
    } else if (page === 'privacy') {
      const P = await (await fetch('content/privacy.json')).json();
      document.title = `${t('Privacy')} · Bible Connections`;
      const date = new Date(P.updated + 'T12:00:00').toLocaleDateString(L.locale, { day: 'numeric', month: 'long', year: 'numeric' });
      const mail = (x) => esc(x).replace(/hello@bibleconnections\.app/g, '<a href="mailto:hello@bibleconnections.app">hello@bibleconnections.app</a>');
      main.innerHTML = `<h1>${esc(t('Privacy'))}</h1>
        <p class="lede">${esc(pick(P, 'intro'))}</p><p class="muted">${esc(t('Last updated {d}', { d: date }))}</p>
        ${P.sections.map(x => `<section aria-labelledby="${slug(x.title)}"><h2 id="${slug(x.title)}">${esc(pick(x, 'title'))}</h2>${(pick(x, 'text') || []).map(p2 => `<p>${mail(p2)}</p>`).join('')}</section>`).join('')}`;
    } else {
      const r = await (await fetch('content/roadmap.json')).json();
      document.title = `${t('Roadmap')} · Bible Connections`;
      // status symbols in the style of SF Symbols: a filled dot, an empty circle and a checkmark
      const sym = {
        progress: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="4.5" fill="currentColor"/></svg>',
        planned: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
        shipped: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5 8.3 14 15.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      };
      const st = (k) => `<span class="status ${k}">${sym[k]}<span class="sr-only">${esc(t(k === 'progress' ? 'In progress' : k === 'planned' ? 'Planned' : 'Shipped'))}: </span></span>`;
      const row = (k, x) => `<li>${st(k)}<div class="row-text"><h3>${esc(pick(x, 'title'))}</h3><p>${esc(pick(x, 'text'))}</p></div></li>`;
      main.innerHTML = `<h1>${esc(t('Roadmap'))}</h1>
        <p class="lede">${esc(t('What is new, what we are working on, and what is planned. Ideas and feedback are welcome on GitHub.'))}</p>
        <ul class="legend" aria-hidden="true"><li>${sym.progress.replace('<svg', '<svg class="status progress"')}${esc(t('In progress'))}</li><li>${sym.planned.replace('<svg', '<svg class="status planned"')}${esc(t('Planned'))}</li><li>${sym.shipped.replace('<svg', '<svg class="status shipped"')}${esc(t('Shipped'))}</li></ul>
        <section aria-labelledby="progress"><h2 id="progress">${esc(t('In progress'))}</h2>
          <ul class="group">${r.in_progress.map(x => row('progress', x)).join('')}</ul></section>
        <section aria-labelledby="planned"><h2 id="planned">${esc(t('Planned'))}</h2>
          ${r.planned.map(g => `<h3 class="group-head">${esc(pick(g, 'when'))}</h3><ul class="group">${g.items.map(x => row('planned', x)).join('')}</ul>`).join('')}
          <p class="group-foot">${esc(t('Plans can change. Dates are not promised.'))} <a href="https://github.com/JoeMighty/BibleConnections/issues/new/choose" rel="noopener">${esc(t('Suggest an idea'))}</a></p></section>
        <section aria-labelledby="shipped"><h2 id="shipped">${esc(t('Shipped'))}</h2><p class="lede">${esc(t('Features you can use today.'))}</p>
          <div class="shipped-list">${r.shipped.map(s2 => `<div class="release"><h3 class="group-head">${esc(pick(s2, 'version'))}</h3><ul class="group done">${(pick(s2, 'items') || []).map(i => `<li>${st('shipped')}<span>${esc(i)}</span></li>`).join('')}</ul></div>`).join('')}</div></section>`;
    }
  } catch {
    main.innerHTML = `<p class="loading">${esc(t('Sorry, this page could not load. Please try again.'))}</p>`;
  }
})();
