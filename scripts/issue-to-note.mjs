// Turns an approved "Content suggestion" issue into a change to site/content/notes.json.
// Reads the issue body from the ISSUE_BODY environment variable (set by .github/workflows/note-from-issue.yml).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const body = process.env.ISSUE_BODY || '';
const field = (label) => {
  const m = body.match(new RegExp(`###\\s*${label}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###|$)`));
  const v = m ? m[1].trim() : '';
  return v === '_No response_' ? '' : v;
};
const from = field('First passage').replace(/\s+/g, ''), to = field('Second passage').replace(/\s+/g, '');
const type = field('Kind of connection') || 'Same truth', note = field('Why do these passages connect\\?').replace(/\s+/g, ' ');
const out = (k, v) => fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `${k}=${v}\n`);

const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/books.json'), 'utf8'));
const valid = (r) => {
  const m = r.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  const b = m && meta.books.find(x => x.osis === m[1]);
  return !!(b && +m[2] >= 1 && +m[2] <= b.chapters.length && +m[3] >= 1 && +m[3] <= b.chapters[+m[2] - 1]);
};
if (!valid(from) || !valid(to) || note.length < 20) {
  console.log(`Not a complete note suggestion (from "${from}", to "${to}", note ${note.length} characters).`);
  out('ok', 'false');
  process.exit(0);
}
const p = path.join(ROOT, 'site/content/notes.json');
const notes = JSON.parse(fs.readFileSync(p, 'utf8'));
const same = (n) => [n.from, n.to].sort().join() === [from, to].sort().join();
const entry = { from, to, type, note: note.replace(/'/g, '’') };
const i = notes.findIndex(same);
if (i >= 0) notes[i] = entry; else notes.push(entry);
fs.writeFileSync(p, JSON.stringify(notes, null, 2) + '\n');
console.log(`${i >= 0 ? 'Updated' : 'Added'} note for ${from} and ${to}.`);
out('ok', 'true');
out('label', `${from} and ${to}`);
