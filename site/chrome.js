// The same header, sections and footer on every page outside the map (help, books, verses, legal pages,
// For churches), so the site feels like one app: Explore, Journeys, Study, Library and More on top on a
// computer and as a tab bar on a phone, Search and Home always there, and one grouped footer.
(async () => {
  const me = document.currentScript;
  const root = new URL('.', me && me.src ? me.src : location.href).href;   // the site root, wherever this page sits
  const L = window.bcLang;
  if (L) await L.ready;
  const lang = L ? L.lang : 'en';
  const t = (k) => (L ? L.t('pages', k) : k);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const withLang = (u) => (lang === 'en' ? u : u + (u.includes('?') ? '&' : '?') + 'lang=' + lang);
  const app = (q) => withLang(root + (q ? '?' + q : ''));
  const page = (f) => withLang(root + f);
  const icon = (d) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const SECTIONS = [
    ['explore', 'Explore', 'view=map', '<path d="M2.5 18.5h19M4 18.5a5.5 5.5 0 0 1 11 0M10 18.5a5 5 0 0 1 10 0"/>'],
    ['journeys', 'Journeys', 'view=journeys', '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h5.5a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6H16"/>'],
    ['study', 'Study', 'view=study', '<path d="M12 6.5C10.2 5 7.6 4.5 4 4.5v13c3.6 0 6.2.5 8 2 1.8-1.5 4.4-2 8-2v-13c-3.6 0-6.2.5-8 2zM12 6.5v13"/>'],
    ['library', 'Library', 'view=library', '<path d="M6 3.5h12v17l-6-4-6 4z"/>'],
    ['more', 'More', 'view=more', '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>'],
  ];
  // which section a page belongs to: book and verse pages are part of Explore, help and the small print are under More
  const path = location.pathname;
  const current = /\/(books|verse|cross-references|topics|people|places)\//.test(path) ? 'explore' : 'more';
  const header = document.querySelector('header.top');
  if (header) {
    header.innerHTML = `<a class="brand" href="${esc(app(''))}" id="homeLink"><img src="${root}icons/icon.svg" alt="" width="34" height="34"><span>Bible Connections</span></a>
      <nav class="sections" aria-label="${esc(t('Main'))}">${SECTIONS.map(([id, label, q, d]) => `<a href="${esc(app(q))}" data-section="${id}"${id === current ? ' aria-current="page"' : ''}>${icon(d)}<span>${esc(t(label))}</span></a>`).join('')}</nav>
      <a class="top-search" href="${esc(app('search=1'))}" aria-label="${esc(t('Search'))}" title="${esc(t('Search'))}">${icon('<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>')}</a>`;
    document.body.classList.add('has-sections');
  }
  // one footer, grouped, with the language choice
  const foot = document.querySelector('footer.foot');
  if (foot) {
    const group = (title, links) => `<div class="foot-group"><h2>${esc(t(title))}</h2><ul>${links.map(([label, href, ext]) => `<li><a href="${esc(href)}"${ext ? ' rel="noopener"' : ''}>${esc(t(label))}</a></li>`).join('')}</ul></div>`;
    const here = (l) => { const u = new URL(location.href); if (l === 'en') u.searchParams.delete('lang'); else u.searchParams.set('lang', l); return u.pathname + u.search + u.hash; };
    foot.innerHTML = `<div class="foot-groups">
        ${group('Help', [['How to use', page('guide.html')], ['Questions', page('help.html')], ['What’s new', 'https://github.com/JoeMighty/BibleConnections/blob/main/CHANGELOG.md', 1], ['Roadmap', page('roadmap.html')]])}
        ${group('Explore', [['Books', root + 'books/'], ['Verses by topic', root + 'topics/'], ['People and places', root + 'people/'], ['How many cross references?', root + 'cross-references/'], ['For churches', page('churches.html')], ['Advent plan', page('advent.html')], ['Christmas plan', page('christmas.html')], ['Lent plan', page('lent.html')], ['Holy Week plan', page('holyweek.html')]])}
        ${group('About', [['Support', page('support.html')], ['Privacy', page('privacy.html')], ['Terms', page('terms.html')], ['Accessibility', page('accessibility.html')], ['Credits', page('credits.html')], ['Open data', page('data.html')], ['Source code', 'https://github.com/JoeMighty/BibleConnections', 1]])}
      </div>
      <p class="foot-lang" aria-label="${esc(t('Language'))}">${[['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['ko', '한국어'], ['zh', '简体中文']].map(([l, n]) => l === lang ? `<span aria-current="true">${n}</span>` : `<a href="${esc(here(l))}" hreflang="${l}" lang="${l}">${n}</a>`).join(' · ')}</p>
      <p>${esc(t('Created by'))} <a href="https://github.com/JoeMighty" rel="noopener author">JoeMighty</a>. ${esc(t('Passages open on Bible.com. No Bible translation is stored on this site.'))}</p>`;
  }
})();
