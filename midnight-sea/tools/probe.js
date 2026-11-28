// tools/probe.js: print camera / character positions at given times (debugging shots)
//   node midnight-sea/tools/probe.js eye 22.8,24.3
import { startServer, openPage } from './browser.js';
const name = process.argv[2] || 'eye', times = (process.argv[3] || '0').split(',').map(Number);
const server = await startServer();
const { browser, page } = await openPage(server, `midnight-sea/episodes/${name}.html?render=1`, { width: 540, height: 960 });
for (const t of times) {
  const r = await page.evaluate((t) => { window.renderFrame(t); const P = (o) => o ? [o.position.x, o.position.y, o.position.z].map((v) => +v.toFixed(2)) : null;
    const sc = window.__dbg ? window.__dbg() : {}; return sc; }, t);
  console.log(t, JSON.stringify(r));
}
await browser.close(); server.close();
