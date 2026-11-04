const langs = process.argv.slice(2);
for (const tag of langs) {
  try {
    const res = await fetch(`https://www.bible.com/languages/${tag}`, { headers: { 'user-agent': 'Mozilla/5.0 link-check' } });
    const html = await res.text();
    const out = new Map();
    const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nd) {
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) return o.forEach(walk);
        if (typeof o.id === 'number' && (o.abbreviation || o.local_abbreviation)) {
          out.set(o.id, `${o.id}\t${o.abbreviation || ''}\t${o.local_abbreviation || ''}\t${o.local_title || o.title || ''}\t${o.language?.iso_639_3 || ''}`);
        }
        Object.values(o).forEach(walk);
      };
      walk(JSON.parse(nd[1]));
    }
    for (const m of html.matchAll(/\/versions\/(\d+)-([a-z0-9-]+)/g)) if (!out.has(+m[1])) out.set(+m[1], `${m[1]}\t${m[2]}\t(href)`);
    console.log(`=== ${tag} status=${res.status} count=${out.size}`);
    for (const l of out.values()) console.log(l);
  } catch (e) { console.log(`=== ${tag} ERROR ${e.message}`); }
}
