// =====================================================================================
// locations.js: the five fight locations of PORT HALCYON (+ the record shop and the dark room of the ending).
// Each function returns a THREE.Group with:
//   .mood        which RT.mood preset it is lit with
//   .update(t)   waves, water, birds, smoke, lights…
//   .spots       named points [x, y, z] for actors and cameras (see each function)
//   .props       named moving objects (the falling sign, cars, the golden record…)
//   .breakables  props at the EDGES that can shatter in a fight (userData.breakable)
//   .groundAt(x, z)  floor height (stairs, platforms) so actors stand on the right step
//   .preview     { cam: [x, y, z], look: [x, y, z], fov } a good establishing shot (used by previews/location.html)
//
//   RT.locations.stairway()   CH1  Old Town Stairway: 24-wide grand stairs, 4 flights, 3 landings, colorful street on top
//   RT.locations.recordShop() CH1  inside the dusty record shop (the golden record is in the back)
//   RT.locations.piazza()     CH2  Fountain Piazza: 120 × 120 open square, big fountain, colonnade, cafés, pigeons
//   RT.locations.promenade()  CH3  Seaside Promenade: 340-unit coast road, sea wall, globe lamps, palms, volcano
//   RT.locations.fortress()   CH4  Sea Fortress: 72 × 72 stone fortress on a rocky island, bridge to the city, sunset
//   RT.locations.arena()      CH5  Ancient Arena at night: ruined oval arena, 124 × 84 sand floor, purple + gold lights
//   RT.locations.darkRoom()   END  a dark room, a record player, a second golden record, a smiling shadow
// FIGHT SPACE RULE: the middle of every fight area stays EMPTY; breakable props only at the edges.
//
// SCALE: everything below is DESIGNED in units where a person is ~5 tall (easy round numbers), then the whole
// location is shrunk by SCALE (0.5) so it fits the real characters (~2.4 units = 5.4 studs). .spots, .preview
// and .groundAt are already converted to real (scene) units: use them as they are.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, K = RT.kit, M = RT.mat4, { BAY, FLOOR, GROUND } = K;
  const SCALE = 0.5;   // design units → scene units (see the header)
  // shrink a finished location to scene scale and convert its spots / preview camera / ground function
  function finish(G) {
    G.scale.setScalar(SCALE);
    const conv = (v) => (Array.isArray(v) && typeof v[0] === 'number' ? v.map((n) => n * SCALE) : Array.isArray(v) ? v.map(conv) : v);
    for (const k in G.spots) G.spots[k] = conv(G.spots[k]);
    if (G.preview) { G.preview.cam = conv(G.preview.cam); G.preview.look = conv(G.preview.look); }
    const g = G.groundAt; G.groundAt = (x, z) => g(x / SCALE, z / SCALE) * SCALE;
    G.updateMatrixWorld(true);
    return G;
  }
  const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const at = (obj, x, y, z, yaw = 0) => { obj.position.set(x, y, z); obj.rotation.y = yaw; return obj; };
  const stoneMat = (base, tile, rows) => { const m = new THREE.MeshStandardMaterial({ map: K.tex.ashlar(base, rows || 4), roughness: 0.85 }); m.userData.tile = tile; return m; };
  // a box with a repeating texture every `tile` units, added to a Batch at (x, y, z) (y = bottom of the box)
  const slab = (B, m, w, h, d, x, y, z, tile = 4, yaw = 0) => B.add(m, K.tiledBox(w, h, d, tile, tile), new THREE.Matrix4().makeTranslation(x, y + h / 2, z).multiply(new THREE.Matrix4().makeRotationY(yaw)));
  const floorAt = (B, m, w, d, x, y, z, tile) => B.add(m, K.floorGeo(w, d, tile), M(x, y, z));
  // iron railing from (x0, z0) to (x1, z1) standing on height y
  function railing(B, x0, z0, x1, z1, y, h = 1.5, step = 1.1) {
    const iron = K.mat.iron(), len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(-(z1 - z0), x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const T = (lx, ly) => new THREE.Matrix4().makeTranslation(cx, ly, cz).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(M(lx, 0, 0));
    B.add(iron, boxG(len, 0.12, 0.12), T(0, y + h)); B.add(iron, boxG(len, 0.08, 0.08), T(0, y + 0.25));
    for (let s = -len / 2; s <= len / 2 + 0.01; s += step) B.add(iron, boxG(0.08, h, 0.08), T(s, y + h / 2));
  }
  // stone balustrade (vase-shaped balusters between a base and a top rail)
  function balustrade(B, x0, z0, x1, z1, y, h = 1.6) {
    const st = K.mat.stone(), len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(-(z1 - z0), x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const T = (lx, ly) => new THREE.Matrix4().makeTranslation(cx, ly, cz).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(M(lx, 0, 0));
    B.add(st, boxG(len, 0.3, 0.7), T(0, y + 0.15)); B.add(st, boxG(len + 0.2, 0.28, 0.8), T(0, y + h - 0.14));
    const vase = once('vase', () => { const p = [[0.001, 0], [0.18, 0], [0.18, 0.1], [0.1, 0.25], [0.24, 0.55], [0.1, 0.95], [0.16, 1.0], [0.001, 1.0]].map(([r, yy]) => new THREE.Vector2(r, yy)); return new THREE.LatheGeometry(p, 8); });
    for (let s = -len / 2 + 0.3; s <= len / 2 - 0.29; s += 0.62) B.add(st, vase, T(s, y + 0.3).multiply(M(0, 0, 0, 0, 0, 0, 1, h - 0.58, 1)));
  }
  const _once = {}, once = (k, f) => _once[k] || (_once[k] = f());
  // a rock (squashed icosahedron) for coasts and islands
  function rocks(B, list, color = '#857a6e') {
    const m = RT.plastic(color, { roughness: 0.95, flatShading: true }), g = once('rockG', () => new THREE.IcosahedronGeometry(1, 0));
    for (const [x, y, z, s, k] of list) B.add(m, g, M(x, y, z, k || 0, (k || 0) * 2.3, 0, s, s * 0.6, s * 0.9));
  }
  // simple sky for every daytime location: a ring of anime clouds around (cx, cz)
  const daySky = (G, cx, cz, o = {}) => K.clouds(G, Object.assign({ cx, cz, radius: 1150, count: 18, size: 330, minY: 110, maxY: 380 }, o));

  // =================================================================================
  // CH1 · OLD TOWN STAIRWAY
  // Layout: the stairs climb toward -z. Bottom plaza (y 0) for z > 0; flights of 10 steps (rise 0.5, tread 1.0)
  // with 6-deep landings; the top street (y 20) for z < -58. Colorful buildings line both sides of the stairs.
  // spots: bottom, landing1..3, top, shopDoor, signFall (where the big sign lands)
  // =================================================================================
  const STEP_RISE = 0.5, TREAD = 1.0, STEPS = 10, LANDING = 6, FLIGHT = STEPS * TREAD, PITCH = FLIGHT + LANDING, HALF = 12;
  const TOP_Z = -(3 * PITCH + FLIGHT), TOP_Y = 4 * STEPS * STEP_RISE;          // -58, 20
  function stairGround(x, z) {
    if (z >= 0) return 0;
    if (z <= TOP_Z) return TOP_Y;
    const f = Math.floor(-z / PITCH), dz = -z - f * PITCH, base = f * STEPS * STEP_RISE;
    if (dz < FLIGHT) return base + STEP_RISE * (Math.floor(dz / TREAD) + 1);
    return base + STEPS * STEP_RISE;
  }
  function stairway() {
    const G = new THREE.Group(); G.name = 'stairway';
    const B = K.Batch(), riser = new THREE.MeshStandardMaterial({ map: K.tex.slabs('#cdbfa6'), roughness: 0.85 }), tread = new THREE.MeshStandardMaterial({ map: K.tex.slabs('#efe5d3'), roughness: 0.75 });
    const cobble = new THREE.MeshStandardMaterial({ map: K.tex.cobble(), roughness: 0.85 }), wall = stoneMat('#d6c4a3'), cap = K.mat.stone();
    // --- the stairs (each step is a solid block from the ground, with a slightly overhanging light tread on top) ---
    for (let f = 0; f < 4; f++) {
      for (let i = 0; i < STEPS; i++) {
        const z0 = -(f * PITCH + i * TREAD), top = f * STEPS * STEP_RISE + (i + 1) * STEP_RISE;
        slab(B, riser, HALF * 2, top - 0.12, TREAD, 0, 0, z0 - TREAD / 2, 2);
        B.add(tread, K.tiledBox(HALF * 2, 0.14, TREAD + 0.1, 2, 2), M(0, top - 0.07, z0 - TREAD / 2 + 0.05));
        for (const s of [-1, 1]) {                                                                   // stepped stone cheek walls
          slab(B, wall, 1.3, top + 1.1, TREAD, s * (HALF + 0.65), 0, z0 - TREAD / 2, 3);
          B.add(cap, boxG(1.5, 0.2, TREAD + 0.02), M(s * (HALF + 0.65), top + 1.2, z0 - TREAD / 2));
        }
      }
      if (f < 3) {                                                                                     // landing
        const z0 = -(f * PITCH + FLIGHT), y = (f + 1) * STEPS * STEP_RISE;
        slab(B, riser, HALF * 2, y - 0.12, LANDING, 0, 0, z0 - LANDING / 2, 2);
        B.add(tread, K.tiledBox(HALF * 2, 0.14, LANDING, 3, 3), M(0, y - 0.07, z0 - LANDING / 2));
        for (const s of [-1, 1]) { slab(B, wall, 1.3, y + 1.1, LANDING, s * (HALF + 0.65), 0, z0 - LANDING / 2, 3); B.add(cap, boxG(1.5, 0.2, LANDING), M(s * (HALF + 0.65), y + 1.2, z0 - LANDING / 2)); }
      }
    }
    // --- bottom plaza (cobbles) and the top street platform ---
    floorAt(B, cobble, 140, 60, 0, 0, 30, 3);
    slab(B, wall, 150, TOP_Y - 0.1, 40, 0, 0, TOP_Z - 20, 6);
    floorAt(B, cobble, 150, 40, 0, TOP_Y, TOP_Z - 20, 3);
    floorAt(B, new THREE.MeshStandardMaterial({ map: K.tex.sidewalk(), roughness: 0.8 }), 150, 4, 0, TOP_Y + 0.02, TOP_Z - 2.2, 2);   // a sidewalk strip on top
    for (const s of [-1, 1]) balustrade(B, s * 27.5, TOP_Z + 0.2, s * 75, TOP_Z + 0.2, TOP_Y);          // terrace over the lower town
    // --- buildings along both sides of the stairs (fronts face the stairs) ---
    const sides = [[-5, 3], [-20, 4], [-35, 5], [-49, 6]], foot = [];
    sides.forEach(([z, fl], i) => {
      foot.push(K.building(B, { x: -(HALF + 1.3 + 6.85), z, yaw: Math.PI / 2, w: 3, d: 3, floors: fl, color: i * 3 + 1, seed: 100 + i, awnings: false }));
      foot.push(K.building(B, { x: HALF + 1.3 + 6.85, z, yaw: -Math.PI / 2, w: 3, d: 3, floors: fl + (i % 2), color: i * 3 + 5, seed: 200 + i, awnings: false }));
      foot.push(K.building(B, { x: -(HALF + 1.3 + 13.7 + 7), z: z + 2, yaw: Math.PI / 2, w: 3, d: 3, floors: fl + 2, color: i * 2 + 8, seed: 300 + i }));
      foot.push(K.building(B, { x: HALF + 1.3 + 13.7 + 7, z: z - 1, yaw: -Math.PI / 2, w: 3, d: 3, floors: fl + 1, color: i * 2 + 3, seed: 400 + i }));
    });
    // around the bottom plaza
    [[-46, 18, Math.PI / 2, 4, 4], [46, 18, -Math.PI / 2, 4, 5], [-22, 64, Math.PI, 4, 4], [22, 64, Math.PI, 4, 3]].forEach(([x, z, yaw, w, fl], i) => foot.push(K.building(B, { x, z, yaw, w, d: 3, floors: fl, color: i + 6, seed: 500 + i })));
    // the top street: a row of colorful buildings facing the stairs (the record shop is the one at x = +17)
    const topZ = TOP_Z - 40 + 6.85;
    [[-60, 4, 4], [-41, 4, 3], [-20, 4, 4], [0, 3, 5], [17, 4, 3], [37, 4, 4], [58, 5, 3]].forEach(([x, w, fl], i) => foot.push(K.building(B, { x, y: TOP_Y, z: topZ - 6.85 + 0.0, yaw: 0, w, d: 3, floors: fl, color: (i * 5 + 2) % 12, seed: 600 + i, awnings: i !== 4 })));
    // --- the record shop front: a sign board, a round vinyl sign on a bracket, records in the window ---
    const shopX = 17, shopFront = topZ - 6.85 + 6.75 + 0.1;
    const shop = new THREE.Group(); G.add(at(shop, shopX, TOP_Y, shopFront));
    const board = RT.canvasTexture(512, 96, (g) => { g.fillStyle = '#26364a'; g.fillRect(0, 0, 512, 96); g.strokeStyle = '#e9c46a'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 84); g.fillStyle = '#f3d98a'; g.font = '900 54px Montserrat, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ECO DISCHI', 256, 50); });
    shop.add(at(RT.mesh(boxG(14, 2.2, 0.3), [K.mat.trim(), K.mat.trim(), K.mat.trim(), K.mat.trim(), new THREE.MeshStandardMaterial({ map: board, roughness: 0.5 }), K.mat.trim()]), 0, GROUND - 1.0, 0.2));
    const disc = RT.canvasTexture(256, 256, (g) => { g.fillStyle = '#111'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.12)'; for (let r = 40; r < 124; r += 8) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); } g.fillStyle = '#e9c46a'; g.beginPath(); g.arc(128, 128, 38, 0, 7); g.fill(); g.fillStyle = '#26364a'; g.font = '900 22px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillText('DISCHI', 128, 136); });
    const vinyl = RT.mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.2, 32), [RT.plastic('#111'), new THREE.MeshStandardMaterial({ map: disc }), new THREE.MeshStandardMaterial({ map: disc })]);
    vinyl.rotation.x = Math.PI / 2; vinyl.rotation.z = Math.PI / 2; shop.add(at(vinyl, -7.6, GROUND + 2.6, 2.6));
    shop.add(at(RT.mesh(boxG(0.15, 0.15, 3.0), K.mat.iron()), -7.6, GROUND + 4.6, 1.5));
    shop.userData.vinyl = vinyl;
    // --- the BIG SIGN (CH1 hook): a blade sign on the left building, hanging over flight 3. It falls in the cold open. ---
    const bigSign = K.bladeSign('HOTEL AURORA', { h: 13, w: 3.4, bg: '#7a1f2b', fg: '#ffd98a' });
    G.add(at(bigSign, -(HALF + 1.3), 31.5, -38, Math.PI / 2));
    // --- street props ---
    const props = new THREE.Group(); G.add(props); const breakables = [bigSign];
    const add = (o, x, y, z, yaw = 0) => { props.add(at(o, x, y, z, yaw)); if (o.userData.breakable) breakables.push(o); return o; };
    [[-34, 6, 0, '#e23b3b'], [-34, 13, 0, '#f2c14e'], [33, 9, Math.PI, '#3d8fd6'], [-50, TOP_Y, -66, 0, '#5fbf7a'], [44, TOP_Y, -66, Math.PI, '#f08a4b'], [-25, TOP_Y, -66, 0, '#eeeeee']].forEach((c) => {
      if (c.length === 4) add(K.car(c[3]), c[0], 0, c[1], c[2]); else add(K.car(c[4]), c[0], c[1], c[2], c[3]);
    });
    add(K.scooter('#7fd1c1'), 10, TOP_Y, -67, 0.4); add(K.scooter('#ff8fa3'), 12.5, TOP_Y, -68, 0.2);
    for (let x = -28; x <= 28; x += 4) if (Math.abs(x) > 13) add(K.bollard(), x, 0, 1.5);
    for (let x = -70; x <= 70; x += 5) if (Math.abs(x) > 14) add(K.bollard(), x, TOP_Y, TOP_Z - 4.6);
    for (const f of [1, 2, 3]) for (const s of [-1, 1]) add(K.lanternPost(), s * (HALF + 0.65), f * 5 + 1.3, -(f * PITCH - 3));
    for (const s of [-1, 1]) { add(K.planter(2.4), s * 9.5, TOP_Y, TOP_Z - 1.6); add(K.planter(2.0), s * 10, 0, 3); }
    add(K.crate(1.4), 22, TOP_Y, -71); add(K.crate(1.2), 23.4, TOP_Y, -70.6, 0.4); add(K.crate(1.1), 22.6, TOP_Y + 1.4, -71.1, 0.2);
    add(K.cafeSet('#2f6e9a', 2), -8, TOP_Y, -68.5); add(K.cafeSet('#c8372d', 3), 30, 0, 26);
    K.trees(G, [[-26, 0, 30], [26, 0, 36], [-12, 0, 44], [14, 0, 50]], 'pine', { seed: 3 });
    K.trees(G, [[-30, TOP_Y, TOP_Z - 3], [30, TOP_Y, TOP_Z - 3], [-66, TOP_Y, TOP_Z - 3], [66, TOP_Y, TOP_Z - 3]], 'cypress', { seed: 4, scale: 1.1 });
    B.build(G);
    // --- far city and sky ---
    G.add(K.cityHill({ x: 0, y: TOP_Y, z: TOP_Z - 52, w: 700, d: 300, rise: 190, seed: 7, yaw: Math.PI }));   // the old town climbing behind the top street
    G.add(K.cityHill({ x: 0, y: 0, z: 80, w: 700, d: 200, rise: 40, count: 160, seed: 8 }));                            // the lower town behind the plaza
    daySky(G, 0, -30);
    daySky(G, 0, -30, { seed: 13, radius: 650, count: 10, size: 260, minY: 260, maxY: 520 });   // higher clouds: the stair shots look UP
    const gulls = [K.seagull(1.3), K.seagull(1.1)]; gulls.forEach((g) => G.add(g));
    G.mood = 'halcyon';
    G.props = { bigSign, shop, cars: props.children.filter((o) => o.name === 'car') };
    G.breakables = breakables; G.footprints = foot;
    G.groundAt = stairGround;
    G.spots = { bottom: [0, 0, 6], landing1: [0, 5, -13], landing2: [0, 10, -29], landing3: [0, 15, -45], top: [0, TOP_Y, -61], shopDoor: [shopX, TOP_Y, shopFront + 2], signFall: [-4, 15, -45] };
    G.preview = { cam: [6, 4.5, 26], look: [0, 13, -40], fov: 50 };
    G.update = (t) => { gulls.forEach((g, i) => { const a = t * 0.25 + i * 2.4; g.position.set(Math.cos(a) * 40, 52 + i * 6 + Math.sin(t * 0.7 + i) * 2, -40 + Math.sin(a) * 30); g.rotation.y = -a - Math.PI / 2; g.update(t + i); }); };
    return finish(G);
  }

  // =================================================================================
  // CH1 · THE RECORD SHOP (inside): dusty shelves full of records, a counter, warm lamps, a light beam from the door.
  // The golden record waits in a crate at the back. spots: door, counter, crate (the golden record), keeper
  // =================================================================================
  function recordShop() {
    const G = new THREE.Group(); G.name = 'recordShop';
    const W = 20, D = 16, H = 9, B = K.Batch();
    const floor = new THREE.MeshStandardMaterial({ map: K.tex.planks('#8a6440'), roughness: 0.8 }), plaster = new THREE.MeshStandardMaterial({ color: '#b99a78', roughness: 0.95 });
    floorAt(B, floor, W, D, 0, 0, 0, 3);
    B.add(plaster, boxG(W, H, 0.4), M(0, H / 2, -D / 2)); B.add(plaster, boxG(0.4, H, D), M(-W / 2, H / 2, 0)); B.add(plaster, boxG(0.4, H, D), M(W / 2, H / 2, 0));
    B.add(RT.plastic('#4a3426'), boxG(W, 0.4, D), M(0, H, 0));
    for (let x = -W / 2 + 2; x < W / 2; x += 3) B.add(RT.plastic('#5a3e2b'), boxG(0.4, 0.5, D), M(x, H - 0.4, 0));        // ceiling beams
    // front wall with the door and shop window (the camera can look in from the street side too)
    B.add(plaster, boxG(6, H, 0.4), M(-7, H / 2, D / 2)); B.add(plaster, boxG(4, H, 0.4), M(8, H / 2, D / 2)); B.add(plaster, boxG(10, 2.5, 0.4), M(1, H - 1.25, D / 2));
    // shelves of records along the back and left walls
    const shelfM = RT.plastic('#6b4a30', { roughness: 0.7 }), r = RT.rng(9), sleeves = [];
    const shelf = (x, z, yaw, len) => { for (let k = 0; k < 4; k++) { B.add(shelfM, boxG(len, 0.15, 1.2), M(x, 1 + k * 1.7, z).multiply(new THREE.Matrix4().makeRotationY(yaw))); for (let s = -len / 2 + 0.2; s < len / 2 - 0.2; s += 0.16) if (r() < 0.85) sleeves.push([x, z, yaw, s, 1.07 + k * 1.7]); } };
    shelf(0, -D / 2 + 0.8, 0, W - 4); shelf(-W / 2 + 0.8, -1, Math.PI / 2, D - 6);
    const sleeveG = boxG(0.08, 1.3, 1.3); sleeveG.translate(0, 0.65, 0);
    const inst = new THREE.InstancedMesh(sleeveG, new THREE.MeshStandardMaterial({ roughness: 0.6 }), sleeves.length), dm = new THREE.Object3D(), c = new THREE.Color();
    sleeves.forEach(([x, z, yaw, s, y], i) => { dm.position.set(x + Math.cos(yaw) * s, y, z - Math.sin(yaw) * s); dm.rotation.set(0, yaw, (r() - 0.5) * 0.12); dm.updateMatrix(); inst.setMatrixAt(i, dm.matrix); c.setHSL(r(), 0.5 + r() * 0.3, 0.35 + r() * 0.25); inst.setColorAt(i, c); });
    inst.instanceColor.needsUpdate = true; inst.castShadow = true; G.add(inst);
    // counter with a cash register and a record player
    B.add(RT.plastic('#7a5236', { roughness: 0.6 }), boxG(7, 2.6, 2.2), M(5, 1.3, 1)); B.add(RT.plastic('#3d2a1c'), boxG(7.3, 0.2, 2.5), M(5, 2.7, 1));
    B.add(RT.plastic('#2b2b2e'), boxG(1.6, 1.0, 1.2), M(7.2, 3.3, 1));
    B.add(RT.plastic('#c79a5b'), boxG(2.2, 0.4, 1.8), M(3.6, 3.0, 1)); B.add(RT.plastic('#111'), new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24), M(3.4, 3.25, 1));
    // the crate at the back with the golden record standing in it
    const box = K.crate(1.6); G.add(at(box, -6, 0, -D / 2 + 2.4, 0.3));                       // back-left corner, under the shelves
    const goldTex = RT.canvasTexture(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(1, '#c89a2a'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,80,10,0.35)'; for (let rr = 40; rr < 124; rr += 5) { g.beginPath(); g.arc(128, 128, rr, 0, 7); g.stroke(); } g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(128, 128, 30, 0, 7); g.fill(); });
    const golden = RT.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 32), [RT.plastic('#c89a2a', { metalness: 0.8, roughness: 0.2 }), new THREE.MeshStandardMaterial({ map: goldTex, metalness: 0.6, roughness: 0.25, emissive: '#ffcf5a', emissiveMap: goldTex, emissiveIntensity: 0.35 }), new THREE.MeshStandardMaterial({ map: goldTex, metalness: 0.6, roughness: 0.25, emissive: '#ffcf5a', emissiveMap: goldTex, emissiveIntensity: 0.35 })]);
    golden.rotation.set(Math.PI / 2 - 0.25, 0, 0.2); golden.position.set(-6, 2.1, -D / 2 + 2.4); G.add(golden);
    // warm hanging lamps + a dusty light beam from the door
    const lamps = []; for (const x of [-5, 3]) { const l = RT.mesh(new THREE.ConeGeometry(0.8, 0.7, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#2c3a2a', side: THREE.DoubleSide })); G.add(at(l, x, H - 2.0, -1)); const bulb = RT.mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a0' })); bulb.userData.glow = true; G.add(at(bulb, x, H - 2.3, -1)); B.add(RT.plastic('#222'), boxG(0.05, 1.6, 0.05), M(x, H - 0.9, -1)); const pl = new THREE.PointLight('#ffc477', 0.9, 22, 2); G.add(at(pl, x, H - 2.6, -1)); lamps.push(pl); }
    const beamT = RT.canvasTexture(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,236,190,0.5)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
    const beam = RT.mesh(new THREE.CylinderGeometry(1.6, 3.2, 14, 16, 1, true), new THREE.MeshBasicMaterial({ map: beamT, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), false);
    beam.rotation.x = -1.05; G.add(at(beam, 1, 5.5, 3.5));
    // dust motes floating in the beam
    const N = 120, pg = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const moteT = RT.canvasTexture(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    const motes = new THREE.Points(pg, new THREE.PointsMaterial({ map: moteT, color: '#fff1c8', size: 0.12, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(motes);
    B.build(G);
    G.mood = 'darkRoom';
    G.props = { golden, crate: box, lamps };
    G.breakables = [box];
    G.groundAt = () => 0;
    G.spots = { door: [1, 0, D / 2 + 1], counter: [5, 0, 3.4], crate: [-5, 0, -D / 2 + 4.8], keeper: [5, 0, -1.3] };   // counter = the customer's side
    G.preview = { cam: [3, 5.2, 12.5], look: [-3, 2.4, -4], fov: 55 };
    G.lightsUp = true;   // this interior adds its own lights (the scene sets a warmer mood)
    G.update = (t) => { for (let i = 0; i < N; i++) { const a = RT.hash(i), b = RT.hash(i + 99), cc = RT.hash(i + 7); pos[i * 3] = 1 + (a - 0.5) * 5 + Math.sin(t * 0.3 + i) * 0.3; pos[i * 3 + 1] = 1 + ((b * 7 + t * 0.08) % 7); pos[i * 3 + 2] = (cc - 0.5) * 6 + Math.cos(t * 0.25 + i) * 0.3; } pg.attributes.position.needsUpdate = true; };
    G.update(0);
    return finish(G);
  }

  // =================================================================================
  // CH2 · FOUNTAIN PIAZZA
  // A 120 × 120 open stone square. The big fountain is in the center (basin radius 9) with three marble statues.
  // North side (−z): an arched colonnade; west: café tables; south: a bell tower; edges: crates, a fruit cart, lamps.
  // spots: center, fountainEdge (Aurora's pose on the rim), west, east, north, south
  // =================================================================================
  function marble(seed, move, t = 1.1) {
    const s = RT.cast.walker(seed), m = RT.plastic('#eeeae2', { roughness: 0.55 });
    s.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(() => m) : m; });
    if (move) RT.anim.set(s, move, t); if (s.rig.update) s.rig.update(t);
    return s;
  }
  function piazza() {
    const G = new THREE.Group(); G.name = 'piazza';
    const B = K.Batch(), slabsM = new THREE.MeshStandardMaterial({ map: K.tex.slabs('#cdbda3'), roughness: 0.8 }), darkSlabs = new THREE.MeshStandardMaterial({ map: K.tex.slabs('#a8977c'), roughness: 0.8 });
    floorAt(B, slabsM, 200, 200, 0, 0, 0, 5);
    // decorative rings in the paving around the fountain
    for (const [r0, r1] of [[13, 14.2], [26, 27.4], [44, 45.2]]) { const g = new THREE.RingGeometry(r0, r1, 72, 1); g.rotateX(-Math.PI / 2); B.add(darkSlabs, K.uvScale(g, 0.2, 0.2), M(0, 0.03, 0)); }
    // --- the fountain ---
    const stone = RT.plastic('#e6dccb', { roughness: 0.7 });
    const rim = [[8.2, 0], [9.4, 0], [9.6, 1.1], [9.3, 1.45], [8.2, 1.45], [8.2, 0.2]].map(([r, y]) => new THREE.Vector2(r, y));
    B.add(stone, new THREE.LatheGeometry(rim, 64), M(0, 0, 0));
    const bowl = (r, y) => { const p = [[0.6, -1.2], [1.2, -0.9], [r - 0.3, -0.2], [r, 0.25], [r - 0.35, 0.25], [r - 0.6, 0.0], [0.5, 0.0]].map(([a, b]) => new THREE.Vector2(a, b)); B.add(stone, new THREE.LatheGeometry(p, 40), M(0, y, 0)); };
    B.add(stone, new THREE.CylinderGeometry(2.2, 2.8, 3.2, 20), M(0, 1.6, 0)); bowl(5, 4.4); B.add(stone, new THREE.CylinderGeometry(0.9, 1.2, 3.2, 16), M(0, 5.8, 0)); bowl(2.6, 7.6);
    B.add(stone, new THREE.CylinderGeometry(0.4, 0.6, 1.6, 12), M(0, 8.4, 0)); B.add(stone, new THREE.SphereGeometry(0.75, 14, 10), M(0, 9.6, 0));
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.5; B.add(stone, boxG(2.2, 1.6, 2.2), M(Math.cos(a) * 5.6, 0.8, Math.sin(a) * 5.6, 0, -a, 0)); }
    const statues = ['raiseHand', 'present', 'crossArms'].map((mv, k) => { const s = marble(700 + k, mv); const a = (k / 3) * Math.PI * 2 + 0.5; s.scale.setScalar(2.0); /* a bit larger than life */ G.add(at(s, Math.cos(a) * 5.6, 1.6, Math.sin(a) * 5.6, Math.PI / 2 - a)); return s; });
    // water: basin + bowls + falling curtains
    const waterM = new THREE.MeshStandardMaterial({ color: '#3aa9d9', roughness: 0.12, metalness: 0.1, normalMap: K.waveNormals(), normalScale: new THREE.Vector2(0.4, 0.4), transparent: true, opacity: 0.92 });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(8.3, 48), waterM); pool.rotation.x = -Math.PI / 2; pool.position.y = 1.0; G.add(pool);
    for (const [r, y] of [[4.6, 4.6], [2.3, 7.8]]) { const w = new THREE.Mesh(new THREE.CircleGeometry(r - 0.4, 32), waterM); w.rotation.x = -Math.PI / 2; w.position.y = y + 0.05; G.add(w); }
    const fallT = RT.canvasTexture(128, 64, (g) => { g.fillStyle = 'rgba(200,235,255,0.25)'; g.fillRect(0, 0, 128, 64); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; const r = RT.rng(5); for (let i = 0; i < 40; i++) { const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 3, 64); g.stroke(); } });
    fallT.wrapS = fallT.wrapT = THREE.RepeatWrapping; fallT.repeat.set(6, 1);
    const fallM = new THREE.MeshBasicMaterial({ map: fallT, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.85 });
    const falls = [[5.1, 4.6, 3.6], [2.75, 7.85, 3.2]].map(([r, y, h]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.25, h, 40, 1, true), fallM); m.position.y = y - h / 2 + 0.1; G.add(m); return m; });
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 2.2, 10, 1, true), fallM); jet.position.y = 11.2; G.add(jet);
    // --- north colonnade: an arched portico wall with a long building above and behind it ---
    const arcade = new THREE.Shape(), L = 72, AH = 9, n = 9, aw = 5, step = L / n;
    arcade.moveTo(-L / 2, 0);
    for (let i = 0; i < n; i++) { const cx = -L / 2 + step * (i + 0.5); arcade.lineTo(cx - aw / 2, 0); arcade.lineTo(cx - aw / 2, 4.5); arcade.absarc(cx, 4.5, aw / 2, Math.PI, 0, true); arcade.lineTo(cx + aw / 2, 0); }
    arcade.lineTo(L / 2, 0); arcade.lineTo(L / 2, AH); arcade.lineTo(-L / 2, AH); arcade.lineTo(-L / 2, 0);
    const arcG = new THREE.ExtrudeGeometry(arcade, { depth: 1.6, bevelEnabled: false }); K.uvScale(arcG, 1 / 4, 1 / 4);
    const arcM = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#e8d9bd', 6), roughness: 0.85 });
    B.add(arcM, arcG, M(0, 0, -56));
    B.add(K.mat.trim(), boxG(L + 1, 0.8, 7.5), M(0, AH + 0.4, -59.2));
    K.building(B, { x: 0, z: -56 - 3.5 - 6.75, w: 16, d: 3, floors: 3, color: 2, seed: 41, awnings: false, roof: 'hip' });
    floorAt(B, darkSlabs, L, 7, 0, 0.02, -59.6, 4);
    // --- the other three sides ---
    const foot = [];
    [[-74, -40, 3, 4], [-74, -12, 3, 5], [-74, 16, 3, 4], [-74, 44, 3, 3]].forEach(([x, z, d, fl], i) => foot.push(K.building(B, { x, z, yaw: Math.PI / 2, w: 6, d, floors: fl, color: i * 3 + 1, seed: 50 + i })));
    [[74, -40, 3, 5], [74, -12, 3, 4], [74, 16, 3, 5], [74, 44, 3, 4]].forEach(([x, z, d, fl], i) => foot.push(K.building(B, { x, z, yaw: -Math.PI / 2, w: 6, d, floors: fl, color: i * 3 + 4, seed: 60 + i })));
    [[-44, 74, 4], [-16, 74, 5], [16, 74, 4], [46, 74, 3]].forEach(([x, z, fl], i) => foot.push(K.building(B, { x, z, yaw: Math.PI, w: 6, d: 3, floors: fl, color: i * 3 + 6, seed: 70 + i })));
    // bell tower at the south-west corner (an original design: plain shaft, open belfry, pyramid roof)
    const tw = 9, tx = -60, tz = 62, tower = RT.plastic('#e9c08a', { roughness: 0.8 });
    B.add(tower, K.tiledBox(tw, 46, tw, 4, 4), M(tx, 23, tz));
    for (let k = 0; k < 4; k++) B.add(K.mat.trim(), boxG(tw + 0.8, 0.6, tw + 0.8), M(tx, 12 + k * 11, tz));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.add(tower, boxG(1.8, 8, 1.8), M(tx + sx * 3.6, 50, tz + sz * 3.6));
    B.add(RT.plastic('#b08a3a', { metalness: 0.6, roughness: 0.3 }), new THREE.CylinderGeometry(1.4, 2.2, 3, 14), M(tx, 49, tz));
    B.add(K.mat.trim(), boxG(tw + 1, 1, tw + 1), M(tx, 54.4, tz));
    const pyr = new THREE.ConeGeometry(1, 1, 4); pyr.rotateY(Math.PI / 4); B.add(RT.plastic('#b5552f', { flatShading: true }), pyr, M(tx, 59, tz, 0, 0, 0, (tw + 1) / Math.SQRT2, 8, (tw + 1) / Math.SQRT2));
    // --- edge props (breakable): cafés west + south, crates and a fruit cart east, lamps all around ---
    const props = new THREE.Group(); G.add(props); const breakables = [];
    const add = (o, x, y, z, yaw = 0) => { props.add(at(o, x, y, z, yaw)); if (o.userData.breakable) breakables.push(o); return o; };
    const addSet = (s, x, z) => { props.add(at(s, x, 0, z)); breakables.push(...s.userData.pieces); };
    [-36, -22, -8, 6, 20].forEach((z, i) => addSet(K.cafeSet(['#c8372d', '#2f6e9a'][i % 2]), -60, z));
    [-30, -14, 2].forEach((x, i) => addSet(K.cafeSet(['#2f7a55', '#e0a13a'][i % 2], 2), x, 60));
    add(K.fruitCart(), 60, 0, -20, Math.PI / 2);
    [[60, 8], [61.5, 9.5], [59.5, 10.2], [60.5, 30]].forEach(([x, z], i) => add(K.crate(1.3 + (i % 2) * 0.2), x, 0, z, i));
    add(K.barrel(), 62, 0, 26); add(K.barrel(), 62, 0, 28);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.26; add(K.lanternPost(), Math.cos(a) * 52, 0, Math.sin(a) * 52); }
    add(K.bench(), 30, 0, 52, Math.PI); add(K.bench(), 52, 0, 34, -Math.PI / 2);
    B.build(G);
    const flock = K.pigeons(G, 26, 4, 15, 6, 11);
    G.add(K.cityHill({ x: 0, y: 0, z: -150, w: 900, d: 300, rise: 140, seed: 21, yaw: Math.PI }));   // the town climbing the hill behind the colonnade
    daySky(G, 0, 0, { seed: 4 });
    G.mood = 'halcyon';
    G.props = { statues, pool, flock };
    G.breakables = breakables; G.footprints = foot;
    G.groundAt = (x, z) => (Math.hypot(x, z) < 9.4 ? 1.45 : 0);
    G.spots = { center: [0, 0, 0], fountainEdge: [0, 1.45, 8.9], west: [-30, 0, 0], east: [30, 0, 0], north: [0, 0, -40], south: [0, 0, 40] };
    G.preview = { cam: [14, 5, 50], look: [0, 9, -10], fov: 55 };
    G.update = (t) => { waterM.normalMap.offset.set(t * 0.03, t * 0.02); fallT.offset.y = -t * 1.6; falls.forEach((f) => (f.rotation.y = t * 0.2)); flock.update(t); };
    return finish(G);
  }

  // =================================================================================
  // CH3 · SEASIDE PROMENADE
  // The coast road runs along x (from −170 to +170). Sea on −z, city on +z. Cross-section (z):
  //   rocks + sea (< −15) | sea wall + railing (−15) | sea-side walk −14…−6 | road −6…10 (2 lanes) | city walk 10…17 | buildings > 17
  // The volcano sits across the bay (+x, −z); the Sea Fortress is visible offshore at x ≈ 260.
  // spots: laneSea (z −2), laneCity (z 6), walkSea (z −10), walkCity (z 13), cart, east, west
  // =================================================================================
  function promenade() {
    const G = new THREE.Group(); G.name = 'promenade';
    const B = K.Batch(), X0 = -175, X1 = 175, LEN = X1 - X0;
    const asphalt = new THREE.MeshStandardMaterial({ map: K.tex.asphalt(), roughness: 0.9 }), walk = new THREE.MeshStandardMaterial({ map: K.tex.sidewalk(), roughness: 0.8 }), curb = RT.plastic('#d8d2c6', { roughness: 0.8 });
    floorAt(B, asphalt, LEN, 16, 0, 0, 2, 6);
    floorAt(B, walk, LEN, 8, 0, 0.3, -10, 2); slab(B, curb, LEN, 0.3, 0.4, 0, 0, -6.2);
    floorAt(B, walk, LEN, 7, 0, 0.3, 13.5, 2); slab(B, curb, LEN, 0.3, 0.4, 0, 0, 10.2);
    slab(B, RT.plastic('#cbc3b2'), LEN, 0.3, 7.8, 0, 0, -10); slab(B, RT.plastic('#cbc3b2'), LEN, 0.3, 6.8, 0, 0, 13.6);   // sidewalk bodies
    const line = RT.plastic('#f4f1e8', { roughness: 0.6 });
    for (let x = X0; x < X1; x += 6) B.add(line, boxG(3, 0.04, 0.25), M(x + 1.5, 0.02, 2));
    for (const z of [-5.5, 9.5]) B.add(line, boxG(LEN, 0.04, 0.2), M(0, 0.02, z));
    // sea wall: parapet with a cap and an iron railing; the wall drops into the sea; rocks below
    const wallM = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#cdbb9b', 5), roughness: 0.85 });
    slab(B, wallM, LEN, 9.2, 2.2, 0, -7.8, -15.1, 4);
    B.add(K.mat.stone(), boxG(LEN, 0.3, 2.6), M(0, 1.55, -15.1));
    railing(B, X0, -15.1, X1, -15.1, 1.7, 1.4, 1.2);
    const rr = RT.rng(5), rk = []; for (let x = X0; x < X1; x += 4) rk.push([x + rr() * 4, -4 + rr() * 1.5, -18 - rr() * 6, 2 + rr() * 3, rr() * 3]); rocks(B, rk);
    // buildings on the city side (fronts face the sea), with side streets every few blocks
    const foot = []; let x = X0 + 2, i = 0;
    while (x < X1 - 10) {
      const w = 3 + (i % 3), Wd = w * BAY;
      if (i % 4 === 3) { x += 9; i++; continue; }      // a side street
      foot.push(K.building(B, { x: x + Wd / 2, z: 17.2 + 6.75, yaw: Math.PI, w, d: 3, floors: 4 + ((i * 7) % 4), color: (i * 5 + 3) % 12, seed: 800 + i }));
      x += Wd + 0.6; i++;
    }
    // --- props ---
    const props = new THREE.Group(); G.add(props); const breakables = [], lamps = [];
    const add = (o, x, y, z, yaw = 0) => { props.add(at(o, x, y, z, yaw)); if (o.userData.breakable) breakables.push(o); return o; };
    for (let lx = X0 + 8; lx < X1; lx += 18) lamps.push(add(K.globeLamp({ globes: 3 }), lx, 0.3, -12.8));
    for (let lx = X0 + 14; lx < X1; lx += 22) lamps.push(add(K.globeLamp({ globes: 1, height: 6.5 }), lx, 0.3, 11));
    for (let lx = X0 + 17; lx < X1; lx += 36) add(K.bench(), lx, 0.3, -12.6, Math.PI);
    for (let lx = X0 + 25; lx < X1; lx += 30) add(K.planter(2.0), lx, 0.3, 15.5);
    const palms = []; for (let lx = X0 + 17; lx < X1; lx += 18) palms.push([lx, 0.3, -9.2]); K.trees(G, palms, 'palm', { seed: 8, scale: 1.15 });
    const cart = add(K.fruitCart(), 18, 0.3, 13.6, 0);
    { const s = K.cafeSet('#c8372d', 3); props.add(at(s, -30, 0.3, 14)); breakables.push(...s.userData.pieces); const s2 = K.cafeSet('#2f6e9a', 2); props.add(at(s2, -40, 0.3, 14.5)); breakables.push(...s2.userData.pieces); }
    // vehicles: parked along the city curb + a few in the lanes (the scene drives them)
    const cars = [], scooters = [];
    [[-120, '#e23b3b'], [-70, '#f2c14e'], [-52, '#eeeeee'], [40, '#3d8fd6'], [92, '#5fbf7a'], [140, '#f08a4b']].forEach(([cx, col]) => cars.push(add(K.car(col), cx, 0, 8.2, Math.PI)));
    [[-12, '#9b59d0'], [60, '#e23b3b']].forEach(([cx, col]) => cars.push(add(K.car(col), cx, 0, -2, 0)));
    [[-4, '#7fd1c1'], [-1.8, '#ff8fa3'], [26, '#f2c14e'], [28, '#3d8fd6']].forEach(([cx, col]) => scooters.push(add(K.scooter(col), cx, 0.3, 11.2, Math.PI / 2)));
    B.build(G);
    // --- the sea, the far shore, the volcano, a little Sea Fortress offshore ---
    const water = K.sea({ y: -3.2 }); G.add(water);
    const volc = K.volcano({ x: 1500, y: -6, z: -700, radius: 520, height: 380 }); G.add(volc);   // across the bay, ahead along the coast (+x)
    G.add(K.cityHill({ x: 0, y: 0, z: 40, w: 520, d: 240, rise: 95, count: 230, seed: 31 }));
    G.add(K.cityHill({ x: 760, y: -4, z: -560, w: 700, d: 300, rise: 45, count: 160, seed: 32, yaw: Math.PI / 2 }));   // the far shore, climbing toward the volcano
    const fortress = farFortress(); G.add(at(fortress, 255, -3.2, -150, 0.2));
    daySky(G, 0, 0, { seed: 6 });
    const gulls = [0, 1, 2].map((k) => { const g = K.seagull(1.2); G.add(g); return g; });
    G.mood = 'halcyon';
    G.props = { cars, scooters, cart, lamps, water, gulls };
    G.breakables = breakables; G.footprints = foot;
    G.groundAt = (x, z) => (z < -6.2 || z > 10.2 ? 0.3 : 0);
    G.spots = { laneSea: [0, 0, -2], laneCity: [0, 0, 6], walkSea: [0, 0.3, -10], walkCity: [0, 0.3, 13], cart: [18, 0.3, 11.5], east: [120, 0, 2], west: [-120, 0, 2] };
    G.preview = { cam: [-44, 17, 15], look: [30, 2, -16], fov: 55 };
    G.update = (t) => { water.update(t); volc.update(t); gulls.forEach((g, k) => { const a = t * 0.3 + k * 2.1; g.position.set(-20 + Math.cos(a) * 30 + k * 25, 28 + k * 4 + Math.sin(t + k) * 2, -30 + Math.sin(a) * 14); g.rotation.y = -a - Math.PI / 2; g.update(t + k); }); };
    return finish(G);
  }
  // low-detail fortress for far-away views (the promenade): block + battlements + one round tower + bridge
  function farFortress() {
    const g = new THREE.Group(), B = K.Batch(), st = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#c9b38f', 4), roughness: 0.9 });
    slab(B, st, 42, 16, 42, 0, -2, 0, 5); for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) { B.add(st, boxG(2, 2, 2), M(k * 4.6, 15, s * 20.5)); B.add(st, boxG(2, 2, 2), M(s * 20.5, 15, k * 4.6)); }
    B.add(st, new THREE.CylinderGeometry(5, 5.5, 24, 16), M(-19, 10, -19)); slab(B, st, 7, 3, 90, 0, 3, 64, 5);
    rocks(B, [[0, -2, 0, 30, 1], [14, -2, 18, 14, 2], [-16, -2, 12, 12, 3]]);
    B.build(g); return g;
  }

  // =================================================================================
  // CH4 · SEA FORTRESS (sunset)
  // The flat top is at y = 0: 72 × 72 with a 1.4-high parapet and merlons; open space 64 × 64.
  // Walls drop 24 units to the sea (y = −24). A round tower stands at the north-west corner (−x, −z),
  // the bridge leaves from the north side (+z) toward the city and the volcano. Sunset sun is in the west (−x).
  // spots: center, haleStart (east side), danteStart (west side), stairsUp (north hatch), tower, seaEdge
  // =================================================================================
  function fortress() {
    const G = new THREE.Group(); G.name = 'fortress';
    const B = K.Batch(), S = 44, SEA = -24;   // S = half the top's size (88 design units = 44 scene units = 100 studs)
    const st = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#cbb28a', 4), roughness: 0.88 }), top = new THREE.MeshStandardMaterial({ map: K.tex.slabs('#cdbb9c'), roughness: 0.85 });
    slab(B, st, 2 * S + 6, 10, 2 * S + 6, 0, SEA - 8, 0, 5);                     // wide base (plinth) in the water
    slab(B, st, 2 * S, -SEA, 2 * S, 0, SEA, 0, 5);                               // main block
    B.add(K.mat.stone(), boxG(2 * S + 1.2, 0.8, 2 * S + 1.2), M(0, SEA + 2.4, 0)); // waterline band
    B.add(K.mat.stone(), boxG(2 * S + 0.8, 0.6, 2 * S + 0.8), M(0, -3.2, 0));       // corbel band under the parapet
    floorAt(B, top, 2 * S - 2, 2 * S - 2, 0, 0.01, 0, 5);
    // parapet + merlons (crenellations) all the way round
    for (const s of [-1, 1]) { slab(B, st, 2 * S, 1.4, 1.6, 0, 0, s * (S - 0.8), 3); slab(B, st, 1.6, 1.4, 2 * S, s * (S - 0.8), 0, 0, 3); }
    for (let k = -S + 2.4; k <= S - 2.4; k += 4.8) for (const s of [-1, 1]) { slab(B, st, 2.4, 2.0, 1.6, k, 1.4, s * (S - 0.8), 3); slab(B, st, 1.6, 2.0, 2.4, s * (S - 0.8), 1.4, k, 3); }
    // round tower at the north-west corner, small bartizans at the other three
    const towerM = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#c4a983', 6), roughness: 0.88 });
    B.add(towerM, K.uvScale(new THREE.CylinderGeometry(7.5, 8.2, 40, 28), 8, 6), M(-S + 2, SEA + 20 - 4 + 4, -S + 2));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; B.add(towerM, boxG(2.2, 2.2, 1.4), M(-S + 2 + Math.cos(a) * 7.3, 17.1, -S + 2 + Math.sin(a) * 7.3, 0, -a + Math.PI / 2, 0)); }
    B.add(K.mat.stone(), new THREE.CylinderGeometry(8.0, 8.0, 0.6, 28), M(-S + 2, 15.8, -S + 2));
    for (const [sx, sz] of [[1, -1], [1, 1], [-1, 1]]) { B.add(towerM, new THREE.CylinderGeometry(2.6, 1.4, 6.5, 14), M(sx * (S - 0.5), 0.5, sz * (S - 0.5))); B.add(RT.plastic('#9a5b3a', { flatShading: true }), new THREE.ConeGeometry(3, 3.4, 14), M(sx * (S - 0.5), 5.4, sz * (S - 0.5))); }
    // stair hatch at the north edge (where you come up from the gate)
    slab(B, st, 8, 4.4, 5, 6, 0, S - 5, 3); B.add(K.mat.stone(), boxG(8.6, 0.4, 5.6), M(6, 4.6, S - 5)); B.add(RT.plastic('#2b2420'), boxG(2.6, 3.2, 0.2), M(6, 1.6, S - 7.55));
    // gate in the north wall + the bridge (deck at y −14) with arches down into the sea
    B.add(RT.plastic('#2a2320'), boxG(8, 10, 0.4), M(0, -19, S + 0.05));
    const deckY = -14, BL = 150;
    slab(B, st, 11, 2.2, BL, 0, deckY - 2.2, S + BL / 2, 4);
    for (const s of [-1, 1]) slab(B, st, 0.9, 1.3, BL, s * 5.05, deckY, S + BL / 2, 3);
    for (let z = S + 14; z < S + BL; z += 22) slab(B, st, 9, deckY - 2.2 - SEA + 2, 4, 0, SEA - 2, z, 4);
    // edge props (breakable): crates and barrels, two old cannons on the sea side, a flag
    const props = new THREE.Group(); G.add(props); const breakables = [];
    const add = (o, x, y, z, yaw = 0) => { props.add(at(o, x, y, z, yaw)); if (o.userData.breakable) breakables.push(o); return o; };
    [[28, 0, 27], [29.6, 0, 25.4], [27.4, 1.4, 26.6], [-28, 0, 28.5], [-29.5, 0, 26.8]].forEach(([x, y, z], i) => add(K.crate(1.4 - (i % 2) * 0.2), x, y, z, i * 0.4));
    add(K.barrel(), 25.5, 0, 29.2); add(K.barrel(), 23.8, 0, 29.6); add(K.barrel(), -30.5, 0, -20);
    const cannon = () => { const g = new THREE.Group(), iron = RT.plastic('#2c2e33', { metalness: 0.6, roughness: 0.35 }), wood = RT.plastic('#7a5236');
      g.add(K.part(boxG(2.4, 0.8, 1.6), wood, 0, 0.7, 0)); for (const s of [-1, 1]) g.add(K.part(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12), iron, 0.6, 0.55, s * 0.95, Math.PI / 2, 0, 0), K.part(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12), iron, -0.7, 0.55, s * 0.95, Math.PI / 2, 0, 0));
      g.add(K.part(new THREE.CylinderGeometry(0.35, 0.5, 3.6, 14), iron, 0.9, 1.45, 0, 0, 0, -Math.PI / 2 + 0.08)); g.userData.size = [3.6, 2, 2]; return K.tag(g, 'cannon'); };
    add(cannon(), 0, 0, -S + 3.2, -Math.PI / 2); add(cannon(), -16, 0, -S + 3.2, -Math.PI / 2); add(cannon(), 16, 0, -S + 3.2, -Math.PI / 2);
    const flag = new THREE.Group(); flag.add(K.part(new THREE.CylinderGeometry(0.15, 0.18, 14, 8), K.mat.iron(), 0, 7, 0));
    const pennant = RT.mesh(new THREE.PlaneGeometry(5, 2.6, 10, 1), new THREE.MeshStandardMaterial({ color: '#c8372d', side: THREE.DoubleSide, roughness: 0.7 })); pennant.position.set(2.5, 12.6, 0); flag.add(pennant);
    G.add(at(flag, S - 4, 0, -S + 4));
    B.build(G);
    // sea, rocky island, the city shore with the volcano behind
    const water = K.sea({ y: SEA, color: '#2c6ea6', roughness: 0.12 }); G.add(water);
    const rk = [], r = RT.rng(4); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 40 + r() * 16; rk.push([Math.cos(a) * d, SEA - 1 + r() * 2, Math.sin(a) * d, 4 + r() * 6, r() * 3]); } const B2 = K.Batch(); rocks(B2, rk); B2.build(G);
    const shore = K.Batch(); slab(shore, new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#cdbb9b', 5), roughness: 0.85 }), 900, 12, 20, 0, SEA - 4, S + BL + 10, 5); shore.build(G);
    const row = K.Batch(); for (let bx = -300, k = 0; bx < 300; bx += 26, k++) K.building(row, { x: bx, y: SEA + 8, z: S + BL + 34, yaw: Math.PI, w: 5, d: 3, floors: 4 + (k % 4), color: k % 12, seed: 900 + k }); row.build(G);
    G.add(K.cityHill({ x: 0, y: SEA + 8, z: S + BL + 60, w: 900, d: 320, rise: 140, count: 300, seed: 41 }));
    const volc = K.volcano({ x: 420, y: SEA, z: 980, radius: 460, height: 330 }); G.add(volc);
    daySky(G, 0, 0, { seed: 12, tint: '#ffd9c2' });
    // ice: TSURARA freezes the top and the waves (fx.js shows/grows these). Hidden until the scene turns them on.
    const iceM = new THREE.MeshStandardMaterial({ color: '#bdf2ff', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, emissive: '#5fd8ff', emissiveIntensity: 0.12 });
    const iceTop = RT.mesh(boxG(2 * S - 3.4, 0.25, 2 * S - 3.4), iceM, false); iceTop.position.y = 0.13; iceTop.visible = false; G.add(iceTop);
    const iceSea = new THREE.Mesh(new THREE.RingGeometry(S + 4, S + 60, 64, 1), new THREE.MeshStandardMaterial({ color: '#d9f7ff', roughness: 0.2, transparent: true, opacity: 0.9, emissive: '#7fe0ff', emissiveIntensity: 0.1 }));
    iceSea.rotation.x = -Math.PI / 2; iceSea.position.y = SEA + 0.15; iceSea.visible = false; G.add(iceSea);
    G.mood = 'sunset';
    G.props = { water, flag, pennant, iceTop, iceSea, volcano: volc };
    G.breakables = breakables;
    G.groundAt = () => 0;
    G.spots = { center: [0, 0, 0], haleStart: [18, 0, -4], danteStart: [-18, 0, 4], stairsUp: [6, 0, S - 9], tower: [-S + 2, 17.4, -S + 2], seaEdge: [0, 0, -S + 4] };
    G.preview = { cam: [30, 8, 34], look: [-8, 4, -12], fov: 58 };
    G.update = (t) => { water.update(t); volc.update(t); const P = pennant.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i) + 2.5; P.setZ(i, Math.sin(x * 1.4 - t * 6) * 0.25 * (x / 5)); } P.needsUpdate = true; };
    return finish(G);
  }

  // =================================================================================
  // CH5 · ANCIENT ARENA (night)
  // A ruined oval arena (original design). Sand floor: ellipse 124 × 84 (semi-axes 62 × 42), center (0, 0).
  // A 5-high podium wall rings the floor; stepped stone tiers climb to the outer wall (ellipse 100 × 70):
  // three levels of arches + an attic. The east side (+x, around angle 0) is broken down (the ruin).
  // Purple and gold stage lights shine down on the floor; warm street lamps glow outside.
  // spots: center (Vahl), danteStart (south), friends (north: Aurora, Grant, Hale), gateS, gateN, rimCam
  // =================================================================================
  function ellipsePts(A, Bz, N) {
    const S = 2000, acc = [0], P = [];
    for (let i = 1; i <= S; i++) { const a0 = ((i - 1) / S) * Math.PI * 2, a1 = (i / S) * Math.PI * 2; acc.push(acc[i - 1] + Math.hypot(A * (Math.cos(a1) - Math.cos(a0)), Bz * (Math.sin(a1) - Math.sin(a0)))); }
    const L = acc[S];
    for (let k = 0, j = 0; k < N; k++) { const target = (k / N) * L; while (acc[j + 1] < target) j++; const a = (j / S) * Math.PI * 2; P.push({ a, x: A * Math.cos(a), z: Bz * Math.sin(a), tx: -A * Math.sin(a), tz: Bz * Math.cos(a) }); }
    return { P, len: L / N };
  }
  function archPanel(L, H, aw, ah, depth) {
    const s = new THREE.Shape(), r = aw / 2;
    s.moveTo(-L / 2, 0); s.lineTo(-r, 0); s.lineTo(-r, ah - r); s.absarc(0, ah - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, H); s.lineTo(-L / 2, H); s.lineTo(-L / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return K.uvScale(g, 1 / 4, 1 / 4);
  }
  function arena() {
    const G = new THREE.Group(); G.name = 'arena';
    const B = K.Batch(), FA = 62, FB = 42, OA = 100, OB = 70, LV = 10;
    const st = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#bba98d', 4), roughness: 0.9 }), stD = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#9f8f78', 4), roughness: 0.9 });
    // sand floor
    const fl = new THREE.CircleGeometry(1, 72); fl.rotateX(-Math.PI / 2); fl.scale(FA, 1, FB); K.uvScale(fl, FA * 2 / 5, FB * 2 / 5);
    // CircleGeometry UVs are 0..1 across the disk: rebuild them from x/z so the sand tiles evenly
    { const P = fl.attributes.position, U = fl.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 5, P.getZ(i) / 5); }
    B.add(new THREE.MeshStandardMaterial({ map: K.tex.sand('#c9ad7e'), roughness: 0.95 }), fl, M(0, 0, 0));
    // stepped tiers: a lathe profile in "ellipse units" (1 = floor edge) scaled to the oval
    const prof = [[1.0, -0.5], [1.0, 5], [1.07, 5]]; let r = 1.07, y = 5;
    for (let j = 0; j < 12; j++) { y += 2.0; prof.push([r, y]); r += 0.043; prof.push([r, y]); }
    prof.push([1.62, y], [1.62, -0.5]);
    const tiers = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 96); tiers.scale(FA, 1, FB); K.uvScale(tiers, 48, 6);
    const tierM = new THREE.MeshStandardMaterial({ map: K.tex.ashlar('#b3a184', 3), roughness: 0.9, side: THREE.DoubleSide });
    B.add(tierM, tiers, M(0, 0, 0));
    // four gates in the podium wall (dark openings at the ends of the axes)
    for (const [a, w] of [[0, 9], [Math.PI, 9], [Math.PI / 2, 7], [-Math.PI / 2, 7]]) { const x = Math.cos(a) * FA * 1.0, z = Math.sin(a) * FB * 1.0; B.add(RT.plastic('#141018'), boxG(w, 4.6, 0.6), M(x, 2.3, z).multiply(new THREE.Matrix4().makeRotationY(-a + Math.PI / 2))); }
    // outer wall: 3 arcade levels + attic, built panel by panel along the oval; the east side is ruined
    const N = 64, { P, len } = ellipsePts(OA, OB, N), panel = archPanel(len + 0.15, LV, len * 0.56, LV * 0.78, 3), attic = boxG(len + 0.15, 6, 3);
    const rn = RT.rng(17), ruin = (pt, lvl) => { const a = Math.atan2(pt.z / OB, pt.x / OA), d = Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI); return d < 0.55 - lvl * 0.12 + rn() * 0.12; };   // near angle 0 (+x)
    for (const pt of P) {
      const yaw = Math.atan2(-pt.tz, pt.tx), T = (yy) => new THREE.Matrix4().makeTranslation(pt.x, yy, pt.z).multiply(new THREE.Matrix4().makeRotationY(yaw));
      for (let lvl = 0; lvl < 3; lvl++) {
        if (lvl > 0 && ruin(pt, 3 - lvl)) continue;
        B.add(lvl === 0 ? stD : st, panel, T(lvl * LV));
        B.add(K.mat.stone(), boxG(len + 0.3, 0.7, 3.4), T((lvl + 1) * LV - 0.35));
      }
      if (!ruin(pt, 0)) B.add(st, attic, T(3 * LV + 3));
      else if (rn() < 0.6) B.add(st, boxG(len * 0.5, 2 + rn() * 5, 3), T(LV + 1 + rn() * 2));         // broken stubs
    }
    // rubble at the foot of the ruin (outside) and broken columns + stone blocks at the floor edge (breakable)
    const rub = []; for (let k = 0; k < 26; k++) { const a = (rn() - 0.5) * 1.2, d = 1.05 + rn() * 0.15; rub.push([Math.cos(a) * OA * d, 0.5, Math.sin(a) * OB * d, 1.5 + rn() * 2.5, rn() * 3]); } rocks(B, rub, '#a39274');
    const props = new THREE.Group(); G.add(props); const breakables = [];
    const column = (h, broken) => { const g = new THREE.Group(), m = RT.plastic('#d8ccb6', { roughness: 0.75 }); g.add(K.part(boxG(2.4, 0.8, 2.4), m, 0, 0.4, 0)); g.add(K.part(new THREE.CylinderGeometry(0.85, 0.95, h, 16), m, 0, 0.8 + h / 2, 0, broken ? 0.03 : 0, 0, 0)); if (!broken) g.add(K.part(boxG(2.2, 0.7, 2.2), m, 0, 0.8 + h + 0.35, 0)); g.userData.size = [2.4, h + 1.5, 2.4]; return K.tag(g, 'pillar'); };
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.31; if (Math.abs(Math.sin(a)) < 0.2) continue; const c = column(5 + (k % 3) * 2.5, k % 2 === 1); props.add(at(c, Math.cos(a) * FA * 0.9, 0, Math.sin(a) * FB * 0.88)); breakables.push(c); }
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.9, blk = K.tag(new THREE.Group(), 'block'); blk.add(K.part(boxG(2.2, 1.4, 1.6), RT.plastic('#cbbfa8', { roughness: 0.85 }), 0, 0.7, 0)); blk.userData.size = [2.2, 1.4, 1.6]; props.add(at(blk, Math.cos(a) * FA * 0.82, 0, Math.sin(a) * FB * 0.8, a)); breakables.push(blk); }
    // stage lights: four spot lights on the rim (two purple, two gold) with visible beams
    const beamT = RT.canvasTexture(16, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); });
    const spots = [], beams = [];
    [[0.6, '#9a5cff'], [2.2, '#ffc04a'], [3.6, '#9a5cff'], [5.2, '#ffc04a']].forEach(([a, col]) => {
      const p = new THREE.Vector3(Math.cos(a) * OA * 0.97, 34, Math.sin(a) * OB * 0.97), aim = new THREE.Vector3(Math.cos(a) * 12, 0, Math.sin(a) * 8);
      const sl = new THREE.SpotLight(col, 2.4, 260, 0.32, 0.6, 1.2); sl.position.copy(p); sl.target.position.copy(aim); G.add(sl, sl.target); spots.push(sl);
      const L2 = p.distanceTo(aim), cone = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 18, L2, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamT, color: col, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      cone.position.copy(p).add(aim).multiplyScalar(0.5); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(aim).normalize()); cone.userData.glow = false; G.add(cone); beams.push(cone);
      const lamp = RT.mesh(new THREE.CylinderGeometry(1.1, 1.5, 2, 12), RT.plastic('#222')); lamp.position.copy(p); G.add(lamp);
      const lens = RT.mesh(new THREE.SphereGeometry(1.0, 12, 8), new THREE.MeshBasicMaterial({ color: col })); lens.position.copy(p).add(aim.clone().sub(p).normalize().multiplyScalar(1.2)); lens.userData.glow = true; G.add(lens);
    });
    // a glowing magic-circle ring on the floor around the center (where Vahl conducts)
    const ringT = RT.canvasTexture(512, 512, (g) => { g.strokeStyle = 'rgba(190,140,255,0.9)'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 240, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 210, 0, 7); g.stroke(); g.font = '900 40px serif'; g.fillStyle = 'rgba(255,210,120,0.9)'; for (let k = 0; k < 12; k++) { g.save(); g.translate(256, 256); g.rotate((k / 12) * Math.PI * 2); g.fillText(['♩', '♪', '♫', '♬'][k % 4], -12, -218); g.restore(); } });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.userData.glow = true; G.add(ring);
    // outside: a ring road with warm street lamps
    const lampsOut = []; for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2, l = K.lanternPost(); G.add(at(l, Math.cos(a) * (OA + 16), 0, Math.sin(a) * (OB + 16))); l.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.emissiveIntensity > 0.2) { o.material = o.material.clone(); o.material.emissiveIntensity = 1.6; o.userData.glow = true; } }); lampsOut.push(l); }
    floorAt(B, new THREE.MeshStandardMaterial({ map: K.tex.cobble('#6f675e'), roughness: 0.9 }), 360, 300, 0, -0.02, 0, 4);
    B.build(G);
    const city = K.cityHill({ x: 0, y: 0, z: -260, w: 900, d: 300, rise: 120, count: 260, seed: 51, night: true, yaw: Math.PI }); G.add(city);
    const city2 = K.cityHill({ x: 0, y: 0, z: 260, w: 900, d: 300, rise: 90, count: 200, seed: 52, night: true }); G.add(city2);
    G.mood = 'arenaPurple';
    G.props = { spots, beams, ring, lampsOut };
    G.breakables = breakables;
    G.groundAt = () => 0;
    G.spots = { center: [0, 0, 0], danteStart: [0, 0, 30], friends: [[-12, 0, -22], [0, 0, -26], [12, 0, -22]], gateS: [0, 0, FB], gateN: [0, 0, -FB], rimCam: [0, 40, 110] };
    G.preview = { cam: [0, 92, 168], look: [0, 2, -12], fov: 46 };
    G.update = (t) => { ring.rotation.z = t * 0.15; beams.forEach((b, i) => (b.material.opacity = 0.13 + 0.04 * Math.sin(t * 2 + i))); };
    return finish(G);
  }

  // =================================================================================
  // ENDING · THE DARK ROOM: moonlight through a window, a record player on a small table, a second golden record
  // spinning, and a shadow figure whose smile glows. props.record spins in update; props.shadow, props.smile.
  // spots: table, shadow, cam
  // =================================================================================
  function darkRoom() {
    const G = new THREE.Group(); G.name = 'darkRoom';
    const B = K.Batch(), W = 16, D = 14, H = 9;
    floorAt(B, new THREE.MeshStandardMaterial({ map: K.tex.planks('#4a3828'), roughness: 0.8 }), W, D, 0, 0, 0, 3);
    const wallM = new THREE.MeshStandardMaterial({ color: '#2a2633', roughness: 0.95 });
    B.add(wallM, boxG(W, H, 0.4), M(0, H / 2, -D / 2)); B.add(wallM, boxG(0.4, H, D), M(W / 2, H / 2, 0));
    B.add(wallM, boxG(0.4, H, 4.5), M(-W / 2, H / 2, -D / 2 + 2.25)); B.add(wallM, boxG(0.4, H, 4.5), M(-W / 2, H / 2, D / 2 - 2.25));
    B.add(wallM, boxG(0.4, 2.6, 5), M(-W / 2, 1.3, 0)); B.add(wallM, boxG(0.4, 2.2, 5), M(-W / 2, H - 1.1, 0));          // the window hole (−x wall)
    B.add(RT.plastic('#1b1820'), boxG(0.3, 0.25, 5.2), M(-W / 2, 2.6, 0)); B.add(RT.plastic('#1b1820'), boxG(0.3, 4.2, 0.2), M(-W / 2, 4.7, 0)); B.add(RT.plastic('#1b1820'), boxG(0.3, 0.2, 5.2), M(-W / 2, 4.7, 0));
    // table + record player
    const wood = RT.plastic('#3b2a1e', { roughness: 0.6 });
    B.add(wood, new THREE.CylinderGeometry(2.2, 2.2, 0.2, 24), M(0, 2.4, -1)); B.add(wood, new THREE.CylinderGeometry(0.2, 0.3, 2.4, 10), M(0, 1.2, -1)); B.add(wood, new THREE.CylinderGeometry(1.0, 1.1, 0.15, 18), M(0, 0.08, -1));
    B.add(RT.plastic('#2b2320', { roughness: 0.4 }), boxG(2.8, 0.45, 2.2), M(0, 2.73, -1));
    B.add(RT.plastic('#9aa0a8', { metalness: 0.7, roughness: 0.3 }), boxG(0.1, 0.1, 1.5), M(1.15, 3.15, -1.2, 0, 0.35, 0));
    const goldTex = RT.canvasTexture(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(1, '#c89a2a'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,80,10,0.35)'; for (let rr = 40; rr < 124; rr += 5) { g.beginPath(); g.arc(128, 128, rr, 0, 7); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(124, 10, 8, 90); g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(128, 128, 30, 0, 7); g.fill(); });
    const gm = new THREE.MeshStandardMaterial({ map: goldTex, metalness: 0.6, roughness: 0.25, emissive: '#ffcf5a', emissiveMap: goldTex, emissiveIntensity: 0.6 });
    const record = RT.mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 40), [RT.plastic('#c89a2a', { metalness: 0.8 }), gm, gm]); record.position.set(-0.2, 3.0, -1); record.userData.glow = true; G.add(record);
    // the shadow figure behind the table (all black, glowing eyes and smile)
    const shadow = RT.cast.walker(4242), black = new THREE.MeshBasicMaterial({ color: '#050407' });
    shadow.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(() => black) : black; });
    shadow.scale.setScalar(2.9); G.add(at(shadow, 0.5, 0, -4.6, 0)); /* adult-sized silhouette */ RT.anim.set(shadow, 'idle', 1); if (shadow.rig.update) shadow.rig.update(1);
    const smileT = RT.canvasTexture(256, 128, (g) => { g.strokeStyle = '#fff4d6'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(128, 10, 92, 0.35, Math.PI - 0.35); g.stroke(); g.fillStyle = '#fff4d6'; g.beginPath(); g.ellipse(80, 30, 9, 15, -0.2, 0, 7); g.ellipse(176, 30, 9, 15, 0.2, 0, 7); g.fill(); });
    const smile = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: smileT, transparent: true, depthWrite: false, opacity: 0 })); smile.userData.glow = true;
    shadow.updateMatrixWorld(true); const hp = new THREE.Vector3(); shadow.rig.head.getWorldPosition(hp);
    smile.scale.setScalar(0.5); smile.position.set(hp.x, hp.y - 0.05, hp.z + 0.75); G.add(smile);                      // on the shadow's face
    // moonlight through the window: a soft beam + a faint city glow outside
    const beamT = RT.canvasTexture(32, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(170,195,255,0.6)'); gr.addColorStop(1, 'rgba(170,195,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 128); });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 4.6), new THREE.MeshBasicMaterial({ map: beamT, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.set(-2.5, 2.6, 0); beam.rotation.z = -0.45; G.add(beam);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ map: RT.canvasTexture(256, 160, (g) => { const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#2a2350'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160); const r = RT.rng(3); for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.7 ? '#ffd27a' : '#9fc0ff'; g.fillRect(r() * 256, 90 + r() * 70, 2, 3); } g.fillStyle = '#dfe8ff'; g.beginPath(); g.arc(200, 34, 14, 0, 7); g.fill(); }) }));
    out.position.set(-W / 2 - 3, 4.8, 0); out.rotation.y = Math.PI / 2; G.add(out);
    const moonLight = new THREE.PointLight('#9fb4ff', 0.7, 30, 2); moonLight.position.set(-6, 5, 0); G.add(moonLight);
    const gold = new THREE.PointLight('#ffc86a', 0.0, 10, 2); gold.position.set(-0.2, 3.8, -1); G.add(gold);
    B.build(G);
    G.mood = 'darkRoom';
    G.props = { record, shadow, smile, goldLight: gold };
    G.breakables = [];
    G.groundAt = () => 0;
    G.spots = { table: [0, 0, -1], shadow: [0.5, 0, -4.6], cam: [2.5, 4.6, 6] };
    G.preview = { cam: [3.2, 5.0, 8.0], look: [0.3, 4.2, -3], fov: 40 };
    G.update = (t, o = {}) => { record.rotation.y = -t * 3.5; gold.intensity = 0.8 + 0.2 * Math.sin(t * 3); smile.material.opacity = o.smile ?? 1; };
    return finish(G);
  }

  RT.locations = { SCALE, stairway, recordShop, piazza, promenade, fortress, arena, darkRoom, stairGround: (x, z) => stairGround(x / SCALE, z / SCALE) * SCALE, names: ['stairway', 'recordShop', 'piazza', 'promenade', 'fortress', 'arena', 'darkRoom'] };
})();
