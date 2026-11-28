// tools/viewer-shots.js: screenshots of viewer.html (characters, moves, faces) without opening a browser yourself.
//   npm run viewer-shots -- <outDir> [shots.json | 'inline JSON list']
// Each shot: { "name": "rhea_front", "char": "rhea", "move": "idle", "face": "auto", "mood": "studio", "view": "body|face|low", "yaw": 0.4, "t": 1.2 }
// Defaults to a set that shows the whole cast.
import fs from 'node:fs';
import path from 'node:path';
import { startServer, openPage, ROOT } from './browser.js';

const outDir = path.resolve(process.argv[2] || path.join(ROOT, 'reaping-trials', 'build', 'viewer-shots'));
let shots = process.argv[3] ? (fs.existsSync(process.argv[3]) ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : JSON.parse(process.argv[3])) : null;
shots = shots || [
  { name: 'lineup', char: 'lineup', move: 'idle', t: 0.5 },
  ...['rhea', 'pip', 'juno', 'dax', 'haskin', 'vire', 'guard'].flatMap((c) => [
    { name: `${c}_front`, char: c, move: 'idle', yaw: 0.35, t: 0.5 },
    { name: `${c}_back`, char: c, move: 'idle', yaw: 2.6, t: 0.5 },
    { name: `${c}_face`, char: c, move: 'idle', view: 'face', yaw: 0.15, t: 0.5 },
  ]),
];
const W = parseInt(process.env.SHOT_W || '720', 10), H = parseInt(process.env.SHOT_H || '1280', 10);
fs.mkdirSync(outDir, { recursive: true });
const server = await startServer();
const { browser, page } = await openPage(server, 'reaping-trials/viewer.html?static=1', { width: W, height: H, readyFlag: 'viewerReady' });
try {
  for (const s of shots) {
    const t0 = Date.now();
    await page.evaluate((s) => {
      const v = window.viewer;
      v.setState({ char: s.char || 'rhea', move: s.move || 'idle', face: s.face || 'auto', mood: s.mood || 'studio', view: s.view || 'body', yaw: s.yaw ?? 0, spin: false });
      v.build();
      if (s.dist) v.orbit.dist = s.dist;
      if (s.pitch !== undefined) v.orbit.pitch = s.pitch;
      v.renderAt(s.t ?? 0.5);
    }, s);
    const file = path.join(outDir, `${s.name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    console.log(`  ${s.name}  ${Date.now() - t0} ms`);
  }
} finally { await browser.close(); server.close(); }
console.log(`✔ ${shots.length} shots in ${outDir}`);
