// =====================================================================================
// CHAPTER 4 · ICE DUEL (Sea Fortress, sunset)
// Dante comes up onto the fortress → Hale waits with his back turned → "Show me." → TSURARA 「凍りつけ。」 → the whole
// top and the sea freeze → TSURARA's lance vs HIBIKI, ice spikes → Dante frozen to the knees, HIBIKI pushed back →
// THINKING MOMENT (slow motion, blue, focus lines, the inner voice) → "the ice is… cracking" → "every sound is power"
// → SERIOUS SWITCH → 「響け！響け！響け！」 barrage → the ice explodes into sparkling shards over the sea → Hale on one
// knee: "Vahl is at the old arena. Tonight."
// World units. The fortress top is flat at y 0, 44 × 44 (x, z from −22 to 22); the sunset is in the west (−x).
// =====================================================================================
(function () {
  'use strict';
  const { S, E, WD, V, D, F, fx3, A, dante, hale, hibiki, tsurara, iceLegs, put, pose, walk, echoAt, beside, popIn, ramp, head, lookYaw } = EB;
  const { clamp, lerp, ease, easeOut } = RT;
  const fort = () => EB.loc('fortress');

  const CARD = E('escaped', 0.1), START = S('sunset', -0.2);
  F.card(CARD, START, { kind: 'chapter', n: 4, title: 'ICE DUEL' });

  // ---------- positions ----------
  const DQ = [2.5, 0, 6.5], HQ = [-11, 0, -3];                                          // Dante / Hale
  const D_YAW = lookYaw(DQ, HQ), H_YAW = lookYaw(HQ, DQ);
  const HB = [-0.9, 0, 4.0], TS = [-8.2, 0, -1.2];                                       // HIBIKI / TSURARA facing each other
  const MID = V((HB[0] + TS[0]) / 2, 2.4, (HB[2] + TS[2]) / 2);                           // where lance and fists meet
  const placeDante = (t, move = 'idle', lt = t, face = 'determined') => { put(dante, DQ, D_YAW); pose(dante, move, lt, { face }); };
  const placeHale = (t, move = 'handsOnHips', lt = t, face = 'cold', yaw = H_YAW) => { put(hale, HQ, yaw); pose(hale, move, lt, { face }); };
  const ts = (t, o = {}) => echoAt(tsurara, o.at || TS, o.yaw ?? lookYaw(TS, HB), t, Object.assign({ move: 'power', lt: t }, o));
  const hb = (t, o = {}) => echoAt(hibiki, o.at || HB, o.yaw ?? lookYaw(HB, TS), t, Object.assign({ move: 'guard', lt: t }, o));
  // the ice: spreads over the top from TSURARA (iceTop is a flat slab in the fortress group, design units) and freezes the sea
  const T_FREEZE = E('freeze', 0.0), T_SHATTER = E('resound1', 0.15);
  function ice(t) {
    const P = fort().props, p = easeOut(ramp(t, T_FREEZE, 1.6)), gone = ramp(t, T_SHATTER, 0.25);
    const k = p * (1 - gone); P.iceTop.visible = k > 0.001; P.iceSea.visible = p * (1 - gone) > 0.001;
    P.iceTop.scale.set(Math.max(0.001, k), 1, Math.max(0.001, k));
    P.iceTop.position.set(D(TS[0]) * (1 - k), 0.13, D(TS[2]) * (1 - k));
    P.iceSea.material.opacity = 0.9 * p * (1 - gone); P.iceSea.scale.setScalar(0.4 + 0.6 * p);
  }

  // A · "At sunset, someone was waiting for me on the old sea fortress." (drone from the sea, Dante comes up the stairs)
  EB.shot({ t0: START, loc: 'fortress', pos: [[60, 11, 30], [44, 7.5, 22]], look: [[-2, 3, -2], [-3, 2.5, -1]], fov: [48, 46], ease: 'out', shadow: 30,
    run(t, lt) {
      walk(dante, [[3, 0, 17.6], DQ], START + 0.4, 2.2, t, { end: 'idle', endYaw: D_YAW, face: 'determined' });
      placeHale(t, 'idle', t, 'cold', -Math.PI / 2 - 0.3);                                  // back turned, looking at the sunset
    } });
  // B · "So you're the new kid with the loud Echo. Show me." (over Dante's shoulder; Hale turns around)
  const SHOW_T = S('show', -0.15);
  EB.shot({ t0: SHOW_T, loc: 'fortress', pos: [[5.4, 2.4, 10.4], [5.0, 2.3, 9.8]], look: [[-11, 1.9, -3], [-11, 2.0, -3]], fov: [40, 36], shadow: 14,
    run(t, lt) {
      placeDante(t, 'idle', lt);
      const turn = ease(clamp(lt / 0.7, 0, 1)); placeHale(t, lt < 0.7 ? 'idle' : 'handsOnHips', lt - 0.7, 'cold', lerp(-Math.PI / 2 - 0.3, H_YAW, turn));
    } });
  F.card(S('show', 0.3), E('hale', -0.1), { kind: 'name', name: 'HALE INVERNO', sub: 'RICH · COLD · ECHO: TSURARA', color: '#2fa8d8' });
  // C · "Hale Inverno. Rich. Cold. And his Echo… was even colder." (close on Hale; TSURARA appears behind him)
  const HC_T = S('hale', -0.1), TS_APPEAR = WD('hale', 'colder') - 0.6;
  EB.shot({ t0: HC_T, loc: 'fortress', pos: (lt) => head(hale, -0.05).add(V(2.2 - lt * 0.1, 0.1, 2.4 - lt * 0.1)), look: () => head(hale, 0.4), fov: [44, 46], ease: 'linear', shadow: 10, bloom: 0.8,
    run(t, lt) {
      placeHale(t, 'crossArms', lt);
      if (t > TS_APPEAR) { const p = popIn(t, TS_APPEAR, 0.45); ts(t, { at: beside(hale, -1.0, 1.3), yaw: H_YAW, power: Math.min(1, p * 1.2), scale: 0.4 + 0.6 * p }); }
    } });
  F.flash(TS_APPEAR, 0.2, '#d8f6ff', 0.8);
  // D · 「凍りつけ。」 TSURARA slams the lance down (low front)
  const FR_T = S('freeze', -0.2);
  EB.shot({ t0: FR_T, loc: 'fortress', pos: [[-3.2, 1.0, 4.2], [-3.6, 0.9, 3.6]], look: [[-8.6, 3.6, -1.6], [-8.6, 3.8, -1.6]], fov: [50, 48], shadow: 12, bloom: 0.9,
    run(t, lt) {
      placeHale(t, 'crossArms', lt + 3);
      ts(t, { move: lt < 0.4 ? 'power' : 'punch', lt: lt - 0.4 });
    } });
  // E · the ice spreads over the whole top and the sea freezes (high wide)
  EB.shot({ t0: T_FREEZE, loc: 'fortress', pos: [[22, 15, 30], [24, 17, 33]], look: [[-4, 0, -2], [-4, 0, -2]], fov: [52, 52], shadow: 32, bloom: 0.8,
    run(t, lt) { placeDante(t, 'idle', lt, 'scared'); placeHale(t, 'crossArms', lt); ts(t, { move: 'punch', lt: lt + 1 }); ice(t); } });
  F.sfx(T_FREEZE + 0.1, T_FREEZE + 2.2, 'パキパキパキ', { x: 50, y: 24, size: 12, rot: -6, color: '#dff8ff', shadow: '#2a8fc8' })
    .flash(T_FREEZE, 0.2, '#e8fbff', 0.6).grade(T_FREEZE, E('arena', 0), { tint: '#4ab8ff', tintAmt: 0.08, fade: 1.0 });
  // F · name card TSURARA (hero shot from below)
  const TC_T = T_FREEZE + 2.3;
  EB.shot({ t0: TC_T, loc: 'fortress', pos: [[-5.6, 0.7, 2.4], [-5.8, 0.75, 2.0]], look: [[-8.3, 4.2, -1.3], [-8.3, 4.3, -1.3]], fov: [52, 50], shadow: 10, bloom: 0.9,
    run(t, lt) { placeHale(t, 'crossArms', lt); ts(t, { move: 'power', lt }); ice(t); } });
  F.card(TC_T + 0.05, TC_T + 1.8, { kind: 'echo', name: 'TSURARA', kanji: '氷柱', color: '#3fd0ff' })
    .sfx(TC_T + 0.1, TC_T + 1.8, 'ゴゴゴ', { kind: 'menace', x: 78, y: 60, size: 11, rot: 9, color: '#7fe6ff', glow: '#1a6fa8' });
  // G · the lance strikes, HIBIKI parries, ice spikes burst up (cut from the Shorts)
  const CL_T = E('freeze', 4.15), STRIKE = CL_T + 0.4;
  EB.shot({ t0: CL_T, loc: 'fortress', pos: [[4.4, 3.4, -10.8], [4.0, 3.2, -10.4]], look: [[MID.x, 2.0, MID.z], [MID.x, 2.2, MID.z]], fov: [54, 56], shadow: 12, shake: 0.01, bloom: 0.9,
    run(t, lt) {
      placeDante(t, 'guard', lt, 'determined'); placeHale(t, 'crossArms', lt); ice(t);
      ts(t, { move: lt < 0.35 ? 'power' : 'punch', lt: lt - 0.35 });
      if (t > STRIKE - 0.3) { const p = popIn(t, STRIKE - 0.3, 0.25); hb(t, { move: 'block', lt: t - STRIKE, power: Math.min(1, p * 1.3), scale: 0.5 + 0.5 * p }); }
      fx3.sparks.set(MID, t - STRIKE, 0.6, 0.8); fx3.wave2.set(MID, V(1, 0, 0.4), (t - STRIKE) / 0.4, 3);
      fx3.spikes.set(V(MID.x, 0, MID.z), (t - STRIKE - 0.2) / 0.6, 4.5);
    } });
  F.flash(STRIKE - 0.3, 0.18, '#bfe6ff', 0.8).sfx(STRIKE, STRIKE + 0.9, 'ガキィン!', { x: 50, y: 28, size: 15, rot: -8, shadow: '#2a8fc8' }).impact(STRIKE, 0.05);
  // H · Dante frozen to the knees; the lance pushes HIBIKI back
  const FZ_T = E('freeze', 6.85);
  const push = (t) => easeOut(clamp((t - FZ_T) / 2.2, 0, 1)) * 2.2;                      // how far HIBIKI is pushed back toward Dante
  const hbPushed = (t, o = {}) => hb(t, Object.assign({ at: [HB[0] + 0.7 * push(t) * 0.45, 0, HB[2] + push(t) * 0.45 * 0.9], move: 'block' }, o));
  const legsIce = (t) => { put(iceLegs, DQ, 0); iceLegs.scale.setScalar(easeOut(ramp(t, FZ_T - 0.2, 0.5)) * (1 - ramp(t, SWITCH_HIT, 0.1))); iceLegs.visible = iceLegs.scale.x > 0.01; };
  const SWITCH = E('power', 0.02), SWITCH_HIT = SWITCH + 0.55;
  EB.shot({ t0: FZ_T, loc: 'fortress', pos: [[6.6, 1.6, 9.8], [6.2, 1.7, 9.4]], look: [[0.4, 1.6, 4.4], [0.2, 1.7, 4.6]], fov: [50, 48], shadow: 10, shake: 0.006, bloom: 0.85,
    run(t, lt) {
      put(dante, DQ, D_YAW); pose(dante, 'frozen', lt, { face: 'pain' }); legsIce(t);
      placeHale(t, 'crossArms', lt); ice(t);
      ts(t, { at: [TS[0] + push(t) * 0.5, 0, TS[2] + push(t) * 0.4], move: 'punch', lt: lt + 1 }); hbPushed(t, { lt });
      fx3.spikes.set(V(MID.x, 0, MID.z), 1, 4.5);
    } });
  F.sfx(FZ_T + 0.2, FZ_T + 1.4, 'ピキッ', { x: 30, y: 62, size: 12, rot: -8, color: '#e8fbff', shadow: '#2a8fc8' });

  // ======================= THINKING MOMENT (slow motion; the inner voice; blue → gold) =======================
  const TH0 = S('cold', -0.3), SLOW = (t) => TH0 + (t - TH0) * 0.12;                      // action time crawls (12 %)
  const frozenScene = (t) => { const ta = SLOW(t); put(dante, DQ, D_YAW); pose(dante, 'frozen', ta, { face: 'pain' }); legsIce(t); placeHale(ta, 'crossArms', ta); ice(t);
    ts(ta, { at: [TS[0] + push(ta) * 0.5, 0, TS[2] + push(ta) * 0.4], move: 'punch', lt: ta - FZ_T + 1 }); hbPushed(ta, { lt: ta - FZ_T }); fx3.spikes.set(V(MID.x, 0, MID.z), 1, 4.5); };
  // I · "Cold… I can't move." zoom into his eyes (cut from the Shorts)
  EB.shot({ t0: TH0, loc: 'fortress', pos: (lt, p) => head(dante, 0.05).add(V(0, 0, 0).add(new THREE.Vector3(Math.sin(D_YAW), 0, Math.cos(D_YAW)).multiplyScalar(lerp(2.6, 1.15, p)))).add(V(0.25, 0.02, 0)),
    look: () => head(dante, 0.08), fov: [40, 30], ease: 'inout', moveDur: E('cold', 0.3) - TH0, shadow: 6, bloom: 0.7,
    run(t) { frozenScene(t); dante.rig.setFace('scared'); } });
  // J · "Wait. That sound. The ice is… cracking." the ice at his feet cracks
  const CR_T = S('crack', -0.25);
  const CRK = V(DQ[0] + 0.75, 0.27, DQ[2] - 1.07);                                         // the crack, on the ice beside his feet
  EB.shot({ t0: CR_T, loc: 'fortress', pos: [[DQ[0] + 2.7, 1.5, DQ[2] + 0.4], [DQ[0] + 2.4, 1.3, DQ[2] + 0.1]], look: [[CRK.x, 0.25, CRK.z], [CRK.x, 0.25, CRK.z]], fov: [46, 40], shadow: 6,
    run(t) { frozenScene(t); fx3.cracks.set(CRK, ramp(t, WD('crack', 'cracking') - 0.3, 1.2), 3.2, '#0a3a5a'); } });
  F.sfx(WD('crack', 'cracking') - 0.2, E('crack', 0.6), 'ピキ…ピキ…', { x: 64, y: 34, size: 11, rot: 6, color: '#e8fbff', shadow: '#2a8fc8' });
  // K · flash inserts: the crack spreading, HIBIKI's speaker shoulder
  const FL1 = E('crack', 0.02), FL2 = FL1 + 0.4;
  EB.shot({ t0: FL1, loc: 'fortress', pos: [[CRK.x + 0.9, 1.3, CRK.z + 0.6]], look: [[CRK.x, 0.25, CRK.z]], fov: [34, 30], shadow: 4,
    run(t) { frozenScene(t); fx3.cracks.set(CRK, 1, 3.2 + (t - FL1) * 4, '#ffffff'); } });
  EB.shot({ t0: FL2, loc: 'fortress', pos: () => { const v = V(); hibiki.rig.props.speakerL.getWorldPosition(v); return v.add(V(1.7, 0.5, 2.1)); }, look: () => { const v = V(); hibiki.rig.props.speakerL.getWorldPosition(v); return v; }, fov: [30, 28], shadow: 4, bloom: 1.1,
    run(t) { frozenScene(t); } });
  F.flash(FL1, 0.08, '#ffffff', 0.9).flash(FL2, 0.08, '#ffffff', 0.9).grade(FL1, S('power', -0.05), { invert: 0, contrast: 1.35, sat: 0.3, fade: 0.02 });
  // L · "Every crack is a sound. And every sound… is power." (his eyes; HIBIKI's speakers pulse with sound rings)
  const PW_T = S('power', -0.05);
  EB.shot({ t0: PW_T, loc: 'fortress', pos: (lt, p) => head(dante, 0.06).add(new THREE.Vector3(Math.sin(D_YAW + 0.5), 0, Math.cos(D_YAW + 0.5)).multiplyScalar(lerp(1.7, 1.25, p))), look: () => head(dante, 0.06), fov: [38, 34], shadow: 6, bloom: 0.9,
    run(t, lt) {
      frozenScene(t); dante.rig.setFace('determined');
      const v = V(); hibiki.rig.props.speakerR.getWorldPosition(v); fx3.wave2.set(v, V(1, 0, 0.3), (lt % 0.7) / 0.7, 2.2);
    } });
  // THE THINKING LOOK: slow, blue, vignette, focus lines; turns gold on "power"
  F.grade(TH0, WD('power', 'power') - 0.1, { sat: 0.35, contrast: 1.1, bright: 0.92, tint: '#2a6cff', tintAmt: 0.35, fade: 0.35, fadeOut: 0.4 })
    .grade(WD('power', 'power') - 0.3, SWITCH, { sat: 0.7, tint: '#ffb21f', tintAmt: 0.3, fade: 0.3, fadeOut: 0.05 })
    .vignette(TH0, SWITCH, 0.85, 0.3).lines(TH0, SWITCH, { kind: 'focus', color: '#cfe6ff', amount: 0.45 });

  // M · SERIOUS SWITCH: a light streak across his eyes, a heavy hit, colors snap back; the ice on his legs bursts
  EB.shot({ t0: SWITCH, loc: 'fortress', pos: () => head(dante, 0.06).add(new THREE.Vector3(Math.sin(D_YAW + 0.3), 0, Math.cos(D_YAW + 0.3)).multiplyScalar(1.3)), look: () => head(dante, 0.06), fov: [36, 36], shadow: 6, bloom: 0.9,
    run(t, lt) {
      put(dante, DQ, D_YAW); pose(dante, t < SWITCH_HIT ? 'frozen' : 'power', t < SWITCH_HIT ? SLOW(t) : t - SWITCH_HIT, { face: 'serious' }); legsIce(t);
      placeHale(t, 'crossArms', t); ice(t);
      fx3.shardsSmall.set(V(DQ[0], 0.6, DQ[2]), t - SWITCH_HIT, 0.4, 3);
    } });
  F.streak(SWITCH, 0.5, 40).impact(SWITCH_HIT, 0.06).flash(SWITCH_HIT + 0.06, 0.15, '#ffffff', 0.8).sfx(SWITCH_HIT, SWITCH_HIT + 0.9, 'ドンッ', { x: 70, y: 30, size: 15, rot: 8 });

  // N · 「響け！響け！響け！」 HIBIKI's barrage into TSURARA: the ice cracks everywhere
  const RS_T = S('resound1', -0.15);
  EB.shot({ t0: RS_T, loc: 'fortress', pos: (lt) => V(-1.4 + Math.sin(lt * 0.8) * 1.2, 2.4, 9.5 - lt * 0.4), look: [[MID.x, 2.3, MID.z]], fov: [56, 60], ease: 'linear', shadow: 14, shake: 0.016, bloom: 1.0,
    run(t, lt) {
      placeDante(t, 'power', lt + 1, 'serious'); placeHale(t, 'idle', lt, 'shocked'); ice(t);
      hb(t, { move: 'barrage', lt });
      const back = easeOut(clamp(lt / 2.6, 0, 1)) * 1.6;
      ts(t, { at: [TS[0] - back * 0.7, 0, TS[2] - back * 0.5], move: 'knockback', lt: lt * 0.5 });
      const chest = head(hibiki, -1.3), tc = head(tsurara, -1.4); fx3.barrage.set(t, chest, tc.clone().sub(chest), 1, 1.7, Math.min(4.5, chest.distanceTo(tc)));
      fx3.cracks2.set(V(MID.x, 0.28, MID.z), lt / 2.2, 22, '#e8fbff'); fx3.wave.set(MID, V(1, 0, 0.5), (lt % 0.45) / 0.45, 3.2);
      fx3.spikes.set(V(MID.x, 0, MID.z), 1 - ramp(t, RS_T + 1.0, 0.8), 4.5);
    } });
  F.sfx(RS_T + 0.2, T_SHATTER, 'ドドドドドド', { kind: 'menace', x: 50, y: 20, size: 13, rot: -6, color: '#5aa8ff', glow: '#1a4fb0' })
    .lines(RS_T, T_SHATTER, { kind: 'speed', amount: 0.55, angle: -0.4, color: '#dff4ff' }).grade(RS_T, T_SHATTER, { contrast: 1.12, sat: 1.15, fade: 0.1 });
  // O · the ice explodes into sparkling shards over the sea (wide, sunset)
  EB.shot({ t0: T_SHATTER, loc: 'fortress', pos: [[30, 9, 34], [36, 12, 40]], look: [[-4, 3, -2], [-4, 5, -2]], fov: [50, 54], ease: 'out', shadow: 32, bloom: 1.0,
    run(t, lt) {
      placeDante(t, 'power', 3, 'serious'); hb(t, { move: 'guard', lt, power: 1 - ramp(t, T_SHATTER + 1.2, 0.8) });
      placeHale(t, lt < 0.4 ? 'idle' : 'kneel', lt - 0.4, 'pain');
      ts(t, { at: [TS[0] - 1.8, 0, TS[2] - 1.2], move: 'knockback', lt: 2, power: 1 - ramp(t, T_SHATTER, 0.6) });
      ice(t); fx3.shards.set(V(-3, 1.0, 0), lt, 1.4, 14); fx3.wave.set(V(-3, 0.5, 0), V(0, 1, 0), lt / 0.8, 26);
    } });
  F.flash(T_SHATTER, 0.3, '#ffffff', 1).sfx(T_SHATTER + 0.05, T_SHATTER + 1.3, 'パリーン!!', { x: 50, y: 26, size: 17, rot: -6, color: '#f4fdff', shadow: '#2a8fc8' });
  // P · "Not bad. Vahl is at the old arena. Tonight." (Hale on one knee, smirking)
  const AR_T = S('arena', -0.15), TONIGHT = WD('arena', 'tonight') - 0.1;
  EB.shot({ t0: AR_T, loc: 'fortress', pos: (lt) => head(hale, 0).add(new THREE.Vector3(Math.sin(H_YAW + 0.4), 0, Math.cos(H_YAW + 0.4)).multiplyScalar(EB.tNow > TONIGHT ? lerp(2.0, 1.25, ease(clamp((EB.tNow - TONIGHT) / 0.4, 0, 1))) * 1.25 : 2.5)).add(V(0, 0.15, 0)), look: () => head(hale, 0.05), fov: [42, 42], shadow: 8,
    run(t, lt) { placeHale(t, 'kneel', 2, 'smirk'); placeDante(t, 'idle', lt, 'determined'); } });

  EB.STILLS.push(103.4, 105.5, 108.3, 111.0, 113.4, 114.6, 116.4, 118.4, 120.6, 123.2, 125.5, 127.5, 129.6, 130.9, 131.3, 133.0, 134.6, 135.3, 136.8, 139.0, 141.5);
})();
