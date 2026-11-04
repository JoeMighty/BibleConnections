// Builds site/feeds/daily.xml (RSS) and site/feeds/daily.ics (calendar) for the connection of the day.
// Uses the same daily choice as the website. Run during deploy (see .github/workflows/ci.yml).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = 'https://joemighty.github.io/BibleConnections/';
const read = (p) => fs.readFileSync(path.join(ROOT, 'site', p));
const meta = JSON.parse(read('data/books.json'));
const raw = new Uint16Array(read('data/refs.bin').buffer.slice(0));
const notes = JSON.parse(read('content/notes.json'));

const TOTAL = meta.totalVerses, chapterStart = [], verseBook = new Uint8Array(TOTAL), verseChap = new Uint16Array(TOTAL), verseNum = new Uint16Array(TOTAL);
meta.books.forEach((b, bi) => { let s = b.start; chapterStart.push(b.chapters.map((n, ci) => { const r = s; for (let v = 0; v < n; v++) { verseBook[s + v] = bi; verseChap[s + v] = ci + 1; verseNum[s + v] = v + 1; } s += n; return r; })); });
const osisToIndex = (o) => {
  const [bk, c, v] = o.split('.'), bi = meta.books.findIndex(b => b.osis === bk);
  if (bi < 0) return -1;
  const b = meta.books[bi], ci = Math.min(Math.max(+c, 1), b.chapters.length) - 1;
  return chapterStart[bi][ci] + Math.min(Math.max(+v, 1), b.chapters[ci]) - 1;
};
const label = (v) => `${meta.books[verseBook[v]].name} ${verseChap[v]}:${verseNum[v]}`;
const toOsis = (v) => `${meta.books[verseBook[v]].osis}.${verseChap[v]}.${verseNum[v]}`;

// same matching as the website: every cross reference whose pair has a note
const key = (a, b) => Math.min(a, b) * 65536 + Math.max(a, b);
const wanted = new Map(notes.map(n => [key(osisToIndex(n.from), osisToIndex(n.to)), n]));
const noted = [];
for (let i = 0; i < raw.length / 4; i++) if (wanted.has(key(raw[i * 4], raw[i * 4 + 1]))) noted.push(i);
const pick = (day) => noted[(Math.imul(day, 2654435761) >>> 0) % noted.length];

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = Math.floor(Date.now() / 86400000);
const entry = (day) => {
  const i = pick(day), f = raw[i * 4], t = raw[i * 4 + 1];
  const n = wanted.get(key(f, t));
  return { day, title: `${label(f)} and ${label(t)}`, note: n.note, type: n.type, url: `${SITE}?c=${toOsis(f)}_${toOsis(t)}` };
};

fs.mkdirSync(path.join(ROOT, 'site/feeds'), { recursive: true });
const items = Array.from({ length: 14 }, (_, k) => entry(today - k));
fs.writeFileSync(path.join(ROOT, 'site/feeds/daily.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Bible Connections: connection of the day</title>
<link>${SITE}</link>
<description>A different cross reference every day, with a short note on why the passages connect.</description>
<language>en</language>
${items.map(e => `<item><title>${esc(e.title)}</title><link>${esc(e.url)}</link><guid isPermaLink="false">bible-connections-${e.day}</guid>
<pubDate>${new Date(e.day * 86400000).toUTCString()}</pubDate><description>${esc(`${e.type}: ${e.note} Cross references from OpenBible.info (CC BY 4.0).`)}</description></item>`).join('\n')}
</channel></rss>
`);

const d8 = (day) => new Date(day * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
const icsEsc = (s) => String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Bible Connections//Connection of the day//EN\r\nX-WR-CALNAME:Bible Connections\r\nREFRESH-INTERVAL;VALUE=DURATION:P1D\r\nX-PUBLISHED-TTL:P1D\r\n';
for (let k = 0; k < 60; k++) {
  const e = entry(today + k);
  ics += `BEGIN:VEVENT\r\nUID:bible-connections-${e.day}@joemighty.github.io\r\nDTSTAMP:${d8(today)}T000000Z\r\nDTSTART;VALUE=DATE:${d8(e.day)}\r\nDTEND;VALUE=DATE:${d8(e.day + 1)}\r\n`
    + `SUMMARY:${icsEsc(e.title)}\r\nDESCRIPTION:${icsEsc(`${e.note}\n${e.url}`)}\r\nURL:${e.url}\r\nTRANSP:TRANSPARENT\r\nEND:VEVENT\r\n`;
}
fs.writeFileSync(path.join(ROOT, 'site/feeds/daily.ics'), ics + 'END:VCALENDAR\r\n');
console.log(`Feeds written. Today: ${items[0].title}`);
