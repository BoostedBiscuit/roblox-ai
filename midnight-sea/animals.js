// =====================================================================================
// animals.js: blocky farm animals (original designs, Roblox-style parts) with simple idle animations.
//
//   const cow = RT.animals.make('cow', { seed: 3 });  scene.add(cow);  every frame: cow.update(t);
//   const herd = RT.animals.herd('sheep', 6, { x: 30, z: 20, r: 5, seed: 2 });  scene.add(herd);  herd.update(t);
// Types: chicken, cow, sheep, pig, dog. Sizes are in world units (a chicken is ~0.45 tall, a cow ~1.3).
// Everything moves as a pure function of t (pecking, grazing, tail wags, small wanders).
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT;
  const P = (c, o) => RT.plastic(c, Object.assign({ roughness: 0.55 }, o));
  const B = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, r = 0.04) => ({ geo: RT.roundedBoxGeometry(w, h, d, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001), 1), matrix: RT.mat4(x, y, z, rx, ry, rz) });
  const S = (rad, x, y, z, sx = 1, sy = sx, sz = sx) => ({ geo: new THREE.SphereGeometry(rad, 10, 8), matrix: RT.mat4(x, y, z, 0, 0, 0, sx, sy, sz) });
  const Cn = (rad, h, x, y, z, rx = 0, ry = 0, rz = 0) => ({ geo: new THREE.ConeGeometry(rad, h, 6), matrix: RT.mat4(x, y, z, rx, ry, rz) });
  const merged = (parts, mat) => RT.mesh(RT.mergeGeometries(parts), mat);

  // cow coat: white with black patches (canvas texture, seeded)
  function cowCoat(seed) {
    const r = RT.rng(seed);
    return (g, cells) => { for (const k in cells) { const c = cells[k]; RT.draw.rect(g, c, 0, 0, 1, 1, '#f4f2ee');
      for (let i = 0; i < 3; i++) { g.fillStyle = '#1e1c1c'; g.beginPath(); g.ellipse(c.x + c.w * r(), c.y + c.h * r(), c.w * (0.15 + r() * 0.15), c.h * (0.12 + r() * 0.18), r() * 3, 0, Math.PI * 2); g.fill(); } } };
  }

  function make(type, o = {}) {
    const root = new THREE.Group(); root.name = type;
    const body = new THREE.Group(); root.add(body);
    const head = new THREE.Group(); body.add(head);
    const tail = new THREE.Group(); body.add(tail);
    const legs = [];
    const seed = o.seed || 1, ph = RT.hash(seed) * 10;
    const addLeg = (x, z, h, w, mat) => { const g = new THREE.Group(); g.position.set(x, h, z); body.add(g); g.add(merged([B(w, h, w, 0, -h / 2, 0, 0, 0, 0, 0.03)], mat)); legs.push(g); };
    let update;
    if (type === 'chicken') {
      const white = P(o.color || (RT.hash(seed * 3) < 0.25 ? '#b8743a' : '#f6f4ef')), red = P('#e0362c'), orange = P('#f2a33a');
      body.add(merged([B(0.3, 0.26, 0.36, 0, 0.28, 0, 0, 0, 0, 0.08), B(0.08, 0.2, 0.18, 0.16, 0.3, -0.02, 0, 0, -0.2), B(0.08, 0.2, 0.18, -0.16, 0.3, -0.02, 0, 0, 0.2), B(0.2, 0.16, 0.08, 0, 0.42, -0.2, 0.5)], white));
      head.position.set(0, 0.42, 0.16); head.add(merged([B(0.16, 0.17, 0.16, 0, 0.06, 0.02)], white));
      head.add(merged([B(0.04, 0.08, 0.1, 0, 0.18, 0.02), B(0.05, 0.06, 0.04, 0, 0.0, 0.11)], red), merged([Cn(0.04, 0.08, 0, 0.05, 0.13, Math.PI / 2)], orange));
      head.add(merged([B(0.03, 0.03, 0.01, 0.06, 0.09, 0.1), B(0.03, 0.03, 0.01, -0.06, 0.09, 0.1)], P('#111')));
      addLeg(0.06, 0, 0.16, 0.035, orange); addLeg(-0.06, 0, 0.16, 0.035, orange);
      update = (t) => { const k = (t * 0.7 + ph) % 2.2, peck = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0;
        head.rotation.x = peck * 0.9; body.rotation.x = peck * 0.25; body.position.y = Math.abs(Math.sin(t * 9 + ph)) * 0.02 * (k > 1.2 ? 1 : 0);
        root.rotation.y = (o.yaw || 0) + Math.sin(t * 0.3 + ph) * 0.8; };
    } else if (type === 'cow') {
      const coat = RT.atlasBox(0.7, 0.62, 1.35, cowCoat(seed), { pps: 60, round: 0.1 }); coat.position.y = 0.85; body.add(coat);
      const pink = P('#e9a0a0'), dark = P('#2a2626');
      head.position.set(0, 1.02, 0.7);
      head.add(RT.atlasBox(0.44, 0.44, 0.5, cowCoat(seed + 9), { pps: 60, round: 0.08 }).translateZ(0.18));
      head.add(merged([B(0.36, 0.2, 0.12, 0, -0.12, 0.45)], pink), merged([Cn(0.04, 0.16, 0.16, 0.26, 0.15, 0, 0, -0.6), Cn(0.04, 0.16, -0.16, 0.26, 0.15, 0, 0, 0.6)], P('#efe6cf')));
      head.add(merged([B(0.04, 0.05, 0.02, 0.12, 0.06, 0.44), B(0.04, 0.05, 0.02, -0.12, 0.06, 0.44)], dark), merged([B(0.14, 0.06, 0.12, 0.27, 0.08, 0.12), B(0.14, 0.06, 0.12, -0.27, 0.08, 0.12)], dark));
      for (const [x, z] of [[0.22, 0.48], [-0.22, 0.48], [0.22, -0.48], [-0.22, -0.48]]) addLeg(x, z, 0.6, 0.17, dark);
      body.add(merged([B(0.22, 0.12, 0.22, 0, 0.5, 0.1, 0, 0, 0, 0.05)], pink));                // udder
      tail.position.set(0, 1.1, -0.68); tail.add(merged([B(0.05, 0.55, 0.05, 0, -0.27, 0, 0, 0, 0, 0.02)], dark));
      update = (t) => { const g = 0.5 + 0.5 * Math.sin(t * 0.45 + ph); head.rotation.x = 0.15 + g * 0.7; tail.rotation.z = Math.sin(t * 2.1 + ph) * 0.35;
        root.rotation.y = (o.yaw || 0) + Math.sin(t * 0.08 + ph) * 0.4; };
    } else if (type === 'sheep') {
      const wool = P('#f3f0e8', { roughness: 0.9 }), dark = P('#3a3533');
      const parts = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; parts.push(S(0.24, Math.cos(a) * 0.17, 0.62 + Math.sin(i * 2.1) * 0.05, Math.sin(a) * 0.28)); }
      parts.push(S(0.28, 0, 0.72, 0)); body.add(merged(parts, wool));
      head.position.set(0, 0.72, 0.42); head.add(merged([B(0.24, 0.26, 0.3, 0, 0, 0.06, 0, 0, 0, 0.07), B(0.16, 0.06, 0.08, 0.17, 0.06, 0.02, 0, 0, -0.3), B(0.16, 0.06, 0.08, -0.17, 0.06, 0.02, 0, 0, 0.3)], dark), merged([S(0.13, 0, 0.14, 0.0)], wool));
      head.add(merged([B(0.04, 0.04, 0.01, 0.07, 0.03, 0.21), B(0.04, 0.04, 0.01, -0.07, 0.03, 0.21)], P('#f2f2f2')));
      for (const [x, z] of [[0.13, 0.2], [-0.13, 0.2], [0.13, -0.2], [-0.13, -0.2]]) addLeg(x, z, 0.4, 0.08, dark);
      update = (t) => { const g = 0.5 + 0.5 * Math.sin(t * 0.6 + ph); head.rotation.x = g * 0.8; body.position.y = Math.sin(t * 1.3 + ph) * 0.01; root.rotation.y = (o.yaw || 0) + Math.sin(t * 0.1 + ph) * 0.6; };
    } else if (type === 'pig') {
      const pink = P('#f1a7b2'), dark = P('#c76e80');
      body.add(merged([B(0.55, 0.45, 0.8, 0, 0.45, 0, 0, 0, 0, 0.14)], pink));
      head.position.set(0, 0.52, 0.42); head.add(merged([B(0.4, 0.36, 0.28, 0, 0, 0.06, 0, 0, 0, 0.1), B(0.2, 0.14, 0.08, 0, -0.04, 0.22, 0, 0, 0, 0.04), Cn(0.07, 0.12, 0.14, 0.2, 0.02, 0.3, 0, -0.3), Cn(0.07, 0.12, -0.14, 0.2, 0.02, 0.3, 0, 0.3)], pink));
      head.add(merged([B(0.04, 0.04, 0.01, 0.05, -0.04, 0.265), B(0.04, 0.04, 0.01, -0.05, -0.04, 0.265), B(0.05, 0.05, 0.01, 0.1, 0.07, 0.205), B(0.05, 0.05, 0.01, -0.1, 0.07, 0.205)], P('#3a2a2a')));
      for (const [x, z] of [[0.16, 0.26], [-0.16, 0.26], [0.16, -0.26], [-0.16, -0.26]]) addLeg(x, z, 0.24, 0.1, dark);
      tail.position.set(0, 0.55, -0.42); tail.add(RT.mesh(new THREE.TorusGeometry(0.05, 0.018, 5, 10, Math.PI * 1.5), pink));
      update = (t) => { head.rotation.x = 0.3 + Math.sin(t * 1.4 + ph) * 0.2; tail.rotation.z = t * 4; root.rotation.y = (o.yaw || 0) + Math.sin(t * 0.15 + ph) * 0.7; };
    } else {   // dog
      const fur = P(o.color || '#a8743f'), dark = P('#5a3a1f');
      body.add(merged([B(0.34, 0.32, 0.7, 0, 0.42, 0, 0, 0, 0, 0.1)], fur));
      head.position.set(0, 0.66, 0.36); head.add(merged([B(0.3, 0.28, 0.3, 0, 0, 0.04, 0, 0, 0, 0.08), B(0.16, 0.12, 0.18, 0, -0.06, 0.24, 0, 0, 0, 0.04)], fur));
      head.add(merged([B(0.08, 0.16, 0.06, 0.15, 0.1, 0.0, 0, 0, -0.3), B(0.08, 0.16, 0.06, -0.15, 0.1, 0.0, 0, 0, 0.3), B(0.07, 0.05, 0.04, 0, -0.03, 0.34)], dark));
      head.add(merged([B(0.04, 0.05, 0.01, 0.07, 0.04, 0.19), B(0.04, 0.05, 0.01, -0.07, 0.04, 0.19)], P('#111')));
      for (const [x, z] of [[0.1, 0.24], [-0.1, 0.24], [0.1, -0.24], [-0.1, -0.24]]) addLeg(x, z, 0.28, 0.09, fur);
      tail.position.set(0, 0.55, -0.35); tail.add(merged([B(0.05, 0.05, 0.28, 0, 0.06, -0.12, -0.6, 0, 0, 0.02)], fur));
      update = (t) => { tail.rotation.y = Math.sin(t * 10 + ph) * 0.6; head.rotation.y = Math.sin(t * 0.7 + ph) * 0.4; head.rotation.x = Math.sin(t * 0.5) * 0.1; root.rotation.y = o.yaw || 0; };
    }
    root.update = update;
    root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    if (o.scale) root.scale.setScalar(o.scale);
    update(0);
    return root;
  }

  // a group of animals spread inside a circle (x, z, r); y from o.ground(x, z) if given
  function herd(type, n, o = {}) {
    const g = new THREE.Group(), r = RT.rng((o.seed || 1) * 97 + n), list = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (o.r || 4), x = (o.x || 0) + Math.cos(a) * d, z = (o.z || 0) + Math.sin(a) * d;
      const an = make(type, { seed: (o.seed || 1) * 31 + i, yaw: r() * 6.28 });
      an.position.set(x, o.ground ? o.ground(x, z) : 0, z); g.add(an); list.push(an);
    }
    g.update = (t) => { if (g.visible) for (const an of list) an.update(t); };
    g.animals = list;
    return g;
  }

  RT.animals = { make, herd, types: ['chicken', 'cow', 'sheep', 'pig', 'dog'] };
})();
