// Regenerates site/sitemap.xml from the journeys and themes. Usage: node scripts/sitemap.mjs
import fs from 'node:fs';
import { load, urls as staticURLs } from './static-pages.mjs';
const base = 'https://bibleconnections.app/';
const read = (f) => JSON.parse(fs.readFileSync(new URL(`../site/content/${f}`, import.meta.url)));
const urls = [base, `${base}?view=map`, `${base}?view=journeys`, `${base}?view=path`, `${base}?view=insights`, `${base}?view=study`, `${base}?view=plans`, `${base}?view=people`, `${base}?view=topics`, `${base}?view=game`, `${base}guide.html`, `${base}roadmap.html`, `${base}privacy.html`, `${base}churches.html`, `${base}advent.html`, `${base}christmas.html`, `${base}lent.html`, `${base}holyweek.html`, `${base}support.html`, `${base}help.html`, `${base}terms.html`, `${base}accessibility.html`, `${base}credits.html`, `${base}?view=timeline`, `${base}?view=places`, `${base}?view=prophecy`];
for (const j of read('journeys.json')) urls.push(`${base}?journey=${j.id}&amp;step=1`, `${base}handout.html?journey=${j.id}`);
for (const g of read('prophecy.json').groups) for (const c of g.chains) urls.push(`${base}?prophecy=${c.id}`);
for (const j of read('journeys.json')) urls.push(`${base}handout.html?journey=${j.id}&amp;guide=leader`);
for (const r of read('routes.json')) urls.push(`${base}?route=${r.id}`);
for (const t of read('themes.json')) urls.push(`${base}?theme=${t.id}`);
for (const e of read('people-places.json')) urls.push(`${base}?${e.type}=${e.id}`);
for (const t of read('topics.json')) urls.push(`${base}?topic=${t.id}`);
for (const p of read('plans.json')) urls.push(`${base}?plan=${p.id}&amp;day=1`);
// every page in each language, each listing all its language versions, so search engines show
// the Spanish and Portuguese pages to the right people. lastmod is the latest release date.
const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const lastmod = (changelog.match(/^## \[\d+\.\d+\.\d+\] - (\d{4}-\d{2}-\d{2})/m) || [])[1];
const withLang = (u, l) => (l === 'en' ? u : u + (u.includes('?') ? '&amp;' : '?') + 'lang=' + l);
const langs = ['en', 'es', 'pt'];
const alt = (u) => [...langs.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${withLang(u, l)}"/>`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${u}"/>`].join('\n');
const entries = urls.flatMap(u => langs.map(l => `  <url>\n    <loc>${withLang(u, l)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}${alt(u)}\n  </url>`));
// the book, verse and "How many" pages are English only
const stat = staticURLs(load()).map(u => `  <url>\n    <loc>${base}${u}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}  </url>`);
entries.push(...stat);
fs.writeFileSync(new URL('../site/sitemap.xml', import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
console.log(`Wrote ${entries.length} URLs (${urls.length} pages in ${langs.length} languages, ${stat.length} book and verse pages) to site/sitemap.xml`);
