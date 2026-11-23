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

  RT.anim = { MOVES, names: Object.keys(MOVES), pose, apply, mix, set, seq, path };
})();
