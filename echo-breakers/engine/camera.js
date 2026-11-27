// =====================================================================================
// camera.js: the shot system (moved out of the test scene and extended).
//
// A shot = { t0, t1, set, mood, pos: [from, to], look: [from, to], fov: [from, to], ease, shake, update(lt, p) }
//   pos / look are [x, y, z] arrays (world units); `to` may be omitted for a still camera.
//   ease: 'inout' (default) | 'out' | 'in' | 'linear'       shake: 0 = steady … 0.05 = handheld chase
//   update(lt, p): your animation for that shot (lt = seconds since the shot started, p = 0..1 through it)
//
//   const shots = RT.camera.list([...]);  each frame: const s = shots.at(t); RT.camera.apply(camera, s, t);
//
// Helpers that return { pos, look } for common shots:
//   RT.camera.pushIn(target, dir, distFrom, distTo, height)     slow push-in on a face
//   RT.camera.lowAngle(target, dir, dist, below)                 "power" shot from below (Dax, Vire)
//   RT.camera.overShoulder(charPos, lookAt, side)                over-the-shoulder toward something
//   RT.camera.orbit(center, radius, a0, a1, height)              orbit around a character (returns pos path fn)
//   RT.camera.drone(from, to, lookFrom, lookTo)                  fly-over
// Transitions: RT.camera.dips(t, cutTimes, dur) → black overlay opacity for short dip-to-black flashes.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const EASE = { inout: RT.ease, out: RT.easeOut, in: RT.easeIn, linear: (p) => RT.clamp(p, 0, 1) };

  function list(shots) {
    shots = shots.map((s, i) => Object.assign({ i, fov: [42, 42], ease: 'inout', shake: 0 }, s)).sort((a, b) => a.t0 - b.t0);
    return {
      shots,
      at(t) { let s = shots[0]; for (const x of shots) if (t >= x.t0) s = x; return s; },
      cuts() { return shots.slice(1).map((s) => s.t0); },
    };
  }

  // deterministic smooth noise for handheld shake (same t → same wobble)
  function wob(t, seed) { return Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 3.9 + seed * 2.1) * 0.3 + Math.sin(t * 9.3 + seed * 0.7) * 0.2; }

  const P = new THREE.Vector3(), L = new THREE.Vector3();
  function apply(camera, s, t) {
    const lt = t - s.t0, dur = Math.max(0.001, (s.moveDur || s.t1 - s.t0)), p = (EASE[s.ease] || RT.ease)(lt / dur);
    const pos = typeof s.pos === 'function' ? s.pos(lt, p) : null;
    if (pos) P.copy(pos); else { P.copy(V(s.pos[0])); if (s.pos[1]) P.lerp(V(s.pos[1]), p); }
    const look = typeof s.look === 'function' ? s.look(lt, p) : null;
    if (look) L.copy(look); else { L.copy(V(s.look[0])); if (s.look[1]) L.lerp(V(s.look[1]), p); }
    if (s.shake) {
      const a = s.shake * P.distanceTo(L);
      P.x += wob(t, 1) * a; P.y += wob(t, 7) * a * 0.7; P.z += wob(t, 13) * a * 0.5;
      L.x += wob(t, 21) * a * 0.4; L.y += wob(t, 27) * a * 0.4;
    }
    camera.position.copy(P); camera.lookAt(L);
    if (s.roll) camera.rotateZ(typeof s.roll === 'function' ? s.roll(lt, p) : s.roll);
    camera.fov = RT.lerp(s.fov[0], s.fov[1] ?? s.fov[0], p); camera.updateProjectionMatrix();
    return { lt, p, pos: P.clone(), look: L.clone(), fov: camera.fov };
  }

  // ---- shot helpers (all positions in world units) ----
  const pushIn = (target, dir, d0, d1, h = 0) => { const T = V(target), D = V(dir).normalize(); return { pos: [T.clone().addScaledVector(D, d0).add(new THREE.Vector3(0, h, 0)).toArray(), T.clone().addScaledVector(D, d1).add(new THREE.Vector3(0, h, 0)).toArray()], look: [target, target] }; };
  const lowAngle = (target, dir, dist, below = 1.2) => { const T = V(target), D = V(dir).normalize(); const p = T.clone().addScaledVector(D, dist); p.y = Math.max(0.15, T.y - below); return { pos: [p.toArray()], look: [target] }; };
  const overShoulder = (charPos, lookAt, side = 1, back = 1.6, up = 0.5) => {
    const C = V(charPos), A = V(lookAt), dir = A.clone().sub(C).setY(0).normalize(), right = new THREE.Vector3(-dir.z, 0, dir.x);
    return { pos: [C.clone().addScaledVector(dir, -back).addScaledVector(right, 0.45 * side).add(new THREE.Vector3(0, up, 0)).toArray()], look: [lookAt] };
  };
  const orbit = (center, r, a0, a1, h) => (lt, p) => new THREE.Vector3(center[0] + Math.sin(RT.lerp(a0, a1, p)) * r, center[1] + h, center[2] + Math.cos(RT.lerp(a0, a1, p)) * r);
  const drone = (from, to, lookFrom, lookTo) => ({ pos: [from, to], look: [lookFrom, lookTo || lookFrom] });

  // short dip-to-black at each cut: opacity peaks at the cut and lasts `dur` seconds in total
  function dips(t, cuts, dur = 0.1) { let o = 0; for (const c of cuts) o = Math.max(o, 1 - Math.abs(t - c) / (dur / 2)); return RT.clamp(o, 0, 1); }

  RT.camera = { list, apply, pushIn, lowAngle, overShoulder, orbit, drone, dips, wob };
})();
