// A church's sermon series: church.html?d=<encoded series>. The series is made in the map (Study, Church page)
// and lives entirely in the link: { n: church name, s: series title, w: [[date, from, to, title], ...] }
// with dates as YYYY-MM-DD and passages as OSIS references (John.3.16). No translation text is shown.
(async () => {
  const main = document.getElementById('main');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const L = window.bcLang, lang = L.lang;
  await L.ready;
  const t = (k, v = {}) => L.t('church', k, v);
  const p = new URLSearchParams(location.search);
  if (p.get('embed') === '1') document.body.classList.add('embed');
  const site = location.origin + location.pathname.replace(/church\.html$/, '');
  const decode = (s) => {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
      return { n: String(o.n || '').slice(0, 80), s: String(o.s || '').slice(0, 100), w: (o.w || []).slice(0, 60).map(x => [String(x[0] || ''), String(x[1] || ''), String(x[2] || x[1] || ''), String(x[3] || '').slice(0, 100)]) };
    } catch { return null; }
  };
  const S = decode(p.get('d') || '');
  if (!S || !S.w.length) { main.innerHTML = `<p class="error">${esc(t('This page could not be opened. Ask your church for the link again.'))} <a href="${esc(site)}">Bible Connections</a></p>`; return; }
  try {
    const [meta, versions] = await Promise.all([fetch('data/books.json').then(r => r.json()), fetch('content/versions.json').then(r => r.json()).catch(() => [])]);
    const B = meta.books, en = B.map(b => b.name), names = L.books();
    if (names) B.forEach((b, i) => { b.name = names[i] || b.name; });
    const ver = versions.find(v => (v.key || v.code) === (p.get('version') || L.bible)) || versions.find(v => v.code === 'NIV') || { id: 111, code: 'NIV' };
    const niv = versions.find(v => v.code === 'NIV') || ver;
    const parse = (o) => { const [bk, c, v] = o.split('.'); const bi = B.findIndex(b => b.osis === bk); return bi >= 0 && B[bi].chapters[c - 1] ? { bi, c: +c, v: +v || 1 } : null; };
    const label = (a, z) => {
      const whole = a.v === 1 && z.bi === a.bi && z.v === B[z.bi].chapters[z.c - 1];
      if (whole) return z.c === a.c ? `${B[a.bi].name} ${a.c}` : `${B[a.bi].name} ${a.c}-${z.c}`;
      if (z.bi !== a.bi || z.c !== a.c) return `${B[a.bi].name} ${a.c}:${a.v}-${z.bi === a.bi ? '' : B[z.bi].name + ' '}${z.c}:${z.v}`;
      return z.v !== a.v ? `${B[a.bi].name} ${a.c}:${a.v}-${z.v}` : `${B[a.bi].name} ${a.c}:${a.v}`;
    };
    const read = (a) => { const u = ver.nt && a.bi < 39 ? niv : ver; return `https://www.bible.com/bible/${u.id}/${B[a.bi].usfm}.${a.c}.${a.v}.${u.code}`; };
    const mapLink = (a, z) => {
      const en1 = `${en[a.bi]} ${a.c}:${a.v}`, q = new URLSearchParams({ ref: z.bi === a.bi && z.c === a.c && z.v !== a.v ? `${en1}-${z.v}` : en1 });
      if (lang !== 'en') q.set('lang', lang);
      return `${site}?${q}`;
    };
    const fmt = (d) => { const x = new Date(d + 'T12:00:00'); return isNaN(x) ? '' : x.toLocaleDateString(L.locale, { day: 'numeric', month: 'short' }); };
    const weeks = S.w.map(([d, f, z, title]) => ({ d, a: parse(f), z: parse(z) || parse(f), title })).filter(x => x.a).sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
    // this week: the latest sermon on or before today, or the first one if the series has not started
    const today = (p.get('today') && /^\d{4}-\d{2}-\d{2}$/.test(p.get('today'))) ? p.get('today') : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    let cur = -1;
    weeks.forEach((w, i) => { if (w.d && w.d <= today) cur = i; });
    const upcoming = cur < 0;
    if (cur < 0) cur = 0;
    const W = weeks[cur];
    const nw = '<span class="sr-only"> ' + esc(t('(opens in a new tab)')) + '</span>';
    document.title = `${S.s || t('Sermon series')}${S.n ? ' · ' + S.n : ''}`;
    main.innerHTML = `${S.n ? `<p class="kicker">${esc(S.n)}</p>` : ''}<h1>${esc(S.s || t('Sermon series'))}</h1>
      <section class="now" aria-labelledby="nowTitle">
        <p class="label">${esc(upcoming ? t('Coming up') : t('This week'))}${W.d ? ' · ' + esc(fmt(W.d)) : ''}</p>
        <h2 id="nowTitle">${esc(W.title || label(W.a, W.z))}</h2>
        ${W.title ? `<p class="ref">${esc(label(W.a, W.z))}</p>` : ''}
        <div class="actions"><a class="btn" href="${esc(read(W.a))}" target="_blank" rel="noopener">${esc(t('Read it'))}${nw}</a>
          <a class="btn ghost" href="${esc(mapLink(W.a, W.z))}" target="_blank" rel="noopener">${esc(t('See its connections'))}${nw}</a></div>
      </section>
      <h3>${esc(t('All weeks'))}</h3>
      <ol class="weeks">${weeks.map((w, i) => `<li class="${i < cur ? 'past' : i === cur ? 'current' : ''}"${i === cur ? ' aria-current="date"' : ''}>
        <span class="date">${esc(fmt(w.d))}</span><span class="title">${esc(w.title || label(w.a, w.z))}</span>
        <span class="links"><a href="${esc(read(w.a))}" target="_blank" rel="noopener">${esc(label(w.a, w.z))}${nw}</a><a href="${esc(mapLink(w.a, w.z))}" target="_blank" rel="noopener">${esc(t('Connections'))}${nw}</a></span></li>`).join('')}</ol>
      <footer>${esc(t('Passages open on Bible.com. Cross references from OpenBible.info (CC BY 4.0).'))} <a href="${esc(site + (lang !== 'en' ? '?lang=' + lang : ''))}" target="_blank" rel="noopener">${esc(t('Made with Bible Connections'))}${nw}</a></footer>`;
  } catch {
    main.innerHTML = `<p class="error">${esc(t('Sorry, this page could not be shown.'))}</p>`;
  }
})();
