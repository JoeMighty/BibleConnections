// Moves reviewed notes from site/content/notes-draft.json into site/content/notes.json.
// In the draft file, set "status" to "approved" (or "changed", with the new wording in "note") for each note the
// reviewer accepts, and "removed" for the rest. Then run: node scripts/approve-notes.mjs
import fs from 'node:fs';
const p = (f) => new URL(`../site/content/${f}`, import.meta.url);
const drafts = JSON.parse(fs.readFileSync(p('notes-draft.json'), 'utf8'));
const notes = JSON.parse(fs.readFileSync(p('notes.json'), 'utf8'));
const have = new Set(notes.map(n => `${n.from}~${n.to}`));
const ready = drafts.filter(n => ['approved', 'changed'].includes(n.status) && !have.has(`${n.from}~${n.to}`));
for (const { from, to, type, note } of ready) notes.push({ from, to, type, note });
fs.writeFileSync(p('notes.json'), JSON.stringify(notes, null, 2) + '\n');
fs.writeFileSync(p('notes-draft.json'), JSON.stringify(drafts.filter(n => !['approved', 'changed', 'removed'].includes(n.status)), null, 1) + '\n');
console.log(`${ready.length} notes added to notes.json; ${drafts.length - ready.length} left in the draft`);
