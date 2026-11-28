// =====================================================================================
// echoes.js: the ECHOES (soul spirits), original designs built from the same rounded-part system as the cast,
// bigger than their users, semi-transparent, GLOWING in their own color, with an aura outline and floating particles.
//
//   const hibiki = RT.echoes.hibiki();  scene.add(hibiki);   each frame: hibiki.echo.update(t, { power, visible })
//   hibiki() · kagerou() · omamori() · tsurara() · shuen() (+ shuen.echo.orchestra: the faceless shadow orchestra)
// Every Echo root has .echo = { color, glow, aura (group), particles, update(t, o), setPower(0..1) } and is tagged
// userData.glow = true, so fx.js lets it bloom. Colors: the COL block of each function.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, C = RT.characters, { D, H, Cone, Ball, Wedge, merged, bands, outer } = C.helpers;
  const build = C.build, faceStyle = C.faceStyle;

  // ---------- turn any built model into a spirit: glowing, semi-transparent, with an outline shell ----------
  function spiritify(root, o) {
    const body = new THREE.Color(o.color), glow = new THREE.Color(o.glow), white = new THREE.Color('#ffffff');
    const shellMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: o.shell ?? 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const haloMat = new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(o.halo ?? 0.14) });   // what the bloom sees from the body: a faint halo (the outline shell, eyes and flames glow strongly)
    const meshes = []; root.traverse((m) => { if (m.isMesh && !m.userData.noSpirit && !m.userData.shell) meshes.push(m); });
    const cache = new Map();
    const conv = (mat) => {
      if (cache.has(mat)) return cache.get(mat);
      const base = (mat.color || white).clone();
      const nm = new THREE.MeshStandardMaterial({
        color: body.clone().lerp(base, o.keep ?? 0.35), map: mat.map || null,
        emissive: glow, emissiveMap: mat.map || null, emissiveIntensity: o.emissive ?? 0.32,
        transparent: true, opacity: o.opacity ?? 0.86, roughness: 0.35, metalness: 0.1, depthWrite: true,
      });
      cache.set(mat, nm); return nm;
    };
    for (const m of meshes) {
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
      m.castShadow = false; m.receiveShadow = false; m.renderOrder = 5; m.userData.haloMat = haloMat;
      if (o.outline !== false && !m.userData.noShell) { const s = new THREE.Mesh(m.geometry, shellMat); s.scale.setScalar(o.shellScale || 1.08); s.renderOrder = 4; s.userData.shell = true; m.add(s); }
      m.userData.noSpirit = true;    // (already a spirit: a parent Echo leaves it alone)
    }
    root.traverse((m) => { m.userData.glow = true; });
    return { shellMat, haloMat, materials: [...cache.values()] };
  }

  // soft round sprite texture (aura puffs and particles)
  let dotTex = null;
  function dot() {
    if (dotTex) return dotTex;
    const c = RT.canvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (dotTex = new THREE.CanvasTexture(c));
  }
  // a flame tongue (pointed top, soft sides) for the menacing aura; sprites use it anchored at their bottom
  let flameTex = null;
  function flame() {
    if (flameTex) return flameTex;
    const c = RT.canvas(64, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.filter = 'blur(3px)'; g.fillStyle = gr;
    g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(38, 40, 60, 66, 54, 100); g.quadraticCurveTo(48, 124, 32, 124); g.quadraticCurveTo(16, 124, 10, 100); g.bezierCurveTo(4, 66, 26, 40, 32, 4); g.fill();
    return (flameTex = new THREE.CanvasTexture(c));
  }
  // glowing eyes / cores: unlit and bright, never turned into spirit material, and seen by the bloom pass as pure light
  function glowEye(geo, color, x = 0, y = 0, z = 0, rz = 0, rx = 0) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.set(rx, 0, rz);
    m.userData.noSpirit = true; m.userData.noShell = true; m.userData.haloMat = new THREE.MeshBasicMaterial({ color });
    return m;
  }
  // flowing streamers (segments that wave), e.g. HIBIKI's sound-wave trails, KAGEROU's ribbons
  function streamer(parent, x, y, z, mat, n = 6, w = 0.34, len = 0.5) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const segs = []; for (let i = 0; i < n; i++) { const q = new THREE.Group(); q.position.y = i ? -len * 0.9 : 0; (i ? segs[i - 1] : g).add(q); q.add(RT.mesh(RT.roundedBoxGeometry(Math.max(0.08, w - i * w * 0.09), len, 0.05, 0.02, 1), mat).translateY(-len * 0.44)); segs.push(q); }
    return { g, segs, wave(t, ph, base = 0.5) { g.rotation.x = base + Math.sin(t * 2 + ph) * 0.2; segs.forEach((q, i) => { if (i) { q.rotation.x = Math.sin(t * 3 + ph + i * 0.8) * 0.25; q.rotation.z = Math.sin(t * 2.3 + ph + i) * 0.12; } }); } };
  }
  // aura (rising flame tongues + big flickering puffs behind the body) + floating particles rising around it
  function auraAndParticles(root, o) {
    const h = o.height, w = o.width, glow = new THREE.Color(o.glow);
    const aura = new THREE.Group(); aura.userData.glow = true; root.add(aura);
    const puffs = [];
    for (let i = 0; i < (o.puffs || 9); i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: glow, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
      const a = (i / (o.puffs || 9)) * Math.PI * 2; sp.userData = { a, y: (0.15 + 0.75 * ((i * 0.37) % 1)) * h, s: w * (0.9 + 0.5 * ((i * 0.61) % 1)) };
      sp.renderOrder = 3; aura.add(sp); puffs.push(sp);
    }
    // the menacing flame aura: tongues of light rising around the silhouette (o.flames sets how many)
    const flames = [], nf = o.flames ?? 12;
    for (let i = 0; i < nf; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flame(), color: glow, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.center.set(0.5, 0); sp.userData = { a: (i / nf) * Math.PI * 2, ph: i * 2.1, hs: 0.5 + 0.4 * ((i * 0.53) % 1) };
      sp.renderOrder = 2; aura.add(sp); flames.push(sp);
    }
    const N = o.particles || 40, pg = new THREE.BufferGeometry(), pos = new Float32Array(N * 3);
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: dot(), color: glow, size: o.particleSize || 0.22, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false; pts.renderOrder = 6; pts.userData.glow = true; root.add(pts);
    const seeds = Array.from({ length: N }, (_, i) => [RT.hash(i * 1.7 + 3), RT.hash(i * 2.3 + 7), RT.hash(i * 5.1 + 1)]);
    return {
      aura, pts,
      update(t, power = 1, light = 1) {
        puffs.forEach((sp, i) => {
          const d = sp.userData, f = 0.75 + 0.25 * Math.sin(t * 5 + i * 1.9);
          sp.position.set(Math.cos(d.a + t * 0.6) * w * 0.35, d.y + Math.sin(t * 2.2 + i) * 0.15, Math.sin(d.a + t * 0.6) * w * 0.2 - w * 0.15);
          sp.scale.setScalar(d.s * f * (0.6 + 0.5 * power)); sp.material.opacity = 0.26 * power * light * light;   // additive puffs turn white in sunlight: fade them
        });
        flames.forEach((sp, i) => {
          const d = sp.userData, f = 0.75 + 0.25 * Math.sin(t * 9 + d.ph) + 0.08 * Math.sin(t * 23 + i);
          sp.position.set(Math.cos(d.a) * w * 0.4, h * (o.flameY ?? 0.02), Math.sin(d.a) * w * 0.28 - w * 0.08);
          sp.scale.set(w * 0.45 * (0.85 + 0.15 * Math.sin(t * 5 + i)), h * d.hs * f * (0.7 + 0.5 * power), 1);
          sp.material.opacity = 0.11 * power * light * light;
        });
        for (let i = 0; i < N; i++) {
          const [a, b, c] = seeds[i], life = (t * (0.35 + b * 0.4) + c) % 1;
          const ang = a * Math.PI * 2 + t * 0.4;
          pos[i * 3] = Math.cos(ang) * w * (0.45 + 0.35 * b); pos[i * 3 + 1] = life * h * 1.15; pos[i * 3 + 2] = Math.sin(ang) * w * (0.35 + 0.3 * b);
        }
        pg.attributes.position.needsUpdate = true; pts.material.opacity = 0.85 * power * (0.5 + 0.5 * light);
      },
    };
  }

  // wrap: spirit materials + aura + an update(t) that bobs and pulses
  function finish(root, o) {
    const sp = spiritify(root, o), ap = auraAndParticles(root, o);
    const bases = sp.materials.map((m) => m.color.clone()), haloBase = sp.haloMat.color.clone();
    const echo = {
      color: o.color, glow: o.glow, name: o.name, kanji: o.kanji, aura: ap.aura, particles: ap.pts, power: 1,
      // light: 1 at night / in the studio; about 0.5 in strong sunlight, so the spirit keeps its color instead of washing out to white
      light: 1,
      setPower(p) { echo.power = p; },
      update(t, u = {}) {
        const p = u.power ?? echo.power, L = u.light ?? echo.light;
        ap.update(t, p, L);
        sp.haloMat.color.copy(haloBase).multiplyScalar(L);
        const pulse = 0.85 + 0.15 * Math.sin(t * 3.1);
        sp.materials.forEach((m, i) => { m.color.copy(bases[i]).multiplyScalar(0.4 + 0.6 * L); m.emissiveIntensity = (o.emissive ?? 0.32) * (0.6 + 0.4 * p) * pulse * L; m.opacity = (o.opacity ?? 0.86) * Math.min(1, p * 1.5); });
        sp.shellMat.opacity = (o.shell ?? 0.22) * p * (0.8 + 0.2 * Math.sin(t * 7)) * (0.5 + 0.5 * L);
        if (root.rig) root.rig.update(t);
        if (o.onUpdate) o.onUpdate(t, p);
      },
    };
    root.echo = echo;
    return root;
  }

  // ---------- 1. HIBIKI 響 (Dante's Echo): tall armored spirit, speaker-shaped shoulders, horn blades, glowing angry eyes ----------
  function hibiki() {
    const trails = [];
    const COL = { armor: '#6aa8ec', plate: '#2f66c4', seam: '#0a2858', glow: '#4fb8ff', eye: '#ffffff' };
    const root = build({
      name: 'HIBIKI', scale: 1.75, skin: COL.armor, shoes: COL.plate, hands: COL.plate, seed: 501, expression: 'neutral',
      dims: { uw: 2.3, uh: 1.2, ud: 1.1, lw: 1.9, ul: 1.12, ll: 1.12, aw: 0.86, ad: 0.86, ua: 1.0, la: 0.92 },
      face: faceStyle({ skin: COL.armor }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.plate);
          D.rect(g, c, 0, 0, 1, 1, COL.armor);
          if (f === 'front') {                                                               // chest emblem: sound waves
            g.strokeStyle = COL.seam; g.lineWidth = c.w * 0.025;
            for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(c.x + c.w * 0.5, c.y + c.h * 0.3, c.w * 0.07 * k, -Math.PI * 0.8, -Math.PI * 0.2); g.stroke(); g.beginPath(); g.arc(c.x + c.w * 0.5, c.y + c.h * 0.3, c.w * 0.07 * k, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
            D.circle(g, c, 0.5, 0.3, c.w * 0.035, COL.seam);
          }
          D.line(g, c, 0, 0.5, 1, 0.5, COL.seam, 4); for (let k = 0; k < 3; k++) D.rect(g, c, 0.1, 0.58 + k * 0.1, 0.9, 0.64 + k * 0.1, COL.plate);
        },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.plate); bands(g, c, [[0.42, COL.armor], [0.5, COL.seam], [0.92, COL.plate], [1, COL.seam]]); },
        leg(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.plate); bands(g, c, [[0.45, COL.armor], [0.52, COL.seam], [1, COL.plate]]); },
      },
      build(rig, d) {
        rig.head.visible = false;                                                             // armored helmet with a visor and a fin
        const helm = RT.mesh(RT.roundedBoxGeometry(1.36, 1.3, 1.34, 0.32, 4), RT.plastic(COL.armor)); helm.position.y = 0.02; rig.headTop.add(helm);
        rig.headTop.add(merged([H(0.14, 0.62, 1.1, 0, 0.82, -0.08, 0, 0, 0, 0.06), Wedge(0.14, 0.4, 0.5, 0, 0.62, 0.62, 0, 0, 0)], RT.plastic(COL.plate)));
        const visor = RT.atlasBox(1.12, 0.36, 0.12, (g, cells) => { for (const k in cells) D.rect(g, cells[k], 0, 0, 1, 1, '#0a1f3d'); }, { pps: 150, round: 0.05 });
        visor.position.set(0, 0.0, 0.64); rig.headTop.add(visor);
        for (const s of [-1, 1]) rig.headTop.add(glowEye(new THREE.BoxGeometry(0.36, 0.09, 0.04), COL.eye, s * 0.27, 0.0, 0.71, s * 0.28));   // angry slanted eyes that glow
        rig.headTop.add(merged([Cone(0.11, 1.05, 0.72, 0.42, -0.25, -1.0, 0, -0.55, 4), Cone(0.11, 1.05, -0.72, 0.42, -0.25, -1.0, 0, 0.55, 4)], RT.plastic(COL.plate)));   // swept-back horn blades
        rig.headTop.add(merged([H(0.9, 0.26, 0.1, 0, -0.42, 0.67, 0, 0, 0, 0.04)], RT.plastic(COL.seam)));                                                  // jaw guard
        for (const [arm, s] of [[rig.armL, 1], [rig.armR, -1]]) {                             // speaker shoulders (woofer faces out)
          const spk = new THREE.Group(); spk.position.set(s * 0.12, 0.5, 0); spk.rotation.z = s * Math.PI / 2; arm.add(spk);
          spk.add(RT.mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.5, 24), RT.plastic(COL.armor)));
          const cone = RT.canvasTexture(128, 128, (g) => { g.fillStyle = '#0d2a52'; g.fillRect(0, 0, 128, 128); g.strokeStyle = COL.glow; g.lineWidth = 6; for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(64, 64, k * 13, 0, Math.PI * 2); g.stroke(); } g.fillStyle = COL.eye; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill(); });
          const face = RT.mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 24), [RT.plastic(COL.armor), RT.plastic(COL.armor), RT.plastic('#ffffff', { map: cone })]); face.position.y = -0.28; spk.add(face);   // bottom cap (−y) faces outward
          rig.props['speaker' + (s > 0 ? 'L' : 'R')] = spk;
          arm.add(merged([H(1.2, 0.62, 1.2, 0, -1.16, 0, 0, 0, 0, 0.12)], RT.plastic(COL.plate)));    // big gauntlets
          arm.add(merged([-0.32, -0.11, 0.11, 0.32].map((x) => Cone(0.08, 0.32, x, -1.3, 0.66, Math.PI / 2, 0, 0, 4)), RT.plastic(COL.seam)));   // knuckle spikes
          arm.add(merged([Cone(0.14, 0.95, s * 0.25, 1.05, -0.15, -0.45, 0, -s * 0.5, 4), Cone(0.1, 0.7, s * 0.05, 1.0, -0.42, -0.7, 0, -s * 0.25, 4)], RT.plastic(COL.plate)));   // shoulder blades
        }
        rig.waist.add(merged([H(0.5, 0.36, 0.3, 0, d.uh - 0.1, d.ud / 2 + 0.06, 0, 0, Math.PI / 4, 0.06)], RT.plastic(COL.plate)));
        rig.waist.add(glowEye(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), COL.eye, 0, d.uh * 0.7, d.ud / 2 + 0.04, 0, Math.PI / 2));   // glowing chest core
        for (const s of [-1, 1]) trails.push(streamer(rig.waist, s * 0.6, d.uh - 0.05, -d.ud / 2 - 0.06, RT.plastic(COL.glow), 7, 0.42, 0.55));   // sound-wave trails on the back
      },
    });
    return finish(root, { name: 'HIBIKI', kanji: '響', color: COL.armor, glow: COL.glow, opacity: 0.9, emissive: 0.17, keep: 0.72, height: 4.5, width: 2.5, particles: 56, flames: 14,
      onUpdate(t) { trails.forEach((tr, i) => tr.wave(t, i * 1.7, 0.6)); } });
  }

  // ---------- 2. KAGEROU 陽炎 (Aurora's Echo): slim spirit of shimmering orange light, flowing ribbons ----------
  function kagerou() {
    const COL = { body: '#f5a24a', light: '#ffe2b0', line: '#d4500a', glow: '#ff9a3c' };
    const ribbons = [];
    const root = build({
      name: 'KAGEROU', scale: 1.65, skin: COL.body, shoes: COL.body, hands: COL.light, seed: 502, expression: 'calm',
      dims: { uw: 1.66, ud: 0.82, lw: 1.5, ld: 0.8, aw: 0.6, ad: 0.62, ul: 1.15, ll: 1.15, gw: 0.66, gd: 0.7 },
      face: faceStyle({ skin: COL.light, iris: '#ff7a1a', brow: COL.line, browW: 8, lashes: true }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.body);
          D.rect(g, c, 0, 0, 1, 1, COL.body); g.strokeStyle = COL.line; g.lineWidth = c.w * 0.02;
          for (let k = 0; k < 6; k++) { g.beginPath(); for (let i = 0; i <= 20; i++) { const x = i / 20, y = 0.1 + k * 0.15 + Math.sin(x * 9 + k) * 0.025; g[i ? 'lineTo' : 'moveTo'](c.x + c.w * x, c.y + c.h * y); } g.stroke(); }   // heat-haze lines
        },
        arm(g, f, c) { D.rect(g, c, 0, 0, 1, 1, COL.body); g.strokeStyle = COL.line; g.lineWidth = c.w * 0.05; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(c.x, c.y + c.h * (0.15 + k * 0.22)); g.quadraticCurveTo(c.x + c.w * 0.5, c.y + c.h * (0.08 + k * 0.22), c.x + c.w, c.y + c.h * (0.15 + k * 0.22)); g.stroke(); } },
        leg(g, f, c) { bands(g, c, [[0.9, COL.body], [1, COL.line]]); },
      },
      build(rig, d) {
        rig.headTop.add(merged([H(1.36, 0.3, 1.3, 0, 0.55, -0.04, 0, 0, 0, 0.15), Cone(0.32, 1.5, 0, 1.25, -0.2, -0.35, 0, 0, 6),               // a crown of flames
          Cone(0.24, 1.15, 0.38, 1.05, -0.15, -0.3, 0, -0.35, 6), Cone(0.24, 1.15, -0.38, 1.05, -0.15, -0.3, 0, 0.35, 6),
          Cone(0.18, 0.85, 0.62, 0.9, -0.1, -0.2, 0, -0.7, 6), Cone(0.18, 0.85, -0.62, 0.9, -0.1, -0.2, 0, 0.7, 6)], RT.plastic(COL.light)));
        // a mask over the face: flame marks and narrow slanted eye slits that glow
        const maskT = RT.canvasTexture(256, 256, (g) => {
          g.fillStyle = COL.light; g.beginPath(); g.ellipse(128, 128, 122, 126, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = COL.line; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 16, 170); g.quadraticCurveTo(128 + s * 64, 70, 128 + s * 112, 26); g.quadraticCurveTo(128 + s * 84, 116, 128 + s * 30, 196); g.fill(); }
          g.fillStyle = '#2a0c00'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 20, 134); g.lineTo(128 + s * 96, 104); g.lineTo(128 + s * 86, 132); g.closePath(); g.fill(); }
        });
        const mask = RT.mesh(new THREE.PlaneGeometry(1.26, 1.26), new THREE.MeshStandardMaterial({ map: maskT, transparent: true, alphaTest: 0.05 })); mask.position.set(0, 0, 0.63); rig.headTop.add(mask);
        for (const s of [-1, 1]) rig.headTop.add(glowEye(new THREE.BoxGeometry(0.3, 0.06, 0.03), '#fff3c4', s * 0.27, 0.06, 0.66, s * 0.36));
        for (const side of ['L', 'R']) {                                                       // twin heat blades
          const b = new THREE.Group(); b.add(RT.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), RT.plastic(COL.line)));
          b.add(RT.mesh(RT.roundedBoxGeometry(0.1, 2.3, 0.3, 0.04, 1), RT.plastic(COL.light)).translateY(1.4)); b.add(RT.mesh(new THREE.ConeGeometry(0.16, 0.55, 4), RT.plastic(COL.light)).translateY(2.82));
          b.rotation.x = Math.PI / 2; rig.hold(side, b); rig.props['blade' + side] = b;
        }
        for (let k = 0; k < 4; k++) {                                                         // flowing ribbons from the shoulders and waist
          const g = new THREE.Group(); g.position.set((k % 2 ? 1 : -1) * (k < 2 ? 0.7 : 0.5), k < 2 ? d.uh - 0.1 : 0.1, -d.ud / 2); (k < 2 ? rig.waist : rig.hips).add(g);
          const segs = []; for (let i = 0; i < 6; i++) { const s = new THREE.Group(); s.position.y = i ? -0.45 : 0; (i ? segs[i - 1] : g).add(s); s.add(RT.mesh(RT.roundedBoxGeometry(0.34 - i * 0.03, 0.5, 0.05, 0.02, 1), RT.plastic(COL.light)).translateY(-0.22)); segs.push(s); }
          ribbons.push({ g, segs, ph: k * 1.3 });
        }
      },
    });
    return finish(root, { name: 'KAGEROU', kanji: '陽炎', color: COL.body, glow: COL.glow, opacity: 0.74, emissive: 0.26, keep: 0.6, shell: 0.26, height: 4.0, width: 2.0, particles: 44, flames: 14,
      onUpdate(t) {
        for (const r of ribbons) { r.g.rotation.x = 0.5 + Math.sin(t * 2 + r.ph) * 0.2; r.segs.forEach((s, i) => { if (i) { s.rotation.x = Math.sin(t * 3 + r.ph + i * 0.8) * 0.25; s.rotation.z = Math.sin(t * 2.3 + r.ph + i) * 0.12; } }); }
        root.rig.inner.scale.x = root.rig.unit * (1 + Math.sin(t * 9) * 0.02);               // heat-haze shimmer
      } });
  }

  // ---------- 3. OMAMORI お守り (Grant's Echo): tiny round lucky-charm spirit with a little bell ----------
  function omamori() {
    const COL = { body: '#ffd86b', cord: '#e23b3b', bell: '#f0c040', glow: '#ffe07a', ink: '#5a3a12' };
    const root = new THREE.Group(); root.name = 'OMAMORI';
    const bodyG = new THREE.Group(); bodyG.position.y = 0.9; root.add(bodyG);
    const faceTex = RT.canvasTexture(256, 256, (g) => {
      g.fillStyle = COL.body; g.fillRect(0, 0, 256, 256);
      g.fillStyle = COL.ink; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 44, 122, 20, 27, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(128 + s * 44 - 6, 118, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = COL.ink; }
      g.fillStyle = COL.body; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 16, 110); g.lineTo(128 + s * 74, 88); g.lineTo(128 + s * 74, 60); g.lineTo(128 + s * 16, 60); g.closePath(); g.fill(); }   // angry eyelids
      g.strokeStyle = COL.ink; g.lineWidth = 11; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 18, 104); g.lineTo(128 + s * 72, 82); g.stroke(); }                    // fierce brows
      g.fillStyle = 'rgba(255,110,110,0.55)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 74, 150, 18, 10, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = COL.ink; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(108, 160); g.quadraticCurveTo(130, 168, 152, 150); g.stroke();   // a confident smirk
      g.font = 'bold 40px "Dela Gothic One", sans-serif'; g.textAlign = 'center'; g.fillStyle = COL.cord; g.fillText('福', 128, 222);
    });
    const sphere = new THREE.SphereGeometry(0.46, 28, 20);
    const body = RT.mesh(sphere, new THREE.MeshStandardMaterial({ color: '#ffffff', map: faceTex })); body.scale.set(1, 0.92, 0.86); body.rotation.y = -Math.PI / 2; bodyG.add(body);
    bodyG.add(merged([{ geo: new THREE.TorusGeometry(0.13, 0.05, 8, 16), matrix: RT.mat4(0, 0.48, 0, 0, 0, 0) }, { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), matrix: RT.mat4(0.1, 0.36, 0.04, 0, 0, 0.6) }, { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), matrix: RT.mat4(-0.1, 0.36, 0.04, 0, 0, -0.6) }], RT.plastic(COL.cord)));
    bodyG.scale.setScalar(1.4);                                                                 // bigger than before
    const band = RT.mesh(new THREE.TorusGeometry(0.43, 0.055, 8, 32), RT.plastic(COL.cord)); band.rotation.x = Math.PI / 2; band.scale.set(0.87, 1, 1); band.position.y = 0.17; bodyG.add(band);   // fighting headband
    const tails = [-1, 1].map((s) => { const q = new THREE.Group(); q.position.set(s * 0.07, 0.17, -0.42); bodyG.add(q); q.add(RT.mesh(RT.roundedBoxGeometry(0.09, 0.42, 0.03, 0.01, 1), RT.plastic(COL.cord)).translateY(-0.2)); return q; });
    const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.42, -0.05, 0.05); bodyG.add(a); a.add(RT.mesh(RT.roundedBoxGeometry(0.12, 0.26, 0.12, 0.05, 2), RT.plastic(COL.body)).translateY(-0.1)); return a; });
    const bell = new THREE.Group(); bell.position.y = -0.42; bodyG.add(bell);
    bell.add(RT.mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), RT.plastic(COL.cord)).translateY(-0.1));
    bell.add(RT.mesh(new THREE.SphereGeometry(0.11, 16, 12), RT.metal(COL.bell)).translateY(-0.25));
    return finish(root, { name: 'OMAMORI', kanji: 'お守り', color: COL.body, glow: COL.glow, opacity: 0.95, emissive: 0.25, keep: 0.75, shell: 0.25, shellScale: 1.12, height: 2.0, width: 1.4, particles: 30, particleSize: 0.16, puffs: 6, flames: 8, flameY: 0.2,
      onUpdate(t) {
        tails.forEach((q, i) => { q.rotation.x = 0.9 + Math.sin(t * 7 + i) * 0.25; q.rotation.z = (i ? 1 : -1) * 0.3; });
        bodyG.position.y = 0.9 + Math.sin(t * 3.2) * 0.08; bodyG.rotation.z = Math.sin(t * 2.1) * 0.12;
        arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (0.4 + Math.sin(t * 8 + i) * 0.35); });
        bell.rotation.z = Math.sin(t * 6) * 0.5;
      } });
  }

  // ---------- 4. TSURARA 氷柱 (Hale's Echo): ice knight with a frozen lance, pale cyan ----------
  function tsurara() {
    const COL = { ice: '#6cc6ea', crystal: '#2ea3cf', deep: '#0b4f6b', glow: '#4fd6ff' };
    const root = build({
      name: 'TSURARA', scale: 1.72, skin: COL.ice, shoes: COL.crystal, hands: COL.crystal, seed: 504, expression: 'cold',
      dims: { uw: 2.2, uh: 1.15, ud: 1.0, ul: 1.1, ll: 1.1, aw: 0.8, ad: 0.8 },
      face: faceStyle({ skin: COL.ice }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.crystal);
          D.rect(g, c, 0, 0, 1, 1, COL.ice);
          D.poly(g, c, [[0.5, 0.05], [0.8, 0.3], [0.5, 0.6], [0.2, 0.3]], COL.crystal); D.poly(g, c, [[0.5, 0.12], [0.7, 0.3], [0.5, 0.5], [0.3, 0.3]], COL.deep);   // crystal core
          for (let k = 0; k < 4; k++) D.line(g, c, 0.08 + k * 0.28, 0.62, 0.2 + k * 0.28, 0.98, COL.deep, 3);
        },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.crystal); bands(g, c, [[0.4, COL.ice], [0.48, COL.deep], [1, COL.crystal]]); },
        leg(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.crystal); bands(g, c, [[0.5, COL.ice], [0.56, COL.deep], [1, COL.crystal]]); },
      },
      build(rig, d) {
        rig.head.visible = false;
        rig.headTop.add(RT.mesh(RT.roundedBoxGeometry(1.32, 1.28, 1.3, 0.24, 3), RT.plastic(COL.ice)));
        const crown = []; for (let k = 0; k < 7; k++) { const x = (k - 3) * 0.2, hh = 0.75 + (3 - Math.abs(k - 3)) * 0.3; crown.push(Cone(0.11, hh, x, 0.65 + hh / 2, -0.05, -0.1, 0, -x * 0.35, 5)); }   // a tall icicle crown
        rig.headTop.add(merged(crown, RT.plastic(COL.crystal)));
        const visor = RT.atlasBox(1.1, 0.26, 0.1, (g, cells) => { for (const k in cells) D.rect(g, cells[k], 0, 0, 1, 1, '#0a2a36'); }, { pps: 150, round: 0.04 });
        visor.position.set(0, -0.02, 0.62); rig.headTop.add(visor);
        for (const s of [-1, 1]) rig.headTop.add(glowEye(new THREE.BoxGeometry(0.34, 0.07, 0.04), '#eaffff', s * 0.26, -0.02, 0.69, s * 0.3));   // cold glowing eye slits
        const wing = []; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const a = 0.3 + k * 0.33, L = 2.0 - k * 0.3; wing.push(Cone(0.15, L, s * (0.3 + Math.sin(a) * L * 0.5), d.uh * 0.55 + Math.cos(a) * L * 0.5, -d.ud / 2 - 0.3, -0.35, 0, -s * a, 4)); }
        rig.waist.add(merged(wing, RT.plastic(COL.crystal)));                                         // ice wings: shards fanned on the back
        for (const [arm, s] of [[rig.armL, 1], [rig.armR, -1]]) arm.add(merged([Cone(0.42, 0.9, s * 0.2, 0.75, 0, 0, 0, -s * 0.5, 5), Cone(0.25, 0.6, s * 0.1, 0.8, 0.3, 0.4, 0, -s * 0.3, 5)], RT.plastic(COL.crystal)));   // icicle pauldrons
        const lance = new THREE.Group();                                                        // the frozen lance (in the right hand)
        lance.add(RT.mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), RT.plastic(COL.deep)).translateY(0.5));
        const blade = RT.mesh(new THREE.OctahedronGeometry(0.4, 0), RT.plastic(COL.crystal)); blade.scale.set(1, 3.6, 0.45); blade.position.y = 3.4; lance.add(blade);   // long crystal blade
        lance.add(merged([Cone(0.1, 0.8, 0.32, 2.5, 0, 0, 0, -0.6, 4), Cone(0.1, 0.8, -0.32, 2.5, 0, 0, 0, 0.6, 4)], RT.plastic(COL.ice)));                          // side shards
        lance.add(RT.mesh(new THREE.CylinderGeometry(0.4, 0.14, 0.32, 6), RT.plastic(COL.ice)).translateY(2.1));
        lance.rotation.x = Math.PI / 2; rig.hold('R', lance); rig.props.lance = lance;
      },
    });
    return finish(root, { name: 'TSURARA', kanji: '氷柱', color: COL.ice, glow: COL.glow, opacity: 0.88, emissive: 0.17, keep: 0.7, height: 4.3, width: 2.4, particles: 50, particleSize: 0.2, flames: 14 });
  }

  // ---------- 5. SHŪEN 終焉 (Vahl's Echo): giant dark-violet spirit, cracked golden mask, shadow orchestra ----------
  function shuenMask() {
    return RT.canvasTexture(512, 450, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 450); gr.addColorStop(0, '#ffe28a'); gr.addColorStop(1, '#c08a1e'); g.fillStyle = gr; g.fillRect(0, 0, 512, 450);
      for (const s of [-1, 1]) { g.fillStyle = '#1a0726'; g.beginPath(); g.moveTo(256 + s * 40, 250); g.lineTo(256 + s * 170, 200); g.lineTo(256 + s * 150, 270); g.closePath(); g.fill(); g.fillStyle = '#d07bff'; g.beginPath(); g.arc(256 + s * 120, 238, 10, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#1a0726'; g.fillRect(186, 340, 140, 18);
      g.strokeStyle = '#3a1450'; g.lineWidth = 7; g.lineJoin = 'miter';
      const crack = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke(); };
      crack([[180, 0], [205, 90], [160, 150], [190, 220]]); crack([[400, 450], [380, 380], [420, 320], [395, 280]]); crack([[205, 90], [260, 120]]);
    });
  }
  function shuen() {
    const capes = [];
    const COL = { body: '#2a1d5e', robe: '#1a1240', trim: '#d4a73a', glow: '#6f4dff', mask: '#f0c060' };
    let maskMat;
    const robePanel = (g, cells) => { for (const k in cells) { const c = cells[k]; D.rect(g, c, 0, 0, 1, 1, COL.robe); D.rect(g, c, 0, 0.9, 1, 0.96, COL.trim); D.bevel(g, c, 0.08); } };
    const root = build({
      name: 'SHUEN', scale: 2.6, skin: COL.body, shoes: COL.robe, hands: COL.body, seed: 505, expression: 'neutral',
      dims: { uw: 2.6, uh: 1.3, ud: 1.25, lw: 2.3, lh: 1.05, ul: 1.15, ll: 1.15, aw: 0.95, ad: 0.95, ua: 1.1, la: 1.0 },
      face: faceStyle({ skin: COL.mask }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.robe);
          D.rect(g, c, 0, 0, 1, 1, COL.body);
          if (f === 'front') { D.poly(g, c, [[0.3, 0], [0.7, 0], [0.5, 0.55]], COL.robe); for (let y = 0.12; y < 0.5; y += 0.12) D.line(g, c, 0.5 - y * 0.35, y, 0.5 + y * 0.35, y, COL.trim, 3); }
          D.rect(g, c, 0, 0.82, 1, 0.88, COL.trim);
        },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.body); bands(g, c, [[0.8, COL.robe], [0.86, COL.trim], [1, COL.body]]); },
        leg(g, f, c) { bands(g, c, [[1, COL.robe]]); },
      },
      build(rig, d) {
        maskMat = new THREE.MeshStandardMaterial({ map: shuenMask(), roughness: 0.3, metalness: 0.5 });
        rig.head.material[4] = maskMat; for (const i of [0, 1, 2, 3, 5]) rig.head.material[i] = RT.metal(COL.mask);
        rig.head.userData.noShell = false;
        rig.setFace = () => rig; rig.setMouth = () => rig; rig.setEyes = () => rig;
        const halo = []; for (let k = 0; k < 9; k++) { const a = -Math.PI * 0.9 + (k / 8) * Math.PI * 0.8; halo.push(Cone(0.12, 0.7, Math.cos(a) * 1.1, 0.4 + Math.sin(-a) * 0.9, -0.5, 0, 0, a + Math.PI / 2, 4)); }
        rig.headTop.add(merged(halo, RT.metal(COL.trim)));                                    // a crown of golden shards behind the mask
        for (const s of [-1, 1]) rig.headTop.add(glowEye(new THREE.SphereGeometry(0.075, 10, 8), '#e6a8ff', s * 0.28, -0.04, 0.64));   // eyes glowing through the mask
        for (const [arm, s] of [[rig.armL, 1], [rig.armR, -1]]) arm.add(merged([Cone(0.18, 1.15, s * 0.2, 1.05, 0, 0, 0, -s * 0.35, 4), Cone(0.14, 0.85, s * 0.5, 0.85, 0.2, 0.25, 0, -s * 0.8, 4), Cone(0.14, 0.85, s * 0.5, 0.85, -0.3, -0.3, 0, -s * 0.8, 4)], RT.metal(COL.trim)));   // golden shoulder spikes
        for (let k = 0; k < 5; k++) { const pnl = RT.mesh(RT.roundedBoxGeometry(0.58, 2.6 + (k % 2) * 0.7, 0.06, 0.02, 1), RT.plastic(COL.robe)); pnl.position.set(-1.16 + k * 0.58, d.uh - 1.4 - (k % 2) * 0.35, -d.ud / 2 - 0.14); pnl.rotation.x = 0.1; rig.waist.add(pnl); capes.push(pnl); }   // a tattered cape
        const L = d.ul + d.ll - 0.1, mk = (w, dd, x, z) => { const m = RT.atlasBox(w, L, dd, robePanel, { pps: 40, round: 0.05 }); m.position.set(x, 0.05 - L / 2, z); rig.hips.add(m); };
        mk(2.5, 0.14, 0, d.ld / 2 + 0.1); mk(2.5, 0.14, 0, -(d.ld / 2 + 0.1)); mk(0.14, 1.3, d.lw / 2 + 0.12, 0); mk(0.14, 1.3, -(d.lw / 2 + 0.12), 0);
      },
    });
    // the faceless shadow orchestra: silhouettes with instruments floating in a half circle behind SHŪEN
    const orchestra = new THREE.Group(); orchestra.name = 'orchestra';
    const inst = [
      (m) => merged([H(0.5, 0.9, 0.16, 0, 0, 0, 0, 0, 0, 0.12), H(0.08, 0.8, 0.08, 0, 0.8, 0)], m),     // violin
      (m) => merged([{ geo: new THREE.ConeGeometry(0.3, 1.0, 12), matrix: RT.mat4(0, 0, 0, Math.PI / 2, 0, 0) }], m), // horn
      (m) => merged([{ geo: new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16), matrix: RT.mat4(0, 0, 0) }], m),        // drum
      (m) => merged([H(0.8, 1.5, 0.3, 0, 0, 0, 0, 0, 0, 0.2), H(0.1, 1.0, 0.1, 0, 1.2, 0)], m),         // cello
    ];
    const players = [];
    for (let k = 0; k < 8; k++) {
      const p = C.citizen(900 + k, { palette: 'halcyon' }); p.rig.head.material[4] = p.rig.head.material[0];   // faceless
      const inst0 = inst[k % 4](RT.plastic('#000000')); inst0.position.set(0, 2.4, 0.7); p.rig.inner.add(inst0);
      const a = Math.PI * (0.15 + 0.7 * (k / 7)), r = 7.5;
      p.position.set(Math.cos(a) * r, 0.6 + (k % 2) * 0.8, -Math.sin(a) * r * 0.6 - 2.5); p.rotation.y = Math.atan2(-p.position.x, 4 - p.position.z) * 0.6;
      p.scale.setScalar(1.25); orchestra.add(p); players.push(p);
    }
    spiritify(orchestra, { color: '#0a0510', glow: '#7a3dc4', opacity: 0.72, emissive: 0.2, keep: 0.05, shell: 0.3, halo: 0.3 });
    root.add(orchestra);
    const out = finish(root, { name: 'SHŪEN', kanji: '終焉', color: COL.body, glow: COL.glow, opacity: 0.9, emissive: 0.35, height: 7.4, width: 4.3, particles: 70, particleSize: 0.32, puffs: 12, flames: 16,
      onUpdate(t, p) {
        capes.forEach((c, i) => { c.rotation.x = 0.12 + Math.sin(t * 1.8 + i * 0.9) * 0.08; c.rotation.z = Math.sin(t * 1.3 + i) * 0.04; });
        players.forEach((pl, i) => { pl.position.y = 0.6 + (i % 2) * 0.8 + Math.sin(t * 2 + i) * 0.15; pl.rig.waist.rotation.z = Math.sin(t * 4.2 + i) * 0.15; pl.rig.armR.rotation.x = -1 + Math.sin(t * 8.4 + i) * 0.3; });
      } });
    out.echo.orchestra = orchestra;
    out.echo.crackMask = (p) => { const m = out.rig.head.material[4]; m.emissive = new THREE.Color(p > 0 ? '#e0a0ff' : COL.glow); m.emissiveIntensity = 0.45 + p * 1.6; };
    return out;
  }

  RT.echoes = { hibiki, kagerou, omamori, tsurara, shuen, spiritify, names: ['hibiki', 'kagerou', 'omamori', 'tsurara', 'shuen'] };
})();
