// tools/narrate.js: ElevenLabs voices for one Echo Breakers video, with word timestamps for the captions.
//   node echo-breakers/tools/narrate.js echo-breakers-full      (reads the VOICE + NARRATION blocks of episodes/<video>.html)
//
// MANY SPEAKERS: the === VOICE === block lists one voice per speaker ("who" in the NARRATION lines):
//   narrator   pNInz6obpgDQGcFmaJgB  rate=1.3                 Adam, sped up 1.3x by playing faster (the "rant" style)
//   hibiki     nPczCjzI2devNBz1zQrb  rate=0.891 fx=hibiki    an Echo: Japanese line, lower and with its own effect
//   options: rate=  speed factor (pitch moves with it, like a sped-up clip) · fx=  effect preset (FX below)
//            gain=  dB in the mix · stability= style= speed=  ElevenLabs settings for this voice (else voice.json)
// For each line it calls ElevenLabs text-to-speech "with-timestamps", trims the silence and stores:
//   echo-breakers/audio/voice/<video>/lNN_<hash>.mp3 + .json   one clip per line (CACHED: re-renders never spend credits again;
//                                                              two lines with the same text and voice share one recording)
//   echo-breakers/audio/voice/<video>_narration.json / .js     line + word timings (mixer / page captions)
// The key is read from ELEVENLABS_API_KEY (or a local .env) and is never written to any file or printed.
// Credit guard: characters sent are logged in echo-breakers/credits.json (the ElevenLabs account used for this series,
// not committed); it stops before MAX_CHARS (default 4000) and if no key is set it stops and generates nothing.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RT = path.join(ROOT, 'echo-breakers');
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

import { narrationLines, readBlock } from './blocks.js';

function ff(args) { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); }
const dur = (f) => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout);

const CREDITS = path.join(RT, 'credits.json');
const readCredits = () => { try { return JSON.parse(fs.readFileSync(CREDITS, 'utf8')); } catch { return { account: 'Echo Breakers ElevenLabs account', used: 0, log: [] }; } };

// Voice effect presets (applied after generation: no credits). Same chains as the Echo voice test you approved.
export const FX = {
  hibiki: 'aecho=0.8:0.6:40|80:0.25|0.15',                                                // armored echo
  kagerou: 'chorus=0.6:0.9:40|55:0.35|0.3:0.25|0.35:1.5|2.1,aecho=0.8:0.7:90:0.25',       // shimmering double voice
  omamori: 'aecho=0.8:0.5:30:0.15',                                                       // tiny and bright
  tsurara: 'highpass=f=130,aecho=0.8:0.6:70|140:0.25|0.12',                               // thin and cold
  shuen: 'aecho=0.8:0.85:180|360|540:0.5|0.35|0.22,apad=pad_dur=1.2',                      // huge hall echo
  think: 'lowpass=f=7000,aecho=0.8:0.72:55|110|170:0.32|0.22|0.14,apad=pad_dur=0.3',        // inner voice: soft reverb
};

async function tts(text, voiceId, s) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('No ELEVENLABS_API_KEY. Put it in .env (never commit it) or the environment. Nothing was generated.');
  const body = { text, model_id: s.model_id, voice_settings: { stability: s.stability, similarity_boost: s.similarity_boost, style: s.style, use_speaker_boost: s.use_speaker_boost, speed: s.speed } };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// character alignment → word times (seconds inside the clip). Japanese has no spaces: the whole line is one "word".
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

// the VOICE block → { who: { name, voice_id, rate, fx, gain, settings } }
function voices(html, cfg) {
  const out = {};
  for (const l of readBlock(html, 'VOICE')) {
    const [who, id, ...opts] = l.trim().split(/\s+/), o = Object.fromEntries(opts.map((kv) => kv.split('=')));
    const settings = { model_id: cfg.model_id, stability: cfg.stability, similarity_boost: cfg.similarity_boost, style: cfg.style, use_speaker_boost: cfg.use_speaker_boost, speed: cfg.speed };
    for (const k of ['stability', 'style', 'speed', 'similarity_boost']) if (o[k] !== undefined) settings[k] = parseFloat(o[k]);
    out[who] = { name: o.name || who, voice_id: id, rate: parseFloat(o.rate || o.rant || 1), fx: o.fx || null, gain: parseFloat(o.gain || 0), settings };
  }
  return out;
}

export async function narrate(name) {
  const page = path.join(RT, 'episodes', `${name}.html`);
  if (!fs.existsSync(page)) throw new Error(`${path.relative(ROOT, page)} not found`);
  const html = fs.readFileSync(page, 'utf8'), lines = narrationLines(html);
  if (!lines.length) throw new Error(`no === NARRATION === block in ${name}.html`);
  const cfg = JSON.parse(fs.readFileSync(path.join(RT, 'voice.json'), 'utf8')), V = voices(html, cfg);
  const fallback = V.narrator || Object.values(V)[0];
  if (!fallback) throw new Error('no === VOICE === block');
  const dir = path.join(RT, 'audio', 'voice', name); fs.mkdirSync(dir, { recursive: true });
  const credits = readCredits(), max = parseInt(process.env.MAX_CHARS || '4000', 10);
  const jobs = lines.map((l, i) => {
    const v = V[l.who] || fallback;
    if (!V[l.who]) console.log(`  ⚠ line ${i + 1}: no voice for "${l.who}", using ${fallback.name}`);
    const hash = crypto.createHash('sha1').update(JSON.stringify([l.text, v.voice_id, v.settings])).digest('hex').slice(0, 10);
    const base = path.join(dir, `l${String(i + 1).padStart(2, '0')}_${hash}`);
    return { ...l, i, voice: v, hash, mp3: base + '.mp3', meta: base + '.json' };
  });
  // reuse: a line that only moved, or a line said twice (same text + voice), keeps / shares its clip: no credits
  const wanted = new Set(jobs.map((j) => path.basename(j.mp3)));
  for (const j of jobs) if (!fs.existsSync(j.mp3)) {
    const old = fs.readdirSync(dir).find((f) => f.endsWith(`_${j.hash}.mp3`));
    if (!old) continue;
    const move = !wanted.has(old), oldJson = path.join(dir, old.replace(/\.mp3$/, '.json'));
    (move ? fs.renameSync : fs.copyFileSync)(path.join(dir, old), j.mp3);
    if (fs.existsSync(oldJson)) (move ? fs.renameSync : fs.copyFileSync)(oldJson, j.meta);
    console.log(`  line ${j.i + 1}: reusing ${old}`);
  }
  // lines said twice in this script: generate once
  const seen = new Map(), todo = [];
  for (const j of jobs) if (!fs.existsSync(j.mp3)) { if (seen.has(j.hash)) seen.get(j.hash).copies.push(j); else { seen.set(j.hash, j); j.copies = []; todo.push(j); } }
  const need = todo.reduce((n, j) => n + j.text.length, 0);
  console.log(`  ${jobs.length} lines · ${todo.length} to generate (${need} characters) · this account so far: ${credits.used}`);
  if (need && credits.used + need > max) throw new Error(`CREDIT GUARD: needs ${need} characters, echo-breakers/credits.json shows ${credits.used} used, MAX_CHARS is ${max}. Nothing was sent.`);
  if (process.env.DRY_RUN) { console.log('  DRY_RUN: nothing sent'); return null; }
  for (const j of todo) {
    const r = await tts(j.text, j.voice.voice_id, j.voice.settings);
    for (const t of [j, ...j.copies]) {
      fs.writeFileSync(t.mp3, Buffer.from(r.audio_base64, 'base64'));
      fs.writeFileSync(t.meta, JSON.stringify({ text: t.text, voice: t.voice.name, alignment: r.alignment }, null, 1));
    }
    credits.used += j.text.length; credits.log.push({ date: new Date().toISOString(), video: name, line: j.i + 1, who: j.who, chars: j.text.length });
    fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
    console.log(`  line ${j.i + 1} [${j.who}]: ${j.text.length} chars generated (this account: ${credits.used}/${max})${j.copies.length ? ` · also used for line ${j.copies.map((c) => c.i + 1).join(', ')}` : ''}`);
  }
  // remove clips of lines that no longer exist / changed
  const keep = new Set(jobs.flatMap((j) => [j.mp3, j.meta]));
  for (const f of fs.readdirSync(dir)) if (!keep.has(path.join(dir, f))) fs.rmSync(path.join(dir, f));

  // Post-processing (no API call): trim silence, shorten long pauses (max_pause), speed factor (rate), voice effect (fx).
  const maxPause = cfg.max_pause ?? 99;
  const pdir = path.join(RT, 'build', name, 'voice'); fs.mkdirSync(pdir, { recursive: true });
  const out = { video: name, voices: Object.fromEntries(Object.entries(V).map(([k, v]) => [k, `${v.name}${v.rate !== 1 ? ` ×${v.rate}` : ''}${v.fx ? ` fx=${v.fx}` : ''}`])), lines: [] };
  let prevEnd = 0;
  jobs.forEach((j, i) => {
    if (j.at === null) j.at = +(prevEnd + (j.gap || 0)).toFixed(3);            // "+gap" lines follow the previous line
    const { alignment } = JSON.parse(fs.readFileSync(j.meta, 'utf8'));
    const words = wordTimes(j.text, alignment), clipLen = dur(j.mp3), rate = j.voice.rate, fx = j.voice.fx ? FX[j.voice.fx] : '';
    if (j.voice.fx && !fx) throw new Error(`unknown fx "${j.voice.fx}" (have: ${Object.keys(FX).join(', ')})`);
    // segments of the raw clip to keep: [start, end], split where a pause is longer than maxPause
    const segs = [[Math.max(0, words[0].start - 0.04), 0]];
    for (let k = 0; k < words.length - 1; k++) {
      const gap = words[k + 1].start - words[k].end;
      if (gap > maxPause) { segs[segs.length - 1][1] = words[k].end + maxPause / 2; segs.push([words[k + 1].start - maxPause / 2, 0]); }
    }
    segs[segs.length - 1][1] = Math.min(clipLen, words[words.length - 1].end + 0.14);
    const mapT = (t) => { let acc = 0; for (const [a, b] of segs) { if (t <= b) return (acc + Math.max(0, t - a)) / rate; acc += b - a; } return acc / rate; };
    const tag = crypto.createHash('sha1').update(JSON.stringify([rate, fx, maxPause])).digest('hex').slice(0, 6);
    const wav = path.join(pdir, path.basename(j.mp3).replace('.mp3', `_${tag}.wav`));
    if (!fs.existsSync(wav)) {
      const parts = segs.map(([a, b], k) => `[0:a]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS[s${k}]`);
      const chain = ['aresample=44100', rate !== 1 ? `asetrate=${Math.round(44100 * rate)},aresample=44100` : '', fx].filter(Boolean).join(',');
      const fc = `${parts.join(';')};${segs.map((_, k) => `[s${k}]`).join('')}concat=n=${segs.length}:v=0:a=1,${chain}[o]`;
      ff(['-i', j.mp3, '-filter_complex', fc, '-map', '[o]', '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    }
    const keyWords = new Set(); j.raw.split(' ').forEach((w, k) => { if (w.includes('*')) keyWords.add(k); });
    const speechEnd = mapT(words[words.length - 1].end) + 0.1;                 // the voice itself (an echo tail may ring on after)
    const line = { at: j.at, who: j.who, label: j.label || undefined, text: j.text, en: j.en || undefined, gain: j.voice.gain || undefined,
      raw: path.relative(RT, j.mp3).split(path.sep).join('/'), clip: path.relative(ROOT, wav).split(path.sep).join('/'),
      start: j.at, end: +(j.at + speechEnd).toFixed(3), tail: +(j.at + dur(wav)).toFixed(3),
      words: words.map((w, k) => ({ w: w.w, key: keyWords.has(k) || undefined, start: +(j.at + mapT(w.start)).toFixed(3), end: +(j.at + mapT(w.end)).toFixed(3) })) };
    out.lines.push(line); prevEnd = line.end;
    const next = jobs[i + 1];
    const warn = next && next.at !== null && line.end > next.at - 0.03 ? `   ⚠ runs ${(line.end - next.at + 0.03).toFixed(2)}s into the next line` : '';
    console.log(`  ${String(i + 1).padStart(2)}  ${line.start.toFixed(2)}–${line.end.toFixed(2)}s  [${j.who}${j.label ? '@' + j.label : ''}] ${j.text}${j.en ? '  (' + j.en + ')' : ''}${warn}`);
  });
  fs.writeFileSync(path.join(RT, 'audio', 'voice', `${name}_narration.json`), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(RT, 'audio', 'voice', `${name}_narration.js`),
    `// generated by tools/narrate.js: line and word timings for the captions (do not edit by hand)\nwindow.RT_NARRATION = window.RT_NARRATION || {};\nwindow.RT_NARRATION[${JSON.stringify(name)}] = ${JSON.stringify(out)};\n`);
  console.log(`✔ timings → echo-breakers/audio/voice/${name}_narration.json / .js  ·  ends at ${prevEnd.toFixed(2)} s`);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Behind an HTTPS proxy (cloud sandbox) Node's fetch needs NODE_USE_ENV_PROXY=1: restart once with it.
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } });
    process.exit(r.status ?? 1);
  }
  const name = (process.argv[2] || 'echo-breakers-full').replace(/^eb-/, '');
  narrate(name).catch((e) => { console.error(`\n✖ ${e.message}`); process.exit(1); });
}
