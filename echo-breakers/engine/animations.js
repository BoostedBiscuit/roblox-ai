// =====================================================================================
// animations.js: reusable Roblox-style moves (a bit stiff and bouncy), all deterministic functions of time.
//
//   RT.anim.set(char, 'walk', t)                      // apply one move at its local time t (seconds)
//   RT.anim.set(char, 'look', t, { turn: 0.6 })       // moves can take options
//   const p = RT.anim.mix(RT.anim.pose('idle', t), RT.anim.pose('wave', t), 0.5); RT.anim.apply(char, p);
//   RT.anim.seq(char, [ { at: 0, name: 'idle' }, { at: 2.5, name: 'raiseHand', face: 'determined' } ], t)   // a timeline
//   const path = RT.anim.path([[0, 0], [4, 2], [6, 8]], 1.6);  path(t) → { x, z, yaw, phase, moving }
//
// Moves: idle, walk, run, jump, talk, look, point, raiseHand, kneel, wave, hug, fallOver,
//        crossArms, facepalm, handsOnHips, cheer
//
// A POSE is a plain object of joint angles (radians) and offsets (studs). Missing keys = 0.
//   y        hips up/down          lean / turn / tilt   whole body forward / turn left / sideways
//   wx wy wz waist bend / twist / side                    hx hy hz   head nod down / turn left / tilt
//   aLf aLo aLt  left arm forward / outward / twist inward   (aR… = right arm)   eL eR  elbow bend
//   lLf lLo      left leg forward / outward                  (lR… = right leg)   kL kR  knee bend
//   fallX fallZ  tip the whole body over at the feet (backward / sideways)  lift   raise while lying
//   face: 'shocked' (optional expression)   mouth: 0 | 1 (closed | open)
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, { clamp, lerp, ease, easeOut, easeOutBack, smooth } = RT;
  const TAU = Math.PI * 2;

  // ---------- the moves ----------
  const MOVES = {
    idle(t) {
      const b = Math.sin(t * 2.1);
      return { y: b * 0.025, wx: b * 0.012, hx: Math.sin(t * 0.7) * 0.03, hy: Math.sin(t * 0.37) * 0.05,
        aLf: Math.sin(t * 1.1) * 0.035, aRf: Math.sin(t * 1.1 + 1) * 0.035, eL: 0.06, eR: 0.06 };
    },
    // o.speed: 1 = normal · o.phase: lock the step cycle to distance walked (RT.anim.path gives it)
    walk(t, o = {}) {
      const ph = o.phase ?? t * TAU * 0.95 * (o.speed || 1), s = Math.sin(ph), amp = 0.62 * (o.amp || 1);
      return { y: -Math.abs(s) * 0.07 + 0.035, wy: s * 0.06, hx: Math.abs(s) * 0.02, hy: -s * 0.03,
        lLf: s * amp, lRf: -s * amp, kL: 0.12 + Math.max(0, -Math.sin(ph - 0.7)) * 0.35, kR: 0.12 + Math.max(0, Math.sin(ph - 0.7)) * 0.35,
        aLf: -s * amp * 0.9, aRf: s * amp * 0.9, eL: 0.15 + Math.max(0, -s) * 0.2, eR: 0.15 + Math.max(0, s) * 0.2 };
    },
    run(t, o = {}) {
      const ph = o.phase ?? t * TAU * 1.45 * (o.speed || 1), s = Math.sin(ph);
      return { y: Math.abs(Math.cos(ph)) * 0.16 - 0.04, lean: 0.14, wy: s * 0.1, hx: -0.1,
        lLf: s * 1.0, lRf: -s * 1.0, kL: 0.25 + Math.max(0, -Math.sin(ph - 0.5)) * 0.85, kR: 0.25 + Math.max(0, Math.sin(ph - 0.5)) * 0.85,
        aLf: -s * 0.95, aRf: s * 0.95, eL: 1.05, eR: 1.05, aLo: 0.05, aRo: 0.05 };
    },
    // one-shot, ~1.0 s: crouch → arms shoot up (classic Roblox jump) → land with a little squash
    jump(t, o = {}) {
      const hgt = o.height ?? 1.9;
      if (t < 0.14) { const p = ease(t / 0.14); return { y: -0.3 * p, lean: 0.12 * p, lLf: 0.3 * p, lRf: 0.3 * p, kL: 0.6 * p, kR: 0.6 * p, aLf: -0.4 * p, aRf: -0.4 * p }; }
      if (t < 0.74) { const p = (t - 0.14) / 0.6, up = easeOut(clamp(p * 3, 0, 1));
        return { y: 4 * p * (1 - p) * hgt, aLf: 2.95 * up, aRf: 2.95 * up, aLo: 0.15, aRo: 0.15, lLf: 0.35, kL: 0.45, lRf: -0.1, kR: 0.15, hx: -0.08 }; }
      const p = clamp((t - 0.74) / 0.3, 0, 1), sq = Math.sin(p * Math.PI);
      return { y: -0.25 * sq, kL: 0.5 * sq, kR: 0.5 * sq, lLf: 0.25 * sq, lRf: 0.25 * sq, aLf: 2.95 * (1 - ease(p)), aRf: 2.95 * (1 - ease(p)) };
    },
    // talking: head bobs, a hand gestures, the mouth opens and closes on a syllable rhythm
    talk(t, o = {}) {
      const P = MOVES.idle(t), k = Math.floor(t * 7.5), open = RT.hash(k * 3.1 + (o.seed || 0)) > 0.3 && t * 7.5 - k < 0.72;
      return Object.assign(P, { hx: Math.sin(t * 4.6) * 0.05 + 0.02, hy: Math.sin(t * 1.3) * 0.07, hz: Math.sin(t * 0.9) * 0.03,
        aRf: 0.25 + Math.sin(t * 2.2) * 0.12, eR: 0.55 + Math.sin(t * 2.2 + 0.5) * 0.2, mouth: o.silent ? 0 : open ? 1 : 0 });
    },
    // o.turn: head turn (+ = character's left), o.nod: + = look down, o.body: turn the whole body too
    look(t, o = {}) {
      const p = easeOut(clamp(t / (o.dur || 0.35), 0, 1));
      return Object.assign(MOVES.idle(t), { hy: (o.turn ?? 0.6) * p, hx: (o.nod || 0) * p, turn: (o.body || 0) * p, wy: (o.turn ?? 0.6) * 0.2 * p });
    },
    point(t, o = {}) {
      const p = easeOutBack(clamp(t / 0.35, 0, 1));
      return Object.assign(MOVES.idle(t), { aRf: 1.5 * p, aRo: 0.05, eR: 0.02, wy: -0.12 * p, lean: 0.04 * p, hy: -0.08 * p });
    },
    // the volunteer moment: right arm shoots straight up, chin up
    raiseHand(t) {
      const p = easeOutBack(clamp(t / 0.45, 0, 1), 2.2), tr = t > 0.45 ? Math.sin(t * 9) * 0.015 : 0;
      return Object.assign(MOVES.idle(t), { aRf: 3.05 * p + tr, aRo: -0.08 * p, eR: 0, y: 0.05 * p, hx: -0.12 * p, wz: -0.05 * p, aLo: 0.12 });
    },
    kneel(t) {
      const p = ease(clamp(t / 0.6, 0, 1));
      if (!RT.BEND_LIMBS) return { y: -1.0 * p, lRf: 1.05 * p, lLf: -1.05 * p, hx: 0.35 * p, aLf: 0.3 * p, aRf: 0.15 * p };
      return { y: -0.62 * p, lRf: 1.2 * p, kR: 1.2 * p, lLf: -0.05 * p, kL: 1.5 * p, hx: 0.35 * p + Math.sin(t * 2) * 0.01, aLf: 0.45 * p, eL: 0.7 * p, aRf: 0.12 * p, eR: 0.2 * p, wx: 0.08 * p };
    },
    wave(t) {
      const p = easeOutBack(clamp(t / 0.35, 0, 1)), w = Math.sin(t * TAU * 1.8) * 0.35;
      return Object.assign(MOVES.idle(t), { aRo: (2.35 + w) * p, aRf: 0.25 * p, eR: 0.25 * p, hz: -0.08 * p, wz: 0.04 * p });
    },
    hug(t) {
      const p = easeOut(clamp(t / 0.4, 0, 1)), sq = Math.sin(t * 2.4) * 0.03;
      return { aLf: 1.35 * p, aRf: 1.35 * p, aLo: -0.32 * p, aRo: -0.32 * p, aLt: 0.25 * p, aRt: 0.25 * p, eL: (0.95 + sq) * p, eR: (0.95 + sq) * p,
        lean: 0.08 * p, hz: 0.15 * p, hx: 0.08 * p, y: Math.sin(t * 2.1) * 0.02 };
    },
    // one-shot, ~1.3 s: stiff plank fall backward, small bounce, arms flail (face → shocked)
    fallOver(t) {
      const fall = Math.PI / 2;
      let a = t < 0.7 ? fall * Math.pow(t / 0.7, 2) : fall - 0.16 * Math.abs(Math.sin((t - 0.7) * 9)) * Math.exp(-(t - 0.7) * 5);
      const p = clamp(t / 0.4, 0, 1), fl = t < 0.75 ? Math.sin(t * 15) * 0.35 : 0;
      return { fallX: a, lift: 0.5 * Math.sin(a), aLf: 2.4 * p + fl, aRf: 2.3 * p - fl, aLo: 0.4 * p, aRo: 0.4 * p, lLf: 0.35 * p, lRf: 0.1 * p, hx: -0.2 * p, face: 'shocked' };
    },
    crossArms(t) {
      const p = easeOut(clamp(t / 0.4, 0, 1));
      return Object.assign(MOVES.idle(t), { aLf: 0.55 * p, aRf: 0.62 * p, aLo: -0.1 * p, aRo: -0.1 * p, aLt: 0.95 * p, aRt: 0.95 * p, eL: 1.45 * p, eR: 1.6 * p, lean: -0.03 * p, hx: -0.05 * p });
    },
    facepalm(t) {
      const p = easeOut(clamp(t / 0.45, 0, 1));
      return Object.assign(MOVES.idle(t), { aRf: 1.0 * p, aRo: -0.15 * p, aRt: 0.7 * p, eR: 2.0 * p, hx: (0.32 + Math.sin(t * 1.7) * 0.03) * p, hy: -0.12 * p, wx: 0.08 * p });
    },
    handsOnHips(t) {
      const p = easeOut(clamp(t / 0.4, 0, 1));
      return Object.assign(MOVES.idle(t), { aLo: 0.62 * p, aRo: 0.62 * p, aLf: -0.05 * p, aRf: -0.05 * p, aLt: 1.5 * p, aRt: 1.5 * p, eL: 1.3 * p, eR: 1.3 * p, lLo: 0.06 * p, lRo: 0.06 * p, hx: -0.06 * p });
    },
    // sitting on a low seat (about 0.6 studs): thighs level, shins down, slumped (o.slump 0..1)
    sit(t, o = {}) {
      const sl = o.slump ?? 0.6, b = Math.sin(t * 1.6) * 0.012;
      return { y: -0.97 + b, lLf: 1.57, lRf: 1.5, kL: 1.57, kR: 1.5, lLo: 0.08, lRo: 0.08, wx: 0.08 + 0.2 * sl, hx: 0.1 + 0.2 * sl + Math.sin(t * 0.5) * 0.02,
        aLf: 0.75, aRf: 0.75, eL: 0.75, eR: 0.75, aLo: 0.05, aRo: 0.05 };
    },
    // sitting and drinking from a flask held in the right hand
    sitDrink(t, o = {}) {
      const P = MOVES.sit(t, { slump: 0.3 }), up = 0.5 + 0.5 * Math.sin(t * 0.9);
      return Object.assign(P, { aRf: 1.15 + up * 0.25, eR: 1.9 + up * 0.25, aRt: 0.55, aRo: -0.05, hx: -0.15 - up * 0.2, wx: 0.06 });
    },
    // reach forward and down (a hand into the glass bowl)
    reach(t) {
      const p = RT.ease(clamp(t / 0.8, 0, 1)), stir = Math.sin(t * 3) * 0.06 * p;
      return Object.assign(MOVES.idle(t), { aRf: 0.95 * p + stir, eR: 0.45 * p, aRo: -0.12 * p, aRt: 0.2 * p, lean: 0.1 * p, hx: 0.3 * p, wy: -0.1 * p });
    },
    // hold a paper slip up and read it
    reveal(t) {
      const p = easeOut(clamp(t / 0.5, 0, 1));
      return Object.assign(MOVES.idle(t), { aRf: 1.25 * p, eR: 1.25 * p, aRt: 0.55 * p, aLf: 1.1 * p, eL: 1.3 * p, aLt: 0.5 * p, hx: 0.12 * p });
    },
    // hold a paper in both hands at chest height and look down to read it
    readSlip(t, o = {}) {
      const p = o.hold ? 1 : easeOut(clamp(t / 0.5, 0, 1));
      return Object.assign(MOVES.idle(t), { aRf: 0.8 * p, eR: 0.95 * p, aRt: 0.5 * p, aLf: 0.8 * p, eL: 0.95 * p, aLt: 0.5 * p, hx: 0.22 * p, wx: 0.04 * p });
    },
    // kneeling and tying something on someone's wrist (both hands forward)
    kneelTie(t) {
      const K = MOVES.kneel(Math.max(t, 0.6)), w = Math.sin(t * 6) * 0.05;
      return Object.assign(K, { aLf: 1.05 + w, eL: 0.9, aLt: 0.35, aRf: 1.1 - w, eR: 0.95, aRt: 0.35, hx: 0.3 });
    },
    // holding one arm out (the wrist being tied)
    holdOut(t) { const p = easeOut(clamp(t / 0.4, 0, 1)); return Object.assign(MOVES.idle(t), { aLf: 0.95 * p, eL: 0.25 * p, hx: 0.25 * p }); },
    // lean in close (to whisper)
    leanIn(t, o = {}) {
      const p = RT.ease(clamp(t / 0.7, 0, 1));
      return Object.assign(MOVES.talk(t, o), { lean: 0.16 * p, wx: 0.12 * p, hz: (o.tilt ?? 0.14) * p, hx: 0.12 * p, aRf: 0.3, eR: 0.5 });
    },
    // arms opened toward the crowd (speech)
    present(t, o = {}) {
      const p = easeOut(clamp(t / 0.6, 0, 1));
      return Object.assign(MOVES.talk(t, o), { aLo: 0.45 * p, aRo: 0.45 * p, aLf: 0.55 * p, aRf: 0.55 * p, eL: 0.35, eR: 0.35 });
    },
    // trembling (scared, standing still)
    // ECHO BREAKERS fight poses (used by the Echoes and the heroes)
    guard(t) {      // fists up, ready to punch
      const p = easeOut(clamp(t / 0.3, 0, 1)), b = Math.sin(t * 3) * 0.03;
      return Object.assign(MOVES.idle(t), { aLf: 1.25 * p + b, aRf: 0.95 * p - b, aLo: -0.18 * p, aRo: -0.12 * p, eL: 1.75 * p, eR: 2.0 * p, lean: 0.07 * p, hx: 0.1 * p, lLf: 0.22 * p, lRf: -0.18 * p, lLo: 0.1 * p, lRo: 0.1 * p, wy: -0.12 * p });
    },
    punch(t) {      // one big right straight (0.18 s out), then held
      const p = easeOut(clamp(t / 0.18, 0, 1));
      return Object.assign(MOVES.idle(t), { aRf: 1.58 * p, eR: 0.15 * (1 - p) + 0.05, aRt: 0.1, aLf: 1.0 * p, eL: 1.9 * p, aLo: -0.2 * p, lean: 0.22 * p, wy: 0.35 * p, hx: 0.1 * p, lLf: 0.35 * p, lRf: -0.3 * p, kL: 0.3 * p });
    },
    barrage(t) {    // rapid alternating punches (use with RT.fx.barrage for the storm of fists)
      const k = t * 13, l = Math.max(0, Math.sin(k)), r = Math.max(0, Math.sin(k + Math.PI)), p = easeOut(clamp(t / 0.15, 0, 1));
      return { aLf: (1.0 + 0.58 * l) * p, aRf: (1.0 + 0.58 * r) * p, eL: (1.6 - 1.5 * l) * p, eR: (1.6 - 1.5 * r) * p, aLo: -0.15 * p, aRo: -0.15 * p,
        lean: 0.18 * p, wy: Math.sin(k) * 0.12, hx: 0.12 * p, lLf: 0.3 * p, lRf: -0.25 * p, kL: 0.35 * p, kR: 0.1 * p, y: -0.08 * p };
    },
    block(t) {      // forearms crossed in front of the face
      const p = easeOut(clamp(t / 0.15, 0, 1));
      return Object.assign(MOVES.idle(t), { aLf: 1.45 * p, aRf: 1.35 * p, aLo: -0.35 * p, aRo: -0.3 * p, eL: 1.75 * p, eR: 1.85 * p, aLt: 0.6 * p, aRt: 0.6 * p, lean: 0.12 * p, hx: 0.2 * p, lLf: 0.25 * p, kL: 0.3 * p, y: -0.1 * p });
    },
    knockback(t) {  // hit hard: thrown backward, arms flung forward
      const p = easeOut(clamp(t / 0.25, 0, 1));
      return { lean: -0.45 * p, fallX: -0.25 * p, aLf: 1.3 * p, aRf: 1.1 * p, aLo: 0.5 * p, aRo: 0.6 * p, eL: 0.3, eR: 0.4, lLf: 0.6 * p, lRf: 0.25 * p, kL: 0.4 * p, hx: -0.35 * p, face: 'pain' };
    },
    shout(t) {      // all-out scream: chest out, fists down and back, head up
      const p = easeOut(clamp(t / 0.2, 0, 1)), tr = Math.sin(t * 40) * 0.015;
      return { aLo: 0.55 * p, aRo: 0.55 * p, aLf: -0.35 * p, aRf: -0.35 * p, eL: 0.5 * p, eR: 0.5 * p, lean: -0.12 * p + tr, hx: -0.28 * p, lLo: 0.2 * p, lRo: 0.2 * p, kL: 0.2 * p, kR: 0.2 * p, y: -0.12 * p, face: 'shout', mouth: 1 };
    },
    conduct(t) {    // Maestro Vahl conducting: baton arm beating a pattern, the other hand rising
      const b = t * 2.6, x = Math.sin(b * Math.PI) * 0.35, y = Math.abs(Math.cos(b * Math.PI)) * 0.4;
      return Object.assign(MOVES.idle(t), { aRf: 1.7 + y, aRo: 0.35 + x, eR: 0.55, aLf: 1.2 + Math.sin(t * 1.3) * 0.2, aLo: 0.55, eL: 0.4, hx: -0.12, lean: -0.04, wy: x * 0.2 });
    },
    puppet(t) {     // pulled by strings: jerky steps, arms yanked up, head lolling
      const k = Math.floor(t * 4.2), j = (n) => RT.hash(k * 7.3 + n) - 0.5, s = 1 - Math.pow(1 - ((t * 4.2) % 1), 4);
      return { aLf: 2.2 + j(1) * 1.2 * s, aRf: 2.0 + j(2) * 1.2 * s, aLo: 0.5 + j(3) * 0.6, aRo: 0.5 + j(4) * 0.6, eL: 0.4 + j(5), eR: 0.4 + j(6),
        lLf: j(7) * 0.9 * s, lRf: j(8) * 0.9 * s, kL: 0.3 + j(9) * 0.5, kR: 0.3 + j(10) * 0.5, hx: 0.35 + j(11) * 0.3, hz: j(12) * 0.6, lean: j(13) * 0.25, y: -0.1 + j(14) * 0.15 };
    },
    slip(t) {       // cartoon slip: feet fly up, lands flat on the back
      const a = t < 0.45 ? Math.PI / 2 * Math.pow(t / 0.45, 1.5) : Math.PI / 2 - 0.12 * Math.abs(Math.sin((t - 0.45) * 10)) * Math.exp(-(t - 0.45) * 6);
      const p = clamp(t / 0.25, 0, 1);
      return { fallX: a, lift: 0.9 * Math.sin(Math.min(Math.PI, t * 5)) + 0.45 * Math.sin(a), lLf: 1.3 * p, lRf: 0.9 * p, aLf: 2.6 * p, aRf: 2.2 * p, aLo: 0.5, aRo: 0.5, hx: -0.3 * p, face: 'shocked' };
    },
    reachUp(t) {    // both arms up, reaching for something above
      const p = easeOut(clamp(t / 0.25, 0, 1)), w = Math.sin(t * 9) * 0.15;
      return Object.assign(MOVES.idle(t), { aLf: 2.85 * p + w, aRf: 2.95 * p - w, aLo: 0.12, aRo: 0.12, eL: 0.15, eR: 0.15, hx: -0.4 * p, y: Math.max(0, Math.sin(t * 6)) * 0.12 });
    },
    headphonesOff(t) {   // hands grab the headphones at the neck (0–0.4 s), rip them up and throw them down (0.4–0.8 s)
      const g = easeOut(clamp(t / 0.35, 0, 1)), th = easeOut(clamp((t - 0.45) / 0.25, 0, 1));
      return { aLf: 2.1 * g * (1 - th) + 0.2 * th, aRf: 2.1 * g * (1 - th) + 1.2 * th, aLo: -0.3 * g, aRo: -0.3 * g + 0.2 * th, eL: 2.0 * g * (1 - th), eR: 2.0 * g * (1 - th) + 0.1, hx: 0.25 * th - 0.1 * g, lean: 0.18 * th, wy: -0.2 * th, face: th > 0 ? 'shout' : 'serious' };
    },
    frozen(t) {     // stuck in ice to the knees: upper body straining, arms pulling
      const s = Math.sin(t * 3.2);
      return { lean: 0.12 + s * 0.05, wy: s * 0.15, aLf: 0.6 + s * 0.3, aRf: 0.9 - s * 0.3, eL: 1.2, eR: 1.0, aLo: 0.3, aRo: 0.35, hx: 0.12, y: -0.05, face: 'pain' };
    },
    power(t) {      // menacing stance: chest out, arms down and out, fists clenched, chin down
      const p = easeOut(clamp(t / 0.4, 0, 1)), b = Math.sin(t * 2.2) * 0.02;
      return Object.assign(MOVES.idle(t), { aLo: 0.42 * p + b, aRo: 0.42 * p - b, aLf: 0.18 * p, aRf: 0.18 * p, eL: 0.35 * p, eR: 0.35 * p, hx: 0.16 * p, lean: -0.04 * p, lLo: 0.16 * p, lRo: 0.16 * p });
    },
    tremble(t) { const s = Math.sin(t * 38) * 0.02; return Object.assign(MOVES.idle(t), { hx: 0.12 + s, aLf: 0.25 + s, aRf: 0.25 - s, eL: 0.6, eR: 0.6, aLt: 0.6, aRt: 0.6, wx: 0.06 }); },
    // crowds at the Capital: both arms up and bouncing
    cheer(t) {
      const b = Math.max(0, Math.sin(t * 7));
      return { y: b * 0.3, aLf: 2.7 + Math.sin(t * 6) * 0.2, aRf: 2.7 - Math.sin(t * 6) * 0.2, aLo: 0.3, aRo: 0.3, eL: 0.2, eR: 0.2, hx: -0.15, kL: b * 0.3, kR: b * 0.3 };
    },
  };

  // ---------- applying a pose to a character ----------
  const ZERO = {};
  function apply(char, P = ZERO) {
    const r = char.rig || char, B = r.base, v = (k) => (P[k] || 0) + (B[k] || 0), bend = RT.BEND_LIMBS ? 1 : 0;
    r.inner.rotation.set(-v('fallX'), 0, v('fallZ'));
    r.inner.position.y = v('lift') * r.unit;
    r.hips.position.y = r.dims.ul + r.dims.ll + v('y');
    r.hips.rotation.set(v('lean'), v('turn'), v('tilt'));
    r.waist.rotation.set(v('wx'), v('wy'), v('wz'));
    r.neck.rotation.set(v('hx'), v('hy'), v('hz'));
    r.armL.rotation.set(-v('aLf'), -v('aLt'), v('aLo'));     // left arm is on +x: outward = +z rotation, inward twist = −y
    r.armR.rotation.set(-v('aRf'), v('aRt'), -v('aRo'));
    r.elbowL.rotation.x = -v('eL') * bend; r.elbowR.rotation.x = -v('eR') * bend;
    r.legL.rotation.set(-v('lLf'), 0, v('lLo')); r.legR.rotation.set(-v('lRf'), 0, -v('lRo'));
    r.kneeL.rotation.x = v('kL') * bend; r.kneeR.rotation.x = v('kR') * bend;
    for (const f of r.followers) f(r);
    if (P.face) r.setFace(P.face);
    if (P.mouth !== undefined) r.setMouth(P.mouth > 0.5);
  }

  function pose(name, t, o) {
    const fn = MOVES[name]; if (!fn) throw new Error('unknown move: ' + name + ' (have: ' + Object.keys(MOVES).join(', ') + ')');
    return fn(Math.max(0, t), o || {});
  }
  // blend two poses (w = 0 → a, 1 → b)
  function mix(a, b, w) {
    const out = {}, keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (k === 'face') out.face = w < 0.5 ? a.face : b.face;
      else if (k === 'mouth') out.mouth = w < 0.5 ? a.mouth ?? 0 : b.mouth ?? 0;
      else out[k] = lerp(a[k] || 0, b[k] || 0, w);
    }
    return out;
  }
  function set(char, name, t, o) { const P = pose(name, t, o); apply(char, P); if (o && o.face) char.rig.setFace(o.face); return P; }

  // Timeline: clips = [{ at: seconds, name, opts, blend: 0.25, face: 'sad' }, ...] sorted by `at`.
  // The previous move blends into the next over `blend` seconds. Pure function of t.
  function seq(char, clips, t) {
    let i = 0; for (let k = 0; k < clips.length; k++) if (t >= clips[k].at) i = k;
    const c = clips[i], lt = t - c.at; let P = pose(c.name, lt, c.opts);
    const bl = c.blend ?? 0.25;
    if (i > 0 && lt < bl) { const pc = clips[i - 1]; P = mix(pose(pc.name, t - pc.at, pc.opts), P, smooth(0, 1, lt / bl)); }
    apply(char, P);
    let face = null; for (let k = 0; k <= i; k++) if (clips[k].face) face = clips[k].face;
    if (face && !P.face) char.rig.setFace(face);
    return P;
  }

  // Walk along points [[x, z], ...] at `speed` world units/s, starting at time t0. Returns fn(t) → position,
  // facing (yaw) and a step phase locked to the distance (so feet don't slide).
  function path(points, speed = 1.6, t0 = 0, stride = 0.55) {
    const seg = [], tot = points.slice(1).reduce((n, p, i) => { const l = Math.hypot(p[0] - points[i][0], p[1] - points[i][1]); seg.push(l); return n + l; }, 0);
    return function (t) {
      let dist = clamp((t - t0) * speed, 0, tot), i = 0;
      const moving = t > t0 && (t - t0) * speed < tot;
      while (i < seg.length - 1 && dist > seg[i]) { dist -= seg[i]; i++; }
      const a = points[i], b = points[i + 1] || a, f = seg[i] ? clamp(dist / seg[i], 0, 1) : 1;
      const travelled = clamp((t - t0) * speed, 0, tot);
      return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), phase: (travelled / stride) * Math.PI, moving, done: !moving && t > t0, length: tot };
    };
  }

  // Actor script: a character's whole performance as a list of steps (pure function of t).
  //   const play = RT.anim.actor(pip, [
  //     { at: 0, pos: [x, y, z], yaw: 0, move: 'idle', face: 'scared' },          // first step: where they start
  //     { at: 12, to: [x, y, z], speed: 1.4, gait: 'walk', move: 'idle' },         // walk there from 12 s, then idle
  //     { at: 20, move: 'wave', yaw: 1.2 },                                       // change move / facing in place
  //   ]);   each frame: play(t);
  const lerpAngle = (a, b, p) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * p; };
  function actor(char, steps) {
    const segs = []; let pos = steps[0].pos.slice(), yaw = steps[0].yaw ?? 0;
    for (const s0 of steps) {
      // a step never starts before the previous walk has arrived (otherwise the character would jump to its end point)
      const busy = segs.length ? segs[segs.length - 1].t1 : -Infinity, s = s0.at < busy ? Object.assign({}, s0, { at: busy }) : s0;
      if (s0.at < busy - 0.05 && window.RT_DEBUG_ACTOR) console.error('actor ' + (char.name || '') + ': step at ' + s0.at.toFixed(2) + ' waits ' + (busy - s0.at).toFixed(2) + ' s for the walk to end');
      const from = pos.slice(), startYaw = yaw;
      if (s.to) {
        // s.via: waypoints walked through without stopping (e.g. around a table), then s.to
        const pts = [...(s.via || []), s.to];
        let t0 = s.at, cur = from, d0 = 0, prevYaw = startYaw;
        pts.forEach((p, k) => {
          const last = k === pts.length - 1, dx = p[0] - cur[0], dz = p[2] - cur[2], dist = Math.hypot(dx, dz, (p[1] - cur[1]) * 0.5);
          const travel = dist > 1e-3 ? Math.atan2(dx, dz) : prevYaw, dur = dist / (s.speed || 1.3);
          segs.push({ s, t0, t1: t0 + dur, from: cur.slice(), to: p.slice(), startYaw: prevYaw, travel, endYaw: last ? (s.yaw ?? travel) : travel, dist, d0, cont: k > 0 });
          t0 += dur; d0 += dist; cur = p; prevYaw = travel;
        });
        pos = s.to.slice(); yaw = s.yaw ?? prevYaw;
      } else { segs.push({ s, t0: s.at, t1: s.at, from, to: from, startYaw, travel: yaw, endYaw: s.yaw ?? yaw, dist: 0 }); yaw = s.yaw ?? yaw; }
    }
    const unit = (char.rig.unit / RT.STUD) * RT.STUD;            // world units per stud for this character
    const evalSeg = (g, t) => {
      const s = g.s;
      if (t < g.t1) {               // travelling
        const p = clamp((t - g.t0) / (g.t1 - g.t0), 0, 1), travelled = p * g.dist;
        const P = pose(s.gait || 'walk', t, Object.assign({ phase: (((g.d0 || 0) + travelled) / (s.gait === 'run' ? 0.9 : 0.6)) * Math.PI }, s.gaitOpts || {}));
        return { P, pos: [lerp(g.from[0], g.to[0], p), lerp(g.from[1], g.to[1], p), lerp(g.from[2], g.to[2], p)], yaw: s.keepYaw ? g.startYaw : lerpAngle(g.startYaw, g.travel, clamp((t - g.t0) / 0.25, 0, 1)) };   // keepYaw: step back / sideways
      }
      const lt = t - g.t1;
      return { P: pose(s.move || 'idle', lt, s.opts), pos: g.to, yaw: lerpAngle(g.dist && !s.keepYaw ? g.travel : g.startYaw, g.endYaw, clamp(lt / 0.35, 0, 1)) };
    };
    return function (t) {
      let i = 0; for (let k = 0; k < segs.length; k++) if (t >= segs[k].t0) i = k;
      const g = segs[i]; let r = evalSeg(g, t);
      const since = t - g.t0;
      if (i > 0 && since < 0.25 && !g.cont) { const prev = evalSeg(segs[i - 1], t); r = { ...r, P: mix(prev.P, r.P, RT.smooth(0, 1, since / 0.25)) }; }
      char.position.set(r.pos[0], r.pos[1], r.pos[2]); char.rotation.y = r.yaw;
      apply(char, r.P);
      let face = null; for (let k = 0; k <= i; k++) if (segs[k].s.face) face = segs[k].s.face;
      if (face && !r.P.face) char.rig.setFace(face);
      return r;
    };
  }

  RT.anim = { MOVES, names: Object.keys(MOVES), pose, apply, mix, set, seq, path, actor };
})();
