// =====================================================================================
// arena7.js: THE ARENA of Episode 3: a perfect copy of Sector 7 under a glowing dome.
// A poor farming town that is tidy and cared for: weathered plank houses with rusty corrugated roofs, small porches,
// clotheslines, rain barrels, vegetable beds, wooden fences along dirt roads; an old open barn; a farm windmill; a silo;
// wooden power poles; a wooden bell tower in the dirt square; and a wheat field that runs to the horizon.
//
//   const A7 = RT.arena7.build();  scene.add(A7);
//   A7.update(t, { roads: 0..1 (red glow when the bell rings), bell: seconds since the bell started, rise: 0..1 (platforms),
//                  night: 0..1, houseLight: 0..1, netT: seconds since the barn trap sprang (−1 = armed) })
//   A7.spots: SQUARE, PLATFORMS[8], PILE, BELL, FIELD, DITCH, FARM_ROAD, BARN, BARN_WIRE, HOUSE (Rhea's), WINDOW, roads, ground(x, z)
// Moods: RT.arena7.MOODS.day / sunset / night.  World units: a person ≈ 2.4 tall.
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
      build(group, shadows = true) { for (const k in b) group.add(RT.mesh(RT.mergeGeometries(b[k].items), b[k].mat, shadows)); },
    };
  }
  // a box whose texture repeats every cw × ch units on its sides (planks keep their size on any wall)
  function wallBox(w, h, d, cw, ch) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / cw, uv.getY(i) * dims[f][1] / ch); }
    return g;
  }

  const MOODS = {
    day: { top: '#3d7fd8', horizon: '#d9ecff', sunCol: '#fff0c8', sunDir: [-0.45, 0.55, 0.6], sunDisc: 1,
      fog: '#dbe9f2', fogNear: 160, fogFar: 1300, hemiSky: '#d0e4ff', hemiGround: '#a08a5a', hemi: 0.72,
      sun: '#fff1d8', sunI: 1.75, fill: '#e0ecff', fillI: 0.42, exposure: 1.0 },
    sunset: { top: '#4a5f9e', horizon: '#ffb070', sunCol: '#ff9a52', sunDir: [-0.75, 0.13, 0.55], sunDisc: 1,
      fog: '#f0a878', fogNear: 120, fogFar: 1000, hemiSky: '#ffc8a0', hemiGround: '#6a4a30', hemi: 0.7,
      sun: '#ffb070', sunI: 1.7, fill: '#ffd0b0', fillI: 0.4, exposure: 1.05 },
    night: { top: '#050b24', horizon: '#1b2c58', sunCol: '#9fb8ff', sunDir: [0.45, 0.42, -0.55], sunDisc: 0.55, moon: 1,
      fog: '#0c1630', fogNear: 60, fogFar: 600, hemiSky: '#5a72b8', hemiGround: '#1a2030', hemi: 0.9,
      sun: '#a8bdff', sunI: 0.8, fill: '#7f95d8', fillI: 0.4, exposure: 1.3 },
  };

  // =================================================================================
  // TEXTURES (canvas): planks, corrugated roof, dirt road, wheat card
  // =================================================================================
  const TEX = {};
  function textures() {
    if (TEX.ready) return TEX;
    const r = RT.rng(71);
    // weathered horizontal planks (grey base; the house colour tints it through the material colour)
    TEX.planks = RT.canvasTexture(128, 128, (g) => {
      for (let k = 0; k < 8; k++) {
        const v = 200 + (r() * 40) | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(0, k * 16, 128, 16);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, k * 16 + 14, 128, 2);                                 // gap between boards
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, k * 16, 128, 2);
        for (let n = 0; n < 6; n++) { g.fillStyle = `rgba(60,40,20,${0.05 + r() * 0.08})`; g.fillRect(r() * 128, k * 16 + 3 + r() * 9, 8 + r() * 30, 1); }   // grain
        const j = (r() * 128) | 0; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(j, k * 16, 2, 14);              // butt joint
        if (r() < 0.5) { g.fillStyle = 'rgba(90,90,90,0.6)'; g.fillRect(j - 5, k * 16 + 4, 2, 2); g.fillRect(j + 5, k * 16 + 9, 2, 2); }   // nails
      }
      g.fillStyle = 'rgba(120,100,80,0.10)'; for (let n = 0; n < 40; n++) g.fillRect(r() * 128, r() * 128, 3 + r() * 10, 3 + r() * 10);   // stains
    });
    TEX.planks.wrapS = TEX.planks.wrapT = THREE.RepeatWrapping;
    // corrugated metal roof: ridges + rust streaks + one odd patched sheet
    TEX.roof = RT.canvasTexture(128, 128, (g) => {
      for (let x = 0; x < 128; x++) { const s = 0.5 + 0.5 * Math.sin((x / 128) * Math.PI * 2 * 10); const v = (150 + s * 70) | 0; g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(x, 0, 1, 128); }
      for (let n = 0; n < 26; n++) { const x = r() * 128, w = 2 + r() * 8; const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(150,70,20,0.0)'); gr.addColorStop(0.3 + r() * 0.5, `rgba(150,70,25,${0.25 + r() * 0.35})`); gr.addColorStop(1, 'rgba(120,60,20,0.1)'); g.fillStyle = gr; g.fillRect(x, 0, w, 128); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 62, 128, 2);
    });
    TEX.roof.wrapS = TEX.roof.wrapT = THREE.RepeatWrapping;
    // dirt (roads, square): tyre ruts, pebbles
    TEX.dirt = RT.canvasTexture(128, 128, (g) => {
      g.fillStyle = '#b08a58'; g.fillRect(0, 0, 128, 128);
      for (let n = 0; n < 700; n++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,60,30' : '230,205,160'},${0.06 + r() * 0.1})`; g.fillRect(r() * 128, r() * 128, 1 + r() * 4, 1 + r() * 3); }
      g.fillStyle = 'rgba(80,55,30,0.18)'; g.fillRect(30, 0, 9, 128); g.fillRect(88, 0, 9, 128);
    });
    TEX.dirt.wrapS = TEX.dirt.wrapT = THREE.RepeatWrapping;
    // one wheat card: ~11 stalks with heavy golden heads and a few leaves (alpha)
    TEX.wheat = RT.canvasTexture(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      for (let k = 0; k < 11; k++) {
        const x = 8 + k * 11 + (r() - 0.5) * 6, top = 14 + r() * 22, lean = (r() - 0.5) * 10;
        g.strokeStyle = `rgb(${190 + r() * 30 | 0},${150 + r() * 25 | 0},${60 + r() * 20 | 0})`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + lean * 0.3, 70, x + lean, top + 18); g.stroke();
        g.fillStyle = `rgb(${225 + r() * 25 | 0},${180 + r() * 30 | 0},${80 + r() * 30 | 0})`;
        for (let s = 0; s < 6; s++) { g.beginPath(); g.ellipse(x + lean + (s % 2 ? 2.2 : -2.2), top + s * 3.4, 2.6, 3.6, s % 2 ? 0.5 : -0.5, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = 'rgba(240,210,120,0.9)'; g.lineWidth = 0.8; for (let s = 0; s < 5; s++) { g.beginPath(); g.moveTo(x + lean, top + s * 3); g.lineTo(x + lean + (s % 2 ? 6 : -6), top + s * 3 - 7); g.stroke(); }   // awns
        if (r() < 0.6) { g.strokeStyle = 'rgba(170,150,70,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 110); g.quadraticCurveTo(x + 10, 96, x + 14, 104); g.stroke(); }
      }
    });
    TEX.ready = true; return TEX;
  }

  // =================================================================================
  // A LOW-INCOME HOUSE (into Batches): raised on blocks, plank walls, corrugated roof, porch, stove pipe; tidy yard
  // =================================================================================
  const HOUSE_COLS = ['#8fa9c0', '#a7bb8c', '#d6bd82', '#d3cbb4', '#a88a6a', '#c48f7c', '#9fb0a6'];   // faded blue, green, yellow, whitewash, bare wood, faded red, sage
  function house(B, P, x, z, yaw, o = {}) {
    const w = o.w || 6.4, d = o.d || 5.4, h = o.h || 3.0, lift = 0.45, k = o.k || 0, wallM = P.walls[k % P.walls.length];
    const T = (lx, ly, lz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().makeRotationY(yaw).multiply(M(lx, ly, lz, rx, ry, rz)).premultiply(new THREE.Matrix4().makeTranslation(x, 0, z));
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) B.add(P.block, boxG(0.5, lift, 0.5), T(sx * (w / 2 - 0.3), lift / 2, sz * (d / 2 - 0.3)));   // piers
    B.add(P.dark, boxG(w - 0.2, 0.25, d - 0.2), T(0, lift - 0.1, 0));
    B.add(wallM, wallBox(w, h, d, 3.4, 3.4), T(0, lift + h / 2, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(P.trimWood, boxG(0.22, h, 0.22), T(sx * (w / 2 + 0.02), lift + h / 2, sz * (d / 2 + 0.02)));   // corner boards
    // gable roof of corrugated sheets with an overhang (front faces +z)
    const rh = 1.5, run = d / 2 + 0.5, slope = Math.atan2(rh, run), sl = Math.hypot(rh, run);
    for (const s of [-1, 1]) B.add(P.roofM, wallBox(w + 0.9, 0.12, sl + 0.1, 1.6, 1.6), T(0, lift + h + rh / 2, s * run / 2, s * slope, 0, 0));
    const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rh - 0.05)]);
    const gable = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }); gable.translate(0, 0, -0.06);
    for (const s of [-1, 1]) B.add(wallM, gable, T(s * (w / 2 - 0.05), lift + h, 0, 0, Math.PI / 2, 0));
    B.add(P.roofDark, boxG(w + 1.0, 0.18, 0.25), T(0, lift + h + rh, 0));                                  // ridge cap
    // front: door, two windows (one curtained, maybe one boarded), porch with posts, steps
    B.add(P.door, boxG(1.0, 2.0, 0.1), T(-w * 0.18, lift + 1.0, d / 2 + 0.04));
    B.add(P.trimWood, boxG(1.2, 0.14, 0.14), T(-w * 0.18, lift + 2.07, d / 2 + 0.07));
    B.add(P.knob, new THREE.SphereGeometry(0.06, 8, 6), T(-w * 0.18 + 0.35, lift + 1.0, d / 2 + 0.11));
    const winX = [w * 0.22, -w * 0.38];
    winX.forEach((wx, i) => {
      if (wx < -w / 2 + 0.6) return;
      B.add(P.glass, boxG(0.95, 0.85, 0.06), T(wx, lift + 1.75, d / 2 + 0.04));
      B.add(P.trimWood, boxG(1.15, 0.12, 0.14), T(wx, lift + 2.24, d / 2 + 0.08)); B.add(P.trimWood, boxG(1.15, 0.12, 0.18), T(wx, lift + 1.27, d / 2 + 0.1));
      B.add(P.trimWood, boxG(0.08, 0.85, 0.08), T(wx, lift + 1.75, d / 2 + 0.08));
      if ((k + i) % 3 === 0) B.add(P.curtain[(k + i) % P.curtain.length], boxG(0.42, 0.7, 0.02), T(wx - 0.24, lift + 1.78, d / 2 + 0.02));
      if (o.boarded && i === 0) for (const a of [-0.6, 0.6]) B.add(P.oldWood, boxG(1.25, 0.16, 0.06), T(wx, lift + 1.75, d / 2 + 0.12, 0, 0, a));
    });
    B.add(P.glass, boxG(0.06, 0.8, 0.85), T(w / 2 + 0.04, lift + 1.75, 0)); B.add(P.trimWood, boxG(0.12, 0.1, 1.05), T(w / 2 + 0.08, lift + 1.3, 0));   // side window
    const pd = 1.6;                                                                                           // porch
    B.add(P.deck, boxG(w * 0.62, 0.15, pd), T(-w * 0.05, lift - 0.02, d / 2 + pd / 2));
    for (const sx of [-1, 1]) B.add(P.trimWood, boxG(0.16, 2.2, 0.16), T(-w * 0.05 + sx * w * 0.29, lift + 1.1, d / 2 + pd - 0.12));
    B.add(P.roofM, wallBox(w * 0.66, 0.1, pd + 0.4, 1.6, 1.6), T(-w * 0.05, lift + 2.3, d / 2 + pd / 2, 0.25, 0, 0));
    for (let s = 0; s < 2; s++) B.add(P.deck, boxG(1.2, 0.15, 0.4), T(-w * 0.18, (lift - 0.05) * (1 - (s + 1) / 3) + 0.05, d / 2 + pd + 0.2 + s * 0.4));
    // stove pipe (or a stone chimney)
    if (k % 2) { B.add(P.pipe, new THREE.CylinderGeometry(0.14, 0.14, 2.2, 10), T(w * 0.28, lift + h + 1.0, -d * 0.18)); B.add(P.pipe, new THREE.ConeGeometry(0.3, 0.25, 10), T(w * 0.28, lift + h + 2.2, -d * 0.18)); }
    else B.add(P.block, boxG(0.7, 2.6, 0.7), T(-w * 0.3, lift + h + 0.6, -d * 0.2));
    // the yard: rain barrel, firewood, clothesline, a vegetable bed, a low fence with a gate
    B.add(P.barrel, new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), T(w / 2 + 0.5, 0.5, d / 2 - 0.4));
    B.add(P.pipe, boxG(0.08, h, 0.08), T(w / 2 + 0.5, lift + h / 2 + 0.3, d / 2 - 0.4));
    for (let i = 0; i < 9; i++) B.add(P.log, new THREE.CylinderGeometry(0.16, 0.16, 1.0, 7), T(-w / 2 - 0.55, 0.17 + Math.floor(i / 3) * 0.3, -d * 0.2 + (i % 3) * 0.33 - 0.3, 0, 0, Math.PI / 2));
    if (o.yard !== false) {
      const fz = d / 2 + pd + 3.4, fw = w + 4;
      for (let i = 0; i <= Math.round(fw / 0.45); i++) { const fx = -fw / 2 + i * 0.45; if (Math.abs(fx + w * 0.18) < 0.8) continue; if (((i * 7 + k) % 23) === 0) continue; B.add(P.picket, boxG(0.14, 0.95, 0.06), T(fx, 0.47, fz)); }
      for (const y of [0.3, 0.75]) B.add(P.picket, boxG(fw, 0.08, 0.05), T(0, y, fz - 0.05));
      B.add(P.soil, boxG(2.6, 0.18, 1.4), T(w * 0.25 + 0.2, 0.09, d / 2 + pd + 1.6));
      for (let i = 0; i < 10; i++) B.add(P.sprout, boxG(0.22, 0.28, 0.22), T(w * 0.25 - 0.8 + (i % 5) * 0.5, 0.3, d / 2 + pd + 1.25 + Math.floor(i / 5) * 0.6, 0, i, 0));
      if (k % 3 !== 2) {                                                                               // clothesline with laundry
        const cx = -w / 2 - 2.0;
        for (const s of [-1, 1]) B.add(P.oldWood, boxG(0.12, 2.1, 0.12), T(cx, 1.05, s * 2.2));
        B.add(P.line, boxG(0.02, 0.02, 4.4), T(cx, 2.0, 0));
        const cloth = [P.cloth[0], P.cloth[1], P.cloth[2], P.cloth[(k + 1) % 4]];
        cloth.forEach((cm, i) => B.add(cm, boxG(0.04, 0.7 + (i % 2) * 0.2, 0.75), T(cx, 1.58 - (i % 2) * 0.1, -1.5 + i * 1.0)));
      }
    }
  }

  // =================================================================================
  // THE ARENA
  // =================================================================================
  function build(o = {}) {
    const G = new THREE.Group(); G.name = 'arena7';
    const X = textures(), r = RT.rng(o.seed || 707), dm = new THREE.Object3D();
    const SQUARE = new THREE.Vector3(0, 0, 0), FIELD = { x0: -95, x1: 34, z0: 17, z1: 190 };              // the square at the origin; the wheat field south of it
    const pl = (c, rep = 1) => { const t = X.planks.clone(); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, color: c, roughness: 0.85 }); };
    const P = {
      walls: HOUSE_COLS.map((c) => pl(c)), trimWood: RT.plastic('#e9e2d2', { roughness: 0.8 }), oldWood: RT.plastic('#8a7458', { roughness: 0.9 }), deck: pl('#a88a66'),
      roofM: new THREE.MeshStandardMaterial({ map: X.roof, color: '#c7c3bb', roughness: 0.55, metalness: 0.35 }), roofDark: RT.plastic('#6d5a48', { roughness: 0.7 }),
      door: pl('#7d5a3c'), knob: RT.metal('#c9a64a'), glass: RT.plastic('#2c3a46', { roughness: 0.15, metalness: 0.3 }), dark: RT.plastic('#4a3e34', { roughness: 0.9 }), block: RT.plastic('#9a958c', { roughness: 0.95 }),
      pipe: RT.metal('#5d5a56', { roughness: 0.5 }), barrel: pl('#6f5238'), log: RT.plastic('#7b5a3a', { roughness: 0.9 }), picket: pl('#d6cdb8'), soil: RT.plastic('#5e4128', { roughness: 0.95 }),
      sprout: RT.plastic('#5aa83c', { roughness: 0.8 }), line: RT.plastic('#e8e2d4'), cloth: ['#d9d4c8', '#7ea0c4', '#c47a6a', '#e6d27a'].map((c) => RT.plastic(c, { roughness: 0.8, side: THREE.DoubleSide })),
      curtain: ['#d8c06a', '#c47a6a', '#e8e0d0'].map((c) => RT.plastic(c, { roughness: 0.8 })),
    };
    // ground: grass meadow (a few gentle hills far away), golden soil under the wheat, dirt roads and square
    const hillH = (x, z) => { const d = Math.hypot(x, z); return smooth(230, 520, d) * (Math.sin(x * 0.009) * 14 + Math.cos(z * 0.011) * 16 + 22) + Math.sin(x * 0.07) * Math.cos(z * 0.06) * 0.15 * smooth(30, 120, d); };
    const tg = new THREE.PlaneGeometry(2400, 2400, 160, 160); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position, col = new Float32Array(tp.count * 3), c = new THREE.Color();
    const grass = new THREE.Color('#6fb24a'), grass2 = new THREE.Color('#8fbf52'), dark = new THREE.Color('#4a8a3a'), gold = new THREE.Color('#d6aa4c');
    const inField = (x, z) => x > FIELD.x0 - 2 && x < FIELD.x1 + 2 && z > FIELD.z0 - 2 && z < FIELD.z1 + 2;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), h = hillH(x, z); tp.setY(i, h);
      c.copy(grass).lerp(grass2, 0.5 + 0.5 * Math.sin(x * 0.03 + Math.cos(z * 0.025) * 2)).lerp(dark, clamp((h - 10) / 40, 0, 1));
      if (inField(x, z)) { c.lerp(gold, 0.92); c.offsetHSL(0, 0.05, (Math.sin(x * 0.9) * 0.5 + 0.5) * 0.06 - 0.03); }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; G.add(terrain);
    const ground = (x, z) => hillH(x, z);
    // ---- roads (dirt strips that glow red when the bell rings) ----
    const B = new Batch(), roads = [];
    const roadM = new THREE.MeshStandardMaterial({ map: X.dirt, roughness: 0.95, emissive: '#ff1408', emissiveIntensity: 0 });
    // the red glow spreads out along the roads from the bell (radius uSweep), so people can see it coming
    const sweepU = { value: 0 }, bellU = { value: new THREE.Vector2(11, -12.5) };
    roadM.onBeforeCompile = (sh) => { sh.uniforms.uSweep = sweepU; sh.uniforms.uBell = bellU;
      sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uSweep; uniform vec2 uBell; varying vec3 vWPos;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float dB = distance(vWPos.xz, uBell); float gk = (1.0 - smoothstep(uSweep - 10.0, uSweep, dB)) * (0.8 + 0.2 * sin(dB * 0.6 - uSweep * 0.6)); totalEmissiveRadiance *= gk; float gg = clamp(emissive.r * gk * 0.6, 0.0, 1.0); diffuseColor.rgb *= vec3(1.0 - 0.25 * gg, 1.0 - 0.8 * gg, 1.0 - 0.8 * gg);'); };
    const road = (x0, z0, x1, z1, wdt = 4.2) => {
      const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), t = X.dirt.clone(); t.needsUpdate = true; t.repeat.set(1, L / 6);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, L), roadM); m.rotation.set(-Math.PI / 2, 0, -ang); m.position.set((x0 + x1) / 2, 0.035, (z0 + z1) / 2); m.receiveShadow = true; G.add(m);
      roads.push({ x0, z0, x1, z1, w: wdt });
    };
    // town layout: the square at the origin; Main Road east–west through it (z = −6); North Lane; the Farm Road south along the field's east edge
    road(-170, -6, 170, -6, 4.6); road(0, -6, 0, -150, 4.0); road(38, -6, 38, 200, 4.0); road(-100, -6, -100, 120, 3.6);
    const sq = new THREE.Mesh(new THREE.CircleGeometry(15, 40), roadM); sq.rotation.x = -Math.PI / 2; sq.position.set(0, 0.03, 0); sq.receiveShadow = true; G.add(sq);
    roads.push({ circle: true, x: 0, z: 0, r: 15 });
    const onRoad = (x, z) => roads.some((rd) => rd.circle ? Math.hypot(x - rd.x, z - rd.z) < rd.r : (() => { const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0, L2 = dx * dx + dz * dz, k = clamp(((x - rd.x0) * dx + (z - rd.z0) * dz) / L2, 0, 1), px = rd.x0 + dx * k, pz = rd.z0 + dz * k; return Math.hypot(x - px, z - pz) < rd.w / 2; })());
    // ---- the houses: neat rows along Main Road and North Lane, facing the road ----
    const houses = [];
    const row = (axis, along0, along1, step, side, off) => {
      for (let a = along0; a <= along1; a += step) {
        const x = axis === 'x' ? a : off * side, z = axis === 'x' ? -6 + off * side : a, yaw = axis === 'x' ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
        if (Math.hypot(x, z) < 26) continue;
        if (axis === 'x' && side > 0 && x > FIELD.x0 - 6 && x < FIELD.x1 + 8) continue;               // the field side of Main Road stays open
        const k = houses.length;
        house(B, P, x, z, yaw, { k, w: 6 + (k % 3) * 0.6, d: 5.2 + (k % 2) * 0.5, h: 2.9 + (k % 4) * 0.1, boarded: k % 5 === 3 });
        houses.push({ x, z, yaw });
      }
    };
    row('x', -160, 160, 17, -1, 12.5); row('x', -160, 160, 17, 1, 12.5); row('z', -140, -30, 17, -1, 12); row('z', -140, -30, 17, 1, 12);
    // Rhea's house: alone on the far (east) side of the field, beside the Farm Road; its window is the light at night
    const HOUSE = new THREE.Vector3(50, 0, 118), HOUSE_YAW = -Math.PI / 2;
    house(B, P, HOUSE.x, HOUSE.z, HOUSE_YAW, { k: 3, w: 6.4, d: 5.6, h: 3.0 });
    const WINDOW = new THREE.Vector3(HOUSE.x - 5.6 / 2 - 0.08, 0.45 + 1.75, HOUSE.z + 6.4 * 0.22);   // the front window that lights up (faces the field, −x)
    // ---- power poles with sagging wires along Main Road ----
    const poleM = RT.plastic('#6e5640', { roughness: 0.9 }), wireM = RT.plastic('#2a2a2a');
    const poles = []; for (let x = -160; x <= 160; x += 22) poles.push([x, -6 - 3.2]);
    poles.forEach(([x, z], i) => {
      B.add(poleM, new THREE.CylinderGeometry(0.16, 0.2, 7.5, 8), M(x, 3.75, z)); B.add(poleM, boxG(1.8, 0.14, 0.14), M(x, 7.0, z));
      if (i < poles.length - 1) { const [x2] = poles[i + 1]; for (const off of [-0.7, 0.7]) for (let s = 0; s < 8; s++) { const a = s / 8, b = (s + 1) / 8, ya = 6.95 - Math.sin(a * Math.PI) * 0.8, yb = 6.95 - Math.sin(b * Math.PI) * 0.8;
        const xa = lerp(x, x2, a), xb = lerp(x, x2, b), L = Math.hypot(xb - xa, yb - ya); B.add(wireM, boxG(L, 0.035, 0.035), M((xa + xb) / 2, (ya + yb) / 2, z + off, 0, 0, Math.atan2(yb - ya, xb - xa))); } }
    });
    // ---- fences around the field (old split rails), the DITCH along the east fence by the Farm Road ----
    const railM = RT.plastic('#8f7556', { roughness: 0.9 });
    const fence = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.6)), ang = Math.atan2(x1 - x0, z1 - z0), L = Math.hypot(x1 - x0, z1 - z0) / n;
      for (let k = 0; k <= n; k++) { const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n); B.add(railM, boxG(0.2, 1.25, 0.2), M(x, 0.62, z, 0, 0, (RT.hash(k + x) - 0.5) * 0.08)); }
      for (const y of [0.55, 1.0]) for (let k = 0; k < n; k++) { const x = lerp(x0, x1, (k + 0.5) / n), z = lerp(z0, z1, (k + 0.5) / n); B.add(railM, boxG(0.12, 0.12, L + 0.15), M(x, y + (RT.hash(k * 3 + y) - 0.5) * 0.06, z, 0, ang, 0)); } };
    fence(FIELD.x0, FIELD.z0, -6, FIELD.z0); fence(10, FIELD.z0, FIELD.x1, FIELD.z0); fence(FIELD.x1, FIELD.z0, FIELD.x1, 47.5); fence(FIELD.x1, 58.5, FIELD.x1, FIELD.z1);   // (open gaps: where the square meets the field, and a broken stretch by the ditch)
    const DITCH = { x: 35.6, z0: 30, z1: 90 };                                                    // a shallow drainage ditch between the fence and the Farm Road
    const ditchM = RT.plastic('#7a6040', { roughness: 0.95 });
    B.add(ditchM, boxG(1.4, 0.06, DITCH.z1 - DITCH.z0), M(DITCH.x, -0.35, (DITCH.z0 + DITCH.z1) / 2));
    for (const s of [-1, 1]) B.add(RT.plastic('#6a9a3c', { roughness: 0.9 }), boxG(0.5, 0.45, DITCH.z1 - DITCH.z0), M(DITCH.x + s * 0.85, -0.1, (DITCH.z0 + DITCH.z1) / 2, 0, 0, s * 0.6));
    const ditchHole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, DITCH.z1 - DITCH.z0), RT.plastic('#5a4630', { roughness: 1 })); ditchHole.rotation.x = -Math.PI / 2; ditchHole.position.set(DITCH.x, -0.32, (DITCH.z0 + DITCH.z1) / 2); G.add(ditchHole);
    // ---- the square: wooden bell tower, a water pump, notice board; the 8 golden platforms around the golden pile ----
    const wood = RT.plastic('#7d6248', { roughness: 0.85 }), bronze = RT.metal('#b8863a', { roughness: 0.35 });
    const BELL = new THREE.Vector3(11, 0, -12.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(wood, boxG(0.35, 9, 0.35), M(BELL.x + sx * 1.3, 4.5, BELL.z + sz * 1.3, sz * 0.03, 0, -sx * 0.03));
    for (const y of [2.5, 5.5]) { B.add(wood, boxG(2.9, 0.2, 0.2), M(BELL.x, y, BELL.z - 1.3)); B.add(wood, boxG(2.9, 0.2, 0.2), M(BELL.x, y, BELL.z + 1.3)); B.add(wood, boxG(0.2, 0.2, 2.9), M(BELL.x - 1.3, y, BELL.z)); B.add(wood, boxG(0.2, 0.2, 2.9), M(BELL.x + 1.3, y, BELL.z)); }
    B.add(P.roofM, wallBox(3.6, 0.12, 2.2, 1.6, 1.6), M(BELL.x, 9.6, BELL.z - 0.9, 0.55, 0, 0)); B.add(P.roofM, wallBox(3.6, 0.12, 2.2, 1.6, 1.6), M(BELL.x, 9.6, BELL.z + 0.9, -0.55, 0, 0));
    B.add(wood, boxG(3.0, 0.3, 0.3), M(BELL.x, 8.6, BELL.z));
    const bell = new THREE.Group(); bell.position.set(BELL.x, 8.45, BELL.z); G.add(bell);
    const bellBody = RT.mesh(new THREE.CylinderGeometry(0.45, 0.95, 1.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#b8863a', metalness: 0.75, roughness: 0.35, side: THREE.DoubleSide })); bellBody.position.y = -0.75; bell.add(bellBody);
    bell.add(RT.mesh(new THREE.SphereGeometry(0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bronze).translateY(-0.12));
    bell.add(RT.mesh(new THREE.SphereGeometry(0.16, 10, 8), RT.metal('#5a5048')).translateY(-1.35));
    const pump = new THREE.Vector3(-9, 0, 9); B.add(RT.metal('#4a5a4c'), new THREE.CylinderGeometry(0.2, 0.25, 1.4, 10), M(pump.x, 0.7, pump.z)); B.add(RT.metal('#4a5a4c'), boxG(0.9, 0.12, 0.12), M(pump.x + 0.3, 1.45, pump.z, 0, 0, 0.3)); B.add(P.barrel, new THREE.CylinderGeometry(0.5, 0.45, 0.6, 12), M(pump.x + 0.6, 0.3, pump.z));
    B.add(wood, boxG(2.4, 1.6, 0.15), M(-12, 1.9, -12)); for (const s of [-1, 1]) B.add(wood, boxG(0.15, 2.7, 0.15), M(-12 + s * 1.1, 1.35, -12)); B.add(RT.plastic('#e8e2cf'), boxG(0.7, 0.9, 0.02), M(-12.4, 2.0, -11.91)); B.add(RT.plastic('#e8e2cf'), boxG(0.6, 0.6, 0.02), M(-11.5, 1.8, -11.91));
    // golden platforms (Capital technology in a farm town) and the golden pile
    const platM = RT.metal('#e2b54a', { roughness: 0.3 }), platD = RT.metal('#8a6a2a'), glowM = RT.plastic('#7de0ff', { emissive: '#3fd0ff', emissiveIntensity: 1.2 });
    const PLATFORMS = [], plats = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, p = new THREE.Group(); p.position.set(Math.sin(a) * 9.5, 0, Math.cos(a) * 9.5); p.rotation.y = a + Math.PI; G.add(p);
      p.add(RT.mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.3, 24), platM).translateY(-0.15)); p.add(RT.mesh(new THREE.CylinderGeometry(0.55, 0.55, 3, 12), platD).translateY(-1.8));
      const ring = RT.mesh(new THREE.TorusGeometry(1.15, 0.05, 6, 28), glowM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; p.add(ring);
      B.add(RT.plastic('#141619'), new THREE.CylinderGeometry(1.3, 1.3, 0.02, 28), M(p.position.x, 0.04, p.position.z)); B.add(platD, new THREE.TorusGeometry(1.3, 0.06, 6, 28), M(p.position.x, 0.05, p.position.z, Math.PI / 2, 0, 0));
      plats.push(p); PLATFORMS.push(new THREE.Vector3(p.position.x, 0, p.position.z));
    }
    const goldM = RT.metal('#e8b83e', { roughness: 0.35 }), packM = [RT.plastic('#c0392b'), RT.plastic('#2f6fe0'), RT.plastic('#3aa35a'), RT.plastic('#7a5a3a')];
    for (let i = 0; i < 18; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 2.4, s = 0.75 + r() * 0.5, lvl = rr < 1.0 ? Math.floor(r() * 2) : 0; B.add(i % 3 ? goldM : platD, boxG(s, s * 0.8, s, 0.06), M(Math.cos(a) * rr, s * 0.4 + lvl * 0.7, Math.sin(a) * rr, 0, r() * 3, 0)); }
    const bags = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + 0.4, bx = Math.cos(a) * 3.4, bz = Math.sin(a) * 3.4; B.add(packM[i % 4], boxG(0.7, 0.8, 0.45, 0.12), M(bx, 0.4, bz, 0, a, 0)); bags.push(new THREE.Vector3(bx, 0, bz)); }
    // ---- the old barn (open, with rafters for Juno's net) on the west side of the field ----
    const BARN = new THREE.Vector3(-82, 0, 96), BW = 12, BD = 16, BH = 5.6, barnRed = pl('#a04c3a'); barnRed.map.rotation = Math.PI / 2; barnRed.map.center.set(0.5, 0.5);
    const TB = (lx, ly, lz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().makeRotationY(Math.PI / 2).multiply(M(lx, ly, lz, rx, ry, rz)).premultiply(new THREE.Matrix4().makeTranslation(BARN.x, 0, BARN.z));   // the barn's front (+z local) faces east, toward the field
    B.add(barnRed, wallBox(BW, BH, 0.25, 3.4, 3.4), TB(0, BH / 2, -BD / 2));                                   // back wall
    for (const s of [-1, 1]) B.add(barnRed, wallBox(0.25, BH, BD, 3.4, 3.4), TB(s * BW / 2, BH / 2, 0));       // side walls
    for (const s of [-1, 1]) B.add(barnRed, wallBox(BW / 2 - 2.2, BH, 0.25, 2.4, 2.4), TB(s * (BW / 4 + 1.1), BH / 2, BD / 2));   // front, beside the big doorway
    B.add(barnRed, wallBox(4.4, 1.4, 0.25, 2.4, 2.4), TB(0, BH - 0.7, BD / 2));
    const brh = 3.4, brun = BW / 2 + 0.6, bsl = Math.hypot(brh, brun), bslope = Math.atan2(brh, brun);
    for (const s of [-1, 1]) B.add(P.roofM, wallBox(bsl + 0.1, 0.14, BD + 1.2, 1.6, 1.6), TB(s * brun / 2, BH + brh / 2, 0, 0, 0, -s * bslope));
    const btri = new THREE.Shape([new THREE.Vector2(-BW / 2, 0), new THREE.Vector2(BW / 2, 0), new THREE.Vector2(0, brh - 0.05)]), bgable = new THREE.ExtrudeGeometry(btri, { depth: 0.25, bevelEnabled: false });
    for (const s of [-1, 1]) B.add(barnRed, bgable, TB(0, BH, s * (BD / 2) - 0.12));
    for (let k = -3; k <= 3; k++) B.add(P.oldWood, boxG(BW - 0.4, 0.3, 0.3), TB(0, BH - 0.2, k * 2.2));        // rafters (tie beams)
    B.add(P.oldWood, boxG(0.3, 0.3, BD - 0.4), TB(0, BH + brh - 0.6, 0));
    for (const s of [-1, 1]) { const dg = new THREE.Matrix4(); B.add(barnRed, wallBox(2.2, 4.0, 0.15, 2.4, 2.4), TB(s * 3.4, 2.0, BD / 2 + 1.3, 0, s * 1.15, 0)); }   // the big doors, swung open
    B.add(RT.plastic('#7a5a3a', { roughness: 1 }), boxG(BW - 0.4, 0.05, BD - 0.4), TB(0, 0.03, 0));            // floor
    const hayM = RT.plastic('#d9b85a', { roughness: 0.85 });
    for (const [lx, lz, ly] of [[-4.2, -5, 0], [-4.2, -3.4, 0], [-4.2, -5, 0.8], [-2.6, -5.2, 0], [4.0, -6, 0], [4.0, -4.4, 0], [4.0, -6, 0.8], [3.0, 2.0, 0]]) B.add(hayM, boxG(1.4, 0.8, 1.5, 0.08), TB(lx, 0.42 + ly, lz));
    for (let k = 0; k < 6; k++) B.add(P.oldWood, boxG(0.1, 0.1, 0.7), TB(BW / 2 - 0.6, 0.4 + k * 0.6, -2, 0, 0, 0)); for (const s of [-1, 1]) B.add(P.oldWood, boxG(0.1, 3.6, 0.1), TB(BW / 2 - 0.6, 1.8, -2 + s * 0.35));   // ladder
    const lantern = new THREE.PointLight('#ffc070', 0, 14, 1.6); lantern.position.copy(new THREE.Vector3(BARN.x, 3.8, BARN.z)); G.add(lantern);
    const lampMesh = RT.mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 10), new THREE.MeshStandardMaterial({ color: '#ffd48a', emissive: '#ffb050', emissiveIntensity: 0 })); lampMesh.position.set(BARN.x, 4.2, BARN.z); G.add(lampMesh);
    // the trap: a tripwire just inside the doorway, the net up in the rafters
    const BARN_WIRE = new THREE.Vector3(BARN.x + BD / 2 - 1.6, 0.22, BARN.z);
    const wire = RT.mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.6, 4), RT.metal('#e8e8e8'), false); wire.rotation.x = Math.PI / 2; wire.position.copy(BARN_WIRE); G.add(wire);
    const netTex = RT.canvasTexture(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = '#d9c28a'; g.lineWidth = 3; for (let k = 0; k <= 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 128); g.moveTo(0, k); g.lineTo(128, k); g.stroke(); } });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4, 10, 10), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 }));
    net.rotation.x = -Math.PI / 2; net.position.set(BARN_WIRE.x - 0.6, BH - 0.55, BARN.z); G.add(net);
    // ---- the farm windmill (lattice tower, many-bladed fan, tail vane) + water tank, by Rhea's house ----
    const MILL = new THREE.Vector3(58, 0, 104), steel = RT.metal('#9a9da2', { roughness: 0.5 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(steel, boxG(0.14, 11, 0.14), M(MILL.x + sx * 0.9, 5.5, MILL.z + sz * 0.9, sz * 0.07, 0, -sx * 0.07));
    for (let k = 1; k < 5; k++) { const y = k * 2.2, s = 0.9 - k * 0.13; for (const [a, b] of [[[-s, -s], [s, -s]], [[s, -s], [s, s]], [[s, s], [-s, s]], [[-s, s], [-s, -s]]]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); B.add(steel, boxG(0.07, 0.07, L), M(MILL.x + (a[0] + b[0]) / 2, y, MILL.z + (a[1] + b[1]) / 2, 0, Math.atan2(b[0] - a[0], b[1] - a[1]), 0)); } }
    const fan = new THREE.Group(); fan.position.set(MILL.x, 11.4, MILL.z + 0.4); G.add(fan);
    for (let k = 0; k < 16; k++) { const bl = RT.mesh(boxG(0.32, 1.7, 0.04), RT.metal('#c8ccd0', { roughness: 0.45 })); bl.position.y = 1.2; bl.rotation.y = 0.35; const arm = new THREE.Group(); arm.rotation.z = (k / 16) * Math.PI * 2; arm.add(bl); fan.add(arm); }
    fan.add(RT.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 10), RT.metal('#6a6d70')).rotateX(Math.PI / 2));
    B.add(steel, boxG(0.1, 0.1, 2.4), M(MILL.x, 11.4, MILL.z - 1.0)); B.add(RT.metal('#c8ccd0'), boxG(0.05, 1.0, 1.4), M(MILL.x, 11.4, MILL.z - 2.2));
    B.add(RT.metal('#7f8a8e', { roughness: 0.5 }), new THREE.CylinderGeometry(1.6, 1.6, 1.6, 20), M(MILL.x + 3.2, 0.8, MILL.z + 1.5));
    // ---- the rusty silo + a lean-to shed by the barn; hay bales in the meadow ----
    const rust = new THREE.MeshStandardMaterial({ map: X.roof, color: '#c0a088', roughness: 0.6, metalness: 0.4 });
    const silo = new THREE.CylinderGeometry(2.4, 2.4, 12, 18, 1, false); const su = silo.attributes.uv; for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) * 5, su.getY(i) * 4);
    B.add(rust, silo, M(BARN.x - 3, 6, BARN.z - 12)); B.add(rust, new THREE.SphereGeometry(2.4, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(BARN.x - 3, 12, BARN.z - 12));
    for (const [hx, hz] of [[-60, 40], [-55, 44], [-110, 70], [60, 30], [70, 60], [-70, 150]]) B.add(hayM, new THREE.CylinderGeometry(0.9, 0.9, 1.3, 14), M(hx, ground(hx, hz) + 0.9, hz, 0, r() * 3, Math.PI / 2));
    B.build(G);
    // ---- THE WHEAT: crossed "cards" (11 stalks each), instanced, swaying in the shader; dense and to the horizon ----
    const cardG = (() => { const a = new THREE.PlaneGeometry(1.3, 1.35), b = new THREE.PlaneGeometry(1.3, 1.35); a.translate(0, 0.675, 0); b.translate(0, 0.675, 0); b.rotateY(Math.PI / 2); return RT.mergeGeometries([{ geo: a }, { geo: b }]); })();
    const wheatM = new THREE.MeshLambertMaterial({ map: X.wheat, alphaTest: 0.45, side: THREE.DoubleSide, transparent: false });
    const sway = { value: 0 };
    wheatM.onBeforeCompile = (sh) => { sh.uniforms.uTime = sway;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float bend = uv.y * uv.y; float g = sin(uTime * 0.9 + ip.x * 0.06 + ip.z * 0.035) * 0.5 + 0.5;
        transformed.x += (sin(uTime * 1.7 + ip.x * 0.4 + ip.z * 0.2) * 0.08 + g * 0.16) * bend;
        transformed.z += cos(uTime * 1.3 + ip.z * 0.3) * 0.06 * bend;`); };
    const pts = [];
    const fieldDense = (x, z) => x > FIELD.x0 && x < FIELD.x1 && z > FIELD.z0 && z < FIELD.z1;
    for (let x = FIELD.x0 + 0.5; x < FIELD.x1; x += 0.85) for (let z = FIELD.z0 + 0.5; z < FIELD.z1; z += 0.85) {
      const jx = x + (r() - 0.5) * 0.7, jz = z + (r() - 0.5) * 0.7;
      if (Math.hypot(jx - BARN.x, jz - BARN.z) < 14) continue;
      pts.push([jx, jz]);
    }
    // the far fields beyond the town (more wheat to the horizon, sparser)
    for (let i = 0; i < 9000; i++) { const x = -260 + r() * 520, z = 200 + r() * 160; pts.push([x, z]); }
    for (let i = 0; i < 6000; i++) { const x = -260 + r() * 150, z = 14 + r() * 190; if (!onRoad(x, z) && x < -105) pts.push([x, z]); }
    const wheat = new THREE.InstancedMesh(cardG, wheatM, pts.length);
    pts.forEach(([x, z], i) => { dm.position.set(x, ground(x, z) - 0.05, z); dm.rotation.set(0, r() * 3.14, 0); const s = 0.85 + r() * 0.35; dm.scale.set(s, 0.9 + r() * 0.35, s); dm.updateMatrix(); wheat.setMatrixAt(i, dm.matrix); c.setHSL(0.11 + r() * 0.025, 0.6 + r() * 0.2, 0.7 + r() * 0.14); wheat.setColorAt(i, c); });
    wheat.instanceColor.needsUpdate = true; wheat.receiveShadow = true; wheat.castShadow = false; G.add(wheat);
    // ---- trees around the town and on the hills (round + pines), instanced ----
    const treePos = [];
    for (let i = 0; i < 900; i++) { const a = r() * 6.28, d = 180 + Math.pow(r(), 0.7) * 520, x = Math.cos(a) * d, z = Math.sin(a) * d; if (z > 195 && z < 365 && Math.abs(x) < 265) continue; treePos.push([x, ground(x, z), z]); }
    for (const hh of houses) for (let k = 0; k < 2; k++) { const x = hh.x + (r() - 0.5) * 16, z = hh.z + (r() < 0.5 ? -1 : 1) * (9 + r() * 4); if (!onRoad(x, z) && Math.abs(z + 6) > 6) treePos.push([x, 0, z]); }
    for (let k = 0; k < 10; k++) treePos.push([BARN.x - 14 - r() * 8, 0, BARN.z - 20 + k * 4]);
    for (let k = 0; k < 6; k++) treePos.push([HOUSE.x + 8 + r() * 4, 0, HOUSE.z - 10 + k * 4]);
    RT.scenery.forest(G, treePos, { seed: 17, pineRatio: 0.35, scale: 1.25 });
    // ---- mountains on the horizon ----
    const mMat = new THREE.MeshStandardMaterial({ color: '#7f94b8', flatShading: true, roughness: 1 }), snow = new THREE.MeshStandardMaterial({ color: '#f2f4f8', flatShading: true, roughness: 1 });
    for (let i = 0; i < 30; i++) { const a = (i / 30) * 6.28 + r() * 0.15, d = 950 + r() * 250, rad = 190 + r() * 110, h = 150 + r() * 140;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), mMat); m.position.set(Math.cos(a) * d, h / 2 - 25, Math.sin(a) * d); m.rotation.y = r() * 3; G.add(m);
      const cp = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.3, h * 0.3, 7), snow); cp.position.set(m.position.x, h - 25 - h * 0.15 + 1, m.position.z); cp.rotation.y = m.rotation.y; G.add(cp); }
    // ---- the dome: glowing hexagon lines over everything ----
    const domeM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { time: { value: 0 }, strength: { value: 1 }, color: { value: new THREE.Color('#5fe3ff') } },
      vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform float time;uniform float strength;uniform vec3 color;varying vec2 vUv;varying vec3 vN;' +
        'float hex(vec2 p){p.x*=1.1547;p.y+=mod(floor(p.x),2.0)*0.5;p=abs(fract(p)-0.5);return abs(max(p.x*1.5+p.y,p.y*2.0)-1.0);}' +
        'void main(){vec2 p=vec2(vUv.x*110.0,vUv.y*46.0);float h=hex(p);float line=1.0-smoothstep(0.0,0.07,h);' +
        'float pulse=0.55+0.45*sin(time*2.0-vUv.y*12.0);float edge=pow(1.0-abs(vN.z),2.0);' +
        'float a=(line*0.7*pulse+0.03+edge*0.15)*strength*smoothstep(1.0,0.72,vUv.y);gl_FragColor=vec4(color*a,a);}',
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(o.domeRadius || 700, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.renderOrder = 5; dome.frustumCulled = false; G.add(dome);
    // ---- the night: house light (warm window + a point light), lit windows here and there are dark (nobody lives here) ----
    const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.85), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0 }));
    winGlow.position.copy(WINDOW).add(new THREE.Vector3(-0.02, 0, 0)); winGlow.rotation.y = -Math.PI / 2; G.add(winGlow);
    const houseLamp = new THREE.PointLight('#ffc070', 0, 18, 1.5); houseLamp.position.copy(WINDOW).add(new THREE.Vector3(-1.2, 0, 0)); G.add(houseLamp);
    // ---- update ----
    G.update = (t, u = {}) => {
      sway.value = t; domeM.uniforms.time.value = t; domeM.uniforms.strength.value = u.domeStrength ?? (0.75 + 0.5 * (u.night || 0));
      roadM.emissiveIntensity = (u.roads || 0) * 1.6 * (0.85 + 0.15 * Math.sin(t * 14)); sweepU.value = u.sweep ?? 9999;
      const bt = u.bell ?? -1; bell.rotation.x = bt >= 0 ? Math.sin(bt * 6) * 0.6 * Math.exp(-bt * 0.5) : 0;
      const rise = u.rise ?? 1; plats.forEach((p, i) => { p.position.y = -3.2 * (1 - rise); });
      fan.rotation.z = t * (u.night ? 0.4 : 1.2);
      const hl = u.houseLight || 0; winGlow.material.opacity = hl; houseLamp.intensity = hl * 1.6;
      lantern.intensity = (u.lantern || 0) * 1.5; lampMesh.material.emissiveIntensity = (u.lantern || 0) * 2;
      // the barn net: u.netT seconds since it sprang (falls with gravity, then hangs as a bag; see the episode for Rhea in it)
      const nt = u.netT ?? -1; wire.visible = nt < 0;
      net.visible = nt < 0.25; net.position.y = nt < 0 ? BH - 0.55 : BH - 0.55 - (BH - 1.2) * Math.min(1, (nt / 0.25) ** 2);
    };
    G.spots = { SQUARE, PLATFORMS, plats, PILE: new THREE.Vector3(0, 0, 0), bags, BELL, bell, FIELD, DITCH, FARM_ROAD: { x: 38 }, MAIN_Z: -6, BARN, BW, BD, BH, BARN_WIRE, net, HOUSE, HOUSE_YAW, WINDOW, MILL, roads, onRoad, ground, houses, dome, domeM };
    return G;
  }

  RT.arena7 = { build, MOODS, house };
})();
