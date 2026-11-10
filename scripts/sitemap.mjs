// Regenerates site/sitemap.xml from the journeys and themes. Usage: node scripts/sitemap.mjs
import fs from 'node:fs';
const base = 'https://bibleconnections.app/';
const read = (f) => JSON.parse(fs.readFileSync(new URL(`../site/content/${f}`, import.meta.url)));
const urls = [base, `${base}?view=map`, `${base}?view=journeys`, `${base}?view=path`, `${base}?view=insights`, `${base}?view=study`, `${base}?view=plans`, `${base}?view=people`, `${base}?view=topics`, `${base}?view=game`, `${base}?lang=es`, `${base}?lang=pt`, `${base}guide.html?lang=pt`, `${base}roadmap.html?lang=pt`, `${base}guide.html`, `${base}roadmap.html`, `${base}privacy.html`, `${base}?view=timeline`, `${base}?view=places`, `${base}?view=prophecy`];
for (const j of read('journeys.json')) urls.push(`${base}?journey=${j.id}&amp;step=1`, `${base}handout.html?journey=${j.id}`);
for (const g of read('prophecy.json').groups) for (const c of g.chains) urls.push(`${base}?prophecy=${c.id}`);
for (const j of read('journeys.json')) urls.push(`${base}handout.html?journey=${j.id}&amp;guide=leader`);
for (const r of read('routes.json')) urls.push(`${base}?route=${r.id}`);
for (const t of read('themes.json')) urls.push(`${base}?theme=${t.id}`);
for (const e of read('people-places.json')) urls.push(`${base}?${e.type}=${e.id}`);
for (const t of read('topics.json')) urls.push(`${base}?topic=${t.id}`);
for (const p of read('plans.json')) urls.push(`${base}?plan=${p.id}&amp;day=1`);
fs.writeFileSync(new URL('../site/sitemap.xml', import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Wrote ${urls.length} URLs to site/sitemap.xml`);
