// Shrinks the site's own scripts and styles for the deployed copy only (the files in git stay readable).
// Runs in the deploy job after the pages are built. Usage: node scripts/minify.mjs [folder]   (default: site)
import fs from 'node:fs';
import path from 'node:path';
import { transform } from 'esbuild';

const dir = path.resolve(process.argv[2] || 'site');
// only the files written for this site: data, vendor libraries and generated pages are left alone
const files = fs.readdirSync(dir).filter(f => /\.(js|css)$/.test(f) && f !== 'sw.js');
let before = 0, after = 0;
for (const f of files) {
  const p = path.join(dir, f), src = fs.readFileSync(p, 'utf8');
  // scripts are plain browser scripts (not modules): keep them that way, and keep their names readable in errors
  const out = await transform(src, { loader: f.endsWith('.css') ? 'css' : 'js', minify: true, target: f.endsWith('.css') ? ['safari15', 'chrome100'] : 'es2020', legalComments: 'none', keepNames: false });
  fs.writeFileSync(p, out.code);
  before += src.length; after += out.code.length;
  console.log(`${f.padEnd(16)} ${(src.length / 1024).toFixed(0).padStart(5)} KB -> ${(out.code.length / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`Total ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
