// Language for the standalone pages (handout, guide, roadmap, slides, card), the same rules as the map:
// a ?lang= link wins, then the saved choice. A language is "listed" once it is complete and reviewed;
// until then it is only used when a link asks for it (?lang=pt). Strings live in content/i18n/<lang>.json
// under "pages", and scripts/pack-data.mjs copies them with the book names into pages-<lang>.json.
// Add data-url-only to the script tag to ignore the saved choice (used by embeds on other sites).
window.bcLang = (() => {
  const LANGS = {
    en: { locale: 'en-US', bible: 'NIV', listed: true },
    es: { locale: 'es', bible: 'NVI', listed: true },
    pt: { locale: 'pt-BR', bible: 'NVI-PT', listed: true },
  };
  const urlOnly = document.currentScript && document.currentScript.hasAttribute('data-url-only');
  const asked = new URLSearchParams(location.search).get('lang');
  let saved = 'en';
  if (!urlOnly) { try { saved = JSON.parse(localStorage.getItem('bc.lang')) || 'en'; } catch { /* storage unavailable */ } }
  const lang = LANGS[asked] ? asked : LANGS[saved] && LANGS[saved].listed ? saved : 'en';
  document.documentElement.lang = lang;
  let data = null;
  const ready = lang === 'en' ? Promise.resolve(null)
    : fetch(`content/i18n/pages-${lang}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null).then(d => (data = d));
  return {
    lang, ready, ...LANGS[lang],
    // t('handout', 'Read {a} and {b}', { a, b }): the page's string in this language, or the English
    t: (section, k, v = {}) => (((data && data.pages && data.pages[section]) || {})[k] || k).replace(/\{(\w+)\}/g, (m, x) => (x in v ? v[x] : m)),
    // a field in this language when it has been written: pick(step, 'title') reads title_es in Spanish
    pick: (o, k) => (o && lang !== 'en' && o[k + '_' + lang]) || (o && o[k]),
    books: () => (data && data.books) || null,
    has: (what) => !!(data && (data.content || []).includes(what)),
    withLang: (u) => (lang === 'en' ? u : u + (u.includes('?') ? '&' : '?') + 'lang=' + lang),
  };
})();
