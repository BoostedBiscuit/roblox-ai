// tools/shots.js: list the shots of an episode (scene number, start, end) and print mid-shot times for --stills --at
//   node midnight-sea/tools/shots.js eye
import { startServer, openPage } from './browser.js';
const name = process.argv[2] || 'eye';
const server = await startServer();
const { browser, page } = await openPage(server, `midnight-sea/episodes/${name}.html?render=1`, { width: 270, height: 480 });
const list = await page.evaluate(() => window.__shots());
for (const [sc, a, b] of list) console.log(sc, a, b, (b - a).toFixed(2));
console.log('MIDS ' + list.map(([, a, b]) => (a + Math.min(b - a, 3) * 0.6).toFixed(2)).join(','));
await browser.close(); server.close();
