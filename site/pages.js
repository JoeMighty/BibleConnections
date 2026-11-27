// How to use and Roadmap pages: content from content/guide.json and content/roadmap.json.
(async () => {
  const main = document.getElementById('main');
  const page = document.body.dataset.page;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const L = window.bcLang;
  await L.ready;
  const t = (k, v) => L.t('pages', k, v), pick = L.pick, withLang = L.withLang;
  for (const [id, key] of [['navHome', 'Open the map'], ['navGuide', 'How to use'], ['navRoadmap', 'Roadmap'], ['changelogLink', 'Changelog'], ['privacyLink', 'Privacy'], ['termsLink', 'Terms'], ['a11yLink', 'Accessibility'], ['creditsLink', 'Credits']]) {
    const a = document.getElementById(id);
    if (a) { a.textContent = t(key); if (a.getAttribute('href') && !a.href.includes('github')) a.setAttribute('href', withLang(a.getAttribute('href'))); }
  }
  document.getElementById('homeLink').setAttribute('href', withLang('./'));
  document.querySelector('.skip').textContent = t('Skip to content');
  // the sticky header's height, so jumps to a section are not hidden under it (it wraps on narrow screens)
  const top = document.querySelector('.top');
  const setTop = () => { if (top) document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px'); };
  setTop(); addEventListener('resize', setTop);
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
    } else if (page === 'notfound') {
      document.title = `${t('Page not found')} · Bible Connections`;
      main.innerHTML = `<h1>${esc(t('Page not found'))}</h1>
        <p class="lede">${esc(t('This page does not exist. It may have moved, or the address may have a typo.'))}</p>
        <p><a href="${esc(withLang('/'))}">${esc(t('Open the map'))}</a> · <a href="${esc(withLang('/guide.html'))}">${esc(t('How to use'))}</a></p>`;
    } else if (page === 'churches') {
      const C = await (await fetch('content/churches.json')).json();
      document.title = `${t('For churches')} · Bible Connections`;
      const mail = (x) => esc(x).replace(/hello@bibleconnections\.app/g, '<a href="mailto:hello@bibleconnections.app">hello@bibleconnections.app</a>');
      main.innerHTML = `<h1>${esc(t('For churches'))}</h1>
        <p class="lede">${esc(pick(C, 'intro'))}</p>
        <ul class="cards">${C.tools.map(it => `<li class="card"><h2 class="card-title">${esc(pick(it, 'title'))}</h2><p>${esc(pick(it, 'text'))}</p>
          <p class="try"><a href="${esc(withLang(/^[?]/.test(it.try) ? './' + it.try : it.try))}">${esc(pick(it, 'try_label'))}</a></p></li>`).join('')}</ul>
        <p class="muted church-note">${mail(pick(C, 'note'))}</p>`;
    } else if (['advent', 'christmas', 'lent', 'holyweek'].includes(page)) {
      // a seasonal plan as one page to share with a church: every day's passage and fulfilment, with dates
      const [plans, meta, versions] = await Promise.all(['content/plans.json', 'data/books.json', 'content/versions.json'].map(u => fetch(u).then(r => r.json())));
      const plan = plans.find(p => p.season === page), B = meta.books, names = L.books();
      const en = B.map(b => b.name);
      if (names) B.forEach((b, i) => { b.name = names[i] || b.name; });
      const ver = versions.find(v => (v.key || v.code) === L.bible) || { id: 111, code: 'NIV' }, niv = versions.find(v => v.code === 'NIV') || ver;
      const ref = (o) => { const [bk, c, v] = o.split('.'); const bi = B.findIndex(b => b.osis === bk); return { bi, c: +c, v: +v }; };
      const label = (r) => `${B[r.bi].name} ${r.c}:${r.v}`;
      const read = (r) => { const u = ver.nt && r.bi < 39 ? niv : ver; return `https://www.bible.com/bible/${u.id}/${B[r.bi].usfm}.${r.c}.${r.v}.${u.code}`; };
      // ?today=2026-12-01 shows the page as it looks on that date
      const q = new URLSearchParams(location.search).get('today');
      const now = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(q + 'T12:00:00') : new Date();
      now.setHours(12, 0, 0, 0);
      // Advent Sunday is the fourth Sunday before Christmas; after Christmas the page shows next year's dates
      const sunday = (y) => { const d = new Date(y, 11, 24, 12); d.setDate(d.getDate() - d.getDay() - 21); return d; };
      // the twelve days run from Christmas Day to 5 January; after that the page shows next Christmas
      const xmas = () => { const y = now.getFullYear(); return now <= new Date(y, 0, 5, 12) ? new Date(y - 1, 11, 25, 12) : new Date(y, 11, 25, 12); };
      // Easter (Western, anonymous Gregorian method); Lent starts on Ash Wednesday and Holy Week on Palm Sunday
      const easter = (y) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da, 12); };
      const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
      const seasonStart = (y) => (page === 'lent' ? shift(easter(y), -46) : shift(easter(y), -7));
      const start = page === 'christmas' ? xmas()
        : page === 'lent' || page === 'holyweek' ? (now > shift(seasonStart(now.getFullYear()), plan.days.length - 1) ? seasonStart(now.getFullYear() + 1) : seasonStart(now.getFullYear()))
        : now > new Date(now.getFullYear(), 11, 25, 12) ? sunday(now.getFullYear() + 1) : sunday(now.getFullYear());
      const dayOf = (k) => { const d = new Date(start); d.setDate(d.getDate() + k); return d; };
      const todayK = Math.round((now - start) / 86400000), inAdvent = todayK >= 0 && todayK < plan.days.length;
      const long = { weekday: 'long', day: 'numeric', month: 'long' };
      const fmtD = (d, o = long) => d.toLocaleDateString(L.locale, o);
      const appURL = (k) => withLang(`./?plan=${plan.id}&day=${k + 1}`);
      const pageURL = new URL(withLang(page + '.html'), location.href).href;
      const pair = (d) => { const a = ref(d.a), b = ref(d.b); return `<p class="advent-refs"><a href="${esc(read(a))}" rel="noopener">${esc(label(a))}<span class="sr-only"> (${esc(t('opens Bible.com'))})</span></a> <span aria-hidden="true">→</span><span class="sr-only">${esc(t('and'))}</span> <a href="${esc(read(b))}" rel="noopener">${esc(label(b))}<span class="sr-only"> (${esc(t('opens Bible.com'))})</span></a></p>`; };
      // the weeks: the part of each title before the colon (Hope, Peace, Joy, Love, Christmas Day)
      const weeks = [];
      plan.days.forEach((d, k) => { const w = page === 'christmas' ? t('The twelve days') : page === 'holyweek' ? t('Palm Sunday to Easter') : page === 'lent' ? (k < 4 ? t('Ash Wednesday') : t('Week {n}', { n: Math.floor((k - 4) / 7) + 1 })) : pick(d, 'title').split(':')[0]; const last = weeks[weeks.length - 1]; if (last && last.name === w) last.days.push(k); else weeks.push({ name: w, days: [k] }); });
      const cap = (x) => x.charAt(0).toLocaleUpperCase(L.locale) + x.slice(1);
      const day = (k) => { const d = plan.days[k], title = pick(d, 'title'); return `<li class="advent-day" id="day-${k + 1}"${k === todayK ? ' aria-current="date"' : ''}>
          <p class="eyebrow">${esc(t('Day {n}', { n: k + 1 }))} · ${esc(fmtD(dayOf(k)))}${k === todayK ? `<span class="no-print"> · <strong>${esc(t('Today'))}</strong></span>` : ''}</p>
          <h3>${esc(cap(title.split(':').slice(1).join(':').trim() || title))}</h3>${pair(d)}<p>${esc(pick(d, 'note'))}</p>
          <p class="day-link no-print"><a href="${esc(appURL(k))}">${esc(t('See it on the map'))}</a></p></li>`; };
      document.title = `${t({ advent: 'Advent reading plan', christmas: 'Christmas reading plan', lent: 'Lent reading plan', holyweek: 'Holy Week reading plan' }[page])} · Bible Connections`;
      const td = inAdvent ? plan.days[todayK] : null;
      main.innerHTML = `<h1>${esc(pick(plan, 'name'))}</h1>
        <p class="lede">${esc(pick(plan, 'description'))}</p>
        <p class="muted">${esc(t('{a} to {b}', { a: fmtD(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), b: fmtD(dayOf(plan.days.length - 1), { weekday: 'long', day: 'numeric', month: 'long' }) }))}</p>
        ${td ? `<section class="card advent-today" aria-labelledby="todayHead"><p class="eyebrow">${esc(t('Today'))} · ${esc(t('Day {n} of {m}', { n: todayK + 1, m: plan.days.length }))}</p>
          <h2 id="todayHead" class="card-title">${esc(pick(td, 'title'))}</h2>${pair(td)}<p>${esc(pick(td, 'note'))}</p>
          <p class="actions"><a class="btn" href="${esc(appURL(todayK))}">${esc(t('Open today’s reading'))}</a><a class="btn tinted" href="#day-${todayK + 1}">${esc(t('Find it in the plan'))}</a></p></section>`
          : `<p class="actions"><a class="btn" href="${esc(appURL(0))}">${esc(t('Start the plan'))}</a></p>`}
        <section class="card advent-share no-print" aria-labelledby="shareHead">
          <h2 id="shareHead" class="card-title">${esc(t('Share it with your church'))}</h2>
          <p>${esc(t('Send this page to your church or small group, put it in the notices, or print it. Everyone can follow along on their phone, with no account.'))}</p>
          <p class="share-url"><code>${esc(pageURL)}</code></p>
          <p class="actions"><button type="button" class="btn" id="adventShare">${esc(navigator.share ? t('Share') : t('Copy link'))}</button><button type="button" class="btn tinted" id="adventPrint">${esc(t('Print the plan'))}</button></p>
          <p class="muted" id="adventStatus" role="status"></p></section>
        ${weeks.map(w => `<section aria-labelledby="w-${slug(w.name)}"><h2 id="w-${slug(w.name)}">${esc(w.name)}</h2><ol class="advent-days" start="${w.days[0] + 1}">${w.days.map(day).join('')}</ol></section>`).join('')}
        <p class="muted church-note">${esc(t('Each day opens two passages on Bible.com and shows how they connect on the map. No Bible translation is stored on this site.'))}</p>
        <p class="no-print">${{
          advent: [t('After Christmas Day:'), 'christmas.html', t('the twelve days of Christmas')],
          christmas: [t('Before Christmas:'), 'advent.html', t('the Advent plan')],
          lent: [t('After Lent:'), 'holyweek.html', t('the Holy Week plan')],
          holyweek: [t('Before Holy Week:'), 'lent.html', t('the Lent plan')],
        }[page].map((x, n) => (n === 1 ? '' : n === 0 ? esc(x) + ' ' : `<a href="${esc(withLang({ advent: 'christmas.html', christmas: 'advent.html', lent: 'holyweek.html', holyweek: 'lent.html' }[page]))}">${esc(x)}</a>`)).join('')}</p>`;
      document.getElementById('adventPrint').addEventListener('click', () => print());
      document.getElementById('adventShare').addEventListener('click', async () => {
        const status = document.getElementById('adventStatus');
        if (navigator.share) { try { await navigator.share({ title: pick(plan, 'name'), url: pageURL }); } catch { /* closed */ } return; }
        try { await navigator.clipboard.writeText(pageURL); status.textContent = t('Link copied.'); } catch { status.textContent = pageURL; }
      });
    } else if (page === 'help') {
      // questions and answers, grouped, each one opening in place; also given to search engines as an FAQ
      const groups = await (await fetch('content/faq.json')).json();
      document.title = `${t('Help and questions')} · Bible Connections`;
      const mail = (x) => esc(x).replace(/hello@bibleconnections\.app/g, '<a href="mailto:hello@bibleconnections.app">hello@bibleconnections.app</a>');
      const ask = (it) => `<details class="faq" id="${slug(it.q)}"><summary>${esc(pick(it, 'q'))}</summary>${(pick(it, 'a') || []).map(p2 => `<p>${mail(p2)}</p>`).join('')}</details>`;
      main.innerHTML = `<h1>${esc(t('Help and questions'))}</h1>
        <p class="lede">${esc(t('Quick answers to the questions people ask most. For step by step guides, see How to use.'))}</p>
        <nav aria-label="${esc(t('Sections'))}"><ul class="toc">${groups.map(g => `<li><a href="#${slug(g.group)}">${esc(pick(g, 'group'))}</a></li>`).join('')}</ul></nav>
        ${groups.map(g => `<section aria-labelledby="${slug(g.group)}"><h2 id="${slug(g.group)}">${esc(pick(g, 'group'))}</h2><div class="faq-list">${g.items.map(ask).join('')}</div></section>`).join('')}
        <section class="card faq-more" aria-labelledby="moreHelp"><h2 id="moreHelp" class="card-title">${esc(t('Still need help?'))}</h2>
          <p>${esc(t('Write to us and say what you were trying to do. We read every message.'))}</p>
          <p class="try try-many"><a href="mailto:hello@bibleconnections.app">${esc(t('Email'))}</a><a href="https://github.com/JoeMighty/BibleConnections/issues/new/choose" rel="noopener">${esc(t('Report on GitHub'))}</a><a href="${esc(withLang('guide.html'))}">${esc(t('How to use'))}</a></p></section>`;
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: L.lang, mainEntity: groups.flatMap(g => g.items.map(it => ({ '@type': 'Question', name: pick(it, 'q'), acceptedAnswer: { '@type': 'Answer', text: (pick(it, 'a') || []).join(' ') } }))) });
      document.head.append(ld);
      // a link to one question opens it
      const open = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (open && open.tagName === 'DETAILS') open.open = true;
    } else if (page === 'support') {
      // ways to help: share, give (only when a giving link is set in content/config.json), print, translate, report
      const cfg = await fetch('content/config.json').then(r => r.json()).catch(() => ({}));
      const give = ((cfg.support || {}).give || []).filter(g => g && /^https:\/\//.test(g.url));
      document.title = `${t('Support Bible Connections')} · Bible Connections`;
      const card = (title, text, links) => `<li class="card"><h2 class="card-title">${esc(t(title))}</h2><p>${esc(t(text))}</p>
        <p class="try try-many">${links.map(([label, href, ext]) => `<a href="${esc(href)}"${ext ? ' rel="noopener"' : ''}>${esc(t(label))}</a>`).join('')}</p></li>`;
      main.innerHTML = `<h1>${esc(t('Support Bible Connections'))}</h1>
        <p class="lede">${esc(t('Bible Connections is free, with no adverts and no accounts, and it will stay that way. If it helps you, here are some ways to help it reach more people.'))}</p>
        ${give.length ? `<section class="card support-give" aria-labelledby="giveHead"><h2 id="giveHead" class="card-title">${esc(t('Give'))}</h2>
          <p>${esc(t('Gifts pay for the web address and the time it takes to add new journeys, plans and languages. Giving is optional and does not unlock anything.'))}</p>
          <p class="actions">${give.map((g, i) => `<a class="btn${i ? ' tinted' : ''}" href="${esc(g.url)}" rel="noopener">${esc(pick(g, 'label'))}</a>`).join('')}</p></section>` : ''}
        <ul class="cards">
          ${card('Share it', 'Tell a friend, your small group or your church. A link from a church website helps people find it too.', [['Copy the link', '#share']])}
          ${card('Use it at church', 'Sermon series pages, leader guides, handouts, slides and the Advent plan.', [['For churches', withLang('churches.html')], ['Advent', withLang('advent.html')]])}
          ${card('Help translate', 'Bible Connections is in English, Spanish and Portuguese. Native speakers can check the wording or help start a new language.', [['Offer help on GitHub', 'https://github.com/JoeMighty/BibleConnections/issues/new/choose', 1]])}
          ${card('Report a problem', 'Something broken, confusing or wrong? Say what you saw and on which device.', [['Report on GitHub', 'https://github.com/JoeMighty/BibleConnections/issues/new/choose', 1], ['Email', 'mailto:hello@bibleconnections.app']])}
        </ul>`;
      const shareLink = main.querySelector('a[href="#share"]');
      shareLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = new URL(withLang('./'), location.href).href;
        if (navigator.share) { try { await navigator.share({ title: 'Bible Connections', url }); } catch { /* closed */ } return; }
        try { await navigator.clipboard.writeText(url); shareLink.textContent = t('Link copied.'); } catch { shareLink.textContent = url; }
      });
    } else if (['privacy', 'terms', 'accessibility', 'credits'].includes(page)) {
      // the legal pages share one layout: an introduction, a date and titled sections
      const P = await (await fetch(`content/${page}.json`)).json();
      const heading = { privacy: 'Privacy', terms: 'Terms of use', accessibility: 'Accessibility', credits: 'Credits and licenses' }[page];
      document.title = `${t(heading)} · Bible Connections`;
      const date = new Date(P.updated + 'T12:00:00').toLocaleDateString(L.locale, { day: 'numeric', month: 'long', year: 'numeric' });
      const mail = (x) => esc(x).replace(/hello@bibleconnections\.app/g, '<a href="mailto:hello@bibleconnections.app">hello@bibleconnections.app</a>');
      main.innerHTML = `<h1>${esc(t(heading))}</h1>
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
    if (location.hash) { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (target) target.scrollIntoView(); }
  } catch {
    main.innerHTML = `<p class="loading">${esc(t('Sorry, this page could not load. Please try again.'))}</p>`;
  }
})();
