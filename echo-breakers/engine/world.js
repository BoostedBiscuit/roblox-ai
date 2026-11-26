// =====================================================================================
// world.js: the PORT HALCYON KIT. Textures, buildings, street props, trees, sky clouds, sea and volcano.
// The five locations (locations.js) are built from these pieces. Everything is original (no real buildings).
//
//   const K = RT.kit;
//   K.building(B, { x, z, w: 3 bays, d: 2 bays, floors: 4, yaw, color: 2, seed })   → into a Batch (B = K.Batch())
//   K.car('#e23b3b')  K.scooter('#7fd1c1')  K.fruitCart()  K.cafeSet('#d0473a')  K.crate()  K.globeLamp()
//   K.clouds(group, { cx, cz })   K.sea({ y })   K.volcano({ x, z })   K.cityHill({ ... })
//   K.tex.cobble() / slabs() / asphalt() / sidewalk() / ashlar() / sand()  (repeating textures, 1 tile = 1 texture)
//
// UNITS: a character is ~5 units tall. One building floor = 5.5 units, the shop floor = 6.5, one window bay = 4.5.
// BREAKABLES: props that can shatter in fights carry userData.breakable = { kind } (fx.js finds them).
// COLORS: WALLS / SHUTTERS / AWNINGS below. Change them here and every building in the city changes.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, M = RT.mat4;
  const cache = {}, once = (key, make) => cache[key] || (cache[key] = make());

  // ---------- palette of the city ----------
  const WALLS = ['#f2c14e', '#ec8b3a', '#f3e2c0', '#f0a3a0', '#d9654b', '#f7d6a0', '#e9b872', '#c96f53', '#f5cfa8', '#e7d36b', '#f4b6a8', '#e8a35c'];
  const SHUTTERS = ['#2f7a55', '#7a4b2a', '#356f93', '#3d6b4f', '#8a3b2e', '#2f6c6a'];
  const AWNINGS = [['#c8372d', '#f6efe2'], ['#2f6e9a', '#f6efe2'], ['#2f7a55', '#f6efe2'], ['#e0a13a', '#fff8e6']];
  const ROOFS = ['#c8643b', '#b5552f', '#d17448', '#a94e2e'];
  const BAY = 4.5, FLOOR = 5.5, GROUND = 6.5;          // window bay width, upper floor height, shop floor height

  // ---------- Batch: geometry pieces bucketed per material, merged at the end (one draw call per material) ----------
  function Batch() {
    const b = {};
    return {
      add(mat, geo, matrix) { (b[mat.uuid] = b[mat.uuid] || { mat, items: [] }).items.push({ geo, matrix }); },
      build(group, shadows = true) { for (const k in b) { const m = RT.mesh(RT.mergeGeometries(b[k].items), b[k].mat, shadows); group.add(m); } return group; },
    };
  }
  // a transform helper: local (x, y, z, rotations) inside an object placed at (X, Y, Z) turned by yaw
  const placer = (X, Y, Z, yaw = 0) => (lx, ly, lz, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
    new THREE.Matrix4().makeTranslation(X, Y, Z).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(M(lx, ly, lz, rx, ry, rz, sx, sy, sz));
  const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // scale a geometry's UVs so a repeating texture keeps the same size on big and small faces
  function uvScale(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; return geo; }
  // a box whose 6 faces repeat a texture every `tw` (across) × `th` (up) units: used for facades and stone walls
  function tiledBox(w, h, d, tw, th) {
    const g = boxG(w, h, d), uv = g.attributes.uv, per = uv.count / 6;
    const fw = [d, d, w, w, w, w], fh = [h, h, d, d, h, h];
    for (let f = 0; f < 6; f++) for (let i = f * per; i < (f + 1) * per; i++) uv.setXY(i, uv.getX(i) * fw[f] / tw, uv.getY(i) * fh[f] / th);
    uv.needsUpdate = true; return g;
  }
  // a flat floor piece (w × d) lying on y = 0, texture repeating every `tile` units
  function floorGeo(w, d, tile) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return uvScale(g, w / tile, d / tile); }

  // ---------- small canvas helpers ----------
  function speckle(g, w, h, n, seed, dark = 0.08, light = 0.06) {
    const r = RT.rng(seed);
    for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${dark * r()})` : `rgba(255,255,255,${light * r()})`; const s = 1 + r() * 2.5; g.fillRect(r() * w, r() * h, s, s); }
  }
  function repeatTex(t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // =================================================================================
  // TEXTURES (all repeat; cached so every location shares them)
  // =================================================================================
  const tex = {
    // dark "sampietrini" cobbles in offset rows (old town streets)
    cobble: (base = '#857b70') => once('cobble' + base, () => repeatTex(RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = RT.shade(base, -0.45); g.fillRect(0, 0, 256, 256);
      const r = RT.rng(7), S = 32;
      for (let row = 0; row < 8; row++) for (let col = -1; col < 9; col++) {
        const x = col * S + (row % 2) * S / 2, y = row * S;
        g.fillStyle = RT.shade(base, (r() - 0.5) * 0.28); roundRect(g, x + 2, y + 2, S - 4, S - 4, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.10)'; roundRect(g, x + 5, y + 4, S - 12, 6, 3); g.fill();
      }
      speckle(g, 256, 256, 500, 3);
    }))),
    // big pale stone slabs (the piazza, terraces)
    slabs: (base = '#ddd3c2') => once('slabs' + base, () => repeatTex(RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = RT.shade(base, -0.22); g.fillRect(0, 0, 256, 256);
      const r = RT.rng(11);
      for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
        const x = col * 128 + (row % 2) * 64, y = row * 64;
        g.fillStyle = RT.shade(base, (r() - 0.5) * 0.12); g.fillRect(x + 2, y + 2, 124, 60);
      }
      speckle(g, 256, 256, 900, 5, 0.06, 0.05);
    }))),
    asphalt: () => once('asphalt', () => repeatTex(RT.canvasTexture(256, 256, (g) => { g.fillStyle = '#55585e'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 2500, 9, 0.18, 0.1); }))),
    // square sidewalk tiles
    sidewalk: (base = '#d8cfbf') => once('side' + base, () => repeatTex(RT.canvasTexture(128, 128, (g) => {
      g.fillStyle = RT.shade(base, -0.18); g.fillRect(0, 0, 128, 128);
      const r = RT.rng(4);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = RT.shade(base, (r() - 0.5) * 0.1); g.fillRect(x * 64 + 1.5, y * 64 + 1.5, 61, 61); }
      speckle(g, 128, 128, 300, 2, 0.05, 0.05);
    }))),
    // big ashlar blocks in running bond (fortress, sea wall, arena, stair cheeks)
    ashlar: (base = '#c9b79a', rows = 4) => once('ashlar' + base + rows, () => repeatTex(RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = RT.shade(base, -0.3); g.fillRect(0, 0, 256, 256);
      const r = RT.rng(13), h = 256 / rows;
      for (let row = 0; row < rows; row++) for (let col = -1; col < 3; col++) {
        const x = col * 128 + (row % 2) * 64 + (r() - 0.5) * 10, y = row * h;
        g.fillStyle = RT.shade(base, (r() - 0.5) * 0.18); g.fillRect(x + 3, y + 3, 122, h - 6);
        g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 3, y + 3, 122, 5);
        g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 3, y + h - 9, 122, 6);
      }
      speckle(g, 256, 256, 1400, 6, 0.1, 0.05);
    }))),
    sand: (base = '#d4b98a') => once('sand' + base, () => repeatTex(RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 3500, 21, 0.16, 0.12);
      const r = RT.rng(22); g.strokeStyle = 'rgba(90,60,30,0.10)'; g.lineWidth = 3;
      for (let i = 0; i < 14; i++) { g.beginPath(); const y = r() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + 10 * (r() - 0.5), 170, y + 10 * (r() - 0.5), 256, y); g.stroke(); }
    }))),
    // wooden planks (crates, carts, the record shop floor)
    planks: (base = '#a87a4a') => once('planks' + base, () => repeatTex(RT.canvasTexture(128, 128, (g) => {
      const r = RT.rng(31); for (let i = 0; i < 4; i++) { g.fillStyle = RT.shade(base, (r() - 0.5) * 0.2); g.fillRect(0, i * 32, 128, 32); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 32 + 30, 128, 2); }
      g.strokeStyle = 'rgba(60,30,10,0.18)'; g.lineWidth = 1; for (let i = 0; i < 30; i++) { const y = r() * 128; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + (r() - 0.5) * 6); g.stroke(); }
    }))),
  };

  // one window bay of one upper floor: wall, framed window with glass, open shutters, sill (repeats over the facade)
  function facadeTex(wall, shutter, trim = '#f6eedd') {
    return once('fac' + wall + shutter, () => repeatTex(RT.canvasTexture(128, 160, (g) => {
      g.fillStyle = wall; g.fillRect(0, 0, 128, 160); speckle(g, 128, 160, 420, wall.length * 7, 0.07, 0.07);
      const x0 = 40, x1 = 88, y0 = 36, y1 = 122;
      g.fillStyle = trim; g.fillRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 10); g.fillRect(x0 - 10, y0 - 14, x1 - x0 + 20, 7);   // frame + cap
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#24384f'); gr.addColorStop(1, '#5b84a8'); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.moveTo(x0 + 6, y1); g.lineTo(x0 + 26, y0); g.lineTo(x0 + 36, y0); g.lineTo(x0 + 16, y1); g.fill();   // reflection
      g.fillStyle = trim; g.fillRect(63, y0, 3, y1 - y0); g.fillRect(x0, 72, x1 - x0, 3);                                                // mullions
      for (const sx of [x0 - 6 - 22, x1 + 6]) {                                                                                          // open shutters
        g.fillStyle = shutter; g.fillRect(sx, y0 - 4, 22, y1 - y0 + 6);
        g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = y0; y < y1; y += 6) g.fillRect(sx + 3, y, 16, 2);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(sx, y0 - 4, 2, y1 - y0 + 6);
      }
      g.fillStyle = trim; g.fillRect(x0 - 10, y1 + 4, x1 - x0 + 20, 6);                                                                 // sill
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x0 - 10, y1 + 10, x1 - x0 + 20, 3);
    })));
  }
  // one bay of the ground (shop) floor: rusticated stone, an arched doorway / shop window, a keystone
  function groundTex(wall, accent) {
    return once('gnd' + wall + accent, () => repeatTex(RT.canvasTexture(128, 184, (g) => {
      const stone = RT.shade(wall, -0.18); g.fillStyle = stone; g.fillRect(0, 0, 128, 184);
      g.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 20; y < 184; y += 23) g.fillRect(0, y, 128, 3);
      speckle(g, 128, 184, 400, 17, 0.08, 0.06);
      g.fillStyle = '#efe4cf'; g.beginPath(); g.moveTo(18, 184); g.lineTo(18, 86); g.arc(64, 86, 46, Math.PI, 0); g.lineTo(110, 184); g.fill();   // stone arch
      g.fillStyle = '#2a2320'; g.beginPath(); g.moveTo(26, 184); g.lineTo(26, 88); g.arc(64, 88, 38, Math.PI, 0); g.lineTo(102, 184); g.fill();    // dark opening
      const gr = g.createLinearGradient(0, 60, 0, 184); gr.addColorStop(0, 'rgba(120,160,200,0.55)'); gr.addColorStop(1, 'rgba(60,80,100,0.35)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(32, 184); g.lineTo(32, 90); g.arc(64, 90, 32, Math.PI, 0); g.lineTo(96, 184); g.fill();          // glass
      g.fillStyle = accent; g.fillRect(30, 120, 68, 5); g.fillRect(62, 60, 4, 124);                                                           // frame
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(40, 96, 6, 80);
      g.fillStyle = '#efe4cf'; g.fillRect(58, 36, 12, 12);                                                                                      // keystone
    })));
  }
  const mat = {
    facade: (k) => once('mfac' + k, () => new THREE.MeshStandardMaterial({ map: facadeTex(WALLS[k % WALLS.length], SHUTTERS[(k * 5 + 1) % SHUTTERS.length]), roughness: 0.85 })),
    ground: (k) => once('mgnd' + k, () => new THREE.MeshStandardMaterial({ map: groundTex(WALLS[k % WALLS.length], SHUTTERS[(k * 5 + 1) % SHUTTERS.length]), roughness: 0.85 })),
    tiled: (name, ...a) => once('mt' + name + a.join(), () => new THREE.MeshStandardMaterial({ map: tex[name](...a), roughness: name === 'asphalt' ? 0.9 : 0.8 })),
    trim: () => RT.plastic('#f6eedd', { roughness: 0.7 }),
    iron: () => RT.plastic('#2a2b2e', { roughness: 0.5, metalness: 0.3 }),
    stone: () => RT.plastic('#d9ccb4', { roughness: 0.8 }),
  };
  // striped awning / umbrella texture (vertical stripes)
  function stripes(a, b, n = 8) { return once('str' + a + b + n, () => RT.canvasTexture(256, 32, (g) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 256 / n, 0, 256 / n + 1, 32); } })); }

  // =================================================================================
  // BUILDINGS
  // =================================================================================
  // An Italian city block: shop floor with arches, colorful upper floors with shutters, balconies with iron rails,
  // flower boxes, a cornice and a terracotta hip roof. Front = local +z. w and d are in BAYS (1 bay = 4.5 units).
  //   o: { x, y, z, yaw, w: bays, d: bays, floors, color: index into WALLS, seed, roof: 'hip' | 'flat', awnings, balconies, flowers }
  // Returns the footprint { x, z, hw, hd, yaw, top } (handy for clip checks and camera planning).
  function building(B, o) {
    const W = (o.w || 3) * BAY, Dp = (o.d || 2) * BAY, floors = o.floors || 4, k = o.color ?? 0, r = RT.rng(o.seed || k * 13 + floors);
    const T = placer(o.x || 0, o.y || 0, o.z || 0, o.yaw || 0), H = GROUND + floors * FLOOR;
    B.add(mat.ground(k), tiledBox(W + 0.2, GROUND, Dp + 0.2, BAY, GROUND), T(0, GROUND / 2, 0));
    B.add(mat.facade(k), tiledBox(W, floors * FLOOR, Dp, BAY, FLOOR), T(0, GROUND + floors * FLOOR / 2, 0));
    B.add(mat.trim(), boxG(W + 0.5, 0.35, Dp + 0.5), T(0, GROUND, 0));                                       // string course
    B.add(mat.trim(), boxG(W + 0.9, 0.55, Dp + 0.9), T(0, H + 0.2, 0));                                       // cornice
    if ((o.roof || (r() < 0.75 ? 'hip' : 'flat')) === 'hip') {
      const rh = 2.2 + Math.min(W, Dp) * 0.12, g = new THREE.ConeGeometry(1, 1, 4, 1); g.rotateY(Math.PI / 4);
      B.add(RT.plastic(ROOFS[(k + floors) % ROOFS.length], { roughness: 0.75, flatShading: true }), g, T(0, H + 0.45 + rh / 2, 0, 0, 0, 0, (W + 1.6) / Math.SQRT2, rh, (Dp + 1.6) / Math.SQRT2));
    } else {
      B.add(mat.trim(), boxG(W + 0.9, 1.0, 0.4), T(0, H + 0.95, Dp / 2 + 0.25)); B.add(mat.trim(), boxG(W + 0.9, 1.0, 0.4), T(0, H + 0.95, -Dp / 2 - 0.25));
      B.add(mat.trim(), boxG(0.4, 1.0, Dp + 0.9), T(W / 2 + 0.25, H + 0.95, 0)); B.add(mat.trim(), boxG(0.4, 1.0, Dp + 0.9), T(-W / 2 - 0.25, H + 0.95, 0));
      B.add(RT.plastic('#e9e2d4'), boxG(2.4, 2.4, 2.4), T(W * 0.25, H + 1.6, -Dp * 0.2));                       // stair hut on the flat roof
    }
    const front = Dp / 2, bays = o.w || 3, iron = mat.iron();
    for (let i = 0; i < bays; i++) {
      const bx = -W / 2 + BAY * (i + 0.5);
      if (o.awnings !== false && r() < 0.5) {                                                                     // striped shop awning
        const [a, b] = AWNINGS[(k + i) % AWNINGS.length], am = once('awn' + a, () => new THREE.MeshStandardMaterial({ map: stripes(a, b), roughness: 0.8 }));
        B.add(am, boxG(BAY * 0.86, 0.1, 2.2), T(bx, GROUND - 1.2, front + 1.05, 0.38, 0, 0));
      }
      for (let f = 0; f < floors; f++) {
        const sill = GROUND + f * FLOOR + 0.2 * FLOOR;
        const roll = r();
        if (o.balconies !== false && f < floors - 1 && roll < 0.32) {                                               // balcony with an iron railing
          const bw = BAY * 0.8;
          B.add(mat.trim(), boxG(bw, 0.3, 1.5), T(bx, sill - 0.15, front + 0.75));
          B.add(iron, boxG(bw, 0.12, 0.12), T(bx, sill + 1.3, front + 1.45));
          for (const s of [-1, 1]) B.add(iron, boxG(0.12, 0.12, 1.5), T(bx + s * bw / 2, sill + 1.3, front + 0.75));
          for (let q = 0; q <= 6; q++) B.add(iron, boxG(0.08, 1.3, 0.08), T(bx - bw / 2 + (q / 6) * bw, sill + 0.65, front + 1.45));
          for (const s of [-1, 1]) B.add(iron, boxG(0.08, 1.3, 0.08), T(bx + s * bw / 2, sill + 0.65, front + 0.4));
          if (r() < 0.5) addFlowers(B, T, bx, sill + 0.1, front + 1.15, bw * 0.8, r);
        } else if (o.flowers !== false && roll < 0.62) addFlowers(B, T, bx, sill + 0.05, front + 0.35, 2.4, r, true);  // flower box under the window
      }
    }
    return { x: o.x || 0, z: o.z || 0, y: o.y || 0, hw: W / 2, hd: Dp / 2, yaw: o.yaw || 0, top: (o.y || 0) + H };
  }
  // a terracotta box with red / pink / white flowers and leaves
  function addFlowers(B, T, x, y, z, w, r, box) {
    if (box) B.add(RT.plastic('#b9603a', { roughness: 0.8 }), boxG(w, 0.5, 0.65), T(x, y + 0.25, z));
    const cols = ['#e2384d', '#ff7aa8', '#ffffff', '#ff4f7b', '#f2c14e'], leaf = RT.plastic('#3f8a3a', { roughness: 0.8 });
    const ball = once('fball', () => new THREE.SphereGeometry(0.3, 8, 6));
    const n = Math.round(w / 0.45);
    for (let i = 0; i < n; i++) {
      const fx = x - w / 2 + 0.25 + (i / Math.max(1, n - 1)) * (w - 0.5);
      B.add(leaf, ball, T(fx, y + 0.65, z, 0, 0, 0, 1.1, 0.8, 1.1));
      if (i % 2 === 0) B.add(RT.plastic(cols[Math.floor(r() * cols.length)], { roughness: 0.6 }), ball, T(fx + 0.1, y + 0.95, z + 0.15, 0, 0, 0, 0.7));
    }
  }

  // =================================================================================
  // STREET PROPS (each returns a Group facing +x; fight-breakable ones are tagged)
  // =================================================================================
  const tag = (g, kind) => { g.userData.breakable = { kind }; g.name = kind; return g; };
  const part = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const p = RT.mesh(geo, m); p.position.set(x, y, z); p.rotation.set(rx, ry, rz); return p; };
  const rbox = (w, h, d, r = 0.12) => RT.roundedBoxGeometry(w, h, d, r, 2);

  // small round Italian city car (faces +x). car.userData.wheels spin when it rolls.
  function car(color = '#e23b3b') {
    const g = new THREE.Group(), body = RT.plastic(color, { roughness: 0.3 }), glass = RT.plastic('#1d2a38', { roughness: 0.1, metalness: 0.3 });
    const dark = RT.plastic('#1b1b1e', { roughness: 0.8 }), chrome = RT.plastic('#c9ced6', { roughness: 0.25, metalness: 0.7 });
    g.add(part(rbox(4.6, 1.3, 2.3, 0.4), body, 0, 1.05, 0));
    g.add(part(rbox(2.7, 1.15, 2.1, 0.35), glass, -0.35, 2.15, 0));
    g.add(part(rbox(2.5, 0.22, 2.12, 0.1), body, -0.35, 2.75, 0));
    for (const s of [-1, 1]) g.add(part(boxG(0.18, 1.0, 2.14), body, -0.35 + s * 1.1, 2.2, 0, 0, 0, s * 0.25));
    for (const [x, c] of [[2.32, '#fff6d8'], [-2.32, '#d8242a']]) for (const s of [-0.7, 0.7]) {
      const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.3 }); g.add(part(boxG(0.1, 0.3, 0.45), m, x, 1.25, s));
    }
    for (const x of [2.35, -2.35]) g.add(part(boxG(0.25, 0.32, 2.35), chrome, x, 0.62, 0));
    const wheelG = new THREE.CylinderGeometry(0.58, 0.58, 0.42, 16); wheelG.rotateX(Math.PI / 2);
    const hubG = new THREE.CylinderGeometry(0.3, 0.3, 0.44, 10); hubG.rotateX(Math.PI / 2);
    const wheels = [];
    for (const x of [1.45, -1.45]) for (const z of [1.0, -1.0]) { const w = new THREE.Group(); w.add(part(wheelG, dark), part(hubG, chrome)); w.position.set(x, 0.58, z); g.add(w); wheels.push(w); }
    g.scale.setScalar(1.35);   // a bit bigger than the parts above, so a car is ~80% of a person's height
    g.userData.wheels = wheels; g.userData.radius = 0.58 * 1.35; g.userData.size = [4.6 * 1.35, 2.9 * 1.35, 2.3 * 1.35];
    return tag(g, 'car');
  }
  // a scooter (faces +x)
  function scooter(color = '#7fd1c1') {
    const g = new THREE.Group(), body = RT.plastic(color, { roughness: 0.3 }), dark = RT.plastic('#1b1b1e', { roughness: 0.8 }), seat = RT.plastic('#4a3426', { roughness: 0.6 }), chrome = RT.plastic('#c9ced6', { roughness: 0.25, metalness: 0.7 });
    g.add(part(rbox(1.2, 1.0, 0.9, 0.4), body, -0.55, 0.95, 0));                // rear body
    g.add(part(boxG(1.0, 0.18, 0.62), body, 0.3, 0.55, 0));                     // floorboard
    g.add(part(rbox(0.35, 1.4, 0.8, 0.15), body, 0.85, 1.1, 0, 0, 0, -0.18));   // leg shield
    g.add(part(rbox(1.05, 0.22, 0.6, 0.1), seat, -0.5, 1.55, 0));
    g.add(part(boxG(0.1, 0.7, 0.1), chrome, 1.0, 1.95, 0, 0, 0, -0.2));
    g.add(part(boxG(0.1, 0.1, 1.0), chrome, 1.07, 2.3, 0));
    g.add(part(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff6d8', emissiveIntensity: 0.4 }), 1.15, 2.05, 0));
    const wheelG = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 14); wheelG.rotateX(Math.PI / 2);
    const wheels = [part(wheelG, dark, 0.9, 0.36, 0), part(wheelG, dark, -0.75, 0.36, 0)]; wheels.forEach((w) => g.add(w));
    g.scale.setScalar(1.3);
    g.userData.wheels = wheels; g.userData.radius = 0.36 * 1.3; g.userData.size = [2.2 * 1.3, 2.4 * 1.3, 1.0 * 1.3];
    return tag(g, 'scooter');
  }
  // fruit cart: wooden bed piled with oranges, lemons and apples, two big wheels, striped canopy (faces +x)
  function fruitCart() {
    const g = new THREE.Group(), wood = once('mplank', () => new THREE.MeshStandardMaterial({ map: tex.planks(), roughness: 0.8 })), dark = RT.plastic('#4a3020');
    g.add(part(boxG(3.6, 0.9, 2.0), wood, 0, 1.55, 0));
    for (const s of [-1, 1]) g.add(part(boxG(0.12, 3.0, 0.12), dark, s * 1.65, 3.0, 0.9), part(boxG(0.12, 3.0, 0.12), dark, s * 1.65, 3.0, -0.9));
    const canopy = new THREE.MeshStandardMaterial({ map: stripes('#2f7a55', '#f6efe2', 10), roughness: 0.8 });
    g.add(part(boxG(4.0, 0.12, 2.5), canopy, 0, 4.5, 0, 0.12, 0, 0));
    const wheelG = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 14); wheelG.rotateX(Math.PI / 2);
    for (const s of [-1, 1]) g.add(part(wheelG, dark, 0.3, 0.85, s * 1.12));
    g.add(part(boxG(1.4, 0.12, 0.12), dark, -2.4, 1.3, 0.6), part(boxG(1.4, 0.12, 0.12), dark, -2.4, 1.3, -0.6));
    const fruit = [['#ff9a1f', 0.3], ['#f5e04a', 0.27], ['#d83a2e', 0.28], ['#7cc04a', 0.27]], r = RT.rng(77), ball = new THREE.SphereGeometry(1, 10, 8);
    fruit.forEach(([c, s], q) => {
      const items = []; for (let i = 0; i < 16; i++) items.push({ geo: ball, matrix: M(-1.4 + (q % 2) * 1.5 + r() * 1.2, 2.05 + r() * 0.35, -0.8 + Math.floor(q / 2) * 0.85 + r() * 0.7, 0, 0, 0, s) });
      g.add(RT.mesh(RT.mergeGeometries(items), RT.plastic(c, { roughness: 0.5 })));
    });
    g.userData.size = [4.0, 4.6, 2.5];
    return tag(g, 'fruitCart');
  }
  // a wooden crate (breakable)
  function crate(s = 1.4) {
    const wood = once('mcrate', () => new THREE.MeshStandardMaterial({ map: tex.planks('#b98a55'), roughness: 0.8 })), dark = RT.plastic('#6b4628');
    const g = new THREE.Group(); g.add(part(boxG(s, s, s), wood, 0, s / 2, 0));
    for (const y of [0.08, s - 0.08]) for (const sz of [-1, 1]) g.add(part(boxG(s + 0.04, 0.16, 0.06), dark, 0, y, sz * (s / 2 + 0.01)));
    g.add(part(boxG(s * 1.3, 0.14, 0.06), dark, 0, s / 2, s / 2 + 0.02, 0, 0, Math.atan2(s, s)));
    g.userData.size = [s, s, s]; return tag(g, 'crate');
  }
  function barrel() {
    const g = new THREE.Group(); g.add(part(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 14), RT.plastic('#9b6b3e', { roughness: 0.7 }), 0, 0.95, 0));
    for (const y of [0.35, 1.55]) g.add(part(new THREE.CylinderGeometry(0.79, 0.79, 0.12, 14), RT.plastic('#3a3a3a', { metalness: 0.4 }), 0, y, 0));
    g.userData.size = [1.5, 1.9, 1.5]; return tag(g, 'barrel');
  }
  // bistro chair (breakable)
  function chair(color = '#2f3b48') {
    const g = new THREE.Group(), m = RT.plastic(color, { roughness: 0.4, metalness: 0.2 }), seat = RT.plastic('#c79a5b', { roughness: 0.6 });
    g.add(part(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 14), seat, 0, 1.45, 0));
    for (const [x, z] of [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) g.add(part(boxG(0.08, 1.45, 0.08), m, x, 0.72, z));
    g.add(part(boxG(0.08, 1.2, 0.9), m, -0.45, 2.1, 0), part(boxG(0.1, 0.5, 0.95), seat, -0.47, 2.35, 0));
    g.userData.size = [1.1, 2.7, 1.1]; return tag(g, 'chair');
  }
  // café table with chairs and a striped umbrella → { group, pieces: [table, chairs…, umbrella] }
  function cafeSet(color = '#c8372d', chairs = 3) {
    const g = new THREE.Group(), iron = mat.iron();
    const table = new THREE.Group(); table.add(part(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 18), RT.plastic('#f3efe6', { roughness: 0.4 }), 0, 2.0, 0), part(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), iron, 0, 1.0, 0), part(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 14), iron, 0, 0.06, 0));
    tag(table, 'table'); g.add(table);
    const pieces = [table];
    for (let i = 0; i < chairs; i++) { const a = (i / chairs) * Math.PI * 2 + 0.4, c = chair(); c.position.set(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75); c.rotation.y = -a + Math.PI; g.add(c); pieces.push(c); }
    const um = new THREE.Group(), cone = new THREE.ConeGeometry(3.2, 1.1, 10, 1, true);
    um.add(part(cone, new THREE.MeshStandardMaterial({ map: stripes(color, '#f6efe2', 10), roughness: 0.8, side: THREE.DoubleSide }), 0, 5.4, 0));
    um.add(part(new THREE.CylinderGeometry(0.07, 0.07, 5.5, 8), RT.plastic('#e9e2d4'), 0, 2.75, 0)); tag(um, 'umbrella'); g.add(um); pieces.push(um);
    g.userData.pieces = pieces; return g;
  }
  // white globe street lamp (seaside promenade): 1 or 3 globes. lamp.userData.globes → glow at night (setLit)
  function globeLamp(o = {}) {
    const g = new THREE.Group(), iron = RT.plastic(o.color || '#24453b', { roughness: 0.45, metalness: 0.35 }), n = o.globes || 1, H = o.height || 7.5;
    const globeM = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#ffe6b0', emissiveIntensity: 0.25, roughness: 0.25 });
    g.add(part(new THREE.CylinderGeometry(0.55, 0.7, 1.0, 12), iron, 0, 0.5, 0), part(new THREE.CylinderGeometry(0.14, 0.2, H, 10), iron, 0, H / 2, 0));
    const globes = [];
    const addGlobe = (x, y) => { const b = part(new THREE.SphereGeometry(0.62, 16, 12), globeM, x, y, 0); globes.push(b); g.add(b); g.add(part(new THREE.CylinderGeometry(0.25, 0.3, 0.3, 10), iron, x, y - 0.6, 0)); };
    if (n === 1) addGlobe(0, H + 0.6);
    else { g.add(part(boxG(2.8, 0.14, 0.14), iron, 0, H - 0.1, 0)); addGlobe(0, H + 0.6); addGlobe(-1.35, H + 0.55); addGlobe(1.35, H + 0.55); }
    g.userData.globes = globes; g.userData.size = [1.4, H + 1.2, 1.4];
    g.userData.setLit = (on) => { globeM.emissiveIntensity = on ? 1.6 : 0.25; globes.forEach((b) => (b.userData.glow = !!on)); };
    return tag(g, 'lamp');
  }
  // old town wall lantern on a black post
  function lanternPost() {
    const g = new THREE.Group(), iron = mat.iron(), lit = new THREE.MeshStandardMaterial({ color: '#fff1c8', emissive: '#ffd27a', emissiveIntensity: 0.3 });
    g.add(part(new THREE.CylinderGeometry(0.15, 0.22, 6, 8), iron, 0, 3, 0), part(boxG(0.8, 1.0, 0.8), lit, 0, 6.5, 0), part(new THREE.ConeGeometry(0.7, 0.5, 4), iron, 0, 7.25, 0, 0, Math.PI / 4, 0), part(boxG(0.9, 0.1, 0.9), iron, 0, 6.0, 0));
    g.userData.size = [1, 7.5, 1]; return tag(g, 'lamp');
  }
  function bollard() { const g = new THREE.Group(), m = RT.plastic('#cfc3ad', { roughness: 0.8 }); g.add(part(new THREE.CylinderGeometry(0.32, 0.4, 1.1, 10), m, 0, 0.55, 0), part(new THREE.SphereGeometry(0.34, 10, 8), m, 0, 1.15, 0)); return tag(g, 'bollard'); }
  function bench() {
    const g = new THREE.Group(), wood = RT.plastic('#9a6a3c', { roughness: 0.7 }), iron = mat.iron();
    for (let i = 0; i < 3; i++) g.add(part(boxG(4, 0.14, 0.32), wood, 0, 1.2, -0.4 + i * 0.4));
    for (let i = 0; i < 2; i++) g.add(part(boxG(4, 0.32, 0.12), wood, 0, 1.75 + i * 0.45, -0.68, -0.15, 0, 0));
    for (const x of [-1.7, 1.7]) g.add(part(boxG(0.14, 1.2, 1.1), iron, x, 0.6, -0.1), part(boxG(0.14, 1.0, 0.14), iron, x, 1.9, -0.7));
    g.userData.size = [4, 2.5, 1.3]; return tag(g, 'bench');
  }
  // a stone planter with a round bush
  function planter(w = 2.2) {
    const g = new THREE.Group(); g.add(part(boxG(w, 1.2, w), RT.plastic('#d9ccb4', { roughness: 0.8 }), 0, 0.6, 0), part(new THREE.SphereGeometry(w * 0.55, 10, 8), RT.plastic('#3f8a3a', { roughness: 0.8 }), 0, 1.7, 0));
    g.userData.size = [w, 2.6, w]; return tag(g, 'planter');
  }
  // a big hanging blade sign on two iron brackets (CH1: it falls). The pivot is at the top bracket.
  function bladeSign(text, o = {}) {
    const g = new THREE.Group(), h = o.h || 12, w = o.w || 3.2;
    const t = RT.canvasTexture(128, 512, (c) => {
      c.fillStyle = o.bg || '#1d3b5c'; c.fillRect(0, 0, 128, 512); c.strokeStyle = o.fg || '#ffd45a'; c.lineWidth = 8; c.strokeRect(8, 8, 112, 496);
      c.fillStyle = o.fg || '#ffd45a'; c.font = '900 64px Montserrat, Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const letters = [...text]; letters.forEach((ch, i) => c.fillText(ch, 64, 40 + (i + 0.5) * (432 / letters.length)));
    });
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.15 }), side = RT.plastic(o.bg || '#1d3b5c');
    // the blade sticks out of the wall (local +z) and hangs down; its two big faces (±x) carry the text
    const sign = new THREE.Mesh(boxG(0.4, h, w), [face, face, side, side, side, side]);
    sign.position.set(0, -h / 2 - 0.4, w / 2 + 0.6); sign.castShadow = true;
    g.add(sign);
    const iron = mat.iron(); for (const y of [-0.3, -h + 0.5]) g.add(part(boxG(0.2, 0.2, w + 1.0), iron, 0, y, w / 2 + 0.2));
    g.userData.sign = sign; return tag(g, 'bigSign');
  }

  // =================================================================================
  // TREES (instanced): Mediterranean stone pines (flat umbrella crowns), cypresses, palms
  // =================================================================================
  function trees(group, list, kind = 'pine', o = {}) {
    if (!list.length) return;
    const r = RT.rng(o.seed || 5), dm = new THREE.Object3D(), c = new THREE.Color();
    let trunkG, crownG, trunkC = '#7a5236';
    if (kind === 'pine') {
      trunkG = RT.mergeGeometries([{ geo: new THREE.CylinderGeometry(0.32, 0.5, 9, 7), matrix: M(0.4, 4.5, 0, 0, 0, -0.09) }, { geo: new THREE.CylinderGeometry(0.2, 0.3, 3.2, 6), matrix: M(1.6, 9.3, 0, 0, 0, -0.7) }, { geo: new THREE.CylinderGeometry(0.2, 0.3, 3.0, 6), matrix: M(-0.4, 9.4, 0.3, 0.3, 0, 0.6) }]);
      crownG = RT.mergeGeometries([[0.8, 10.6, 0, 3.6], [3.0, 10.3, 0.6, 2.4], [-1.6, 10.2, -0.6, 2.4], [0.8, 10.4, 2.2, 2.2], [0.6, 10.2, -2.2, 2.2]].map(([x, y, z, s]) => ({ geo: new THREE.SphereGeometry(1, 10, 7), matrix: M(x, y, z, 0, 0, 0, s, s * 0.42, s) })));
    } else if (kind === 'cypress') {
      trunkG = new THREE.CylinderGeometry(0.22, 0.3, 1.4, 6); trunkG.translate(0, 0.7, 0);
      crownG = new THREE.SphereGeometry(1, 10, 10); crownG.scale(1.25, 5.2, 1.25); crownG.translate(0, 5.6, 0);
    } else {   // palm: curved trunk + 9 drooping fronds
      const segs = []; for (let i = 0; i < 7; i++) segs.push({ geo: new THREE.CylinderGeometry(0.34 - i * 0.02, 0.4 - i * 0.02, 1.5, 7), matrix: M(Math.pow(i / 6, 2) * 1.2, 0.75 + i * 1.45, 0, 0, 0, -0.03 * i) });
      trunkG = RT.mergeGeometries(segs); trunkC = '#9b7a52';
      const fr = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; fr.push({ geo: boxG(4.2, 0.08, 0.9), matrix: new THREE.Matrix4().makeTranslation(1.2, 10.3, 0).multiply(M(0, 0, 0, 0, a, 0)).multiply(M(2.0, -0.5, 0, 0, 0, -0.42)) }); }
      fr.push({ geo: new THREE.SphereGeometry(0.6, 8, 6), matrix: M(1.2, 10.3, 0) });
      crownG = RT.mergeGeometries(fr);
    }
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: trunkC }), list.length);
    const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
    list.forEach((p, i) => {
      const s = (o.scale || 1) * ({ pine: 2.0, palm: 1.35, cypress: 1.7 }[kind] || 1) * (0.85 + r() * 0.35);   // trees tower over people
      dm.position.set(p[0], p[1] || 0, p[2]); dm.rotation.set(0, r() * 6.28, 0); dm.scale.set(s, s * (0.92 + r() * 0.16), s); dm.updateMatrix();
      trunks.setMatrixAt(i, dm.matrix); crowns.setMatrixAt(i, dm.matrix);
      if (kind === 'cypress') c.setHSL(0.36, 0.45, 0.2 + r() * 0.05); else if (kind === 'palm') c.setHSL(0.26 + r() * 0.04, 0.55, 0.33 + r() * 0.06); else c.setHSL(0.27 + r() * 0.05, 0.42, 0.3 + r() * 0.06);
      crowns.setColorAt(i, c);
    });
    crowns.instanceColor.needsUpdate = true;
    for (const m of [trunks, crowns]) { m.castShadow = m.receiveShadow = true; group.add(m); }
  }

  // =================================================================================
  // ANIMALS: a pigeon flock (instanced) and seagulls
  // =================================================================================
  // flock.update(t, { fly: 0..1 }) : 0 = pecking on the ground, 1 = flown up and away (scatter toward +dir)
  function pigeons(group, n, cx, cz, radius, seed = 3) {
    const bodyG = RT.mergeGeometries([{ geo: new THREE.SphereGeometry(0.35, 8, 6), matrix: M(0, 0.42, 0, 0, 0, 0, 1.25, 0.9, 0.85) }, { geo: new THREE.SphereGeometry(0.2, 8, 6), matrix: M(0.38, 0.72, 0) }, { geo: boxG(0.4, 0.06, 0.3), matrix: M(-0.48, 0.5, 0, 0, 0, 0.3) }]);
    const wingG = boxG(0.45, 0.05, 0.6); wingG.translate(0, 0, 0.3);
    const mBody = new THREE.MeshLambertMaterial({ color: '#8d93a0' }), body = new THREE.InstancedMesh(bodyG, mBody, n);
    const wings = new THREE.InstancedMesh(wingG, new THREE.MeshLambertMaterial({ color: '#6f7583' }), n * 2);
    const r = RT.rng(seed), birds = [];
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * radius; birds.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, yaw: r() * 6.28, ph: r() * 6.28, vx: Math.cos(a) * 0.6 + (r() - 0.5) * 0.4, vz: Math.sin(a) * 0.6 + (r() - 0.5) * 0.4 }); }
    body.castShadow = true; group.add(body, wings);
    const dm = new THREE.Object3D(), wm = new THREE.Object3D();
    const api = {
      body, wings,
      update(t, o = {}) {
        const fly = o.fly || 0;
        birds.forEach((b, i) => {
          const up = fly * (14 + 6 * Math.sin(b.ph)), out = fly * 22;
          dm.position.set(b.x + b.vx * out, up, b.z + b.vz * out); dm.scale.setScalar(0.6);   // pigeon size vs a 5-unit character
          dm.rotation.set(0, fly > 0 ? Math.atan2(-b.vz, b.vx) : b.yaw, 0);
          const peck = fly > 0 ? 0 : Math.max(0, Math.sin(t * 3 + b.ph)) * 0.5; dm.rotation.z = -peck; dm.updateMatrix(); body.setMatrixAt(i, dm.matrix);
          const flap = fly > 0 ? Math.sin(t * 28 + b.ph) * 0.9 : -0.1;
          for (const s of [-1, 1]) { wm.position.set(0, 0.55, 0); wm.rotation.set(s * flap, 0, 0); wm.scale.set(1, 1, s); wm.updateMatrix(); wm.matrix.premultiply(dm.matrix); wings.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), wm.matrix); }
        });
        body.instanceMatrix.needsUpdate = true; wings.instanceMatrix.needsUpdate = true;
      },
    };
    api.update(0); return api;
  }
  // a seagull (faces +x); gull.update(t) flaps. gull.userData.feet is where a stolen hat hangs.
  function seagull(s = 1) {
    const g = new THREE.Group(), white = RT.plastic('#f7f7f4', { roughness: 0.6 }), grey = RT.plastic('#a9b1bb', { roughness: 0.6 }), black = RT.plastic('#222'), beak = RT.plastic('#f2b630');
    g.add(part(new THREE.SphereGeometry(0.5, 10, 8), white, 0, 0, 0)); g.children[0].scale.set(1.6, 0.8, 0.8);
    g.add(part(new THREE.SphereGeometry(0.32, 10, 8), white, 0.75, 0.25, 0), part(new THREE.ConeGeometry(0.1, 0.4, 6), beak, 1.1, 0.22, 0, 0, 0, -Math.PI / 2));
    g.add(part(new THREE.SphereGeometry(0.05, 6, 4), black, 0.92, 0.34, 0.2), part(new THREE.SphereGeometry(0.05, 6, 4), black, 0.92, 0.34, -0.2));
    g.add(part(boxG(0.6, 0.06, 0.5), grey, -0.85, 0.05, 0));
    const wings = [];
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.add(part(boxG(0.9, 0.06, 1.3), grey, 0, 0, sd * 0.65), part(boxG(0.7, 0.06, 0.6), black, -0.1, 0, sd * 1.5));
      w.position.set(0, 0.15, sd * 0.25); g.add(w); wings.push([w, sd]);
    }
    const feet = new THREE.Object3D(); feet.position.set(0, -0.5, 0); g.add(feet);
    g.scale.setScalar(s); g.userData.feet = feet;
    g.update = (t, speed = 1) => { const a = Math.sin(t * 11 * speed) * 0.75; wings.forEach(([w, sd]) => (w.rotation.x = sd * a)); };
    return g;
  }

  // =================================================================================
  // SKY, SEA, VOLCANO, DISTANT CITY
  // =================================================================================
  // painted anime clouds: flat white puffs with a soft blue-grey underside and crisp edges
  function cloudTex(seed) {
    return once('cloud' + seed, () => {
      const t = RT.canvasTexture(512, 256, (g) => {
        const r = RT.rng(seed), puffs = [];
        const n = 9 + Math.floor(r() * 6);
        for (let i = 0; i < n; i++) { const x = 70 + (i / (n - 1)) * 372 + (r() - 0.5) * 30, rad = 34 + r() * 52 * Math.sin(Math.PI * (0.15 + 0.7 * i / (n - 1))); puffs.push([x, 196 - rad * 0.7 - r() * 30, rad]); }
        for (let i = 0; i < 4; i++) puffs.push([170 + r() * 170, 110 - r() * 40, 40 + r() * 34]);
        const draw = (dx, dy, col) => { g.fillStyle = col; g.beginPath(); for (const [x, y, rr] of puffs) { g.moveTo(x + dx + rr, y + dy); g.arc(x + dx, y + dy, rr, 0, Math.PI * 2); } g.fill(); g.fillRect(70 + dx, 150 + dy, 372, 46); };
        g.save(); g.beginPath(); g.rect(0, 0, 512, 205); g.clip();
        draw(0, 0, '#bfd3ee');                 // shadow (underside)
        draw(-6, -16, '#f4f8ff');              // lit body
        draw(-14, -30, '#ffffff');             // highlight
        g.restore();
      });
      return t;
    });
  }
  // a ring of cloud billboards around (cx, cz). o: { count, radius, minY, maxY, seed, opacity }
  function clouds(group, o = {}) {
    const r = RT.rng(o.seed || 9), n = o.count || 16, out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3, d = (o.radius || 1000) * (0.75 + r() * 0.3);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(1 + (i % 6)), fog: false, toneMapped: false, transparent: true, depthWrite: false, opacity: o.opacity ?? 1, color: o.tint || '#ffffff' }));
      const w = (o.size || 300) * (0.7 + r() * 0.7); sp.scale.set(w, w * 0.5, 1);
      sp.position.set((o.cx || 0) + Math.cos(a) * d, (o.minY || 90) + r() * ((o.maxY || 330) - (o.minY || 90)), (o.cz || 0) + Math.sin(a) * d);
      sp.renderOrder = -5; group.add(sp); out.push(sp);
    }
    return out;
  }
  // tileable wave normal map (sum of sines with whole-number frequencies)
  function waveNormals() {
    return once('wavesN', () => {
      const N = 256, c = RT.canvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), hgt = new Float32Array(N * N), rr = RT.rng(42);
      const waves = Array.from({ length: 10 }, () => [1 + Math.floor(rr() * 7), Math.floor(rr() * 7) - 3, rr() * 6.28, 0.4 + rr()]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let h = 0; for (const [fx, fy, ph, a] of waves) h += a * Math.sin(((fx * x + fy * y) / N) * Math.PI * 2 + ph) / fx; hgt[y * N + x] = h; }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const hx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)], hy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x];
        const v = new THREE.Vector3(-hx * 6, -hy * 6, 1).normalize(), i = (y * N + x) * 4;
        img.data[i] = (v.x * 0.5 + 0.5) * 255; img.data[i + 1] = (v.y * 0.5 + 0.5) * 255; img.data[i + 2] = (v.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    });
  }
  // the sea: a huge glossy plane with moving waves (sun glitter comes from the normal map). sea.update(t)
  function sea(o = {}) {
    const size = o.size || 6000, n1 = waveNormals(), n2 = n1.clone(); n2.needsUpdate = true;
    n1.repeat.set(size / 22, size / 22);
    const m = new THREE.MeshStandardMaterial({ color: o.color || '#1d78b8', roughness: o.roughness ?? 0.16, metalness: 0.15, normalMap: n1, normalScale: new THREE.Vector2(0.55, 0.55) });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(o.x || 0, o.y || 0, o.z || 0); mesh.receiveShadow = true; mesh.name = 'sea';
    mesh.update = (t) => { n1.offset.set(t * 0.012, t * 0.02); };
    return mesh;
  }
  // the volcano: wide slopes (green at the bottom, rocky brown/grey at the top), a crater and a lazy smoke plume
  function volcano(o = {}) {
    const g = new THREE.Group(), R = o.radius || 420, H = o.height || 300, pts = [];
    for (let i = 0; i <= 24; i++) { const p = i / 24, r = R * Math.pow(1 - p, 1.6) + R * 0.1, y = H * p; pts.push(new THREE.Vector2(r, y)); }   // concave slopes, steep near the top
    pts.push(new THREE.Vector2(R * 0.07, H * 0.94));
    const geo = new THREE.LatheGeometry(pts, 48), P = geo.attributes.position, rr = RT.rng(3);
    const ridge = Array.from({ length: 48 }, () => 0.9 + rr() * 0.2);
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), a = Math.atan2(z, x), k = ridge[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 47.999)]; P.setX(i, x * k); P.setZ(i, z * k); }
    geo.computeVertexNormals();
    const t = RT.canvasTexture(64, 256, (c) => { const gr = c.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#6f8a4c'); gr.addColorStop(0.12, '#7c7656'); gr.addColorStop(0.4, '#7a6452'); gr.addColorStop(0.75, '#655a56'); gr.addColorStop(0.95, '#4a4140'); gr.addColorStop(1, '#2e2826'); c.fillStyle = gr; c.fillRect(0, 0, 64, 256); speckle(c, 64, 256, 500, 8, 0.15, 0.05); });
    const m = new THREE.MeshLambertMaterial({ map: t }); g.add(new THREE.Mesh(geo, m));
    const smoke = [];
    for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(3 + (i % 3)), color: '#e9e3dc', transparent: true, depthWrite: false, opacity: 0.75 })); sp.userData.k = i; g.add(sp); smoke.push(sp); }
    g.position.set(o.x || 0, o.y || 0, o.z || 0);
    g.update = (t) => smoke.forEach((sp) => { const k = sp.userData.k, life = ((t * 0.02 + k / 7) % 1); sp.position.set(life * R * 0.5, H * 0.95 + life * H * 0.6, life * R * 0.1); const s = R * (0.25 + life * 0.5); sp.scale.set(s, s * 0.5, 1); sp.material.opacity = 0.7 * (1 - life); });
    g.update(0);
    return g;
  }
  // a hillside packed with small colorful houses with terracotta roofs (instanced; far background)
  //   o: { x, z, w, d, rise, count, seed, yaw, night }  rise = how much the hill climbs from front to back
  //   The hill's FRONT edge is at (x, z) and it climbs away along local +z: yaw 0 → toward +z, yaw π → toward −z.
  function cityHill(o = {}) {
    const g = new THREE.Group(), n = o.count || 260, r = RT.rng(o.seed || 12);
    const wallG = boxG(1, 1, 1); wallG.translate(0, 0.5, 0);
    const roofG = new THREE.ConeGeometry(0.75, 0.35, 4); roofG.rotateY(Math.PI / 4); roofG.translate(0, 1.17, 0);
    // night: lit windows (a grid of warm squares, some dark) glowing from the walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    if (o.night) {
      const win = RT.canvasTexture(64, 64, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); const rr = RT.rng(o.seed || 12); for (let y = 6; y < 60; y += 14) for (let x = 6; x < 60; x += 14) if (rr() < 0.45) { g.fillStyle = rr() < 0.8 ? '#ffc76a' : '#a9c4ff'; g.fillRect(x, y, 6, 7); } });
      wallMat.emissive = new THREE.Color('#ffffff'); wallMat.emissiveMap = win; wallMat.emissiveIntensity = 0.9; wallMat.map = null;
    }
    const walls = new THREE.InstancedMesh(wallG, wallMat, n), roofs = new THREE.InstancedMesh(roofG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    const dm = new THREE.Object3D(), c = new THREE.Color(), W = o.w || 600, Dd = o.d || 220, rise = o.rise ?? 90;
    for (let i = 0; i < n; i++) {
      const u = r() - 0.5, v = r(), x = u * W, z = v * Dd, y = Math.pow(v, 1.3) * rise * (1 - Math.abs(u) * 0.6);
      const sx = 10 + r() * 14, sz = 10 + r() * 12, sy = 10 + r() * 20;
      dm.position.set(x, y - 2, z); dm.rotation.set(0, (r() - 0.5) * 0.3, 0); dm.scale.set(sx, sy, sz); dm.updateMatrix(); walls.setMatrixAt(i, dm.matrix); roofs.setMatrixAt(i, dm.matrix);
      c.set(WALLS[Math.floor(r() * WALLS.length)]); if (o.night) c.multiplyScalar(0.3); walls.setColorAt(i, c); c.set(ROOFS[Math.floor(r() * ROOFS.length)]); if (o.night) c.multiplyScalar(0.3); roofs.setColorAt(i, c);
    }
    walls.instanceColor.needsUpdate = roofs.instanceColor.needsUpdate = true;
    const hill = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.3, Dd * 1.4, 24, 12), new THREE.MeshLambertMaterial({ color: o.night ? '#1d2218' : '#7f8f56' }));
    hill.rotation.x = -Math.PI / 2; const P = hill.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), yv = -P.getY(i), v = RT.clamp(yv / Dd + 0.5, 0, 1.4); /* same v as the houses: 0 = front edge, 1 = back */ P.setZ(i, Math.pow(Math.min(v, 1), 1.3) * rise * (1 - Math.min(1, Math.abs(x) / W) * 0.6) - 3 + (v > 1 ? (v - 1) * rise : 0)); }
    hill.geometry.computeVertexNormals(); hill.position.z = Dd * 0.5;
    g.add(hill, walls, roofs);
    g.position.set(o.x || 0, o.y || 0, o.z || 0); g.rotation.y = o.yaw || 0;
    return g;
  }

  RT.kit = {
    WALLS, SHUTTERS, AWNINGS, ROOFS, BAY, FLOOR, GROUND,
    Batch, placer, tiledBox, floorGeo, uvScale, tex, mat, stripes,
    building, addFlowers, car, scooter, fruitCart, crate, barrel, chair, cafeSet, globeLamp, lanternPost, bollard, bench, planter, bladeSign,
    trees, pigeons, seagull, clouds, cloudTex, sea, waveNormals, volcano, cityHill, tag, part,
  };
})();
