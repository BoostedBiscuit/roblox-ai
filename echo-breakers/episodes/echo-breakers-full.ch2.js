// =====================================================================================
// CHAPTER 2 · MIRAGE GIRL (Fountain Piazza)
// Dante walks into the piazza → a copy of himself punches him ("By me.") → HIBIKI blocks the next punch → ten copies
// and fake walls (KAGEROU's mirages) → HIBIKI smashes the copies, punches a wall, it melts → Aurora on the fountain
// rim → KAGEROU appears 「見えるものが、真実とは限らない。」 → name cards → Aurora warns him about Maestro Vahl
// (a flash of Vahl in the dark) → Dante facepalms: "…I already have a final boss."
// World units (the piazza is centered on the fountain at 0,0,0; basin radius 4.8, rim top y 0.72).
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, F, fx3, A, dante, aurora, vahl, hibiki, kagerou, shuen, copies, put, pose, walk, echoAt, beside, popIn, ramp, head, lookYaw, hitStop } = EB;
  const { clamp, lerp, ease, easeOut } = RT;

  // (no chapter card: the last picture of the city dissolves straight into the piazza)
  const START = S('punched', -0.25);

  const DSTOP = [2.2, 0, 10.0], C0 = [2.3, 0, 10.5];                                    // where Dante stops / the center of the copy ring
  const T_PUNCH = WD('punched', 'punched') + 0.05, T_ME = WD('punched', 'me') - 0.1;
  const COPY_HIT = [1.75, 0, 8.85];                                                       // the first copy, in front of him
  // Dante gets punched: knocked back 1.2 units
  // (the punch lands with a hit-stop: everything holds 0.1 s, then he is knocked back and skids, scuffing dust)
  function danteHit(t) {
    t = hitStop(t, [T_PUNCH], 0.1);
    if (t < T_PUNCH) { walk(dante, [[3.4, 0, 13.6], DSTOP], START, 1.3, t, { end: 'idle', endYaw: Math.PI, face: 'neutral' }); return; }
    const k = easeOut(clamp((t - T_PUNCH) / 0.45, 0, 1));
    put(dante, [lerp(DSTOP[0], 2.6, k), 0, lerp(DSTOP[2], 11.2, k)], Math.PI);
    fx3.dust.set(V(lerp(DSTOP[0], 2.6, k), 0, lerp(DSTOP[2], 11.2, k)), t - T_PUNCH, 0.7, 1.0);
    pose(dante, t < T_PUNCH + 1.4 ? 'knockback' : 'idle', t - T_PUNCH, { face: t < T_PUNCH + 1.4 ? 'pain' : 'shocked' });
  }
  function copyPunch(t, c, t0) {                                                          // a copy runs in from behind the fountain and punches
    t = hitStop(t, [T_PUNCH], 0.1);
    walk(c, [[-2.6, 0, 5.9], COPY_HIT], t0 - 1.25, 4.2, t, { gait: 'run', end: 'idle', endYaw: lookYaw(COPY_HIT, DSTOP) });
    if (t >= t0 - 0.12) pose(c, 'punch', t - t0 + 0.12, { face: 'smirk' });
    c.setHaze(t, 0.92); c.rig.setFace('smirk');
  }

  // A · wide: Dante crossing the piazza (pigeons, cafés)
  EB.shot({ t0: START, loc: 'piazza', pos: [[15, 8.5, 30], [12.5, 6.5, 25]], look: [[1.5, 1.2, 6], [1.8, 1.4, 7]], fov: [50, 46], ease: 'out', shadow: 22,
    run(t) { danteHit(t); } });
  // B · side two-shot: the copy runs in and punches him in the face
  const B_T = T_PUNCH - 1.0;
  EB.shot({ t0: B_T, loc: 'piazza', pos: [[6.6, 2.1, 11.6], [6.2, 2.0, 11.2]], look: [[2.0, 1.7, 9.6], [2.1, 1.6, 9.9]], fov: [46, 44], shadow: 10, shake: 0, kicks: [T_PUNCH + 0.1], kickAmp: 0.1,
    run(t) { danteHit(t); copyPunch(t, copies[0], T_PUNCH); } });
  F.impact(T_PUNCH, 0.07).flash(T_PUNCH + 0.07, 0.15, '#ffffff', 0.7).sfx(T_PUNCH, T_PUNCH + 0.8, 'ドゴッ!', { x: 34, y: 34, size: 16, rot: -12 })
    .lines(T_PUNCH, T_PUNCH + 0.5, { kind: 'focus', amount: 0.7 });
  // C · "By me." the copy's grinning face
  EB.shot({ t0: T_ME, loc: 'piazza', pos: [[0.5, 1.95, 10.9], [0.6, 1.95, 10.6]], look: () => head(copies[0], -0.05), fov: [40, 36], shadow: 8,
    run(t) { danteHit(t); copyPunch(t, copies[0], T_PUNCH); pose(copies[0], 'idle', t, { face: 'smirk', mod: { aRf: 0.4, eR: 1.2 } }); } });
  // D · it attacks again: HIBIKI appears and blocks (sparks)
  const D_T = E('punched', 0.02), LUNGE = D_T + 0.55, BLOCK = LUNGE + 0.22;
  EB.shot({ t0: D_T, loc: 'piazza', pos: [[7.8, 2.6, 8.2], [7.4, 2.4, 8.8]], look: [[2.0, 1.9, 10.0], [2.0, 1.9, 10.1]], fov: [48, 46], shadow: 12, bloom: 0.8,
    kicks: [BLOCK + 0.1], kickAmp: 0.12,
    run(t0, lt0) {
      const t = hitStop(t0, [BLOCK], 0.1), lt = t - D_T;                                     // (a beat of stillness when fist meets arms)
      put(dante, [2.6, 0, 11.2], Math.PI); pose(dante, 'block', lt, { face: 'scared' });
      const c = copies[0], back = t > BLOCK ? easeOut(clamp((t - BLOCK) / 0.35, 0, 1)) * 1.4 : 0;
      put(c, [COPY_HIT[0] - back * 0.2, 0, COPY_HIT[2] - back], lookYaw(COPY_HIT, DSTOP)); c.setHaze(t, 0.92);
      pose(c, t < BLOCK ? 'punch' : 'knockback', t < BLOCK ? t - LUNGE + 0.1 : t - BLOCK, { face: 'smirk' });
      fx3.dust.set(V(COPY_HIT[0] - back * 0.2, 0, COPY_HIT[2] - back), t - BLOCK, 0.7, 1.0);
      if (t > LUNGE - 0.2) {
        const p = popIn(t, LUNGE - 0.2, 0.25);
        echoAt(hibiki, [2.35, 0, 10.05], Math.PI, t, { power: Math.min(1, p * 1.3), scale: 0.5 + 0.5 * p, move: 'block', lt: t - LUNGE });
        fx3.sparks.set(V(2.0, 2.0, 9.6), t - BLOCK, 0.5, 0.8);
        fx3.wave2.set(V(2.0, 2.0, 9.5), V(0, 0, 1), (t - BLOCK) / 0.4, 2.5);
      }
    } });
  F.flash(LUNGE - 0.2, 0.2, '#bfe6ff', 0.9).sfx(BLOCK, BLOCK + 0.8, 'ガキン!', { x: 60, y: 30, size: 15, rot: 8, shadow: '#2f7fe0' });

  // E · "Then there were ten of me. Fake walls. Fake doors." ten copies in a ring + heat-haze walls (high orbit)
  const TEN_T = S('ten', -0.1), ringPos = (i, t, r = 4.6) => { const a = (i / 10) * Math.PI * 2 + (t - TEN_T) * 0.35; return [C0[0] + Math.sin(a) * r, 0, C0[2] + Math.cos(a) * r]; };
  // the smash: HIBIKI dashes at four copies one by one (dash → punch), then spins into a barrage that takes out the rest
  const SMASH_ORDER = [3, 5, 2, 4, 6, 7, 8, 9, 0, 1];
  const hitTime = (i, from) => { const k = SMASH_ORDER.indexOf(i); return from + (k < 4 ? k * 0.3 + 0.12 : 1.25 + (k - 4) * 0.09); };
  const WALLS = [[0, -6.2, 0], [6.0, 0, Math.PI / 2], [-5.6, 2.4, Math.PI / 2.6], [-1.5, 6.0, 0.25]];   // (dx, dz, yaw) around C0
  function ring(t, smashFrom = 1e9) {
    copies.forEach((c, i) => {
      const appear = ramp(t, TEN_T + 0.1 + i * 0.1, 0.25), hit = hitTime(i, smashFrom), gone = ramp(t, hit + 0.12, 0.3);
      if (appear <= 0 || gone >= 1) { c.visible = false; return; }
      const thrown = t > hit ? easeOut(clamp((t - hit) / 0.3, 0, 1)) * 1.3 : 0;            // knocked outward by the blow
      const p = ringPos(i, Math.min(t, smashFrom), 4.6 + thrown); put(c, p, lookYaw(p, C0)); c.setHaze(t + i, 0.9 * appear * (1 - gone));
      pose(c, t > hit ? 'knockback' : 'guard', t > hit ? t - hit : t + i * 0.3, { face: 'smirk' });
      if (t > hit) fx3.hazeBits.set(V(p[0], 1.4, p[2]), t - hit, 0.35, 0.6);
    });
  }
  function walls(t, meltAt = 1e9) {
    WALLS.forEach(([dx, dz, yaw], i) => { const rise = easeOut(ramp(t, TEN_T + 0.9 + i * 0.25, 0.5)), melt = ramp(t, meltAt, 0.9);
      fx3.walls[i].set(V(C0[0] + dx, 0, C0[2] + dz), yaw, rise * (1 - (i === 0 ? melt * 0.85 : 0)), 0.62 * (i === 0 ? 1 - melt : 1), t); });
  }
  EB.shot({ t0: TEN_T, loc: 'piazza', pos: (lt) => { const a = 0.6 + lt * 0.18; return V(C0[0] + Math.sin(a) * 10, 9.5 - lt * 0.4, C0[2] + Math.cos(a) * 10); }, look: [C0.map((v, k) => (k === 1 ? 1.0 : v))], fov: [50, 50], ease: 'linear', shadow: 16,
    run(t, lt) {
      put(dante, C0, Math.PI + Math.sin(lt * 1.4) * 1.2); pose(dante, 'guard', lt, { face: 'scared', mod: { hy: Math.sin(lt * 2.1) * 0.5 } });
      echoAt(hibiki, beside(dante, 0.9, 1.1), dante.rotation.y, t, { move: 'guard', lt: lt + 1 });
      ring(t); walls(t);
    } });
  F.grade(TEN_T, E('ten', 0.1), { tint: '#ff8a2a', tintAmt: 0.12, sat: 1.1, fade: 0.3 });

  // F · HIBIKI smashes the copies (barrage sweeping around)
  const SMASH_T = E('ten', 0.05), SMASH0 = SMASH_T + 0.2;
  EB.shot({ t0: SMASH_T, loc: 'piazza', pos: [[C0[0] + 4.2, 2.2, C0[2] + 5.0], [C0[0] + 3.4, 2.6, C0[2] + 5.6]], look: [[C0[0], 1.8, C0[2]], [C0[0], 2.0, C0[2] - 1]], fov: [56, 58], shadow: 12, shake: 0.012, bloom: 0.9,
    kicks: [0, 1, 2, 3].map((k) => SMASH0 + k * 0.3 + 0.12), kickAmp: 0.09,
    run(t, lt) {
      put(dante, C0, Math.PI); pose(dante, 'guard', lt + 2, { face: 'determined' });
      const HOME = beside(dante, 0, -0.9);
      const ang = (i) => (i / 10) * Math.PI * 2 + (SMASH0 - TEN_T) * 0.35, near = (i) => [C0[0] + Math.sin(ang(i)) * 3.2, 0, C0[2] + Math.cos(ang(i)) * 3.2];
      const u = t - SMASH0; let at = HOME, yaw = Math.PI, move = 'guard', mlt = lt, punch = 0;
      if (u >= 0 && u < 1.2) {                                                             // four dash-punches
        const k = Math.floor(u / 0.3), v = u - k * 0.3, from = k ? near(SMASH_ORDER[k - 1]) : HOME, to = near(SMASH_ORDER[k]), m = easeOut(clamp(v / 0.12, 0, 1));
        at = [lerp(from[0], to[0], m), 0, lerp(from[2], to[2], m)]; yaw = ang(SMASH_ORDER[k]); move = v < 0.06 ? 'guard' : 'punch'; mlt = v - 0.06; punch = v > 0.08 && v < 0.24 ? 1 : 0;
      } else if (u >= 1.2) {                                                               // back to Dante, spinning barrage
        const back = easeOut(clamp((u - 1.2) / 0.08, 0, 1)), last = near(SMASH_ORDER[3]);
        at = [lerp(last[0], HOME[0], back), 0, lerp(last[2], HOME[2], back)];
        yaw = u < 1.25 ? lerp(ang(4), ang(6), (u - 1.2) / 0.05) : ang(6) + (u - 1.25) * ((Math.PI * 2 / 10) / 0.09);
        move = 'barrage'; mlt = u; punch = u < 1.8 ? 1 : 0;
      }
      echoAt(hibiki, at, yaw, t, { move, lt: mlt });
      const chest = head(hibiki, -1.3), dir = V(Math.sin(yaw), -0.1, Math.cos(yaw));
      fx3.barrage.set(t, chest, dir, punch, 1.6, u < 1.2 ? 1.8 : 3.0);
      fx3.dust.set(V(at[0], 0, at[2]), u < 1.2 ? (u % 0.3) : u - 1.2, 0.6, 1.0);
      ring(t, SMASH0); walls(t);
    } });
  F.sfx(SMASH0, SMASH0 + 1.7, 'ドドドドド', { kind: 'menace', x: 50, y: 22, size: 13, rot: -6, color: '#5aa8ff', glow: '#1a4fb0' }).lines(SMASH0, SMASH0 + 1.8, { kind: 'speed', amount: 0.5, angle: 0.3 });
  // G · HIBIKI punches the fake wall: it melts into heat haze
  const WALL_T = SMASH_T + 2.0, WALL_HIT = WALL_T + 0.45;
  EB.shot({ t0: WALL_T, loc: 'piazza', pos: [[C0[0] + 1.6, 2.3, C0[2] + 3.2], [C0[0] + 1.2, 2.2, C0[2] + 2.6]], look: [[C0[0], 2.0, C0[2] - 6], [C0[0], 2.2, C0[2] - 6]], fov: [52, 48], shadow: 12, bloom: 0.9,
    run(t, lt) {
      put(dante, C0, Math.PI); pose(dante, 'idle', lt, { face: 'determined' });
      echoAt(hibiki, [C0[0] - 0.2, 0, C0[2] - 2.3], Math.PI, t, { move: t < WALL_HIT - 0.15 ? 'guard' : 'punch', lt: t - WALL_HIT + 0.15 });
      walls(t, WALL_HIT); fx3.hazeBits.set(V(C0[0], 1.8, C0[2] - 6), t - WALL_HIT, 0.6, 0.7);
      fx3.wave2.set(V(C0[0], 2.0, C0[2] - 5.9), V(0, 0, 1), (t - WALL_HIT) / 0.45, 3);
    } });
  F.impact(WALL_HIT, 0.06).sfx(WALL_HIT, WALL_HIT + 0.9, 'ドゴォ!', { x: 50, y: 26, size: 17, rot: 7 });
  // H · through the haze: a girl standing on the fountain rim
  const RIM = [0, 0.73, 4.45], REVEAL_T = WALL_HIT + 0.9;
  EB.shot({ t0: REVEAL_T, loc: 'piazza', pos: [[C0[0] + 1.9, 2.6, C0[2] + 4.4], [C0[0] + 1.6, 1.9, C0[2] + 4.0]], look: [[C0[0] - 0.6, 1.6, 5], [0.2, 2.6, 4.45]], fov: [50, 44], ease: 'inout', shadow: 12,
    run(t, lt) {
      put(dante, C0, Math.PI); pose(dante, 'idle', lt, { face: 'surprised' });
      put(aurora, RIM, 0.3); pose(aurora, 'crossArms', 2, { face: 'calm' });
      walls(t, WALL_HIT); fx3.hazeBits.set(V(C0[0], 1.8, C0[2] - 6), t - WALL_HIT, 0.6, 0.7);
    } });
  F.grade(REVEAL_T - 0.3, S('hunters', 0.2), { bright: 1.1, sat: 0.8, fade: 0.3 });

  // I · "You're not one of Vahl's hunters… are you?" (low angle behind Dante, up at Aurora on the rim)
  const AUR_YAW = lookYaw(RIM, C0);
  EB.shot({ t0: S('hunters', -0.15), loc: 'piazza', pos: [[4.9, 1.25, 11.6], [4.7, 1.2, 11.3]], look: [[0.1, 2.5, 4.45], [0.1, 2.6, 4.45]], fov: [44, 42], shadow: 10,
    run(t, lt) {
      put(dante, C0, lookYaw(C0, RIM)); pose(dante, 'idle', lt, { face: 'surprised', mod: { hx: -0.2 } });
      put(aurora, RIM, AUR_YAW); pose(aurora, 'crossArms', lt + 2, { face: 'calm' });
    } });
  // J · KAGEROU appears behind her: 「見えるものが、真実とは限らない。」
  const KG_T = S('kagerou', -0.3);
  EB.shot({ t0: KG_T, loc: 'piazza', pos: [[1.4, 0.95, 9.2], [1.2, 0.9, 8.6]], look: [[0, 3.0, 4.2], [0, 3.3, 4.0]], fov: [50, 48], shadow: 10, bloom: 0.9,
    run(t, lt) {
      put(dante, C0, lookYaw(C0, RIM)); pose(dante, 'idle', lt, { face: 'surprised' });
      put(aurora, RIM, AUR_YAW); pose(aurora, 'crossArms', lt + 4, { face: 'smirk' });
      const p = popIn(t, KG_T + 0.15, 0.4);
      echoAt(kagerou, beside(aurora, -0.3, 1.0, 0.1), AUR_YAW, t, { power: Math.min(1, p * 1.2), scale: 0.4 + 0.6 * p, move: 'guard', lt });
    } });
  F.flash(KG_T + 0.15, 0.2, '#ffd8a0', 0.8).lines(KG_T + 0.15, E('kagerou', 0.2), { kind: 'focus', color: '#ffe0b0', amount: 0.4 });
  // K · name card KAGEROU (hero shot with the heat blades)
  const KCARD = E('kagerou', 0.05);
  EB.shot({ t0: KCARD, loc: 'piazza', pos: [[-1.6, 1.6, 8.8], [-1.4, 1.7, 8.4]], look: [[0, 3.6, 3.6], [0, 3.7, 3.6]], fov: [52, 50], shadow: 10, bloom: 0.9,
    run(t, lt) {
      put(aurora, RIM, AUR_YAW); pose(aurora, 'handsOnHips', 1, { face: 'smirk' });
      echoAt(kagerou, beside(aurora, -0.3, 1.0, 0.1), AUR_YAW, t, { move: 'guard', lt: lt + 2 });
    } });
  F.flash(KCARD, 0.14, '#ffffff', 0.6).card(KCARD + 0.05, S('aurora', 0.05), { kind: 'echo', name: 'KAGEROU', kanji: '陽炎', color: '#ff8a2a' })
    .sfx(KCARD + 0.1, S('aurora', 0.05), 'ゴゴゴ', { kind: 'menace', x: 78, y: 58, size: 11, rot: 9, color: '#ffa040', glow: '#b04a00' });

  // L · "Aurora Vesper. Street artist." she jumps down and walks over
  const AU_T = S('aurora', -0.05), LAND = [0.4, 0, 6.4], NEAR = [1.4, 0, 8.6];
  function auroraDown(t) {
    const j = clamp((t - AU_T) / 0.7, 0, 1);
    if (j < 1) { put(aurora, [lerp(RIM[0], LAND[0], j), RIM[1] * (1 - j) + Math.sin(j * Math.PI) * 0.9, lerp(RIM[2], LAND[2], j)], AUR_YAW); pose(aurora, 'jump', j * 0.9, { face: 'calm' }); }
    else walk(aurora, [LAND, NEAR], AU_T + 0.7, 1.2, t, { end: 'idle', endYaw: lookYaw(NEAR, C0), face: 'calm' });
  }
  EB.shot({ t0: AU_T, loc: 'piazza', pos: [[5.6, 2.0, 10.8], [5.0, 1.9, 10.4]], look: [[1.0, 1.4, 7.4], [1.5, 1.6, 8.6]], fov: [48, 46], shadow: 12,
    run(t, lt) {
      put(dante, C0, lookYaw(C0, NEAR)); pose(dante, 'idle', lt, { face: 'neutral' });
      auroraDown(t);
      if (lt < 1.2) echoAt(kagerou, beside(aurora, -0.3, 1.0, 0.1), aurora.rotation.y, t, { power: 1 - lt / 1.2, move: 'guard', lt });
    } });
  F.card(AU_T + 0.2, E('aurora', 0.1), { kind: 'name', name: 'AURORA VESPER', sub: 'STREET ARTIST · ECHO: KAGEROU', color: '#e8632a' });

  // M · "The man hunting us is called Maestro Vahl. He steals Echoes. Yours is next." (+ a flash of Vahl in the dark)
  const VA_T = E('aurora', 0.05), MAESTRO = WD('vahl', 'maestro') - 0.08, YOURS = WD('vahl', 'yours') - 0.15;
  const twoShot = { pos: [[-0.4, 2.0, 6.9], [-0.2, 2.0, 7.2]], look: [[2.2, 1.7, 10.3], [2.2, 1.7, 10.3]], fov: [46, 44], shadow: 10,
    run(t, lt) {
      put(dante, C0, lookYaw(C0, NEAR)); pose(dante, 'idle', lt, { face: t > YOURS ? 'scared' : 'neutral' });
      put(aurora, NEAR, lookYaw(NEAR, C0)); pose(aurora, t > YOURS ? 'point' : 'talk', t > YOURS ? t - YOURS : lt, { face: 'serious' });
    } };
  EB.shot({ t0: VA_T, loc: 'piazza', ...twoShot });
  EB.shot({ t0: MAESTRO, loc: 'arena', pos: [[0.6, 1.4, 6.5], [0.4, 1.3, 5.6]], look: [[0, 3.6, -1], [0, 3.8, -1]], fov: [48, 46], shadow: 12, bloom: 1.0,
    run(t, lt) {
      put(vahl, [0, 0, 0], 0); pose(vahl, 'conduct', t);
      echoAt(shuen, [0, 0.3, -4.2], 0, t, { power: 0.8, move: 'raiseHand', lt: 2, orchestra: false });
      EB.fx3.notes.set(t, V(0, 2, -2), 5, 0.8, 6);
    } });
  F.grade(MAESTRO, MAESTRO + 0.85, { sat: 0.6, contrast: 1.3, bright: 0.8, tint: '#ff2a2a', tintAmt: 0.3, fade: 0.04 }).flash(MAESTRO, 0.1, '#000000', 1).vignette(MAESTRO, MAESTRO + 0.85, 1, 0.05);
  EB.shot({ t0: MAESTRO + 0.85, loc: 'piazza', ...twoShot });

  // N · "Great. Two days with superpowers… and I already have a final boss." (facepalm)
  const BOSS_T = S('boss', -0.1), PALM = WD('boss', 'already') - 0.2;
  EB.shot({ t0: BOSS_T, loc: 'piazza', pos: [[3.7, 2.0, 8.3], [3.6, 2.0, 8.6]], look: () => head(dante, -0.15), fov: [44, 42], shadow: 8,
    run(t, lt) {
      put(dante, C0, lookYaw(C0, [3.7, 0, 8.3])); pose(dante, t > PALM ? 'facepalm' : 'idle', t > PALM ? t - PALM : lt, { face: t > PALM ? 'sad' : 'neutral' });
      put(aurora, NEAR, lookYaw(NEAR, C0)); pose(aurora, 'handsOnHips', lt, { face: 'smirk' });
    } });

  EB.STILLS.push(40.8, 42.4, 43.8, 45.3, 48.0, 51.5, 53.4, 54.6, 56.0, 58.5, 60.8, 63.0, 67.3, 67.8, 71.8);
})();
