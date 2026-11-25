// tools/render.js: renders a Reaping Trials scene to a vertical 1080 × 1920, 30 fps MP4 (adapted from roblox-short/render.js).
//   npm run render -- reaping-trailer            → out/reaping-trials/trailer.mp4   (also: trailer-no-voice.mp4, trailer-sfx-only.mp4, trailer-voice.mp3)
//   npm run render -- reaping-ep1-part1          → out/reaping-trials/ep1-part1.mp4
// Flags: --stills        one JPG per shot in reaping-trials/build/<video>/stills/ (fast framing check)
//        --preview       half size, 15 fps → reaping-trials/build/<video>/preview.mp4
//        --audio-only    re-mix the sound (after changing the CUE SHEET or audio files) and swap it into the MP4s
//        --redo 120-300  re-render only those frames
// Env:   WORKERS=n (parallel browsers, default 2) · GPU=1 (use the GPU instead of software rendering) · CHROME_PATH
// Deterministic: the page draws frame f at time f / 30 (window.renderFrame), never from the clock, so slow frames are still exact.
// Frames are cached in reaping-trials/build/<video>/frames with a signature of all code + timings: an interrupted render resumes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { startServer, openPage, ROOT } from './browser.js';
import { mix, probe } from './mix.js';
import { settings as brandSettings } from './brand.js';

const FPS = 30, W = 1080, H = 1920;
const name = (process.argv[2] || 'reaping-trailer').replace(/^reaping-/, '');
const has = (f) => process.argv.includes(f);
const PREVIEW = has('--preview'), SCALE = PREVIEW ? 0.5 : 1, STEP = PREVIEW ? 2 : 1;
const RTD = path.join(ROOT, 'reaping-trials'), BUILD = path.join(RTD, 'build', name), OUTD = path.join(ROOT, 'out', 'reaping-trials');
const PAGE = `reaping-trials/episodes/${name}.html?render=1`;
const rel = (p) => path.relative(ROOT, p);

function ff(args) { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) throw new Error('ffmpeg failed'); }

function signature() {
  const h = crypto.createHash('sha1');
  const files = [path.join(RTD, 'episodes', `${name}.html`), path.join(RTD, 'audio', 'voice', `${name}_narration.js`),
    ...fs.readdirSync(RTD).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(RTD, f))];
  for (const f of files) if (fs.existsSync(f)) h.update(fs.readFileSync(f));
  // the CUE SHEET comment only changes the sound, not the picture
  h.update(String(fs.readFileSync(path.join(RTD, 'episodes', `${name}.html`), 'utf8').replace(/=== CUE SHEET ===[\s\S]*?=== END ===/, '')));
  h.update(`${SCALE}|${STEP}`);
  return h.digest('hex');
}

async function open(server) {
  const { browser, page } = await openPage(server, PAGE, { width: Math.round(W * SCALE), height: Math.round(H * SCALE) });
  if (SCALE !== 1) await page.evaluate((s) => { document.getElementById('stage').style.transform = `translate(-50%,-50%) scale(${s})`; }, SCALE);
  return { browser, page };
}
async function grab(page, t) {
  await page.evaluate((x) => window.renderFrame(x), t);
  return page.screenshot({ type: 'jpeg', quality: 93, captureBeyondViewport: false });
}

async function renderFrames(server, total, dir) {
  const workers = Math.max(1, Math.min(parseInt(process.env.WORKERS || '0', 10) || Math.min(2, Math.max(1, Math.floor(os.cpus().length / 2))), 6));
  const file = (f) => path.join(dir, `${String(f).padStart(5, '0')}.jpg`);
  const todo = [...Array(total).keys()].filter((f) => !fs.existsSync(file(f)));
  console.log(`▶ rendering ${todo.length} of ${total} frames (${Math.round(W * SCALE)}×${Math.round(H * SCALE)}, ${FPS / STEP} fps) with ${workers} browser(s)`);
  let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(workers, Math.max(1, todo.length)) }, async () => {
    const { browser, page } = await open(server);
    try {
      while (next < todo.length) {
        const f = todo[next++], buf = await grab(page, (f * STEP) / FPS);
        fs.writeFileSync(file(f) + '.tmp', buf); fs.renameSync(file(f) + '.tmp', file(f));
        if (++done % 30 === 0 || done === todo.length) { const s = (Date.now() - t0) / 1000; console.log(`  ${done}/${todo.length}  ${(done / s).toFixed(2)} fps  ETA ${Math.ceil((s / done) * (todo.length - done))} s`); }
      }
    } finally { await browser.close(); }
  }));
}

async function stills(server) {
  const dir = path.join(BUILD, 'stills'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const { browser, page } = await open(server);
  try {
    const times = await page.evaluate(() => window.sceneInfo.stills || []);
    const list = (process.argv.includes('--at') ? process.argv[process.argv.indexOf('--at') + 1].split(',').map(Number) : times);
    for (const t of list) { const buf = await grab(page, Math.round(t * FPS) / FPS); fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.jpg`), buf); }
    console.log(`✔ ${list.length} stills in ${rel(dir)}`);
  } finally { await browser.close(); }
}

// Two thumbnail options rendered from the 3D scene (thumbnail mode of the page) → out/reaping-trials/<video>-thumb-option1.png / 2.png
async function thumbs(server) {
  for (const n of [1, 2]) {
    const { browser, page } = await openPage(server, `reaping-trials/episodes/${name}.html?thumb=${n}`, { width: W, height: H });
    try { const f = path.join(OUTD, `${name}-thumb-option${n}.png`); await page.screenshot({ path: f, type: 'png' }); console.log(`✔ ${rel(f)}`); }
    finally { await browser.close(); }
  }
}

// --cover 1|2: your chosen thumbnail → out/reaping-trials/<video>-thumb.png and <video>-with-cover.mp4
// (the normal MP4 + the thumbnail as the last 0.5 s, so you can pick that frame as the cover in the YouTube / Facebook app)
function cover(n) {
  const src = path.join(OUTD, `${name}-thumb-option${n}.png`), mp4 = path.join(OUTD, `${name}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`${rel(src)} not found: run  npm run render -- reaping-${name} --thumbs  first`);
  if (!fs.existsSync(mp4)) throw new Error(`${rel(mp4)} not found: render the video first`);
  const thumb = path.join(OUTD, `${name}-thumb.png`), out = path.join(OUTD, `${name}-with-cover.mp4`);
  fs.copyFileSync(src, thumb);
  ff(['-i', mp4, '-loop', '1', '-framerate', String(FPS), '-t', '0.5', '-i', thumb, '-f', 'lavfi', '-t', '0.5', '-i', 'anullsrc=r=44100:cl=stereo',
    '-filter_complex', `[0:v]setsar=1[a];[1:v]scale=${W}:${H},format=yuv420p,setsar=1[t];[a][0:a][t][2:a]concat=n=2:v=1:a=1[v][au]`,
    '-map', '[v]', '-map', '[au]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  console.log(`✔ ${rel(thumb)}\n✔ ${rel(out)}  (${probe(out).toFixed(2)} s: the last 0.5 s is the cover)`);
}

// The Blocktale Studios watermark (reaping-trials/brand/brand.json: opacity, size, position; "onRender": false turns it off; NOWM=1 skips it once)
function watermarkFilter() {
  const f = path.join(RTD, 'brand', 'watermark.png');
  let b; try { b = brandSettings(); } catch { return null; }
  if (!b.onRender || process.env.NOWM === '1' || !fs.existsSync(f)) return null;
  const w = Math.round(W * SCALE * b.width), x = Math.round(W * SCALE * b.x), y = Math.round(H * SCALE * b.y);
  return { input: f, filter: `[2:v]scale=${w}:-1,format=rgba,colorchannelmixer=aa=${b.opacity}[wm];[0:v][wm]overlay=${x}:${y}:format=auto,format=yuv420p[v]` };
}

function encode(framesDir, total, audio, out) {
  const wm = watermarkFilter();
  ff(['-framerate', String(FPS / STEP), '-i', path.join(framesDir, '%05d.jpg'), '-i', audio, ...(wm ? ['-i', wm.input, '-filter_complex', wm.filter, '-map', '[v]'] : ['-map', '0:v']), '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-t', String((total * STEP) / FPS), '-movflags', '+faststart', out]);
}

async function main() {
  if (!fs.existsSync(path.join(RTD, 'episodes', `${name}.html`))) throw new Error(`reaping-trials/episodes/${name}.html not found`);
  fs.mkdirSync(BUILD, { recursive: true }); fs.mkdirSync(OUTD, { recursive: true });
  const server = await startServer();
  try {
    if (has('--stills')) return await stills(server);
    if (has('--thumbs')) return await thumbs(server);
    if (has('--cover')) return cover(process.argv[process.argv.indexOf('--cover') + 1]);
    const { browser, page } = await open(server);
    const info = await page.evaluate(() => window.sceneInfo); await browser.close();
    const total = Math.round((info.duration * FPS) / STEP);
    console.log(`▶ ${name}: ${info.duration}s, ${total} frames`);
    const a = mix(name, info.duration);
    const outs = { mp4: path.join(OUTD, `${name}.mp4`), nv: path.join(OUTD, `${name}-no-voice.mp4`), sfx: path.join(OUTD, `${name}-sfx-only.mp4`), voice: path.join(OUTD, `${name}-voice.mp3`) };
    const framesDir = path.join(BUILD, PREVIEW ? 'preview-frames' : 'frames');
    if (has('--audio-only')) {
      for (const [src, dst] of [[a.mix, outs.mp4], [a.noVoice, outs.nv]]) { const tmp = dst + '.tmp.mp4'; ff(['-i', dst, '-i', src, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp]); fs.renameSync(tmp, dst); }
    } else {
      const sigFile = path.join(framesDir, '.signature'), sig = signature();
      if (has('--redo')) { for (const [x, y] of process.argv[process.argv.indexOf('--redo') + 1].split(',').map((r) => r.split('-').map(Number))) for (let f = x; f <= (y ?? x); f++) fs.rmSync(path.join(framesDir, `${String(f).padStart(5, '0')}.jpg`), { force: true }); fs.writeFileSync(sigFile, sig); }
      else if (!fs.existsSync(sigFile) || fs.readFileSync(sigFile, 'utf8') !== sig) { fs.rmSync(framesDir, { recursive: true, force: true }); fs.mkdirSync(framesDir, { recursive: true }); fs.writeFileSync(sigFile, sig); }
      await renderFrames(server, total, framesDir);
      if (PREVIEW) { const p = path.join(BUILD, 'preview.mp4'); encode(framesDir, total, a.mix, p); console.log(`✔ ${rel(p)}`); return; }
      encode(framesDir, total, a.mix, outs.mp4);
      encode(framesDir, total, a.noVoice, outs.nv);
    }
    ff(['-i', outs.nv, '-i', a.sfx, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outs.sfx]);   // same picture, effects only
    ff(['-i', a.voice, '-c:a', 'libmp3lame', '-b:a', '192k', outs.voice]);
    // the mixed soundtrack for the ▶ Play preview on your phone
    fs.mkdirSync(path.join(RTD, 'audio', 'mix'), { recursive: true });
    ff(['-i', a.mix, '-c:a', 'libmp3lame', '-b:a', '128k', path.join(RTD, 'audio', 'mix', `${name}_mix.mp3`)]);
    console.log(`\n✔ ${rel(outs.mp4)}  (${probe(outs.mp4).toFixed(2)} s, ${(fs.statSync(outs.mp4).size / 1048576).toFixed(1)} MB)`);
    console.log(`  ${rel(outs.nv)}  (music + sound effects, no narration)`);
    console.log(`  ${rel(outs.sfx)}  (sound effects only: no narration, no music)`);
    console.log(`  ${rel(outs.voice)}  (narration only, same timing)`);
    if (a.missing.length) console.log(`  missing sounds were skipped: ${a.missing.join(', ')}`);
  } finally { server.close(); }
}
main().catch((e) => { console.error(`\n✖ ${e.message}`); process.exit(1); });
