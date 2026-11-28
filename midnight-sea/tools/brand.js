// tools/brand.js: Blocktale Studios logo files + watermarking.
//   node midnight-sea/tools/brand.js logos                     → midnight-sea/brand/logo.png, logo-profile.png, watermark.png
//   node midnight-sea/tools/brand.js watermark <in.mp4> <out.mp4> [opacity=0.4]
// Watermark settings (size, position, opacity) live in midnight-sea/brand/brand.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer, openPage, ROOT } from './browser.js';

const BRAND = path.join(ROOT, 'midnight-sea', 'brand');
export const settings = () => JSON.parse(fs.readFileSync(path.join(BRAND, 'brand.json'), 'utf8'));

export async function renderLogos() {
  const server = await startServer();
  try {
    for (const [v, w, h, file] of [['logo', 1024, 1024, 'logo.png'], ['profile', 1024, 1024, 'logo-profile.png'], ['watermark', 1080, 260, 'watermark.png']]) {
      const { browser, page } = await openPage(server, `midnight-sea/brand/logo.html?v=${v}`, { width: w, height: h });
      try { await page.screenshot({ path: path.join(BRAND, file), type: 'png', omitBackground: v !== 'profile' }); console.log(`✔ midnight-sea/brand/${file}`); }
      finally { await browser.close(); }
    }
  } finally { server.close(); }
}

// Overlay the watermark PNG on a 1080 × 1920 video (picture re-encoded at high quality, sound copied untouched).
export function watermark(input, output, opacity) {
  const s = settings(), op = opacity ?? s.opacity, W = Math.round(1080 * s.width), x = Math.round(1080 * s.x), y = Math.round(1920 * s.y);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-i', path.join(BRAND, 'watermark.png'),
    '-filter_complex', `[1:v]scale=${W}:-1,format=rgba,colorchannelmixer=aa=${op}[wm];[0:v][wm]overlay=${x}:${y}:format=auto,format=yuv420p[v]`,
    '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', output], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg watermark failed');
  console.log(`✔ ${path.relative(ROOT, output)}  (watermark at ${Math.round(op * 100)} % opacity)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, a, b, c] = process.argv.slice(2);
  (cmd === 'watermark' ? Promise.resolve(watermark(path.resolve(a), path.resolve(b), c ? parseFloat(c) : undefined)) : renderLogos())
    .catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
}
