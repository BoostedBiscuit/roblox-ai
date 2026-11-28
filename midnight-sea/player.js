// =====================================================================================
// player.js: everything around the 3D picture (THE MIDNIGHT SEA fork: one-word lowercase yellow captions, o.render hook)
//   · the 9:16 stage that fits the phone screen (from the test scene)
//   · the "▶ Play" / "↺ Replay" menu, the live preview clock and the music/voice playback in live mode
//   · RENDER MODE (?render=1): time comes from the renderer (frame ÷ 30), never the clock; no menu, no timer
//   · big word-by-word narrator captions (Roblox storytime style) from the ElevenLabs word timings
//   · smaller speaker subtitles (name above) for characters' own lines
//   · impact texts (e.g. "EVERY YEAR…"), the title card, black dips and white flashes
//   · a small timer in live preview only (to line up music), never in the rendered MP4
//
//   RT.player.start({ name, duration, renderer, scene, camera, frame(t), narration, speakers, hooks, title,
//                     black(t), white(t), noCaptions: [[t0, t1]], audio, menu: { title, sub } })
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, clamp = RT.clamp;
  const q = new URLSearchParams(location.search);
  const RENDER = q.has('render'), THUMB = q.get('thumb');

  const CSS = `
  html,body{margin:0;height:100%;background:#000;overflow:hidden;-webkit-tap-highlight-color:transparent;}
  #stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#000;overflow:hidden;--u:4px;}
  #stage canvas{display:block;}
  .ov{position:absolute;inset:0;pointer-events:none;}
  #black{background:#000;opacity:0;} #white{background:#fff;opacity:0;}
  /* big narrator captions: one word at a time, ~62% down the frame (clear of the Reels/Shorts buttons) */
  #cap{position:absolute;left:4%;right:4%;top:57%;transform:translateY(-50%);text-align:center;pointer-events:none;
       font-family:Montserrat,'Arial Black',Impact,sans-serif;font-weight:900;font-size:calc(var(--u)*8.8);line-height:1;letter-spacing:.005em;
       color:#ffe45c;-webkit-text-stroke:calc(var(--u)*1.05) #000;paint-order:stroke fill;
       text-shadow:0 calc(var(--u)*0.7) 0 #000,0 calc(var(--u)*1.2) calc(var(--u)*1.6) rgba(0,0,0,.65);white-space:nowrap;}
  #cap span{display:inline-block;transform-origin:50% 60%;}
  #cap .key{color:#ffe45c;}
  /* speaker subtitles (a character's own line): smaller, name above */
  #sub{position:absolute;left:6%;right:6%;top:71%;text-align:center;pointer-events:none;opacity:0;transform-origin:50% 50%;}
  #sub .spk{display:inline-block;font:700 calc(var(--u)*4.4) Inter,system-ui,sans-serif;letter-spacing:.16em;color:#1a1208;background:#ffcf7a;
       padding:calc(var(--u)*.6) calc(var(--u)*2);border-radius:calc(var(--u)*1);margin-bottom:calc(var(--u)*1.4);}
  #sub .txt{transform-origin:50% 50%;font:900 calc(var(--u)*10.5) Montserrat,'Arial Black',sans-serif;color:#fff;line-height:1.1;
       -webkit-text-stroke:calc(var(--u)*.9) #000;paint-order:stroke fill;text-shadow:0 calc(var(--u)*.6) 0 #000;}
  /* impact texts ("EVERY YEAR…") */
  .hook{position:absolute;left:5%;right:5%;top:45%;transform:translateY(-50%);text-align:center;pointer-events:none;opacity:0;
       font-family:Cinzel,Georgia,serif;font-weight:800;font-size:calc(var(--u)*11);line-height:1.05;letter-spacing:.05em;color:#f3d39a;
       text-shadow:0 0 calc(var(--u)*5) rgba(255,170,80,.45),0 calc(var(--u)*.5) calc(var(--u)*1.5) #000;}
  /* title card */
  #title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;pointer-events:none;}
  #title .t1{font-family:Cinzel,Georgia,serif;font-weight:800;font-size:calc(var(--u)*13.5);line-height:1.0;letter-spacing:.05em;color:#f3d39a;
       text-shadow:0 0 calc(var(--u)*6) rgba(255,170,80,.55),0 calc(var(--u)*.6) calc(var(--u)*1.2) #000;}
  #title .t2{margin-top:calc(var(--u)*5);font:700 calc(var(--u)*4.4) Inter,system-ui,sans-serif;letter-spacing:.28em;color:#fff;text-shadow:0 2px 8px #000;}
  #title .t3{margin-top:calc(var(--u)*14);font:800 calc(var(--u)*6.4) Montserrat,'Arial Black',sans-serif;color:#ffd23f;
       -webkit-text-stroke:calc(var(--u)*.6) #000;paint-order:stroke fill;}
  #title > div{transform-origin:50% 50%;}
  #menu{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.55);
       color:#fff;text-align:center;font-family:Inter,system-ui,sans-serif;padding:0 8%;box-sizing:border-box;}
  #menu h1{font-family:Cinzel,Georgia,serif;font-weight:800;font-size:calc(var(--u)*8);margin:0 0 calc(var(--u)*2);color:#f3d39a;line-height:1.1;}
  #menu p{font-size:calc(var(--u)*3.6);opacity:.88;margin:0 0 calc(var(--u)*6);line-height:1.45;}
  #play{font:700 calc(var(--u)*4.8) Inter,system-ui,sans-serif;color:#1a1208;background:#f3c66e;border:0;border-radius:999px;
       padding:calc(var(--u)*3) calc(var(--u)*9);cursor:pointer;box-shadow:0 8px 30px rgba(243,198,110,.35);}
  #play:focus-visible{outline:3px solid #fff;outline-offset:3px;}
  #timer{position:absolute;left:calc(var(--u)*3);top:calc(var(--u)*3);font:700 calc(var(--u)*3.2) ui-monospace,Menlo,monospace;color:#7CFC00;
       background:rgba(0,0,0,.55);padding:calc(var(--u)*.6) calc(var(--u)*1.5);border-radius:calc(var(--u)*1);pointer-events:none;}
  .hidden{display:none !important;}`;

  // word captions: one word at a time; 1–2 letter words join the next word ("MY TOWN", "OF US")
  function captionChunks(narr, speakers) {
    const out = [];
    for (const line of (narr && narr.lines) || []) {
      if (speakers[line.who]) continue;               // character lines use the speaker subtitle instead
      const ws = line.words;
      for (let i = 0; i < ws.length; i++) {
        const clean = (w) => w.w.replace(/^[…."'“]+/, '').replace(/[.,…;:?"”]+$/, '');   // (a narrator's "?" is heard, not shown)
        let text = clean(ws[i]), key = !!ws[i].key, j = i;
        if (text.replace(/[^\p{L}\p{N}]/gu, '').length <= 2 && !/[.,!?…;:]$/.test(ws[i].w) && ws[i + 1] && (text + clean(ws[i + 1])).length <= 9) { j = i + 1; text += ' ' + clean(ws[j]); key = key || !!ws[j].key; }
        out.push({ t0: ws[i].start - 0.04, text: text.toLowerCase(), key, lineEnd: line.end });
        i = j;
      }
    }
    out.forEach((c, k) => { c.t1 = Math.min(out[k + 1] ? out[k + 1].t0 : 1e9, c.lineEnd + 0.3); });
    return out;
  }
  // speaker subtitles: a character's line is shown a few words at a time (at most 2 lines on screen),
  // broken at punctuation first, then into even parts; each piece appears when its first word is spoken
  const SUB_MAX = 22;                                   // characters per piece (about 2 lines)
  function subtitlePieces(line) {
    const ws = line.words || [];
    if (!ws.length) return [{ t0: line.start, text: line.text }];
    const len = (p) => p.map((w) => w.w).join(' ').length;
    let parts = [], cur = [];
    ws.forEach((w, i) => { cur.push(w); if (/[.,!?…;:]["”]?$/.test(w.w) || i === ws.length - 1) { parts.push(cur); cur = []; } });
    const weak = /^(of|in|on|at|to|the|a|an|and|or|that|for|with|from|my|your)$/i;   // a piece should not end on these
    const best = (p, k) => {                            // split p into k pieces: shortest longest piece, no weak endings
      if (k === 1) return { cost: len(p), parts: [p] };
      let top = null;
      for (let i = 1; i <= p.length - k + 1; i++) {
        const head = p.slice(0, i), rest = best(p.slice(i), k - 1);
        const cost = Math.max(len(head) + (weak.test(head[head.length - 1].w) ? 6 : 0), rest.cost);
        if (!top || cost < top.cost) top = { cost, parts: [head, ...rest.parts] };
      }
      return top;
    };
    parts = parts.flatMap((p) => { const k = Math.min(p.length, Math.ceil(len(p) / SUB_MAX)); return k <= 1 ? [p] : best(p, k).parts; });
    for (let i = 0; i < parts.length; i++) {            // a very short piece joins its neighbour if it fits
      if (len(parts[i]) >= 10 || parts.length < 2) continue;
      const prev = parts[i - 1], next = parts[i + 1], prevEnd = prev && prev[prev.length - 1].w;
      if (prev && !/[.!?]["”]?$/.test(prevEnd) && len(prev.concat(parts[i])) <= SUB_MAX) { parts[i - 1] = prev.concat(parts[i]); parts.splice(i, 1); i--; }
      else if (next && len(parts[i].concat(next)) <= SUB_MAX) { parts[i] = parts[i].concat(next); parts.splice(i + 1, 1); }
    }
    return parts.map((p) => ({ t0: p[0].start, text: p.map((w) => w.w).join(' ') }));
  }
  const impact = (t, t0, from = 1.1, dur = 0.18) => { const p = clamp((t - t0) / dur, 0, 1); return from + (1 - from) * (1 - Math.pow(1 - p, 3)); };

  function start(o) {
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const stage = document.createElement('div'); stage.id = 'stage'; document.body.appendChild(stage);
    stage.appendChild(o.renderer.domElement);
    const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); const n = d.firstChild; stage.appendChild(n); return n; };
    const black = el('<div id="black" class="ov"></div>'), white = el('<div id="white" class="ov"></div>');
    const hooks = (o.hooks || []).map((h) => Object.assign({ el: el(`<div class="hook">${h.html}</div>`) }, h));   // above the black layer
    const cap = el('<div id="cap"></div>');
    const sub = el('<div id="sub"><div class="spk"></div><div class="txt"></div></div>');
    const title = el(`<div id="title">${(o.title && o.title.html) || ''}</div>`);
    const timer = el('<div id="timer" class="hidden">0.0s</div>');
    const menu = el(`<div id="menu"><h1>${o.menu.title}</h1><p>${o.menu.sub}</p><button id="play">▶ Play</button></div>`);
    const playBtn = menu.querySelector('#play');
    const speakers = o.speakers || {};
    const chunks = captionChunks(o.narration, speakers);
    const spLines = ((o.narration && o.narration.lines) || []).filter((l) => speakers[l.who]).map((l) => Object.assign({}, l, { pieces: subtitlePieces(l) }));
    const noCap = o.noCaptions || [];

    // ---------- layout (9:16 box that fits the screen) ----------
    function layout() {
      let W, H;
      if (RENDER || THUMB) { W = 1080; H = 1920; o.renderer.setPixelRatio(1); }
      else { const vw = window.innerWidth, vh = window.innerHeight; H = Math.min(vh, (vw * 16) / 9); W = (H * 9) / 16; }
      stage.style.width = W + 'px'; stage.style.height = H + 'px'; stage.style.setProperty('--u', W / 100 + 'px');
      o.renderer.setSize(W, H); o.camera.aspect = W / H; o.camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', layout); layout();

    // ---------- overlays at time t (pure function of t) ----------
    let lastCap = '', lastSub = '';
    function overlays(t) {
      black.style.opacity = (o.black ? o.black(t) : 0).toFixed(3);
      white.style.opacity = (o.white ? o.white(t) : 0).toFixed(3);
      for (const h of hooks) {
        const on = t >= h.t0 && t < h.t1, fo = h.t1 - t < 0.15 ? clamp((h.t1 - t) / 0.15, 0, 1) : 1;
        h.el.style.opacity = on ? (clamp((t - h.t0) / 0.12, 0, 1) * fo).toFixed(3) : '0';
        h.el.style.transform = `translateY(-50%) scale(${on ? impact(t, h.t0).toFixed(4) : 1})`;
      }
      // narrator word captions
      const c = noCap.some(([a, b]) => t >= a && t < b) ? null : chunks.find((k) => t >= k.t0 && t < k.t1);
      const key = c ? c.t0 + c.text : '';
      if (key !== lastCap) { lastCap = key; cap.innerHTML = c ? `<span class="${c.key ? 'key' : ''}">${c.text}</span>` : ''; }
      if (c) { const p = clamp((t - c.t0) / 0.1, 0, 1); cap.firstChild.style.transform = `scale(${(1.2 - 0.2 * (1 - Math.pow(1 - p, 2))).toFixed(4)})`; }
      // speaker subtitles
      const s = spLines.find((l) => t >= l.start - 0.05 && t < l.end + 0.45);
      let pc = null; if (s) for (const q of s.pieces) if (t >= q.t0 - 0.05) pc = q; if (s && !pc) pc = s.pieces[0];
      const sk = s ? s.start + '|' + pc.t0 : '';
      if (sk !== lastSub) { lastSub = sk; if (s) { sub.querySelector('.spk').textContent = speakers[s.who]; sub.querySelector('.txt').textContent = pc.text; } }
      sub.style.opacity = s ? (clamp((t - s.start + 0.05) / 0.1, 0, 1) * clamp((s.end + 0.45 - t) / 0.15, 0, 1)).toFixed(3) : '0';
      sub.querySelector('.txt').style.transform = `scale(${s ? impact(t, pc.t0 - 0.05, 1.08, 0.14).toFixed(4) : 1})`;
      sub.style.transform = `scale(${s ? impact(t, s.start - 0.05).toFixed(4) : 1})`;
      // title card
      if (o.title) {
        const on = t >= o.title.t0;
        title.style.opacity = on ? clamp((t - o.title.t0) / 0.15, 0, 1).toFixed(3) : '0';
        [...title.children].forEach((ch, i) => {
          const t0 = o.title.t0 + (o.title.stagger || [0, 0.55, 1.2])[i] || 0;
          ch.style.opacity = t >= t0 ? clamp((t - t0) / 0.12, 0, 1).toFixed(3) : '0';
          ch.style.transform = `scale(${t >= t0 ? impact(t, t0, i === 0 ? 1.14 : 1.1).toFixed(4) : 1})`;
        });
      }
    }
    // o.render(t) (optional) draws the picture itself (frame + post effects); otherwise frame(t) + a plain render
    const draw = (t) => { if (o.render) o.render(t); else { o.frame(t); o.renderer.render(o.scene, o.camera); } };
    function renderFrame(t) { draw(t); overlays(t); return true; }

    // ---------- render mode: the renderer calls window.renderFrame(frame / 30) ----------
    window.sceneInfo = { name: o.name, duration: o.duration, fps: 30, stills: o.stills || [] };
    window.renderFrame = renderFrame;
    if (RENDER || THUMB) {
      menu.classList.add('hidden'); timer.classList.add('hidden');
      const ready = () => { try { if (THUMB && o.thumbnail) o.thumbnail(THUMB); else renderFrame(0); window.sceneReady = true; } catch (e) { window.sceneError = String(e.stack || e); } };
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(ready);
      return { renderFrame };
    }

    // ---------- live mode (phone preview): wall clock + optional mixed audio ----------
    let audio = null;
    if (o.audio) { audio = new Audio(o.audio); audio.preload = 'auto'; }
    let playing = false, t0 = 0;
    playBtn.addEventListener('click', () => {
      menu.classList.add('hidden'); timer.classList.remove('hidden'); playBtn.textContent = '↺ Replay';
      lastCap = lastSub = ''; playing = true; t0 = performance.now();
      if (audio) { try { audio.currentTime = 0; const pr = audio.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* no audio: silent preview */ } }
    });
    (function loop(now) {
      let t;
      if (playing) {
        t = audio && !audio.paused && audio.currentTime > 0 ? audio.currentTime : (now - t0) / 1000;   // follow the audio clock when it plays
        if (t >= o.duration) { playing = false; menu.classList.remove('hidden'); timer.classList.add('hidden'); if (audio) audio.pause(); }
        timer.textContent = t.toFixed(1) + 's';
      }
      if (!playing) t = o.idleTime ? o.idleTime(now / 1000) : 3;
      draw(t); if (playing) overlays(t); else { black.style.opacity = '0'; white.style.opacity = '0'; cap.innerHTML = ''; sub.style.opacity = '0'; title.style.opacity = '0'; hooks.forEach((h) => (h.el.style.opacity = '0')); }
      requestAnimationFrame(loop);
    })(performance.now());
    return { renderFrame };
  }

  RT.player = { start, RENDER, THUMB, captionChunks };
})();
