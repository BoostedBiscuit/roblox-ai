// =====================================================================================
// cast.js: the human characters of ECHO BREAKERS (original designs), built with the Roblox-style avatar builder.
//
//   const kai = RT.cast.kai();  scene.add(kai);   each frame: RT.anim.apply(...) / actor(...), kai.rig.update(t)
//   kai()  · mira()  · tobi()  · riku()  · vahl()  · hunter(seed)  · walker(seed)  (a pedestrian)
// Colors are in each character's COL block at the top of its function, so they are easy to change.
// Special props: kai.rig.props.headphones (he rips them off in CH 5), tobi.rig.props.hat (the seagull takes it),
//                vahl.rig.props.baton, vahl.rig.crackMask(0..1) (his mask cracks in CH 5).
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, C = RT.characters, { D, H, Cone, Ball, Wedge, merged, bands, outer } = C.helpers;
  const build = C.build, faceStyle = C.faceStyle;

  // paint splatters (Mira's jacket), seeded so they are the same every render
  function splat(g, c, seed, colors, n = 9) {
    const r = RT.rng(seed);
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[i % colors.length];
      const x = c.x + c.w * r(), y = c.y + c.h * r(), s = (0.025 + r() * 0.05) * c.w;
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 4; k++) { const a = r() * 6.28, d = s * (1.2 + r() * 1.3); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s * (0.15 + r() * 0.25), 0, Math.PI * 2); g.fill(); }
      if (r() < 0.4) { g.fillRect(x - s * 0.18, y, s * 0.36, s * (2 + r() * 3)); }   // a drip
    }
  }

  // ---------- 1. KAI REYES (16, hero): navy hoodie, headphones around the neck, blue-tipped hair ----------
  function kai(o = {}) {
    const COL = { skin: '#c68e62', hair: '#17161d', tips: '#3a78e0', hoodie: '#243457', tee: '#f2f3f5', wave: '#3a8dff', jeans: '#3e4756', shoes: '#f4f4f4', stripe: '#3a8dff', phones: '#eef3ff', phones2: '#3a8dff' };
    const Hd = RT.shade(COL.hoodie, -0.22), Hl = RT.shade(COL.hoodie, 0.14);
    return build({
      name: 'Kai', skin: COL.skin, shoes: COL.shoes, seed: 21, expression: o.expression || 'neutral',
      face: faceStyle({ skin: COL.skin, iris: '#3b2416', brow: COL.hair, browW: 13 }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.hoodie : COL.jeans);
          D.rect(g, c, 0, 0, 1, 1, COL.hoodie);
          if (f === 'front') {
            D.rect(g, c, 0.34, 0, 0.66, 0.86, COL.tee);                                    // open zip hoodie, white tee
            g.strokeStyle = COL.wave; g.lineWidth = c.w * 0.018; g.beginPath();             // sound-wave print on the tee
            for (let k = 0; k <= 24; k++) { const x = 0.37 + (k / 24) * 0.26, a = Math.sin(k * 1.3) * (0.03 + 0.05 * Math.sin(k * 0.45)); g[k ? 'lineTo' : 'moveTo'](c.x + c.w * x, c.y + c.h * (0.36 + a)); }
            g.stroke();
            D.line(g, c, 0.34, 0.03, 0.34, 0.86, '#9aa3b5', 3); D.line(g, c, 0.66, 0.03, 0.66, 0.86, '#9aa3b5', 3);   // zipper edges
            D.line(g, c, 0.31, 0.06, 0.31, 0.3, '#e6e9f0', 3); D.line(g, c, 0.69, 0.06, 0.69, 0.3, '#e6e9f0', 3);       // drawstrings
            D.rect(g, c, 0.06, 0.6, 0.32, 0.8, Hd); D.rect(g, c, 0.68, 0.6, 0.94, 0.8, Hd);  // pouch pockets
          }
          if (f === 'back') { D.rect(g, c, 0.2, 0, 0.8, 0.16, Hd); }                         // the hood lying on the back
          D.rect(g, c, 0, 0.86, 1, 1, Hd);                                                    // ribbed hem
          D.stitch(g, c, 0.02, 0.03, 0.98, 0.03);
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, Hd);
          bands(g, c, [[0.86, COL.hoodie], [1, Hd]]);
          if (outer(f, info)) { D.rect(g, c, 0.42, 0.04, 0.58, 0.82, Hl); }
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.jeans : COL.shoes);
          bands(g, c, [[0.84, COL.jeans], [0.88, RT.shade(COL.jeans, 0.18)], [1, COL.shoes]]);
          if (f === 'front') { D.line(g, c, 0.2, 0.92, 0.8, 0.92, COL.stripe, 4); }
          if (outer(f, info)) D.stitch(g, c, 0.5, 0.02, 0.5, 0.8);
        },
      },
      build(rig, d) {
        const hm = RT.plastic(COL.hair, { roughness: 0.5 }), tm = RT.plastic(COL.tips, { roughness: 0.45 });
        const P = [H(1.36, 0.42, 1.3, 0, 0.47, -0.02, 0, 0, 0, 0.16), H(1.36, 0.9, 0.3, 0, 0.06, -0.48, 0, 0, 0, 0.12),
          H(0.15, 0.62, 0.95, 0.69, 0.16, -0.1), H(0.15, 0.62, 0.95, -0.69, 0.16, -0.1)];
        const T = [], r = RT.rng(9);
        for (let k = 0; k < 9; k++) {      // messy spikes, a few with blue tips
          const a = (k / 9) * Math.PI * 2 + r() * 0.5, tilt = 0.45 + r() * 0.45;
          (k % 3 === 0 ? T : P).push(Cone(0.18, 0.55 + r() * 0.2, Math.sin(a) * 0.4, 0.68, Math.cos(a) * 0.38 - 0.06, Math.cos(a) * tilt, 0, -Math.sin(a) * tilt));
        }
        P.push(H(1.0, 0.24, 0.26, -0.12, 0.36, 0.56, 0, 0, 0.18, 0.1));                       // a side-swept fringe
        T.push(Cone(0.12, 0.42, 0.34, 0.24, 0.6, 2.5, 0, 0.7));                               // one blue strand over the eye
        rig.headTop.add(merged(P, hm), merged(T, tm));
        // headphones resting around the neck (a group, so he can rip them off in CH 5)
        const ph = new THREE.Group(); ph.position.set(0, d.uh + 0.12, 0.08); rig.waist.add(ph);
        const band = RT.mesh(new THREE.TorusGeometry(0.62, 0.075, 8, 28, Math.PI * 1.15), RT.plastic(COL.phones, { roughness: 0.35 }));
        band.rotation.set(Math.PI / 2, 0, Math.PI * 0.92); band.position.set(0, 0.06, -0.12); ph.add(band);
        for (const s of [-1, 1]) {
          const cup = new THREE.Group(); cup.position.set(s * 0.6, -0.02, 0.18); cup.rotation.set(0.5, s * 0.5, 0); ph.add(cup);
          cup.add(RT.mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 20), RT.plastic(COL.phones, { roughness: 0.35 })).rotateX(Math.PI / 2));
          cup.add(RT.mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 20), RT.plastic(COL.phones2, { roughness: 0.3, emissive: COL.phones2, emissiveIntensity: 0.25 })).rotateX(Math.PI / 2).translateY(0.09));
        }
        rig.props.headphones = ph;
      },
    });
  }

  // ---------- 2. MIRA SANTOS (16, street artist): paint-stained denim jacket, plum bob, teal bandana ----------
  function mira(o = {}) {
    const COL = { skin: '#e0b089', hair: '#3a1f2d', band: '#2bb3a3', jacket: '#5d7fa8', top: '#1f1f24', jeans: '#26262c', boots: '#2b2b2b', paint: ['#ff8a3d', '#ff5fa2', '#ffd23f', '#2bb3a3', '#ffffff'] };
    const Jd = RT.shade(COL.jacket, -0.22), Jl = RT.shade(COL.jacket, 0.16);
    return build({
      name: 'Mira', skin: COL.skin, shoes: COL.boots, seed: 33, expression: o.expression || 'calm',
      dims: { uw: 1.92, lw: 1.8 },
      face: faceStyle({ skin: COL.skin, iris: '#5a3a2a', brow: COL.hair, browW: 11, lashes: true }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.jacket : COL.jeans);
          D.rect(g, c, 0, 0, 1, 1, COL.jacket);
          if (f === 'front') {
            D.rect(g, c, 0.36, 0, 0.64, 0.88, COL.top);
            D.poly(g, c, [[0.2, 0], [0.36, 0], [0.4, 0.26], [0.3, 0.16]], Jd); D.poly(g, c, [[0.8, 0], [0.64, 0], [0.6, 0.26], [0.7, 0.16]], Jd);
            for (const x of [0.08, 0.68]) { D.rect(g, c, x, 0.26, x + 0.22, 0.4, Jd); D.stitch(g, c, x + 0.01, 0.27, x + 0.21, 0.27); }   // chest pockets
            for (let y = 0.3; y < 0.85; y += 0.14) D.circle(g, c, 0.33, y, 4, '#c9c9c9');
          }
          if (f === 'back') { D.stitch(g, c, 0, 0.24, 1, 0.24); D.stitch(g, c, 0.3, 0.24, 0.3, 0.88); D.stitch(g, c, 0.7, 0.24, 0.7, 0.88); }
          splat(g, c, f.length * 7 + (f === 'front' ? 1 : 5), COL.paint, f === 'front' ? 7 : 10);
          D.rect(g, c, 0, 0.86, 1, 1, Jd);
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, Jd);
          bands(g, c, [[0.78, COL.jacket], [0.88, Jl], [1, COL.skin]]);                       // rolled-up cuffs
          splat(g, c, (info.side === 'L' ? 11 : 17) + f.length, COL.paint, 4);
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.jeans : COL.boots);
          bands(g, c, [[0.74, COL.jeans], [1, COL.boots]]);
          if (f === 'front') { D.line(g, c, 0.25, 0.8, 0.75, 0.8, '#555', 3); splat(g, c, info.side === 'L' ? 41 : 43, COL.paint, 2); }
        },
      },
      build(rig) {
        const hm = RT.plastic(COL.hair, { roughness: 0.5 });
        rig.headTop.add(merged([
          H(1.4, 0.44, 1.34, 0, 0.48, -0.03, 0, 0, 0, 0.2), H(1.42, 1.12, 0.36, 0, -0.04, -0.47, 0, 0, 0, 0.16),
          H(0.18, 1.12, 1.0, 0.7, -0.04, -0.08, 0, 0, 0.04, 0.08), H(0.18, 1.12, 1.0, -0.7, -0.04, -0.08, 0, 0, -0.04, 0.08),   // a jaw-length bob
          H(0.86, 0.3, 0.26, 0.2, 0.32, 0.56, 0, 0, -0.32, 0.12), H(0.5, 0.22, 0.24, -0.38, 0.4, 0.55, 0, 0, 0.12, 0.1),        // side fringe
        ], hm));
        rig.headTop.add(merged([H(1.46, 0.16, 1.38, 0, 0.36, -0.02, -0.12, 0, 0, 0.07), H(0.22, 0.34, 0.12, 0.36, 0.3, -0.72, 0.4, 0, -0.5, 0.05), H(0.22, 0.34, 0.12, 0.52, 0.22, -0.7, 0.4, 0, 0.3, 0.05)], RT.plastic(COL.band)));   // bandana + knot
      },
    });
  }

  // ---------- 3. TOBI GRANT (15, comic relief): striped shirt, cargo shorts, bucket hat, ginger curls ----------
  function tobi(o = {}) {
    const COL = { skin: '#f1c9a5', hair: '#d0662f', shirt: '#f28c28', stripe: '#fff4e0', shorts: '#6b8e4e', shoes: '#e23b3b', hat: '#c9b27c', hatBand: '#7a5a34' };
    return build({
      name: 'Tobi', scale: 0.93, skin: COL.skin, shoes: COL.shoes, seed: 45, expression: o.expression || 'scared',
      dims: { uw: 2.2, ud: 1.15, lw: 2.16, ld: 1.12 },
      face: faceStyle({ skin: COL.skin, iris: '#4d7a3a', brow: RT.shade(COL.hair, -0.2), browW: 12, freckles: true, eyeSize: 1.1, blush: true }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.shirt : COL.shorts);
          for (let k = 0; k < 9; k++) D.rect(g, c, 0, k / 9 * 0.86, 1, (k + 1) / 9 * 0.86, k % 2 ? COL.stripe : COL.shirt);
          if (f === 'front') D.poly(g, c, [[0.4, 0], [0.6, 0], [0.5, 0.07]], COL.skin);
          D.rect(g, c, 0, 0.86, 1, 1, COL.shorts);
        },
        arm(g, f, c) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.skin);
          bands(g, c, [[0.12, COL.shirt], [0.24, COL.stripe], [0.36, COL.shirt], [1, COL.skin]]);     // short sleeves
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.shorts : COL.shoes);
          bands(g, c, [[0.46, COL.shorts], [0.86, COL.skin], [0.9, '#ffffff'], [1, COL.shoes]]);       // cargo shorts, socks
          if (outer(f, info)) { D.rect(g, c, 0.2, 0.2, 0.8, 0.38, RT.shade(COL.shorts, -0.15)); D.stitch(g, c, 0.22, 0.22, 0.78, 0.22); }
        },
      },
      build(rig) {
        const hm = RT.plastic(COL.hair, { roughness: 0.6 }), P = [H(1.38, 0.3, 1.3, 0, 0.42, -0.02, 0, 0, 0, 0.14), H(1.38, 0.6, 0.28, 0, 0.12, -0.48, 0, 0, 0, 0.12)];
        for (const [x, y, z] of [[0.7, 0.12, 0.2], [-0.7, 0.12, 0.2], [0.68, 0.0, -0.25], [-0.68, 0.0, -0.25], [0.3, 0.05, -0.62], [-0.3, 0.05, -0.62]]) P.push(Ball(0.2, x, y, z));   // curls under the hat
        rig.headTop.add(merged(P, hm));
        const hat = new THREE.Group(); hat.position.set(0, 0.55, 0); rig.headTop.add(hat);      // the bucket hat (a seagull steals it)
        hat.add(RT.mesh(new THREE.CylinderGeometry(0.66, 0.74, 0.42, 20), RT.plastic(COL.hat, { roughness: 0.8 })).translateY(0.18));
        hat.add(RT.mesh(new THREE.CylinderGeometry(1.0, 1.06, 0.06, 24), RT.plastic(COL.hat, { roughness: 0.8 })).translateY(-0.02));
        hat.add(RT.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 20), RT.plastic(COL.hatBand)).translateY(0.04));
        rig.props.hat = hat;
      },
    });
  }

  // ---------- 4. RIKU HALE (17, rival): white blazer with ice-blue trim, black turtleneck, silver swept hair ----------
  function riku(o = {}) {
    const COL = { skin: '#f4dccb', hair: '#dfe5ee', blazer: '#f7f8fb', trim: '#8fdcf0', turtle: '#16181d', slacks: '#4b505a', shoes: '#111214', pin: '#bfe9f5' };
    return build({
      name: 'Riku', skin: COL.skin, shoes: COL.shoes, seed: 57, expression: o.expression || 'cold',
      dims: { ul: 1.08, ll: 1.08 },
      face: faceStyle({ skin: COL.skin, iris: '#5fb8d8', brow: '#c9d1dc', browW: 11 }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.blazer : COL.slacks);
          D.rect(g, c, 0, 0, 1, 1, COL.blazer);
          if (f === 'front') {
            D.rect(g, c, 0.38, 0, 0.62, 0.88, COL.turtle);
            D.poly(g, c, [[0.22, 0], [0.38, 0], [0.4, 0.4], [0.3, 0.22]], RT.shade(COL.blazer, -0.08)); D.poly(g, c, [[0.78, 0], [0.62, 0], [0.6, 0.4], [0.7, 0.22]], RT.shade(COL.blazer, -0.08));
            D.line(g, c, 0.38, 0, 0.4, 0.4, COL.trim, 4); D.line(g, c, 0.62, 0, 0.6, 0.4, COL.trim, 4);
            D.circle(g, c, 0.28, 0.26, 7, COL.pin);                                           // a snowflake pin
            D.circle(g, c, 0.4, 0.62, 5, '#d8dde5'); D.circle(g, c, 0.4, 0.76, 5, '#d8dde5');
          }
          D.line(g, c, 0, 0.86, 1, 0.86, COL.trim, 3);
          D.rect(g, c, 0, 0.88, 1, 1, '#1b1c20');
        },
        arm(g, f, c) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.turtle);
          bands(g, c, [[0.86, COL.blazer], [0.88, COL.trim], [1, COL.turtle]]);
        },
        leg(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.slacks : COL.shoes);
          bands(g, c, [[0.88, COL.slacks], [1, COL.shoes]]);
          if (f === 'front') D.line(g, c, 0.5, 0.02, 0.5, 0.86, RT.shade(COL.slacks, -0.2), 2);     // pressed crease
        },
      },
      build(rig) {
        const hm = RT.plastic(COL.hair, { roughness: 0.35, metalness: 0.1 });
        rig.headTop.add(merged([
          H(1.38, 0.4, 1.32, 0, 0.48, -0.03, 0, 0, 0, 0.18), H(1.38, 0.86, 0.3, 0, 0.06, -0.48, 0, 0, 0, 0.12),
          H(0.15, 0.62, 0.96, 0.69, 0.18, -0.1), H(0.15, 0.62, 0.96, -0.69, 0.18, -0.1),
          Wedge(1.3, 0.34, 0.9, 0.06, 0.74, 0.0, 0, 0, -0.1),                                   // swept-back top
          H(0.34, 0.72, 0.2, 0.42, 0.06, 0.6, 0.1, 0, -0.2, 0.08), H(0.3, 0.5, 0.2, 0.12, 0.26, 0.6, 0.05, 0, 0.1, 0.08),   // long fringe over one eye
        ], hm));
      },
    });
  }

  // ---------- 5. MAESTRO VAHL (villain): tall, white mask, long black-and-gold coat, conductor's baton ----------
  function maskTexture(cracked) {
    return RT.canvasTexture(512, 450, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 450); gr.addColorStop(0, '#fbf8f1'); gr.addColorStop(1, '#e8e2d6');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 450);
      g.strokeStyle = '#c9a03a'; g.lineWidth = 7;                                           // gold filigree
      g.beginPath(); g.moveTo(70, 120); g.quadraticCurveTo(256, 40, 442, 120); g.stroke();
      g.beginPath(); g.moveTo(256, 60); g.lineTo(256, 150); g.stroke();
      for (const s of [-1, 1]) {                                                            // dark eye holes with a violet glint
        g.fillStyle = '#120b18'; g.beginPath(); g.ellipse(256 + s * 92, 236, 52, 26, s * -0.25, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#b37bff'; g.beginPath(); g.arc(256 + s * 92 - s * 8, 232, 7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c9a03a'; g.lineWidth = 5; g.beginPath(); g.ellipse(256 + s * 92, 236, 60, 33, s * -0.25, 0, Math.PI * 2); g.stroke();
      }
      g.strokeStyle = '#2a1b2e'; g.lineWidth = 9; g.lineCap = 'round';                        // a thin, too-wide smile
      g.beginPath(); g.moveTo(150, 340); g.quadraticCurveTo(256, 396, 362, 340); g.stroke();
      if (cracked) {
        g.strokeStyle = '#2a1b2e'; g.lineWidth = 6; g.lineJoin = 'miter';
        const crack = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke(); };
        crack([[300, 0], [282, 80], [318, 140], [276, 210], [300, 290], [262, 450]]);
        crack([[318, 140], [380, 170], [430, 160]]); crack([[276, 210], [200, 190], [150, 230]]); crack([[300, 290], [360, 330]]);
        g.fillStyle = '#b37bff'; g.globalAlpha = 0.5; g.fillRect(286, 0, 6, 450); g.globalAlpha = 1;
      }
    });
  }
  function vahl(o = {}) {
    const COL = { skin: '#f4f1ea', hair: '#0e0d12', coat: '#141218', gold: '#d4a73a', gold2: '#9c7621', shirt: '#2a1d33', gloves: '#f6f4ef', shoes: '#0b0b0d' };
    const gold = (g, c, x0, y0, x1, y1) => D.rect(g, c, x0, y0, x1, y1, COL.gold);
    const panel = (g, cells) => { for (const k in cells) { const c = cells[k]; D.rect(g, c, 0, 0, 1, 1, COL.coat); gold(g, c, 0, 0.92, 1, 0.97); D.line(g, c, 0.04, 0, 0.04, 0.92, COL.gold2, 2); D.bevel(g, c, 0.08); } };
    const v = build({
      name: 'Vahl', skin: COL.skin, shoes: COL.shoes, hands: COL.gloves, seed: 66, expression: 'neutral',
      dims: { uh: 1.26, lh: 1.14, ul: 1.2, ll: 1.2, ua: 1.14, la: 0.98, aw: 0.78, ad: 0.8 },
      face: faceStyle({ skin: COL.skin }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.coat);
          D.rect(g, c, 0, 0, 1, 1, COL.coat);
          if (f === 'front') {
            D.poly(g, c, [[0.34, 0], [0.66, 0], [0.56, 0.52], [0.44, 0.52]], COL.shirt);          // deep V with a dark violet shirt
            D.poly(g, c, [[0.2, 0], [0.34, 0], [0.46, 0.5], [0.3, 0.3]], COL.gold2); D.poly(g, c, [[0.8, 0], [0.66, 0], [0.54, 0.5], [0.7, 0.3]], COL.gold2);   // gold lapels
            for (let y = 0.58; y < 0.86; y += 0.09) { D.circle(g, c, 0.42, y, 6, COL.gold); D.circle(g, c, 0.58, y, 6, COL.gold); }
          }
          if (f === 'back') { D.line(g, c, 0.5, 0.1, 0.5, 1, COL.gold2, 3); }
          gold(g, c, 0, 0.86, 1, 0.9);
        },
        arm(g, f, c) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.gloves);
          bands(g, c, [[0.8, COL.coat], [0.86, COL.gold], [1, COL.gloves]]);
        },
        leg(g, f, c) { bands(g, c, [[0.9, '#1b1820'], [1, COL.shoes]]); },
      },
      build(rig, d) {
        rig.headTop.add(merged([H(1.36, 0.34, 1.3, 0, 0.5, -0.06, 0, 0, 0, 0.16), H(1.36, 0.8, 0.3, 0, 0.12, -0.5, 0, 0, 0, 0.12),
          H(0.12, 0.42, 0.9, 0.68, 0.32, -0.12), H(0.12, 0.42, 0.9, -0.68, 0.32, -0.12)], RT.plastic(COL.hair, { roughness: 0.25, metalness: 0.2 })));
        // the mask replaces his face; crackMask(p) swaps to the cracked version
        const plain = maskTexture(false), cracked = maskTexture(true), mats = rig.head.material;
        const maskMat = new THREE.MeshStandardMaterial({ map: plain, roughness: 0.25, metalness: 0.05 });
        mats[4] = maskMat; rig.setFace = () => rig; rig.setMouth = () => rig; rig.setEyes = () => rig; rig.update = () => {};
        rig.crackMask = (p) => { maskMat.map = p > 0.5 ? cracked : plain; maskMat.needsUpdate = true; };
        // high collar + long coat tails that swing with the legs
        rig.waist.add(merged([H(2.3, 0.9, 0.18, 0, d.uh + 0.3, -(d.ud / 2) + 0.02, -0.18, 0, 0, 0.06)], RT.plastic(COL.coat)));
        rig.waist.add(merged([H(2.34, 0.12, 0.22, 0, d.uh + 0.74, -(d.ud / 2) - 0.04, -0.18, 0, 0, 0.04)], RT.metal(COL.gold)));
        const L = d.ul + d.ll - 0.25, mk = (w, dd, x, z, follow) => {
          const g = new THREE.Group(); g.position.set(x, 0.05, z); rig.hips.add(g);
          const m = RT.atlasBox(w, L, dd, panel, { pps: 55, round: 0.05 }); m.position.y = -L / 2; g.add(m);
          if (follow) rig.followers.push(follow(g));
        };
        mk(0.95, 0.12, 0.5, d.ld / 2 + 0.08, (g) => (r) => { g.rotation.x = Math.min(0, r.legL.rotation.x) * 0.95 + Math.max(0, r.legL.rotation.x) * 0.2; });
        mk(0.95, 0.12, -0.5, d.ld / 2 + 0.08, (g) => (r) => { g.rotation.x = Math.min(0, r.legR.rotation.x) * 0.95 + Math.max(0, r.legR.rotation.x) * 0.2; });
        mk(1.98, 0.12, 0, -(d.ld / 2 + 0.08), (g) => (r) => { g.rotation.x = Math.max(0, r.legL.rotation.x, r.legR.rotation.x) * 0.85; });
        // the baton (white, gold handle) in his right hand
        const baton = new THREE.Group(); baton.add(RT.mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.5, 8), RT.plastic('#fbf8f1', { roughness: 0.3 })).translateY(0.75));
        baton.add(RT.mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.32, 10), RT.metal(COL.gold)).translateY(0.05));
        baton.rotation.x = Math.PI / 2; rig.hold('R', baton); rig.props.baton = baton;
      },
    });
    return v;
  }

  // ---------- 6. VAHL'S HUNTERS (masked henchmen): black suits, blank white masks with a metronome mark ----------
  function hunterMask() {
    return RT.canvasTexture(512, 450, (g) => {
      g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 512, 450);
      g.fillStyle = '#121214'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 92, 240, 50, 14, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#8a6ad8'; g.lineWidth = 8;                                            // metronome mark on the forehead
      g.beginPath(); g.moveTo(216, 160); g.lineTo(256, 70); g.lineTo(296, 160); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(256, 150); g.lineTo(282, 92); g.stroke();
    });
  }
  let hunterTex = null;
  function hunter(seed = 1) {
    const COL = { suit: '#1b1c22', shirt: '#e9e9ec', tie: '#6a4ac0', shoes: '#0d0d10', skin: '#e7e3dc', hair: '#141414' };
    const h = build({
      name: 'Hunter' + seed, skin: COL.skin, shoes: COL.shoes, hands: '#141414', seed: 300 + seed, expression: 'neutral', scale: 0.98 + RT.hash(seed) * 0.08,
      dims: { uw: 2.08, ud: 1.04 },
      face: faceStyle({ skin: COL.skin }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.suit);
          D.rect(g, c, 0, 0, 1, 1, COL.suit);
          if (f === 'front') { D.poly(g, c, [[0.38, 0], [0.62, 0], [0.5, 0.42]], COL.shirt); D.poly(g, c, [[0.47, 0.03], [0.53, 0.03], [0.55, 0.4], [0.5, 0.46], [0.45, 0.4]], COL.tie); }
        },
        arm(g, f, c) { if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, '#141414'); bands(g, c, [[0.88, COL.suit], [1, '#141414']]); },
        leg(g, f, c) { bands(g, c, [[0.9, COL.suit], [1, COL.shoes]]); },
      },
      build(rig) {
        rig.headTop.add(merged([H(1.36, 0.3, 1.3, 0, 0.52, -0.04, 0, 0, 0, 0.14), H(1.36, 0.6, 0.28, 0, 0.2, -0.5, 0, 0, 0, 0.1)], RT.plastic(COL.hair, { roughness: 0.3 })));
        hunterTex = hunterTex || hunterMask();
        rig.head.material[4] = new THREE.MeshStandardMaterial({ map: hunterTex, roughness: 0.3 });
        rig.setFace = () => rig; rig.setMouth = () => rig; rig.setEyes = () => rig; rig.update = () => {};
      },
    });
    return h;
  }

  // a pedestrian of Port Halcyon (bright Italian-summer clothes)
  const walker = (seed = 1, o = {}) => C.citizen(seed, Object.assign({ palette: 'halcyon' }, o));

  RT.cast = { kai, mira, tobi, riku, vahl, hunter, walker, names: ['kai', 'mira', 'tobi', 'riku', 'vahl'] };
})();
