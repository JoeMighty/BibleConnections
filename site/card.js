// Embeddable card: card.html?verse=John.3.16, ?c=Gen.3.15_Rom.16.20, ?journey=lamb&step=2 or ?prophecy=servant.
// Optional &theme=light|dark and &lang=es. References and links to Bible.com only; no translation text.
(async () => {
  const card = document.getElementById('card');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const p = new URLSearchParams(location.search);
  const lang = p.get('lang') === 'es' ? 'es' : 'en';
  document.documentElement.lang = lang;
  const ES = {
    'connects to': 'se conecta con', 'Read': 'Leer', 'Explore on Bible Connections': 'Explorar en Bible Connections', 'Step {n} of {t}': 'Paso {n} de {t}',
    'Connection': 'Conexión', 'Verse': 'Versículo', 'See how this verse connects across the Bible.': 'Mira cómo se conecta este versículo en toda la Biblia.',
    'Sorry, this card could not be shown.': 'Lo sentimos, no se pudo mostrar esta tarjeta.', '(opens in a new tab)': '(se abre en una pestaña nueva)',
  };
  const t = (k, v = {}) => (lang === 'es' && ES[k] ? ES[k] : k).replace(/\{(\w+)\}/g, (_, x) => v[x]);
  const pick = (o, k) => (lang === 'es' && o[k + '_es']) || o[k];
  const json = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  const site = location.origin + location.pathname.replace(/card\.html$/, '');
  try {
    const [meta, versions, es] = await Promise.all([json('data/books.json'), json('content/versions.json').catch(() => []), lang === 'es' ? json('content/i18n/books-es.json').catch(() => null) : null]);
    const B = meta.books, en = B.map(b => b.name);
    if (es) B.forEach((b, i) => { b.name = es.books[i] || b.name; });
    const ver = versions.find(v => v.code === (p.get('version') || (lang === 'es' ? 'NVI' : 'NIV'))) || { id: 111, code: 'NIV' };
    const niv = versions.find(v => v.code === 'NIV') || ver;
    const parse = (o) => { const [bk, c, v] = String(o || '').split('.'); const bi = B.findIndex(b => b.osis === bk); return bi >= 0 && B[bi].chapters[c - 1] && +v >= 1 && +v <= B[bi].chapters[c - 1] ? { bi, c: +c, v: +v, osis: o } : null; };
    const label = (r, z) => `${B[r.bi].name} ${r.c}:${r.v}${z && z.bi === r.bi && z.c === r.c && z.v !== r.v ? '-' + z.v : ''}`;
    const read = (r, z) => { const u = ver.nt && r.bi < 39 ? niv : ver; return `<a href="https://www.bible.com/bible/${u.id}/${B[r.bi].usfm}.${r.c}.${r.v}.${u.code}" target="_blank" rel="noopener">${esc(label(r, z))}<span class="sr-only"> ${esc(t('Read'))}, bible.com ${esc(t('(opens in a new tab)'))}</span></a>`; };
    const lq = lang !== 'en' ? '&lang=' + lang : '';
    let kicker = '', title = '', body = '', open = '';
    if (p.get('c')) {
      const [a, b] = p.get('c').split(/[~_]/).map(parse);
      if (!a || !b) throw new Error('bad');
      const notes = await json('content/notes.json').catch(() => []);
      const n = notes.find(x => (x.from === a.osis && x.to === b.osis) || (x.from === b.osis && x.to === a.osis));
      kicker = t('Connection'); title = `${label(a)} ↔ ${label(b)}`;
      body = `<ul class="refs"><li>${read(a)}</li><li class="to" aria-hidden="true">${esc(t('connects to'))}</li><li>${read(b)}</li></ul>${n && lang === 'en' ? `<p class="note">${esc(n.note)}</p>` : ''}`;
      open = `?c=${a.osis}_${b.osis}`;
    } else if (p.get('verse')) {
      const a = parse(p.get('verse'));
      if (!a) throw new Error('bad');
      kicker = t('Verse'); title = label(a);
      body = `<ul class="refs"><li>${read(a)}</li></ul><p class="note">${esc(t('See how this verse connects across the Bible.'))}</p>`;
      open = `?ref=${encodeURIComponent(`${en[a.bi]} ${a.c}:${a.v}`)}`;
    } else if (p.get('journey')) {
      const js = await json('content/journeys.json');
      const j = js.find(x => x.id === p.get('journey'));
      const step = Math.max(1, +p.get('step') || 1), s = j && j.steps[step - 1];
      if (!s) throw new Error('bad');
      let x = {}, name = j.name;
      if (lang === 'es') { const e = (await json('content/journeys.es.json').catch(() => [])).find(y => y.id === j.id) || {}; name = e.name || name; x = (e.steps || [])[step - 1] || {}; }
      const a = parse(s.a), b = parse(s.b);
      kicker = `${name} · ${t('Step {n} of {t}', { n: step, t: j.steps.length })}`; title = x.title || s.title;
      body = `${a && b ? `<ul class="refs"><li>${read(a)}</li><li class="to" aria-hidden="true">${esc(t('connects to'))}</li><li>${read(b)}</li></ul>` : ''}${(x.question || s.question) ? `<p class="q">${esc(x.question || s.question)}</p>` : ''}`;
      open = `?journey=${encodeURIComponent(j.id)}&step=${step}`;
    } else if (p.get('prophecy')) {
      const pr = await json('content/prophecy.json');
      const c = pr.groups.flatMap(g => g.chains).find(x => x.id === p.get('prophecy'));
      if (!c) throw new Error('bad');
      kicker = pick(pr.types[c.type], 'name'); title = pick(c, 'title');
      body = `<ol class="stages">${c.stages.map(s => { const a = parse(s.ref), z = s.end ? parse(s.end) : null; return a ? `<li>${esc(pick(s, 'label'))}${read(a, z)}</li>` : ''; }).join('')}</ol>`;
      open = `?prophecy=${encodeURIComponent(c.id)}`;
    } else throw new Error('bad');
    document.title = `${title} · Bible Connections`;
    card.innerHTML = `<p class="kicker">${esc(kicker)}</p><h1>${esc(title)}</h1>${body}
      <div class="foot"><a class="brand" href="${esc(site + (lq ? '?' + lq.slice(1) : ''))}" target="_blank" rel="noopener"><img src="icons/icon.svg" alt="" width="18" height="18">Bible Connections<span class="sr-only"> ${esc(t('(opens in a new tab)'))}</span></a>
      <a class="open" href="${esc(site + open + lq)}" target="_blank" rel="noopener">${esc(t('Explore on Bible Connections'))}<span class="sr-only"> ${esc(t('(opens in a new tab)'))}</span></a></div>`;
  } catch {
    card.innerHTML = `<p class="kicker">Bible Connections</p><p>${esc(t('Sorry, this card could not be shown.'))} <a href="${esc(site)}" target="_blank" rel="noopener">Bible Connections</a></p>`;
  }
})();
