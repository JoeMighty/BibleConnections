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
// Advent, the twelve days of Christmas and Holy Week follow the same seasonal readings as the website
const plans = JSON.parse(read('content/plans.json'));
const advent = plans.find(p => p.season === 'advent'), christmas = plans.find(p => p.season === 'christmas'), holyweek = plans.find(p => p.season === 'holyweek');
function adventStart(year) { const d = new Date(Date.UTC(year, 11, 24)); d.setUTCDate(d.getUTCDate() - d.getUTCDay() - 21); return d; }
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return Date.UTC(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
function seasonal(day) {
  const d = new Date(day * 86400000), y = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  const start = Math.round(adventStart(y) / 86400000), xmas = Math.round(Date.UTC(y, 11, 25) / 86400000), twelfth = Math.round(Date.UTC(y + 1, 0, 5) / 86400000);
  const east = Math.round(easter(d.getUTCFullYear()) / 86400000), palm = east - 7;
  let pair = null, type = '';
  const take = (p, n) => { const x = p.days[Math.min(n, p.days.length - 1)]; return { a: x.a, b: x.b, note: x.note }; };
  if (advent && day >= start && day <= xmas) { pair = take(advent, day - start); type = day === xmas ? 'Christmas' : 'Advent'; }
  else if (christmas && day > xmas && day <= twelfth) { pair = take(christmas, day - xmas); type = 'Christmas'; }
  else if (holyweek && day >= palm && day <= east) { pair = take(holyweek, day - palm); type = day === east ? 'Easter' : 'Holy Week'; }
  if (!pair) return null;
  const va = osisToIndex(pair.a), vb = osisToIndex(pair.b);
  for (let i = 0; i < raw.length / 4; i++) {
    const f = raw[i * 4], t = raw[i * 4 + 1], e = raw[i * 4 + 2];
    if ((f === va && t <= vb && vb <= e) || (f === vb && t <= va && va <= e)) return { f, t, note: pair.note, type };
  }
  return null;
}
const entry = (day) => {
  const s = seasonal(day);
  if (s) return { day, title: `${label(s.f)} and ${label(s.t)}`, note: s.note, type: s.type, url: `${SITE}?c=${toOsis(s.f)}_${toOsis(s.t)}` };
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
