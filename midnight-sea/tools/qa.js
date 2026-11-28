// tools/qa.js: automatic clip check for an episode (no rendering, a few minutes).
//   node midnight-sea/tools/qa.js ep1               every 0.1 s of the episode
//   node midnight-sea/tools/qa.js ep1 --from 60 --to 70 --step 0.05
// For each moment it asks the page (window.qa(t)) whether the camera is inside or touching anything, whether a
// character's face is hidden, and whether any character is inside another character, a crowd member, or the set.
// Prints every problem with the time range and shot number. Exit code 1 if anything was found.
import { startServer, openPage } from './browser.js';

const args = process.argv.slice(2), name = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
if (!name) { console.error('usage: node midnight-sea/tools/qa.js <episode> [--from s] [--to s] [--step s]'); process.exit(2); }
const server = await startServer();
const { browser, page } = await openPage(server, `midnight-sea/episodes/${name}.html?render=1&qa=1`, { width: 540, height: 960 });
const dur = await page.evaluate(() => window.sceneInfo.duration);
const step = opt('--step', 0.1), from = opt('--from', 0), to = Math.min(opt('--to', dur), dur);
const times = []; for (let t = from; t <= to + 1e-9; t += step) times.push(+t.toFixed(3));
const open = new Map(), done = [];
const key = (s) => s.replace(/-?\d+\.\d+/g, '#').replace(/#\d+/g, '#n');
const t0 = Date.now();
for (let i = 0; i < times.length; i += 25) {
  const chunk = times.slice(i, i + 25);
  const res = await page.evaluate((ts) => ts.map((t) => window.qa(t)), chunk);
  res.forEach((r, j) => {
    const t = chunk[j], seen = new Set();
    for (const msg of r.issues) {
      const k = key(msg) + '|' + r.shot; seen.add(k);
      if (open.has(k)) open.get(k).t1 = t; else open.set(k, { t0: t, t1: t, shot: r.shot, msg });
    }
    for (const [k, v] of open) if (!seen.has(k)) { done.push(v); open.delete(k); }
  });
  process.stdout.write(`\r  checked ${Math.min(i + 25, times.length)}/${times.length} moments`);
}
for (const v of open.values()) done.push(v);
done.sort((a, b) => a.t0 - b.t0);
console.log(`\n  ${done.length ? done.length + ' problem(s)' : 'no problems'} in ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
for (const v of done) console.log(`  ${fmt(v.t0)}–${fmt(v.t1)}  shot ${String(v.shot + 1).padStart(2)}  ${v.msg}`);
await browser.close(); server.close();
process.exit(done.length ? 1 : 0);
