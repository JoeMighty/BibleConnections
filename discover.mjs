const sets = {
  pt: [1608, 212, 1840, 129, 1930, 211], ru: [400, 385, 313, 201, 3764], fr: [93, 152, 21, 133, 63], de: [51, 73, 157, 108, 2351],
  it: [122, 123, 141, 1197], ko: [88, 142, 86, 4639], pcm: [2516], tl: [1264, 177, 144], sw: [164, 74, 1627, 1818], am: [1260],
  yo: [207, 911, 2754], ig: [77, 1624], ha: [71, 1614], ln: [1964], kg: [1491], lua: [2918, 2919], om: [3202, 4456, 3552],
  ti: [3988], ceb: [562, 2187, 9], ilo: [782, 2192], zu: [286, 3500, 3846], xh: [282, 281, 3602], af: [6, 5, 3499, 117],
  ki: [1622, 1201], luo: [1810, 2652], ta: [339, 1899, 2730], te: [1787, 1895, 3268], hi: [1683, 1682, 1980, 1628, 819],
};
const ua = { 'user-agent': 'Mozilla/5.0 version-lookup' };
for (const [lang, ids] of Object.entries(sets)) for (const id of ids) {
  try {
    const r = await fetch(`https://www.bible.com/bible/${id}/JHN.3.16`, { headers: ua, redirect: 'follow' });
    const h = await r.text();
    const t = (h.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    const v = await fetch(`https://www.bible.com/versions/${id}`, { headers: ua });
    const vh = await v.text();
    const vt = (vh.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    const og = (vh.match(/property="og:title" content="([^"]*)"/) || [])[1] || '';
    console.log([lang, id, r.status, r.url, t.slice(0, 60), vt, og].join(' | '));
  } catch (e) { console.log([lang, id, 'ERR', e.message].join(' | ')); }
}
