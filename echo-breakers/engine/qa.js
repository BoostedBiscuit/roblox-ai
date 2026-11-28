// =====================================================================================
// qa.js: automatic clipping checks used by  node reaping-trials/tools/qa.js <episode>
//
//   RT.qa.prepare(scene)                      once, before checking (makes every surface hittable from both sides)
//   RT.qa.camera(scene, camera, {ground})     → { near: {d, name, at}, inside: name|null }   (camera touching / inside something)
//   RT.qa.blocked(scene, camera, ch)          → name of whatever hides ch's face from the camera, or null
//   RT.qa.bodyPoints(ch)                      → sample points on a character's body (head, torso, arms, legs)
//   RT.qa.hitsChar(p, r, ch)                  → part name if the sphere (p, r) is inside ch's head / torso / limbs
//   RT.qa.hitsCrowd(p, r, people)             → index of the crowd member the sphere is inside, or -1
//   RT.qa.hitsSolid(p, r, solids)             → the solid (box / cylinder from a set's spots.solids()) it is inside
// Nothing here is used when the episode plays or renders.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT;
  const V = () => new THREE.Vector3();

  // 42 directions spread evenly over a sphere
  const DIRS = (() => { const out = [], n = 42, ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), a = ga * i; out.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); } return out; })();

  function prepare(scene) {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some((m) => m.side === THREE.BackSide)) { o.userData.qaSkip = true; return; }     // sky domes
      for (const m of mats) m.side = THREE.DoubleSide;
    });
  }
  const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const label = (o) => { for (let p = o; p; p = p.parent) if (p.name && p.name !== 'avatar') return p.name; return o.type; };
  const tmpMesh = new THREE.Mesh(), mw = new THREE.Matrix4(), im = new THREE.Matrix4(), sph = new THREE.Sphere(), nm = new THREE.Matrix3();

  // every visible mesh (and every instance) whose bounding sphere comes within `far` of point p
  function nearby(scene, p, far) {
    const out = [];
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.qaSkip || !visible(o)) return;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, im); mw.multiplyMatrices(o.matrixWorld, im);
          sph.copy(g.boundingSphere).applyMatrix4(mw);
          if (sph.center.distanceTo(p) - sph.radius < far) out.push({ o, m: mw.clone(), id: i });
        }
      } else {
        sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
        if (sph.center.distanceTo(p) - sph.radius < far) out.push({ o, m: o.matrixWorld, id: -1 });
      }
    });
    return out;
  }
  function cast(list, origin, dir, far) {
    const rc = new THREE.Raycaster(origin, dir, 0, far), hits = [];
    for (const it of list) {
      tmpMesh.geometry = it.o.geometry; tmpMesh.material = it.o.material; tmpMesh.matrixWorld.copy(it.m);
      const h = []; tmpMesh.raycast(rc, h);
      for (const x of h) { x.item = it; hits.push(x); }
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }
  const backFace = (hit, dir) => { nm.getNormalMatrix(hit.item.m); return hit.face.normal.clone().applyMatrix3(nm).normalize().dot(dir) > 0; };

  function camera(scene, cam, o = {}) {
    const p = cam.position, FAR = 4, NEAR = o.near || 0.25;
    const list = nearby(scene, p, FAR);
    let near = null, back = 0, hitDirs = 0, backName = {};
    for (const d of DIRS) {
      const hits = cast(list, p, d, FAR); if (!hits.length) continue;
      const h = hits[0]; hitDirs++;
      if (h.distance < NEAR && (!near || h.distance < near.d)) near = { d: h.distance, name: label(h.item.o) + (h.item.id >= 0 ? '#' + h.item.id : ''), at: h.point.toArray().map((v) => +v.toFixed(2)) };
      if (backFace(h, d)) { back++; const n = label(h.item.o) + (h.item.id >= 0 ? '#' + h.item.id : ''); backName[n] = (backName[n] || 0) + 1; }
    }
    const inside = back >= 8 ? Object.keys(backName).sort((a, b) => backName[b] - backName[a])[0] : null;
    const below = o.ground && p.y < o.ground(p.x, p.z) + 0.3 ? 'ground' : null;
    return { near, inside: inside || below };
  }

  // what is between the camera and a character's face?
  function blocked(scene, cam, ch) {
    const target = V(); ch.rig.head.getWorldPosition(target);
    const dir = target.clone().sub(cam.position), dist = dir.length(); dir.normalize();
    const list = [];
    scene.traverse((o) => { if (o.isMesh && !o.userData.qaSkip && visible(o)) list.push(o); });
    const rc = new THREE.Raycaster(cam.position.clone(), dir, 0, dist - 0.35);
    for (const h of rc.intersectObjects(list, false)) {
      let own = false; for (let q = h.object; q; q = q.parent) if (q === ch) own = true;
      if (own) continue;
      const mats = Array.isArray(h.object.material) ? [h.object.material[h.face.materialIndex]] : [h.object.material];
      if (mats.some((m) => m && m.transparent && m.opacity < 0.6)) continue;          // glass does not hide anyone
      if (h.object.isInstancedMesh && h.object.material.transparent) continue;
      return label(h.object) + (h.instanceId !== undefined ? '#' + h.instanceId : '') + ` (at ${h.point.toArray().map((v) => v.toFixed(2)).join(', ')}, ${h.distance.toFixed(1)} m from the camera, face ${dist.toFixed(1)} m)`;
    }
    return null;
  }

  // ---------- bodies ----------
  const wp = (o, x = 0, y = 0, z = 0) => o.localToWorld(V().set(x, y, z));
  function bodyPoints(ch) {
    const R = ch.rig, d = R.dims, u = R.unit, pts = [];
    const add = (part, p, r) => pts.push({ part, p, r });
    add('head', wp(R.head), 0.22 * u / RT.STUD);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('torso', wp(R.upper, sx * d.uw * 0.42, 0, sz * d.ud * 0.4), 0.06);
    add('torso', wp(R.lower), 0.12);
    for (const s of ['L', 'R']) {
      const sh = wp(R['arm' + s], 0, 0.1, 0), el = wp(R['elbow' + s]), ha = wp(R['hand' + s], 0, -d.hand * 0.4, 0);
      add('arm' + s, sh.clone().lerp(el, 0.5), 0.1); add('elbow' + s, el, 0.1); add('hand' + s, ha, 0.09);
      const kn = wp(R['knee' + s]), ft = wp(R['foot' + s]); ft.y += 0.12 * u / RT.STUD;     // (a little above the sole, so standing on a floor is fine)
      add('knee' + s, kn, 0.1); add('foot' + s, ft, 0.05);
    }
    return pts;
  }
  // is sphere (p, r) inside one of ch's parts? (boxes in the part's own frame; limbs as capsules)
  function inBox(p, r, obj, hx, hy, hz) {
    const q = obj.worldToLocal(p.clone()), s = obj.getWorldScale(V()).x, m = r / s;
    return Math.abs(q.x) < hx + m && Math.abs(q.y) < hy + m && Math.abs(q.z) < hz + m;
  }
  function segDist(p, a, b) { const ab = b.clone().sub(a), t = RT.clamp(p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1); return a.clone().addScaledVector(ab, t).distanceTo(p); }
  function hitsChar(p, r, ch) {
    const R = ch.rig, d = R.dims, u = R.unit;
    if (inBox(p, r, R.upper, d.uw / 2, d.uh / 2, d.ud / 2)) return 'torso';
    if (inBox(p, r, R.lower, d.lw / 2, d.lh / 2, d.ld / 2)) return 'torso';
    if (inBox(p, r, R.head, d.hw / 2, d.hh / 2, d.hd / 2)) return 'head';
    for (const s of ['L', 'R']) {
      const sh = wp(R['arm' + s], 0, 0.3, 0), el = wp(R['elbow' + s]), ha = wp(R['hand' + s], 0, -d.hand * 0.5, 0), rad = (d.aw / 2) * u;
      if (segDist(p, sh, el) < rad + r || segDist(p, el, ha) < rad + r) return 'arm' + s;
      const hp = wp(R['leg' + s]), kn = wp(R['knee' + s]), ft = wp(R['foot' + s]), rl = (d.gw / 2) * u;
      if (segDist(p, hp, kn) < rl + r || segDist(p, kn, ft) < rl + r) return 'leg' + s;
    }
    return null;
  }
  // crowd member = one box (body + arms) and the head box, in their own frame
  const CD = { w: 2.0 / 2 + 0.74, d: 0.5, h: 4.0, hw: 1.25 / 2, hd: 1.16 / 2, h0: 4.0, h1: 5.13 };
  function hitsCrowd(p, r, people) {
    for (let i = 0; i < people.length; i++) {
      const q = people[i], dx = p.x - q.x, dz = p.z - q.z;
      if (dx * dx + dz * dz > 4) continue;
      const c = Math.cos(-q.yaw), s = Math.sin(-q.yaw), lx = (dx * c + dz * s) / q.s, lz = (-dx * s + dz * c) / q.s, ly = p.y / q.s, m = r / q.s;
      if (Math.abs(lx) < CD.w + m && Math.abs(lz) < CD.d + m && ly > -m && ly < CD.h + m) return i;
      if (Math.abs(lx) < CD.hw + m && Math.abs(lz) < CD.hd + m && ly > CD.h0 - m && ly < CD.h1 + m) return i;
    }
    return -1;
  }
  function hitsSolid(p, r, solids, part) {
    for (const s of solids) {
      if (s.allow && s.allow.includes(part)) continue;
      if (s.kind === 'box') { if (p.x > s.min[0] - r && p.x < s.max[0] + r && p.y > s.min[1] - r && p.y < s.max[1] + r && p.z > s.min[2] - r && p.z < s.max[2] + r) return s; }
      else if (Math.hypot(p.x - s.x, p.z - s.z) < s.r + r && p.y > s.y0 - r && p.y < s.y1 + r) return s;
    }
    return null;
  }

  RT.qa = { prepare, camera, blocked, bodyPoints, hitsChar, hitsCrowd, hitsSolid };
})();
