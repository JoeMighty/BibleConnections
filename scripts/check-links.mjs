// Checks that every Bible.com translation link works and opens the expected translation.
// Run by .github/workflows/links.yml every week. Usage: node scripts/check-links.mjs
import fs from 'node:fs';

const versions = JSON.parse(fs.readFileSync(new URL('../site/content/versions.json', import.meta.url)));
const samples = [['JHN.3.16', 'verse'], ['JHN.1.1-3', 'verse range'], ['PSA.23', 'chapter']];
let failed = 0;

for (const v of versions) {
  for (const [ref, kind] of samples) {
    const url = `https://www.bible.com/bible/${v.id}/${ref}.${v.code}`;
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'BibleConnections link check' } });
      const html = await res.text();
      const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
      const ok = res.ok && title.toUpperCase().includes(v.code.replace(/\d{4}$/, '').toUpperCase());
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${v.code.padEnd(9)} ${kind.padEnd(11)} ${res.status} ${title.slice(0, 70)}  ${url}`);
      if (!ok) failed++;
    } catch (err) {
      console.log(`FAIL ${v.code.padEnd(9)} ${kind.padEnd(11)} ${err.message}  ${url}`);
      failed++;
    }
  }
}
if (failed) { console.error(`\n${failed} link check(s) failed. Fix the id or code in site/content/versions.json.`); process.exit(1); }
console.log('\nAll Bible.com links work.');
