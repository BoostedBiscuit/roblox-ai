// =====================================================================================
// bay.js: HOLLOW BAY (locked in midnight-sea/STORY.md, Stage 3). Original location, three.js r128 only.
//
//   const bay = RT.bay.build(scene, env);   every frame: bay.update(t, { red, spread, origin, recoil, mist, ash, glow })
//
// Layout (world units, y up). Looking from the beach at the sea you look toward +z; your LEFT is +x.
//   sea level y = 0, the shoreline runs along z ≈ 0, black sand slopes up to the seawall at z = -30 (top y 3.4)
//   PIER on the LEFT: x = 24, deck y = 3, from z = -24 (seawall) to z = 62; stilts every 4 (third from shore: z = -12)
//   3 fishing boats centre-right (x -9 … -21, z -9 … -13), black rocks far right (x < -45)
//   stairs from the street down to the beach at x = 0; the town on the hill behind (rows at z -46, -62, -78)
//   Nara's house: the last house nearest the beach, x = 34, z = -46, her bedroom window upstairs faces the sea
//   THE EYE: a giant eye in the sky instead of a moon, low over the sea, right of the pier (bay.eye: opens at midnight, watches Nara)
// spots: bay.spots.{ STAIRS, PIER_X, DECK_Y, STILT3, NARA_HOUSE, NARA_WINDOW, BOATS, ground(x, z) }
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, clamp = RT.clamp;
  const M = (x, y, z, rx, ry, rz, sx, sy, sz) => RT.mat4(x, y, z, rx, ry, rz, sx, sy, sz);

  function Batch() {
    const b = {};
    return {
      add(mat, geo, matrix) { (b[mat.uuid] = b[mat.uuid] || { mat, items: [] }).items.push({ geo, matrix }); },
      build(group, shadows = true) { for (const k in b) group.add(RT.mesh(RT.mergeGeometries(b[k].items), b[k].mat, shadows)); },
    };
  }
  function wallBox(w, h, d, cw, ch) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / cw, uv.getY(i) * dims[f][1] / ch); }
    return g;
  }

  // ground height: black sand rising from the sea to the seawall; street; the hill behind
  function ground(x, z) {
    if (z > -30) return clamp(-z * 0.06, -3.2, 1.8) + Math.sin(x * 0.21) * Math.sin(z * 0.33) * 0.05;
    if (z > -40) return 3.4;
    return 3.4 + (-z - 40) * 0.165;
  }

  const SEA_VS = `
  uniform float uTime; uniform vec4 uRecoil; uniform float uAmp;
  varying vec3 vW; varying vec3 vN; varying float vCrest;
  #include <fog_pars_vertex>
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    float shore = smoothstep(-4.0, 30.0, w.z);
    float a = uAmp * (0.25 + 0.75 * shore);
    float s1 = sin(w.x * 0.15 + uTime * 0.9), c1 = cos(w.x * 0.15 + uTime * 0.9);
    float s2 = sin(w.z * 0.23 - uTime * 1.1), c2 = cos(w.z * 0.23 - uTime * 1.1);
    float s3 = sin((w.x + w.z) * 0.41 + uTime * 1.7), c3 = cos((w.x + w.z) * 0.41 + uTime * 1.7);
    float h = a * (s1 * 0.5 + s2 * 0.35 + s3 * 0.15);
    float dx = a * (c1 * 0.15 * 0.5 + c3 * 0.41 * 0.15), dz = a * (-c2 * 0.23 * 0.35 + c3 * 0.41 * 0.15);
    // the water pulls away from one point (Nara's feet): a dip that grows with uRecoil.w
    float rd = length(w.xz - uRecoil.xy);
    h -= uRecoil.w * exp(-rd * rd / (uRecoil.z * uRecoil.z)) * 0.55;
    w.y += h;
    vCrest = clamp(h / max(a, 0.001) * 0.5 + 0.5, 0.0, 1.0);
    vN = normalize(vec3(-dx, 1.0, -dz));
    vW = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
  const SEA_FS = `
  uniform float uTime; uniform float uRed; uniform float uSpread; uniform vec2 uOrigin; uniform vec3 uMoonDir; uniform vec3 uMoonCol; uniform vec3 uSky;
  uniform vec4 uRecoil; uniform float uGlow;
  varying vec3 vW; varying vec3 vN; varying float vCrest;
  #include <fog_pars_fragment>
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    vec3 V = normalize(cameraPosition - vW), N = normalize(vN);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    float d = length(vW.xz - uOrigin);
    float red = uRed * smoothstep(uSpread, uSpread - 26.0, d);
    float front = uRed * exp(-pow((d - uSpread) / 5.0, 2.0)) * step(1.0, uSpread) * (1.0 - step(9000.0, uSpread));
    float n = noise(vW.xz * 0.12 + vec2(uTime * 0.05, -uTime * 0.04)) * 0.6 + noise(vW.xz * 0.5 - uTime * 0.1) * 0.4;
    vec3 ink = vec3(0.012, 0.013, 0.016) + uSky * fres * 0.6;
    vec3 blood = mix(vec3(0.30, 0.01, 0.012), vec3(0.62, 0.03, 0.025), n) * (0.75 + 0.25 * (1.0 - vCrest));
    blood = mix(blood, vec3(0.03, 0.0, 0.0), smoothstep(0.72, 1.0, vCrest));          // black wave crests
    vec3 col = mix(ink, blood, red);
    col += vec3(1.0, 0.12, 0.05) * red * uGlow * (0.18 + 0.32 * n) * (1.0 - smoothstep(0.6, 1.0, vCrest));   // the glow from below
    col += vec3(1.0, 0.35, 0.2) * front * 1.4;
    vec3 R = reflect(-uMoonDir, N);
    col += uMoonCol * pow(max(dot(R, V), 0.0), 90.0) * 1.6 + uMoonCol * pow(max(dot(R, V), 0.0), 12.0) * 0.08;
    // foam on the shoreline (the tide line moves a little)
    float shoreZ = 0.4 * sin(uTime * 0.55 + vW.x * 0.05) + 0.25 * sin(uTime * 1.3 + vW.x * 0.17);
    float foam = smoothstep(1.6, 0.0, abs(vW.z - shoreZ)) * (0.55 + 0.45 * noise(vW.xz * 1.4 + uTime * 0.3));
    vec3 foamCol = mix(vec3(0.55, 0.55, 0.58), vec3(1.0, 0.55, 0.5), red);
    col = mix(col, foamCol, foam * 0.7);
    // the edge of the dip where the water hisses back from Nara's feet
    float rd = length(vW.xz - uRecoil.xy);
    col += vec3(1.0, 0.6, 0.5) * uRecoil.w * exp(-pow((rd - uRecoil.z * 0.9) / 0.35, 2.0)) * 0.8;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

  function build(scene, env, o = {}) {
    const G = new THREE.Group(); G.name = 'HollowBay'; scene.add(G);
    const r = RT.rng(o.seed || 11);
    const B = new Batch();

    // ---------- textures ----------
    const sandTex = RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = '#3b3735'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4000; i++) { const v = 30 + r() * 50; g.fillStyle = `rgb(${v},${v - 3},${v - 5})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; g.beginPath(); const y = r() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + 8, 170, y - 8, 256, y + 3); g.stroke(); }
    });
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(30, 12);
    const plankTex = (base, peel) => {
      const t = RT.canvasTexture(256, 256, (g) => {
        g.fillStyle = base; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 32) {
          g.fillStyle = RT.shade(base, (r() - 0.5) * 0.18); g.fillRect(0, y, 256, 30);
          g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, y + 29, 256, 3);
          for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(r() * 256, y + r() * 28, 30 + r() * 80, 1); }
        }
        if (peel) for (let k = 0; k < 14; k++) { g.fillStyle = peel; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 3 + r() * 8, r() * 3, 0, 6.3); g.fill(); g.globalAlpha = 1; }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    };
    const woodTex = plankTex('#4a3b30', null);

    // ---------- the beach, the street, the hill ----------
    const gw = 260, gz0 = 46, gz1 = -150, seg = 260;
    const gGeo = new THREE.PlaneGeometry(gw, gz0 - gz1, 130, seg); gGeo.rotateX(-Math.PI / 2);
    const gp = gGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i) + (gz0 + gz1) / 2; gp.setZ(i, z); gp.setY(i, ground(x, z)); }
    gGeo.computeVertexNormals();
    const sand = RT.mesh(gGeo, new THREE.MeshStandardMaterial({ map: sandTex, color: '#bdb6b0', roughness: 0.96 })); sand.receiveShadow = true; sand.castShadow = false; G.add(sand);
    // street paving (darker) on top of the seawall
    B.add(RT.plastic('#2b2a2c', { roughness: 0.95 }), new THREE.BoxGeometry(260, 0.2, 10), M(0, 3.32, -35));
    // the seawall (stone blocks) and the stairs down to the beach at x = 0
    const stone = RT.plastic('#55524f', { roughness: 0.95 }), stoneD = RT.plastic('#45423f', { roughness: 0.95 });
    for (let x = -128; x < 128; x += 2.4) { const h = 2.0 + r() * 0.1; if (Math.abs(x) < 2.4) continue; B.add(r() < 0.5 ? stone : stoneD, RT.roundedBoxGeometry(2.3, 1.1, 1.4, 0.08, 1), M(x + 1.2, 2.85, -30.2)); B.add(r() < 0.5 ? stoneD : stone, RT.roundedBoxGeometry(2.3, 1.1, 1.4, 0.08, 1), M(x + (r() < 0.5 ? 0.6 : 1.8), 1.8, -30.0)); }
    for (let k = 0; k < 10; k++) B.add(stone, new THREE.BoxGeometry(3.6, 0.2, 0.62), M(0, 3.3 - k * 0.19, -29.6 + k * 0.6));
    for (const s of [-1, 1]) B.add(stoneD, new THREE.BoxGeometry(0.3, 0.9, 6.4), M(s * 1.95, 2.4, -26.8, -0.29, 0, 0));
    // railing along the seawall
    const rail = RT.metal('#2a2a2c', { roughness: 0.6 });
    for (let x = -120; x <= 120; x += 4) { if (Math.abs(x) < 3) continue; B.add(rail, new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), M(x, 3.95, -30.6)); }
    for (const x0 of [-120, 3]) B.add(rail, new THREE.BoxGeometry(117, 0.07, 0.07), M(x0 + 58.5, 4.45, -30.6));

    // ---------- the pier (left), deck y = 3 ----------
    const PIER_X = 24, DECK_Y = 3, Z0 = -24, Z1 = 62;
    const deckM = new THREE.MeshStandardMaterial({ map: woodTex, color: '#a08a78', roughness: 0.9 });
    for (let z = Z0; z < Z1; z += 0.46) B.add(deckM, wallBox(4.4, 0.14, 0.38, 2, 0.5), M(PIER_X + (r() - 0.5) * 0.06, DECK_Y, z, 0, (r() - 0.5) * 0.02, 0));   // planks with gaps: moonlight falls through
    const pileM = new THREE.MeshStandardMaterial({ map: woodTex, color: '#6a5a50', roughness: 0.95 });
    const barn = RT.plastic('#2c2b28', { roughness: 1 }), weed = RT.plastic('#1f2a1c', { roughness: 1 });
    const STILTS = [];
    for (let z = Z0 + 4; z <= Z1; z += 4) for (const s of [-1, 1]) {
      const x = PIER_X + s * 1.9, gy = Math.min(ground(x, z), 0) - 3;
      const h = DECK_Y - gy;
      B.add(pileM, new THREE.CylinderGeometry(0.27, 0.31, h, 9), M(x, gy + h / 2, z, (r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.03));
      STILTS.push([x, z]);
      if (z > -14) for (let k = 0; k < 7; k++) { const a = r() * 6.28, y = 0.1 + r() * 0.9; B.add(barn, new THREE.SphereGeometry(0.06 + r() * 0.05, 5, 4), M(x + Math.cos(a) * 0.29, y, z + Math.sin(a) * 0.29)); }
      if (z > -14 && r() < 0.7) B.add(weed, new THREE.BoxGeometry(0.04, 0.9 + r() * 0.6, 0.12), M(x + 0.3 * s, 0.2, z, 0, 0, (r() - 0.5) * 0.3));
    }
    for (let z = Z0 + 4; z <= Z1; z += 4) { B.add(pileM, new THREE.BoxGeometry(4.2, 0.3, 0.24), M(PIER_X, DECK_Y - 0.35, z)); B.add(pileM, new THREE.BoxGeometry(0.16, 0.16, 5.6), M(PIER_X + (z % 8 ? 1 : -1) * 1.9, DECK_Y - 1.4, z - 2, 0.6, 0, 0)); }
    for (const s of [-1, 1]) {
      B.add(pileM, new THREE.BoxGeometry(0.24, 0.3, Z1 - Z0), M(PIER_X + s * 2.1, DECK_Y - 0.2, (Z0 + Z1) / 2));
      for (let z = Z0 + 2; z <= Z1; z += 3) B.add(pileM, new THREE.BoxGeometry(0.14, 1.1, 0.14), M(PIER_X + s * 2.1, DECK_Y + 0.6, z));
      B.add(pileM, new THREE.BoxGeometry(0.1, 0.1, Z1 - Z0), M(PIER_X + s * 2.1, DECK_Y + 1.12, (Z0 + Z1) / 2));
    }
    // the life ring on the rail (red and white)
    const ringTex = RT.canvasTexture(256, 32, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#e8e4dc' : '#c3242a'; g.fillRect(k * 32, 0, 32, 32); } });
    const lifeRing = RT.mesh(new THREE.TorusGeometry(0.42, 0.13, 10, 24), new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.7 }));
    lifeRing.position.set(PIER_X + 2.22, DECK_Y + 0.7, 14); lifeRing.rotation.y = Math.PI / 2; G.add(lifeRing);

    // ---------- three old fishing boats on the sand (centre-right) ----------
    const hullM = (c) => new THREE.MeshStandardMaterial({ map: plankTex(c, '#8a8070'), roughness: 0.9 });
    const BOATS = [[-9, -9.5, 0.4, '#3d4a52'], [-15, -12.5, -0.3, '#5a3a32'], [-21, -10.5, 0.9, '#4a4a44']];
    for (const [bx, bz, yaw, c] of BOATS) {
      const shape = new THREE.Shape(); shape.moveTo(-0.9, 0.0); shape.lineTo(0.9, 0.0); shape.lineTo(1.25, 0.95); shape.lineTo(-1.25, 0.95); shape.closePath();
      const hull = new THREE.ExtrudeGeometry(shape, { depth: 5.2, bevelEnabled: false }); hull.translate(0, 0, -2.6);
      const p = hull.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), k = Math.abs(z) / 2.6; if (z > 1.6) p.setX(i, p.getX(i) * (1 - (z - 1.6) / 1.2 * 0.9)); p.setY(i, p.getY(i) + k * k * 0.25); }
      hull.computeVertexNormals();
      const gy = ground(bx, bz), m = M(bx, gy + 0.05, bz, 0.02, yaw, (r() - 0.5) * 0.25);
      B.add(hullM(c), hull, m);
      B.add(RT.plastic('#2a2622', { roughness: 0.9 }), new THREE.BoxGeometry(2.0, 0.12, 0.5), new THREE.Matrix4().multiplyMatrices(m, M(0, 0.7, -0.4)));   // seat
      B.add(pileM, new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5), new THREE.Matrix4().multiplyMatrices(m, M(0.4, 0.85, 0.6, 1.45, 0, 0.1)));             // an oar
    }
    // ---------- black rocks (far right), driftwood ----------
    const rockM = RT.plastic('#232224', { roughness: 0.92, flatShading: true });
    for (let k = 0; k < 26; k++) { const x = -46 - r() * 40, z = -14 + r() * 30, s = 1 + r() * 3.5; B.add(rockM, new THREE.DodecahedronGeometry(1, 0), M(x, ground(x, Math.min(z, 0)) - 0.2 + s * 0.3, z, r() * 3, r() * 3, r() * 3, s * (0.8 + r() * 0.5), s * (0.6 + r() * 0.8), s)); }
    for (let k = 0; k < 9; k++) { const x = -30 + r() * 60, z = -6 + r() * 4; B.add(pileM, new THREE.CylinderGeometry(0.09, 0.12, 1.4 + r() * 2, 6), M(x, ground(x, z) + 0.08, z, Math.PI / 2, r() * 3, 0)); }

    // ---------- the town on the hill: narrow two-storey fishing houses, peeling dark paint, all dark ----------
    const PAINTS = ['#2f3a3f', '#3d2f2c', '#36352f', '#2a2f37', '#433a30', '#33302d'];
    const roofM = RT.plastic('#1b1a1c', { roughness: 0.85 }), trimM = RT.plastic('#7d776e', { roughness: 0.9 }), winM = RT.plastic('#08080a', { roughness: 0.2, metalness: 0.2 });
    const doorM = RT.plastic('#2a2320', { roughness: 0.9 });
    const wallMs = PAINTS.map((c) => new THREE.MeshStandardMaterial({ map: plankTex(c, RT.shade(c, 0.35)), roughness: 0.92 }));
    const houses = [];
    function house(x, z, w, d, h, k, yaw = 0) {
      const y0 = ground(x, z) - 0.05;
      const T = (lx, ly, lz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().makeRotationY(yaw).multiply(M(lx, ly, lz, rx, ry, rz)).premultiply(new THREE.Matrix4().makeTranslation(x, y0, z));
      const wm = wallMs[k % wallMs.length];
      B.add(wm, wallBox(w, h, d, 3.2, 2.4), T(0, h / 2, 0));
      const roof = new THREE.Shape(); roof.moveTo(-w / 2 - 0.35, 0); roof.lineTo(w / 2 + 0.35, 0); roof.lineTo(0, w * 0.62); roof.closePath();
      const rg = new THREE.ExtrudeGeometry(roof, { depth: d + 0.6, bevelEnabled: false }); rg.translate(0, 0, -(d + 0.6) / 2);
      B.add(roofM, rg, T(0, h, 0));
      const gable = new THREE.Shape(); gable.moveTo(-w / 2, 0); gable.lineTo(w / 2, 0); gable.lineTo(0, w * 0.56); gable.closePath();
      B.add(wm, new THREE.ShapeGeometry(gable), T(0, h, d / 2 + 0.01)); B.add(wm, new THREE.ShapeGeometry(gable), T(0, h, -d / 2 - 0.01, 0, Math.PI, 0));
      for (const fy of [h * 0.28, h * 0.72]) for (const fx of (w > 4.6 ? [-w * 0.26, w * 0.26] : [w * 0.22])) {
        if (fy < h * 0.5 && fx < 0 && w > 4.6) continue;
        B.add(trimM, new THREE.BoxGeometry(1.05, 1.35, 0.12), T(fx, fy, d / 2 + 0.03)); B.add(winM, new THREE.BoxGeometry(0.85, 1.15, 0.14), T(fx, fy, d / 2 + 0.05));
      }
      B.add(doorM, new THREE.BoxGeometry(1.0, 2.0, 0.12), T(w > 4.6 ? -w * 0.26 : -w * 0.22, 1.0, d / 2 + 0.05));
      B.add(trimM, new THREE.BoxGeometry(w + 0.1, 0.18, 0.18), T(0, h * 0.5, d / 2 + 0.06));
      if (k % 3 === 0) B.add(stoneD, new THREE.BoxGeometry(0.6, 1.6, 0.6), T(w * 0.25, h + w * 0.4, -d * 0.2));
      B.add(stoneD, new THREE.BoxGeometry(w + 0.2, 0.5, d + 0.2), T(0, 0.0, 0));
      houses.push({ x, z, w, d, h, y0 });
    }
    let k = 0;
    for (const [rz, xs] of [[-46, [-62, -52, -42, -33, -24, -15, -6, 7, 16, 25]], [-62, [-66, -56, -47, -38, -29, -20, -11, -2, 8, 17, 26, 35]], [-78, [-60, -50, -41, -32, -23, -14, -5, 5, 14, 23, 32, 41]]])
      for (const x of xs) { const w = 4.2 + r() * 1.4; house(x + (r() - 0.5) * 1.5, rz + (r() - 0.5) * 2, w, 5.5 + r(), 5.6 + r() * 1.0, k++); }
    // Nara's house: the last one, nearest the beach (pier side)
    const NH = { x: 35, z: -46, w: 5.2, d: 6, h: 6.2 }; house(NH.x, NH.z, NH.w, NH.d, NH.h, 4);
    const NARA_HOUSE = new THREE.Vector3(NH.x, ground(NH.x, NH.z), NH.z);
    const NARA_WINDOW = new THREE.Vector3(NH.x + NH.w * 0.26, NARA_HOUSE.y + NH.h * 0.72, NH.z + NH.d / 2 + 0.06);
    // streetlamps (dim orange-red) along the street
    const lampM = new THREE.MeshStandardMaterial({ color: '#2a1810', emissive: '#ff6a2a', emissiveIntensity: 1.6 });
    const LAMPS = [-40, -18, 0, 18, 32];
    for (const x of LAMPS) { B.add(rail, new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), M(x + 2.5, 5.45, -33)); B.add(rail, new THREE.BoxGeometry(0.9, 0.08, 0.08), M(x + 2.1, 7.5, -33)); B.add(lampM, new THREE.BoxGeometry(0.34, 0.24, 0.34), M(x + 1.7, 7.35, -33)); }
    const lampLights = [0, 32].map((x) => { const l = new THREE.PointLight('#ff6a30', 0.9, 16, 1.6); l.position.set(x + 1.7, 7.0, -33); G.add(l); return l; });

    B.build(G);

    // ---------- the sea ----------
    const moonDir = new THREE.Vector3();
    const seaM = new THREE.ShaderMaterial({
      vertexShader: SEA_VS, fragmentShader: SEA_FS, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uRed: { value: 0 }, uSpread: { value: 99999 }, uOrigin: { value: new THREE.Vector2(10, 260) }, uMoonDir: { value: moonDir },
        uMoonCol: { value: new THREE.Color('#ffb0a0') }, uSky: { value: new THREE.Color('#3a0a0a') }, uRecoil: { value: new THREE.Vector4(0, 0, 2.5, 0) }, uAmp: { value: 0.22 }, uGlow: { value: 1 } }]),
    });
    const seaGeo = new THREE.PlaneGeometry(700, 520, 220, 200); seaGeo.rotateX(-Math.PI / 2); seaGeo.translate(0, 0, 250);
    const sea = new THREE.Mesh(seaGeo, seaM); sea.frustumCulled = false; G.add(sea);
    // light from the red sea onto everything that faces it
    const seaGlow = new THREE.DirectionalLight('#ff2a18', 0); seaGlow.position.set(0, 2, 60); seaGlow.target.position.set(0, 4, -20); G.add(seaGlow, seaGlow.target);

    // ---------- mist over the water (soft, drifting; not in the depth pass) ----------
    const mistTex = RT.canvasTexture(256, 128, (g) => {
      for (let i = 0; i < 70; i++) { const x = r() * 256, y = 40 + r() * 50, rad = 18 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    });
    mistTex.wrapS = THREE.RepeatWrapping;
    const mistM = new THREE.MeshBasicMaterial({ map: mistTex, color: '#ffd0c8', transparent: true, opacity: 0.35, depthWrite: false, fog: true });
    const mists = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(110, 7), mistM); m.position.set(-20 + (i % 3) * 30, 0.9 + (i % 2) * 0.8, 6 + i * 11); m.userData.noDepth = true; m.renderOrder = 2;
      G.add(m); mists.push(m);
    }

    // ---------- ash: dark flakes and a few embers drifting (pure function of t) ----------
    const ASH_N = 700, ashGeo = new THREE.BufferGeometry(), ashPos = new Float32Array(ASH_N * 3), ashCol = new Float32Array(ASH_N * 3), seeds = [];
    for (let i = 0; i < ASH_N; i++) { seeds.push([r(), r(), r(), r()]); const ember = r() < 0.18; ashCol.set(ember ? [1, 0.35, 0.15] : [0.09, 0.08, 0.08], i * 3); }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3)); ashGeo.setAttribute('color', new THREE.BufferAttribute(ashCol, 3));
    const dotTex = RT.canvasTexture(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    const ashM = new THREE.PointsMaterial({ size: 0.09, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    const ash = new THREE.Points(ashGeo, ashM); ash.frustumCulled = false; ash.userData.noDepth = true; G.add(ash);
    const ashCenter = new THREE.Vector3(), ASH_BOX = [16, 7, 16];

    // ---------- burned footprints: black scorch marks with ember glow and thin smoke ----------
    const printTex = RT.canvasTexture(64, 128, (g) => {
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(32, 46, 17, 30, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(32, 100, 13, 18, 0, 0, 6.3); g.fill();
    });
    const emberTex = RT.canvasTexture(64, 128, (g) => {
      g.strokeStyle = '#ff5a1a'; g.lineWidth = 5; g.beginPath(); g.ellipse(32, 46, 16, 29, 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(32, 100, 12, 17, 0, 0, 6.3); g.stroke();
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,120,40,0.9)'; g.fillRect(14 + r() * 36, 20 + r() * 96, 2, 2); }
    });
    const printM = new THREE.MeshStandardMaterial({ map: printTex, transparent: true, depthWrite: false, emissive: '#ffffff', emissiveMap: emberTex, emissiveIntensity: 1.5, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    function footprints(path, o2 = {}) {
      const g = new THREE.Group(); g.userData.noDepth = true;
      path.forEach(([x, z, yaw], i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.66), printM); m.rotation.set(-Math.PI / 2, 0, -yaw);
        const side = i % 2 ? 1 : -1; m.position.set(x + Math.cos(yaw) * 0.16 * side, ground(x, z) + 0.02, z - Math.sin(yaw) * 0.16 * side);
        m.userData.i = i; g.add(m);
      });
      g.userData.show = (n) => g.children.forEach((m) => (m.visible = m.userData.i < n));
      G.add(g); return g;
    }

    // ---------- THE EYE in the sky (where a moon would be): opens at midnight, closes at dawn, always watches Nara ----------
    // eye.place(camera) every frame (it hangs "at infinity" in the sky direction), eye.set(open 0..1, lookAt Vector3, t)
    const EYE_R = 105, EYE_D = 900;
    const eyeTex = RT.canvasTexture(1024, 512, (g) => {
      g.fillStyle = '#cdb0a8'; g.fillRect(0, 0, 1024, 512);
      const cx = 256, cy = 256;   // +z of the sphere (u = 0.25, v = 0.5): the iris
      // veins: thin branching red lines from the iris edge outward
      const vr = RT.rng(77);
      for (let k = 0; k < 70; k++) {
        let a = vr() * 6.28, d = 70 + vr() * 6, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, w = 2.6 + vr() * 2;
        g.strokeStyle = `rgba(${150 + vr() * 60 | 0},${10 + vr() * 20 | 0},${15 + vr() * 15 | 0},${0.55 + vr() * 0.4})`;
        for (let s = 0; s < 14; s++) { const nx = x + Math.cos(a) * (10 + vr() * 14), ny = y + Math.sin(a) * (10 + vr() * 14); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny; a += (vr() - 0.5) * 0.9; w *= 0.86; }
      }
      const gr = g.createRadialGradient(cx, cy, 60, cx, cy, 150); gr.addColorStop(0, 'rgba(120,20,20,0.35)'); gr.addColorStop(1, 'rgba(120,20,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      // iris: deep red with radial streaks, a dark ring at the edge
      const ir = g.createRadialGradient(cx, cy, 18, cx, cy, 64); ir.addColorStop(0, '#ff5a2a'); ir.addColorStop(0.45, '#c3170f'); ir.addColorStop(1, '#4a0506');
      g.fillStyle = ir; g.beginPath(); g.arc(cx, cy, 64, 0, 6.3); g.fill();
      for (let k = 0; k < 90; k++) { const a = k / 90 * 6.28 + vr() * 0.05; g.strokeStyle = `rgba(${vr() < 0.5 ? '255,140,90' : '40,0,0'},0.45)`; g.lineWidth = 1.5 + vr() * 1.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); g.lineTo(cx + Math.cos(a) * (50 + vr() * 12), cy + Math.sin(a) * (50 + vr() * 12)); g.stroke(); }
      g.strokeStyle = '#1a0202'; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, 63, 0, 6.3); g.stroke();
      g.fillStyle = '#050101'; g.beginPath(); g.arc(cx, cy, 25, 0, 6.3); g.fill();           // pupil
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(cx + 20, cy - 22, 11, 8, -0.5, 0, 6.3); g.fill();   // wet highlight
    });
    const eye = new THREE.Group(); eye.name = 'SkyEye'; G.add(eye);
    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 48, 32), new THREE.MeshBasicMaterial({ map: eyeTex, fog: false, toneMapped: false })); eye.add(eyeball);
    const socket = new THREE.Group(); eye.add(socket);
    const lidM = new THREE.MeshBasicMaterial({ color: '#2a0807', fog: false, toneMapped: false, side: THREE.DoubleSide });
    const lidU = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 1.035, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), lidM);
    const lidL = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 1.03, 48, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidM);
    const rimM = new THREE.MeshBasicMaterial({ color: '#ff3a24', fog: false, toneMapped: false });
    const rimU = new THREE.Mesh(new THREE.TorusGeometry(EYE_R * 1.035, EYE_R * 0.025, 6, 64, Math.PI), rimM), rimL = rimU.clone();
    lidU.add(rimU); lidL.add(rimL); rimU.rotation.set(0, 0, 0); rimL.rotation.set(0, 0, Math.PI);
    socket.add(lidU, lidL);
    const eyeGlowTex = RT.canvasTexture(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(255,60,40,0.9)'); gr.addColorStop(0.5, 'rgba(255,40,20,0.25)'); gr.addColorStop(1, 'rgba(255,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, toneMapped: false }));
    eyeGlow.scale.setScalar(EYE_R * 5.2); eye.add(eyeGlow); eyeGlow.renderOrder = -5;
    const eyeDir = new THREE.Vector3(-0.16, 0.2, 1).normalize(), lookTmp = new THREE.Vector3();
    let eyeOpen = 0;
    const skyEye = {
      group: eye, dir: eyeDir, radius: EYE_R,
      place(camera) {
        eye.position.copy(camera.position).addScaledVector(eyeDir, EYE_D);
        socket.lookAt(camera.position);                       // the lids stay level for the viewer
        if (env) { env.skyDir.copy(eyeDir); env.sunDisc.visible = false; env.glow.visible = false; }
      },
      set(open, look, t = 0) {
        eyeOpen = clamp(open, 0, 1);
        const o = RT.easeOut(eyeOpen) * (0.94 + 0.06 * Math.sin(t * 0.8));     // the lids breathe a little
        lidU.rotation.x = -o * 0.62; lidL.rotation.x = o * 0.48;      // never fully round: an almond-shaped opening
        eyeball.visible = eyeOpen > 0.01; eyeGlow.material.opacity = 0.25 + 0.75 * eyeOpen;
        if (look) { lookTmp.copy(look); eyeball.lookAt(lookTmp); eyeball.rotateZ(Math.sin(t * 0.37) * 0.05); }
      },
    };
    const spots = { STAIRS: new THREE.Vector3(0, ground(0, -26), -26), PIER_X, DECK_Y, STILT3: new THREE.Vector3(PIER_X - 1.9, ground(PIER_X - 1.9, -12), -12), STILTS,
      NARA_HOUSE, NARA_WINDOW, BOATS, LAMPS, ground };

    const bay = {
      group: G, sea, seaM, spots, ground, mists, ash, footprints, printM, lampLights, lifeRing, eye: skyEye,
      update(t, u = {}) {
        const red = u.red ?? 0;
        seaM.uniforms.uTime.value = t; seaM.uniforms.uRed.value = red; seaM.uniforms.uSpread.value = u.spread ?? 99999;
        if (u.origin) seaM.uniforms.uOrigin.value.set(u.origin[0], u.origin[1]);
        const rc = u.recoil || [0, 0, 2.5, 0]; seaM.uniforms.uRecoil.value.set(rc[0], rc[1], rc[2], rc[3]);
        seaM.uniforms.uGlow.value = u.glow ?? 1; seaM.uniforms.uAmp.value = u.amp ?? 0.22;
        if (env) { moonDir.copy(env.skyDir || env.sunDir); seaM.uniforms.uSky.value.set(env.preset.horizon); seaM.uniforms.uMoonCol.value.set(env.preset.discCol || env.preset.sunCol); }
        seaGlow.intensity = red * (u.seaLight ?? 0.9);
        if (env) env.hemi.groundColor.set(RT.mixColor(env.preset.hemiGround, '#7a0c08', red));
        mistTex.offset.x = (t * 0.004) % 1; mistM.opacity = (u.mist ?? 0.35);
        mists.forEach((m, i) => { m.position.x = -20 + (i % 3) * 30 + Math.sin(t * 0.07 + i) * 4; });
        // ash around a point (usually what the camera looks at)
        ash.visible = (u.ash ?? 0) > 0;
        if (ash.visible) {
          if (u.ashAt) ashCenter.copy(u.ashAt);
          const n = Math.round(ASH_N * clamp(u.ash, 0, 1));
          for (let i = 0; i < ASH_N; i++) {
            const s = seeds[i], k = i * 3;
            if (i >= n) { ashPos[k + 1] = -999; continue; }
            const life = (t * (0.08 + s[3] * 0.06) + s[2]) % 1;
            ashPos[k] = ashCenter.x + (s[0] - 0.5) * ASH_BOX[0] + Math.sin(t * 0.7 + i) * 0.4 + life * 2.0;
            ashPos[k + 1] = ashCenter.y - 2 + life * ASH_BOX[1] + Math.sin(t * 1.3 + i * 0.7) * 0.15;
            ashPos[k + 2] = ashCenter.z + (s[1] - 0.5) * ASH_BOX[2] + Math.cos(t * 0.5 + i) * 0.4;
          }
          ashGeo.attributes.position.needsUpdate = true;
        }
        printM.emissiveIntensity = (u.embers ?? 1.5) * (0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 5.3));
      },
    };
    return bay;
  }

  RT.bay = { build, ground };
})();
