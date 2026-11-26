// =====================================================================================
// common.js: small shared helpers used by every Reaping Trials file.
// Load order in every page:  three.min.js (r128) → common.js → mood.js → characters.js
//                             → animations.js → scenery.js → camera.js → your scene
// Everything is attached to one global object:  window.RT
// Only core three.js r128 features are used (no examples/ add-ons).
// =====================================================================================
(function () {
  'use strict';
  const RT = (window.RT = window.RT || {});

  // Any script error is reported to the renderer (window.sceneError) so a broken scene fails fast instead of hanging.
  window.addEventListener('error', (e) => { window.sceneError = window.sceneError || String((e.error && e.error.stack) || e.message); });

  // ---------- math ----------
  RT.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  RT.lerp = (a, b, p) => a + (b - a) * p;
  RT.smooth = (a, b, x) => { x = RT.clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };   // smoothstep
  RT.ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * RT.clamp(p, 0, 1));                                // gentle ease-in-out
  RT.easeOut = (p) => 1 - Math.pow(1 - RT.clamp(p, 0, 1), 3);
  RT.easeIn = (p) => Math.pow(RT.clamp(p, 0, 1), 3);
  RT.easeOutBack = (p, s = 1.70158) => { p = RT.clamp(p, 0, 1) - 1; return 1 + p * p * ((s + 1) * p + s); };   // overshoots a bit, then settles ("bouncy")

  // ---------- deterministic randomness (NEVER use Math.random: every render must be identical) ----------
  RT.rng = function (seed) {   // mulberry32: same seed → same sequence of numbers in 0..1
    let s = seed >>> 0 || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  RT.hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // integer → 0..1

  // ---------- colors ----------
  // shade('#6b4a2f', 0.2) → 20% lighter, shade(c, -0.3) → 30% darker (returns a CSS color string)
  RT.shade = function (hex, f) {
    const c = new THREE.Color(hex);
    if (f >= 0) c.lerp(new THREE.Color(1, 1, 1), f); else c.multiplyScalar(1 + f);
    return '#' + c.getHexString();
  };
  RT.mixColor = (a, b, p) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), p).getHexString();

  // ---------- materials ----------
  // Roblox-like smooth "plastic": bright solid color, a little shine (roughness ≈ 0.45).
  const matCache = {};
  RT.plastic = function (color, o = {}) {
    const key = color + JSON.stringify(o);
    if (matCache[key]) return matCache[key];
    return (matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0 }, o)));
  };
  RT.metal = (color, o = {}) => RT.plastic(color, Object.assign({ roughness: 0.28, metalness: 0.75 }, o));
  RT.glass = (color, o = {}) => RT.plastic(color, Object.assign({ roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }, o));

  RT.mesh = function (geo, mat, shadows = true) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  };
  RT.box = (w, h, d, mat, shadows) => RT.mesh(new THREE.BoxGeometry(w, h, d), mat, shadows);
  RT.cyl = (rt, rb, h, mat, seg = 20, shadows) => RT.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, shadows);
  RT.ball = (r, mat, seg = 16, shadows) => RT.mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.6 | 0)), mat, shadows);

  const pot = (n) => Math.pow(2, Math.ceil(Math.log2(Math.max(2, n))));   // next power of two (safe on older phones)

  // ---------- canvas textures ----------
  RT.canvas = function (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  RT.canvasTexture = function (w, h, draw) {
    const c = RT.canvas(w, h); draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  };

  // ---------- atlasBox: a block with ONE canvas texture wrapped around all 6 faces (= 1 draw call) ----------
  // paint(ctx, cells, info) draws each face into its cell: cells.front / back / left / right / top / bottom,
  // each { x, y, w, h } in pixels. "left/right" are the CHARACTER's left/right (a character faces +z, so its
  // left side is +x). Up on the canvas is up on the block (top face: canvas-up = back).
  RT.atlasBox = function (w, h, d, paint, o = {}) {
    const pps = o.pps || 80, pad = 3;                           // pixels per stud
    const fw = Math.max(4, Math.round(w * pps)), fh = Math.max(4, Math.round(h * pps)), fd = Math.max(4, Math.round(d * pps));
    const P = pad * 2, cells = {
      front: { x: pad, y: pad, w: fw, h: fh }, back: { x: fw + P + pad, y: pad, w: fw, h: fh },
      left: { x: pad, y: fh + P + pad, w: fd, h: fh }, right: { x: fd + P + pad, y: fh + P + pad, w: fd, h: fh },
      top: { x: pad, y: 2 * (fh + P) + pad, w: fw, h: fd }, bottom: { x: fw + P + pad, y: 2 * (fh + P) + pad, w: fw, h: fd },
    };
    const W = pot(Math.max(2 * fw, 2 * fd) + 2 * P), H = pot(2 * fh + fd + 3 * P);
    const canvas = RT.canvas(W, H), ctx = canvas.getContext('2d');
    if (o.base) { ctx.fillStyle = o.base; ctx.fillRect(0, 0, W, H); }
    paint(ctx, cells, { w, h, d, pps });
    // bleed each cell 3 px outward so mipmaps never show a seam
    for (const k in cells) { const c = cells[k]; bleed(ctx, c, pad); }
    const tex = new THREE.CanvasTexture(canvas); tex.anisotropy = 4;
    const geo = o.round ? RT.roundedBoxGeometry(w, h, d, o.round, o.k || 3) : new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    const per = uv.count / 6;
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z (same number of vertices each)
    ['left', 'right', 'top', 'bottom', 'front', 'back'].forEach((name, f) => {
      const c = cells[name];
      for (let i = f * per; i < f * per + per; i++) {
        const u = uv.getX(i), v = uv.getY(i);
        uv.setXY(i, (c.x + u * c.w) / W, 1 - (c.y + (1 - v) * c.h) / H);
      }
    });
    uv.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.45, metalness: 0 }, o.mat || {}));
    const m = RT.mesh(geo, mat, o.shadows !== false);
    m.userData.atlas = { canvas, cells, tex };
    return m;
  };
  function bleed(ctx, c, pad) {
    ctx.drawImage(ctx.canvas, c.x, c.y, c.w, 1, c.x, c.y - pad, c.w, pad);
    ctx.drawImage(ctx.canvas, c.x, c.y + c.h - 1, c.w, 1, c.x, c.y + c.h, c.w, pad);
    ctx.drawImage(ctx.canvas, c.x, c.y - pad, 1, c.h + 2 * pad, c.x - pad, c.y - pad, pad, c.h + 2 * pad);
    ctx.drawImage(ctx.canvas, c.x + c.w - 1, c.y - pad, 1, c.h + 2 * pad, c.x + c.w, c.y - pad, pad, c.h + 2 * pad);
  }

  // ---------- little canvas drawing helpers used by the clothing painters ----------
  RT.draw = {
    // fill a rectangle given in FRACTIONS of the cell (0..1)
    rect(ctx, c, x0, y0, x1, y1, color) { ctx.fillStyle = color; ctx.fillRect(c.x + c.w * x0, c.y + c.h * y0, c.w * (x1 - x0), c.h * (y1 - y0)); },
    // polygon with fractional points [[x,y],...]
    poly(ctx, c, pts, color) { ctx.fillStyle = color; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, c.x + c.w * p[0], c.y + c.h * p[1])); ctx.closePath(); ctx.fill(); },
    line(ctx, c, x0, y0, x1, y1, color, width = 2, dash) {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(c.x + c.w * x0, c.y + c.h * y0); ctx.lineTo(c.x + c.w * x1, c.y + c.h * y1); ctx.stroke(); ctx.restore();
    },
    circle(ctx, c, x, y, rPx, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(c.x + c.w * x, c.y + c.h * y, rPx, 0, Math.PI * 2); ctx.fill(); },
    // soft darker edges: makes a flat block read as a smooth plastic part
    bevel(ctx, c, strength = 0.16, size = 0.09) {
      const s = Math.max(3, Math.min(c.w, c.h) * size);
      const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
      };
      edge(c.x, c.y, c.x + s, c.y, c.x, c.y, s, c.h);
      edge(c.x + c.w, c.y, c.x + c.w - s, c.y, c.x + c.w - s, c.y, s, c.h);
      edge(c.x, c.y + c.h, c.x, c.y + c.h - s, c.x, c.y + c.h - s, c.w, s);
      const g = ctx.createLinearGradient(c.x, c.y, c.x, c.y + s * 1.2);   // a faint highlight on the top edge
      g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, s * 1.2);
    },
    stitch(ctx, c, x0, y0, x1, y1, color = 'rgba(255,240,210,0.45)') { RT.draw.line(ctx, c, x0, y0, x1, y1, color, 1.6, [4, 4]); },
  };

  // ---------- custom geometry ----------
  // Wedge (Roblox "WedgePart"): full height at the back (-z), sloping down to the front (+z). Centered on the origin.
  RT.wedgeGeometry = function (w, h, d) {
    const x = w / 2, y = h / 2, z = d / 2;
    const A = [-x, -y, -z], B = [x, -y, -z], C = [x, -y, z], D = [-x, -y, z], E = [-x, y, -z], F = [x, y, -z];
    const pos = [], nor = [], uvs = [];
    const tri = (a, b, c, out, ua, ub, uc) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; n = n.map((v) => -v); }
      const l = Math.hypot(n[0], n[1], n[2]) || 1; n = n.map((v) => v / l);
      [a, b, c].forEach((p) => { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); });
      uvs.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
    };
    const quad = (a, b, c, dd, out) => { tri(a, b, c, out, [0, 0], [1, 0], [1, 1]); tri(a, c, dd, out, [0, 0], [1, 1], [0, 1]); };
    quad(A, B, C, D, [0, -1, 0]);            // bottom
    quad(B, A, E, F, [0, 0, -1]);            // back
    quad(D, C, F, E, [0, d, h]);             // slope
    tri(A, D, E, [-1, 0, 0], [0, 0], [1, 0], [0, 1]);   // left side
    tri(C, B, F, [1, 0, 0], [0, 0], [1, 0], [1, 1]);    // right side
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return g;
  };

  // Rounded box (soft-edged block, like the Roblox avatar body parts). Same face order and groups as
  // BoxGeometry, so multi-material heads and atlas textures work. r = edge radius, k = smoothness steps.
  // UVs follow the real position on each face, so textures are not squashed near the rounded edges.
  RT.roundedBoxGeometry = function (w, h, d, r, k = 3) {
    r = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    const n = 2 * k + 1, g = new THREE.BoxGeometry(w, h, d, n, n, n);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, half = [w / 2, h / 2, d / 2];
    const coord = (i, L) => (i <= k ? -L / 2 + (r * i) / k : i >= n - k ? L / 2 - (r * (n - i)) / k : 0);
    const per = P.count / 6, faceAxes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // (u, v) extents per face
    const q = [0, 0, 0];
    for (let i = 0; i < P.count; i++) {
      for (let a = 0; a < 3; a++) {
        const c = P.array[i * 3 + a], L = half[a] * 2, idx = Math.round(((c + half[a]) / L) * n);
        q[a] = coord(idx, L);
      }
      const inner = q.map((v, a) => RT.clamp(v, -(half[a] - r), half[a] - r));
      const dir = q.map((v, a) => v - inner[a]), len = Math.hypot(dir[0], dir[1], dir[2]);
      if (len > 1e-6) {
        P.setXYZ(i, inner[0] + (dir[0] / len) * r, inner[1] + (dir[1] / len) * r, inner[2] + (dir[2] / len) * r);
        N.setXYZ(i, dir[0] / len, dir[1] / len, dir[2] / len);
      } else P.setXYZ(i, q[0], q[1], q[2]);
      const [Lu, Lv] = faceAxes[Math.floor(i / per)];
      const iu = Math.round(U.getX(i) * n), iv = Math.round(U.getY(i) * n);
      U.setXY(i, (coord(iu, Lu) + Lu / 2) / Lu, (coord(iv, Lv) + Lv / 2) / Lv);
    }
    P.needsUpdate = N.needsUpdate = U.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  };

  // Rounded cylinder: radius r, height h, corner radius c. Revolved profile (LatheGeometry).
  RT.roundedCylinderGeometry = function (r, h, c, seg = 32) {
    const pts = [], y0 = -h / 2, y1 = h / 2, n = 6;
    pts.push(new THREE.Vector2(0.0001, y0));
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, y0 + c + Math.sin(a) * c)); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, y1 - c + Math.sin(a) * c)); }
    pts.push(new THREE.Vector2(0.0001, y1));
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    return g;
  };

  // Merge several geometries (each with an optional Matrix4) into ONE BufferGeometry (position, normal, uv).
  // Used for crowds and repeated props so they cost one draw call.
  RT.mergeGeometries = function (items) {
    const pos = [], nor = [], uv = [], v = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const it of items) {
      const g = it.geo.index ? it.geo.toNonIndexed() : it.geo, m = it.matrix || new THREE.Matrix4();
      nm.getNormalMatrix(m);
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
        if (U) uv.push(U.getX(i), U.getY(i)); else uv.push(0, 0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  };
  RT.mat4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
})();
