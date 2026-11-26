// tools/mix.js: builds the soundtrack of one video from the CUE SHEET + NARRATION blocks at the top of its scene file
// (adapted from roblox-short/audio.js). Called by render.js; can also run alone:  node reaping-trials/tools/mix.js trailer
//
// Layers: narration (loudest) · music (volume from the cue sheet, ducked while someone talks) · sound effects
// (each level-matched to the narration, then × its volume) → limiter → loudness-normalized to −14 LUFS (phones).
// Outputs in reaping-trials/build/<video>/audio/: mix.wav, no-voice.wav (music + effects), voice.wav (narration only)
// Missing sound files are skipped and listed; the render still happens.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readBlock } from './blocks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RT = path.join(ROOT, 'echo-breakers');
const SR = 44100;

function ff(args) { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr}`); return r; }
export const probe = (f) => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout);

// decoded mono PCM → 10 ms RMS envelope in dB
function envelope(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
  const i16 = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1), n = 220, out = [];
  for (let i = 0; i + n <= i16.length; i += n) { let s = 0; for (let k = i; k < i + n; k++) s += (i16[k] / 32768) ** 2; out.push(10 * Math.log10(s / n + 1e-12)); }
  return out;
}
// onset (first sound), peak, end (last moment within 30 dB of the peak) and the RMS of the loud part
const sfxInfo = new Map();
function analyze(file) {
  if (sfxInfo.has(file)) return sfxInfo.get(file);
  const env = envelope(file), pk = Math.max(...env), idx = env.indexOf(pk);
  const onset = Math.max(0, env.findIndex((x) => x > pk - 30));
  let end = env.length - 1; while (end > 0 && env[end] < pk - 30) end--;
  const loud = env.filter((x) => x > pk - 20), rms = 10 * Math.log10(loud.reduce((s, x) => s + 10 ** (x / 10), 0) / loud.length);
  const info = { onset: onset * 0.01, peak: idx * 0.01, end: (end + 1) * 0.01, rms, len: env.length * 0.01 };
  sfxInfo.set(file, info); return info;
}
// integrated loudness (LUFS) via loudnorm's measurement pass
function lufs(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /\{[\s\S]*?"input_i"\s*:\s*"(-?[\d.]+|-inf)"[\s\S]*?\}/.exec(r.stderr);
  return m && m[1] !== '-inf' ? parseFloat(m[1]) : -70;
}
function findSound(name) {
  if (name.startsWith('music:')) { const n = name.slice(6); for (const ext of ['mp3', 'wav', 'ogg', 'm4a']) { const f = path.join(RT, 'audio', 'music', `${n}.${ext}`); if (fs.existsSync(f)) return f; } return null; }
  for (const ext of ['mp3', 'wav', 'ogg', 'm4a']) { const f = path.join(RT, 'audio', 'sfx', `${name}.${ext}`); if (fs.existsSync(f)) return f; }
  return null;
}
// A time in the CUE SHEET (and SHORTS CUTS) is seconds (12.5) or a NARRATION label: "what" / "what.s" = that line's start,
// "what.e" = its end, with an optional offset: "what.e+0.4", "silent.s-1.2". Labels keep sounds glued to the lines
// even when a voice is re-recorded with a different length.
export function resolveTime(tok, narr) {
  if (/^-?[\d.]+$/.test(tok)) return parseFloat(tok);
  const m = /^([A-Za-z_]\w*)(?:\.([se]))?([+-][\d.]+)?$/.exec(tok);
  const line = m && narr.lines.find((l) => l.label === m[1]);
  if (!line) throw new Error(`unknown time "${tok}" (not a number or a NARRATION label)`);
  return +((m[2] === 'e' ? line.end : line.start) + parseFloat(m[3] || 0)).toFixed(3);
}
export function cueSheet(html, narr) {
  return readBlock(html, 'CUE SHEET').map((l) => /^\s*(\S+)\s+(\S+)\s+([\d.]+)\s*(.*)$/.exec(l)).filter(Boolean).map((m) => {
    const opts = {}; for (const tok of m[4].split(/\s+/).filter(Boolean)) { const [k, v] = tok.split('='); opts[k] = v === undefined ? true : v; }
    for (const k of ['mute', 'fadeout']) if (typeof opts[k] === 'string') opts[k] = opts[k].split('~').map((x) => resolveTime(x, narr)).join('-');   // ranges: a~b (labels allowed)
    return { t: resolveTime(m[1], narr), sound: m[2], vol: parseFloat(m[3]), opts };
  });
}
const range = (s) => s.split('-').map(Number);

export function mix(name, duration) {
  const html = fs.readFileSync(path.join(RT, 'episodes', `${name}.html`), 'utf8');
  const narr = JSON.parse(fs.readFileSync(path.join(RT, 'audio', 'voice', `${name}_narration.json`), 'utf8'));
  const cues = cueSheet(html, narr);
  const dir = path.join(RT, 'build', name, 'audio'); fs.mkdirSync(dir, { recursive: true });
  const fmt = `aformat=sample_rates=${SR}:channel_layouts=stereo`, D = duration.toFixed(3);
  const missing = [];

  // 1) narration track: every clip is first matched to the same loudness (different voices and effects come out at
  //    different levels), then its own gain from the VOICE block (e.g. thoughts −3 dB), then the whole track → −16 LUFS
  const vin = [], vf = [];
  narr.lines.forEach((l, i) => {
    const g = -16 - lufs(path.join(ROOT, l.clip)) + (l.gain || 0);
    vin.push('-i', path.join(ROOT, l.clip)); vf.push(`[${i}:a]${fmt},volume=${g.toFixed(2)}dB,adelay=${Math.round(l.at * 1000)}:all=1[v${i}]`);
  });
  const voiceRaw = path.join(dir, 'voice_raw.wav');
  // voice.json "pitch": semitones up/down; asetrate changes pitch AND speed, atempo puts the speed back (timing stays exact)
  const semis = parseFloat(JSON.parse(fs.readFileSync(path.join(RT, 'voice.json'), 'utf8')).pitch || 0), k = 2 ** (semis / 12);
  const pitch = Math.abs(semis) > 0.01 ? `,asetrate=${Math.round(SR * k)},aresample=${SR},atempo=${(1 / k).toFixed(6)}` : '';
  ff([...vin, '-filter_complex', `${vf.join(';')};${narr.lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${narr.lines.length}:normalize=0:duration=longest${pitch},apad=whole_dur=${D},atrim=0:${D}[o]`, '-map', '[o]', '-c:a', 'pcm_s16le', voiceRaw]);
  const vGain = -16 - lufs(voiceRaw);
  const voice = path.join(dir, 'voice_n.wav');
  ff(['-i', voiceRaw, '-af', `volume=${vGain.toFixed(2)}dB`, '-c:a', 'pcm_s16le', voice]);
  const voiceRms = (() => { const e = envelope(voice).filter((x) => x > -40); return 10 * Math.log10(e.reduce((s, x) => s + 10 ** (x / 10), 0) / Math.max(1, e.length)); })();

  // 2) music + effects
  const inputs = ['-i', voice], filters = [], beds = [], placed = [], isMusic = [];
  const nIn = () => inputs.filter((x) => x === '-i').length;
  for (const c of cues) {
    const file = findSound(c.sound);
    if (!file) { missing.push(c.sound); continue; }
    const o = c.opts, k = beds.length;
    if (c.sound.startsWith('music:')) {
      const from = parseFloat(o.from || 0), segLen = duration - c.t;
      const seg = path.join(dir, `music_seg_${k}.wav`);
      ff(['-ss', String(from), '-t', segLen.toFixed(3), '-i', file, '-af', fmt, '-c:a', 'pcm_s16le', seg]);
      const g = 10 ** ((-16 - lufs(seg)) / 20) * c.vol, duck = parseFloat(o.duck || 1);
      // duck under every narration line (smooth 0.12 s in, 0.3 s out); mute ranges cut the music completely
      const w = narr.lines.map((l) => `clip((t-${(l.start - c.t - 0.12).toFixed(3)})/0.12,0,1)*clip((${((l.tail || l.end) - c.t + 0.3).toFixed(3)}-t)/0.3,0,1)`);
      let expr = w.length ? `(1-${(1 - duck).toFixed(3)}*${w.reduce((a, b) => `max(${a},${b})`)})` : '1';
      for (const m of [].concat(o.mute ? [o.mute] : [])) { const [a, b] = range(m); expr += `*(1-clip((t-${(a - c.t).toFixed(3)})/0.04,0,1)*clip((${(b - c.t).toFixed(3)}-t)/0.25,0,1))`; }   // (comes back over 0.25 s)
      let af = `${fmt},volume=${g.toFixed(4)},volume='${expr}':eval=frame`;
      if (o.fadein) af += `,afade=t=in:d=${o.fadein}`;
      if (o.fadeout) { const [a, b] = range(o.fadeout); af += `,afade=t=out:st=${(a - c.t).toFixed(3)}:d=${(b - a).toFixed(3)}`; }
      inputs.push('-i', seg); filters.push(`[${nIn() - 1}:a]${af},adelay=${Math.round(c.t * 1000)}:all=1[b${k}]`); beds.push(`[b${k}]`); isMusic.push(true);
      placed.push({ t: c.t, sound: c.sound, from, gain: +(20 * Math.log10(g)).toFixed(1) });
      continue;
    }
    const a = analyze(file), align = o.align || 'onset';
    let from = Math.max(0, a.onset - 0.02), len = a.end - from + 0.05, at = c.t;
    if (o.dur && !o.loop) len = Math.min(len, parseFloat(o.dur));
    if (align === 'peak') at = c.t - (a.peak - from);
    if (align === 'end') { if (o.dur) { from = Math.max(from, a.end - parseFloat(o.dur)); } len = a.end - from; at = c.t - len; }
    if (o.loop) len = parseFloat(o.dur || len);
    if (at < 0) { from += -at; len += at; at = 0; }
    if (at >= duration || len <= 0.02) continue;
    len = Math.min(len, duration - at);
    const gain = 10 ** ((voiceRms - a.rms) / 20) * c.vol;
    const fi = parseFloat(o.fadein || 0.008), fo = Math.min(parseFloat(o.fadeout || 0.12), len / 2);
    inputs.push(...(o.loop ? ['-stream_loop', '-1'] : []), '-ss', from.toFixed(3), '-i', file);
    filters.push(`[${nIn() - 1}:a]${fmt},atrim=0:${len.toFixed(3)},asetpts=PTS-STARTPTS,volume=${gain.toFixed(4)},afade=t=in:d=${fi},afade=t=out:st=${Math.max(0, len - fo).toFixed(3)}:d=${fo.toFixed(3)},adelay=${Math.round(at * 1000)}:all=1[b${k}]`);
    beds.push(`[b${k}]`); isMusic.push(false);
    placed.push({ t: c.t, sound: c.sound, start: +at.toFixed(3), len: +len.toFixed(3), gain: +(20 * Math.log10(gain)).toFixed(1) });
  }
  // 3) pre-mixes: full and without the voice
  const pre = path.join(dir, 'pre_full.wav'), preNV = path.join(dir, 'pre_novoice.wav');
  const bedMix = beds.length ? `${beds.join('')}amix=inputs=${beds.length}:normalize=0:duration=longest,apad=whole_dur=${D},atrim=0:${D}` : `anullsrc=r=${SR}:cl=stereo,atrim=0:${D}`;
  ff([...inputs, '-filter_complex', `${filters.join(';')}${filters.length ? ';' : ''}${bedMix},asplit=2[bA][bB];[0:a]${fmt}[vA];[vA][bA]amix=inputs=2:normalize=0:duration=first[full];[bB]anull[nv]`,
    '-map', '[full]', '-t', D, '-c:a', 'pcm_s16le', pre, '-map', '[nv]', '-t', D, '-c:a', 'pcm_s16le', preNV]);
  // 4) one shared gain to −14 LUFS + a limiter, so the three files line up exactly in an editor
  const gain = -14 - lufs(pre), lim = `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=0:attack=3:release=60`;
  const out = { mix: path.join(dir, 'mix.wav'), noVoice: path.join(dir, 'no-voice.wav'), voice: path.join(dir, 'voice.wav'), sfx: path.join(dir, 'sfx-only.wav'), noMusic: path.join(dir, 'no-music.wav') };
  ff(['-i', pre, '-af', lim, '-c:a', 'pcm_s16le', out.mix]);
  ff(['-i', preNV, '-af', lim, '-c:a', 'pcm_s16le', out.noVoice]);
  ff(['-i', voice, '-af', `${fmt},${lim}`, '-c:a', 'pcm_s16le', out.voice]);
  // 5) sound effects only (no narration, no music), same level as the other files
  const fx = beds.map((b, i) => (isMusic[i] ? null : i)).filter((i) => i !== null), preFx = path.join(dir, 'pre_sfx.wav');
  const fxMix = fx.length ? `${fx.map((i) => filters[i]).join(';')};${fx.map((i) => beds[i]).join('')}amix=inputs=${fx.length}:normalize=0:duration=longest,apad=whole_dur=${D},atrim=0:${D}[fx]` : `anullsrc=r=${SR}:cl=stereo,atrim=0:${D}[fx]`;
  ff([...inputs, '-filter_complex', fxMix, '-map', '[fx]', '-t', D, '-c:a', 'pcm_s16le', preFx]);
  ff(['-i', preFx, '-af', lim, '-c:a', 'pcm_s16le', out.sfx]);
  // 6) narration + sound effects, no music
  ff(['-i', voice, '-i', preFx, '-filter_complex', `[0:a]${fmt}[v];[1:a]${fmt}[f];[v][f]amix=inputs=2:normalize=0:duration=first,${lim}[o]`, '-map', '[o]', '-t', D, '-c:a', 'pcm_s16le', out.noMusic]);
  fs.writeFileSync(path.join(dir, 'placed.json'), JSON.stringify(placed, null, 1));
  console.log(`  audio: ${placed.length} sounds placed · narration ${narr.lines.length} lines (${narr.voice}) · final ${lufs(out.mix).toFixed(1)} LUFS`);
  if (missing.length) console.log(`  ⚠ missing sound files (skipped): ${[...new Set(missing)].join(', ')}`);
  return { ...out, missing: [...new Set(missing)], placed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = (process.argv[2] || 'trailer').replace(/^eb-/, ''), dur = parseFloat(process.argv[3] || '20');
  try { console.log(mix(name, dur)); } catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
}
