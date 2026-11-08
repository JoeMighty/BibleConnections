// Turns an approved "Report a weak link" issue into an entry in site/content/weak-links.json,
// which hides that cross reference from the map for everyone.
// Reads the issue body from ISSUE_BODY (set by .github/workflows/weak-link-from-issue.yml).
//   ISSUE_BODY="$(cat issue.md)" node scripts/issue-to-weak-link.mjs
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
const reason = field('What is wrong with it\\?').replace(/\s+/g, ' ') || 'Reported as weak';
const out = (k, v) => fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `${k}=${v}\n`);

const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/books.json'), 'utf8'));
const valid = (r) => {
  const m = r.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  const b = m && meta.books.find(x => x.osis === m[1]);
  return !!(b && +m[2] >= 1 && +m[2] <= b.chapters.length && +m[3] >= 1 && +m[3] <= b.chapters[+m[2] - 1]);
};
if (!valid(from) || !valid(to) || from === to) {
  console.log(`Not a complete weak link report (from "${from}", to "${to}").`);
  out('ok', 'false');
  process.exit(0);
}
const p = process.env.WEAK_LINKS_FILE || path.join(ROOT, 'site/content/weak-links.json');   // a different file can be used for tests
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
data.hidden = data.hidden || [];
const same = (x) => [x[0], x[1]].sort().join() === [from, to].sort().join();
if (data.hidden.some(same)) {
  console.log(`${from} and ${to} is already hidden.`);
  out('ok', 'already');
  process.exit(0);
}
data.hidden.push([from, to, reason]);
fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
console.log(`Hidden ${from} and ${to}: ${reason}`);
out('ok', 'true');
out('label', `${from} and ${to}`);
