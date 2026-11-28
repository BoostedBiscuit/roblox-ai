// =====================================================================================
// CHAPTER 1 · THE SILENT RECORD (Old Town Stairway + the record shop)
// Cold open ("In this town…": wide over the town, the sign falls, freeze, glide down to Dante) → rewind → "10 MINUTES EARLIER" → the street → the shop → the golden record
// → top of the stairs, play → one note, the city goes silent (ゴゴゴゴ) → the sign falls → HIBIKI bursts out and
// punches it to pieces → "What… are you?" → 「俺はお前の響きだ。」 → pose + name card → pull back over the city.
// Times come from the voice lines: S('label') / E('label') (see the NARRATION block in echo-breakers-full.html).
// World units: a person is ~2.4 tall. The stairs climb toward −z: bottom z 0 (y 0) → top edge z −29 (y 10).
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, D, F, fx3, A, dante, hibiki, walkers, put, pose, walk, echoAt, beside, popIn, ramp, head, lookYaw, player, spinDisc, handRecord } = EB;
  const { clamp, lerp, ease, easeOut } = RT;

  // ---------- key places (world units) ----------
  const DP = [-2.6, 10, -30.4];                     // where Dante plays the record: the top of the stairs, facing down them (+z)
  const PLAYER_AT = [-1.25, 10, -29.65];            // the portable record player on the ground beside him
  const st = () => EB.loc('stairway');
  const ground = (x, z) => st().groundAt(x, z);

  // ---------- the big HOTEL AURORA sign (design units inside the stairway group) ----------
  // It hangs from the left building; when it falls it swings off its bracket toward Dante and is punched at T_HIT.
  const T_FALL = E('silent', 0.22), T_HIT = E('silent', 1.97);                          // falling starts / HIBIKI's fist lands
  EB.T_HIT = T_HIT;
  const P0 = new THREE.Vector3(-13.3, 31.5, -54), P1 = new THREE.Vector3(-12.6, 28.2, -60.6);
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), qT = new THREE.Quaternion(), qX = new THREE.Quaternion();
  const signU = (t) => clamp((t - T_FALL) / (T_HIT - T_FALL), 0, 1);
  function setSign(u, jolt = 0) {                                                        // u = 0 (hanging) … 1 (above Dante's head)
    const s = st().props.bigSign;
    s.position.copy(P0).lerp(P1, u * u);
    qT.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 1.2 * Math.pow(u, 1.2) + jolt);
    qX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.22 * u);
    s.quaternion.copy(qT).multiply(qX).multiply(qY);
    return s;
  }
  const SIGN_HIT = V(-2.6, 12.9, -30.3);                                                 // the middle of the sign when it is hit (world)

  // Dante at the top, looking up at the falling sign (shared by the cold open and the real fall)
  function danteLooksUp(t, lt, arms = 0) {
    put(dante, DP, 0.15);
    pose(dante, arms ? 'block' : 'idle', lt, { face: 'shocked', mod: { hx: -0.62, hy: -0.25, ...(arms ? {} : { aLf: 0.5, aRf: 0.45, eL: 1.0, eR: 1.0, aLo: 0.2, aRo: 0.2 }) } });
    put(player, PLAYER_AT, 0.3); spinDisc.rotation.y = -t * 3.4;
  }

  // ======================= COLD OPEN: "In this town, one note can change everything." =======================
  // One unbroken camera move. High and wide over the town; the big sign tears off its bracket and drops toward the
  // boy at the top of the stairs… time freezes on "everything". "That's me." — the camera sinks down to him, frozen
  // under the sign. Then the picture rewinds.
  const FREEZE = WD('town', 'everything'), FALL0 = FREEZE - 0.75, RW0 = E('me', 0.1), RW1 = RW0 + 0.88;
  const HIGH = [[11, 31, 34], [9.5, 27, 26]], HIGH_LOOK = [[-3, 19, -40], [-2.8, 16, -36]];
  const LOW_END = [3.8, 11.3, -26.4], LOW_LOOK = [-4.0, 13.2, -29.8], U_FROZEN = 0.5;   // (front-right; the frozen sign hangs just above him)
  const DOWN0 = S('me', 0.05), DOWN1 = WD('me', 'giant') + 0.1;                         // the glide down to Dante
  EB.shot({ t0: 0, loc: 'stairway', fov: [50, 52], shadow: 30, bloom: 0.6, ease: 'linear', moveDur: RW0,
    pos: (lt) => {
      const a = V(...HIGH[0]).lerp(V(...HIGH[1]), easeOut(clamp(lt / DOWN0, 0, 1)));
      return a.lerp(V(...LOW_END), ease(clamp((lt - DOWN0) / (DOWN1 - DOWN0), 0, 1)));
    },
    look: (lt) => {
      const a = V(...HIGH_LOOK[0]).lerp(V(...HIGH_LOOK[1]), clamp(lt / DOWN0, 0, 1));
      return a.lerp(V(...LOW_LOOK), ease(clamp((lt - DOWN0) / (DOWN1 - DOWN0), 0, 1)));
    },
    locT: (t) => Math.min(t, FREEZE) + 21,
    run(t) {
      const ft = Math.min(t, FREEZE);                                                     // time stops at FREEZE
      const u = ft < FALL0 ? 0 : U_FROZEN * Math.pow((ft - FALL0) / (FREEZE - FALL0), 1.3);
      setSign(u, ft < FALL0 ? Math.sin(ft * 70) * 0.04 * ramp(ft, FALL0 - 0.35, 0.1) : 0);   // it shudders, then drops
      danteLooksUp(ft + 25.5, ft < FALL0 ? 0.2 : ft - FALL0 + 0.3, 0);
    } });
  F.flash(FREEZE, 0.16, '#ffffff', 0.55).grade(FREEZE, RW0 + 0.05, { sat: 0.35, contrast: 1.18, fade: 0.05 }).lines(FREEZE, RW0, { kind: 'focus', color: '#ffffff', amount: 0.6 })
    .vignette(FREEZE, RW0, 0.7, 0.1).sfx(WD('me', 'crushed'), RW0, '！？', { x: 74, y: 24, size: 20, rot: 10 });

  // ======================= REWIND → "10 MINUTES EARLIER" =======================
  EB.shot({ t0: RW0, loc: 'stairway', pos: [LOW_END, [3, 6, 4]], look: [LOW_LOOK, [-2.5, 9, -24]], fov: [52, 55], ease: 'in', moveDur: RW1 - RW0,
    locT: (t) => 21 - (t - RW0) * 6,
    run(t) {
      const k = (t - RW0) / (RW1 - RW0);                                                // time runs backward fast
      setSign(lerp(U_FROZEN, 0, Math.min(1, k * 1.6)));
      danteLooksUp(25.5 - k * 3, Math.max(0.2, 1.25 - k), 0);
    } });
  F.rewind(RW0, RW1).grade(RW0, RW1, { sat: 0.5, contrast: 1.25, hue: -25, fade: 0.04 }).lines(RW0, RW1, { kind: 'speed', color: '#ffffff', amount: 0.55, angle: Math.PI / 2 });
  const CARD10 = RW1;
  F.card(CARD10, CARD10 + 1.25, { kind: 'text', text: '10 MINUTES EARLIER', top: 28 });

  // ======================= "My name is Dante Ferro." … "the kid nobody notices." (the top street) =======================
  const W0 = RW1, SHOP_T = S('shop', -0.15);
  const DX = (t) => 14.5 - 1.25 * (t - W0);                                               // Dante walks along the top street toward −x
  EB.shot({ t0: W0, loc: 'stairway', fov: [46, 44], shadow: 14, dissolve: true, xfade: 0.6,      // (the rewind dissolves into the morning)
    pos: (lt) => V(DX(W0 + lt) - 4.6, 11.45, -32.4), look: (lt) => V(DX(W0 + lt) + 0.3, 11.25, -35.4),
    run(t, lt) {
      walk(dante, [[14.5, 10, -35.2], [-10, 10, -35.2]], W0, 1.25, t, { face: 'neutral' });
      // people pass by without looking at him
      const people = [[walkers[0], [[-4, 10, -38.2], [22, 10, -38.2]], 1.5, 0], [walkers[1], [[2, 10, -40.0], [26, 10, -40.0]], 1.35, 0.6], [walkers[2], [[24, 10, -37.4], [-6, 10, -37.4]], 1.4, 1.2],
        [walkers[3], [[-2, 10, -42.5], [20, 10, -42.5]], 1.3, 0.2], [walkers[4], [[20, 10, -43.6], [-4, 10, -43.6]], 1.2, 0.9]];   // (all behind him: never between him and the camera)
      for (const [w, pts, sp, d] of people) walk(w, pts, W0 - d * 2, sp, t);
    } });
  F.card(CARD10 + 1.3, E('nobody', -0.3), { kind: 'name', name: 'DANTE FERRO', sub: '16 · HEADPHONES ALWAYS ON', color: '#2f6fd8' });

  // ======================= "That morning, I found a record shop I'd never seen before." =======================
  const SHOP = [8.5, 10, -44.6];
  EB.shot({ t0: SHOP_T, loc: 'stairway', pos: [[11.6, 11.3, -33.6], [11.0, 11.5, -35.0]], look: [[8.6, 12.0, -44.6], [8.5, 12.6, -45.4]], fov: [48, 44], shadow: 12,
    run(t, lt) {
      walk(dante, [[9.6, 10, -37.2], [8.7, 10, -42.6]], SHOP_T, 1.3, t, { end: 'look', endYaw: Math.PI, face: 'surprised', endMod: { hx: -0.25 } });
      fx3.goldNotes.set(t, V(8.5, 10.6, -45.2), 1.2, 0.6, 2.4);                           // a faint golden shimmer at the door
    } });

  // ======================= "In the back… a golden record. No name. No price." (inside the shop) =======================
  const IN_T = S('back', -0.2), REACH = WD('back', 'golden') - 0.25, GRAB = REACH + 0.45;
  const CRATE_STAND = [-1.95, 0, -1.45], CRATE = [-3.0, 0, -2.8];
  EB.shot({ t0: IN_T, loc: 'recordShop', pos: [[2.2, 2.5, 0.4], [1.3, 2.25, -0.4]], look: [[-1.8, 1.3, -1.9], [-2.7, 1.15, -2.6]], fov: [50, 46], moveDur: REACH - IN_T, shadow: 8, bloom: 0.8,
    run(t, lt) {
      const rs = EB.loc('recordShop');
      walk(dante, [[0.9, 0, 2.6], CRATE_STAND], IN_T, 2.6, t, { end: 'reach', endYaw: lookYaw(CRATE_STAND, CRATE), face: 'surprised' });
      put(EB.walkers[5], [2.5, 0, -0.65], 0); pose(EB.walkers[5], 'idle', t, { face: 'neutral' });   // the old shopkeeper behind the counter
      rs.props.golden.visible = t < GRAB; handRecord.visible = t >= GRAB;
      fx3.goldNotes.set(t, V(-3, 1.0, -2.8), 0.8, t < GRAB ? 0.8 : 0, 1.6);
    } });
  // close-up: holding it up, "No name. No price."
  const HOLD_T = WD('back', 'no') - 0.2;
  EB.shot({ t0: HOLD_T, loc: 'recordShop', pos: [[0.55, 2.0, 1.25], [0.35, 1.95, 0.95]], look: [[-1.95, 1.45, -1.45], [-1.95, 1.5, -1.45]], fov: [54, 50], shadow: 6, bloom: 0.9,
    run(t, lt) {
      put(dante, CRATE_STAND, lookYaw(CRATE_STAND, [0.15, 0, 0.75]) - 0.35);
      pose(dante, 'idle', t, { face: 'surprised', mod: { aRf: 1.25, eR: 1.35, aRt: 0.35, aLf: 0.7, eL: 1.2, hx: 0.25 } });
      handRecord.visible = true; EB.loc('recordShop').props.golden.visible = false;
      key.intensity = 0.45; key.position.set(1, 3, 2); key.target.position.set(-2, 1.5, -1.5);
    } });
  const key = EB.key;

  // ======================= "So I took it to the top of the old stairs… and pressed play." =======================
  const PLAY_T = S('play', -0.15), PRESS = WD('play', 'play') - 0.1;
  EB.shot({ t0: PLAY_T, loc: 'stairway', pos: [[1.4, 11.0, -26.6], [1.0, 10.85, -27.2]], look: [[-2.1, 10.8, -30.2], [-2.0, 10.6, -30.2]], fov: [46, 42], shadow: 10,
    run(t, lt) {
      put(dante, DP, 0.55); pose(dante, 'kneel', lt, { face: 'neutral', mod: t > PRESS - 0.5 ? { aRf: 0.85, eR: 0.6, aRo: -0.25 } : {} });
      handRecord.visible = t < PRESS - 0.4;
      put(player, PLAYER_AT, 0.3); spinDisc.visible = t >= PRESS - 0.4; spinDisc.rotation.y = -Math.max(0, t - PRESS) * 3.4;
    } });

  // ======================= ONE NOTE. The world goes grey and quiet; ゴゴゴゴ builds. =======================
  const NOTE_T = E('play', 0.15), WIDE_T = NOTE_T + 0.95, FROZEN = NOTE_T + 0.2;
  EB.shot({ t0: NOTE_T, loc: 'stairway', pos: [[-0.2, 10.95, -28.6], [-0.35, 10.8, -28.85]], look: [[-1.25, 10.38, -29.65], [-1.25, 10.38, -29.65]], fov: [50, 44], shadow: 6, bloom: 0.6,
    locT: () => FROZEN,
    run(t, lt) {
      put(dante, DP, 0.55); pose(dante, 'kneel', 2, { face: 'surprised' });
      put(player, PLAYER_AT, 0.3); spinDisc.rotation.y = -(t - PRESS) * 3.4;
      fx3.goldNotes.set(t, V(-1.25, 10.4, -29.65), 0.6, 1, 1.8);
      fx3.ground.set(V(-1.25, 10.42, -29.65), V(0, 1, 0), ((t - NOTE_T) % 0.9) / 0.9, 3);   // the note ripples out
    } });
  // wide: the whole stairway frozen (people stop mid-step, the gulls stop in the air)
  const SNAP_T = E('silent', 0.1);
  EB.shot({ t0: WIDE_T, loc: 'stairway', pos: [[4.2, 3.1, 9.5], [5.0, 3.6, 12.5]], look: [[-2.0, 9.6, -26], [-2.0, 10.0, -26]], fov: [48, 48], moveDur: SNAP_T - WIDE_T, shadow: 30,
    locT: () => FROZEN,
    run(t, lt) {
      put(dante, DP, 0.1); pose(dante, 'look', Math.max(0, t - S('silent')), { face: 'surprised', opts: {} });
      put(player, PLAYER_AT, 0.3); spinDisc.rotation.y = -(t - PRESS) * 3.4;
      const frozen = [[walkers[0], [2.4, 0, -10.6], 0.3], [walkers[1], [-3.6, 0, -18.2], 2.9], [walkers[2], [1.2, 0, 3.5], -0.4], [walkers[3], [-4.5, 0, -3.5], 1.2]];
      for (const [w, p, y] of frozen) { put(w, [p[0], ground(p[0], p[2]), p[2]], y); A.apply(w, A.pose('walk', 0, { phase: 1.1 })); }
    } });
  F.grade(NOTE_T + 0.1, SNAP_T + 1.6, { sat: 0.2, contrast: 1.1, bright: 0.95, tint: '#6b2aa8', tintAmt: 0.25, fade: 0.6, fadeOut: 0.2 })
    .vignette(NOTE_T + 0.2, SNAP_T + 1.5, 0.75, 0.5)
    .sfx(NOTE_T + 0.4, SNAP_T + 0.2, 'ゴゴゴゴ', { kind: 'menace', x: 74, y: 30, size: 15, rot: 8, color: '#b44cff' })
    .sfx(NOTE_T + 1.2, SNAP_T + 0.2, 'ゴゴゴ', { kind: 'menace', x: 26, y: 48, size: 11, rot: -6, color: '#b44cff' });

  // ======================= the sign snaps =======================
  EB.shot({ t0: SNAP_T, loc: 'stairway', pos: [[-4.0, 14.6, -24.9], [-4.1, 14.7, -25.2]], look: [[-6.4, 15.3, -27.2], [-6.4, 15.0, -27.4]], fov: [42, 42], shadow: 10, shake: 0.008,
    locT: () => FROZEN,
    run(t) { setSign(t < T_FALL ? 0 : signU(t) * 0.6, t < T_FALL ? Math.sin(t * 70) * 0.05 * ramp(t, SNAP_T, 0.05) : 0); } });
  F.sfx(SNAP_T + 0.05, SNAP_T + 0.7, 'バキッ', { x: 66, y: 30, size: 13, rot: -10 });

  // ======================= it falls… HIBIKI bursts out and punches it to pieces =======================
  const FALL_SHOT = T_FALL + 0.35, BURST = T_HIT - 0.45;
  EB.shot({ t0: FALL_SHOT, loc: 'stairway', pos: [[3.6, 8.0, -20.4], [3.9, 8.3, -19.6]], look: [[-2.4, 12.3, -29.5], [-2.4, 12.8, -29.4]], fov: [54, 58], ease: 'out', shadow: 14, bloom: 0.9,
    shake: 0.004, kicks: [BURST, T_HIT + 0.07], kickAmp: 0.14,
    run(t, lt) {
      const hit = t >= T_HIT;
      if (!hit) setSign(signU(t)); else st().props.bigSign.visible = false;
      danteLooksUp(t, lt + 0.3, t > BURST - 0.25 ? 1 : 0);
      if (t >= BURST) {                                                                   // HIBIKI: out of his back, rising, punching up
        const p = popIn(t, BURST, 0.3), pos = beside(dante, 0.25, 0.55, 0.7 * p);
        const ec = echoAt(hibiki, pos, 0.15, t, { power: Math.min(1, p * 1.4), scale: 0.4 + 0.6 * p, move: t < T_HIT + 0.55 ? 'barrage' : 'guard', lt: t - BURST });
        ec.rotation.order = 'YXZ'; ec.rotation.x = t < T_HIT + 0.55 ? -0.75 : -0.25;
        const chest = head(hibiki, -1.2);
        fx3.barrage.set(t, chest, SIGN_HIT.clone().sub(chest), t < T_HIT + 0.5 ? 1 : Math.max(0, 1 - (t - T_HIT - 0.5) * 4), 1.4, 2.6);
      }
      fx3.wave.set(head(dante, -0.8), V(0, 1, 0), (t - BURST) / 0.6, 6);
      fx3.dust.set(V(DP[0], DP[1], DP[2]), t - BURST, 1.2, 2.0);                            // the burst blows dust off the steps
      fx3.debris.set(SIGN_HIT, t - T_HIT, 1.2, 1.4, 10.05);
      fx3.wave2.set(SIGN_HIT, V(0, -1, 0.3), (t - T_HIT) / 0.5, 5);
    } });
  F.flash(BURST, 0.25, '#bfe6ff', 1).impact(T_HIT, 0.07).flash(T_HIT + 0.07, 0.2, '#ffffff', 0.9)
    .sfx(BURST + 0.02, BURST + 0.8, 'ドン!', { x: 30, y: 58, size: 17, rot: -12, shadow: '#2f7fe0' })
    .sfx(T_HIT, T_HIT + 0.95, 'バキッ!!', { x: 62, y: 22, size: 19, rot: 9 })
    .lines(BURST, T_HIT + 0.9, { kind: 'focus', color: '#ffffff', amount: 0.8, cy: -120 });

  // ======================= "What… are you?" =======================
  const WHAT_T = S('what', -0.05), HB = [-2.6, 10, -27.5];                               // HIBIKI floats in front of him, facing him
  EB.shot({ t0: WHAT_T, loc: 'stairway', pos: [[-1.35, 10.75, -32.6], [-1.45, 10.8, -32.3]], look: [[-2.7, 13.0, -27.6], [-2.7, 13.3, -27.6]], fov: [48, 46], shadow: 12, bloom: 0.8,
    run(t, lt) {
      put(dante, DP, 0); pose(dante, 'idle', lt, { face: 'scared', mod: { hx: -0.45, lean: -0.05 } });
      put(player, PLAYER_AT, 0.3); spinDisc.rotation.y = -t * 3.4;
      echoAt(hibiki, HB, Math.PI, t, { move: 'power', lt: lt + 1, float: 0.6 });
      fx3.rubble.set(V(-2.6, 13, -29.5), t - T_HIT, 0.5, 0.6, 10.05);
    } });
  // 「俺はお前の響きだ。」 HIBIKI up close: glowing eyes
  const ECHO1_T = S('echo1', -0.1);
  EB.shot({ t0: ECHO1_T, loc: 'stairway', pos: (lt) => head(hibiki, 0).add(V(0.55, -1.2 + lt * 0.08, -2.4 + lt * 0.18)), look: () => head(hibiki, -0.15), fov: [44, 38], ease: 'linear', shadow: 10, bloom: 1.0,
    run(t, lt) {
      put(dante, DP, 0); pose(dante, 'idle', lt, { face: 'surprised', mod: { hx: -0.45 } });
      echoAt(hibiki, HB, Math.PI, t, { move: 'power', lt: lt + 2, float: 0.6 });
    } });
  F.lines(ECHO1_T, E('echo1', 0.2), { kind: 'focus', color: '#bfe6ff', amount: 0.45 });

  // ======================= freeze pose + name card ECHO: HIBIKI 「響」 =======================
  const POSE_T = E('echo1', 0.15);
  EB.shot({ t0: POSE_T, loc: 'stairway', pos: [[-1.6, 9.2, -23.6], [-1.5, 9.0, -23.0]], look: [[-2.6, 12.0, -29.2], [-2.6, 12.1, -29.2]], fov: [50, 50], shadow: 12, bloom: 0.85,
    run(t, lt) {
      put(dante, DP, 0); pose(dante, 'power', 1.2, { face: 'determined' });
      echoAt(hibiki, beside(dante, 0.95, 1.15), 0, t, { move: 'guard', lt: 1.5, float: 0.45 });
    } });
  F.flash(POSE_T, 0.15, '#ffffff', 0.7).grade(POSE_T, S('made', -0.05), { contrast: 1.18, sat: 1.15, fade: 0.05 })
    .card(POSE_T + 0.08, S('made', 0.1), { kind: 'echo', name: 'HIBIKI', kanji: '響', color: '#3f9bff' })
    .sfx(POSE_T + 0.1, S('made', 0.05), 'ドドド', { kind: 'menace', x: 78, y: 55, size: 12, rot: 10, color: '#5aa8ff', glow: '#1a4fb0' });

  // ======================= "A spirit made of sound. Made from… me." pull back over the city =======================
  const MADE_T = S('made', -0.05);
  EB.shot({ t0: MADE_T, loc: 'stairway', pos: [[-1.3, 11.6, -22.5], [6.5, 27, 24]], look: [[-2.6, 11.6, -30.0], [-2.0, 9, -30]], fov: [48, 52], moveDur: E('made', 0.1) - MADE_T, shadow: 30,
    run(t, lt) {
      put(dante, DP, 0); pose(dante, 'idle', lt, { face: 'determined' });
      echoAt(hibiki, beside(dante, 0.95, 1.15), 0, t, { move: 'crossArms', lt: lt + 1, float: 0.45 });
      put(player, PLAYER_AT, 0.3); spinDisc.rotation.y = -t * 3.4;
    } });

  EB.STILLS = [0.5, 1.5, 2.4, 3.6, 4.6, 5.5, 5.7, 7.3, 10.2, 13.7, 17.3, 18.2, 20.7, 22.5, 24.7, 26.9, 28.0, 28.5, 29.2, 30.3, 31.9, 34.0, 37.2];
})();
