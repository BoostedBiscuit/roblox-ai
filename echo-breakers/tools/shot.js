// tools/shot.js: screenshot any echo-breakers page (previews, lineup, location tests).
//   node echo-breakers/tools/shot.js echo-breakers/previews/lineup.html out.png [width] [height]
import { startServer, openPage } from './browser.js';
const [url, out, w = 1080, h = 1920] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node echo-breakers/tools/shot.js <page> <out.png|jpg> [width] [height]'); process.exit(2); }
const server = await startServer();
try {
  const { browser, page } = await openPage(server, url, { width: +w, height: +h });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.screenshot({ path: out, type: out.endsWith('.png') ? 'png' : 'jpeg', ...(out.endsWith('.png') ? {} : { quality: 90 }) });
  await browser.close(); console.log('✔ ' + out);
} finally { server.close(); }
