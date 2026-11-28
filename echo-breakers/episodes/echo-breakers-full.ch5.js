// =====================================================================================
// CHAPTER 5 · THE CONDUCTOR (Ancient Arena, night)
// The arena at night under a huge red ゴゴゴゴ → Vahl conducts: "Welcome, children." → SHŪEN rises with its shadow
// orchestra 「最後の楽章を始めよう。」 → Aurora, Grant and Hale dance like puppets on glowing strings and attack Dante →
// "Let them GO!" → 「響け！」 vs 「無駄無駄無駄無駄！」: two barrages collide in the middle, the floor cracks → SHŪEN wins,
// Dante and HIBIKI are thrown back → THE BIG THINKING MOMENT (flash inserts: the baton, the headphones, the first night)
// → serious switch → Dante rips off his headphones and smashes them → TOTAL SILENCE, everything freezes → Vahl's mask
// cracks → "HIBIKIIIII!" → 「響けぇぇぇっ！」 the final punch shatters SHŪEN's golden mask → the shockwave lights up the
// arena, Vahl falls, the strings snap, the friends are free.
// World units. The sand floor is an oval 62 × 42 centered on 0,0,0; Dante comes in from the south gate (+z).
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, D, F, fx3, A, dante, aurora, grant, hale, vahl, hibiki, shuen, auroraCopies, thrownPhones, put, pose, walk, echoAt, beside, popIn, ramp, head, lookYaw, hitStop } = EB;
  const { clamp, lerp, ease, easeOut } = RT;

  const EST = E('arena', 0.1);                                                          // (no chapter card: a dissolve into the arena)

  // ---------- positions ----------
  const VQ = [0, 0, -6], SQ = [0, 0.4, -10.5], DQ = [0, 0, 12];                          // Vahl, SHŪEN, Dante
  const FR = { aurora: [-7, 0, -2], grant: [7, 0, -2], hale: [3.6, 0, 2.6] };             // the friends (puppets)
  const friends = [[aurora, FR.aurora], [grant, FR.grant], [hale, FR.hale]];
  const placeVahl = (t, move = 'conduct', lt = t) => { put(vahl, VQ, 0); pose(vahl, move, lt); };
  const sh = (t, o = {}) => echoAt(shuen, o.at || SQ, o.yaw ?? 0, t, Object.assign({ move: 'raiseHand', lt: t, orchestra: true }, o));
  // puppets: jerky dance, glowing strings from the dark sky to their hands and heads
  function puppets(t, o = {}) {
    const pts = [];
    friends.forEach(([ch, p], i) => {
      const at = o.at ? o.at(i, t) || p : p;
      put(ch, at, lookYaw(at, o.face || DQ)); pose(ch, o.move || 'puppet', (o.time || t) + i * 0.37, { face: 'sad' });
      ch.rig.setEyes('closed');
      const h = head(ch, 0.35); pts.push(h, h.clone().add(V(-0.7, -0.9, 0.2)), h.clone().add(V(0.7, -0.9, 0.2)));
    });
    fx3.strings.set(pts, 26, o.power ?? 1, (o.time || t) * 0.7);
  }
  const unpuppet = () => friends.forEach(([ch]) => ch.rig.setEyes(null));

  // A · establishing: the arena at night, purple light, a huge red ゴゴゴゴ over it
  EB.shot({ t0: EST, loc: 'arena', pos: [[0, 50, 78], [0, 44, 66]], look: [[0, 0, -6], [0, 2, -6]], fov: [48, 46], ease: 'out', shadow: 40, bloom: 0.9,
    run(t) { placeVahl(t); sh(t, { power: 0.35, orchestra: false }); puppets(t, { power: 0.6 }); } });
  F.sfx(EST + 0.1, S('welcome', 0.2), 'ゴゴゴゴ', { kind: 'menace', x: 50, y: 15, size: 22, rot: -4, color: '#ff2a3a', glow: '#8a0010' })
    .sfx(EST + 0.4, S('welcome', 0.2), 'ゴゴゴ', { kind: 'menace', x: 72, y: 40, size: 12, rot: 8, color: '#ff2a3a', glow: '#8a0010' });
  // B · "Welcome, children. Your Echoes will make a beautiful finale." (low on Vahl, then Dante walks in)
  const WEL_T = S('welcome', -0.15), REV = WD('welcome', 'your') - 0.15;
  EB.shot({ t0: WEL_T, loc: 'arena', pos: [[1.2, 0.8, -1.2], [1.0, 0.85, -1.6]], look: [[0, 2.6, -6], [0, 2.7, -6]], fov: [48, 46], shadow: 12, bloom: 0.85,
    run(t, lt) { placeVahl(t); sh(t, { power: 0.25, orchestra: false }); puppets(t, { power: 0.7 }); } });
  EB.shot({ t0: REV, loc: 'arena', pos: [[1.5, 1.6, 6.0], [1.2, 1.6, 6.6]], look: [[0, 1.4, 14], [0, 1.5, 13]], fov: [46, 44], shadow: 12,
    run(t) { walk(dante, [[0, 0, 19], DQ], REV - 1.0, 2.0, t, { end: 'idle', endYaw: Math.PI, face: 'determined' }); placeVahl(t); puppets(t, { power: 0.7 }); } });
  // C · SHŪEN rises behind Vahl with its shadow orchestra: 「最後の楽章を始めよう。」
  const SH_T = S('final', -0.25);
  EB.shot({ t0: SH_T, loc: 'arena', pos: [[2.6, 0.9, 4.8], [2.8, 0.8, 5.6]], look: [[0, 4.5, -8.5], [0, 5.5, -9]], fov: [56, 56], shadow: 18, bloom: 1.0,
    run(t, lt) {
      placeVahl(t); puppets(t);
      const p = popIn(t, SH_T + 0.1, 0.6); sh(t, { power: 0.3 + 0.7 * Math.min(1, p), scale: 0.5 + 0.5 * p });
      fx3.notes.set(t, V(0, 1.5, -9), 6, Math.min(1, p), 9);
    } });
  F.flash(SH_T + 0.1, 0.25, '#c79bff', 0.8).lines(SH_T + 0.1, E('final', 0.2), { kind: 'focus', color: '#d8b8ff', amount: 0.45 });
  // D · name card SHŪEN
  const SC_T = E('final', 0.05);
  EB.shot({ t0: SC_T, loc: 'arena', pos: [[-3.2, 1.2, 3.0], [-3.0, 1.0, 3.4]], look: [[0, 6.2, -10.5], [0, 6.4, -10.5]], fov: [56, 56], shadow: 18, bloom: 1.0,
    run(t) { placeVahl(t); sh(t); puppets(t); fx3.notes.set(t, V(0, 1.5, -9), 6, 1, 9); } });
  F.card(SC_T + 0.05, S('puppets', 0.0), { kind: 'echo', name: 'SHŪEN', kanji: '終焉', color: '#8a4dff' })
    .sfx(SC_T + 0.1, S('puppets', 0.0), 'ゴゴゴゴ', { kind: 'menace', x: 76, y: 58, size: 12, rot: 9, color: '#b46bff', glow: '#4a0a8a' });
  // E · "His music grabbed Aurora, Grant, even Hale… and made them dance like puppets." (orbit around the friends)
  const PU_T = S('puppets', -0.05);
  EB.shot({ t0: PU_T, loc: 'arena', pos: (lt) => { const a = 0.4 + lt * 0.22; return V(Math.sin(a) * 15, 4.5, Math.cos(a) * 15 - 1); }, look: [[0, 2.4, -1]], fov: [50, 50], ease: 'linear', shadow: 20, bloom: 0.9,
    run(t) { placeVahl(t); sh(t); puppets(t); fx3.notes.set(t, V(0, 1.5, -6), 9, 1, 8); } });
  // F · the puppets attack: Aurora's mirage copies lunge, Grant stumbles in, Hale's ice spikes burst under Dante; he leaps back
  const AT_T = E('puppets', 0.05), LUNGE = AT_T + 0.3, SPIKE = AT_T + 2.15, LEAP = SPIKE - 0.25;
  const DAN = (t) => (t < LEAP ? [0, 0, 12] : [0, Math.sin(clamp((t - LEAP) / 0.55, 0, 1) * Math.PI) * 1.4, lerp(12, 14.5, easeOut(clamp((t - LEAP) / 0.55, 0, 1)))]);
  EB.shot({ t0: AT_T, loc: 'arena', pos: [[-5.0, 2.2, 17.0], [-4.4, 2.0, 16.4]], look: [[0, 1.6, 10], [0, 1.6, 10.5]], fov: [52, 54], shadow: 14, shake: 0.01,
    run(t, lt) {
      const dp = DAN(t); put(dante, dp, Math.PI); pose(dante, t < LEAP ? 'guard' : 'jump', t < LEAP ? lt : t - LEAP, { face: 'scared' });
      auroraCopies.forEach((c, i) => { const s = i ? 1 : -1, k = easeOut(clamp((t - LUNGE - i * 0.2) / 0.5, 0, 1)), gone = ramp(t, LUNGE + 0.9 + i * 0.2, 0.3);
        put(c, [lerp(s * 6, s * 1.2, k), 0, lerp(4, 10.8, k)], lookYaw([s * 6, 0, 4], DQ)); pose(c, 'punch', t - LUNGE - i * 0.2 - 0.3, { face: 'sad' }); c.setHaze(t, 0.85 * (1 - gone)); });
      puppets(t, { at: (i, tt) => (i === 1 ? [lerp(7, 2.0, easeOut(clamp((tt - AT_T - 0.9) / 1.0, 0, 1))), 0, lerp(-2, 9.2, easeOut(clamp((tt - AT_T - 0.9) / 1.0, 0, 1)))] : null) });
      fx3.spikes2.set(V(0, 0, 12), (t - SPIKE) / 0.4, 1.6);
      placeVahl(t); sh(t);
    } });
  F.sfx(SPIKE, SPIKE + 0.8, 'ズガッ!', { x: 50, y: 62, size: 14, rot: -8, color: '#e8fbff', shadow: '#2a8fc8' });
  // G · "Let them GO!" (low front; HIBIKI bursts out behind him)
  const LG_T = S('letgo', -0.12), HB_OUT = LG_T + 0.25;
  EB.shot({ t0: LG_T, loc: 'arena', pos: [[1.5, 1.1, 9.4], [1.4, 1.05, 9.7]], look: [[0, 2.4, 14.5], [0, 2.6, 14.5]], fov: [52, 52], shadow: 10, bloom: 0.7, shake: 0.01,
    run(t, lt) {
      put(dante, [0, 0, 14.5], Math.PI); pose(dante, 'shout', lt, { face: 'shout' });
      const p = popIn(t, HB_OUT, 0.3); echoAt(hibiki, beside(dante, 0.9, 1.1), Math.PI, t, { move: 'power', lt, power: Math.min(1, p * 1.3), scale: 0.5 + 0.5 * p });
      fx3.wave.set(V(0, 0.3, 14.5), V(0, 1, 0), (t - HB_OUT) / 0.5, 3.5);
    } });
  F.flash(HB_OUT, 0.15, '#bfe6ff', 0.6).lines(LG_T, E('letgo', 0.1), { kind: 'focus', amount: 0.6 });

  // ======================= THE CLASH: 「響け！」 vs 「無駄無駄無駄無駄！」 =======================
  // HIBIKI charges in; the two Echoes' fists meet in the middle (hit-stop + jolt + a ring of dust); then SHŪEN's
  // heavier barrage slowly drives HIBIKI back — its feet skid across the cracking floor.
  const CL_T = E('letgo', 0.02), MUDA = S('muda', -0.1), WIN = E('muda', 0.05), COLLIDE = CL_T + 0.9;
  const shove = (t) => Math.pow(clamp((t - MUDA) / (WIN - MUDA), 0, 1), 1.6);                // 0 → 1 while SHŪEN wins
  const HB_AT = (t) => [0, 0, lerp(12.5, 4.2, easeOut(clamp((t - CL_T) / 0.45, 0, 1))) + 1.8 * shove(t) + 0.08 * Math.sin(t * 47) * shove(t)];
  const SH_AT = (t) => [0, 0.4, lerp(-10.5, -3.2, easeOut(clamp((t - CL_T - 0.3) / 0.6, 0, 1))) + 0.9 * shove(t)];
  const CMID = V(0, 3.2, 0.6);
  const cmid = (t) => V(0, 3.2, 0.6 + 1.35 * shove(t));
  function clash(t0) {
    const t = hitStop(t0, [COLLIDE], 0.1);
    put(dante, [0, 0, 14.5], Math.PI); pose(dante, 'power', t, { face: 'serious' }); placeVahl(t, 'conduct', t * 1.6); puppets(t);
    echoAt(hibiki, HB_AT(t), Math.PI, t, { move: 'barrage', lt: t - CL_T });
    sh(t, { at: SH_AT(t), move: t > MUDA - 0.2 ? 'barrage' : 'raiseHand', lt: t - MUDA });
    const CMID = cmid(t);
    fx3.dust.set(V(0, 0.1, 0.6), t - COLLIDE, 1.5, 3.2);                                       // the shock of the first collision
    if (t > MUDA) fx3.dust2.set(V(0, 0.1, HB_AT(t)[2] + 0.6), (t - MUDA) % 0.55, 0.8, 1.1);    // HIBIKI's feet skidding back
    const hc = head(hibiki, -1.4), sc = head(shuen, -2.6);
    fx3.barrage.set(t, hc, CMID.clone().sub(hc), 1, 1.6, hc.distanceTo(CMID) - 0.2);
    fx3.barrage2.set(t, sc, CMID.clone().sub(sc), t > MUDA - 0.2 ? 1 : 0, 2.2, sc.distanceTo(CMID) - 0.2);
    fx3.wave.set(CMID, V(0, 0, 1), ((t - CL_T) % 0.35) / 0.35, 3.5); fx3.wave3.set(CMID, V(0, 0.2, 1), ((t - CL_T + 0.17) % 0.35) / 0.35, 4.2);
    fx3.sparks.set(CMID, (t - CL_T) % 0.6, 0.5, 0.6);
    fx3.cracks.set(V(0, 0.03, 0.6), ramp(t, CL_T + 0.3, 3.0), 18, '#1a1018');
    fx3.notes.set(t, V(0, 1.5, -6), 9, 1, 8);
  }
  // H · HIBIKI's barrage (over its shoulder toward SHŪEN)
  EB.shot({ t0: CL_T, loc: 'arena', pos: (lt) => V(2.4, 3.8, HB_AT(CL_T + lt)[2] + 6.0), look: [[0, 3.6, -3]], fov: [54, 56], ease: 'linear', shadow: 16, shake: 0.01, bloom: 0.75,
    kicks: [COLLIDE + 0.1], kickAmp: 0.2, run(t) { clash(t); } });
  F.impact(COLLIDE, 0.05).sfx(COLLIDE + 0.02, COLLIDE + 0.7, 'ガッ!!', { x: 34, y: 34, size: 14, rot: -10 });
  // I · SHŪEN answers: MUDA MUDA MUDA MUDA (high angle: both barrages meet in the middle)
  EB.shot({ t0: MUDA, loc: 'arena', pos: [[0, 15, 21], [0, 13, 24]], look: [[0, 1.5, 0.5], [0, 1.5, 2.2]], fov: [50, 50], shadow: 24, shake: 0.012, bloom: 1.0,
    kicks: [WIN - 1.2, WIN - 0.7, WIN - 0.3], kickAmp: 0.08, run(t) { clash(t); } });
  F.sfx(CL_T + 0.1, MUDA, 'ドドドドド', { kind: 'menace', x: 50, y: 70, size: 13, rot: 6, color: '#5aa8ff', glow: '#1a4fb0' })
    .sfx(MUDA + 0.05, WIN, 'ゴゴゴゴゴ', { kind: 'menace', x: 50, y: 16, size: 14, rot: -6, color: '#b46bff', glow: '#4a0a8a' })
    .lines(CL_T, WIN, { kind: 'speed', amount: 0.5, angle: Math.PI / 2, color: '#e8dcff' }).grade(CL_T, WIN, { contrast: 1.15, sat: 1.2, fade: 0.1 });
  // J · SHŪEN wins: Dante and HIBIKI are thrown back across the floor
  // the last MUDA lands: a beat of stillness (hit-stop), then HIBIKI is blasted back and Dante with it — he flies,
  // hits the floor, and skids to a stop in a cloud of dust.
  const HOLD = 0.12, LAND = WIN + HOLD + 0.55;
  EB.shot({ t0: WIN, loc: 'arena', pos: [[10, 3.5, 20], [11, 3.8, 21.3]], look: [[0, 1.5, 12], [0, 1.2, 14.8]], fov: [56, 56], ease: 'out', shadow: 18, shake: 0.012, bloom: 0.95,   // (from the side: HIBIKI flies into frame, Dante tumbles)
    kicks: [WIN + HOLD, LAND], kickAmp: 0.22,
    run(t, lt0) {
      const lt = Math.max(0, lt0 - HOLD), air = clamp(lt / 0.55, 0, 1), sk = easeOut(clamp((lt - 0.55) / 0.45, 0, 1));
      put(dante, [0, Math.sin(air * Math.PI) * 1.1, lerp(14.5, 15.9, easeOut(air)) + 0.6 * sk], Math.PI); pose(dante, lt < 0.55 ? 'knockback' : 'fallOver', lt < 0.55 ? lt : lt - 0.55);
      const hz = lerp(HB_AT(WIN)[2], 11.5, easeOut(clamp(lt / 0.8, 0, 1)));
      echoAt(hibiki, [0, 0, hz], Math.PI, t, { move: 'knockback', lt, power: 1 - ramp(t, WIN + 0.8, 1.2) });
      fx3.dust2.set(V(0, 0.1, hz), lt, 1, 1.6); fx3.dust.set(V(0, 0.05, 16.0), t - LAND, 1.3, 2.0);
      sh(t, { at: SH_AT(t), move: 'barrage', lt: t - MUDA }); placeVahl(t); puppets(t);
      const sc = head(shuen, -2.6); fx3.barrage2.set(t, sc, V(0, 1.5, 12).sub(sc), 1 - ramp(t, WIN + HOLD + 0.4, 0.5), 2.2, 6);
      fx3.cracks.set(V(0, 0.03, 0.6), 1, 18, '#1a1018'); fx3.rubble.set(V(0, 0.5, 16.2), t - LAND, 0.4, 0.5, 0.05); fx3.wave.set(V(0, 0.3, 16.5), V(0, 1, 0), (t - LAND) / 0.5, 6);
    } });
  F.impact(WIN, 0.07).flash(WIN + 0.07, 0.2, '#c79bff', 0.9).sfx(WIN, WIN + 1.0, 'ドゴォン!!', { x: 50, y: 30, size: 17, rot: -8, shadow: '#7a2ad8' });

  // ======================= THE BIG THINKING MOMENT =======================
  const TH0 = S('everywhere', -0.3), SLOW = (t) => TH0 + (t - TH0) * 0.15;
  const DOWN = [0, 0, 16.5];                                                               // where Dante lands (the floor ends at z 21)
  const danteDown = (t, face = 'pain', move = 'kneel', lt = 2, o = {}) => { put(dante, DOWN, Math.PI); pose(dante, move, lt, { face, mod: o.mod }); };
  const slowWorld = (t) => { const ta = SLOW(t); placeVahl(ta, 'conduct', ta * 1.6); sh(ta, { at: SH_AT(WIN), move: 'raiseHand', lt: ta }); puppets(ta); fx3.notes.set(ta, V(0, 1.5, -6), 9, 1, 8); fx3.cracks.set(V(0, 0.03, 0.6), 1, 18, '#1a1018'); };
  // K · "His music is everywhere… Aurora, Grant, Hale… they're all dancing to his beat." (his eyes → the dancing friends)
  const EV_FR = WD('everywhere', 'aurora') - 0.2, EV_BACK = WD('everywhere', 'dancing') + 0.1;
  const eyes = (d0, d1, side = 0.35) => ({ pos: (lt, p) => head(dante, 0.06).add(V(Math.sin(side) * lerp(d0, d1, p), 0.05, -Math.cos(side) * lerp(d0, d1, p))), look: () => head(dante, 0.06) });
  EB.shot({ t0: TH0, loc: 'arena', ...eyes(2.4, 1.2), fov: [40, 34], moveDur: EV_FR - TH0, shadow: 6, run(t) { danteDown(t); slowWorld(t); } });
  EB.shot({ t0: EV_FR, loc: 'arena', pos: [[-9.4, 2.5, 6.2], [-9.0, 2.4, 5.6]], look: [[-2.6, 1.8, 0], [-2.4, 1.9, 0]], fov: [50, 50], shadow: 16, run(t) { danteDown(t); slowWorld(t); } });
  EB.shot({ t0: EV_BACK, loc: 'arena', ...eyes(1.4, 1.0), fov: [36, 34], shadow: 6, run(t) { danteDown(t); slowWorld(t); } });
  // L · "As long as there's music, he controls everything. Even me." SHŪEN looming (cut from the Shorts)
  const CO_T = S('controls', -0.1);
  EB.shot({ t0: CO_T, loc: 'arena', pos: [[0.8, 1.0, 16.6], [0.7, 1.0, 16.0]], look: [[0, 6.5, -3.5], [0, 6.8, -3.5]], fov: [52, 50], shadow: 18, run(t) { danteDown(t); slowWorld(t); } });
  // M · flash inserts: Vahl's baton, Dante's headphones, the first night HIBIKI appeared
  const FI = E('controls', 0.1), FI2 = FI + 0.45, FI3 = FI2 + 0.45, FI_END = S('weakness', -0.05);
  EB.shot({ t0: FI, cut: true, loc: 'arena', pos: () => { const v = V(); vahl.rig.props.baton.getWorldPosition(v); return v.add(V(0.9, -0.7, 1.7)); }, look: () => { const v = V(); vahl.rig.props.baton.getWorldPosition(v); return v; }, fov: [38, 36], shadow: 6,
    run(t) { danteDown(t); slowWorld(t); } });
  EB.shot({ t0: FI2, cut: true, loc: 'arena', pos: () => head(dante, -0.3).add(V(0.35, 0.2, -1.3)), look: () => head(dante, -0.42), fov: [38, 36], shadow: 6, run(t) { danteDown(t); slowWorld(t); } });
  EB.shot({ t0: FI3, cut: true, loc: 'stairway', pos: [[-0.4, 7.8, -20.4]], look: [[-3.0, 12.8, -29.4]], fov: [56, 56], shadow: 14, bloom: 0.9,
    run(t) {                                                                                 // (the same picture as the first night)
      put(dante, [-2.6, 10, -30.4], 0.15); pose(dante, 'block', 1, { face: 'shocked', mod: { hx: -0.62 } });
      const ec = echoAt(hibiki, beside(dante, 0.25, 0.55, 0.7), 0.15, t, { move: 'barrage', lt: t }); ec.rotation.order = 'YXZ'; ec.rotation.x = -0.75;
      const chest = head(hibiki, -1.2); fx3.barrage.set(t, chest, V(-2.6, 12.9, -30.3).sub(chest), 1, 1.4, 2.6);
    } });
  [FI, FI2, FI3].forEach((x) => F.flash(x, 0.07, '#ffffff', 1));
  F.grade(FI, FI_END, { sat: 0.15, contrast: 1.3, bright: 1.05, tint: '#c89a5a', tintAmt: 0.35, fade: 0.02 });
  // N · "Hibiki gets stronger with sound… and weaker in silence. That's my weakness…" / "…but silence is HIS weakness too."
  const WK_T = S('weakness', -0.05), HIS_T = S('his', -0.1), TA_T = S('takeaway', -0.1);
  EB.shot({ t0: WK_T, loc: 'arena', ...eyes(1.6, 1.1, -0.3), fov: [38, 34], shadow: 6,
    run(t) { danteDown(t, 'determined'); slowWorld(t); } });
  EB.shot({ t0: HIS_T, loc: 'arena', pos: [[3.4, 2.3, -4.4], [3.3, 2.3, -4.7]], look: () => head(vahl, 0), fov: [34, 32], shadow: 6, run(t) { danteDown(t, 'determined'); slowWorld(t); } });
  // O · "Then I'll take everything away. Every sound. And give it back all at once." he gets up, hands on the headphones
  EB.shot({ t0: TA_T, loc: 'arena', pos: [[0.9, 1.0, 13.4], [0.8, 0.95, 13.7]], look: [[0, 1.9, 16.5], [0, 2.1, 16.5]], fov: [48, 46], shadow: 8,
    run(t, lt) {
      put(dante, DOWN, Math.PI); const up = ease(clamp(lt / 2.2, 0, 1));
      pose(dante, 'idle', lt, { face: 'serious', mod: { y: -0.62 * (1 - up), lRf: 1.2 * (1 - up), kR: 1.2 * (1 - up), kL: 1.5 * (1 - up), aLf: 2.1 * up, aRf: 2.1 * up, eL: 2.0 * up, eR: 2.0 * up, aLo: -0.3 * up, aRo: -0.3 * up } });
      slowWorld(t);
    } });
  F.grade(TH0, FI, { sat: 0.35, contrast: 1.12, bright: 0.9, tint: '#c02a5a', tintAmt: 0.3, fade: 0.4, fadeOut: 0.02 })
    .grade(FI_END, E('takeaway', 0.05), { sat: 0.6, contrast: 1.1, tint: '#ffb21f', tintAmt: 0.32, fade: 0.2, fadeOut: 0.05 })
    .vignette(TH0, E('takeaway', 0.05), 0.85, 0.3).lines(TH0, FI, { kind: 'focus', color: '#ffd0e0', amount: 0.4 }).lines(FI_END, E('takeaway', 0.05), { kind: 'focus', color: '#ffe9b0', amount: 0.4 });

  // ======================= SERIOUS SWITCH → headphones off and smashed → TOTAL SILENCE =======================
  const SW = E('takeaway', 0.05), SW_HIT = SW + 0.5, RIP = SW_HIT + 0.05, SMASH = RIP + 0.75, SILENCE = E('takeaway', 1.6);
  EB.shot({ t0: SW, loc: 'arena', pos: () => head(dante, 0.06).add(V(0.35, 0.02, -1.3)), look: () => head(dante, 0.06), fov: [36, 36], shadow: 6,
    run(t) { put(dante, DOWN, Math.PI); pose(dante, 'idle', 3, { face: 'serious', mod: { aLf: 2.1, aRf: 2.1, eL: 2.0, eR: 2.0, aLo: -0.3, aRo: -0.3 } }); slowWorld(t); } });
  F.streak(SW, 0.5, 40).impact(SW_HIT, 0.06).flash(SW_HIT + 0.06, 0.15, '#ffffff', 0.8);
  const phones = (t) => {                                                                    // the headphones fly from his hands to the floor and break
    if (t < RIP + 0.35) return;
    dante.rig.props.headphones.visible = false;
    if (t < SMASH) { const k = (t - RIP - 0.35) / (SMASH - RIP - 0.35); thrownPhones.visible = true; thrownPhones.position.set(0.5 * k, lerp(2.3, 0.15, k * k), lerp(16.0, 14.6, k)); thrownPhones.rotation.set(k * 6, k * 3, 0); thrownPhones.scale.setScalar(0.44); }
    fx3.phoneBits.set(V(0.5, 0.2, 14.6), t - SMASH, 0.5, 0.6, 0.02);
  };
  EB.shot({ t0: RIP, loc: 'arena', pos: [[1.8, 1.3, 12.4], [1.9, 1.2, 12.1]], look: [[0, 1.4, 16.2], [0.2, 0.8, 15.2]], fov: [50, 48], shadow: 10, shake: 0.008,
    run(t, lt) { put(dante, DOWN, Math.PI); pose(dante, 'headphonesOff', lt); phones(t); slowWorld(t); } });
  F.sfx(SMASH, SMASH + 0.8, 'バキッ!', { x: 54, y: 66, size: 15, rot: 8 }).impact(SMASH, 0.05);
  // TOTAL SILENCE: no sound, no color, nothing moves (the music is muted in the CUE SHEET from takeaway.e+1.6)
  const FROZEN_T = SILENCE;                                                                  // the world stops at this moment
  const frozenWorld = () => { const ta = SLOW(FROZEN_T); placeVahl(ta, 'conduct', ta * 1.6); sh(ta, { at: SH_AT(WIN), move: 'raiseHand', lt: ta }); puppets(ta); fx3.notes.set(ta, V(0, 1.5, -6), 9, 1, 8); fx3.cracks.set(V(0, 0.03, 0.6), 1, 18, '#1a1018'); };
  EB.shot({ t0: SILENCE, loc: 'arena', pos: [[4.8, 4.4, 19.0], [4.4, 4.8, 19.4]], look: [[0, 2.5, 3], [0, 2.8, 3]], fov: [52, 52], moveDur: 2.4, shadow: 30,
    run(t) { put(dante, DOWN, Math.PI); pose(dante, 'power', 2, { face: 'serious' }); dante.rig.props.headphones.visible = false; fx3.phoneBits.set(V(0.5, 0.2, 14.6), 1.5, 0.5, 0.6, 0.02); frozenWorld(); } });
  const MC_T = E('impossible', 0.05), CRACK = MC_T + 0.25;
  // P · Vahl, frozen: "Silence…? Impossible. Nobody escapes my finale…" (cut from the Shorts) → his mask cracks
  EB.shot({ t0: S('impossible', -0.1), loc: 'arena', pos: () => head(vahl, 0.02).add(V(0.3, 0, 1.2)), look: () => head(vahl, 0.02), fov: [36, 34], shadow: 6,
    run(t) { put(dante, DOWN, Math.PI); pose(dante, 'power', 2); frozenWorld(); vahl.rig.crackMask(0); } });
  EB.shot({ t0: MC_T, loc: 'arena', pos: () => head(vahl, 0.02).add(V(-0.2, 0, 0.95)), look: () => head(vahl, 0.02), fov: [34, 32], shadow: 6, shake: 0.006,
    run(t) { put(dante, DOWN, Math.PI); pose(dante, 'power', 2); frozenWorld(); vahl.rig.crackMask(t > CRACK ? 1 : 0); shuen.echo.crackMask(t > CRACK ? 1 : 0); } });
  F.grade(SILENCE - 0.05, S('shout', 0.0), { sat: 0.0, contrast: 0.92, bright: 1.08, fade: 0.05, fadeOut: 0.02 }).vignette(SILENCE, S('shout', 0), 0.5, 0.1)
    .flash(SILENCE - 0.05, 0.25, '#ffffff', 0.7).sfx(CRACK, CRACK + 0.7, 'ピシッ', { x: 66, y: 30, size: 12, rot: 10, color: '#ffffff', shadow: '#555' });

  // ======================= "HIBIKIIIII!" → 「響けぇぇぇっ！」 the final punch =======================
  const SH_T2 = S('shout', -0.05), FINAL_T = S('lastpunch', -0.1), PUNCH = E('lastpunch', -0.4);
  EB.shot({ t0: SH_T2, loc: 'arena', pos: [[1.0, 1.0, 11.8], [1.1, 0.9, 11.5]], look: [[0, 2.6, 16.5], [0, 3.2, 16.5]], fov: [54, 58], shadow: 10, shake: 0.02, bloom: 0.8,
    run(t, lt) {
      put(dante, DOWN, Math.PI); pose(dante, 'shout', lt, { face: 'shout' }); dante.rig.props.headphones.visible = false;
      const p = popIn(t, SH_T2 + 0.15, 0.35); echoAt(hibiki, beside(dante, 0, 1.3, 0.3), Math.PI, t, { move: 'power', lt, power: Math.min(1, p * 1.3), scale: (0.5 + 0.5 * p) * 1.25 });
      fx3.wave.set(V(0, 1.4, 16.5), V(0, 1, 0), ((t - SH_T2) % 0.5) / 0.5, 7); frozenWorld();
    } });
  F.flash(SH_T2, 0.2, '#bfe6ff', 1).lines(SH_T2, E('shout', 0.2), { kind: 'focus', amount: 0.9 }).sfx(SH_T2 + 0.1, E('shout', 0.2), 'ゴゴゴゴ', { kind: 'menace', x: 50, y: 18, size: 16, rot: -5, color: '#5aa8ff', glow: '#1a4fb0' });
  // HIBIKI dashes in and punches SHŪEN's golden mask
  const HB_FROM = 17.0, HB_TO = -0.2 + 0.9;                                                // (SHŪEN stands 0.9 closer after the clash)
  const dash = (t) => [0, 0.6, lerp(HB_FROM, HB_TO, easeOut(clamp((t - FINAL_T) / (PUNCH - FINAL_T), 0, 1)))];
  EB.shot({ t0: FINAL_T, loc: 'arena', pos: (lt) => V(2.4, 4.6, dash(FINAL_T + lt)[2] + 2.8), look: (lt) => V(0, 5.2, dash(FINAL_T + lt)[2] - 5), fov: [56, 60], ease: 'linear', shadow: 16, shake: 0.015, bloom: 1.1,
    run(t, lt) {
      put(dante, DOWN, Math.PI); pose(dante, 'shout', 1, { face: 'shout' }); dante.rig.props.headphones.visible = false;
      const ec = echoAt(hibiki, dash(t), Math.PI, t, { move: t < PUNCH - 0.2 ? 'guard' : 'punch', lt: t - PUNCH + 0.2, scale: 1.25 });
      ec.rotation.order = 'YXZ'; ec.rotation.x = -0.35;
      frozenWorld();
    } });
  F.lines(FINAL_T, PUNCH, { kind: 'speed', amount: 0.7, angle: Math.PI / 2, color: '#dff4ff' });
  // the hit: impact frames, the mask shatters, the shockwave lights up the whole arena; Vahl falls; the strings snap
  // (hit-stop: the fist sinks into the mask and everything holds 0.15 s; then the camera jolts, SHŪEN's head snaps back,
  //  the mask bursts, the giant staggers and fades)
  const PHOLD = 0.15;
  EB.shot({ t0: PUNCH, loc: 'arena', pos: [[2.2, 5.8, 7.4], [7, 18, 34]], look: [[0, 5.6, -2.3], [0, 2, -2]], fov: [54, 56], ease: 'out', moveDur: S('stopped', 0) - PUNCH, shadow: 30, bloom: 1.2,
    kicks: [PUNCH + PHOLD], kickAmp: 0.3,
    run(t0, lt0) {
      const t = hitStop(t0, [PUNCH], PHOLD), lt = t - PUNCH;
      put(dante, DOWN, Math.PI); pose(dante, lt < 1.6 ? 'shout' : 'idle', lt, { face: lt < 1.6 ? 'shout' : 'determined' }); dante.rig.props.headphones.visible = false;
      echoAt(hibiki, [0, 0.6, HB_TO + 0.6 * easeOut(clamp(lt / 0.4, 0, 1))], Math.PI, t, { move: 'punch', lt: 0.5, scale: 1.25, power: 1 - ramp(t, PUNCH + 2.0, 1.2) });
      shuen.rig.head.visible = lt < 0.05; shuen.echo.crackMask(1);
      sh(t, { at: SH_AT(WIN), move: 'knockback', lt, power: 1 - ramp(t, PUNCH + 0.3, 1.4), orchestra: lt < 0.5 });
      shuen.rig.head.visible = lt < 0.05;
      put(vahl, VQ, 0); pose(vahl, 'fallOver', lt - 0.4); vahl.rig.crackMask(1);
      friends.forEach(([ch, p], i) => { put(ch, p, lookYaw(p, DQ)); pose(ch, lt < 0.6 ? 'puppet' : 'kneel', lt < 0.6 ? PUNCH : lt - 0.6, { face: lt < 1.6 ? 'sad' : 'shocked' }); ch.rig.setEyes(lt < 1.2 ? 'closed' : null); });
      const ec = shuen; ec.rotation.order = 'YXZ'; ec.rotation.x = -0.35 * Math.sin(clamp(lt / 0.5, 0, 1) * Math.PI) * (lt < 0.5 ? 1 : 0.4);   // the head snaps back
      const mask = V(0, 7.6, -2.1); fx3.goldBits.set(mask, lt, 1.2, 1.2, 0.05);
      fx3.ground.set(V(0, 0.3, -1), V(0, 1, 0), lt / 1.6, 60); fx3.wave.set(mask, V(0, 0, 1), lt / 0.6, 14); fx3.wave3.set(mask, V(0.3, 0.2, 1), (lt - 0.15) / 0.7, 18);
    } });
  F.impact(PUNCH, 0.08).flash(PUNCH + 0.08, 0.9, '#ffffff', 1).sfx(PUNCH + 0.02, PUNCH + 1.4, 'バキィィン!!', { x: 50, y: 24, size: 18, rot: -7, shadow: '#e0a000' })
    .grade(PUNCH + 0.08, S('stopped', 0), { bright: 1.25, contrast: 1.1, sat: 1.2, fade: 0.05, fadeOut: 1.4 });
  // Q · "And just like that… the music stopped." (quiet; cut from the Shorts)
  EB.shot({ t0: S('stopped', -0.1), loc: 'arena', pos: [[3.0, 2.2, 19.6], [2.8, 2.3, 19.0]], look: [[0, 1.8, 11], [0, 1.8, 10]], fov: [48, 46], shadow: 16,
    run(t, lt) {
      put(dante, DOWN, Math.PI); pose(dante, 'idle', lt, { face: 'determined' }); dante.rig.props.headphones.visible = false;
      friends.forEach(([ch, p], i) => { const q = [p[0] * 0.5, 0, p[2] * 0.4 + 8]; put(ch, q, lookYaw(q, DOWN)); pose(ch, 'idle', lt + i, { face: 'surprised' }); });
      put(vahl, VQ, 0); pose(vahl, 'fallOver', 3); vahl.rig.crackMask(1); unpuppet();
    } });

  EB.STILLS.push(143.4, 145.8, 147.4, 149.6, 151.8, 154.8, 157.4, 159.1, 160.6, 162.4, 165.0, 166.8, 170.8, 172.4, 175.8, 177.4, 177.9, 178.4, 180.8, 184.0, 187.3, 189.4, 190.2, 191.6, 193.8, 196.0, 196.9, 198.4, 199.8, 201.8, 203.8);
})();
