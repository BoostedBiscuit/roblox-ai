// =====================================================================================
// fx.js: the ANIME LAYER of Echo Breakers. Two kinds of effects:
//
// 1) SCREEN EFFECTS (DOM overlays on top of the 3D picture, all pure functions of time t):
//    const F = RT.fx.screen(renderer.domElement);   pass F.layers to RT.player.start({ overlayLayers }) and call F.update(t)
//    F.sfx(t0, t1, 'ゴゴゴゴ', { x, y, size, color, rot, kind: 'menace' | 'impact' })   big Japanese sound-effect text
//    F.card(t0, t1, { kind: 'chapter', n: 2, title: 'MIRAGE GIRL' })                     chapter card (~1 s)
//    F.card(t0, t1, { kind: 'echo', name: 'HIBIKI', kanji: '響', color })               "ECHO: HIBIKI 「響」" name card
//    F.card(t0, t1, { kind: 'name', name: 'DANTE FERRO', sub: '16 · HEADPHONES ALWAYS ON', color })
//    F.card(t0, t1, { kind: 'text', text: '10 MINUTES EARLIER' })                       plain caption card
//    F.grade(t0, t1, { sat, contrast, bright, hue, invert, tint, tintAmt, fade })      color grading of the 3D picture
//    F.vignette(t0, t1, amount, fade)   F.lines(t0, t1, { kind: 'focus' | 'speed', color, amount, angle })
//    F.flash(t0, dur, color)   F.impact(t0, dur)   F.streak(t0, dur, y)   F.rewind(t0, t1)   F.countdown(t0, t1, from)
//    F.tbc(t0)  (TO BE CONTINUED with an original arrow + "Follow for Part 2")
// 2) 3D EFFECTS (objects in the scene, set every frame by the shot that uses them):
//    RT.fx.barrage(color) · shockwave(color) · debris(n, colors) · cracks() · notes(color) · strings(color) · iceSpikes()
//    shards() · mirageCopy(char) · ghostWall(color)   → each returns an Object3D with .set(...) (see each one)
// All glowing 3D effects are tagged userData.glow so the bloom pass makes them shine.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, { clamp, lerp, smooth, easeOut } = RT;
  const pop = (t, t0, from = 1.4, dur = 0.16) => { const p = clamp((t - t0) / dur, 0, 1); return from + (1 - from) * (1 - Math.pow(1 - p, 3)); };
  const fadeWin = (t, t0, t1, fi = 0.12, fo = 0.18) => clamp((t - t0) / fi, 0, 1) * clamp((t1 - t) / fo, 0, 1);

  const CSS = `
  .fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
  #fx-tint{mix-blend-mode:color;opacity:0;}
  #fx-vig{background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 38%,rgba(0,0,0,.55) 72%,rgba(0,0,0,.92) 100%);opacity:0;}
  #fx-lines{width:100%;height:100%;opacity:0;}
  #fx-flash{opacity:0;}
  #fx-streak{opacity:0;}
  #fx-streak div{position:absolute;left:-10%;width:120%;height:calc(var(--u)*2.2);top:40%;
     background:linear-gradient(90deg,rgba(255,255,255,0),#fff 40%,#fff 60%,rgba(255,255,255,0));box-shadow:0 0 calc(var(--u)*4) #fff,0 0 calc(var(--u)*10) #9fd8ff;}
  .fx-sfx{position:absolute;font-family:'Dela Gothic One','IPAGothic',sans-serif;white-space:nowrap;transform-origin:50% 50%;opacity:0;line-height:1;}
  .fx-sfx.impact{color:#fff6c8;-webkit-text-stroke:calc(var(--u)*1.1) #000;paint-order:stroke fill;}
  .fx-sfx.menace{color:#c45cff;-webkit-text-stroke:calc(var(--u)*.7) #12001e;paint-order:stroke fill;letter-spacing:-.05em;}
  .fx-sfx span{display:inline-block;}
  .fx-card{position:absolute;left:0;right:0;opacity:0;text-align:center;}
  .fx-card.chapter{top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#07070c;}
  .fx-card.chapter .n{font:900 calc(var(--u)*5) Montserrat,'Arial Black',sans-serif;letter-spacing:.45em;color:#ffd23f;margin-left:.45em;}
  .fx-card.chapter .bar{width:calc(var(--u)*60);height:calc(var(--u)*.7);background:#ffd23f;margin:calc(var(--u)*3) 0;transform-origin:50% 50%;}
  .fx-card.chapter .t{font:900 calc(var(--u)*10.5) Montserrat,'Arial Black',sans-serif;color:#fff;line-height:1;letter-spacing:.02em;
     -webkit-text-stroke:calc(var(--u)*.5) #000;paint-order:stroke fill;text-shadow:0 0 calc(var(--u)*5) rgba(255,210,63,.45);}
  .fx-card.echo{top:20%;}
  .fx-card.echo .band{display:inline-block;transform:skewX(-14deg) rotate(-4deg);padding:calc(var(--u)*2) calc(var(--u)*6);
     background:linear-gradient(90deg,rgba(0,0,0,.85),rgba(0,0,0,.6));border-left:calc(var(--u)*1.4) solid var(--c);border-right:calc(var(--u)*1.4) solid var(--c);}
  .fx-card.echo .lbl{font:900 calc(var(--u)*4.2) Montserrat,'Arial Black',sans-serif;color:var(--c);letter-spacing:.3em;text-align:left;}
  .fx-card.echo .nm{font:900 calc(var(--u)*11) Montserrat,'Arial Black',sans-serif;color:#fff;line-height:1;letter-spacing:.04em;text-shadow:0 0 calc(var(--u)*3) var(--c);}
  .fx-card.echo .kj{font-family:'Dela Gothic One','IPAGothic',sans-serif;font-size:calc(var(--u)*11);color:var(--c);margin-left:calc(var(--u)*2);
     -webkit-text-stroke:calc(var(--u)*.4) #000;paint-order:stroke fill;vertical-align:-.05em;}
  .fx-card.name{top:15%;text-align:left;padding-left:6%;}
  .fx-card.name .nm{display:inline-block;font:900 calc(var(--u)*8.4) Montserrat,'Arial Black',sans-serif;color:#fff;line-height:1;padding:calc(var(--u)*1.2) calc(var(--u)*3);
     background:var(--c);-webkit-text-stroke:calc(var(--u)*.3) #000;paint-order:stroke fill;transform:skewX(-10deg);box-shadow:calc(var(--u)*1.2) calc(var(--u)*1.2) 0 #000;}
  .fx-card.name .sb{margin-top:calc(var(--u)*2.2);font:800 calc(var(--u)*3.8) Inter,system-ui,sans-serif;letter-spacing:.14em;color:#fff;text-shadow:0 2px 6px #000;}
  .fx-card.text{top:44%;}
  .fx-card.text .tx{display:inline-block;font:900 calc(var(--u)*8) Montserrat,'Arial Black',sans-serif;color:#ffd23f;letter-spacing:.04em;line-height:1.05;
     -webkit-text-stroke:calc(var(--u)*.7) #000;paint-order:stroke fill;text-shadow:0 calc(var(--u)*.8) 0 #000;}
  #fx-rewind{opacity:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 2px,rgba(0,0,0,0) 2px 6px);}
  #fx-rewind .rw{position:absolute;left:6%;top:6%;font:900 calc(var(--u)*7) Montserrat,'Arial Black',sans-serif;color:#fff;text-shadow:0 0 calc(var(--u)*2) #fff,0 2px 0 #000;}
  #fx-rewind .bar{position:absolute;left:0;right:0;height:calc(var(--u)*5);background:rgba(255,255,255,.12);}
  #fx-count{opacity:0;text-align:center;}
  #fx-count div{position:absolute;right:6%;top:12%;font:900 calc(var(--u)*22) Montserrat,'Arial Black',sans-serif;color:#ffd84a;line-height:1;
     -webkit-text-stroke:calc(var(--u)*1) #6a3a00;paint-order:stroke fill;text-shadow:0 0 calc(var(--u)*5) #ffb200;transform-origin:50% 50%;}
  #fx-tbc{opacity:0;}
  #fx-tbc .arrow{position:absolute;left:6%;bottom:21%;width:88%;height:calc(var(--u)*20);}
  #fx-tbc .follow{position:absolute;left:0;right:0;bottom:12%;text-align:center;font:900 calc(var(--u)*5.6) Montserrat,'Arial Black',sans-serif;color:#fff;
     -webkit-text-stroke:calc(var(--u)*.4) #000;paint-order:stroke fill;text-shadow:0 0 calc(var(--u)*3) rgba(255,210,63,.6);}`;

  // the original TO BE CONTINUED arrow: a sound-wave tail that becomes an arrow, with the words inside (SVG)
  const TBC_SVG = `<svg class="arrow" viewBox="0 0 880 200" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#2a6cff"/><stop offset=".55" stop-color="#9a5cff"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs>
    <path d="M10 100 L40 100 L55 60 L70 140 L85 40 L100 160 L115 70 L130 100 L170 100" fill="none" stroke="#ffd23f" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M165 62 L720 62 L720 22 L870 100 L720 178 L720 138 L165 138 Q150 100 165 62 Z" fill="url(#tg)" stroke="#000" stroke-width="8"/>
    <text x="445" y="118" text-anchor="middle" font-family="Montserrat, Arial Black, sans-serif" font-weight="900" font-size="52" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke" letter-spacing="2">TO BE CONTINUED…</text>
  </svg>`;

  function screen(canvasEl) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const layers = [
      '<div id="fx-tint" class="fx"></div>', '<div id="fx-vig" class="fx"></div>', '<canvas id="fx-lines" class="fx" width="540" height="960"></canvas>',
      '<div id="fx-sfx" class="fx"></div>', '<div id="fx-streak" class="fx"><div></div></div>', '<div id="fx-rewind" class="fx"><div class="bar"></div><div class="rw">◀◀ REWIND</div></div>',
      '<div id="fx-count" class="fx"><div></div></div>', '<div id="fx-cards" class="fx"></div>', '<div id="fx-flash" class="fx"></div>',
      `<div id="fx-tbc" class="fx">${TBC_SVG}<div class="follow">FOLLOW FOR PART 2</div></div>`,
    ];
    const ev = { sfx: [], card: [], grade: [], vig: [], lines: [], flash: [], impact: [], streak: [], rewind: [], count: [], tbc: [] };
    let dom = null;
    const $ = (id) => document.getElementById(id);
    function bind() {
      if (dom) return dom;
      dom = { tint: $('fx-tint'), vig: $('fx-vig'), lines: $('fx-lines'), sfx: $('fx-sfx'), streak: $('fx-streak'), rewind: $('fx-rewind'), count: $('fx-count'), cards: $('fx-cards'), flash: $('fx-flash'), tbc: $('fx-tbc') };
      dom.ctx = dom.lines.getContext('2d');
      // create the DOM for sound-effect texts and cards once (shown/hidden by time)
      for (const s of ev.sfx) {
        const d = document.createElement('div'); d.className = 'fx-sfx ' + s.kind;
        d.innerHTML = [...s.text].map((c) => `<span>${c}</span>`).join('');
        d.style.left = s.x + '%'; d.style.top = s.y + '%'; d.style.fontSize = `calc(var(--u)*${s.size})`;
        if (s.color) d.style.color = s.color;
        if (s.kind === 'impact') d.style.textShadow = `0 0 0 #000, calc(var(--u)*.9) calc(var(--u)*.9) 0 ${s.shadow || '#e0352b'}`;
        else d.style.textShadow = `0 0 calc(var(--u)*2) ${s.glow || '#8a2cff'}`;
        dom.sfx.appendChild(d); s.el = d;
      }
      for (const c of ev.card) {
        const d = document.createElement('div'); d.className = 'fx-card ' + c.kind; d.style.setProperty('--c', c.color || '#ffd23f');
        if (c.kind === 'chapter') d.innerHTML = `<div class="n">CHAPTER ${c.n}</div><div class="bar"></div><div class="t">${c.title}</div>`;
        if (c.kind === 'echo') d.innerHTML = `<div class="band"><div class="lbl">ECHO</div><div><span class="nm">${c.name}</span><span class="kj">「${c.kanji}」</span></div></div>`;
        if (c.kind === 'name') d.innerHTML = `<div class="nm">${c.name}</div>${c.sub ? `<div class="sb">${c.sub}</div>` : ''}`;
        if (c.kind === 'text') d.innerHTML = `<div class="tx">${c.text}</div>`;
        if (c.top !== undefined) d.style.top = c.top + '%';
        dom.cards.appendChild(d); c.el = d;
      }
      return dom;
    }
    const F = {
      layers, ev,
      sfx(t0, t1, text, o = {}) { ev.sfx.push(Object.assign({ t0, t1, text, x: 50, y: 30, size: 16, rot: -8, kind: 'impact' }, o)); return F; },
      card(t0, t1, o) { ev.card.push(Object.assign({ t0, t1 }, o)); return F; },
      grade(t0, t1, o) { ev.grade.push(Object.assign({ t0, t1, fade: 0.15 }, o)); return F; },
      vignette(t0, t1, amount = 1, fade = 0.2) { ev.vig.push({ t0, t1, amount, fade }); return F; },
      lines(t0, t1, o = {}) { ev.lines.push(Object.assign({ t0, t1, kind: 'focus', color: '#ffffff', amount: 1, fade: 0.15 }, o)); return F; },
      flash(t0, dur = 0.2, color = '#ffffff', peak = 1) { ev.flash.push({ t0, dur, color, peak }); return F; },
      impact(t0, dur = 0.1) { ev.impact.push({ t0, dur }); return F; },
      streak(t0, dur = 0.5, y = 40) { ev.streak.push({ t0, dur, y }); return F; },
      rewind(t0, t1) { ev.rewind.push({ t0, t1 }); return F; },
      countdown(t0, t1, from = 10) { ev.count.push({ t0, t1, from }); return F; },
      tbc(t0) { ev.tbc.push({ t0 }); return F; },
      // the picture filter at time t (also used by the thumbnail): saturate / contrast / brightness / hue / invert
      filterAt(t) {
        let sat = 1, con = 1, bri = 1, hue = 0, inv = 0;
        for (const g of ev.grade) { const w = fadeWin(t, g.t0, g.t1, g.fade, g.fadeOut ?? g.fade); if (w <= 0) continue; sat *= lerp(1, g.sat ?? 1, w); con *= lerp(1, g.contrast ?? 1, w); bri *= lerp(1, g.bright ?? 1, w); hue += (g.hue || 0) * w; }
        for (const k of ev.impact) if (t >= k.t0 && t < k.t0 + k.dur) { inv = 1; con *= 1.6; sat = 0; }
        return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)})${hue ? ` hue-rotate(${hue.toFixed(1)}deg)` : ''}${inv ? ' invert(1)' : ''}`;
      },
      update(t) {
        const d = bind();
        canvasEl.style.filter = F.filterAt(t);
        // tint (mix-blend-mode: color)
        let tc = null, ta = 0; for (const g of ev.grade) if (g.tint) { const w = fadeWin(t, g.t0, g.t1, g.fade, g.fadeOut ?? g.fade) * (g.tintAmt ?? 0.5); if (w > ta) { ta = w; tc = g.tint; } }
        d.tint.style.opacity = ta.toFixed(3); if (tc) d.tint.style.background = tc;
        let va = 0; for (const v of ev.vig) va = Math.max(va, fadeWin(t, v.t0, v.t1, v.fade, v.fade) * v.amount); d.vig.style.opacity = va.toFixed(3);
        // speed / focus lines (canvas, deterministic per frame)
        const ln = ev.lines.find((l) => t >= l.t0 && t < l.t1), ctx = d.ctx;
        if (ln) {
          const a = fadeWin(t, ln.t0, ln.t1, ln.fade, ln.fade) * ln.amount, fr = Math.floor(t * 30), r = RT.rng(fr * 7 + 3);
          ctx.clearRect(0, 0, 540, 960); ctx.fillStyle = ln.color; d.lines.style.opacity = a.toFixed(3);
          if (ln.kind === 'focus') {                                // radial lines rushing to the center (thinking, shocks)
            const cx = 270 + (ln.cx || 0), cy = 430 + (ln.cy || 0);
            for (let i = 0; i < 90; i++) {
              const ang = r() * Math.PI * 2, w = 0.004 + r() * 0.012, r0 = 230 + r() * 200 * (ln.inner || 1), r1 = 900;
              ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang - w) * r1, cy + Math.sin(ang - w) * r1); ctx.lineTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang + w) * r1, cy + Math.sin(ang + w) * r1); ctx.fill();
            }
          } else {                                                   // parallel speed lines (chases, dashes)
            const ang = ln.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang);
            for (let i = 0; i < 46; i++) {
              const off = (r() - 0.5) * 1300, len = 200 + r() * 500, pos = (r() * 1600 - 300 + t * 2600 * (0.6 + r())) % 1600 - 300, w = 1 + r() * 3.5;
              ctx.save(); ctx.translate(270, 480); ctx.rotate(ang); ctx.globalAlpha = 0.35 + r() * 0.5; ctx.fillRect(pos - 800, off, len, w); ctx.restore();
            }
            ctx.globalAlpha = 1; void ca; void sa;
          }
        } else d.lines.style.opacity = '0';
        // sound-effect texts
        for (const s of ev.sfx) {
          const on = t >= s.t0 && t < s.t1; s.el.style.opacity = on ? fadeWin(t, s.t0, s.t1, 0.04, 0.15).toFixed(3) : '0';
          if (!on) continue;
          const lt = t - s.t0, sh = s.kind === 'impact' ? (lt < 0.3 ? Math.sin(t * 80) * (0.3 - lt) * 3 : 0) : 0;
          s.el.style.transform = `translate(-50%,-50%) rotate(${s.rot}deg) scale(${(s.kind === 'impact' ? pop(t, s.t0, 1.8, 0.14) : 1 + 0.05 * Math.sin(lt * 3)).toFixed(4)}) translateX(${sh.toFixed(2)}%)`;
          if (s.kind === 'menace') [...s.el.children].forEach((c, i) => { const ap = clamp((lt - i * 0.12) / 0.2, 0, 1); c.style.opacity = ap.toFixed(3); c.style.transform = `translateY(${(Math.sin(t * 7 + i * 1.3) * 6 - (1 - ap) * 30).toFixed(1)}%) scale(${(0.9 + 0.12 * Math.sin(t * 5 + i)).toFixed(3)})`; });
        }
        // cards
        for (const c of ev.card) {
          const on = t >= c.t0 && t < c.t1; c.el.style.opacity = on ? fadeWin(t, c.t0, c.t1, c.kind === 'chapter' ? 0.06 : 0.08, c.kind === 'chapter' ? 0.1 : 0.2).toFixed(3) : '0';
          if (!on) continue;
          const lt = t - c.t0;
          if (c.kind === 'chapter') { c.el.querySelector('.t').style.transform = `scale(${pop(t, c.t0 + 0.08, 1.25, 0.2).toFixed(4)})`; c.el.querySelector('.bar').style.transform = `scaleX(${easeOut(clamp(lt / 0.35, 0, 1)).toFixed(3)})`; }
          if (c.kind === 'echo') c.el.querySelector('.band').style.transform = `skewX(-14deg) rotate(-4deg) translateX(${(-60 * (1 - easeOut(clamp(lt / 0.22, 0, 1)))).toFixed(1)}%) scale(${pop(t, c.t0, 1.15, 0.2).toFixed(4)})`;
          if (c.kind === 'name') c.el.style.transform = `translateX(${(-50 * (1 - easeOut(clamp(lt / 0.2, 0, 1)))).toFixed(1)}%)`;
          if (c.kind === 'text') c.el.style.transform = `scale(${pop(t, c.t0, 1.3, 0.18).toFixed(4)})`;
        }
        // flashes (the strongest one wins)
        let fa = 0, fc = '#fff'; for (const f of ev.flash) if (t >= f.t0 && t < f.t0 + f.dur) { const a = (1 - (t - f.t0) / f.dur) * f.peak; if (a > fa) { fa = a; fc = f.color; } }
        d.flash.style.opacity = fa.toFixed(3); d.flash.style.background = fc;
        // the serious-switch light streak across the eyes
        const sk = ev.streak.find((s) => t >= s.t0 && t < s.t0 + s.dur);
        if (sk) { const p = (t - sk.t0) / sk.dur; d.streak.style.opacity = (Math.sin(Math.PI * p)).toFixed(3); d.streak.firstChild.style.top = sk.y + '%'; d.streak.firstChild.style.transform = `translateX(${lerp(-60, 60, p).toFixed(1)}%) scaleY(${(1 + 2 * Math.sin(Math.PI * p)).toFixed(2)})`; }
        else d.streak.style.opacity = '0';
        // rewind look
        const rw = ev.rewind.find((r) => t >= r.t0 && t < r.t1);
        d.rewind.style.opacity = rw ? '1' : '0';
        if (rw) d.rewind.querySelector('.bar').style.top = (((t - rw.t0) * 140) % 100) + '%';
        // OMAMORI countdown 10 → 0
        const cd = ev.count.find((c) => t >= c.t0 && t < c.t1);
        d.count.style.opacity = cd ? fadeWin(t, cd.t0, cd.t1, 0.08, 0.2).toFixed(3) : '0';
        if (cd) { const n = Math.max(0, cd.from - Math.floor(((t - cd.t0) / (cd.t1 - cd.t0)) * (cd.from + 1))), ph = (((t - cd.t0) / (cd.t1 - cd.t0)) * (cd.from + 1)) % 1; const e = d.count.firstChild; e.textContent = n; e.style.transform = `scale(${(1.35 - 0.35 * easeOut(clamp(ph / 0.25, 0, 1))).toFixed(3)})`; }
        // TO BE CONTINUED
        const tb = ev.tbc.find((x) => t >= x.t0);
        d.tbc.style.opacity = tb ? clamp((t - tb.t0) / 0.15, 0, 1).toFixed(3) : '0';
        if (tb) { const lt = t - tb.t0; d.tbc.querySelector('.arrow').style.transform = `translateX(${(-110 * (1 - easeOut(clamp(lt / 0.35, 0, 1)))).toFixed(1)}%)`; d.tbc.querySelector('.follow').style.opacity = clamp((lt - 0.6) / 0.3, 0, 1).toFixed(3); }
      },
    };
    return F;
  }

  // =================================================================================
  // 3D EFFECTS
  // =================================================================================
  const glowify = (o) => { o.traverse((m) => (m.userData.glow = true)); return o; };
  const add = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const dm = new THREE.Object3D();

  // PUNCH BARRAGE: a storm of glowing fists (with motion-blur ghosts) bursting from an Echo toward a target.
  //   b.set(t, origin Vector3, dir Vector3, power 0..1, spread)   spread = width of the fist storm (world units)
  function barrage(color = '#4fb8ff', n = 26) {
    const g = new THREE.Group(); g.name = 'barrage';
    const fistG = RT.roundedBoxGeometry(0.55, 0.5, 0.62, 0.14, 2), ghostG = new THREE.BoxGeometry(0.5, 0.45, 1.8);
    const fists = new THREE.InstancedMesh(fistG, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, transparent: true, opacity: 0.95 }), n);
    const ghosts = new THREE.InstancedMesh(ghostG, add(color, 0.28), n);
    fists.frustumCulled = ghosts.frustumCulled = false; g.add(fists, ghosts); glowify(g);
    const seeds = Array.from({ length: n }, (_, i) => [RT.hash(i * 3.1), RT.hash(i * 5.7 + 1), RT.hash(i * 7.3 + 2), RT.hash(i * 1.9 + 4)]);
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1), right = new THREE.Vector3(), vup = new THREE.Vector3();
    g.set = (t, origin, dir, power = 1, spread = 1.6, reach = 2.4) => {
      g.visible = power > 0.01; if (!g.visible) return;
      const D = dir.clone().normalize(); q.setFromUnitVectors(up, D);
      right.crossVectors(D, new THREE.Vector3(0, 1, 0)).normalize(); vup.crossVectors(right, D).normalize();
      seeds.forEach(([a, b, c, d], i) => {
        const cyc = (t * (5 + d * 3) + a) % 1, ext = Math.sin(cyc * Math.PI);              // each fist punches out and back
        const px = (b - 0.5) * spread * 1.6, py = (c - 0.5) * spread;
        dm.position.copy(origin).addScaledVector(right, px).addScaledVector(vup, py).addScaledVector(D, 0.4 + ext * reach * (0.7 + 0.3 * d));
        dm.quaternion.copy(q); const s = (0.75 + 0.5 * d) * (0.4 + 0.6 * power) * (0.6 + 0.4 * ext); dm.scale.setScalar(s); dm.updateMatrix(); fists.setMatrixAt(i, dm.matrix);
        dm.position.addScaledVector(D, -0.9 * s); dm.scale.set(s, s, s * (0.5 + ext)); dm.updateMatrix(); ghosts.setMatrixAt(i, dm.matrix);
      });
      fists.instanceMatrix.needsUpdate = ghosts.instanceMatrix.needsUpdate = true;
      fists.material.opacity = 0.95 * power; ghosts.material.opacity = 0.3 * power;
    };
    g.visible = false; return g;
  }

  // SHOCKWAVE: an expanding glowing ring (+ a flat disc flash). s.set(pos, normal, p 0..1, size)
  function shockwave(color = '#ffffff') {
    const g = new THREE.Group(); g.name = 'shockwave';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 64), add(color, 0.9));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), add(color, 0.35)); disc.material.side = THREE.DoubleSide;
    g.add(ring, disc); glowify(g); g.visible = false;
    const Z = new THREE.Vector3(0, 0, 1);
    g.set = (pos, normal, p, size = 8) => {
      g.visible = p > 0 && p < 1; if (!g.visible) return;
      g.position.copy(pos); g.quaternion.setFromUnitVectors(Z, normal.clone().normalize());
      const r = size * easeOut(p); ring.scale.set(r, r, 1 + 6 * (1 - p)); disc.scale.setScalar(r * 0.95);
      ring.material.opacity = 0.9 * (1 - p); disc.material.opacity = 0.35 * (1 - p) * (1 - p);
    };
    return g;
  }

  // DEBRIS: chunks flying out from a point and falling (deterministic). d.set(origin, lt seconds since the hit, power, up)
  function debris(n = 40, colors = ['#c9b79a', '#8f7f68'], size = 0.35, glow = false) {
    const g = new THREE.Group(); g.name = 'debris'; g.visible = false;
    const meshes = colors.map((c) => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow ? add(c, 0.9) : RT.plastic(c, { roughness: 0.8 }), Math.ceil(n / colors.length)); m.castShadow = !glow; m.frustumCulled = false; g.add(m); return m; });
    if (glow) glowify(g);
    const seeds = Array.from({ length: n }, (_, i) => [RT.hash(i * 2.3 + 9), RT.hash(i * 4.1 + 3), RT.hash(i * 6.7 + 5), RT.hash(i * 8.9 + 7)]);
    g.set = (origin, lt, power = 1, upward = 1, floorY = -1e9, dirBias = null) => {
      g.visible = lt >= 0 && lt < 6; if (!g.visible) return;
      seeds.forEach(([a, b, c, d], i) => {
        const ang = a * Math.PI * 2, sp = (3 + b * 7) * power, vy = (2 + c * 6) * upward;
        let vx = Math.cos(ang) * sp, vz = Math.sin(ang) * sp; if (dirBias) { vx += dirBias.x * sp; vz += dirBias.z * sp; }
        let x = origin.x + vx * lt, z = origin.z + vz * lt, y = origin.y + vy * lt - 4.9 * lt * lt;
        if (y < floorY) { y = floorY + size * 0.3; const tl = (vy + Math.sqrt(vy * vy + 19.6 * (origin.y - floorY))) / 9.8; x = origin.x + vx * tl; z = origin.z + vz * tl; }
        dm.position.set(x, y, z); dm.rotation.set(lt * (3 + a * 6), lt * (2 + b * 5), lt * c * 4); dm.scale.setScalar(size * (0.5 + d)); dm.updateMatrix();
        const m = meshes[i % meshes.length]; m.setMatrixAt(Math.floor(i / meshes.length), dm.matrix);
      });
      meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    };
    return g;
  }

  // CRACKS spreading on the ground (canvas decal). c.set(pos, p 0..1, size, color)
  function cracks(seed = 3) {
    const tex = RT.canvasTexture(512, 512, (g) => {
      const r = RT.rng(seed); g.strokeStyle = '#000'; g.lineCap = 'round';
      const branch = (x, y, a, len, w, depth) => { if (depth > 5 || len < 8) return; let cx = x, cy = y; g.lineWidth = w; g.beginPath(); g.moveTo(cx, cy);
        for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 0.8; cx += Math.cos(a) * len / 6; cy += Math.sin(a) * len / 6; g.lineTo(cx, cy); } g.stroke();
        branch(cx, cy, a + (r() - 0.5) * 1.2, len * 0.65, w * 0.7, depth + 1); if (r() < 0.6) branch(cx, cy, a + (r() - 0.5) * 1.8, len * 0.5, w * 0.6, depth + 1); };
      for (let i = 0; i < 9; i++) branch(256, 256, (i / 9) * Math.PI * 2 + r() * 0.4, 120 + r() * 60, 9, 0);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.name = 'cracks';
    m.set = (pos, p, size = 10, color = '#1a1410') => { m.visible = p > 0; m.position.copy(pos); m.scale.setScalar(size * easeOut(clamp(p, 0, 1))); m.material.color.set(color); };
    return m;
  }

  // MUSIC NOTES floating around a point (SHŪEN's music, the golden record). n.set(t, center, radius, power)
  function notes(color = '#c08bff', count = 18) {
    const g = new THREE.Group(); g.name = 'notes'; const sprites = [];
    const glyphs = ['♪', '♫', '♩', '♬'].map((ch) => RT.canvasTexture(64, 64, (c) => { c.fillStyle = '#fff'; c.font = '900 52px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 32, 34); }));
    for (let i = 0; i < count; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphs[i % 4], color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(s); sprites.push(s); }
    glowify(g); g.visible = false;
    g.set = (t, center, radius = 4, power = 1, height = 5) => {
      g.visible = power > 0.01; if (!g.visible) return;
      sprites.forEach((s, i) => { const a = RT.hash(i * 3.3) * Math.PI * 2 + t * (0.4 + RT.hash(i) * 0.5), life = (t * 0.25 + RT.hash(i * 7.1)) % 1;
        s.position.set(center.x + Math.cos(a) * radius * (0.5 + RT.hash(i * 2.2) * 0.6), center.y + life * height, center.z + Math.sin(a) * radius * (0.5 + RT.hash(i * 5.5) * 0.6));
        s.scale.setScalar(0.6 + RT.hash(i * 9.1) * 0.5); s.material.opacity = power * Math.sin(Math.PI * life); });
    };
    return g;
  }

  // PUPPET STRINGS: glowing lines from high above down to points (hands / heads of the puppets). s.set(points[], top, power)
  function strings(color = '#c46bff', max = 24) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(max * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    lines.frustumCulled = false; lines.userData.glow = true; lines.visible = false; lines.name = 'strings';
    lines.set = (pts, topY = 30, power = 1, sway = 0) => {
      lines.visible = power > 0.01 && pts.length > 0; if (!lines.visible) return;
      pts.slice(0, max).forEach((p, i) => { pos.set([p.x + Math.sin(sway + i) * 2, topY, p.z + Math.cos(sway * 0.7 + i) * 2, p.x, p.y, p.z], i * 6); });
      geo.setDrawRange(0, Math.min(max, pts.length) * 2); geo.attributes.position.needsUpdate = true; lines.material.opacity = 0.9 * power;
    };
    return lines;
  }

  // ICE SPIKES bursting out of the ground in a ring / at points. s.set(center, p 0..1, radius)
  function iceSpikes(count = 16, seed = 5) {
    const g = new THREE.Group(); g.name = 'iceSpikes'; g.visible = false;
    const mat = new THREE.MeshStandardMaterial({ color: '#bff3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85, emissive: '#3fc8ff', emissiveIntensity: 0.25 });
    const spikes = []; const r = RT.rng(seed);
    for (let i = 0; i < count; i++) { const h = 1.2 + r() * 2.2, m = new THREE.Mesh(new THREE.ConeGeometry(0.22 + r() * 0.25, h, 5), mat); m.userData = { a: (i / count) * Math.PI * 2 + r() * 0.3, d: 0.6 + r() * 0.5, h, tilt: (r() - 0.5) * 0.6, delay: r() * 0.35 }; m.castShadow = true; g.add(m); spikes.push(m); }
    g.set = (center, p, radius = 3) => {
      g.visible = p > 0; if (!g.visible) return;
      spikes.forEach((s) => { const u = s.userData, q = easeOut(clamp((p - u.delay) / 0.4, 0, 1)); s.position.set(center.x + Math.cos(u.a) * radius * u.d, center.y + (u.h * q) / 2 - 0.1, center.z + Math.sin(u.a) * radius * u.d); s.scale.set(1, Math.max(0.001, q), 1); s.rotation.set(Math.sin(u.a) * u.tilt, 0, -Math.cos(u.a) * u.tilt); });
    };
    return g;
  }

  // SPARKLING SHARDS (ice exploding over the sea): instanced glowing crystals. s.set(origin, lt, power)
  function shards(n = 70) {
    const m = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.22, 0), add('#c8f6ff', 0.9), n); m.frustumCulled = false; m.userData.glow = true; m.visible = false; m.name = 'shards';
    const seeds = Array.from({ length: n }, (_, i) => [RT.hash(i * 3.7 + 11), RT.hash(i * 1.3 + 2), RT.hash(i * 9.1 + 6), RT.hash(i * 4.4 + 8)]);
    m.set = (origin, lt, power = 1, spread = 9) => {
      m.visible = lt >= 0 && lt < 5; if (!m.visible) return;
      seeds.forEach(([a, b, c, d], i) => { const ang = a * Math.PI * 2, sp = (4 + b * spread) * power, vy = 3 + c * 8;
        dm.position.set(origin.x + Math.cos(ang) * sp * lt, origin.y + vy * lt - 3 * lt * lt, origin.z + Math.sin(ang) * sp * lt); dm.rotation.set(lt * 5 * a, lt * 7 * b, 0);
        dm.scale.setScalar((0.6 + d * 1.6) * (0.6 + 0.4 * Math.sin(lt * 20 + i))); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); });
      m.instanceMatrix.needsUpdate = true; m.material.opacity = 0.9 * clamp(1 - lt / 5, 0, 1);
    };
    return m;
  }

  // MIRAGE COPY: a clone of a character made of shimmering heat haze (KAGEROU). c.setHaze(t, alpha)
  function mirageCopy(make) {
    const c = make(), mats = new Map();
    c.traverse((o) => { if (o.isMesh) { const conv = (m) => { if (!mats.has(m)) { const n = m.clone(); n.transparent = true; n.emissive = new THREE.Color('#ff8a2a'); n.emissiveIntensity = 0.35; mats.set(m, n); } return mats.get(m); }; o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material); } });
    c.setHaze = (t, alpha = 0.8) => { for (const m of mats.values()) { m.opacity = alpha * (0.85 + 0.15 * Math.sin(t * 13)); } c.rig.inner.scale.x = c.rig.unit * (1 + Math.sin(t * 11) * 0.04); c.visible = alpha > 0.02; };
    return c;
  }

  // GHOST WALL: a translucent heat-haze wall (KAGEROU's fake walls). w.set(pos, yaw, p rise, alpha)
  function ghostWall(color = '#ffb35a', w = 6, h = 4) {
    const tex = RT.canvasTexture(128, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,220,160,0.15)'); gr.addColorStop(1, 'rgba(255,170,80,0.65)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; for (let y = 10; y < 128; y += 18) { g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, y + Math.sin(x * 0.2) * 3); g.stroke(); } });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    m.userData.glow = true; m.visible = false; m.name = 'ghostWall';
    m.set = (pos, yaw, p, alpha = 0.6, t = 0) => { m.visible = p > 0 && alpha > 0.01; m.position.set(pos.x, pos.y + (h / 2) * p, pos.z); m.rotation.y = yaw; m.scale.set(1 + Math.sin(t * 9) * 0.015, Math.max(0.001, p), 1); m.material.opacity = alpha; };
    return m;
  }

  RT.fx = { screen, barrage, shockwave, debris, cracks, notes, strings, iceSpikes, shards, mirageCopy, ghostWall, pop, fadeWin };
})();
