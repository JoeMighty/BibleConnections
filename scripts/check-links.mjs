// Checks that every Bible.com translation link works and opens the expected translation,
// and that "Listen" links open a Bible.com audio Bible for versions marked "audio": true.
// Run by .github/workflows/links.yml every week. Usage: node scripts/check-links.mjs
// AUDIO_DISCOVER=1 lists which versions have audio on Bible.com instead of failing.
import fs from 'node:fs';

const versions = JSON.parse(fs.readFileSync(new URL('../site/content/versions.json', import.meta.url)));
// the two link shapes the site uses: a single verse and a whole chapter
const samples = [['JHN.3.16', 'verse'], ['PSA.23', 'chapter']];
let failed = 0;

for (const v of versions) {
  // New Testament only versions have no Psalms, so only the verse link is checked
  for (const [ref, kind] of v.nt ? samples.slice(0, 1) : samples) {
    const url = `https://www.bible.com/bible/${v.id}/${ref}.${v.code}`;
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'BibleConnections link check' } });
      const html = await res.text();
      const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
      // Bible.com page titles include the version code, for example "John 3:16 (NIV)" or "... (MALOVBSI)".
      // A few versions show another label instead (IRVMAL shows "മലയാളം"); versions.json can set it as titleHint.
      const hint = (v.titleHint || v.code.replace(/\d{4}$/, '')).toUpperCase();
      const ok = res.ok && title.toUpperCase().includes(hint);
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${v.code.padEnd(9)} ${kind.padEnd(11)} ${res.status} ${title.slice(0, 70)}  ${url}`);
      if (!ok) failed++;
    } catch (err) {
      console.log(`FAIL ${v.code.padEnd(9)} ${kind.padEnd(11)} ${err.message}  ${url}`);
      failed++;
    }
  }
}
// audio Bibles: the page for a chapter with audio includes a link to the recording
const hasAudio = (html) => /\.mp3|audio-bible-cdn|"audio_?url"|application\/x-mpegURL|\.m3u8/i.test(html);
const discover = !!process.env.AUDIO_DISCOVER;
for (const v of versions) {
  if (!discover && !v.audio) continue;
  const url = `https://www.bible.com/audio-bible/${v.id}/JHN.3.${v.code}`;
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'BibleConnections link check' } });
    const html = await res.text();
    const ok = res.ok && hasAudio(html);
    if (discover) { console.log(`AUDIO ${ok ? 'yes' : 'no '} ${v.code.padEnd(9)} ${res.status} ${res.url}`); continue; }
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${v.code.padEnd(9)} audio       ${res.status} ${url}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ${v.code.padEnd(9)} audio       ${err.message}  ${url}`);
    if (!discover) failed++;
  }
}
if (failed) { console.error(`\n${failed} link check(s) failed. Fix the id or code in site/content/versions.json.`); process.exit(1); }
console.log('\nAll Bible.com links work.');
