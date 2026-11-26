// =====================================================================================
// ENDING · dawn over the seaside promenade → "By sunrise, the golden record was gone." → "But somewhere in Port
// Halcyon… another one started to spin." → a dark room: a second golden record spins, a new shadow smiles →
// TO BE CONTINUED (original arrow) + "FOLLOW FOR PART 2".
// Also here: EB.DURATION, the black/white overlays, and the 3 THUMBNAIL options (render.js --thumbs).
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, F, fx3, A, dante, aurora, grant, hale, put, pose, echoAt, beside, ramp, head, lookYaw } = EB;
  const { clamp, lerp, ease, easeOut } = RT;

  const DAWN_T = E('stopped', 0.2), ROOM_T = WD('another', 'somewhere') - 0.1, SPIN_T = WD('another', 'spin') - 0.15;
  const TBC_T = +(E('another', 0.2) + 3.0).toFixed(2);
  EB.DURATION = +(TBC_T + 4.0).toFixed(2);

  // A · dawn: the four of them at the sea wall railing, the sun rising over the sea (no hat, no headphones)
  const RAIL = [[3.0, 'dante'], [4.1, 'aurora'], [5.2, 'grant'], [1.9, 'hale']];          // (between the palm at x 2 and the lamp at 6.5)
  const crew = { dante, aurora, grant, hale };
  function atTheRail(t) {
    RAIL.forEach(([x, who], i) => { const ch = crew[who]; put(ch, [x, 0.15, -6.55], Math.PI + (i - 1.5) * 0.06); pose(ch, i === 2 ? 'idle' : 'idle', t + i * 0.7, { face: who === 'grant' ? 'sad' : 'calm' }); });
    dante.rig.props.headphones.visible = false; grant.rig.props.hat.visible = false; dante.rig.setFace('smiling');
  }
  EB.shot({ t0: DAWN_T, loc: 'promenade', mood: 'dawn', pos: [[14, 6, -26], [10, 4, -22]], look: [[2, 2, -6], [1.5, 1.8, -6.5]], fov: [50, 48], ease: 'out', shadow: 20,
    run(t) { atTheRail(t); } });
  EB.shot({ t0: S('sunrise', -0.1), loc: 'promenade', mood: 'dawn', pos: [[4.2, 2.7, -1.2], [4.1, 2.8, -1.5]], look: [[6.5, 2.4, -24], [7.0, 2.6, -24]], fov: [52, 50], shadow: 10,
    run(t) { atTheRail(t); } });

  // B · the dark room: another golden record starts to spin, a new shadow smiles
  EB.shot({ t0: ROOM_T, loc: 'darkRoom', pos: [[1.1, 2.3, 1.1], [0.8, 2.1, 0.8]], look: [[-0.1, 1.5, -0.5], [-0.1, 1.5, -0.5]], fov: [40, 38], shadow: 6, bloom: 1.0,
    locT: (t) => Math.max(0, t - SPIN_T), locOpts: { smile: 0 } });
  const SMILE = TBC_T - 2.0;
  EB.shot({ t0: E('another', 0.25), loc: 'darkRoom', pos: [[1.6, 2.6, 4.2], [1.0, 2.6, 3.0]], look: [[0.1, 2.2, -1.6], [0.2, 2.6, -2.3]], fov: [42, 40], moveDur: TBC_T - E('another', 0.25), shadow: 6, bloom: 1.0,
    locT: (t) => Math.max(0, t - SPIN_T), locOpts: (t) => ({ smile: ramp(t, SMILE, 0.6) }) });
  F.sfx(SMILE + 0.1, TBC_T, 'ドドドド', { kind: 'menace', x: 78, y: 40, size: 11, rot: 8, color: '#ffd45a', glow: '#6a4a00' });
  // C · TO BE CONTINUED (the room stays, darker)
  F.grade(TBC_T, EB.DURATION + 1, { bright: 0.45, sat: 0.6, fade: 0.3 }).tbc(TBC_T);

  // ---------- black / white overlays ----------
  EB.black = (t) => clamp((t - (EB.DURATION - 0.45)) / 0.45, 0, 1);
  EB.white = (t) => (t >= DAWN_T && t < DAWN_T + 0.5 ? 1 - (t - DAWN_T) / 0.5 : 0);     // the final shockwave's light fades into the dawn
  EB.noCaptions = [];

  // =====================================================================================
  // THUMBNAILS (3 options): node echo-breakers/tools/render.js echo-breakers-full --thumbs
  // 1 "MY SPIRIT CAN PUNCH SOUND?!"  HIBIKI's and SHŪEN's fists colliding, Dante's shocked face in front
  // 2 "HE TURNED MY FRIENDS INTO PUPPETS"  Vahl conducting, SHŪEN looming, the friends on strings
  // 3 "ONE NOTE WOKE IT UP"  the first night: HIBIKI bursts out and punches the falling sign
  // =====================================================================================
  EB.thumbnail = function (n) {
    const T = Number(n) || 1, stage = document.getElementById('stage');
    const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; stage.appendChild(d.firstChild); };
    const css = document.createElement('style'); css.textContent = `
      .th{position:absolute;left:0;right:0;text-align:center;font-family:Montserrat,'Arial Black',sans-serif;font-weight:900;line-height:.95;color:#fff;
          -webkit-text-stroke:calc(var(--u)*1.6) #000;paint-order:stroke fill;text-shadow:0 calc(var(--u)*1) 0 #000,0 0 calc(var(--u)*4) rgba(0,0,0,.6);transform:rotate(-3deg);}
      .th .y{color:#ffd23f;} .th .b{color:#7fd0ff;} .th .p{color:#d6a8ff;}`;
    document.head.appendChild(css);
    EB.F.ev.sfx.length = 0; EB.F.ev.card.length = 0; EB.F.ev.grade.length = 0; EB.F.ev.vig.length = 0; EB.F.ev.lines.length = 0; EB.F.ev.flash.length = 0; EB.F.ev.impact.length = 0;
    document.getElementById('cap').style.display = 'none'; document.getElementById('sub').style.display = 'none';
    ['echo', 'think'].forEach((id) => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
    const cam = EB.camera, R = EB.renderer;
    R.domElement.style.filter = 'saturate(1.3) contrast(1.08) brightness(1.04)';
    if (T === 1) {
      // the clash, seen from the side, Dante in front looking up in shock
      EB.renderAt(S('muda', 0.6));
      const D2 = [7.6, 0, 3.4]; put(dante, D2, Math.PI / 2 + 0.5); pose(dante, 'guard', 0.6, { face: 'shocked', mod: { hx: -0.25, hy: -0.4 } }); dante.rig.setEyes('open'); dante.rig.update(0);
      cam.fov = 54; cam.position.set(11.2, 2.6, 3.9); cam.lookAt(0.3, 3.4, 0.4); cam.updateProjectionMatrix(); EB.env.follow(cam);
      EB.key.intensity = 0.7; EB.key.position.copy(cam.position); EB.key.target.position.set(7.6, 2, 3.4);
      EB.glow.render();
      add('<div class="th" style="top:7%"><div style="font-size:calc(var(--u)*14)">MY SPIRIT</div><div class="b" style="font-size:calc(var(--u)*12)">CAN PUNCH</div><div class="y" style="font-size:calc(var(--u)*16)">SOUND?!</div></div>');
    } else if (T === 2) {
      EB.renderAt(S('puppets', 1.5));
      cam.fov = 56; cam.position.set(0.6, 1.1, 9.5); cam.lookAt(0, 5.2, -4); cam.updateProjectionMatrix(); EB.env.follow(cam);
      const D2 = [0.9, 0, 7.2]; put(dante, D2, Math.PI - 0.3); pose(dante, 'guard', 0.6, { face: 'scared' }); dante.rig.update(0);
      EB.glow.render();
      add('<div class="th" style="top:6%"><div style="font-size:calc(var(--u)*13)">HE TURNED</div><div class="p" style="font-size:calc(var(--u)*12.5)">MY FRIENDS</div><div class="y" style="font-size:calc(var(--u)*12)">INTO PUPPETS</div></div>');
    } else {
      EB.renderAt(26.95);
      cam.fov = 58; cam.position.set(-0.2, 8.4, -21.6); cam.lookAt(-2.8, 12.6, -29.4); cam.updateProjectionMatrix(); EB.env.follow(cam);
      EB.glow.render();
      add('<div class="th" style="top:60%"><div style="font-size:calc(var(--u)*13)">ONE NOTE</div><div class="y" style="font-size:calc(var(--u)*15)">WOKE IT UP</div></div>');
    }
    if (window.RT_BRAND !== false) add('<img src="../brand/watermark.png" style="position:absolute;left:60%;top:91%;width:36%;opacity:.4">');
  };

  EB.STILLS.push(207.0, 209.0, 211.0, 212.8, 215.5, 218.0);
})();
