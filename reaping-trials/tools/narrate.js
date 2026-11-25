// tools/narrate.js: ElevenLabs narration for one video, with word timestamps for the captions.
//   npm run narrate -- trailer          (reads the NARRATION block at the top of reaping-trials/episodes/trailer.html)
//
// For each line it calls ElevenLabs text-to-speech "with-timestamps" (voice + settings from reaping-trials/voice.json),
// trims the silence around the words and stores:
//   reaping-trials/audio/voice/<video>/lNN_<hash>.mp3 + .json   one clip per line (cached: unchanged lines cost nothing)
//   reaping-trials/audio/voice/<video>_narration.json            line + word timings (used by the mixer)
//   reaping-trials/audio/voice/<video>_narration.js              the same timings for the web page captions
// The key is read from ELEVENLABS_API_KEY (or a local .env) and is never written to any file or printed.
// Credit guard: characters sent are logged in credits.json (repo root, not committed); stops before MAX_CHARS (default 5000).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RT = path.join(ROOT, 'reaping-trials');
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

import { narrationLines, readBlock } from './blocks.js';

function ff(args) { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); }
const dur = (f) => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout);

const CREDITS = path.join(ROOT, 'credits.json');
const readCredits = () => { try { return JSON.parse(fs.readFileSync(CREDITS, 'utf8')); } catch { return { used: 0, log: [] }; } };

async function tts(text, voiceId, cfg) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('No ELEVENLABS_API_KEY. Put it in .env (never commit it) or the environment. Nothing was generated.');
  const body = { text, model_id: cfg.model_id, voice_settings: { stability: cfg.stability, similarity_boost: cfg.similarity_boost, style: cfg.style, use_speaker_boost: cfg.use_speaker_boost, speed: cfg.speed } };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// character alignment → word times (seconds inside the clip)
function wordTimes(text, al) {
  const ch = al.characters || [], st = al.character_start_times_seconds, en = al.character_end_times_seconds;
  let pos = 0; const joined = ch.join('');
  if (joined !== text) pos = Math.max(0, joined.indexOf(text));
  return text.split(' ').map((w) => {
    const i0 = pos, i1 = pos + w.length - 1; pos += w.length + 1;
    const core = [...w].map((c, k) => (/[\p{L}\p{N}]/u.test(c) ? i0 + k : -1)).filter((k) => k >= 0);
    return { w, start: st[core[0] ?? i0] ?? 0, end: en[core[core.length - 1] ?? i1] ?? 0 };
  });
}

export async function narrate(name) {
  const page = path.join(RT, 'episodes', `${name}.html`);
  if (!fs.existsSync(page)) throw new Error(`${path.relative(ROOT, page)} not found`);
  const html = fs.readFileSync(page, 'utf8'), lines = narrationLines(html);
  if (!lines.length) throw new Error(`no === NARRATION === block in ${name}.html`);
  const cfg = JSON.parse(fs.readFileSync(path.join(RT, 'voice.json'), 'utf8'));
  // the scene file may pick its own narrator:  === VOICE ===  <name> <voice_id>  === END ===   (otherwise voice.json)
  const vb = readBlock(html, 'VOICE')[0], narrator = vb ? { name: vb.trim().split(/\s+/)[0], voice_id: vb.trim().split(/\s+/)[1] } : cfg.narrator;
  const dir = path.join(RT, 'audio', 'voice', name); fs.mkdirSync(dir, { recursive: true });
  const credits = readCredits(), max = parseInt(process.env.MAX_CHARS || '5000', 10);
  const jobs = lines.map((l, i) => {
    const v = cfg.voices[l.who] || narrator;
    const hash = crypto.createHash('sha1').update(JSON.stringify([l.text, v.voice_id, cfg.model_id, cfg.stability, cfg.similarity_boost, cfg.style, cfg.speed])).digest('hex').slice(0, 10);
    const base = path.join(dir, `l${String(i + 1).padStart(2, '0')}_${hash}`);
    return { ...l, i, voice: v, mp3: base + '.mp3', meta: base + '.json' };
  });
  // a line that only moved (same text and voice, new line number, e.g. after inserting a line) keeps its clip: no credits
  const wanted = new Set(jobs.map((j) => path.basename(j.mp3)));
  for (const j of jobs) if (!fs.existsSync(j.mp3)) {
    const h = path.basename(j.mp3, '.mp3').split('_').pop(), old = fs.readdirSync(dir).find((f) => f.endsWith(`_${h}.mp3`));
    if (!old) continue;
    const move = !wanted.has(old), oldJson = path.join(dir, old.replace(/\.mp3$/, '.json'));
    (move ? fs.renameSync : fs.copyFileSync)(path.join(dir, old), j.mp3);
    if (fs.existsSync(oldJson)) (move ? fs.renameSync : fs.copyFileSync)(oldJson, j.meta);
    console.log(`  line ${j.i + 1}: reusing ${old}`);
  }
  const todo = jobs.filter((j) => !fs.existsSync(j.mp3));
  const need = todo.reduce((n, j) => n + j.text.length, 0);
  if (need && credits.used + need > max) throw new Error(`CREDIT GUARD: needs ${need} characters, credits.json shows ${credits.used} used, MAX_CHARS is ${max}. Nothing was sent.`);
  for (const j of todo) {
    const r = await tts(j.text, j.voice.voice_id, cfg);
    fs.writeFileSync(j.mp3, Buffer.from(r.audio_base64, 'base64'));
    fs.writeFileSync(j.meta, JSON.stringify({ text: j.text, voice: j.voice.name, alignment: r.alignment }, null, 1));
    credits.used += j.text.length; credits.log.push({ date: new Date().toISOString(), video: name, line: j.i + 1, chars: j.text.length });
    fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
    console.log(`  line ${j.i + 1}: ${j.text.length} chars generated (credits used: ${credits.used}/${max})`);
  }
  // remove clips of lines that no longer exist / changed
  const keep = new Set(jobs.flatMap((j) => [j.mp3, j.meta]));
  for (const f of fs.readdirSync(dir)) if (!keep.has(path.join(dir, f))) fs.rmSync(path.join(dir, f));

  // Post-processing (no API call): trim silence, shorten long pauses inside a line (max_pause), speed up (tempo, pitch kept).
  const tempo = cfg.tempo || 1, maxPause = cfg.max_pause ?? 99;
  const pdir = path.join(ROOT, 'reaping-trials', 'build', name, 'voice'); fs.mkdirSync(pdir, { recursive: true });
  const out = { video: name, voice: narrator.name, tempo, lines: [] };
  let prevEnd = 0;
  jobs.forEach((j, i) => {
    if (j.at === null) j.at = +(prevEnd + (j.gap || 0)).toFixed(3);            // "+gap" lines follow the previous line
    const { alignment } = JSON.parse(fs.readFileSync(j.meta, 'utf8'));
    const words = wordTimes(j.text, alignment), clipLen = dur(j.mp3);
    // segments of the raw clip to keep: [start, end], split where a pause is longer than maxPause
    const segs = [[Math.max(0, words[0].start - 0.04), 0]];
    for (let k = 0; k < words.length - 1; k++) {
      const gap = words[k + 1].start - words[k].end;
      if (gap > maxPause) { segs[segs.length - 1][1] = words[k].end + maxPause / 2; segs.push([words[k + 1].start - maxPause / 2, 0]); }
    }
    segs[segs.length - 1][1] = Math.min(clipLen, words[words.length - 1].end + 0.14);
    const mapT = (t) => { let acc = 0; for (const [a, b] of segs) { if (t <= b) return (acc + Math.max(0, t - a)) / tempo; acc += b - a; } return acc / tempo; };
    const wav = path.join(pdir, path.basename(j.mp3).replace('.mp3', `_t${tempo}_p${maxPause}.wav`));
    if (!fs.existsSync(wav)) {
      const parts = segs.map(([a, b], k) => `[0:a]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS[s${k}]`);
      const fc = `${parts.join(';')};${segs.map((_, k) => `[s${k}]`).join('')}concat=n=${segs.length}:v=0:a=1${tempo !== 1 ? `,atempo=${tempo}` : ''}[o]`;
      ff(['-i', j.mp3, '-filter_complex', fc, '-map', '[o]', '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    }
    const keyWords = new Set(); j.raw.split(' ').forEach((w, k) => { if (w.includes('*')) keyWords.add(k); });
    // word⬆ in the script: the voice rises on that word (pitch bend on the same recording, formants kept, timing unchanged)
    const riseWords = []; j.raw.split(' ').forEach((w, k) => { if (/[⬆↑]/.test(w) && words[k]) riseWords.push(k); });
    let clipWav = wav;
    if (riseWords.length) {
      const st = cfg.rise ?? 6, rw = wav.replace('.wav', `_rise${riseWords.join('-')}_${st}${(cfg.rise_formant || 'shifted')[0]}.wav`);
      if (!fs.existsSync(rw)) {
        const cmds = [];
        const spans = []; for (const k of riseWords) { const l = spans[spans.length - 1]; if (l && l[1] === k - 1) l[1] = k; else spans.push([k, k]); }   // "In⬆ this⬆ town⬆" = one rise
        for (const [k0, k] of spans) {
          const a = mapT(words[k0].start), b = mapT(words[k].end), n = Math.max(4, Math.round((b - a) / 0.02));
          for (let q = 0; q <= n; q++) cmds.push(`${(a + ((b - a) * q) / n).toFixed(3)} rubberband@rb pitch ${(2 ** ((st * (q / n) ** 1.3) / 12)).toFixed(4)};`);
          const back = words[k + 1] ? Math.min(b + 0.12, (b + mapT(words[k + 1].start)) / 2) : b + 0.12;
          cmds.push(`${back.toFixed(3)} rubberband@rb pitch 1.0;`);
        }
        const cf = rw.replace('.wav', '.cmd'); fs.writeFileSync(cf, cmds.join('\n') + '\n');
        ff(['-i', wav, '-af', `asendcmd=f=${cf},rubberband@rb=pitch=1.0:formant=${cfg.rise_formant || 'shifted'}:pitchq=quality:transients=smooth`, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', rw]);
      }
      clipWav = rw;
    }
    const len = dur(wav);
    const line = { at: j.at, who: j.who, text: j.text, raw: path.relative(RT, j.mp3).split(path.sep).join('/'), clip: path.relative(ROOT, clipWav).split(path.sep).join('/'),
      start: j.at, end: +(j.at + len).toFixed(3),
      words: words.map((w, k) => ({ w: w.w, key: keyWords.has(k) || undefined, start: +(j.at + mapT(w.start)).toFixed(3), end: +(j.at + mapT(w.end)).toFixed(3) })) };
    out.lines.push(line); prevEnd = line.end;
    const next = jobs[i + 1];
    const warn = next && next.at !== null && line.end > next.at - 0.03 ? `   ⚠ runs ${(line.end - next.at + 0.03).toFixed(2)}s into the next line: move the next line later or shorten this one` : '';
    console.log(`  ${String(i + 1).padStart(2)}  ${line.start.toFixed(2)}–${line.end.toFixed(2)}s  [${j.who}] ${j.text}${warn}`);
  });
  fs.writeFileSync(path.join(RT, 'audio', 'voice', `${name}_narration.json`), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(RT, 'audio', 'voice', `${name}_narration.js`),
    `// generated by tools/narrate.js: line and word timings for the captions (do not edit by hand)\nwindow.RT_NARRATION = window.RT_NARRATION || {};\nwindow.RT_NARRATION[${JSON.stringify(name)}] = ${JSON.stringify(out)};\n`);
  console.log(`✔ narration timings → reaping-trials/audio/voice/${name}_narration.json / .js  (voice: ${narrator.name})`);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Behind an HTTPS proxy (cloud sandbox) Node's fetch needs NODE_USE_ENV_PROXY=1: restart once with it.
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } });
    process.exit(r.status ?? 1);
  }
  const name = (process.argv[2] || 'trailer').replace(/^reaping-/, '');
  narrate(name).catch((e) => { console.error(`\n✖ ${e.message}`); process.exit(1); });
}
