// =====================================================================================
// ENDING · dawn over the seaside promenade → "By sunrise, the golden record was gone." → "But somewhere in Port
// Halcyon… another one started to spin." → a dark room: a second golden record spins, a new shadow smiles →
// TO BE CONTINUED (original arrow) + "FOLLOW FOR PART 2".
// Also here: EB.DURATION, the black/white overlays, and the 3 THUMBNAIL options (render.js --thumbs).
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, F, fx3, A, dante, aurora, grant, hale, put, pose, echoAt, beside, ramp, head, lookYaw } = EB;   // (thumbnails use these too)
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
  EB.shot({ t0: DAWN_T, loc: 'promenade', mood: 'dawn', pos: [[14, 6, -26], [10, 4, -22]], look: [[2, 2, -6], [1.5, 1.8, -6.5]], fov: [50, 48], ease: 'out', shadow: 20, xfade: 0.9,
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
  EB.white = () => 0;                                                                     // (the arena now dissolves into the dawn instead of a white flash)
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
    const cam = EB.camera, R = EB.renderer, FX3 = Object.values(fx3).flat();
    R.domElement.style.filter = 'saturate(1.25) contrast(1.08) brightness(1.03)';
    // each option: load the place at a moment of the story, then stage the characters by hand for a clear picture
    const stage3D = (t) => { EB.renderAt(t); FX3.forEach((o) => (o.visible = false)); EB.PEOPLE.forEach((o) => (o.visible = false)); EB.ECHOES.forEach((o) => (o.visible = false)); EB.player.visible = false; };
    const shoot = (pos, look, fov, bloom = 0.5) => { R.domElement.style.filter = 'saturate(1.25) contrast(1.08) brightness(1.03)'; cam.fov = fov; cam.position.set(...pos); cam.lookAt(...look); cam.updateProjectionMatrix(); EB.env.follow(cam); EB.env.shadowFocus(look[0], 0, look[2], 16); EB.glow.strength = bloom; EB.glow.render(); };
    const faceCam = (p) => Math.atan2(cam.position.x - p[0], cam.position.z - p[2]);
    if (T === 1) {
      // HIBIKI (blue, left) and SHŪEN (purple, right) punch each other: the two barrages meet in a burst; Dante in front, shocked
      stage3D(S('muda', 0.5));
      cam.position.set(8.6, 2.0, 7.2);
      const HP = [1.6, 0, 2.6], SP = [-1.8, 0.4, -4.2], MEET = V(-0.1, 3.4, -0.9);
      echoAt(EB.hibiki, HP, Math.atan2(SP[0] - HP[0], SP[2] - HP[2]), 1.0, { move: 'punch', lt: 0.5, float: 0.2 });
      echoAt(EB.shuen, SP, Math.atan2(HP[0] - SP[0], HP[2] - SP[2]), 1.0, { move: 'punch', lt: 0.5, float: 0.2, orchestra: false });
      const hc = head(EB.hibiki, -1.3), sc = head(EB.shuen, -2.5);
      fx3.barrage.set(0.37, hc, MEET.clone().sub(hc), 0.85, 1.2, hc.distanceTo(MEET) - 0.3); fx3.barrage2.set(0.61, sc, MEET.clone().sub(sc), 0.85, 1.6, sc.distanceTo(MEET) - 0.3);
      fx3.wave3.set(MEET, V(0.6, 0.1, 1), 0.35, 4); fx3.sparks.set(MEET, 0.12, 0.6, 0.6);
      const DP = [6.0, 0, 5.2]; put(dante, DP, 0); dante.rotation.y = faceCam(DP) - 0.35; pose(dante, 'guard', 0.6, { face: 'shocked', mod: { hy: -0.5, hx: -0.15 } }); dante.rig.setEyes('open'); dante.rig.setMouth(true); dante.rig.update(0);
      EB.key.intensity = 0.8; EB.key.position.set(9, 4, 9); EB.key.target.position.set(6, 2, 5);
      shoot([8.6, 2.0, 7.2], [0.6, 3.2, -1.0], 56, 0.45);
      add('<div class="th" style="top:6%"><div style="font-size:calc(var(--u)*14)">MY SPIRIT</div><div class="b" style="font-size:calc(var(--u)*12)">CAN PUNCH</div><div class="y" style="font-size:calc(var(--u)*16)">SOUND?!</div></div>');
    } else if (T === 2) {
      // Vahl conducts, SHŪEN looms with the shadow orchestra, the three friends hang on glowing strings; Dante in the corner
      stage3D(S('puppets', 1.5));
      cam.position.set(1.8, 1.0, 13.5);
      put(EB.vahl, [0, 0, -2.5], 0); pose(EB.vahl, 'conduct', 0.9);
      echoAt(EB.shuen, [0, 0.4, -7.2], 0, 1.0, { move: 'raiseHand', lt: 2, orchestra: true });
      const FR = [[EB.aurora, [-3.4, 0, 2.4]], [EB.grant, [3.4, 0, 2.2]], [EB.hale, [0.2, 0, 3.6]]], pts = [];
      FR.forEach(([ch, p], i) => { put(ch, p, faceCam(p)); pose(ch, 'puppet', 1.3 + i * 0.37, { face: 'sad' }); ch.rig.setEyes('closed'); ch.rig.update(0); const h = head(ch, 0.35); pts.push(h, h.clone().add(V(-0.7, -0.9, 0.2)), h.clone().add(V(0.7, -0.9, 0.2))); });
      fx3.strings.set(pts, 26, 1, 1.0); fx3.notes.set(2.0, V(0, 1.5, -5), 7, 1, 8);
      const DP = [2.6, 0, 10.6]; put(dante, DP, Math.PI - 0.25); pose(dante, 'guard', 0.6, { face: 'shocked' }); dante.rig.update(0);
      shoot([1.8, 1.0, 13.5], [0, 4.4, -2.5], 58, 0.55);
      add('<div class="th" style="top:6%"><div style="font-size:calc(var(--u)*13)">HE TURNED</div><div class="p" style="font-size:calc(var(--u)*12.5)">MY FRIENDS</div><div class="y" style="font-size:calc(var(--u)*12)">INTO PUPPETS</div></div>');
    } else {
      // the first night: HIBIKI bursts out of Dante and punches the falling sign to pieces
      stage3D(EB.T_HIT + 0.15);
      cam.position.set(3.4, 8.4, -21.8);
      const DP = [-2.6, 10, -30.4]; put(dante, DP, 0.15); pose(dante, 'block', 1, { face: 'shocked', mod: { hx: -0.62 } }); dante.rig.setEyes('open'); dante.rig.update(0);
      put(EB.player, [-1.25, 10, -29.65], 0.3);
      const ec = echoAt(EB.hibiki, beside(dante, 0.25, 0.55, 0.7), 0.15, 1.0, { move: 'punch', lt: 0.6 }); ec.rotation.order = 'YXZ'; ec.rotation.x = -0.75;
      const chest = head(EB.hibiki, -1.2), HIT = V(-2.6, 12.9, -30.3);
      fx3.barrage.set(0.33, chest, HIT.clone().sub(chest), 0.8, 1.2, 2.4); fx3.debris.set(HIT, 0.22, 1.2, 1.4, 10.05);
      shoot([3.4, 8.4, -21.8], [-2.4, 12.2, -29.5], 56, 0.4);
      add('<div class="th" style="top:6%"><div style="font-size:calc(var(--u)*13)">ONE NOTE</div><div class="y" style="font-size:calc(var(--u)*15)">WOKE IT UP</div></div>');
    }
    if (window.RT_BRAND !== false) add('<img src="../brand/watermark.png" style="position:absolute;left:60%;top:91%;width:36%;opacity:.4">');
  };

  EB.STILLS.push(205.8, 207.8, 209.8, 211.6, 214.3, 216.8);
})();
