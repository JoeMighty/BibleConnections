// Builds the open data download: the site's own writing (notes, journeys, plans, topics, people and places,
// themes, book introductions, questions, prophecy chains and the timeline) as plain JSON under CC BY 4.0,
// with a README, the license, a manifest for the data page and one zip with everything.
// No Bible translation text is included (there is none on the site).
// Output: site/open-data/ (built in CI, not kept in git). Usage: node scripts/open-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site'), OUT = path.join(SITE, 'open-data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(SITE, 'content', f), 'utf8'));
const version = fs.readFileSync(path.join(ROOT, 'CITATION.cff'), 'utf8').match(/^version: (.+)$/m)[1];

// [file, title, description, count]
const sets = [
  ['notes.json', 'Notes on connections', 'Why two passages connect: the two references (OSIS, such as Rom.8.28), the kind of link and a short note.', (d) => d.length],
  ['journeys.json', 'Guided journeys', 'Step-by-step tours: each step is two references, a title, a note and a question to talk about. Spanish and Portuguese in separate files.', (d) => d.length],
  ['journeys.es.json', 'Guided journeys (Spanish)', 'The journeys in Spanish.', (d) => d.length],
  ['journeys.pt.json', 'Guided journeys (Portuguese)', 'The journeys in Portuguese.', (d) => d.length],
  ['plans.json', 'Reading plans', 'Daily plans, including Advent, the twelve days of Christmas, Lent and Holy Week, with titles and notes in three languages.', (d) => d.length],
  ['topics.json', 'Topics', 'Topics with the key words used to find them, word forms to skip and verses to leave out.', (d) => d.length],
  ['people-places.json', 'People and places', 'People and places with the names used to find them and a one-line description in three languages.', (d) => d.length],
  ['themes.json', 'Themes', 'Themes with their key verses.', (d) => d.length],
  ['book-intros.json', 'Book introductions', 'A short introduction to each of the 66 books, in three languages.', (d) => Object.keys(d).length],
  ['reflect.json', 'Reflection questions', 'General questions for personal or group study, by part of the Bible.', (d) => Object.keys(d).length],
  ['prophecy.json', 'Prophecy chains', 'Old Testament promises, covenants and pictures followed to the New Testament.', (d) => (Array.isArray(d) ? d.length : Object.keys(d).length)],
  ['timeline.json', 'Timeline', 'Key events of the Bible story in order, with their passages and places.', (d) => (Array.isArray(d) ? d.length : Object.keys(d).length)],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const files = [], manifest = { version, license: 'CC BY 4.0', made: new Date().toISOString().slice(0, 10), sets: [] };
for (const [f, title, description, count] of sets) {
  const data = read(f), text = JSON.stringify(data, null, 1) + '\n';
  fs.writeFileSync(path.join(OUT, f), text);
  files.push([f, text]);
  manifest.sets.push({ file: f, title, description, count: count(data), bytes: Buffer.byteLength(text) });
}
const readme = `# Bible Connections open data (version ${version})

The writing behind Bible Connections (https://bibleconnections.app): notes on why passages connect, guided journeys,
reading plans, topics, people and places, themes, book introductions, reflection questions, prophecy chains and a timeline.

Bible references use OSIS codes, such as Gen.1.1 and Rom.8.28. No Bible translation text is included.

## Files

${manifest.sets.map(s => `- ${s.file}: ${s.title} (${s.count}). ${s.description}`).join('\n')}

## License

These files are licensed under Creative Commons Attribution 4.0 (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/
You may share and adapt them for any purpose, including commercially, as long as you give credit.

Please credit: "Bible Connections (bibleconnections.app), CC BY 4.0".

The cross references themselves come from OpenBible.info (CC BY 4.0) and are not part of this download;
get them from https://www.openbible.info/labs/cross-references/.
`;
fs.writeFileSync(path.join(OUT, 'README.md'), readme);
const license = fs.readFileSync(path.join(ROOT, 'LICENSE-CONTENT.md'), 'utf8');
files.push(['README.md', readme], ['LICENSE.md', license]);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

// one zip with everything (deflate, the format every system opens)
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const parts = [], central = [];
let offset = 0;
for (const [name, text] of files) {
  const data = Buffer.from(text), packed = zlib.deflateRawSync(data, { level: 9 }), nm = Buffer.from(`bible-connections-open-data/${name}`);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8);
  h.writeUInt32LE(crc32(data), 14); h.writeUInt32LE(packed.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
  parts.push(h, nm, packed);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
  c.writeUInt32LE(crc32(data), 16); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(offset, 42);
  central.push(c, nm);
  offset += 30 + nm.length + packed.length;
}
const cd = Buffer.concat(central), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
fs.writeFileSync(path.join(OUT, 'bible-connections-open-data.zip'), Buffer.concat([...parts, cd, end]));
console.log(`Open data ${version}: ${manifest.sets.length} files and a zip in site/open-data`);
