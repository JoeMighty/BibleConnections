// Builds site/data/places.json for the places map:
//   places: [name, longitude, latitude, confidence (2 high, 1 medium, 0 low), type, verse deltas in base 36]
//   land:   coastline rings for the Bible lands, simplified
// Sources: OpenBible.info Bible Geocoding Data (CC BY 4.0), https://github.com/openbibleinfo/Bible-Geocoding-Data
//          Natural Earth 1:50m land (public domain), https://www.naturalearthdata.com
// Usage: node scripts/build-places.mjs <Bible-Geocoding-Data checkout> <ne_50m_land.geojson>
import fs from 'node:fs';
import path from 'node:path';

const [repo, landFile] = process.argv.slice(2);
if (!repo || !landFile) { console.error('Pass the Bible-Geocoding-Data folder and ne_50m_land.geojson'); process.exit(1); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/books.json'), 'utf8'));
const chapterStart = meta.books.map(b => { let s = b.start; return b.chapters.map(n => { const r = s; s += n; return r; }); });
const bookIndex = new Map(meta.books.map((b, i) => [b.osis, i]));
const toVerse = (osis) => {
  const [bk, c, v] = osis.split('.');
  const bi = bookIndex.get(bk), b = meta.books[bi];
  if (!b || !b.chapters[c - 1] || v > b.chapters[c - 1]) return -1;
  return chapterStart[bi][c - 1] + (+v) - 1;
};
const BBOX = [-10, 12, 62, 46];   // west, south, east, north: from Spain to Persia
const inBox = ([x, y]) => x >= BBOX[0] && x <= BBOX[2] && y >= BBOX[1] && y <= BBOX[3];

const modern = new Map();
for (const line of fs.readFileSync(path.join(repo, 'data/modern.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const m = JSON.parse(line);
  if (m.lonlat) modern.set(m.id, m.lonlat.split(',').map(Number));
}
const places = [];
for (const line of fs.readFileSync(path.join(repo, 'data/ancient.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const a = JSON.parse(line);
  const assoc = Object.entries(a.modern_associations || {}).sort((x, y) => y[1].score - x[1].score)[0];
  if (!assoc) continue;
  const ll = modern.get(assoc[0]);
  if (!ll || !inBox(ll)) continue;
  const score = assoc[1].score;
  const verses = [...new Set((a.verses || []).map(v => toVerse(v.osis)).filter(v => v >= 0))].sort((x, y) => x - y);
  if (!verses.length) continue;
  let prev = 0;
  const deltas = verses.map(v => { const d = v - prev; prev = v; return d.toString(36); }).join(',');
  places.push([a.friendly_id, +ll[0].toFixed(3), +ll[1].toFixed(3), score >= 500 ? 2 : score >= 100 ? 1 : 0, (a.types || [])[0] || 'place', deltas]);
}
places.sort((x, y) => y[5].split(',').length - x[5].split(',').length);

// coastline: keep rings that touch the box, round to 0.02 degrees and drop near duplicate points
const land = [];
for (const f of JSON.parse(fs.readFileSync(landFile, 'utf8')).features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring.some(p => p[0] >= BBOX[0] - 8 && p[0] <= BBOX[2] + 8 && p[1] >= BBOX[1] - 8 && p[1] <= BBOX[3] + 8)) continue;
    const out = [];
    for (const [x, y] of ring) {
      const p = [Math.round(x * 50) / 50, Math.round(y * 50) / 50];
      const last = out[out.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.08) out.push(p);
    }
    if (out.length > 3) land.push(out.flat());
  }
}
fs.writeFileSync(path.join(ROOT, 'site/data/places.json'), JSON.stringify({ bbox: BBOX, places, land }));
console.log(`Places: ${places.length}, coastline rings: ${land.length}`);
