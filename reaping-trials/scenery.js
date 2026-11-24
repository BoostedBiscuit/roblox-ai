// =====================================================================================
// scenery.js: one function per location, built from Roblox-style "Parts" (blocks, wedges, cylinders, spheres).
// Every function returns a THREE.Group with .update(t) (wind, blades, glow …) and useful points in .spots.
//
//   RT.scenery.baseplate({ size })           studded floor (viewer)
//   RT.scenery.sector7Village()              wheat field, block houses, windmill, trees, mountains, Capital towers  (mood: sunrise)
//   RT.scenery.choosingSquare()              QUICK trailer version: stage, glass bowls, banners, rope lines, guards, crowd (mood: overcast)
//   RT.scenery.arena()                       QUICK trailer version: platforms, golden pile, forest, force-field dome (arenaDay / arenaNight)
// The square and the arena get their full versions in step 5 (one location at a time).
// Repeated things (wheat, trees, crates, paper slips, crowds) are InstancedMesh or merged geometry: few draw calls on phones.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, D = RT.draw, { clamp, smooth } = RT;

  // ---------- shared bits ----------
  RT.studTexture = function (color = '#5bb04a', o = {}) {
    const N = 64, tex = RT.canvasTexture(N, N, (g) => {
      g.fillStyle = color; g.fillRect(0, 0, N, N);
      g.fillStyle = 'rgba(0,0,0,0.10)'; g.beginPath(); g.arc(N / 2 + 2, N / 2 + 3, N * 0.27, 0, Math.PI * 2); g.fill();
      g.fillStyle = RT.shade(color, 0.08); g.beginPath(); g.arc(N / 2, N / 2, N * 0.27, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2; g.beginPath(); g.arc(N / 2, N / 2, N * 0.22, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, N - 1, N - 1);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (o.repeat) tex.repeat.set(o.repeat, o.repeat);
    return tex;
  };
  function baseplate(o = {}) {
    const size = o.size || 80, studs = size / RT.STUD;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: RT.studTexture(o.color || '#5bb04a', { repeat: studs }), roughness: 0.6 }));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.name = 'baseplate';
    return m;
  }
  const M = (x, y, z, rx, ry, rz, sx, sy, sz) => RT.mat4(x, y, z, rx, ry, rz, sx, sy, sz);
  const boxG = (w, h, d, r = 0) => (r ? RT.roundedBoxGeometry(w, h, d, r, 1) : new THREE.BoxGeometry(w, h, d));
  // a bucket of geometry pieces per material, merged into one mesh each at the end (= one draw call per material)
  function Batch() {
    const b = {};
    return {
      add(mat, geo, matrix) { (b[mat.uuid] = b[mat.uuid] || { mat, items: [] }).items.push({ geo, matrix }); },
      build(group, shadows = true) { for (const k in b) { const m = RT.mesh(RT.mergeGeometries(b[k].items), b[k].mat, shadows); group.add(m); } },
    };
  }

  // the hills (same function as the test scene, so the camera shots still line up)
  function hgt(x, z) {
    const d = Math.hypot(x, z), s = smooth(55, 260, d);
    let h = Math.sin(x * 0.011) * 9 + Math.cos(z * 0.013) * 11 + Math.sin((x + z) * 0.0045) * 22 + Math.sin(x * 0.031 + z * 0.02) * 4;
    h = (h + 14) * s; h += Math.sin(x * 0.15) * Math.cos(z * 0.13) * 0.25;
    return h;
  }

  // Block house: walls, wedge gable roof, door, windows, trims. Added into a Batch.
  function addHouse(B, mats, x, y, z, yaw, w, d, h, k) {
    const T = (lx, ly, lz, ry = 0) => new THREE.Matrix4().makeRotationY(yaw).multiply(M(lx, ly, lz, 0, ry, 0)).premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
    B.add(mats.wall[k % mats.wall.length], boxG(w, h, d, 0.08), T(0, h / 2, 0));
    B.add(mats.trim, boxG(w + 0.12, 0.18, d + 0.12), T(0, 0.09, 0));                                 // base trim
    B.add(mats.trim, boxG(w + 0.1, 0.14, d + 0.1), T(0, h - 0.05, 0));                                // top trim
    const rh = 1.5 + w * 0.12, roof = mats.roof[k % mats.roof.length];
    B.add(roof, RT.wedgeGeometry(w + 0.6, rh, d / 2 + 0.35), T(0, h + rh / 2, d / 4 + 0.17));                // front half of the gable
    B.add(roof, RT.wedgeGeometry(w + 0.6, rh, d / 2 + 0.35), T(0, h + rh / 2, -d / 4 - 0.17, Math.PI));     // back half
    B.add(mats.wall[(k + 1) % mats.wall.length], boxG(w - 0.05, rh * 0.98, 0.1), T(0, h + rh * 0.45, 0));     // gable infill
    B.add(mats.door, boxG(0.9, 1.7, 0.12, 0.04), T(0, 0.85, d / 2 + 0.03));
    for (const sx of [-1, 1]) {
      B.add(mats.window, boxG(0.75, 0.75, 0.1), T(sx * w * 0.3, h * 0.58, d / 2 + 0.02));
      B.add(mats.trim, boxG(0.95, 0.12, 0.16), T(sx * w * 0.3, h * 0.58 - 0.45, d / 2 + 0.05));
    }
    B.add(mats.window, boxG(0.1, 0.7, 0.7), T(w / 2 + 0.02, h * 0.58, 0));
    if (k % 3 === 0) B.add(mats.stone, boxG(0.6, 1.6, 0.6), T(w * 0.25, h + rh * 0.7, -d * 0.2));   // chimney
  }

  // Roblox classic trees (trunk + ball leaves) and pines (stacked cones), instanced.
  function forest(group, positions, o = {}) {
    const n = positions.length, half = Math.ceil(n * (o.pineRatio ?? 0.45));
    const trunkG = new THREE.CylinderGeometry(0.25, 0.32, 2.2, 6); trunkG.translate(0, 1.1, 0);
    const ballG = RT.mergeGeometries([{ geo: new THREE.SphereGeometry(1.5, 10, 8), matrix: M(0, 3.2, 0) }, { geo: new THREE.SphereGeometry(1.05, 9, 7), matrix: M(0.75, 2.6, 0.35) }, { geo: new THREE.SphereGeometry(1.0, 9, 7), matrix: M(-0.7, 2.7, -0.3) }]);
    const pineG = RT.mergeGeometries([0, 1, 2].map((k) => ({ geo: new THREE.ConeGeometry(1.9 - k * 0.5, 2.0, 8), matrix: M(0, 2.2 + k * 1.15, 0) })));
    const trunkM = new THREE.MeshLambertMaterial({ color: o.trunk || '#7a4f2c' });
    const leafM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trunks = new THREE.InstancedMesh(trunkG, trunkM, n), balls = new THREE.InstancedMesh(ballG, leafM, n - half), pines = new THREE.InstancedMesh(pineG, leafM, half);
    const dm = new THREE.Object3D(), c = new THREE.Color(), r = RT.rng(o.seed || 3);
    positions.forEach((p, i) => {
      const s = (o.scale || 1) * (0.8 + r() * 0.7);
      dm.position.set(p[0], p[1] - 0.15, p[2]); dm.rotation.set(0, r() * 6.28, 0); dm.scale.set(s, s * (0.9 + r() * 0.3), s); dm.updateMatrix();
      trunks.setMatrixAt(i, dm.matrix);
      if (i < half) { pines.setMatrixAt(i, dm.matrix); c.setHSL(0.32 + r() * 0.05, 0.55, 0.26 + r() * 0.08); pines.setColorAt(i, c); }
      else { balls.setMatrixAt(i - half, dm.matrix); c.setHSL(0.25 + r() * 0.07, 0.6, 0.36 + r() * 0.1); balls.setColorAt(i - half, c); }
    });
    for (const m of [trunks, balls, pines]) { m.castShadow = m.receiveShadow = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; group.add(m); }
  }

  // white-and-gold banner texture with the Crown Council emblem (original design: a crown over a watching eye)
  function councilBanner(w, h) {
    return RT.canvasTexture(128, 256, (g) => {
      g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#d8ab3a';
      g.fillRect(0, 0, 128, 14); g.fillRect(0, 242, 128, 14); g.fillRect(8, 14, 6, 228); g.fillRect(114, 14, 6, 228);
      g.beginPath(); g.moveTo(24, 120); g.lineTo(32, 76); g.lineTo(48, 100); g.lineTo(64, 64); g.lineTo(80, 100); g.lineTo(96, 76); g.lineTo(104, 120); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(64, 150, 36, 16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f7f4ec'; g.beginPath(); g.arc(64, 150, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d8ab3a'; g.beginPath(); g.moveTo(40, 200); g.lineTo(64, 232); g.lineTo(88, 200); g.closePath(); g.fill();
    });
  }

  // =================================================================================
  // 1. SECTOR 7 VILLAGE (mood: sunrise)
  // =================================================================================
  function sector7Village(o = {}) {
    const G = new THREE.Group(); G.name = 'sector7Village';
    const r = RT.rng(o.seed || 7), dm = new THREE.Object3D();
    // terrain: bright Roblox grass, a tilled field in the middle, sandy paths
    const tg = new THREE.PlaneGeometry(1800, 1800, 200, 200); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position, col = new Float32Array(tp.count * 3), c = new THREE.Color();
    const grass = new THREE.Color('#5fb23f'), dry = new THREE.Color('#9cc44c'), dark = new THREE.Color('#3f8f35'), soil = new THREE.Color('#b8874a'), sand = new THREE.Color('#e0c07a');
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), h = hgt(x, z); tp.setY(i, h);
      const n = 0.5 + 0.5 * Math.sin(x * 0.05 + Math.cos(z * 0.04) * 2);
      c.copy(grass).lerp(dry, n * 0.5).lerp(dark, clamp((h - 15) / 40, 0, 1));
      const fx = Math.max(Math.abs(x), Math.abs(z)); if (fx < 25) c.lerp(soil, smooth(25, 21, fx));
      const path = Math.min(Math.abs(x + z * 0.35 - 30), Math.abs(z - x * 0.2 - 34)); if (fx > 24 && path < 3.2 && Math.hypot(x, z) < 110) c.lerp(sand, smooth(3.2, 1.8, path));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; G.add(terrain);

    // the golden wheat (chunkier + brighter than the test scene), swaying
    const WN = o.wheat || 3200;
    const stalkG = new THREE.BoxGeometry(0.07, 1, 0.07); stalkG.translate(0, 0.5, 0);
    const headG = RT.roundedBoxGeometry(0.15, 0.32, 0.15, 0.05, 1);
    const wm = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const stalks = new THREE.InstancedMesh(stalkG, wm, WN), heads = new THREE.InstancedMesh(headG, wm, WN);
    const wd = [];
    for (let i = 0; i < WN; i++) {
      let x, z;
      if (i < WN * 0.5) { x = (r() * 2 - 1) * 21; z = (r() * 2 - 1) * 21; } else { const a = r() * Math.PI * 2, rr = 0.6 + Math.pow(r(), 0.8) * 11; x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
      const cr = o.clearRadius ?? 0.7; if (Math.hypot(x, z) < cr) { const a2 = Math.atan2(z, x) || 1; x = Math.cos(a2) * (cr + 0.2 + r() * 0.5); z = Math.sin(a2) * (cr + 0.2 + r() * 0.5); }   // a trampled spot where Rhea stands
      wd.push({ x, z, y: hgt(x, z), h: 0.85 + r() * 0.35, ph: r() * 6.28 });
      c.setHSL(0.115 + r() * 0.02, 0.72 + r() * 0.15, 0.5 + r() * 0.1); stalks.setColorAt(i, c); c.offsetHSL(0.005, 0.05, 0.08); heads.setColorAt(i, c);
    }
    stalks.instanceColor.needsUpdate = heads.instanceColor.needsUpdate = true; stalks.receiveShadow = heads.receiveShadow = true; heads.castShadow = true;
    G.add(stalks, heads);
    function updateWheat(t) {
      for (let i = 0; i < WN; i++) {
        const w = wd[i], gust = Math.sin(t * 0.9 + w.x * 0.12 + w.z * 0.05), rz = Math.sin(t * 1.6 + w.ph + w.x * 0.25) * 0.06 + gust * 0.09, rx = Math.cos(t * 1.3 + w.ph + w.z * 0.2) * 0.05;
        dm.position.set(w.x, w.y, w.z); dm.rotation.set(rx, 0, rz); dm.scale.set(1, w.h, 1); dm.updateMatrix(); stalks.setMatrixAt(i, dm.matrix);
        dm.position.set(w.x - Math.sin(rz) * w.h, w.y + Math.cos(rz) * Math.cos(rx) * w.h, w.z + Math.cos(rz) * Math.sin(rx) * w.h); dm.scale.set(1, 1, 1); dm.updateMatrix(); heads.setMatrixAt(i, dm.matrix);
      }
      stalks.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    }

    // ~15 block houses around the field (merged by material)
    const mats = { wall: ['#c8874e', '#b5713f', '#d89a5c', '#a8643a'].map((x) => RT.plastic(x, { roughness: 0.6 })), roof: ['#b23b2b', '#8c4a2f', '#c4562f'].map((x) => RT.plastic(x, { roughness: 0.55 })),
      door: RT.plastic('#5a3820'), window: RT.plastic('#26303c', { roughness: 0.2, metalness: 0.3 }), trim: RT.plastic('#f1e3c6', { roughness: 0.5 }), stone: RT.plastic('#8a8f96') };
    const B = new Batch(), shotA = Math.atan2(21, 13);
    let placed = 0, tries = 0;
    const houses = [];
    while (placed < 15 && tries < 300) {
      tries++; const a = r() * Math.PI * 2, rr = 40 + r() * 32;
      if (Math.abs(((a - shotA) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.55) continue;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (houses.some((h) => Math.hypot(h[0] - x, h[1] - z) < 10)) continue;
      houses.push([x, z]);
      addHouse(B, mats, x, hgt(x, z) - 0.15, z, Math.atan2(-x, -z), 4.2 + r() * 2, 4 + r() * 2, 2.8 + r() * 0.8, placed);
      placed++;
    }
    // fences around the field
    const fenceM = RT.plastic('#9a6a3c', { roughness: 0.6 });
    for (const [x0, z0, x1, z1] of [[-24, -24, 24, -24], [24, -24, 24, 24], [24, 24, -24, 24]]) {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4);
      for (let k = 0; k <= n; k++) { const x = RT.lerp(x0, x1, k / n), z = RT.lerp(z0, z1, k / n); B.add(fenceM, boxG(0.22, 1.2, 0.22), M(x, hgt(x, z) + 0.5, z)); }
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
      for (const y of [0.55, 0.95]) for (let k = 0; k < n; k++) { const x = RT.lerp(x0, x1, (k + 0.5) / n), z = RT.lerp(z0, z1, (k + 0.5) / n); B.add(fenceM, boxG(0.1, 0.14, len / n + 0.1), M(x, hgt(x, z) + y, z, 0, ang, 0)); }
    }
    // the well
    const wx = -32, wz = 30, wy = hgt(wx, wz);
    B.add(mats.stone, new THREE.CylinderGeometry(1.2, 1.3, 1.1, 14), M(wx, wy + 0.55, wz));
    B.add(mats.roof[0], RT.wedgeGeometry(3, 0.9, 1.3), M(wx, wy + 3.1, wz + 0.6)); B.add(mats.roof[0], RT.wedgeGeometry(3, 0.9, 1.3), M(wx, wy + 3.1, wz - 0.6, 0, Math.PI, 0));
    for (const s of [-1, 1]) B.add(fenceM, boxG(0.2, 2.4, 0.2), M(wx + s * 1.2, wy + 1.6, wz));
    B.build(G);
    // windmill (blades turn)
    const mx = 58, mz = 46, my = hgt(mx, mz), mill = new THREE.Group(); mill.position.set(mx, my, mz); mill.rotation.y = Math.atan2(-mx, -mz); G.add(mill);
    mill.add(RT.mesh(new THREE.CylinderGeometry(1.8, 2.8, 9, 8), RT.plastic('#e8dcc4', { roughness: 0.6 })).translateY(4.5));
    mill.add(RT.mesh(new THREE.ConeGeometry(2.5, 2.4, 8), mats.roof[1]).translateY(10.2));
    const blades = new THREE.Group(); blades.position.set(0, 8.4, 2.2); mill.add(blades);
    for (let k = 0; k < 4; k++) { const b = RT.mesh(boxG(1.1, 5.2, 0.12), RT.plastic('#f4ede0')); b.position.y = 2.8; const arm = new THREE.Group(); arm.rotation.z = (k * Math.PI) / 2; arm.add(b); blades.add(arm); }
    blades.add(RT.mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 10), mats.door).rotateX(Math.PI / 2));

    // trees (instanced): outside the village ring
    const tp2 = [];
    for (let i = 0; i < (o.trees || 1000); i++) { const a = r() * Math.PI * 2, d = 82 + Math.pow(r(), 0.7) * 560, x = Math.cos(a) * d, z = Math.sin(a) * d; tp2.push([x, hgt(x, z), z]); }
    forest(G, tp2, { seed: 11, pineRatio: 0.4 });

    // distant block mountains + the Capital on the horizon
    const capPos = new THREE.Vector3(60, 0, -650), capAng = Math.atan2(capPos.z, capPos.x);
    const mMat = new THREE.MeshStandardMaterial({ color: '#7a8db0', flatShading: true, roughness: 1 }), snow = new THREE.MeshStandardMaterial({ color: '#f2f4f8', flatShading: true, roughness: 1 });
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + r() * 0.15;
      if (Math.abs(((a - capAng) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.22) continue;
      const d = 720 + r() * 260, rad = 170 + r() * 120, h = 110 + r() * 130;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), mMat); m.position.set(Math.cos(a) * d, h / 2 - 25, Math.sin(a) * d); m.rotation.y = r() * 3; G.add(m);
      const cp = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.28, h * 0.28, 6), snow); cp.position.set(m.position.x, h - 25 - h * 0.14 + 1, m.position.z); cp.rotation.y = m.rotation.y; G.add(cp);
    }
    const capital = capitalSkyline(); capital.position.copy(capPos); G.add(capital);

    G.update = (t) => { updateWheat(t); blades.rotation.z = t * 0.6; };
    G.spots = { capPos, hgt };
    return G;
  }

  // white-and-glass towers with gold spires (seen on the horizon)
  function capitalSkyline() {
    const g = new THREE.Group(), B = new Batch();
    const glass = RT.plastic('#d8e4f2', { emissive: '#9fc2ff', emissiveIntensity: 0.2, metalness: 0.55, roughness: 0.25 }), white = RT.plastic('#f4f4f2', { roughness: 0.4 }), gold = RT.metal('#e5b84a');
    const towers = [[0, 0, 16, 230], [-28, 10, 12, 160], [26, -8, 14, 190], [-50, -14, 10, 120], [48, 12, 11, 140], [-12, -30, 9, 105], [14, 28, 9, 115], [70, -20, 8, 90], [-74, 4, 8, 85]];
    towers.forEach((tw, i) => {
      B.add(glass, boxG(tw[2], tw[3], tw[2]), M(tw[0], tw[3] / 2 - 5, tw[1]));
      for (let k = 1; k < 5; k++) B.add(white, boxG(tw[2] + 1.2, 2.2, tw[2] + 1.2), M(tw[0], (tw[3] * k) / 5 - 5, tw[1]));
      B.add(white, boxG(tw[2] * 0.7, tw[3] * 0.08, tw[2] * 0.7), M(tw[0], tw[3] - 5 + tw[3] * 0.04, tw[1]));
      if (i < 5) B.add(gold, new THREE.ConeGeometry(tw[2] * 0.3, tw[3] * 0.32, 4), M(tw[0], tw[3] - 5 + tw[3] * 0.24, tw[1]));
    });
    B.build(g, false);
    return g;
  }

  // =================================================================================
  // 2. SECTOR 7 SQUARE: the Choosing (QUICK trailer version; full version in step 5)
  // =================================================================================
  function choosingSquare(o = {}) {
    const G = new THREE.Group(); G.name = 'choosingSquare';
    const r = RT.rng(o.seed || 21);
    // dusty ground with a subtle stone-slab texture
    const groundTex = RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = '#c9a76f'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,60,30' : '255,240,210'},${0.05 + r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 2 + r() * 4, 2 + r() * 4); }
      g.strokeStyle = 'rgba(80,55,30,0.12)'; g.lineWidth = 2; for (let k = 0; k <= 256; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); }
    });
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(40, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: groundTex })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
    // houses around the square (backdrop)
    const mats = { wall: ['#b5713f', '#c8874e', '#9c6a48', '#d89a5c'].map((x) => RT.plastic(x, { roughness: 0.6 })), roof: ['#7d4430', '#8c4a2f', '#6e3a2a'].map((x) => RT.plastic(x, { roughness: 0.6 })),
      door: RT.plastic('#4a2f1c'), window: RT.plastic('#26303c', { roughness: 0.2, metalness: 0.3 }), trim: RT.plastic('#e8dcc4'), stone: RT.plastic('#8a8f96') };
    const B = new Batch();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.1, rr = 34 + (i % 3) * 3; addHouse(B, mats, Math.sin(a) * rr, 0, Math.cos(a) * rr, a + Math.PI, 5 + (i % 3), 5, 3.4 + (i % 2) * 0.8, i); }
    // stage at the north side (z < 0): platform, steps, back wall with banners
    const white = RT.plastic('#f2efe8', { roughness: 0.45 }), gold = RT.metal('#d8ab3a'), wood = RT.plastic('#8a5a34', { roughness: 0.6 }), rope = RT.plastic('#b13a2e');
    B.add(white, boxG(16, 1.4, 7, 0.1), M(0, 0.7, -12));
    B.add(gold, boxG(16.2, 0.16, 7.2), M(0, 1.42, -12));
    for (let k = 0; k < 3; k++) { const h = (1.4 * (3 - k)) / 3; B.add(white, boxG(4, h, 0.8), M(0, h / 2, -8.1 + k * 0.8)); }   // steps down to the square
    B.add(white, boxG(16, 8, 0.6), M(0, 4.2, -15.4));
    B.add(gold, boxG(16.4, 0.4, 0.8), M(0, 8.3, -15.4));
    // rope lines (posts + red rope) between the crowd sections
    for (const x of [-3.2, 3.2]) for (let k = 0; k < 7; k++) { const z = -5 + k * 2.4; B.add(wood, new THREE.CylinderGeometry(0.1, 0.12, 1.1, 8), M(x, 0.55, z)); if (k < 6) B.add(rope, new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), M(x, 0.95, z + 1.2, Math.PI / 2, 0, 0)); }
    B.build(G);
    // banners (white and gold, Crown Council emblem)
    const banTex = councilBanner();
    for (const x of [-6.5, -2.2, 2.2, 6.5]) { const bnr = RT.mesh(new THREE.BoxGeometry(2.2, 5.2, 0.12), [white, white, white, white, new THREE.MeshStandardMaterial({ map: banTex, roughness: 0.6 }), white]); bnr.position.set(x, 4.6, -15.0); G.add(bnr); }
    for (const x of [-14, 14]) { const pole = RT.mesh(new THREE.CylinderGeometry(0.14, 0.14, 10, 8), gold); pole.position.set(x * 0.65, 5, -11); G.add(pole); const fl = RT.mesh(new THREE.BoxGeometry(1.8, 4, 0.08), [white, white, white, white, new THREE.MeshStandardMaterial({ map: banTex }), new THREE.MeshStandardMaterial({ map: banTex })]); fl.position.set(x * 0.65 + 1, 7.6, -11); G.add(fl); }
    // the two glass bowls with paper slips, on gold pedestals at the front of the stage
    const bowls = [];
    for (const x of [-3.6, 3.6]) {
      const b = new THREE.Group(); b.position.set(x, 1.5, -10.4); G.add(b);
      const ph = o.bowlPedestal ?? 1.2;      // pedestal height (lower it so a character can reach into the bowl)
      b.add(RT.mesh(new THREE.CylinderGeometry(0.35, 0.5, ph, 12), gold).translateY(ph / 2));
      const glassM = new THREE.MeshStandardMaterial({ color: '#dff3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 1.5, 28, 1, true), glassM); glass.position.y = ph + 0.75; glass.renderOrder = 2; b.add(glass);
      b.add(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 28), glassM).translateY(ph + 0.02));
      const rim = RT.mesh(new THREE.TorusGeometry(1.15, 0.05, 6, 32), gold); rim.rotation.x = Math.PI / 2; rim.position.y = ph + 1.5; b.add(rim);
      const slips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.02, 0.14), RT.plastic('#fbf8f0'), 160), dm = new THREE.Object3D();
      for (let i = 0; i < 160; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.85; dm.position.set(Math.cos(a) * rr, ph + 0.1 + r() * 0.6, Math.sin(a) * rr); dm.rotation.set(r() * 3, r() * 3, r() * 3); dm.updateMatrix(); slips.setMatrixAt(i, dm.matrix); }
      b.add(slips); bowls.push(b);
    }
    // mic stand
    const mic = new THREE.Group(); mic.position.set(0, 1.5, -10.6); G.add(mic);
    mic.add(RT.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8), RT.metal('#2b2b2b')).translateY(1.15));
    mic.add(RT.mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.06, 12), RT.metal('#2b2b2b')));
    mic.add(RT.mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.3, 10), RT.metal('#555')).translateY(2.4));
    // crowd (instanced) facing the stage, in three sections between the ropes
    const spots = [];
    for (let row = 0; row < 9; row++) for (let k = 0; k < 18; k++) {
      const x = -13.5 + k * 1.6 + (row % 2) * 0.6 + (r() - 0.5) * 0.3, z = -4.5 + row * 1.7 + (r() - 0.5) * 0.3;
      if (Math.abs(Math.abs(x) - 3.2) < 0.8) continue;                          // keep the rope lines clear
      if (o.keepClear && o.keepClear.some(([cx, cz, rr]) => Math.hypot(x - cx, z - cz) < rr)) continue;
      spots.push([x, z, Math.atan2(-x, -12 - z)]);                                  // everyone faces the stage
    }
    const crowd = RT.characters.crowd({ spots, seed: 7, faces: ['worried', 'worried', 'neutral', 'scared'] });
    G.add(crowd);
    const stageLook = new THREE.Vector3(0, 3, -11);
    G.update = (t, u = {}) => { if (crowd.visible) crowd.update(t, { lookAt: u.lookAt || stageLook }); };   // u.lookAt: what the crowd turns to watch
    G.spots = { bowls, mic, stage: new THREE.Vector3(0, 1.5, -12), crowd };
    return G;
  }

  // =================================================================================
  // 3. THE ARENA (QUICK trailer version; the full 1500 × 1500 map comes in step 5)
  // =================================================================================
  function arena(o = {}) {
    const G = new THREE.Group(); G.name = 'arena';
    const r = RT.rng(o.seed || 31), dm = new THREE.Object3D();
    const ah = (x, z) => { const d = Math.hypot(x, z); return smooth(30, 120, d) * (Math.sin(x * 0.02) * 3 + Math.cos(z * 0.025) * 3 + 3); };
    const tg = new THREE.PlaneGeometry(1500, 1500, 150, 150); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position, col = new Float32Array(tp.count * 3), c = new THREE.Color(), g1 = new THREE.Color('#58b23c'), g2 = new THREE.Color('#3f9433'), dirt = new THREE.Color('#a3804e');
    for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, ah(x, z)); c.copy(g1).lerp(g2, 0.5 + 0.5 * Math.sin(x * 0.07 + Math.cos(z * 0.05) * 2)); if (Math.hypot(x, z) < 22) c.lerp(dirt, smooth(22, 18, Math.hypot(x, z))); col.set([c.r, c.g, c.b], i * 3); }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
    const ground = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); ground.receiveShadow = true; G.add(ground);
    // the golden supply pile: crates, barrels and packs
    const B = new Batch(), goldM = RT.metal('#e8b83e', { roughness: 0.35 }), goldD = RT.metal('#b98a22'), packM = RT.plastic('#c0392b'), packB = RT.plastic('#2f6fe0');
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 3.2, s = 0.9 + r() * 0.7, lvl = rr < 1.4 ? Math.floor(r() * 3) : 0; B.add(i % 3 ? goldM : goldD, boxG(s, s * 0.8, s, 0.06), M(Math.cos(a) * rr, s * 0.4 + lvl * 0.75, Math.sin(a) * rr, 0, r() * 3, 0)); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + 0.3; B.add(goldD, new THREE.CylinderGeometry(0.45, 0.45, 1.1, 12), M(Math.cos(a) * 3.8, 0.55, Math.sin(a) * 3.8)); B.add(i % 2 ? packM : packB, boxG(0.8, 0.9, 0.5, 0.12), M(Math.cos(a + 0.5) * 4.4, 0.45, Math.sin(a + 0.5) * 4.4, 0, a, 0)); }
    for (let lvl = 0; lvl < 3; lvl++) for (let k = 0; k < 4 - lvl; k++) { const a = k * 1.57 + lvl * 0.6; B.add(lvl % 2 ? goldD : goldM, boxG(1.3, 1.0, 1.3, 0.07), M(Math.cos(a) * (0.7 - lvl * 0.25), 0.5 + lvl * 1.0, Math.sin(a) * (0.7 - lvl * 0.25), 0, a, 0)); }
    // 8 metal starting platforms in a ring (they rise out of the ground)
    const platM = RT.metal('#b9c0c8', { roughness: 0.3 }), platD = RT.metal('#5e666f');
    const platforms = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, p = new THREE.Group(); p.position.set(Math.sin(a) * 14, 0, Math.cos(a) * 14); p.rotation.y = a + Math.PI; G.add(p);
      p.add(RT.mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 24), platM).translateY(-0.17));
      p.add(RT.mesh(new THREE.CylinderGeometry(0.6, 0.6, 4, 12), platD).translateY(-2.35));
      const ring = RT.mesh(new THREE.TorusGeometry(1.25, 0.06, 6, 28), RT.plastic('#7de0ff', { emissive: '#3fd0ff', emissiveIntensity: 1.2 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; p.add(ring);
      platforms.push(p);
      // the launch hole the platform rises out of (dark disc + metal rim, flush with the ground)
      B.add(RT.plastic('#121418', { roughness: 0.9 }), new THREE.CylinderGeometry(1.42, 1.42, 0.02, 28), M(p.position.x, 0.01, p.position.z));
      B.add(platD, new THREE.TorusGeometry(1.42, 0.07, 6, 28), M(p.position.x, 0.03, p.position.z, Math.PI / 2, 0, 0));
    }
    B.build(G);
    // the forest (instanced): clearing in the middle, a running path to the north
    const pos = [];
    for (let i = 0; i < (o.trees || 1100); i++) {
      const a = r() * Math.PI * 2, d = 26 + Math.pow(r(), 0.65) * 520, x = Math.sin(a) * d, z = Math.cos(a) * d;
      if (Math.abs(x - 0) < 2.2 && z < -30 && z > -90) continue;               // the night-run path
      pos.push([x, ah(x, z), z]);
    }
    for (let k = 0; k < 40; k++) { const z = -32 - k * 1.5, s = k % 2 ? 1 : -1; const x = s * (3 + (k % 3) * 1.2); pos.push([x, ah(x, z), z]); }   // trees lining the path (on the ground)
    forest(G, pos, { seed: 5, pineRatio: 0.55 });
    // the force-field dome: hexagon lines that glow and pulse
    const domeM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { time: { value: 0 }, strength: { value: 1 }, color: { value: new THREE.Color('#5fe3ff') } },
      vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform float time;uniform float strength;uniform vec3 color;varying vec2 vUv;varying vec3 vN;' +
        'float hex(vec2 p){p.x*=1.1547;p.y+=mod(floor(p.x),2.0)*0.5;p=abs(fract(p)-0.5);return abs(max(p.x*1.5+p.y,p.y*2.0)-1.0);}' +
        'void main(){vec2 p=vec2(vUv.x*90.0,vUv.y*40.0);float h=hex(p);float line=1.0-smoothstep(0.0,0.08,h);' +
        'float pulse=0.55+0.45*sin(time*2.0-vUv.y*12.0);float edge=pow(1.0-abs(vN.z),2.0);' +
        'float a=(line*0.85*pulse+0.06+edge*0.25)*strength*smoothstep(1.0,0.75,vUv.y);gl_FragColor=vec4(color*a,a);}',
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(o.domeRadius || 420, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.renderOrder = 5; dome.frustumCulled = false; G.add(dome);
    G.update = (t) => { domeM.uniforms.time.value = t; };
    G.spots = { platforms, dome, domeM, ah };
    return G;
  }

  RT.scenery = { baseplate, sector7Village, choosingSquare, arena, capitalSkyline, forest, hgt, locations: ['studio', 'sector7Village', 'choosingSquare (quick)', 'arena (quick)'] };
})();
