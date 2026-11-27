// tools/arena7-shots.js: screenshots of the Episode 3 arena (previews/arena7.html) for checking them.
//   node reaping-trials/tools/arena7-shots.js <outDir> '<JSON list of views>'
// view: { name, set: 'station'|'court'|'show'|'roof', mood, night, cam: [x,y,z], look: [x,y,z], fov, u: {…set.update options} }
import fs from 'node:fs';
import path from 'node:path';
import { startServer, openPage, ROOT } from './browser.js';
const outDir = path.resolve(process.argv[2] || path.join(ROOT, 'reaping-trials', 'build', 'arena7-shots'));
const views = JSON.parse(fs.existsSync(process.argv[3] || '') ? fs.readFileSync(process.argv[3], 'utf8') : process.argv[3]);
fs.mkdirSync(outDir, { recursive: true });
const server = await startServer();
const { browser, page } = await openPage(server, 'reaping-trials/previews/arena7.html', { width: parseInt(process.env.SHOT_W || '540', 10), height: parseInt(process.env.SHOT_H || '960', 10) });
try {
  const err = await page.evaluate(() => window.sceneError); if (err) throw new Error(err);
  for (const v of views) { const t0 = Date.now(); await page.evaluate((v) => window.view(v), v); await page.screenshot({ path: path.join(outDir, v.name + '.jpg'), type: 'jpeg', quality: 85 }); console.log(`  ${v.name} ${Date.now() - t0} ms`); }
} finally { await browser.close(); server.close(); }
