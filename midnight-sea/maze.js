// =====================================================================================
// maze.js: THE CORN MAZE set (Harrow Farm, on the hill above Hollow Bay). A foggy autumn afternoon.
//   const maze = RT.maze.build(scene, env, { seed });
//   maze.spots      ENTRANCE (outside the south opening), CENTER (the scarecrow's pole), EXIT (north opening), ROAD
//   maze.cell(i, j) world centre of a cell (i = column west→east, j = row north→south, 0..N-1)
//   maze.route(a, b) list of world points from cell a [i, j] to cell b through the open passages
//   maze.ground(x, z) floor height (flat: 0) · maze.update(t) drifting mist
// The walls are rows of instanced corn stalks (one draw call); the floor has darker soil along the walls.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT;
  const N = 10, CELL = 3.4, HALF = (N * CELL) / 2, CORN_H = 3.1;

  // a perfect maze (seeded depth-first carve), a 2 × 2 clearing in the middle, an entrance (south) and an exit (north)
  function generate(seed) {
    const r = RT.rng(seed);
    const Hw = [], Vw = [];          // Hw[j][i]: wall along the NORTH edge of row j (j = 0..N), Vw[j][i]: wall along the WEST edge of column i (i = 0..N)
    for (let j = 0; j <= N; j++) { Hw.push(Array(N).fill(true)); }
    for (let j = 0; j < N; j++) { Vw.push(Array(N + 1).fill(true)); }
    const seen = Array.from({ length: N }, () => Array(N).fill(false)), stack = [[0, 0]]; seen[0][0] = true;
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen[b][a]);
      if (!nb.length) { stack.pop(); continue; }
      const [a, b] = nb[Math.floor(r() * nb.length)];
      if (a === i + 1) Vw[j][i + 1] = false; if (a === i - 1) Vw[j][i] = false; if (b === j + 1) Hw[j + 1][i] = false; if (b === j - 1) Hw[j][i] = false;
      seen[b][a] = true; stack.push([a, b]);
    }
    Vw[4][5] = false; Vw[5][5] = false; Hw[5][4] = false; Hw[5][5] = false;     // the clearing (cells 4–5 × 4–5)
    Hw[N][4] = false;                                                             // entrance (south, column 4)
    Hw[0][7] = false;                                                             // exit (north, column 7) → the road
    return { Hw, Vw };
  }

  // one corn stalk: stem, drooping leaves, a tassel, a cob (merged; the instances vary size, tilt and colour)
  function stalkGeometry() {
    const P = [];
    P.push({ geo: new THREE.CylinderGeometry(0.022, 0.036, CORN_H, 5, 1), matrix: RT.mat4(0, CORN_H / 2, 0) });
    const leaf = (len, wid) => {
      const g = new THREE.PlaneGeometry(wid, 1, 1, 5), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = p.getY(i) + 0.5, x = p.getX(i) * (1 - t * 0.75);
        p.setXYZ(i, x, Math.sin(t * 1.25) * len * 0.75 - t * t * len * 0.22, (1 - Math.cos(t * 1.25)) * len * 0.75);
      }
      g.computeVertexNormals(); return g;
    };
    for (let k = 0; k < 7; k++) {
      const h = 0.45 + k * 0.36, a = k * 2.4;
      P.push({ geo: leaf(0.75 + (k % 3) * 0.12 - k * 0.03, 0.11), matrix: RT.mat4(0, h, 0, 0, a, 0) });
    }
    for (let k = 0; k < 4; k++) P.push({ geo: new THREE.ConeGeometry(0.012, 0.42, 3), matrix: RT.mat4(Math.sin(k * 1.6) * 0.06, CORN_H + 0.16, Math.cos(k * 1.6) * 0.06, Math.cos(k * 1.6) * 0.45, 0, -Math.sin(k * 1.6) * 0.45) });
    P.push({ geo: new THREE.CylinderGeometry(0.05, 0.062, 0.34, 6), matrix: RT.mat4(0.08, 1.55, 0, 0, 0, -0.5) });
    return RT.mergeGeometries(P);
  }

  function build(scene, env, o = {}) {
    const G = new THREE.Group(); G.name = 'CornMaze'; scene.add(G);
    const { Hw, Vw } = generate(o.seed || 12);
    const r = RT.rng((o.seed || 12) * 7 + 1);
    const X = (i) => -HALF + (i + 0.5) * CELL, Z = (j) => -HALF + (j + 0.5) * CELL;

    // ---- the walls: list every wall segment, then plant corn along it (3 staggered rows) ----
    const segs = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) if (Hw[j][i]) segs.push([-HALF + i * CELL, -HALF + j * CELL, -HALF + (i + 1) * CELL, -HALF + j * CELL]);
    for (let j = 0; j < N; j++) for (let i = 0; i <= N; i++) if (Vw[j][i]) segs.push([-HALF + i * CELL, -HALF + j * CELL, -HALF + i * CELL, -HALF + (j + 1) * CELL]);
    const spotsList = [];
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
      for (let d = -0.45; d <= len + 0.45; d += 0.3) for (const off of [-0.32, 0, 0.32]) {
        const jx = (r() - 0.5) * 0.14, jz = (r() - 0.5) * 0.14;
        spotsList.push([x0 + ux * d - uz * off + jx, z0 + uz * d + ux * off + jz]);
      }
    }
    // a band of corn all round the outside so the maze sits in a field (thinner further out: the fog hides it)
    for (let k = 0; k < 2600; k++) {
      const a = r() * Math.PI * 2, rad = HALF + 1.2 + Math.pow(r(), 1.6) * 26, x = Math.cos(a) * rad * 1.05, z = Math.sin(a) * rad;
      if (Math.max(Math.abs(x), Math.abs(z)) < HALF + 0.9) continue;
      if (z < -HALF - 2.4 && z > -HALF - 8.5) continue;                 // keep the road clear
      if (Math.abs(x - X(4)) < 2.2 && z > HALF) continue;               // and the way in
      spotsList.push([x, z]);
    }
    const stalk = stalkGeometry();
    const cornM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, side: THREE.DoubleSide });
    const corn = new THREE.InstancedMesh(stalk, cornM, spotsList.length);
    const cols = ['#c9ae6b', '#b69c5e', '#a8a05e', '#d4bd82', '#9a9156', '#bfa86a'].map((c) => new THREE.Color(c));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    spotsList.forEach(([x, z], k) => {
      const s = 0.9 + r() * 0.2;
      e.set((r() - 0.5) * 0.12, r() * Math.PI * 2, (r() - 0.5) * 0.12); q.setFromEuler(e);
      sv.set(s, s * (0.92 + r() * 0.2), s); pv.set(x, 0, z);
      m.compose(pv, q, sv); corn.setMatrixAt(k, m); corn.setColorAt(k, cols[Math.floor(r() * cols.length)]);
    });
    corn.instanceMatrix.needsUpdate = true; if (corn.instanceColor) corn.instanceColor.needsUpdate = true;
    corn.frustumCulled = false; G.add(corn);

    // ---- the floor: dirt paths, darker soil and straw under the walls (soft "occlusion"), then the stubble field ----
    const FS = HALF + 2, TEX = 2048, px = (v) => ((v + FS) / (2 * FS)) * TEX;
    const floorTex = RT.canvasTexture(TEX, TEX, (g) => {
      g.fillStyle = '#7d6a4e'; g.fillRect(0, 0, TEX, TEX);
      const rr = RT.rng(3);
      for (let k = 0; k < 26000; k++) { g.fillStyle = rr() < 0.5 ? 'rgba(60,46,30,0.25)' : 'rgba(150,130,95,0.22)'; g.fillRect(rr() * TEX, rr() * TEX, 2 + rr() * 5, 2 + rr() * 5); }
      g.lineCap = 'round';
      for (const [x0, z0, x1, z1] of segs) {                         // soil under the corn: dark, blurred toward the path
        for (const [w, a] of [[150, 0.18], [100, 0.22], [64, 0.35]]) { g.strokeStyle = `rgba(40,30,18,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(px(x0), px(z0)); g.lineTo(px(x1), px(z1)); g.stroke(); }
      }
      for (let k = 0; k < 2400; k++) {                               // straw bits
        g.strokeStyle = `rgba(214,190,120,${0.25 + rr() * 0.35})`; g.lineWidth = 2; const x = rr() * TEX, y = rr() * TEX, a = rr() * 3.14, l = 6 + rr() * 14;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    });
    floorTex.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FS * 2, FS * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#8a7d5c', roughness: 1 }));
    field.rotation.x = -Math.PI / 2; field.position.y = -0.02; field.receiveShadow = true; G.add(field);

    // ---- the road (north) with a fence, the entrance (south) with a sign, hay bales and pumpkins ----
    const wood = RT.plastic('#6a523a', { roughness: 0.95 }), woodD = RT.plastic('#4a3a2a', { roughness: 0.95 });
    const RZ = -HALF - 5.2;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 4.6), new THREE.MeshStandardMaterial({ color: '#8f897d', roughness: 1 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, RZ); road.receiveShadow = true; G.add(road);
    for (let x = -60; x <= 60; x += 2.4) {
      if (Math.abs(x - X(7)) < 1.4) continue;
      const post = RT.mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), wood); post.position.set(x, 0.65, RZ + 2.6); G.add(post);
      for (const y of [0.45, 0.95]) { const rail = RT.mesh(new THREE.BoxGeometry(2.4, 0.1, 0.06), wood); rail.position.set(x + 1.2, y, RZ + 2.6); G.add(rail); }
    }
    const signTex = RT.canvasTexture(512, 192, (g) => {
      g.fillStyle = '#6b4f34'; g.fillRect(0, 0, 512, 192); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; for (let y = 32; y < 192; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      g.fillStyle = '#f1e6cf'; g.textAlign = 'center'; g.font = '900 54px Montserrat, Arial Black, sans-serif'; g.fillText('HARROW FARM', 256, 84);
      g.font = '800 38px Montserrat, Arial Black, sans-serif'; g.fillStyle = '#e8b340'; g.fillText('CORN MAZE', 256, 146);
    });
    const ex = X(4), ez = HALF + 0.2;
    for (const s of [-1, 1]) { const p = RT.mesh(new THREE.BoxGeometry(0.2, 4.0, 0.2), woodD); p.position.set(ex + s * 1.55, 2.0, ez); G.add(p); }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.2, 0.12), [woodD, woodD, woodD, woodD, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9 }), woodD]);
    sign.position.set(ex, 3.55, ez + 0.02); sign.castShadow = true; G.add(sign);
    const hayM = RT.plastic('#d2b46a', { roughness: 1 });
    for (const [x, z, ry] of [[ex - 2.6, ez + 1.2, 0.2], [ex + 2.7, ez + 1.0, -0.3], [ex + 2.9, ez + 2.4, 0.1]]) { const b = RT.mesh(RT.roundedBoxGeometry(1.5, 0.75, 0.9, 0.12, 2), hayM); b.position.set(x, 0.38, z); b.rotation.y = ry; G.add(b); }
    const pumpM = RT.plastic('#d9772b', { roughness: 0.7 });
    for (const [x, z, s] of [[ex - 2.2, ez + 2.1, 0.32], [ex - 1.7, ez + 2.4, 0.24], [ex + 2.2, ez + 2.0, 0.28]]) { const p = RT.mesh(new THREE.SphereGeometry(s, 12, 8), pumpM); p.scale.y = 0.75; p.position.set(x, s * 0.7, z); G.add(p); }

    // ---- the scarecrow's pole in the clearing ----
    const pole = new THREE.Group(); G.add(pole);
    pole.add(RT.mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.4, 8), woodD).translateY(2.7));
    const bar = RT.mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), woodD); bar.rotation.z = Math.PI / 2; bar.position.y = 4.35; pole.add(bar);

    // ---- far away in the fog: a barn, bare trees ----
    const barn = new THREE.Group(); barn.position.set(-34, 0, -40); barn.rotation.y = 0.5; G.add(barn);
    barn.add(RT.mesh(new THREE.BoxGeometry(10, 6, 8), RT.plastic('#7a3a2c', { roughness: 1 })).translateY(3));
    const roof = RT.mesh(new THREE.CylinderGeometry(5.6, 5.6, 8.4, 4, 1), RT.plastic('#3a3430', { roughness: 1 })); roof.rotation.set(Math.PI / 2, 0, Math.PI / 4); roof.scale.set(1, 1, 0.55); roof.position.y = 6.6; barn.add(roof);
    const treeM = RT.plastic('#3d3630', { roughness: 1 });
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2, rad = 34 + r() * 30, t = new THREE.Group(); t.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); G.add(t);
      t.add(RT.mesh(new THREE.CylinderGeometry(0.18, 0.3, 6, 5), treeM).translateY(3));
      for (let b = 0; b < 5; b++) { const br = RT.mesh(new THREE.CylinderGeometry(0.05, 0.12, 3, 4), treeM); br.position.set(0, 3.5 + b * 0.6, 0); br.rotation.set((r() - 0.5) * 1.6, r() * 6, (r() - 0.5) * 1.6); br.translateY(1.4); t.add(br); }
    }

    // ---- drifting mist (soft cards, kept out of the depth pass) ----
    const mistTex = RT.canvasTexture(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(235,240,244,0.55)'); gr.addColorStop(1, 'rgba(235,240,244,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const mists = [];
    for (let k = 0; k < 46; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 + r() * 0.3, fog: true }));
      const s = 5 + r() * 7; sp.scale.set(s, s * 0.45, 1); sp.userData = { x: (r() - 0.5) * 60, z: (r() - 0.5) * 60, y: 0.6 + r() * 2.2, v: 0.15 + r() * 0.2, noDepth: true };
      G.add(sp); mists.push(sp);
    }

    const cell = (i, j) => new THREE.Vector3(X(i), 0, Z(j));
    const open = (i, j, di, dj) => {
      if (di === 1) return !Vw[j][i + 1]; if (di === -1) return !Vw[j][i]; if (dj === 1) return !Hw[j + 1][i]; return !Hw[j][i];
    };
    function route(a, b) {
      const key = (i, j) => i + ',' + j, prev = { [key(a[0], a[1])]: null }, Q = [a];
      while (Q.length) {
        const [i, j] = Q.shift(); if (i === b[0] && j === b[1]) break;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N || key(ni, nj) in prev || !open(i, j, di, dj)) continue;
          prev[key(ni, nj)] = [i, j]; Q.push([ni, nj]);
        }
      }
      const out = []; let c = b; while (c) { out.unshift(cell(c[0], c[1])); c = prev[key(c[0], c[1])]; }
      return out;
    }
    const spots = {
      ENTRANCE: new THREE.Vector3(X(4), 0, HALF + 2.0), CENTER: new THREE.Vector3(0, 0, 0), POLE: new THREE.Vector3(0, 0, 0),
      EXIT: new THREE.Vector3(X(7), 0, -HALF - 0.8), ROAD: new THREE.Vector3(X(7), 0, RZ), CELL, HALF, N, CORN_H,
    };
    return {
      group: G, corn, floor, pole, sign, spots, cell, route, open, walls: { Hw, Vw }, ground: () => 0,
      update(t) { for (const sp of mists) { const u = sp.userData; sp.position.set(((u.x + t * u.v + 30) % 60) - 30, u.y, u.z); } },
    };
  }

  RT.maze = { build, N, CELL, HALF };
})();
