// tools/browser.js: shared by render.js and viewer-shots.js (adapted from the roblox-short render pipeline).
// Starts a tiny static web server at the repo root and opens pages in headless Chromium (Puppeteer).
// The scene pages load three.js r128 from cdnjs (so they work on your phone). When rendering, that exact URL
// is answered with the identical local file node_modules/three/build/three.min.js (npm package three@0.128.0),
// so renders never depend on the network and every machine gets the same pixels.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');   // repo root
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const THREE_LOCAL = path.join(ROOT, 'node_modules', 'three', 'build', 'three.min.js');

export function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.normalize(path.join(ROOT, url));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try { const p = puppeteer.executablePath(); if (p && fs.existsSync(p)) return p; } catch { /* not downloaded */ }
  return ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
}

// Opens url (path relative to the repo root, e.g. 'reaping-trials/episodes/trailer.html?render=1') at width × height.
export async function openPage(server, url, { width = 1080, height = 1920, readyFlag = 'sceneReady' } = {}) {
  if (!fs.existsSync(THREE_LOCAL)) throw new Error('node_modules/three missing: run  PUPPETEER_SKIP_DOWNLOAD=1 npm install  first');
  const args = ['--hide-scrollbars', '--mute-audio', `--window-size=${width},${height}`];
  if (!process.env.GPU) args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');   // software GL = identical pixels on every machine
  if (process.getuid?.() === 0) args.push('--no-sandbox');
  const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), args, protocolTimeout: 900000 });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('  [page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`  [page ${m.type()}]`, m.text()); });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (r.url() === THREE_CDN) return r.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(THREE_LOCAL) });
    if (!r.url().startsWith('http://127.0.0.1')) { console.error('  [blocked external request]', r.url()); return r.abort(); }
    r.continue();
  });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/${url}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForFunction((f) => window[f] || window.sceneError, { timeout: 300000 }, readyFlag);
  const err = await page.evaluate(() => window.sceneError);
  if (err) throw new Error(`${url} failed to load:\n${err}`);
  return { browser, page };
}
