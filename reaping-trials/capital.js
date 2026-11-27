// =====================================================================================
// capital.js: THE CAPITAL (Episode 2). One city, four places, all in the same style:
//   white stone + gold trim + blue / champagne glass, tall stepped towers with gold crowns,
//   sky gardens, flowering trees, clipped hedges, flower beds, fountains, green hills and
//   snowy mountains on the horizon.
//
//   const city = RT.capital.skyline();          the shared city: ground, ~200 towers, street trees, hills, mountains
//   city.setNight(0..1)                         0 = day (glass reflects the sky), 1 = night (lit windows, glowing lamps)
//   RT.capital.station()                        the arrival: train station + Garden Plaza (fountain, flower beds, trees)
//   RT.capital.trainingCourt()                  open-air training court: dummies, climbing wall, ropes, archery range,
//                                               Juno's workbench + net trap, the Council balcony
//   RT.capital.showStage()                      the night interview: stage, two chairs, giant screen, spotlights, audience tiers
//   RT.capital.rooftop()                        the night terrace on top of the tributes' tower
// Every place is centered on the same spot (x 0, z 0) of the city, so the towers always stand around it.
// Each returns a THREE.Group with .update(t, opts) and useful points in .spots. Moods for them: RT.capital.MOODS.
// Repeated things (towers, windows, trees, flowers, lamps) are merged or InstancedMesh: few draw calls.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, { clamp, smooth, lerp } = RT;
  const M = (x, y, z, rx, ry, rz, sx, sy, sz) => RT.mat4(x, y, z, rx, ry, rz, sx, sy, sz);
  const boxG = (w, h, d, r = 0) => (r ? RT.roundedBoxGeometry(w, h, d, r, 1) : new THREE.BoxGeometry(w, h, d));
  function Batch() {
    const b = {};
    return {
      add(mat, geo, matrix) { (b[mat.uuid] = b[mat.uuid] || { mat, items: [] }).items.push({ geo, matrix }); },
      build(group, shadows = true) { for (const k in b) { const m = RT.mesh(RT.mergeGeometries(b[k].items), b[k].mat, shadows); group.add(m); } },
    };
  }
  // a box whose texture repeats every cw × ch world units on its four sides (windows keep their size on any tower)
  function wallBox(w, h, d, cw, ch) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / cw, uv.getY(i) * dims[f][1] / ch); }
    return g;
  }
  function wallCyl(r, h, cw, ch, seg = 28) {
    const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * 2 * r) / cw, uv.getY(i) * h / ch);
    return g;
  }

  // =================================================================================
  // MOODS (lighting presets for env.set): bright morning, golden training day, the night show, the night roof
  // =================================================================================
  const MOODS = {
    capitalMorning: { top: '#2a6fe0', horizon: '#cfe6ff', sunCol: '#fff0cf', sunDir: [0.5, 0.42, 0.55], sunDisc: 1,
      fog: '#d6e8fb', fogNear: 260, fogFar: 1600, hemiSky: '#cfe2ff', hemiGround: '#8f8470', hemi: 0.72,
      sun: '#fff4e0', sunI: 1.7, fill: '#dcecff', fillI: 0.42, exposure: 0.98 },
    capitalCourt: { top: '#2f78e6', horizon: '#d6ebff', sunCol: '#fff3d6', sunDir: [-0.45, 0.62, 0.55], sunDisc: 1,
      fog: '#d8e9fb', fogNear: 260, fogFar: 1600, hemiSky: '#d6e6ff', hemiGround: '#968a74', hemi: 0.75,
      sun: '#fff6e8', sunI: 1.7, fill: '#e2efff', fillI: 0.42, exposure: 0.98 },
    capitalShow: { top: '#060818', horizon: '#241a4a', sunCol: '#9fb0ff', sunDir: [0.3, 0.5, 0.75], sunDisc: 0, moon: 1,
      fog: '#120f2a', fogNear: 160, fogFar: 900, hemiSky: '#5a52a8', hemiGround: '#1a1426', hemi: 0.7,
      sun: '#ffe2b8', sunI: 1.25, fill: '#b48cff', fillI: 0.55, exposure: 1.3 },
    capitalNight: { top: '#050b22', horizon: '#1e2f5c', sunCol: '#a9c0ff', sunDir: [-0.55, 0.32, -0.6], sunDisc: 0.6, moon: 1,
      fog: '#0d1834', fogNear: 200, fogFar: 1100, hemiSky: '#6078c0', hemiGround: '#1a2030', hemi: 0.85,
      sun: '#b6c8ff', sunI: 0.85, fill: '#8aa0e0', fillI: 0.45, exposure: 1.35 },
  };

  // =================================================================================
  // MATERIALS (shared by every place so the city looks like one city)
  // =================================================================================
  const TRACK_Z = -9.5, RAIL_N = TRACK_Z - 2.25, RAIL_S = TRACK_Z + 2.25;   // the railway cutting (z RAIL_N … RAIL_S)
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const r = RT.rng(77);
    // 4 × 4 window bays per texture tile (12 × 13.6 world units): mullions, glass with a sky reflection, a few blinds
    const BAY_W = 3, BAY_H = 3.4, TW = BAY_W * 4, TH = BAY_H * 4;
    const glassTex = (base, sky, frame) => {
      const t = RT.canvasTexture(256, 256, (g) => {
        g.fillStyle = frame; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const x = i * 64 + 3, y = j * 64 + 3, w = 58, h = 58, gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
          gr.addColorStop(0, sky); gr.addColorStop(0.55, base); gr.addColorStop(1, RT.shade(base, -0.18)); g.fillStyle = gr; g.fillRect(x, y, w, h);
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x + 6, y + h); g.lineTo(x + 22, y + h); g.lineTo(x + 44, y); g.lineTo(x + 28, y); g.fill();   // sheen
          if (r() < 0.18) { g.fillStyle = 'rgba(240,236,226,0.55)'; g.fillRect(x, y, w, h * (0.25 + r() * 0.5)); }   // a blind half down
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y + h - 3, w, 3);
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
    };
    const litTex = RT.canvasTexture(256, 256, (g) => {           // night: lit windows (warm and cool), the rest dark
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if (r() < 0.55) continue;
        const warm = r() < 0.72, a = 0.5 + r() * 0.4;
        g.fillStyle = warm ? `rgba(255,${200 + (r() * 30) | 0},${120 + (r() * 50) | 0},${a})` : `rgba(170,215,255,${a})`;
        g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
        if (r() < 0.3) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * 64 + 5 + r() * 30, j * 64 + 20, 12, 39); }   // someone at the window
      }
    });
    litTex.wrapS = litTex.wrapT = THREE.RepeatWrapping;
    const glass = (base, sky, frame) => new THREE.MeshStandardMaterial({ map: glassTex(base, sky, frame), roughness: 0.22, metalness: 0.35, emissive: '#ffffff', emissiveMap: litTex, emissiveIntensity: 0 });
    // marble paving: large cream slabs, thin gold joints every 4th slab
    const paveTex = RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = '#e2d9c6'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e9e1d0' : '#dcd2bd'; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62);
        g.strokeStyle = 'rgba(150,140,120,0.10)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * 64 + r() * 60, j * 64); g.bezierCurveTo(i * 64 + r() * 64, j * 64 + 20, i * 64 + r() * 64, j * 64 + 40, i * 64 + r() * 64, j * 64 + 64); g.stroke(); }
      g.fillStyle = '#d6b25a'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
    });
    paveTex.wrapS = paveTex.wrapT = THREE.RepeatWrapping;
    const lawnTex = RT.canvasTexture(64, 64, (g) => { g.fillStyle = '#5cb544'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#54a93e'; g.fillRect(0, 0, 32, 64);
      for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,200' : '20,60,10'},0.06)`; g.fillRect(r() * 64, r() * 64, 2, 3); } });
    lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping;
    MATS = {
      BAY_W, BAY_H, TW, TH, litTex,
      glassBlue: glass('#3f7fcf', '#a8d0f5', '#dde3ea'), glassChamp: glass('#b0915c', '#efdfb8', '#ece4d2'), glassAqua: glass('#2f9db2', '#bdeef2', '#dbe9ea'),
      stone: RT.plastic('#ece4d3', { roughness: 0.5 }), cream: RT.plastic('#dfcfae', { roughness: 0.55 }), stoneDark: RT.plastic('#cfc6b4', { roughness: 0.6 }),
      gold: RT.metal('#e2b54a', { roughness: 0.3 }), goldDark: RT.metal('#b88a2a', { roughness: 0.35 }),
      darkGlass: RT.plastic('#22344a', { roughness: 0.15, metalness: 0.4 }),
      hedge: RT.plastic('#3b8a37', { roughness: 0.8 }), hedgeDark: RT.plastic('#2f7430', { roughness: 0.8 }), soil: RT.plastic('#5a3d26', { roughness: 0.95 }),
      roofGreen: RT.plastic('#58ad44', { roughness: 0.85 }), lawnFlat: RT.plastic('#5db548', { roughness: 0.9 }),
      pave: new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.42, metalness: 0.05 }),
      lawn: new THREE.MeshLambertMaterial({ map: lawnTex }),
      water: new THREE.MeshStandardMaterial({ color: '#58b8e8', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.82 }),
      lampGlow: new THREE.MeshStandardMaterial({ color: '#fff7e0', emissive: '#ffe6b0', emissiveIntensity: 0.25, roughness: 0.3 }),
      paveTex, lawnTex,
    };
    MATS.glasses = [MATS.glassBlue, MATS.glassBlue, MATS.glassChamp, MATS.glassAqua];
    return MATS;
  }

  // =================================================================================
  // TREES, TOPIARIES AND FLOWERS (instanced): G = Garden(); G.tree('blossom', x, y, z, s); … G.build(group)
  //   ball = lush round tree · blossom = pink flowering tree · cone = clipped cone topiary · topiary = ball on a stem
  //   cypress = tall narrow tree · flowers: G.flowers(x, z, w, d, y) fills a bed with blooms
  // =================================================================================
  function Garden(seed = 5) {
    const r = RT.rng(seed), list = { ball: [], blossom: [], cone: [], topiary: [], cypress: [] }, blooms = [];
    const canopy = () => RT.mergeGeometries([
      { geo: new THREE.SphereGeometry(1.5, 12, 9), matrix: M(0, 3.3, 0) }, { geo: new THREE.SphereGeometry(1.15, 11, 8), matrix: M(0.85, 2.9, 0.35) },
      { geo: new THREE.SphereGeometry(1.05, 11, 8), matrix: M(-0.8, 3.0, -0.35) }, { geo: new THREE.SphereGeometry(1.0, 11, 8), matrix: M(0.15, 4.15, 0.2) },
      { geo: new THREE.SphereGeometry(0.9, 10, 7), matrix: M(-0.3, 2.75, 0.9) }]);
    const GEO = {
      trunk: (() => { const g = new THREE.CylinderGeometry(0.2, 0.3, 2.6, 7); g.translate(0, 1.3, 0); return g; })(),
      stem: (() => { const g = new THREE.CylinderGeometry(0.09, 0.11, 1.7, 6); g.translate(0, 0.85, 0); return g; })(),
      ball: canopy(), blossom: canopy(),
      cone: (() => { const g = new THREE.ConeGeometry(0.85, 2.6, 10); g.translate(0, 1.55, 0); return g; })(),
      topiary: (() => { const g = new THREE.SphereGeometry(0.85, 12, 9); g.translate(0, 2.2, 0); return g; })(),
      cypress: (() => { const g = new THREE.SphereGeometry(0.75, 10, 10); g.scale(1, 3.2, 1); g.translate(0, 3.0, 0); return g; })(),
    };
    const LEAF = { ball: () => [0.27 + r() * 0.06, 0.55 + r() * 0.12, 0.36 + r() * 0.08], blossom: () => (r() < 0.8 ? [0.92 + r() * 0.04, 0.7 + r() * 0.15, 0.8 + r() * 0.07] : [0.0, 0.0, 0.96]),
      cone: () => [0.33, 0.5, 0.27 + r() * 0.05], topiary: () => [0.3, 0.55, 0.32 + r() * 0.05], cypress: () => [0.36, 0.45, 0.22 + r() * 0.05] };
    return {
      tree(type, x, y, z, s = 1) { list[type].push([x, y, z, s * (0.85 + r() * 0.3), r() * 6.28]); },
      flowers(x0, z0, w, d, y = 0.35, dens = 2.2) {
        const cols = ['#ff6fae', '#ffffff', '#ffd84a', '#b57bff', '#ff4d5e', '#ff9ad2'], n = Math.round(w * d * dens);
        const band = Math.floor(r() * cols.length);
        for (let i = 0; i < n; i++) { const fx = x0 + (r() - 0.5) * w, fz = z0 + (r() - 0.5) * d, k = (band + Math.floor(((fx - x0) / w + 0.5) * 3)) % cols.length; blooms.push([fx, y + r() * 0.12, fz, r() < 0.82 ? cols[k] : cols[(k + 2) % cols.length]]); }
      },
      build(group) {
        const dm = new THREE.Object3D(), c = new THREE.Color();
        const trunkM = new THREE.MeshLambertMaterial({ color: '#7a5233' }), leafM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
        const all = [...list.ball, ...list.blossom, ...list.cypress], stems = [...list.topiary];
        const mk = (geo, mat, items, colorFn, extra) => {
          if (!items.length) return null;
          const m = new THREE.InstancedMesh(geo, mat, items.length);
          items.forEach((p, i) => { dm.position.set(p[0], p[1], p[2]); dm.rotation.set(0, p[4], 0); dm.scale.setScalar(p[3]); if (extra) extra(dm, p); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); if (colorFn) { const h = colorFn(); c.setHSL(h[0], h[1], h[2]); m.setColorAt(i, c); } });
          m.castShadow = true; m.receiveShadow = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; group.add(m); return m;
        };
        mk(GEO.trunk, trunkM, all, null, (o, p) => { if (list.cypress.includes(p)) o.scale.set(p[3], p[3] * 0.5, p[3]); });
        mk(GEO.stem, trunkM, stems);
        for (const k of ['ball', 'blossom', 'cone', 'topiary', 'cypress']) mk(GEO[k], leafM, list[k], LEAF[k]);
        if (blooms.length) {
          const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), blooms.length);
          blooms.forEach((b, i) => { dm.position.set(b[0], b[1], b[2]); dm.rotation.set(r() * 3, r() * 3, 0); dm.scale.setScalar(0.8 + r() * 0.5); dm.updateMatrix(); fm.setMatrixAt(i, dm.matrix); fm.setColorAt(i, c.set(b[3])); });
          fm.instanceColor.needsUpdate = true; fm.receiveShadow = true; group.add(fm);
        }
      },
    };
  }

  // ---------- small furniture (into a Batch) ----------
  function lampPost(B, P, x, z, h = 5.2, lamps) {
    B.add(P.goldDark, new THREE.CylinderGeometry(0.32, 0.42, 0.5, 10), M(x, 0.25, z));
    B.add(P.gold, new THREE.CylinderGeometry(0.1, 0.13, h, 8), M(x, h / 2, z));
    for (const s of [-1, 1]) B.add(P.gold, boxG(1.0, 0.08, 0.08), M(x + s * 0.45, h - 0.4, z));
    lamps.push([x, h + 0.1, z], [x - 0.9, h - 0.62, z], [x + 0.9, h - 0.62, z]);
  }
  function bench(B, P, x, z, yaw) {
    const T = (lx, ly, lz) => new THREE.Matrix4().makeRotationY(yaw).multiply(M(lx, ly, lz)).premultiply(new THREE.Matrix4().makeTranslation(x, 0, z));
    for (const s of [-1, 1]) B.add(P.stone, boxG(0.3, 0.45, 0.7, 0.05), T(s * 0.9, 0.22, 0));
    B.add(RT.plastic('#c08a52', { roughness: 0.6 }), boxG(2.2, 0.12, 0.72, 0.04), T(0, 0.5, 0));
    B.add(RT.plastic('#c08a52', { roughness: 0.6 }), boxG(2.2, 0.5, 0.1, 0.04), T(0, 0.85, -0.32));
    B.add(P.gold, boxG(2.3, 0.06, 0.06), T(0, 1.12, -0.32));
  }
  function planter(B, P, x, z, w = 1.4, h = 0.9) {
    B.add(P.stone, boxG(w, h, w, 0.08), M(x, h / 2, z));
    B.add(P.gold, boxG(w + 0.06, 0.1, w + 0.06), M(x, h, z));
    B.add(P.soil, boxG(w - 0.25, 0.05, w - 0.25), M(x, h + 0.01, z));
  }
  // a flower bed with a white stone border (flowers are added to the Garden)
  function bed(B, P, Gd, x, z, w, d) {
    B.add(P.stone, boxG(w, 0.35, d, 0.06), M(x, 0.17, z));
    B.add(P.soil, boxG(w - 0.3, 0.04, d - 0.3), M(x, 0.36, z));
    Gd.flowers(x, z, w - 0.5, d - 0.5, 0.42);
  }
  // instanced glowing lamp globes (brighter at night)
  function lampGlobes(group, P, pts) {
    if (!pts.length) return null;
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 12, 9), P.lampGlow, pts.length), dm = new THREE.Object3D();
    pts.forEach((p, i) => { dm.position.set(p[0], p[1], p[2]); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); });
    group.add(m); return m;
  }

  // =================================================================================
  // TOWERS (into a Batch). Three designs in one language: stepped "crown" tower, round tower with a gold dome,
  // twin towers joined by a sky garden. Every tower: white fins and bands, gold crown, glass with windows.
  // =================================================================================
  function crownTower(B, P, Gd, x, z, o) {
    const w = o.w, h = o.h, glass = o.glass, y0 = o.podium ? 7 : 0;
    if (o.podium) podium(B, P, x, z, w + 6, w + 6);
    const tiers = [[w, h * 0.6], [w * 0.78, h * 0.24], [w * 0.56, h * 0.12]];
    let y = y0;
    tiers.forEach(([tw, th], k) => {
      B.add(glass, wallBox(tw, th, tw, P.TW, P.TH), M(x, y + th / 2, z));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(P.stone, boxG(1.3, th, 1.3), M(x + sx * tw / 2, y + th / 2, z + sz * tw / 2));   // corner fins
      for (const s of [-1, 1]) { B.add(P.stone, boxG(0.55, th, tw + 0.5), M(x + s * tw * 0.17, y + th / 2, z)); B.add(P.stone, boxG(tw + 0.5, th, 0.55), M(x, y + th / 2, z + s * tw * 0.17)); }
      B.add(P.stone, boxG(tw + 1.6, 1.6, tw + 1.6), M(x, y + th + 0.8, z));
      B.add(P.gold, boxG(tw + 1.7, 0.35, tw + 1.7), M(x, y + th + 0.05, z));
      if (k < 2) { const nw = tiers[k + 1][0];                                                  // a terrace garden on each setback
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.6, rr = (tw + nw) / 4 + 0.3; Gd.tree(i % 2 ? 'cypress' : 'ball', x + Math.cos(a) * rr, y + th + 1.6, z + Math.sin(a) * rr, 0.7); } }
      y += th + 1.6;
    });
    const tw = tiers[2][0];
    B.add(P.gold, new THREE.ConeGeometry(tw * 0.62, h * 0.11, 4), M(x, y + h * 0.055, z, 0, Math.PI / 4, 0));
    B.add(P.gold, new THREE.CylinderGeometry(0.18, 0.3, h * 0.08, 8), M(x, y + h * 0.11 + h * 0.04, z));
    B.add(P.gold, new THREE.SphereGeometry(0.7, 10, 8), M(x, y + h * 0.19, z));
  }
  function roundTower(B, P, Gd, x, z, o) {
    const rr = o.w / 2, h = o.h, glass = o.glass, y0 = o.podium ? 7 : 0;
    if (o.podium) podium(B, P, x, z, o.w + 6, o.w + 6);
    B.add(glass, wallCyl(rr, h, P.TW, P.TH), M(x, y0 + h / 2, z));
    for (let k = 0; k <= Math.floor(h / 14); k++) B.add(P.stone, new THREE.CylinderGeometry(rr + 0.45, rr + 0.45, 1.1, 28), M(x, y0 + Math.min(h, k * 14 + 0.55), z));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; B.add(P.stone, boxG(0.7, h, 0.7), M(x + Math.cos(a) * rr, y0 + h / 2, z + Math.sin(a) * rr, 0, -a, 0)); }
    B.add(P.stone, new THREE.CylinderGeometry(rr + 0.9, rr + 0.9, 1.4, 28), M(x, y0 + h + 0.7, z));
    B.add(P.gold, new THREE.SphereGeometry(rr * 0.82, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(x, y0 + h + 1.4, z));
    B.add(P.gold, new THREE.CylinderGeometry(0.15, 0.3, rr * 2.2, 8), M(x, y0 + h + 1.4 + rr * 0.8 + rr * 1.1, z));
  }
  function twinTowers(B, P, Gd, x, z, o) {
    const w = o.w * 0.62, gap = o.w * 0.5, h = o.h, glass = o.glass, y0 = o.podium ? 7 : 0;
    if (o.podium) podium(B, P, x, z, w * 2 + gap + 6, w + 6);
    const hs = [h, h * 0.82];
    [-1, 1].forEach((s, i) => {
      const cx = x + s * (gap / 2 + w / 2), th = hs[i];
      B.add(glass, wallBox(w, th, w, P.TW, P.TH), M(cx, y0 + th / 2, z));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(P.stone, boxG(1.1, th, 1.1), M(cx + sx * w / 2, y0 + th / 2, z + sz * w / 2));
      for (let k = 1; k * 18 < th; k++) B.add(P.stone, boxG(w + 0.8, 0.9, w + 0.8), M(cx, y0 + k * 18, z));
      B.add(P.stone, boxG(w + 1.2, 1.2, w + 1.2), M(cx, y0 + th + 0.6, z)); B.add(P.gold, boxG(w + 1.3, 0.3, w + 1.3), M(cx, y0 + th, z));
      B.add(P.roofGreen, boxG(w - 0.6, 0.5, w - 0.6), M(cx, y0 + th + 1.3, z));                               // roof garden
      Gd.tree('ball', cx - w * 0.22, y0 + th + 1.5, z - w * 0.2, 0.8); Gd.tree('blossom', cx + w * 0.2, y0 + th + 1.5, z + w * 0.18, 0.75);
    });
    const by = y0 + h * 0.58;                                                                                 // the sky bridge with its garden
    B.add(P.stone, boxG(gap + 1, 5, w * 0.7), M(x, by, z)); B.add(glass, wallBox(gap + 0.6, 3.6, w * 0.7 + 0.2, P.TW, P.TH), M(x, by, z));
    B.add(P.gold, boxG(gap + 1.2, 0.3, w * 0.72), M(x, by + 2.55, z)); B.add(P.roofGreen, boxG(gap + 0.4, 0.4, w * 0.6), M(x, by + 2.75, z));
    for (let k = 0; k < 3; k++) Gd.tree(k === 1 ? 'blossom' : 'ball', x + (k - 1) * gap * 0.3, by + 2.9, z, 0.6);
  }
  // the base of a near tower: white stone with tall arched dark-glass windows and a gold band
  function podium(B, P, x, z, w, d) {
    B.add(P.cream, boxG(w, 7, d, 0.1), M(x, 3.5, z));
    B.add(P.gold, boxG(w + 0.2, 0.3, d + 0.2), M(x, 7, z));
    B.add(P.stone, boxG(w + 0.6, 0.7, d + 0.6), M(x, 7.35, z));
    const n = Math.max(2, Math.floor(w / 4));
    for (let i = 0; i < n; i++) { const fx = x - w / 2 + (i + 0.5) * (w / n);
      for (const s of [-1, 1]) { B.add(P.darkGlass, boxG(1.8, 4.2, 0.12), M(fx, 2.6, z + s * (d / 2 + 0.02))); B.add(P.gold, boxG(2.0, 0.18, 0.18), M(fx, 4.75, z + s * (d / 2 + 0.05))); } }
  }

  // =================================================================================
  // THE CITY (shared by every place): paving, lawns, the tower districts, avenue trees, hills, mountains
  // keep-out: the middle of the city (x −36…36, z −22…66) is left open for the station, the plaza and the other sets.
  // =================================================================================
  function skyline(o = {}) {
    const G = new THREE.Group(); G.name = 'capitalSkyline';
    const P = mats(), r = RT.rng(o.seed || 41), B = new Batch(), Gd = Garden(9), lamps = [];
    // ground: marble paving disc for the city, green meadow beyond
    const meadowTex = RT.canvasTexture(128, 128, (g) => { g.fillStyle = '#6bbf4a'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,90,20' : '220,240,160'},0.08)`; g.fillRect(r() * 128, r() * 128, 3, 3); } });
    meadowTex.wrapS = meadowTex.wrapT = THREE.RepeatWrapping; meadowTex.repeat.set(160, 160);
    const meadowM = new THREE.MeshLambertMaterial({ map: meadowTex });
    for (const [z0, z1] of [[-2000, RAIL_N], [RAIL_S, 2000]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4000, z1 - z0), meadowM); m.rotation.x = -Math.PI / 2; m.position.set(0, -0.05, (z0 + z1) / 2); m.receiveShadow = true; G.add(m); }
    // (the ground is split in two along the railway, which runs east–west through the city in a shallow cutting)
    const paveTex = P.paveTex.clone(); paveTex.needsUpdate = true; paveTex.repeat.set(170, 140);
    const paveM = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.45 });
    for (const [z0, z1] of [[RAIL_N - 340, RAIL_N], [RAIL_S, RAIL_S + 360]]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(700, z1 - z0), paveM); pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0, (z0 + z1) / 2); pl.receiveShadow = true; G.add(pl); }
    B.add(RT.plastic('#8c867a', { roughness: 0.9 }), boxG(1400, 0.3, RAIL_S - RAIL_N), M(0, -0.95, TRACK_Z));
    for (const s of [-1, 1]) { B.add(RT.metal('#c9ccd2'), boxG(1400, 0.22, 0.25), M(0, -0.72, TRACK_Z + s * 0.9)); B.add(P.stone, boxG(1400, 1.1, 0.5), M(0, -0.5, s > 0 ? RAIL_S + 0.25 : RAIL_N - 0.25)); }
    for (let x = -680; x <= 680; x += 2.2) B.add(RT.plastic('#6b5a48', { roughness: 0.9 }), boxG(0.5, 0.14, 2.8), M(x, -0.8, TRACK_Z));
    // the towers: a jittered grid; taller toward the Council district in the north; landmarks
    const keep = (x, z, pad) => (x > -36 - pad && x < 36 + pad && z > -22 - pad && z < 66 + pad) || Math.abs(z - TRACK_Z) < 6 + pad;   // the middle + the railway
    const STEP = 34, towers = [], parks = [];
    for (let gx = -9; gx <= 9; gx++) for (let gz = -9; gz <= 9; gz++) {
      let x = gx * STEP + (r() - 0.5) * 8, z = 22 + gz * STEP + (r() - 0.5) * 8;
      const d = Math.hypot(x, z - 22); if (d > 320) continue;
      const w = 13 + r() * 9; if (keep(x, z, w / 2 + 4)) continue;
      if (d > 55 && r() < 0.17) { parks.push({ x, z, w: STEP - 6 }); continue; }                     // a park instead of a tower
      const north = clamp((22 - z) / 260, -0.3, 1), near = d < 95;
      let h = (near ? 45 : 60) + r() * 70 + north * 80 + (r() < 0.08 ? 70 : 0);
      towers.push({ x, z, w, h, type: r() < 0.5 ? 'crown' : r() < 0.6 ? 'round' : 'twin', glass: P.glasses[Math.floor(r() * 4)], podium: d < 150 });
    }
    // landmark: the Council Spire straight north of the plaza, and two tall gold-crowned towers beside it
    towers.push({ x: 0, z: -150, w: 30, h: 300, type: 'crown', glass: P.glassChamp, podium: true, landmark: true });
    towers.push({ x: -70, z: -110, w: 22, h: 210, type: 'round', glass: P.glassBlue, podium: true }, { x: 75, z: -105, w: 24, h: 200, type: 'crown', glass: P.glassAqua, podium: true });
    for (const t of towers) (t.type === 'crown' ? crownTower : t.type === 'round' ? roundTower : twinTowers)(B, P, Gd, t.x, t.z, t);
    // parks: clipped lawn with a white border, a round pond with a gold rim, trees all around, flower beds
    const pondM = new THREE.MeshStandardMaterial({ color: '#4aa6dc', roughness: 0.08, metalness: 0.3 });
    for (const pk of parks) {
      B.add(P.lawnFlat, boxG(pk.w, 0.12, pk.w), M(pk.x, 0.06, pk.z)); B.add(P.stone, boxG(pk.w + 0.8, 0.3, 0.6), M(pk.x, 0.15, pk.z - pk.w / 2)); B.add(P.stone, boxG(pk.w + 0.8, 0.3, 0.6), M(pk.x, 0.15, pk.z + pk.w / 2));
      B.add(P.stone, new THREE.CylinderGeometry(4.6, 4.8, 0.4, 28), M(pk.x, 0.2, pk.z)); B.add(pondM, new THREE.CylinderGeometry(4.2, 4.2, 0.42, 28), M(pk.x, 0.22, pk.z)); B.add(P.gold, new THREE.TorusGeometry(4.6, 0.08, 6, 36), M(pk.x, 0.42, pk.z, Math.PI / 2, 0, 0));
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, rr = pk.w * 0.38; Gd.tree(k % 3 === 0 ? 'blossom' : k % 3 === 1 ? 'ball' : 'cypress', pk.x + Math.cos(a) * rr, 0.1, pk.z + Math.sin(a) * rr, 1.0); }
      for (const s of [-1, 1]) { B.add(P.soil, boxG(6, 0.2, 1.6), M(pk.x + s * 7.5, 0.15, pk.z)); Gd.flowers(pk.x + s * 7.5, pk.z, 5.6, 1.3, 0.3, 3); }
    }
    // avenues: rows of trees and gold lamp posts along the grid lines between the towers (and around the plaza)
    for (let k = -9; k <= 9; k++) {
      const line = k * STEP + STEP / 2;
      for (let s = -300; s <= 300; s += 9) {
        for (const [x, z] of [[line, 22 + s], [s, 22 + line]]) {
          if (Math.hypot(x, z - 22) > 310 || keep(x, z, 2)) continue;
          if (towers.some((t) => Math.abs(t.x - x) < t.w / 2 + 5 && Math.abs(t.z - z) < t.w / 2 + 5)) continue;
          const kind = Math.abs(Math.round(s / 9)) % 2;
          if (kind) Gd.tree((k + Math.round(s / 9)) % 3 === 0 ? 'blossom' : 'ball', x + 2.2, 0, z + 2.2, 0.95); else if (Math.hypot(x, z - 22) < 160) lampPost(B, P, x - 2.2, z - 2.2, 5.2, lamps);
        }
      }
    }
    // rolling green hills around the city, then the snowy mountains (the natural scenery around the Capital)
    const hillM = new THREE.MeshStandardMaterial({ color: '#5aa845', flatShading: true, roughness: 1 }), hillD = new THREE.MeshStandardMaterial({ color: '#4a9440', flatShading: true, roughness: 1 });
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + r() * 0.08, d = 470 + r() * 140, rad = 70 + r() * 70, h = 30 + r() * 45;
      const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? hillM : hillD); m.scale.y = h / rad; m.position.set(Math.cos(a) * d, -2, 22 + Math.sin(a) * d); G.add(m);
      for (let k = 0; k < 7; k++) { const aa = r() * 6.28, rr = Math.sqrt(r()) * rad * 0.8, tx = m.position.x + Math.cos(aa) * rr, tz = m.position.z + Math.sin(aa) * rr, ty = Math.sqrt(Math.max(0, 1 - (rr / rad) ** 2)) * h - 3;
        Gd.tree(k % 3 ? 'cypress' : 'ball', tx, ty, tz, 3.2); }
    }
    const mMat = new THREE.MeshStandardMaterial({ color: '#7d93b8', flatShading: true, roughness: 1 }), snow = new THREE.MeshStandardMaterial({ color: '#f4f6fa', flatShading: true, roughness: 1 });
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + r() * 0.12, d = 900 + r() * 300, rad = 190 + r() * 120, h = 170 + r() * 150;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), mMat); m.position.set(Math.cos(a) * d, h / 2 - 30, 22 + Math.sin(a) * d); m.rotation.y = r() * 3; G.add(m);
      const cp = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.3, h * 0.3, 7), snow); cp.position.set(m.position.x, h - 30 - h * 0.15 + 1, m.position.z); cp.rotation.y = m.rotation.y; G.add(cp);
    }
    B.build(G); Gd.build(G);
    const globes = lampGlobes(G, P, lamps);
    G.setNight = (k) => {
      for (const g of [P.glassBlue, P.glassChamp, P.glassAqua]) { g.emissiveIntensity = k * 0.95; g.color.setScalar(1 - 0.8 * k); }
      P.lampGlow.emissiveIntensity = 0.25 + k * 2.2;
      hillM.color.set(k ? '#2c4a3a' : '#5aa845'); hillD.color.set(k ? '#253f33' : '#4a9440'); mMat.color.set(k ? '#2b3756' : '#7d93b8'); snow.color.set(k ? '#9aa8c6' : '#f4f6fa');
    };
    G.setNight(0);
    G.spots = { towers, parks };
    return G;
  }

  // =================================================================================
  // 1. THE STATION + GARDEN PLAZA (morning arrival). The train runs along x at z = −9.5 in a shallow track bed;
  //    the platform and the plaza are at y = 0. The plaza opens south (+z): fountain at (0, 0, 22).
  // =================================================================================
  function station(o = {}) {
    const G = new THREE.Group(); G.name = 'station';
    const P = mats(), r = RT.rng(o.seed || 12), B = new Batch(), Gd = Garden(14), lamps = [];
    // platform edges (the track itself is part of the city): white stone with a gold safety line on both sides
    for (const s of [-1, 1]) { const ez = s > 0 ? RAIL_S + 0.4 : RAIL_N - 0.4; B.add(P.stone, boxG(90, 0.06, 0.8), M(0, 0.03, ez)); B.add(P.gold, boxG(90, 0.03, 0.22), M(0, 0.07, ez + s * 0.55)); }
    // the grand canopy: white columns with gold capitals, a vaulted glass roof on gold ribs
    const CAN_Z0 = -17, CAN_Z1 = -1.5, CH = 9, cz = (CAN_Z0 + CAN_Z1) / 2, span = CAN_Z1 - CAN_Z0;
    for (let x = -40; x <= 40; x += 10) for (const z of [CAN_Z0, CAN_Z1]) {
      B.add(P.stone, new THREE.CylinderGeometry(0.55, 0.65, CH, 14), M(x, CH / 2, z));
      B.add(P.stone, boxG(1.6, 0.5, 1.6), M(x, 0.25, z)); B.add(P.gold, boxG(1.5, 0.45, 1.5), M(x, CH - 0.1, z));
    }
    for (const z of [CAN_Z0, CAN_Z1]) { B.add(P.stone, boxG(82, 1.2, 1.4), M(0, CH + 0.6, z)); B.add(P.gold, boxG(82.2, 0.25, 1.45), M(0, CH + 0.05, z)); }
    const ribs = 18;
    for (let x = -40; x <= 40; x += 5) for (let k = 0; k < ribs; k++) {                                      // gold arch ribs
      const a0 = (k / ribs) * Math.PI, a1 = ((k + 1) / ribs) * Math.PI, R = span / 2;
      const p0 = [cz - Math.cos(a0) * R, CH + 1.2 + Math.sin(a0) * R * 0.55], p1 = [cz - Math.cos(a1) * R, CH + 1.2 + Math.sin(a1) * R * 0.55];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      B.add(P.gold, boxG(0.2, 0.25, len + 0.05), M(x, (p0[1] + p1[1]) / 2, (p0[0] + p1[0]) / 2, -ang, 0, 0));
    }
    // the glass vault: half a cylinder lying along x (the +x half turns into the upper half), squashed to the ribs' height
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(span / 2, span / 2, 82, 24, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    vault.rotation.z = Math.PI / 2; vault.scale.set(0.55, 1, 1); vault.position.set(0, CH + 1.2, cz); vault.castShadow = false; vault.renderOrder = 3; G.add(vault);
    // station hall front (west end) + clock arch over the plaza entrance
    B.add(P.stone, boxG(4, CH + 6, 18), M(-44, (CH + 6) / 2, cz)); B.add(P.gold, boxG(4.2, 0.4, 18.2), M(-44, CH + 6, cz));
    B.add(P.stone, boxG(4, CH + 6, 18), M(44, (CH + 6) / 2, cz)); B.add(P.gold, boxG(4.2, 0.4, 18.2), M(44, CH + 6, cz));
    // the plaza: lawns, flower beds, hedges, the fountain, blossom tree avenues, benches, lamps, statues
    const lawn = (x, z, w, d) => { const tex = P.lawnTex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 2.4, d / 8); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.receiveShadow = true; G.add(m);
      B.add(P.stone, boxG(w + 0.4, 0.22, 0.3), M(x, 0.11, z - d / 2)); B.add(P.stone, boxG(w + 0.4, 0.22, 0.3), M(x, 0.11, z + d / 2)); B.add(P.stone, boxG(0.3, 0.22, d), M(x - w / 2, 0.11, z)); B.add(P.stone, boxG(0.3, 0.22, d), M(x + w / 2, 0.11, z)); };
    for (const s of [-1, 1]) {
      lawn(s * 17, 22, 14, 22); lawn(s * 17, 48, 14, 18);
      bed(B, P, Gd, s * 17, 22, 8, 3.2); bed(B, P, Gd, s * 17, 48, 6, 3);
      for (const z of [13, 31]) { B.add(P.hedge, boxG(12, 1.0, 1.1, 0.25), M(s * 17, 0.5, z)); }
      for (let z = 6; z <= 60; z += 6) Gd.tree(z % 12 ? 'blossom' : 'ball', s * 8.2, 0, z, 1.05);                      // the blossom avenue
      for (let z = 9; z <= 57; z += 12) { planter(B, P, s * 26, z); Gd.tree('topiary', s * 26, 0.9, z, 0.85); }
      for (const z of [15, 29, 41, 55]) Gd.tree('cone', s * 11.8, 0, z, 0.9);
      for (const z of [10, 34, 52]) bench(B, P, s * 6.2, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      for (const z of [4, 34, 46, 60]) lampPost(B, P, s * 5.2, z, 5.2, lamps);
      for (let z = 2; z <= 62; z += 4) Gd.tree('cypress', s * 33.5, 0, z, 0.95);                                         // tall cypress screen at the plaza edge
      // a gold statue on a white plinth at each side of the entrance
      B.add(P.stone, boxG(2.2, 2.6, 2.2, 0.08), M(s * 12, 1.3, 2)); B.add(P.gold, boxG(2.3, 0.2, 2.3), M(s * 12, 2.6, 2));
      B.add(P.gold, new THREE.CylinderGeometry(0.5, 0.7, 2.4, 10), M(s * 12, 3.9, 2)); B.add(P.gold, new THREE.SphereGeometry(0.55, 12, 9), M(s * 12, 5.5, 2));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; B.add(P.gold, new THREE.ConeGeometry(0.16, 0.6, 5), M(s * 12 + Math.cos(a) * 0.45, 6.15, 2 + Math.sin(a) * 0.45)); }
    }
    // the fountain: three white tiers, gold rims, water that ripples and jets that sparkle
    const FZ = 22;
    B.add(P.stone, new THREE.CylinderGeometry(6.4, 6.6, 0.9, 40), M(0, 0.45, FZ)); B.add(P.gold, new THREE.TorusGeometry(6.45, 0.12, 6, 48), M(0, 0.92, FZ, Math.PI / 2, 0, 0));
    B.add(P.stone, new THREE.CylinderGeometry(0.9, 1.3, 2.6, 18), M(0, 1.3, FZ)); B.add(P.stone, new THREE.CylinderGeometry(2.6, 2.2, 0.5, 30), M(0, 2.8, FZ)); B.add(P.gold, new THREE.TorusGeometry(2.6, 0.08, 6, 36), M(0, 3.05, FZ, Math.PI / 2, 0, 0));
    B.add(P.stone, new THREE.CylinderGeometry(0.45, 0.65, 1.4, 14), M(0, 3.7, FZ)); B.add(P.stone, new THREE.CylinderGeometry(1.4, 1.2, 0.35, 24), M(0, 4.45, FZ)); B.add(P.gold, new THREE.TorusGeometry(1.4, 0.07, 6, 30), M(0, 4.62, FZ, Math.PI / 2, 0, 0));
    B.add(P.gold, new THREE.SphereGeometry(0.42, 14, 10), M(0, 5.2, FZ));
    const waterTex = RT.canvasTexture(128, 128, (g) => { g.fillStyle = '#4aa8de'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(r() * 128, r() * 128, 6 + r() * 14, r() * 3, r() * 3 + 1.5); g.stroke(); } });
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(3, 3);
    const waterM = new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.9 });
    for (const [rr, y] of [[6.1, 0.82], [2.4, 2.98], [1.25, 4.55]]) { const w = new THREE.Mesh(new THREE.CircleGeometry(rr, 40), waterM); w.rotation.x = -Math.PI / 2; w.position.set(0, y, FZ); G.add(w); }
    const sprayM = new THREE.MeshStandardMaterial({ color: '#e8f6ff', emissive: '#bfe6ff', emissiveIntensity: 0.25, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
    const falls = [[2.6, 2.95, 2.1], [1.4, 4.55, 1.6]].map(([rr, y, h]) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(rr + 0.05, rr + 0.35, h, 36, 1, true), sprayM); f.position.set(0, y - h / 2, FZ); f.renderOrder = 4; G.add(f); return f; });
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 2.4, 10, 1, true), sprayM); jet.position.set(0, 6.4, FZ); G.add(jet);
    const ring = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, j = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.6, 6, 1, true), sprayM); j.position.set(Math.cos(a) * 5.3, 1.6, FZ + Math.sin(a) * 5.3); j.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); G.add(j); ring.push(j); }
    // shops along the plaza (podium fronts with awnings): the people here are rich
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const z = 8 + k * 15, x = s * 42;
      B.add(P.cream, boxG(8, 8, 13, 0.08), M(x, 4, z)); B.add(P.gold, boxG(8.2, 0.3, 13.2), M(x, 8, z));
      B.add(P.darkGlass, boxG(0.15, 4.2, 9), M(x - s * 4.05, 2.4, z));
      const aw = RT.plastic(['#ffffff', '#f7d7e3', '#d9ecff', '#fff1c7'][k], { roughness: 0.6 });
      B.add(aw, boxG(1.8, 0.2, 10), M(x - s * 4.9, 5.0, z, 0, 0, s * 0.35));
      B.add(P.gold, boxG(0.12, 0.6, 6), M(x - s * 4.1, 6.4, z));
    }
    B.build(G); Gd.build(G);
    const globes = lampGlobes(G, P, lamps);
    // the train: white with a gold stripe and blue windows, a bullet nose; three cars, doors that slide open
    const train = makeTrain(P); G.add(train);
    G.update = (t, u = {}) => {
      waterTex.offset.set(Math.sin(t * 0.3) * 0.05, t * 0.04);
      jet.scale.y = 1 + Math.sin(t * 9) * 0.05; for (const j of ring) j.scale.y = 1 + Math.sin(t * 7 + j.position.x) * 0.08;
      for (const f of falls) f.material.opacity = 0.5 + Math.sin(t * 5) * 0.05;
      if (u.trainX !== undefined) train.position.x = u.trainX;
      train.setDoors(u.doors || 0);
    };
    G.spots = { train, TRACK_Z, fountain: new THREE.Vector3(0, 0, FZ), doorX: train.doorX };
    return G;
  }
  function makeTrain(P) {
    const T = new THREE.Group(); T.name = 'train'; T.position.set(0, 0, TRACK_Z);
    const white = RT.plastic('#fbfbfd', { roughness: 0.3, metalness: 0.15 }), stripe = RT.metal('#e2b54a', { roughness: 0.3 }), win = RT.plastic('#2a4f7a', { roughness: 0.1, metalness: 0.5 }), dark = RT.plastic('#2a2f38');
    const B = new Batch(), CAR = 16, W = 3.6, H = 3.9, Y0 = -0.45, doors = [];
    for (let c = 0; c < 3; c++) {
      const cx = (c - 1) * (CAR + 0.6);
      B.add(white, boxG(CAR, H, W, 0.45), M(cx, Y0 + H / 2, 0));
      B.add(stripe, boxG(CAR + 0.02, 0.28, W + 0.04), M(cx, Y0 + 1.1, 0));
      B.add(win, boxG(CAR - 1.6, 1.25, W + 0.04), M(cx, Y0 + 2.45, 0));
      B.add(dark, boxG(CAR - 0.6, 0.5, W - 0.6), M(cx, Y0 - 0.1, 0));
      if (c < 2) B.add(dark, boxG(1.0, H - 0.6, W - 0.8), M(cx + CAR / 2 + 0.3, Y0 + H / 2, 0));
      for (const dxn of [-0.25, 0.25]) {                                                     // two doors per car on the platform side (+z)
        const dg = new THREE.Group(); dg.position.set(cx + dxn * CAR, Y0, W / 2 + 0.03); T.add(dg);
        const d = RT.mesh(boxG(1.5, 2.9, 0.08, 0.04), RT.plastic('#e9edf2', { roughness: 0.35 })); d.position.y = 1.45 + 0.45; dg.add(d);
        const dw = RT.mesh(boxG(1.0, 1.0, 0.1), win); dw.position.y = 2.6; d.add(dw); dw.position.set(0, 0.7, 0.01);
        const gap = RT.mesh(boxG(1.5, 2.9, 0.04), RT.plastic('#1d2026')); gap.position.set(0, 1.9, -0.05); dg.add(gap);
        doors.push(d);
      }
    }
    // noses at both ends
    for (const s of [-1, 1]) {
      const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), white); nose.scale.set(H / 2, 5.5, W / 2);
      nose.rotation.z = -s * Math.PI / 2; nose.position.set(s * (1.5 * CAR + 0.6), Y0 + H / 2, 0); nose.castShadow = true; T.add(nose);
      B.add(win, boxG(2.2, 1.0, W * 0.62), M(s * (1.5 * CAR + 2.4), Y0 + 2.6, 0, 0, 0, s * 0.45));
      B.add(stripe, boxG(3.6, 0.28, W * 0.9), M(s * (1.5 * CAR + 1.6), Y0 + 1.1, 0, 0, 0, s * 0.2));
    }
    B.build(T);
    T.doorX = doors.map((d) => d.parent.position.x);
    T.setDoors = (k) => doors.forEach((d) => { d.position.x = k * 1.45; });
    return T;
  }

  // =================================================================================
  // 2. THE TRAINING COURT (morning). Open-air, ringed by a white colonnade; the Council balcony on the north wall.
  //    Court floor 44 × 34 centered at (0, 0, 22). Stations: sword dummies (west), climbing wall + ropes (north-west),
  //    archery range (east, targets on the north side), Juno's workbench + net trap (south-west corner).
  // =================================================================================
  const COURT = { cx: 0, cz: 22, w: 44, d: 34 };
  function trainingCourt(o = {}) {
    const G = new THREE.Group(); G.name = 'trainingCourt';
    const P = mats(), r = RT.rng(o.seed || 23), B = new Batch(), Gd = Garden(31), lamps = [];
    const { cx, cz, w, d } = COURT, x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    // floor: polished blue-and-white training mats inside a marble border
    const matTex = RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = '#e9eef6'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#dfe7f3' : '#f2f5fa'; g.fillRect(i * 64, j * 64, 64, 64); }
      g.strokeStyle = '#2f6fd6'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 244); g.strokeStyle = '#d6b25a'; g.lineWidth = 2; g.strokeRect(14, 14, 228, 228);
    });
    matTex.wrapS = matTex.wrapT = THREE.RepeatWrapping; matTex.repeat.set(w / 11, d / 11);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.06, cz); floor.receiveShadow = true; G.add(floor);
    B.add(P.stone, boxG(w + 10, 0.06, d + 10), M(cx, 0.02, cz));
    // colonnade: columns every 4, a white entablature with a gold band; behind it a tall white wall with planters on top
    const WALL_H = 9;
    const colLine = (ax, az, bx, bz) => { const n = Math.round(Math.hypot(bx - ax, bz - az) / 4); for (let i = 0; i <= n; i++) { const x = lerp(ax, bx, i / n), z = lerp(az, bz, i / n);
      B.add(P.stone, new THREE.CylinderGeometry(0.45, 0.55, WALL_H - 1, 12), M(x, (WALL_H - 1) / 2, z)); B.add(P.gold, boxG(1.2, 0.4, 1.2), M(x, WALL_H - 1, z)); B.add(P.stone, boxG(1.3, 0.4, 1.3), M(x, 0.2, z)); } };
    const back = 4.5;
    colLine(x0, z0, cx - 10, z0); colLine(cx + 10, z0, x1, z0); colLine(x0, z1, x1, z1); colLine(x0, z0, x0, z1); colLine(x1, z0, x1, z1);   // (north: open under the balcony)
    const half = (w + back * 2 + 1) / 2, nw = half - 10;                                             // the north roof stops at the balcony
    for (const [bx, bz, bw, bd] of [[cx - 10 - nw / 2, z0 - back / 2, nw, back], [cx + 10 + nw / 2, z0 - back / 2, nw, back], [cx, z1 + back / 2, w + back * 2 + 1, back], [x0 - back / 2, cz, back, d], [x1 + back / 2, cz, back, d]]) {
      B.add(P.stone, boxG(bw, 0.9, bd), M(bx, WALL_H - 0.4, bz)); B.add(P.gold, boxG(bw + 0.05, 0.3, bd + 0.05), M(bx, WALL_H - 0.95, bz));
    }
    // outer walls (behind the colonnade), with a frieze of gold squares and planters with cypress on top
    for (const [bx, bz, bw, bd] of [[cx, z0 - back, w + back * 2 + 1, 0.8], [cx, z1 + back, w + back * 2 + 1, 0.8], [x0 - back, cz, 0.8, d + back * 2], [x1 + back, cz, 0.8, d + back * 2]]) {
      B.add(P.cream, boxG(bw, WALL_H + 1.5, bd), M(bx, (WALL_H + 1.5) / 2, bz));
      const along = bw > bd, L = along ? bw : bd;
      for (let k = -L / 2 + 3; k < L / 2 - 2; k += 6) { const px = along ? bx + k : bx, pz = along ? bz : bz + k; B.add(P.gold, boxG(along ? 1.2 : 0.9, 1.2, along ? 0.9 : 1.2), M(px, WALL_H - 2.6, pz)); planter(B, P, px, pz, 1.3, 0.6); Gd.tree('cypress', px, WALL_H + 1.5 + 0.6, pz, 0.8); }
    }
    // the Council balcony (north): a loggia above the colonnade with a gold railing, red-and-white banners, seats
    const BAL_Y = 6.2, BAL_Z = z0 - 1.6;
    B.add(P.stone, boxG(16, 0.7, 5), M(cx, BAL_Y - 0.35, BAL_Z - 0.6)); B.add(P.gold, boxG(16.2, 0.2, 5.2), M(cx, BAL_Y - 0.75, BAL_Z - 0.6));
    for (let x = -7.6; x <= 7.6; x += 0.8) B.add(P.gold, new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), M(cx + x, BAL_Y + 0.55, BAL_Z + 1.75));
    B.add(P.gold, boxG(16, 0.14, 0.2), M(cx, BAL_Y + 1.12, BAL_Z + 1.75));
    for (const x of [-7.6, -3, 3, 7.6]) { B.add(P.stone, new THREE.CylinderGeometry(0.42, 0.5, BAL_Y - 0.7, 12), M(cx + x, (BAL_Y - 0.7) / 2, BAL_Z + 0.9)); B.add(P.gold, boxG(1.1, 0.3, 1.1), M(cx + x, BAL_Y - 0.85, BAL_Z + 0.9)); }   // supports
    for (const s of [-1, 1]) B.add(P.stone, new THREE.CylinderGeometry(0.4, 0.45, 5, 12), M(cx + s * 7.6, BAL_Y + 2.5, BAL_Z - 2.4));      // the canopy's columns
    B.add(P.stone, boxG(17, 1.2, 6.5), M(cx, BAL_Y + 5.6, BAL_Z - 0.9)); B.add(P.gold, boxG(17.2, 0.3, 6.7), M(cx, BAL_Y + 5.0, BAL_Z - 0.9));
    B.add(RT.plastic('#8e1d2b', { roughness: 0.6 }), boxG(15.6, 4.6, 0.2), M(cx, BAL_Y + 2.4, BAL_Z - 2.6));                 // red back curtain
    const seats = [];
    for (const x of [-4.2, -1.4, 1.4, 4.2]) { const big = Math.abs(x) < 2; B.add(P.gold, boxG(1.3, 0.5, 1.2), M(cx + x, BAL_Y + 0.25, BAL_Z - 1.4)); B.add(RT.plastic('#8e1d2b'), boxG(1.2, big ? 2.6 : 1.9, 0.3), M(cx + x, BAL_Y + (big ? 1.3 : 0.95), BAL_Z - 1.95)); seats.push([cx + x, BAL_Y, BAL_Z - 1.0]); }
    // banners down the wall under the balcony
    const banTex = RT.canvasTexture(128, 256, (g) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#d8ab3a'; g.fillRect(0, 0, 128, 14); g.fillRect(0, 242, 128, 14);
      g.beginPath(); g.moveTo(24, 120); g.lineTo(32, 76); g.lineTo(48, 100); g.lineTo(64, 64); g.lineTo(80, 100); g.lineTo(96, 76); g.lineTo(104, 120); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(64, 150, 36, 16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f7f4ec'; g.beginPath(); g.arc(64, 150, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8e1d2b'; g.fillRect(0, 200, 128, 26); });
    for (const x of [-11, -6.5, 6.5, 11]) { const bn = RT.mesh(new THREE.BoxGeometry(2.2, 5, 0.1), [P.stone, P.stone, P.stone, P.stone, new THREE.MeshStandardMaterial({ map: banTex, roughness: 0.6 }), P.stone]); bn.position.set(cx + x, 5.2, z0 - back + 0.5); G.add(bn); }
    // --- WEST: sword dummies + a weapon rack ---
    const straw = RT.plastic('#d8b56a', { roughness: 0.8 }), wood = RT.plastic('#8a5a34', { roughness: 0.65 }), steel = RT.metal('#d5dae2', { roughness: 0.25 }), leather = RT.plastic('#6b3b22', { roughness: 0.7 });
    const dummies = [];
    for (const [x, z] of [[-14.5, 14], [-14.5, 20], [-14.5, 26]]) {
      const dg = new THREE.Group(); dg.position.set(cx + x, 0, z); G.add(dg);
      dg.add(RT.mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 12), wood).translateY(0.15));
      dg.add(RT.mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8), wood).translateY(1.0));
      const body = new THREE.Group(); body.position.y = 1.7; dg.add(body);
      body.add(RT.mesh(boxG(1.6, 1.6, 0.9, 0.15), straw).translateY(0.75)); body.add(RT.mesh(boxG(1.7, 0.18, 1.0), leather).translateY(0.95));
      body.add(RT.mesh(boxG(1.0, 0.9, 0.9, 0.2), straw).translateY(2.05)); body.add(RT.mesh(boxG(2.6, 0.22, 0.22), wood).translateY(1.25));
      const tgt = RT.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), RT.plastic('#c0262f')); tgt.rotation.x = Math.PI / 2; tgt.position.set(0, 0.75, 0.47); body.add(tgt);
      dummies.push(body);
    }
    B.add(wood, boxG(0.25, 2.6, 4), M(cx - 20.2, 1.3, cz)); B.add(wood, boxG(0.6, 0.15, 4), M(cx - 19.95, 0.6, cz)); B.add(wood, boxG(0.6, 0.15, 4), M(cx - 19.95, 2.2, cz));
    for (let k = 0; k < 6; k++) { const z = cz - 1.6 + k * 0.64; B.add(k % 2 ? steel : wood, boxG(0.08, 2.1, 0.12), M(cx - 19.8, 1.4, z, 0, 0, 0.12)); B.add(P.gold, boxG(0.12, 0.08, 0.4), M(cx - 19.8, 0.7, z)); }
    // --- NORTH-WEST: the climbing wall and the rope gantry ---
    B.add(RT.plastic('#e9ecf2', { roughness: 0.6 }), boxG(7, 9.5, 0.8), M(cx - 13, 4.75, z0 + 1.8));
    const holdCols = ['#ff4fa3', '#ffd23f', '#2fd06b', '#2f6fe0', '#ff7b2e', '#b57bff'];
    for (let i = 0; i < 46; i++) B.add(RT.plastic(holdCols[i % 6], { roughness: 0.5 }), new THREE.DodecahedronGeometry(0.17 + r() * 0.12, 0), M(cx - 13 + (r() - 0.5) * 6.2, 0.8 + r() * 8.4, z0 + 2.25));
    B.add(P.gold, boxG(7.3, 0.3, 1.0), M(cx - 13, 9.6, z0 + 1.8));
    for (const s of [-1, 1]) B.add(steel, new THREE.CylinderGeometry(0.15, 0.15, 10, 10), M(cx - 4.5 + s * 3.5, 5, z0 + 4.5));
    B.add(steel, new THREE.CylinderGeometry(0.15, 0.15, 7.2, 10), M(cx - 4.5, 10, z0 + 4.5, 0, 0, Math.PI / 2));
    const ropeM = RT.plastic('#c9a66b', { roughness: 0.85 }), ropes = [];
    for (const dx of [-2.2, -0.8, 0.8, 2.2]) { const rp = RT.mesh(new THREE.CylinderGeometry(0.07, 0.07, 9.2, 6), ropeM); rp.geometry.translate(0, -4.6, 0); rp.position.set(cx - 4.5 + dx, 10, z0 + 4.5); G.add(rp); ropes.push(rp); }
    B.add(RT.plastic('#2f6fd6', { roughness: 0.7 }), boxG(8, 0.35, 4, 0.15), M(cx - 4.5, 0.18, z0 + 4.5));                     // crash mat
    // --- EAST: the archery range. Targets on the north side, the shooting line at the south end ---
    const ringTex = RT.canvasTexture(256, 256, (g) => { const cols = ['#ffffff', '#1d1d24', '#2f8fe0', '#e33b3b', '#ffd23f']; for (let k = 0; k < 10; k++) { g.fillStyle = cols[Math.floor(k / 2)]; g.beginPath(); g.arc(128, 128, 126 - k * 12.4, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.stroke(); } });
    const targets = [];
    for (const x of [8, 12.5, 17]) {
      const tg = new THREE.Group(); tg.position.set(cx + x, 0, z0 + 2.6); G.add(tg);
      for (const s of [-1, 1]) tg.add(RT.mesh(boxG(0.18, 2.6, 0.18), wood).translateX(s * 0.7).translateY(1.3).translateZ(-0.3));
      const face = RT.mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.35, 32), [RT.plastic('#d8b56a'), new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.7 }), RT.plastic('#d8b56a')]); face.rotation.x = Math.PI / 2; face.position.y = 2.0; tg.add(face);
      targets.push(tg);
    }
    for (let k = 0; k < 9; k++) B.add(P.gold, boxG(1.2, 0.04, 0.12), M(cx + 7 + k * 1.3, 0.1, z1 - 3.2));                      // the gold shooting line
    B.add(wood, boxG(3, 1.1, 0.6), M(cx + 19, 0.55, z1 - 2)); for (let k = 0; k < 4; k++) B.add(wood, new THREE.TorusGeometry(0.6, 0.05, 6, 18, Math.PI), M(cx + 17.8 + k * 0.8, 1.7, z1 - 2, 0, 0, Math.PI / 2));   // bow rack
    // --- SOUTH-WEST: Juno's workbench with scrap, gears and springs; the tripwire and the hanging net ---
    const JX = cx - 15.5, JZ = z1 - 6;
    B.add(wood, boxG(3.4, 0.2, 1.4), M(JX, 1.15, JZ)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(wood, boxG(0.18, 1.1, 0.18), M(JX + sx * 1.5, 0.55, JZ + sz * 0.55));
    const scrap = RT.metal('#9aa3ad', { roughness: 0.45 }), copper = RT.metal('#c8743a', { roughness: 0.4 });
    for (let k = 0; k < 9; k++) { const kx = JX - 1.3 + (k % 5) * 0.6, kz = JZ - 0.35 + Math.floor(k / 5) * 0.55; if (k % 3 === 0) B.add(copper, new THREE.TorusGeometry(0.16, 0.06, 6, 10), M(kx, 1.35, kz, Math.PI / 2, 0, 0)); else if (k % 3 === 1) B.add(scrap, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), M(kx, 1.3, kz, 0, 0, Math.PI / 2)); else B.add(scrap, boxG(0.3, 0.2, 0.25), M(kx, 1.35, kz)); }
    for (let k = 0; k < 6; k++) B.add(scrap, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8), M(JX - 1.2 + k * 0.5, 0.05, JZ + 1.4 + (k % 2) * 0.3));
    B.add(scrap, boxG(1.4, 0.8, 1.0), M(JX - 2.7, 0.4, JZ + 0.4)); B.add(copper, boxG(0.9, 0.5, 0.7), M(JX - 2.7, 1.05, JZ + 0.4));
    const NET = { x: JX + 4.8, z: JZ + 1.0, y: 5.2 };
    for (const s of [-1, 1]) B.add(wood, boxG(0.2, 5.6, 0.2), M(NET.x + s * 1.8, 2.8, NET.z - 1.6)); B.add(wood, boxG(3.8, 0.2, 0.2), M(NET.x, 5.6, NET.z - 1.6));
    const netTex = RT.canvasTexture(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = '#d9c28a'; g.lineWidth = 3; for (let k = 0; k <= 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 128); g.moveTo(0, k); g.lineTo(128, k); g.stroke(); } });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2, 8, 8), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 }));
    net.rotation.x = -Math.PI / 2; net.position.set(NET.x, NET.y, NET.z); G.add(net);
    const wire = RT.mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.4, 4), RT.metal('#f0f0f0'), false); wire.rotation.z = Math.PI / 2; wire.position.set(NET.x, 0.25, NET.z); G.add(wire);
    for (const s of [-1, 1]) B.add(scrap, boxG(0.2, 0.5, 0.2), M(NET.x + s * 1.7, 0.25, NET.z));
    // potted trees in the corners and along the walls (so the court feels like a palace garden)
    for (const [px, pz] of [[x0 + 1.4, z1 - 1.4], [x1 - 1.4, z1 - 1.4], [x0 + 1.4, z0 + 1.4], [x1 - 1.4, z0 + 1.4]]) { planter(B, P, px, pz, 1.6, 1.0); Gd.tree('topiary', px, 1.0, pz, 0.95); }
    for (const x of [-6, 0, 6]) { planter(B, P, cx + x, z1 - 1.2, 1.2, 0.7); Gd.flowers(cx + x, z1 - 1.2, 0.9, 0.9, 0.78, 6); }
    B.build(G); Gd.build(G);
    lampGlobes(G, P, lamps);
    // the arrows / sling stones (shown by the episode as needed)
    const arrowM = RT.plastic('#f2efe8'), feather = RT.plastic('#c0262f');
    const arrows = [0, 1, 2, 3, 4, 5].map(() => { const a = new THREE.Group(); a.add(RT.mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), arrowM).rotateX(Math.PI / 2)); const tip = RT.mesh(new THREE.ConeGeometry(0.07, 0.2, 6), RT.metal('#cfd5dd')); tip.rotation.x = Math.PI / 2; tip.position.z = 0.78; a.add(tip); const f = RT.mesh(boxG(0.02, 0.16, 0.3), feather); f.position.z = -0.6; a.add(f); a.visible = false; G.add(a); return a; });
    const stone = RT.mesh(new THREE.SphereGeometry(0.11, 10, 8), RT.plastic('#8a8f96')); stone.visible = false; G.add(stone);
    G.update = (t, u = {}) => {
      ropes.forEach((rp, i) => { rp.rotation.z = Math.sin(t * 0.9 + i) * 0.03; rp.rotation.x = Math.sin(t * 0.7 + i * 2) * 0.02; });
      const drop = u.net || 0;                                                                   // 0 = hanging, 1 = on the ground
      net.position.y = lerp(NET.y, 0.15, drop * drop); net.geometry.attributes.position.needsUpdate = false;
      net.scale.set(1 + drop * 0.15, 1 + drop * 0.15, 1);
      wire.visible = drop < 0.02;
    };
    G.spots = { COURT, seats, dummies, targets, arrows, stone, net, NET, JX, JZ, BAL_Y, BAL_Z, rope: ropes, climb: new THREE.Vector3(cx - 13, 0, z0 + 2.6), rack: new THREE.Vector3(cx - 19.8, 0, cz) };
    return G;
  }

  // =================================================================================
  // 3. THE INTERVIEW (night show). A round stage at (0, 0, 10) facing south (+z); a giant curved screen behind;
  //    two white-and-gold armchairs; spotlights from two gold trusses; audience tiers in a half ring (z 22 … 40).
  // =================================================================================
  function showStage(o = {}) {
    const G = new THREE.Group(); G.name = 'showStage';
    const P = mats(), r = RT.rng(o.seed || 37), B = new Batch(), Gd = Garden(44), lamps = [];
    const SZ = 10, STAGE_Y = 1.2;
    B.add(RT.plastic('#14183a', { roughness: 0.25, metalness: 0.3 }), new THREE.CylinderGeometry(9, 9.4, STAGE_Y, 48), M(0, STAGE_Y / 2, SZ));
    B.add(P.gold, new THREE.TorusGeometry(9.05, 0.12, 6, 64), M(0, STAGE_Y, SZ, Math.PI / 2, 0, 0));
    for (let k = 0; k < 3; k++) B.add(RT.plastic('#1b2048', { roughness: 0.3 }), boxG(6, STAGE_Y * (3 - k) / 3, 0.9), M(0, (STAGE_Y * (3 - k) / 3) / 2, SZ + 9.2 + k * 0.9));
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(9.42, 0.08, 6, 64), new THREE.MeshBasicMaterial({ color: '#7fd8ff' })); ledRing.rotation.x = Math.PI / 2; ledRing.position.set(0, 0.2, SZ); G.add(ledRing);
    // the two chairs (host left, guest right as seen from the audience)
    const chairM = RT.plastic('#f6f3ee', { roughness: 0.4 }), chairs = [];
    for (const s of [-1, 1]) {
      const c = new THREE.Group(); c.position.set(s * 2.4, STAGE_Y, SZ + 0.5); c.rotation.y = -s * 0.5; G.add(c);
      c.add(RT.mesh(boxG(1.6, 0.6, 1.5, 0.15), chairM).translateY(0.55)); c.add(RT.mesh(boxG(1.6, 1.7, 0.35, 0.12), chairM).translateY(1.25).translateZ(-0.6));
      for (const t of [-1, 1]) c.add(RT.mesh(boxG(0.28, 0.5, 1.4, 0.08), chairM).translateX(t * 0.78).translateY(1.0));
      c.add(RT.mesh(boxG(1.7, 0.08, 1.6), P.gold).translateY(0.24));
      chairs.push(c);
    }
    B.add(P.gold, new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), M(0, STAGE_Y + 0.7, SZ + 0.9)); B.add(P.gold, new THREE.CylinderGeometry(0.06, 0.1, 0.7, 8), M(0, STAGE_Y + 0.35, SZ + 0.9));   // little table
    // the giant curved screen
    const scrCanvas = RT.canvas(1024, 512), scrTex = new THREE.CanvasTexture(scrCanvas);
    const screen = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 9, 40, 1, true, Math.PI - 0.62, 1.24), new THREE.MeshBasicMaterial({ map: scrTex, side: THREE.BackSide, toneMapped: false }));
    screen.position.set(0, STAGE_Y + 6.2, SZ + 14); screen.scale.x = -1; G.add(screen);
    const rimM = new THREE.MeshStandardMaterial({ color: '#e2b54a', metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide });
    for (const y of [STAGE_Y + 10.8, STAGE_Y + 1.6]) { const rim = new THREE.Mesh(new THREE.CylinderGeometry(20.05, 20.05, 0.5, 40, 1, true, Math.PI - 0.64, 1.28), rimM); rim.position.set(0, y, SZ + 14); G.add(rim); }
    function paintScreen(title, sub, hue = '#ffd23f') {
      const g = scrCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 1024, 512);
      gr.addColorStop(0, '#1a1050'); gr.addColorStop(0.5, '#3a1e8a'); gr.addColorStop(1, '#0d2a6a'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
      g.globalAlpha = 0.25; for (let k = 0; k < 24; k++) { g.fillStyle = k % 2 ? '#ffffff' : hue; g.beginPath(); g.arc((k * 97) % 1024, (k * 61) % 512, 20 + (k % 5) * 14, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
      g.fillStyle = hue; g.beginPath(); g.moveTo(456, 150); g.lineTo(472, 96); g.lineTo(492, 126); g.lineTo(512, 84); g.lineTo(532, 126); g.lineTo(552, 96); g.lineTo(568, 150); g.closePath(); g.fill();
      g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = '900 92px Montserrat, Arial Black, sans-serif'; g.fillText(title, 512, 270);
      g.font = '800 46px Montserrat, Arial Black, sans-serif'; g.fillStyle = hue; g.fillText(sub, 512, 340);
      g.fillStyle = '#ff2a3a'; g.beginPath(); g.arc(860, 70, 14, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = '800 34px Montserrat, Arial Black, sans-serif'; g.textAlign = 'left'; g.fillText('LIVE', 884, 82);
      scrTex.needsUpdate = true;
    }
    paintScreen('THE REAPING TRIALS', 'THE INTERVIEWS');
    // trusses with spotlight cans and visible beams (additive cones)
    const beamM = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beams = [];
    for (const s of [-1, 1]) {
      const tx = s * 12;
      B.add(P.goldDark, boxG(0.6, 16, 0.6), M(tx, 8, SZ + 4)); B.add(P.goldDark, boxG(0.6, 0.6, 14), M(tx, 16, SZ - 2));
      for (let k = 0; k < 3; k++) {
        const lz = SZ - 6 + k * 4; B.add(RT.plastic('#22252c'), new THREE.CylinderGeometry(0.4, 0.55, 0.9, 12), M(tx, 15.3, lz));
        const len = 17, beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, len, 24, 1, true), beamM); beam.geometry.translate(0, -len / 2, 0);
        beam.position.set(tx, 15.0, lz); beam.lookAt(new THREE.Vector3(s * 1.5, 0, SZ + 0.5)); beam.rotateX(-Math.PI / 2); beam.renderOrder = 6; G.add(beam); beams.push(beam);
      }
    }
    const spot = new THREE.SpotLight('#fff4dc', 1.1, 60, 0.5, 0.6, 1.2); spot.position.set(0, 18, SZ - 8); spot.target.position.set(0, STAGE_Y, SZ + 0.5); G.add(spot, spot.target);
    // audience tiers: a half ring of white steps (z grows toward the camera side), people from the Capital
    const tiers = 7, spots = [];
    for (let k = 0; k < tiers; k++) {
      const R = 13 + k * 1.6, y = k * 0.55, a0 = -1.15, a1 = 1.15;
      const sh = new THREE.Shape(), Ro = R + 0.8, Ri = R - 0.8;                                  // a solid curved step: ring sector from the ground up to the seat
      for (let i = 0; i <= 24; i++) { const a = lerp(a0, a1, i / 24); i ? sh.lineTo(Math.sin(a) * Ro, -Math.cos(a) * Ro) : sh.moveTo(Math.sin(a) * Ro, -Math.cos(a) * Ro); }
      for (let i = 24; i >= 0; i--) { const a = lerp(a0, a1, i / 24); sh.lineTo(Math.sin(a) * Ri, -Math.cos(a) * Ri); }
      const ring = new THREE.ExtrudeGeometry(sh, { depth: y + 0.55, bevelEnabled: false, curveSegments: 1 }); ring.rotateX(-Math.PI / 2); ring.translate(0, 0, SZ);
      B.add(k % 2 ? P.stone : P.cream, ring, M(0, 0, 0));
      for (let a = a0 + 0.06; a < a1 - 0.04; a += 1.25 / R) { const x = Math.sin(a) * (R + 0.4), z = SZ + Math.cos(a) * (R + 0.4); if (Math.abs(x) < 3.6 && k < 3) continue; spots.push([x, z, Math.atan2(-x, SZ - z), y + 0.55]); }
    }
    const crowd = RT.characters.crowd({ spots: spots.map((s) => s.slice(0, 3)), seed: 19, palette: 'capital', faces: ['happy', 'neutral', 'happy', 'happy'], kidRatio: 0.05 });
    crowd.people.forEach((p, i) => { p.y = spots[i][3]; });
    G.add(crowd);
    // tv cameras on tripods at the front of the audience
    const camBody = RT.plastic('#1c1f26', { roughness: 0.4 }), cams = [];
    for (const [x, z] of [[-5.6, SZ + 9.8], [5.2, SZ + 10.2]]) {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.lookAt(0, 0, SZ); G.add(c);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; c.add(RT.mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), camBody).translateX(Math.sin(a) * 0.4).translateZ(Math.cos(a) * 0.4).translateY(0.85)); }
      const body = RT.mesh(boxG(0.7, 0.8, 1.5, 0.1), camBody); body.position.y = 2.0; c.add(body);
      const lens = RT.mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.6, 16), RT.plastic('#0c0d10')); lens.rotation.x = Math.PI / 2; lens.position.set(0, 2.0, 0.95); c.add(lens);
      const tally = RT.mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a3a' })); tally.position.set(0, 2.5, 0.5); c.add(tally);
      cams.push(c);
    }
    B.build(G); Gd.build(G);
    G.update = (t, u = {}) => {
      crowd.update(t, { lookAt: u.lookAt || new THREE.Vector3(0, 2, SZ), cheer: u.cheer || 0 });
      ledRing.material.color.setHSL((t * 0.08) % 1, 0.8, 0.7);
      beams.forEach((b, i) => { b.material.opacity = 0.18 + 0.04 * Math.sin(t * 1.3 + i); });
      if (u.screen && u.screen !== G._scr) { G._scr = u.screen; paintScreen(...u.screen); }
    };
    G.spots = { SZ, STAGE_Y, chairs, crowd, screen, cams, paintScreen, tierY: spots.map((s) => s[3]) };
    return G;
  }

  // =================================================================================
  // 4. THE ROOFTOP (night): a terrace on the tributes' tower, 120 units up, looking over the lit city.
  //    Terrace floor at y = ROOF_Y, centered at (0, ROOF_Y, 22), 18 × 14.
  // =================================================================================
  const ROOF_Y = 120;
  function rooftop(o = {}) {
    const G = new THREE.Group(); G.name = 'rooftop';
    const P = mats(), r = RT.rng(o.seed || 53), B = new Batch(), Gd = Garden(57), lamps = [];
    const cx = 0, cz = 22, W = 18, D = 14, Y = ROOF_Y;
    // the tower under the terrace (so it stands in the city), and the terrace deck
    B.add(P.glassChamp, wallBox(W + 6, Y, D + 6, P.TW, P.TH), M(cx, Y / 2, cz - 3));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(P.stone, boxG(1.4, Y, 1.4), M(cx + sx * (W + 6) / 2, Y / 2, cz - 3 + sz * (D + 6) / 2));
    const deckTex = RT.canvasTexture(128, 128, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#b98a5c' : '#c4956a'; g.fillRect(0, k * 16, 128, 16); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, k * 16 + 15, 128, 1); g.fillRect((k * 37) % 128, k * 16, 1, 16); } });
    deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping; deckTex.repeat.set(W / 4, D / 4);
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.6 })); deck.rotation.x = -Math.PI / 2; deck.position.set(cx, Y + 0.02, cz); deck.receiveShadow = true; G.add(deck);
    B.add(P.stone, boxG(W + 6.4, 0.6, D + 6.4), M(cx, Y - 0.3, cz - 3));
    // glass railing with a gold top rail on three sides (open toward the city: south +z, east, west)
    const railGlass = new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
    for (const [x, z, w, d] of [[cx, cz + D / 2, W, 0.08], [cx - W / 2, cz, 0.08, D], [cx + W / 2, cz, 0.08, D]]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), railGlass); pane.position.set(x, Y + 0.6, z); pane.renderOrder = 3; G.add(pane);
      B.add(P.gold, boxG(w + 0.1, 0.1, d + 0.1), M(x, Y + 1.2, z));
    }
    // the back wall (north) with a glass door to the suites, planters, a bench
    B.add(P.stone, boxG(W, 4.5, 0.6), M(cx, Y + 2.25, cz - D / 2)); B.add(P.darkGlass, boxG(3, 3, 0.1), M(cx - 3, Y + 1.5, cz - D / 2 + 0.32)); B.add(P.gold, boxG(3.3, 0.15, 0.15), M(cx - 3, Y + 3.05, cz - D / 2 + 0.36));
    const T = new THREE.Group(); T.position.y = Y; G.add(T);                                     // terrace furniture (built at deck level)
    const BT = new Batch();
    for (const x of [-7.5, 7.5]) { planter(BT, P, cx + x, cz - D / 2 + 1.2, 1.5, 0.9); Gd.tree('ball', cx + x, 0.9, cz - D / 2 + 1.2, 0.75); }
    for (const x of [-7.6, 7.6]) for (const z of [-2, 2]) { planter(BT, P, cx + x, cz + z, 1.0, 0.6); Gd.flowers(cx + x, cz + z, 0.8, 0.8, 0.68, 7); }
    bench(BT, P, cx + 3.5, cz - 4.6, 0);
    B.build(G); BT.build(T); Gd.build(T);
    // string lights across the terrace
    const bulbs = [];
    for (let k = 0; k < 3; k++) { const z = cz - 4 + k * 4; for (let i = 0; i <= 14; i++) { const x = cx - W / 2 + (i / 14) * W, sag = Math.sin((i / 14) * Math.PI) * 0.9; bulbs.push([x, Y + 4.2 - sag, z]); } }
    const bulbM = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), bulbM, bulbs.length), dm = new THREE.Object3D();
    bulbs.forEach((b, i) => { dm.position.set(b[0], b[1], b[2]); dm.updateMatrix(); bm.setMatrixAt(i, dm.matrix); }); G.add(bm);
    const warm = new THREE.PointLight('#ffcf80', 1.1, 18, 1.6); warm.position.set(cx, Y + 3.6, cz); G.add(warm);
    G.update = () => {};
    G.spots = { Y, cx, cz, W, D };
    return G;
  }

  RT.capital = { MOODS, mats, Garden, skyline, station, trainingCourt, showStage, rooftop, TRACK_Z, COURT, ROOF_Y };
})();
