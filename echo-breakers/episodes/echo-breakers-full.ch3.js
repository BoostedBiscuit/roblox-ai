// =====================================================================================
// CHAPTER 3 · TEN SECONDS (Seaside Promenade)
// Vahl's masked hunters chase Dante and Aurora along the coast road → scooters, hunters leaping a car → Grant runs
// screaming ("Why is it ALWAYS me?!") → OMAMORI pops out 「十秒だけだぞ！」 → a 10-second countdown of perfect luck:
// a rolling car, a scooter, a falling lamp post and a fruit cart stop every hunter → 「あっ…時間切れ。」 → bad luck:
// Grant slips, bonks a lamp post, a seagull steals his hat ("My HAT!") → they escape, the hat doesn't.
// World units. The road runs along x (toward +x = where they run). Sea on −z: sea walk z −7…−3 (y 0.15),
// road z −3…5 (lanes at z ≈ −1 and 3), city walk z 5…8.5, buildings beyond.
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, D, F, fx3, A, dante, aurora, grant, hunters, omamori, hibiki, gull, flyingHat, put, pose, walk, echoAt, beside, popIn, ramp, head, lookYaw } = EB;
  const { clamp, lerp, ease, easeOut } = RT;
  const prom = () => EB.loc('promenade');
  const WALK_Y = 0.15;                                                                    // the sidewalks are 0.15 above the road

  // an orange on the ground (Grant slips on it)
  const orange = RT.mesh(new THREE.SphereGeometry(0.14, 12, 9), RT.plastic('#ff9a1f')); EB.scene.add(orange); EB.extra.push(orange);

  // ---------- chapter card ----------
  const CARD = E('boss', 0.1), START = S('road', -0.2);
  F.card(CARD, START, { kind: 'chapter', n: 3, title: 'TEN SECONDS' });

  // the chase: everyone runs toward +x. run(ch, x, z, t) = running pose at a spot
  const runAt = (ch, x, z, t, o = {}) => { put(ch, [x, o.y ?? WALK_Y, z], Math.PI / 2 + (o.yaw || 0)); A.apply(ch, Object.assign(A.pose('run', t, { phase: (x / 0.9) * Math.PI }), o.mod || {})); if (o.face) ch.rig.setFace(o.face); return ch; };
  const hunterFaces = () => hunters.forEach((h) => h.rig.setFace && h.rig.setFace('neutral'));

  // A · "Vahl's hunters found us on the seaside road." (camera ahead of them, running backward)
  const XR = (t) => -40 + 6.2 * (t - START);
  EB.shot({ t0: START, loc: 'promenade', pos: (lt) => V(XR(START + lt) + 7.5, 2.6, 2.4), look: (lt) => V(XR(START + lt) - 1.5, 1.4, -1.0), fov: [50, 50], ease: 'linear', shadow: 18, shake: 0.01,
    run(t) {
      const x = XR(t);
      runAt(dante, x, -1.7, t, { face: 'scared', y: 0 }); runAt(aurora, x - 1.2, -0.4, t + 0.3, { face: 'serious', y: 0 });
      hunters.forEach((h, i) => runAt(h, x - 7 - i * 1.5, -2.4 + (i % 3) * 1.4, t + i * 0.37, { y: 0 }));
    } });
  F.lines(START, E('road', 0.3), { kind: 'speed', amount: 0.45, angle: 0 });

  // B1 · scooters zip past (low on the road)
  const B1 = E('road', 0.3), B2 = E('road', 1.3), C_T = S('always', -0.45);
  EB.shot({ t0: B1, loc: 'promenade', pos: [[-8.6, 0.9, 7.3], [-8.3, 0.9, 7.1]], look: [[-8.4, 1.0, -1], [-8.0, 1.0, -1]], fov: [54, 54], shadow: 16,
    run(t, lt) {
      const sc = prom().props.scooters, xs = -16 + 16 * lt;
      sc[0].position.set(D(xs), 0, D(3.0)); sc[0].rotation.y = 0; sc[1].position.set(D(xs - 4), 0, D(1.2)); sc[1].rotation.y = 0;
      sc.slice(0, 2).forEach((s) => s.userData.wheels.forEach((w) => (w.rotation.z = -lt * 30)));
      const x = XR(t) - 30; runAt(dante, x + 4, -5.4, t); runAt(aurora, x + 2.8, -4.0, t + 0.3);
    } });
  // B2 · hunters leap over a car (cut from the Shorts)
  const CARX = -6;                                                                         // the purple car in the sea lane (world)
  EB.shot({ t0: B2, loc: 'promenade', pos: [[CARX + 1.5, 1.2, 7.0], [CARX + 2.2, 1.3, 6.6]], look: [[CARX - 1, 1.8, -1], [CARX, 2.0, -1]], fov: [52, 52], shadow: 12,
    run(t, lt) {
      hunters.slice(0, 3).forEach((h, i) => { const x = CARX - 5 + (lt - i * 0.25) * 7, over = Math.abs(x - CARX) < 2.6; runAt(h, x, -1.2 + i * 0.9, t + i, { y: over ? Math.cos(((x - CARX) / 2.6) * Math.PI / 2) * 2.4 : 0, mod: over ? { lLf: 0.9, kL: 1.2, lRf: -0.4, aLf: 2.2, aRf: 2.2 } : {} }); });
    } });
  F.sfx(B2 + 0.4, B2 + 1.3, 'シュッ', { x: 40, y: 30, size: 12, rot: -8 });
  // C · Grant runs out screaming → "Why is it ALWAYS me?!"
  EB.shot({ t0: C_T, loc: 'promenade', pos: (lt) => V(XR(C_T + lt) + 4.2, 1.9, 0.8), look: (lt) => V(XR(C_T + lt) - 0.5, 1.4, -1.0), fov: [46, 46], ease: 'linear', shadow: 12, shake: 0.012,
    run(t) {
      const x = XR(t);
      runAt(grant, x, -1.2, t * 1.2, { y: 0, face: 'scared', mod: { aLf: 2.6 + Math.sin(t * 15) * 0.4, aRf: 2.4 - Math.sin(t * 15) * 0.4, aLo: 0.4, aRo: 0.4, hx: -0.2 } });
      runAt(dante, x - 2.2, -2.4, t, { y: 0, face: 'scared' }); runAt(aurora, x - 3.2, -0.2, t + 0.3, { y: 0, face: 'serious' });
    } });
  F.card(S('always'), E('grant', -0.2), { kind: 'name', name: 'GRANT AZZARDO', sub: 'SCARED OF LITERALLY EVERYTHING', color: '#e89a1f' });
  // D · "That's Grant Azzardo…" side tracking, the hunters gaining (cut from the Shorts)
  EB.shot({ t0: S('grant', -0.1), loc: 'promenade', pos: (lt) => V(XR(S('grant') + lt) - 2.5, 2.4, 6.4), look: (lt) => V(XR(S('grant') + lt) - 2.5, 1.2, -1.4), fov: [52, 52], ease: 'linear', shadow: 18,
    run(t) {
      const x = XR(t);
      runAt(grant, x, -1.2, t * 1.2, { y: 0, face: 'scared', mod: { aLf: 2.6, aRf: 2.4 } }); runAt(dante, x - 1.6, -2.4, t, { y: 0, face: 'scared' }); runAt(aurora, x - 2.8, -0.2, t + 0.3, { y: 0 });
      hunters.forEach((h, i) => runAt(h, x - 6.5 - i * 1.2, -2.4 + (i % 3) * 1.4, t + i * 0.37, { y: 0 }));
    } });

  // E · OMAMORI pops out: 「十秒だけだぞ！」
  const OM_T = S('tensec', -0.35), GX = 22, GZ = -1.4;                                                // Grant stops at x = 20 and looks back (cheat: a new spot)
  const omamoriAt = (t, p0, o = {}) => echoAt(omamori, beside(grant, 0.75, -0.2, 1.75), grant.rotation.y, t, Object.assign({ float: 0, power: 1 }, o));
  EB.shot({ t0: OM_T, loc: 'promenade', pos: [[GX + 2.4, 2.4, GZ + 4.2], [GX + 2.2, 2.4, GZ + 3.8]], look: [[GX + 0.3, 2.5, GZ], [GX + 0.3, 2.6, GZ]], fov: [46, 44], shadow: 8, bloom: 0.9,
    run(t, lt) {
      put(grant, [GX, 0, GZ], 0.4); pose(grant, 'tremble', lt, { face: 'scared' });
      const p = popIn(t, OM_T + 0.2, 0.35); omamoriAt(t, null, { power: Math.min(1, p * 1.3), scale: 0.3 + 0.7 * p });
      fx3.luck.set(head(grant, 0.8), t - OM_T - 0.2, 0.25, 0.6);
    } });
  F.flash(OM_T + 0.2, 0.18, '#fff2b0', 0.8).sfx(OM_T + 0.2, OM_T + 1.1, 'ポンッ', { x: 72, y: 28, size: 12, rot: 10, shadow: '#e0a000' });
  // F · name card OMAMORI (close)
  const OCARD = E('tensec', 0.05);
  EB.shot({ t0: OCARD, loc: 'promenade', pos: (lt) => head(grant, 0.9).add(V(0.9, -0.1, 2.0 - lt * 0.2)), look: () => head(grant, 0.75).add(V(0.6, 0, 0)), fov: [40, 40], ease: 'linear', shadow: 6, bloom: 0.9,
    run(t, lt) {
      put(grant, [GX, 0, GZ], 0.4); pose(grant, 'idle', lt, { face: 'surprised' });
      omamoriAt(t);
    } });
  F.card(OCARD + 0.05, S('luck', -0.05), { kind: 'echo', name: 'OMAMORI', kanji: 'お守り', color: '#ffc81f' });

  // G · "Ten seconds of perfect luck." countdown 10 → 0 (fast) while every hunter gets stopped
  const LUCK_T = S('luck', -0.05), TIMEUP = S('timeup');
  F.countdown(LUCK_T, TIMEUP + 0.4, 10);
  const XH0 = 89.8;                                                                        // hunters' timing (their x as a function of time)
  const XH = (t, off) => -6 + 6.2 * (t - XH0) - off;
  EB.shot({ t0: LUCK_T, loc: 'promenade', pos: [[GX - 1.2, 2.0, GZ + 3.4], [GX - 1.5, 2.1, GZ + 2.8]], look: [[GX + 0.2, 1.9, GZ], [GX + 0.2, 2.0, GZ]], fov: [46, 44], shadow: 8, bloom: 0.9,
    run(t, lt) {
      put(grant, [GX, 0, GZ], 0.4); pose(grant, 'cheer', lt, { face: 'happy' });
      omamoriAt(t);
      put(dante, [GX + 1.4, 0, GZ - 1.0], 0.6); pose(dante, 'idle', lt, { face: 'surprised' });
    } });
  // the lucky chain (4 quick shots). Each blocker: { t: when it hits }
  const T1 = 89.95, T2 = 91.33, T3 = 92.5, T4 = 93.42;
  const DING = (t0) => { F.flash(t0, 0.18, '#ffe9a0', 0.55).sfx(t0, t0 + 0.65, 'キラッ', { x: 64, y: 24, size: 11, rot: 12, color: '#fff4a0', shadow: '#d89a00' }); };
  [T1, T2, T3, T4].forEach(DING);
  function chain(t) {
    hunterFaces();
    const P = prom().props;
    // 1) the parked purple car rolls back into the sea walk: hunters 0 and 1 slam into it
    const car = P.cars[6], k1 = easeOut(clamp((t - (T1 - 0.6)) / 0.6, 0, 1)), cz = lerp(4.0, 1.0, k1);           // it rolls backward out of its parking space
    car.position.set(D(-6.8), 0, D(cz)); car.rotation.y = -Math.PI / 2 + 0.25 * k1; car.userData.wheels.forEach((w) => (w.rotation.z = k1 * 4));
    [[0, 0.6], [1, 1.8]].forEach(([i, z]) => { const x = XH(t, i * 1.4), stop = -9.2 - i * 0.6;
      if (x < stop) runAt(hunters[i], x, z, t + i, { y: 0 }); else { put(hunters[i], [stop + 0.2 * easeOut(clamp((t - T1) / 0.3, 0, 1)) - 0.6, 0, z], Math.PI / 2); pose(hunters[i], 'knockback', t - T1 - i * 0.1); } });
    // 2) a scooter shoots across the road in front of hunter 2 → he spins and falls
    const sc = P.scooters[0], sx = 0.6, sz = lerp(5.6, -7, clamp((t - (T2 - 0.35)) / 0.8, 0, 1));
    sc.position.set(D(sx), 0, D(sz)); sc.rotation.y = -Math.PI / 2; sc.userData.wheels.forEach((w) => (w.rotation.z = -t * 30));
    { const x = XH(t, 3); if (t < T2) runAt(hunters[2], Math.min(x, -0.3), -1.6, t + 2, { y: 0 }); else { put(hunters[2], [-0.3, 0, -1.6], Math.PI / 2 + (t - T2) * 6 * Math.max(0, 1 - (t - T2) * 1.5)); pose(hunters[2], 'fallOver', t - T2); } }
    // 3) a street lamp tips over across the walk: hunter 3 runs into it
    const lamp = P.lamps[10], k3 = clamp((t - (T3 - 0.55)) / 0.5, 0, 1);                  // the sea-side lamp at x = 6.5, z = −6.4
    lamp.rotation.x = (Math.PI / 2) * k3 * k3;
    { const x = XH(t, 4.5); if (t < T3) runAt(hunters[3], Math.min(x, 6.0), -2.6, t + 3, { y: 0 }); else { put(hunters[3], [6.0 - 0.5 * easeOut(clamp((t - T3) / 0.3, 0, 1)), 0, -2.6], Math.PI / 2); pose(hunters[3], 'fallOver', t - T3); } }
    // 4) the fruit cart rolls across the road into the last hunter: fruit everywhere
    const cart = P.cart, k4 = easeOut(clamp((t - (T4 - 0.55)) / 0.55, 0, 1));
    cart.position.set(D(lerp(9, 11.4, k4)), 0, D(lerp(6.8, 3.4, k4))); cart.rotation.y = -1.2 * k4;
    { const x = XH(t, 6); if (t < T4) runAt(hunters[4], Math.min(x, 10.4), 3.0, t + 4, { y: 0 }); else { put(hunters[4], [10.4 - 0.6 * easeOut(clamp((t - T4) / 0.3, 0, 1)), 0, 3.0], Math.PI / 2); pose(hunters[4], 'fallOver', t - T4); } }
    fx3.fruit.set(V(11.0, 1.4, 3.2), t - T4, 0.5, 1.1, 0.12);
    [[T1, V(-8.8, 1.6, 1.2)], [T2, V(0, 1.6, -1.6)], [T3, V(6.0, 1.8, -2.6)], [T4, V(10.6, 1.8, 3.0)]].forEach(([tt, p], i) => { if (t > tt - 0.05 && t < tt + 1.2) fx3.luck.set(p, t - tt, 0.4, 0.8); });
  }
  const CHAIN = [[Math.min(T1 - 0.7, S('luck', 1.0)), [-3.0, 3.4, 8.2], [-8.0, 1.0, 1.4]], [T2 - 0.75, [3.8, 2.6, 5.8], [0.2, 1.0, -1.6]], [T3 - 0.85, [10.8, 3.3, 1.8], [6.0, 1.2, -3.4]], [T4 - 0.8, [15.6, 3.0, 8.6], [10.8, 1.2, 3.2]]];
  CHAIN.forEach(([t0, pos, look], i) => EB.shot({ t0, loc: 'promenade', pos: [pos, [pos[0] + 0.3, pos[1], pos[2] - 0.4]], look: [look], fov: [52, 50], shadow: 14, run(t) { chain(t); } }));

  // H · 「あっ…時間切れ。」 OMAMORI sweats as the count hits 0 (cut from the Shorts)
  const TU_T = S('timeup', -0.12);
  EB.shot({ t0: TU_T, loc: 'promenade', pos: [[GX + 1.3, 2.9, GZ + 2.4], [GX + 1.2, 2.9, GZ + 2.2]], look: () => head(grant, 0.6).add(V(0.6, 0, 0)), fov: [42, 40], shadow: 6, bloom: 0.8,
    run(t, lt) { put(grant, [GX, 0, GZ], 0.4); pose(grant, 'cheer', lt + 3, { face: 'happy' }); omamoriAt(t, null, { power: 0.7 }); } });
  F.sfx(TU_T + 0.2, E('timeup', 0.3), '…', { x: 74, y: 30, size: 14, rot: 0, color: '#9fd8ff' });

  // I · "…then ten seconds of the worst luck ever." slip → bonk → seagull steals the hat
  const WORST_T = S('worst', -0.1), SLIP = E('worst', 0.1), UP = SLIP + 1.0, BONK = UP + 0.55, SWOOP = BONK + 0.75, GRAB = SWOOP + 0.45;
  const LAMP = [42.5, 0, -6.4], G0 = [39.4, WALK_Y, -5.6];
  F.grade(WORST_T, E('hat', 0.3), { sat: 0.5, tint: '#3a5a9a', tintAmt: 0.25, contrast: 1.05, fade: 0.3 });
  function badLuck(t) {
    const P = prom().props;
    orange.visible = t < SLIP + 0.3; orange.position.set(G0[0] + 0.25, WALK_Y + 0.14, G0[2] + 0.2);
    if (t < SLIP) { put(grant, G0, Math.PI / 2); pose(grant, 'cheer', t - WORST_T, { face: 'happy' }); }
    else if (t < UP) { put(grant, G0, Math.PI / 2); pose(grant, 'slip', t - SLIP); }
    else if (t < BONK) { walk(grant, [G0, [LAMP[0] - 0.45, WALK_Y, -6.1]], UP, 2.2, t, { face: 'happy' }); }
    else { const k = easeOut(clamp((t - BONK) / 0.25, 0, 1)); put(grant, [LAMP[0] - 0.45 - 0.5 * k, WALK_Y, -6.1], Math.PI / 2); pose(grant, t < GRAB ? 'knockback' : 'reachUp', t < GRAB ? t - BONK : t - GRAB, { face: t < GRAB ? 'pain' : 'shocked' }); }
    // the seagull: swoops down from the sea, grabs the hat, flies off over the water
    if (t > SWOOP - 0.6) {
      const hatPos = head(grant, 0.55), k = (t - SWOOP) / 0.45;
      let p;
      if (k < 1) p = hatPos.clone().add(V(-3 * (1 - k), 3.5 * (1 - k) * (1 - k) + 0.3, -4 * (1 - k)));
      else { const f = t - GRAB; p = hatPos.clone().add(V(f * 1.2, 0.3 + f * 2.2, -f * 4.5)); }
      put(gull, [p.x, p.y + 0.25, p.z], k < 1 ? 0.6 : 2.4); gull.update(t, 1.4);
      if (t >= GRAB) { grant.rig.props.hat.visible = false; flyingHat.visible = true; gull.userData.feet.getWorldPosition(flyingHat.position); flyingHat.position.y -= 0.25; flyingHat.rotation.set(0.3, t, 0); }
    }
  }
  EB.shot({ t0: WORST_T, loc: 'promenade', pos: [[37.2, 2.2, -1.0], [37.6, 2.4, -1.3]], look: [[40.6, 1.6, -5.8], [41.0, 2.0, -5.9]], fov: [46, 48], shadow: 10,
    run(t) { badLuck(t); omamoriAt(t, null, { power: t < SLIP ? 0.5 : 0 }); if (t < SLIP) omamori.visible = true; else omamori.visible = false; } });
  F.sfx(SLIP + 0.15, SLIP + 0.9, 'ツルッ', { x: 36, y: 56, size: 12, rot: -10 })
    .sfx(BONK, BONK + 0.9, 'ゴン!', { x: 66, y: 34, size: 15, rot: 8 }).impact(BONK, 0.05);
  // J · "My HAT!" (low angle up at Grant reaching, the gull flying off)
  EB.shot({ t0: S('hat', -0.15), loc: 'promenade', pos: [[LAMP[0] - 2.6, 0.9, -3.4], [LAMP[0] - 2.7, 0.8, -3.2]], look: [[LAMP[0] - 0.6, 3.6, -7.6], [LAMP[0] - 0.4, 4.4, -8.5]], fov: [52, 52], shadow: 10,
    run(t) { badLuck(t); } });
  // K · "We escaped. His hat didn't." over the sea: the gull flies away with the hat (cut from the Shorts)
  const ESC_T = S('escaped', -0.1);
  EB.shot({ t0: ESC_T, loc: 'promenade', pos: [[49.3, 2.4, -2.6], [49.4, 2.6, -2.9]], look: [[51.5, 5.0, -30], [52.5, 5.6, -30]], fov: [50, 50], shadow: 20,
    run(t, lt) {
      put(gull, [47.8 + lt * 0.8, 3.6 + lt * 1.2 + Math.sin(lt * 2) * 0.2, -8.5 - lt * 7], 2.9); gull.update(t, 1.2);
      flyingHat.visible = true; gull.userData.feet.getWorldPosition(flyingHat.position); flyingHat.position.y -= 0.25; flyingHat.rotation.set(0.3, t, 0);
      const x = 52 + lt * 5; runAt(dante, x, -5.4, t); runAt(aurora, x - 1.1, -4.2, t + 0.3); runAt(grant, x - 2.4, -5.0, t * 1.2, { mod: { aLf: 2.4, aRf: 2.4 } });
      grant.rig.props.hat.visible = false;
    } });

  EB.STILLS.push(75.5, 77.3, 78.8, 80.8, 83.5, 86.4, 87.5, 89.0, 90.1, 91.4, 92.6, 93.5, 94.1, 96.0, 97.0, 98.0, 99.3, 100.3, 101.8);
})();
