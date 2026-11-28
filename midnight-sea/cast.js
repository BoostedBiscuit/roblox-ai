// =====================================================================================
// cast.js: THE MIDNIGHT SEA cast (locked designs from midnight-sea/STORY.md, Stage 3). Original blocky avatars.
//
//   const nara = RT.cast.nara();                 // narrator, 15 (charcoal hoodie, low black ponytail with a red tie, red bracelet)
//   const shadow = RT.cast.nara({ shadow: true }); // her midnight form (same model, solid black eyes with a red ring, blank face)
//   const milo = RT.cast.milo();                 // little brother, 8 (striped pyjamas, barefoot, blue plush whale in his LEFT hand)
//   RT.cast.bram() · RT.cast.odell() · RT.cast.pike() · RT.cast.sleeper(seed)   // the sleepwalkers (eyes closed: rig.setEyes('closed'))
//   RT.cast.phone()                              // Nara's phone (cracked corner), screen: phone.userData.setScreen(text, rec)
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, D = RT.draw, C = RT.characters, P = C.parts;
  const { H, Cone, Ball, merged, bands } = P;

  // ---------- NARA VALE ----------
  function nara(o = {}) {
    const COL = { skin: '#d7a07e', hair: '#141012', hoodie: '#3a3a40', jeans: '#1b1b21', shoes: '#141416', string: '#e9e6df', red: '#c41e24' };
    const Hd = RT.shade(COL.hoodie, -0.25), Hl = RT.shade(COL.hoodie, 0.14);
    const face = o.shadow
      ? C.faceStyle({ skin: COL.skin, sclera: '#070405', iris: '#000000', ring: '#ff2618', noShine: true, brow: COL.hair, browW: 12, lashes: true, bags: true })
      : C.faceStyle({ skin: COL.skin, iris: '#3a2214', brow: COL.hair, browW: 12, lashes: true, bags: true, lidBias: 0.12 });
    return C.build({
      name: o.shadow ? 'NaraShadow' : 'Nara', skin: COL.skin, shoes: COL.shoes, seed: 21, expression: o.expression || (o.shadow ? 'blank' : 'determined'),
      dims: { uw: 2.08, ud: 1.06, lw: 1.96, ld: 1.02, aw: 0.78, ad: 0.8 },        // the hoodie is oversized
      face,
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.hoodie : COL.jeans);
          D.rect(g, c, 0, 0, 1, 1, COL.hoodie);
          if (f === 'front') {
            D.rect(g, c, 0.24, 0.56, 0.76, 0.82, Hd); D.stitch(g, c, 0.26, 0.58, 0.74, 0.58);       // kangaroo pocket
            D.line(g, c, 0.42, 0.0, 0.41, 0.27, COL.string, 4); D.line(g, c, 0.58, 0.0, 0.59, 0.27, COL.string, 4);   // drawstrings
            D.circle(g, c, 0.41, 0.28, 4, COL.string); D.circle(g, c, 0.59, 0.28, 4, COL.string);
            D.poly(g, c, [[0.36, 0], [0.64, 0], [0.56, 0.07], [0.44, 0.07]], Hd);               // neckline
          }
          if (f === 'back') D.rect(g, c, 0.2, 0.0, 0.8, 0.16, Hd);
          D.rect(g, c, 0, 0.84, 1, 0.92, Hd); for (let x = 0.02; x < 1; x += 0.05) D.line(g, c, x, 0.85, x, 0.91, 'rgba(0,0,0,0.18)', 2);   // ribbed hem
          D.rect(g, c, 0, 0.92, 1, 1, COL.jeans);
          D.rect(g, c, 0.06, 0.2, 0.1, 0.5, Hl);
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, Hd);
          bands(g, c, [[0.88, COL.hoodie], [1, Hd]]);
          for (let x = 0.05; x < 1; x += 0.1) D.line(g, c, x, 0.89, x, 0.99, 'rgba(0,0,0,0.18)', 2);
          if (P.outer && P.outer(f, info)) D.stitch(g, c, 0.5, 0.05, 0.5, 0.84);
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.jeans : COL.shoes);
          bands(g, c, [[0.84, COL.jeans], [0.93, COL.shoes], [1, '#e8e6e0']]);                  // black sneakers, white soles
          if (P.outer && P.outer(f, info)) D.line(g, c, 0.5, 0.02, 0.5, 0.82, '#2a2a33', 2);
          if (f === 'front') D.line(g, c, 0.3, 0.84, 0.7, 0.84, '#e8e6e0', 2);
        },
      },
      build(rig, d) {
        const hm = RT.plastic(COL.hair, { roughness: 0.5 });
        rig.headTop.add(merged([
          H(1.38, 0.44, 1.32, 0, 0.5, -0.03, 0, 0, 0, 0.2),
          H(1.38, 1.05, 0.34, 0, 0.0, -0.47, 0, 0, 0, 0.14),
          H(0.13, 1.0, 0.98, 0.685, -0.02, -0.1, 0, 0, 0.03, 0.06), H(0.13, 1.0, 0.98, -0.685, -0.02, -0.1, 0, 0, -0.03, 0.06),
          H(0.12, 0.62, 0.18, 0.66, -0.3, 0.38, 0.08, 0, 0.1, 0.05), H(0.12, 0.62, 0.18, -0.66, -0.3, 0.38, 0.08, 0, -0.1, 0.05),   // loose strands framing the face
          H(0.8, 0.2, 0.26, 0.2, 0.36, 0.55, 0, 0, -0.16, 0.09), H(0.5, 0.17, 0.24, -0.38, 0.39, 0.55, 0, 0, 0.12, 0.07),
        ], hm));
        // the low ponytail (sways), red hair tie at its root
        const tail = new THREE.Group(); tail.position.set(0, -0.32, -0.66); rig.headTop.add(tail);
        const pieces = [];
        for (let k = 0; k < 5; k++) { const w = 0.34 - k * 0.035; pieces.push(H(w, 0.32, w * 0.85, 0, -0.2 - k * 0.27, -0.04 * k, 0.08, 0, 0, 0.08)); }
        tail.add(merged(pieces, hm));
        tail.add(merged([H(0.3, 0.1, 0.3, 0, -0.04, 0, 0, 0, 0, 0.04)], RT.plastic(COL.red)));
        rig.props.ponytail = tail;
        rig.sway.push((t, r) => { tail.rotation.x = 0.16 - r.waist.rotation.x * 0.8 - r.hips.rotation.x * 0.6 + Math.sin(t * 1.7) * 0.05; tail.rotation.z = Math.sin(t * 1.2 + 2) * 0.07; });
        // the hood, down, resting on her back
        const hood = merged([H(1.45, 0.42, 0.62, 0, 0, 0, -0.25, 0, 0, 0.18)], RT.plastic(COL.hoodie, { roughness: 0.9 }));
        hood.position.set(0, d.uh - 0.05, -d.ud / 2 - 0.18); rig.waist.add(hood);
        // thin red string bracelet on the LEFT wrist
        const br = RT.mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 16), RT.plastic(COL.red), false); br.rotation.x = Math.PI / 2; br.position.y = 0.08;
        rig.handL.add(br);
      },
    });
  }

  // ---------- MILO VALE ----------
  function whale() {
    const g = new THREE.Group(), blue = RT.plastic('#4f86c6', { roughness: 0.95 }), belly = RT.plastic('#cfe0f2', { roughness: 0.95 }), ink = RT.plastic('#141414');
    const body = RT.mesh(new THREE.SphereGeometry(0.5, 16, 12), blue); body.scale.set(0.62, 0.55, 1); g.add(body);
    const bel = RT.mesh(new THREE.SphereGeometry(0.5, 16, 12), belly); bel.scale.set(0.5, 0.4, 0.86); bel.position.set(0, -0.08, 0.02); g.add(bel);
    for (const s of [-1, 1]) {
      const fin = RT.mesh(new THREE.SphereGeometry(0.5, 10, 8), blue); fin.scale.set(0.12, 0.34, 0.12); fin.position.set(s * 0.36, -0.12, 0.1); fin.rotation.z = s * 0.9; g.add(fin);
      const tl = RT.mesh(new THREE.SphereGeometry(0.5, 10, 8), blue); tl.scale.set(0.34, 0.08, 0.18); tl.position.set(s * 0.14, 0.12, -0.58); tl.rotation.y = s * 0.5; g.add(tl);
      const eye = RT.mesh(new THREE.SphereGeometry(0.05, 8, 6), ink); eye.position.set(s * 0.22, 0.06, 0.38); g.add(eye);
    }
    g.userData.whale = true;
    return g;
  }
  function milo(o = {}) {
    const COL = { skin: '#d7a07e', hair: '#141012', top: '#efe8dc', stripe: '#c0262f', pants: '#22305a' };
    const stripes = (g, c, to) => { D.rect(g, c, 0, 0, 1, to, COL.top); for (let y = 0.06; y < to - 0.03; y += 0.14) D.rect(g, c, 0, y, 1, Math.min(to, y + 0.065), COL.stripe); };
    const m = C.build({
      name: 'Milo', scale: 0.75, headScale: 1.14, skin: COL.skin, shoes: COL.skin, seed: 23, expression: o.expression || 'neutral',
      face: C.faceStyle({ skin: COL.skin, iris: '#4a2c18', brow: COL.hair, browW: 11, freckles: true, eyeSize: 1.14, blush: true }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.top : COL.pants);
          stripes(g, c, 0.9); D.rect(g, c, 0, 0.9, 1, 1, COL.pants);
          if (f === 'front') { D.poly(g, c, [[0.36, 0], [0.64, 0], [0.5, 0.12]], COL.skin); D.line(g, c, 0.36, 0, 0.5, 0.12, COL.stripe, 5); D.line(g, c, 0.64, 0, 0.5, 0.12, COL.stripe, 5);
            for (let k = 0; k < 4; k++) D.circle(g, c, 0.5, 0.24 + k * 0.17, 4, '#ffffff'); }
        },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.top); stripes(g, c, 1); D.rect(g, c, 0, 0.9, 1, 1, COL.top); },
        leg(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.pants : COL.skin); bands(g, c, [[0.86, COL.pants], [0.9, RT.shade(COL.pants, 0.2)], [1, COL.skin]]); },
      },
      build(rig) {
        const hm = RT.plastic(COL.hair, { roughness: 0.55 });
        const Pc = [H(1.36, 0.42, 1.3, 0, 0.45, -0.02, 0, 0, 0, 0.16), H(1.36, 0.8, 0.32, 0, 0.1, -0.47, 0, 0, 0, 0.12), H(0.15, 0.5, 0.95, 0.69, 0.22, -0.1), H(0.15, 0.5, 0.95, -0.69, 0.22, -0.1)];
        const r = RT.rng(9);
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + r() * 0.4, tilt = 0.5 + r() * 0.5; Pc.push(Cone(0.17, 0.46 + r() * 0.2, Math.sin(a) * 0.42, 0.66, Math.cos(a) * 0.4 - 0.05, Math.cos(a) * tilt, 0, -Math.sin(a) * tilt)); }
        Pc.push(Cone(0.12, 0.5, 0.05, 0.82, -0.45, -0.7, 0, 0.3));                          // the cowlick at the back
        for (const x of [-0.28, 0.04, 0.3]) Pc.push(Cone(0.15, 0.36, x, 0.32, 0.6, 2.3 + x * 0.3, 0, x * 0.8));
        rig.headTop.add(merged(Pc, hm));
        const w = whale(); w.scale.setScalar(1.25); w.position.set(0, -0.05, 0.35); w.rotation.set(-0.3, 0, 0); rig.hold('L', w); rig.props.whale = w;
      },
    });
    return m;
  }

  // ---------- SLEEPWALKERS ----------
  function person(name, o) {
    return C.build({
      name, scale: o.scale || 1, skin: o.skin, shoes: o.shoes, seed: o.seed, expression: 'neutral',
      face: C.faceStyle(Object.assign({ skin: o.skin, iris: '#3d2a1a', brow: o.brow || o.hair, browW: 12 }, o.face || {})),
      clothes: o.clothes || P.genericClothes({ top: o.top || 'tee', shirt: o.shirt, pants: o.pants, shoes: o.shoes, skin: o.skin, belt: '#2a1d14' }),
      build(rig) {
        const h = P.hairStyle(o.hairStyle || 'short', o.hair, RT.rng(o.seed));
        if (h.pieces.length) rig.headTop.add(merged(h.pieces, RT.plastic(h.color || o.hair, { roughness: 0.6 })));
        if (o.build) o.build(rig);
      },
    });
  }
  function bram() {
    const coat = '#e0ae1c', coatD = RT.shade(coat, -0.25);
    return person('Bram', { seed: 31, skin: '#d8a888', hair: '#b9b7b1', hairStyle: 'short', shoes: '#2c2a28', face: { bushy: true },
      clothes: {
        torso(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, coat); D.rect(g, c, 0, 0, 1, 1, coat);
          if (f === 'front') { D.line(g, c, 0.5, 0, 0.5, 1, coatD, 5); for (let k = 0; k < 4; k++) D.rect(g, c, 0.53, 0.15 + k * 0.2, 0.6, 0.2 + k * 0.2, '#30302c'); D.rect(g, c, 0.1, 0.62, 0.36, 0.76, coatD); D.rect(g, c, 0.64, 0.62, 0.9, 0.76, coatD); } },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, coatD); bands(g, c, [[0.9, coat], [1, coatD]]); },
        leg(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? '#8ea2b8' : '#2c2a28'); bands(g, c, [[0.8, '#8ea2b8'], [1, '#2c2a28']]); for (let x = 0.1; x < 1; x += 0.25) D.line(g, c, x, 0, x, 0.8, '#6f86a0', 3); },
      },
      build(rig) { rig.headTop.add(merged([H(1.2, 0.52, 0.3, 0, -0.42, 0.56, 0.2, 0, 0, 0.14), H(0.9, 0.3, 0.26, 0, -0.68, 0.48, 0.3, 0, 0, 0.1)], RT.plastic('#b9b7b1', { roughness: 0.8 }))); },   // grey beard
    });
  }
  function odell() {
    const gown = '#eee8dc';
    return person('Odell', { seed: 33, skin: '#ecc8ad', hair: '#a9a7a2', hairStyle: 'bun', shoes: '#ecc8ad', face: { lashes: true },
      clothes: {
        torso(g, f, c) { D.rect(g, c, 0, 0, 1, 1, gown); if (f === 'front') { D.poly(g, c, [[0.38, 0], [0.62, 0], [0.5, 0.1]], '#ecc8ad'); D.line(g, c, 0.3, 0.02, 0.7, 0.02, '#d9cfbf', 6); } },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, gown); bands(g, c, [[0.92, gown], [1, '#d9cfbf']]); },
        leg(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? gown : '#ecc8ad'); bands(g, c, [[0.86, gown], [0.9, '#d9cfbf'], [1, '#ecc8ad']]); },
      },
    });
  }
  function pike() {
    const robe = '#6e1f2a', robeD = RT.shade(robe, -0.25);
    return person('Pike', { seed: 35, skin: '#c89070', hair: '#3b2a1e', hairStyle: 'short', shoes: '#c9b8a0', face: { stubble: '#4b433d' },
      clothes: {
        torso(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, robe); D.rect(g, c, 0, 0, 1, 1, robe);
          if (f === 'front') { D.poly(g, c, [[0.3, 0], [0.5, 0.5], [0.7, 0]], '#d9d2c4'); D.line(g, c, 0.3, 0, 0.5, 0.5, robeD, 8); D.line(g, c, 0.7, 0, 0.5, 0.5, robeD, 8); }
          D.rect(g, c, 0, 0.62, 1, 0.68, robeD); if (f === 'front') { D.line(g, c, 0.46, 0.68, 0.42, 0.85, robeD, 5); D.line(g, c, 0.54, 0.68, 0.58, 0.85, robeD, 5); } },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, robeD); bands(g, c, [[0.86, robe], [1, robeD]]); },
        leg(g, f, c) { if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? '#3a4a6a' : '#c9b8a0'); bands(g, c, [[0.35, robe], [0.86, '#3a4a6a'], [1, '#c9b8a0']]); },
      },
    });
  }
  const NIGHT = ['#9aa7b8', '#c9b8a6', '#7d8f7a', '#b39a9a', '#e6e1d6', '#8b7fa0', '#a8b3a0', '#d9c7a8'];
  function sleeper(seed) {
    const r = RT.rng(seed * 131 + 7), pick = (a) => a[Math.floor(r() * a.length)];
    return C.citizen(seed + 900, { shirt: pick(NIGHT), pants: pick(NIGHT), top: pick(['tee', 'shirt', 'sweater']), kid: r() < 0.15, expression: 'neutral' });
  }

  // ---------- NARA'S PHONE ----------
  function phone() {
    const g = new THREE.Group();
    const body = RT.mesh(RT.roundedBoxGeometry(0.4, 0.8, 0.06, 0.05, 2), RT.plastic('#121214', { roughness: 0.4 })); g.add(body);
    const cv = RT.canvas(256, 512), ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.74), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = 0.032; g.add(screen);
    g.userData.setScreen = (text = '', rec = false, glow = '#3a0a0a') => {
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 256, 512);
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.4; ctx.fillRect(0, 300, 256, 212); ctx.globalAlpha = 1;
      if (rec) { ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(34, 40, 12, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 26px Inter, sans-serif'; ctx.fillText('REC', 54, 49); }
      ctx.fillStyle = '#fff'; ctx.font = '800 64px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 128, 250); ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(200, 40); ctx.lineTo(214, 62); ctx.moveTo(200, 40); ctx.lineTo(160, 30); ctx.moveTo(230, 20); ctx.lineTo(244, 70); ctx.stroke();   // the cracked corner
      tex.needsUpdate = true;
    };
    g.userData.setScreen('23:58');
    return g;
  }

  RT.cast = { nara, milo, whale, bram, odell, pike, sleeper, phone };
})();
