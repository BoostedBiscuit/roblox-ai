// =====================================================================================
// characters.js: THE REAPING TRIALS cast, built as blocky Roblox-style avatars (three.js r128 only).
//
// BODY REFERENCE: roblox-docs/avatar/character-bodies/Correct-Head-Attachment.png and
// roblox-docs/art/resources/Body-Scale-Classic.png (in this repo): the blocky R15 body.
//   rounded-box head · upper + lower torso with a small waist step · upper arm + forearm + C-shaped hand
//   · upper leg + lower leg + dome shoe · arms hang in a slight A-pose.
// All faces, clothes, hair and colors are original designs (no Roblox logos, branding or default faces).
//
// USAGE (every function returns a THREE.Group; the rig is in group.rig):
//   const rhea = RT.characters.rhea();      scene.add(rhea);   rhea.position.set(0, 0, 0);
//   rhea.rig.setFace('determined');         // neutral, determined, sad, scared, smiling, smirk, shocked, crying
//   rhea.rig.update(t);                     // call every frame: blinking + braid sway (t = seconds, deterministic)
//   RT.anim.set(rhea, 'walk', t);           // poses live in animations.js
//
// SIZES are in "studs" (Roblox units). RT.STUD converts studs → world units (scene scale of the test scene).
// Change colors in each character's COLORS block below. Change body sizes in DIMS / each character's dims.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, D = RT.draw;

  RT.STUD = 0.44;         // world units per stud: a ~5.4-stud avatar ≈ 2.4 units, Rhea's size in the test scene
  RT.BEND_LIMBS = true;   // elbows/knees bend a little in run/hug/kneel/cross-arms poses. false = fully stiff limbs

  // Default body sizes (studs), measured from the reference image (torso 2 × 2 × 1, limbs ~2 long).
  const DIMS = {
    uw: 2.0, uh: 1.05, ud: 1.0,        // upper torso  (width, height, depth)
    lw: 1.86, lh: 0.95, ld: 0.94,      // lower torso (slightly narrower → the waist step)
    aw: 0.74, ad: 0.76, ua: 0.95, la: 0.82, hand: 0.54,   // arms: width, depth, upper arm, forearm, hand size
    gw: 0.82, gd: 0.86, ul: 1.0, ll: 1.0, legX: 0.46,     // legs: width, depth, upper, lower, distance from center
    hw: 1.25, hh: 1.1, hd: 1.16, hr: 0.24,                // head: rounded box (a bit wider than tall)
    shoe: 0.43,                                           // dome shoe radius
  };

  // =================================================================================
  // FACES: flat 2D cartoon faces drawn on a canvas and shown on the front of the head.
  // Swap expressions with rig.setFace(name). Blinks and talking swap the texture too.
  // =================================================================================
  const FW = 512, FH = 450;   // face canvas (same proportions as the head's front)
  // Expression settings (all optional):
  //  eye: eye size · pupil: pupil size · lid: upper lid closed 0..1 · lidTilt: + inner corner lower (angry), − outer lower (sad)
  //  low: lower lid up (smile squint) · brow: brow height (− = higher) · browTilt: + angry, − worried · browAsym: raise one brow
  //  mouth: line | frown | smile | smirk | wavy | o | cry · curve: mouth curve (+ = smile) · mw: mouth width · look: [x, y] pupils
  const EXPR = {
    neutral:    { eye: 1, lid: 0.1, browTilt: 0.03, mouth: 'line', curve: 2, mw: 54 },
    determined: { eye: 0.96, lid: 0.34, lidTilt: 0.22, low: 0.08, brow: 12, browTilt: 0.34, mouth: 'line', curve: -4, mw: 50 },
    sad:        { eye: 0.96, pupil: 0.95, lid: 0.3, lidTilt: -0.26, brow: -6, browTilt: -0.4, mouth: 'frown', curve: -15, mw: 46, look: [0, 6] },
    scared:     { eye: 1.18, pupil: 0.62, lid: 0, brow: -20, browTilt: -0.32, mouth: 'wavy', mw: 48 },
    smiling:    { eye: 1, lid: 0.08, low: 0.32, brow: -8, browTilt: -0.06, mouth: 'smile', curve: 18, mw: 66 },
    smirk:      { eye: 0.95, lid: 0.36, lidTilt: 0.08, low: 0.08, brow: 4, browTilt: 0.12, browAsym: -18, mouth: 'smirk', curve: 14, mw: 52, look: [-5, 0] },
    shocked:    { eye: 1.3, pupil: 0.5, lid: 0, brow: -28, browTilt: -0.1, mouth: 'o', mw: 36 },
    crying:     { eye: 0.95, pupil: 0.9, lid: 0.32, lidTilt: -0.3, brow: -8, browTilt: -0.44, mouth: 'cry', curve: -14, mw: 52, tears: 1, look: [0, 4] },
    // Echo Breakers (anime): the "serious switch" face, battle shouts, pain, calm Mira, cold Riku
    serious:    { eye: 0.92, pupil: 0.8, lid: 0.44, lidTilt: 0.34, low: 0.12, brow: 16, browTilt: 0.46, mouth: 'line', curve: -3, mw: 40 },
    shout:      { eye: 1.02, pupil: 0.75, lid: 0.22, lidTilt: 0.36, brow: 10, browTilt: 0.52, mouth: 'o', mw: 58 },
    pain:       { eye: 0.9, lid: 0.66, lidTilt: 0.1, low: 0.25, brow: -2, browTilt: -0.34, mouth: 'wavy', mw: 52 },
    calm:       { eye: 0.96, lid: 0.4, low: 0.06, brow: 2, browTilt: 0.02, mouth: 'line', curve: 5, mw: 46 },
    cold:       { eye: 0.92, pupil: 0.8, lid: 0.46, lidTilt: 0.06, brow: 6, browTilt: 0.1, mouth: 'line', curve: -2, mw: 44, look: [-4, 0] },
  };
  // simpler faces for the instanced crowd (no eyelids, because every crowd member has a different skin color)
  const CROWD_EXPR = {
    neutral: { eye: 0.95, mouth: 'line', curve: 2, mw: 50 },
    worried: { eye: 0.95, brow: -10, browTilt: -0.36, mouth: 'frown', curve: -10, mw: 44 },
    scared:  { eye: 1.15, pupil: 0.65, brow: -20, browTilt: -0.3, mouth: 'wavy', mw: 44 },
    happy:   { eye: 0.95, brow: -8, mouth: 'smile', curve: 16, mw: 60 },
  };
  RT.EXPRESSIONS = Object.keys(EXPR);

  let styleId = 0;
  function faceStyle(o) { return Object.assign({ id: ++styleId, iris: '#5b3a1f', brow: '#241710', browW: 13, ink: '#20150f', seed: styleId * 17 }, o); }

  const faceCache = {};
  function faceTexture(st, expr, blink, open, table) {
    const key = `${st.id}|${expr}|${blink ? 1 : 0}|${open ? 1 : 0}`;
    if (faceCache[key]) return faceCache[key];
    const E = (table || EXPR)[expr] || EXPR.neutral;
    const tex = RT.canvasTexture(FW, FH, (g) => drawFace(g, st, E, blink, open));
    return (faceCache[key] = tex);
  }

  function drawFace(g, st, E, blink, open) {
    const cx = FW / 2, ink = st.ink;
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (st.transparent) g.clearRect(0, 0, FW, FH); else { g.fillStyle = st.skin; g.fillRect(0, 0, FW, FH); }
    const ey = 242 + (st.eyeY || 0), sp = 92 * (st.eyeSpread || 1), sz = 1.14 * (st.eyeSize || 1) * (E.eye || 1);
    const rx = 29 * sz * (st.eyeW || 1), ry = 38 * sz;
    const lid = RT.clamp((E.lid || 0) + (st.lidBias || 0), 0, 0.85), look = E.look || [0, 0];
    const my = 342 + (st.mouthY || 0);
    // --- under-features: stubble, blush, freckles, eye bags ---
    if (st.stubble) {
      const r = RT.rng(st.seed);
      g.fillStyle = st.stubble;
      for (let i = 0; i < 900; i++) {
        const x = r() * FW, y = 262 + r() * (FH - 262), dx = (x - cx) / 250, dy = (y - 470) / 215;
        if (dx * dx + dy * dy > 1) continue;
        if (Math.abs(x - cx) < 40 && Math.abs(y - my) < 15) continue;
        g.globalAlpha = 0.35 + r() * 0.3; g.beginPath(); g.arc(x, y, 1.8 + r() * 1.2, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
    if (st.blush || E.blush) for (const s of [-1, 1]) {
      const gr = g.createRadialGradient(cx + s * sp, ey + ry + 34, 2, cx + s * sp, ey + ry + 34, 34);
      gr.addColorStop(0, 'rgba(255,105,110,0.32)'); gr.addColorStop(1, 'rgba(255,105,110,0)');
      g.fillStyle = gr; g.fillRect(cx + s * sp - 40, ey + ry, 80, 70);
    }
    if (st.freckles) { g.fillStyle = RT.shade(st.skin, -0.28); for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx + s * (sp - 16 + k * 11), ey + ry + 22 + (k % 2) * 9, 3.6, 0, Math.PI * 2); g.fill(); } }
    if (st.bags) { g.strokeStyle = 'rgba(90,45,30,0.35)'; g.lineWidth = 4; for (const s of [-1, 1]) { const x = cx + s * sp; g.beginPath(); g.moveTo(x - rx * 0.85, ey + ry + 8); g.quadraticCurveTo(x, ey + ry + 20, x + rx * 0.85, ey + ry + 8); g.stroke(); } }

    for (const s of [-1, 1]) {      // s = −1: canvas-left eye = the character's RIGHT eye
      const x = cx + s * sp;
      if (blink) closedEye(g, x, ey, rx, ry, s, E, st);
      else openEye(g, x, ey, rx, ry, s, E, st, lid, look);
      // eyebrow
      const by = ey - ry - 24 + (E.brow || 0) + (s === 1 ? E.browAsym || 0 : 0) + (st.browY || 0);
      const tilt = (E.browTilt || 0) * 50, xi = x - s * rx * 1.05, xo = x + s * rx * 1.3, yi = by + tilt, yo = by - tilt * 0.35;
      g.strokeStyle = st.brow; g.lineWidth = st.browW;
      g.beginPath(); g.moveTo(xi, yi); g.quadraticCurveTo((xi + xo) / 2, Math.min(yi, yo) - 9, xo, yo); g.stroke();
      if (st.bushy) { g.lineWidth = st.browW * 0.45; g.strokeStyle = RT.shade(st.brow, 0.25); g.beginPath(); g.moveTo(xi, yi - 5); g.quadraticCurveTo((xi + xo) / 2, Math.min(yi, yo) - 16, xo, yo - 6); g.stroke(); }
      if (E.tears && !st.noTears) {
        const tx = x + s * rx * 0.25;
        g.fillStyle = 'rgba(110,195,255,0.9)';
        g.beginPath(); g.roundRect ? g.roundRect(tx - 7, ey + ry * 0.55, 14, FH - 60 - ey, 7) : g.rect(tx - 7, ey + ry * 0.55, 14, FH - 60 - ey); g.fill();
        g.beginPath(); g.arc(tx, FH - 52, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(tx - 3, ey + ry * 0.7, 3, FH - 120 - ey);
      }
    }
    drawMouth(g, st, E, open, cx, my);
  }

  function openEye(g, x, y, rx, ry, s, E, st, lid, look) {
    const ink = st.ink;
    g.save();
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#fbfaf5'; g.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, ry * 2 + 4);
    const ir = Math.min(rx, ry) * 0.84, ix = x + look[0], iy = y + ry * 0.1 + look[1];
    g.fillStyle = st.iris; g.beginPath(); g.arc(ix, iy, ir, 0, Math.PI * 2); g.fill();
    g.strokeStyle = RT.shade(st.iris, -0.45); g.lineWidth = 4; g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(ix, iy, ir * 0.5 * (E.pupil || 1), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ix + ir * 0.36, iy - ir * 0.38, ir * 0.3, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.85; g.beginPath(); g.arc(ix - ir * 0.34, iy + ir * 0.36, ir * 0.13, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = ink; g.lineWidth = 10; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    let yo = y - ry;
    if (!st.noLids && lid > 0.02) {
      const yl = y - ry + 2 * ry * lid, t = (E.lidTilt || 0) * ry, xo = x + s * rx * 1.3, xi = x - s * rx * 1.3;
      yo = yl - t; const yi = yl + t;
      g.fillStyle = st.skin; g.beginPath(); g.moveTo(xo, y - ry - 5); g.lineTo(xi, y - ry - 5); g.lineTo(xi, yi); g.lineTo(xo, yo); g.closePath(); g.fill();
      g.strokeStyle = ink; g.lineWidth = 8; g.beginPath(); g.moveTo(xo, yo); g.lineTo(xi, yi); g.stroke();
    }
    if (!st.noLids && (E.low || 0) > 0.02) {
      const cy = y + ry * (2.05 - 2.2 * E.low);
      g.fillStyle = st.skin; g.beginPath(); g.ellipse(x, cy, rx * 1.6, ry, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = ink; g.lineWidth = 7; g.stroke();
    }
    g.restore();
    if (st.lashes) {
      g.strokeStyle = ink; g.lineWidth = 6;
      for (const a of [0.35, 0.8]) {
        const px = x + s * rx * Math.cos(a), py = Math.max(y - ry * Math.sin(a), yo + 2);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + s * 13, py - 9 + a * 4); g.stroke();
      }
    }
  }
  function closedEye(g, x, y, rx, ry, s, E, st) {
    g.strokeStyle = st.ink; g.lineWidth = 8; g.beginPath();
    if ((E.low || 0) > 0.2) { g.moveTo(x - rx, y + 8); g.quadraticCurveTo(x, y - 26, x + rx, y + 8); }   // happy ^ ^
    else { const tt = (E.lidTilt || 0) * 10 * s; g.moveTo(x - rx, y + 2 + tt); g.quadraticCurveTo(x, y + 18, x + rx, y + 2 - tt); }
    g.stroke();
    if (st.lashes) { g.lineWidth = 6; g.beginPath(); g.moveTo(x + s * rx * 0.95, y + 3); g.lineTo(x + s * (rx + 12), y + 10); g.stroke(); }
  }

  function drawMouth(g, st, E, open, cx, my) {
    const ink = st.ink, mw = 1.12 * (E.mw || 50) * (st.mouthW || 1), x0 = cx - mw / 2, x1 = cx + mw / 2, c = E.curve || 0;
    const IN = '#5a1a1c', TEETH = '#fbf7ef', TONGUE = '#d0606a';
    const stroke = (fn, w = 8) => { g.strokeStyle = ink; g.lineWidth = w; g.beginPath(); fn(); g.stroke(); };
    const filled = (fn, teeth, tongueY) => {
      g.fillStyle = IN; g.beginPath(); fn(); g.fill();
      g.save(); g.beginPath(); fn(); g.clip();
      if (teeth) { g.fillStyle = TEETH; g.fillRect(cx - mw, my - 30, mw * 2, teeth); }
      if (tongueY) { g.fillStyle = TONGUE; g.beginPath(); g.ellipse(cx, tongueY, mw * 0.26, 11, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); fn(); g.stroke();
    };
    switch (E.mouth) {
      case 'frown':
        if (!open) stroke(() => { g.moveTo(x0, my); g.quadraticCurveTo(cx, my + 2 * c, x1, my); });
        else filled(() => { g.moveTo(cx - mw * 0.34, my + 10); g.quadraticCurveTo(cx, my - 22, cx + mw * 0.34, my + 10); g.quadraticCurveTo(cx, my + 18, cx - mw * 0.34, my + 10); }, 0, 0);
        break;
      case 'smile': {
        const D = (deep) => () => { g.moveTo(x0, my - 8); g.quadraticCurveTo(cx, my - 2, x1, my - 8); g.quadraticCurveTo(cx, my + 2 * (c + deep), x0, my - 8); };
        if (st.smile === 'closed' && !open) { stroke(() => { g.moveTo(x0, my - 4); g.quadraticCurveTo(cx, my + 1.4 * c, x1, my - 4); }); stroke(() => { g.moveTo(x0 - 3, my - 10); g.lineTo(x0 + 2, my - 2); g.moveTo(x1 + 3, my - 10); g.lineTo(x1 - 2, my - 2); }, 5); }
        else filled(D(open ? 18 : 4), 12, my + c + 4);
        break;
      }
      case 'smirk':
        if (!open) { stroke(() => { g.moveTo(x0, my + 4); g.quadraticCurveTo(cx + 6, my + 12, x1, my - 12); }); stroke(() => { g.moveTo(x1 - 2, my - 20); g.lineTo(x1 + 4, my - 8); }, 5); }
        else filled(() => { g.moveTo(x0 + 8, my + 2); g.quadraticCurveTo(cx + 4, my - 6, x1, my - 12); g.quadraticCurveTo(cx + 12, my + 30, x0 + 8, my + 2); }, 10, 0);
        break;
      case 'wavy':
        if (!open) stroke(() => { for (let i = 0; i <= 24; i++) { const x = x0 + (mw * i) / 24, y = my + Math.sin((i / 24) * Math.PI * 5) * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); } }, 7);
        else filled(() => g.ellipse(cx, my + 8, mw * 0.32, 18, 0, 0, Math.PI * 2), 8, 0);
        break;
      case 'o': {
        const k = open ? 1.22 : 1;
        filled(() => g.ellipse(cx, my + 10, 18 * k * (st.mouthW || 1), 26 * k, 0, 0, Math.PI * 2), 0, my + 10 + 26 * k - 9);
        break;
      }
      case 'cry':
        filled(() => { g.moveTo(x0, my + 14); g.quadraticCurveTo(cx, my - 26, x1, my + 14); g.quadraticCurveTo(cx, my + (open ? 36 : 22), x0, my + 14); }, 0, 0);
        break;
      default:   // 'line'
        if (!open) stroke(() => { g.moveTo(x0, my); g.quadraticCurveTo(cx, my + 2 * c, x1, my); });
        else filled(() => g.ellipse(cx, my + 6, mw * 0.36, 15, 0, 0, Math.PI * 2), 9, my + 16);
    }
  }

  // =================================================================================
  // BODY PARTS
  // =================================================================================
  const SIDES = ['front', 'back', 'left', 'right'];
  // A body part whose clothing is painted as ONE tall surface shared with its neighbor
  // (upper + lower torso, upper arm + forearm, upper + lower leg). vTop/vTotal place this part on that surface.
  function partBox(w, h, d, vTop, vTotal, paint, info, o = {}) {
    return RT.atlasBox(w, h, d, (g, cells) => {
      for (const name of SIDES) {
        const c = cells[name], k = c.h / h;
        g.save(); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip();
        paint(g, name, { x: c.x, y: c.y - vTop * k, w: c.w, h: vTotal * k }, info);
        D.bevel(g, c, 0.08, 0.06);
        g.restore();
      }
      for (const name of ['top', 'bottom']) { const c = cells[name]; g.save(); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip(); paint(g, name, c, info); g.restore(); }
    }, { pps: o.pps || 90, round: o.round ?? 0.09, k: 3 });
  }
  // fill horizontal bands from the top of a (virtual) surface: bands = [[toFraction, color], ...]
  function bands(g, c, list) { let y0 = 0; for (const [to, col] of list) { D.rect(g, c, 0, y0, 1, to, col); y0 = to; } }
  const outer = (face, info) => (info.side === 'L' ? face === 'left' : face === 'right');
  const inner = (face, info) => (info.side === 'L' ? face === 'right' : face === 'left');

  // C-shaped hand (like the reference): opening faces the body. s = +1 left hand, −1 right hand.
  const handGeoCache = {};
  function handGeometry(s, size) {
    const key = s + '|' + size; if (handGeoCache[key]) return handGeoCache[key];
    const k = size / 0.58, rb = (w, h, d, x, y, z) => ({ geo: RT.roundedBoxGeometry(w * k, h * k, d * k, 0.075 * k, 2), matrix: RT.mat4(x * k, y * k, z * k) });
    return (handGeoCache[key] = RT.mergeGeometries([
      rb(0.64, 0.2, 0.66, 0, -0.1, 0),          // knuckles / wrist bar
      rb(0.25, 0.58, 0.68, s * 0.2, -0.3, 0),   // back of the hand (outer side)
      rb(0.44, 0.2, 0.6, s * 0.09, -0.5, 0.02), // curled fingers (bottom of the C)
    ]));
  }
  // dome shoe (half sphere + flat sole)
  let footGeoCache = null;
  function footGeometry() {
    if (footGeoCache) return footGeoCache;
    const dome = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const sole = new THREE.CircleGeometry(1, 20); sole.rotateX(Math.PI / 2);
    return (footGeoCache = RT.mergeGeometries([{ geo: dome }, { geo: sole }]));
  }

  // hair / accessory piece helpers → merged into one mesh per character (one draw call)
  const H = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, r = 0.1) => ({ geo: RT.roundedBoxGeometry(w, h, d, r, 2), matrix: RT.mat4(x, y, z, rx, ry, rz) });
  const Cone = (rad, h, x, y, z, rx = 0, ry = 0, rz = 0, seg = 4) => ({ geo: new THREE.ConeGeometry(rad, h, seg), matrix: RT.mat4(x, y, z, rx, ry, rz) });
  const Ball = (rad, x, y, z, sx = 1, sy = sx, sz = sx) => ({ geo: new THREE.SphereGeometry(rad, 12, 9), matrix: RT.mat4(x, y, z, 0, 0, 0, sx, sy, sz) });
  const Wedge = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => ({ geo: RT.wedgeGeometry(w, h, d), matrix: RT.mat4(x, y, z, rx, ry, rz) });
  function merged(pieces, mat) { return RT.mesh(RT.mergeGeometries(pieces), mat); }

  // =================================================================================
  // THE AVATAR BUILDER: every character goes through this
  // =================================================================================
  function buildAvatar(S) {
    const d = Object.assign({}, DIMS, S.dims || {});
    const C = S.clothes;
    const root = new THREE.Group(); root.name = S.name || 'avatar';
    const unit = RT.STUD * (S.scale || 1);
    const innerG = new THREE.Group(); innerG.scale.setScalar(unit); root.add(innerG);
    const hips = new THREE.Group(); hips.rotation.order = 'YXZ'; hips.position.y = d.ul + d.ll; innerG.add(hips);

    // torso: lower part on the hips, upper part on the waist joint (one painted surface across both)
    const vT = d.uh + d.lh;
    const lower = partBox(d.lw, d.lh, d.ld, d.uh, vT, C.torso, { part: 'lower' }, { pps: 110, round: 0.1 });
    lower.position.y = d.lh / 2; hips.add(lower);
    const waist = new THREE.Group(); waist.rotation.order = 'YXZ'; waist.position.y = d.lh; hips.add(waist);
    const upper = partBox(d.uw, d.uh, d.ud, 0, vT, C.torso, { part: 'upper' }, { pps: 110, round: 0.13 });
    upper.position.y = d.uh / 2; waist.add(upper);

    // head: rounded box; its FRONT face shows the face texture (material slot 4 = +z)
    const neck = new THREE.Group(); neck.rotation.order = 'YXZ'; neck.position.y = d.uh; waist.add(neck);
    const st = S.face;
    const skinMat = RT.plastic(S.skin);
    const faceMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, map: faceTexture(st, S.expression || 'neutral', false, false) });
    const head = RT.mesh(RT.roundedBoxGeometry(d.hw, d.hh, d.hd, d.hr, 4), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const hs = S.headScale || 1;      // kids get a slightly bigger head
    head.scale.setScalar(hs); head.position.y = (d.hh / 2) * hs + 0.03; neck.add(head);
    const headTop = new THREE.Group(); headTop.position.copy(head.position); headTop.scale.setScalar(hs); neck.add(headTop);   // hair/hats attach here (head center)

    function arm(side) {
      const s = side === 'L' ? 1 : -1;
      const g = new THREE.Group(); g.rotation.order = 'XZY';
      g.position.set(s * (d.uw / 2 + d.aw / 2 + 0.03), d.uh - 0.42, 0); waist.add(g);
      const vA = d.ua + d.la;
      const up = partBox(d.aw, d.ua, d.ad, 0, vA, C.arm, { part: 'upper', side }, { round: 0.11 });
      up.position.y = 0.42 - d.ua / 2; g.add(up);
      const elbow = new THREE.Group(); elbow.position.y = 0.42 - d.ua; g.add(elbow);
      const lo = partBox(d.aw * 0.96, d.la, d.ad * 0.96, d.ua, vA, C.arm, { part: 'lower', side }, { round: 0.1 });
      lo.position.y = -d.la / 2; elbow.add(lo);
      const hand = new THREE.Group(); hand.position.y = -d.la + 0.02; elbow.add(hand);
      hand.add(RT.mesh(handGeometry(s, d.hand), RT.plastic(S.hands || S.skin)));
      const grip = new THREE.Group(); grip.position.set(-s * 0.05, -d.hand * 0.55, 0); hand.add(grip);   // rig.hold() puts props here
      return { g, elbow, hand, grip, up, lo };
    }
    function leg(side) {
      const s = side === 'L' ? 1 : -1;
      const g = new THREE.Group(); g.position.set(s * d.legX, 0, 0); hips.add(g);
      const vL = d.ul + d.ll;
      const up = partBox(d.gw, d.ul, d.gd, 0, vL, C.leg, { part: 'upper', side }, { round: 0.09 });
      up.position.y = -d.ul / 2; g.add(up);
      const knee = new THREE.Group(); knee.position.y = -d.ul; g.add(knee);
      const lo = partBox(d.gw * 0.97, d.ll, d.gd * 0.97, d.ul, vL, C.leg, { part: 'lower', side }, { round: 0.09 });
      lo.position.y = -d.ll / 2; knee.add(lo);
      const foot = RT.mesh(footGeometry(), RT.plastic(S.shoes || '#2b2b2b'));
      foot.scale.set(d.shoe * 0.98, d.shoe * 0.9, d.shoe * 1.24); foot.position.set(0, -d.ll, 0.13); knee.add(foot);
      return { g, knee, up, lo, foot };
    }
    const aL = arm('L'), aR = arm('R'), lL = leg('L'), lR = leg('R');

    const rig = {
      root, inner: innerG, hips, waist, neck, head, headTop, upper, lower,
      armL: aL.g, armR: aR.g, elbowL: aL.elbow, elbowR: aR.elbow, handL: aL.hand, handR: aR.hand, gripL: aL.grip, gripR: aR.grip,
      legL: lL.g, legR: lR.g, kneeL: lL.knee, kneeR: lR.knee, footL: lL.foot, footR: lR.foot,
      dims: d, unit, spec: S, faceStyle: st, faceMat,
      base: Object.assign({ aLo: 0.1, aRo: 0.1, eL: 0.06, eR: 0.06 }, S.base || {}),   // rest pose (A-pose arms)
      followers: [],   // functions run after each pose (coat panels follow the legs, …)
      sway: [],        // functions run in update(t) (braid, antenna, …)
      props: {},
      expression: S.expression || 'neutral', mouthOpen: false, eyes: null, blinkSeed: (S.seed || styleId) * 3.17,
      setFace(e) { if (e && e !== rig.expression) { rig.expression = e; refresh(); } return rig; },
      setMouth(o) { o = !!o; if (o !== rig.mouthOpen) { rig.mouthOpen = o; refresh(); } return rig; },
      setEyes(mode) { rig.eyes = mode; refresh(); return rig; },          // 'closed' | 'open' | null (= normal blinking)
      hold(side, obj) { (side === 'L' ? aL.grip : aR.grip).add(obj); return obj; },
      update(t) {
        const b = rig.eyes ? rig.eyes === 'closed' : blinking(t, rig.blinkSeed);
        if (b !== rig._blink) { rig._blink = b; refresh(); }
        for (const f of rig.sway) f(t, rig);
      },
    };
    function refresh() { faceMat.map = faceTexture(st, rig.expression, rig._blink, rig.mouthOpen); }
    root.rig = rig; root.userData.rig = rig;
    if (S.build) S.build(rig, d);     // hair, accessories
    if (RT.anim) RT.anim.apply(root, {}); else applyRest(rig);
    return root;
  }
  function applyRest(rig) { rig.armL.rotation.z = rig.base.aLo; rig.armR.rotation.z = -rig.base.aRo; }
  // natural irregular blinking, the same every render (period ~3.3–4.7 s, sometimes a double blink)
  function blinking(t, seed) {
    const P = 3.3 + RT.hash(seed) * 1.4, k = Math.floor((t + seed) / P), start = k * P - seed + RT.hash(k * 7.13 + seed) * (P - 0.5), dt = t - start;
    if (dt >= 0 && dt < 0.13) return true;
    return RT.hash(k * 3.7 + seed) > 0.72 && dt >= 0.27 && dt < 0.39;
  }

  // =================================================================================
  // THE CAST
  // =================================================================================

  // ---------- 1. RHEA VANCE (16, hero, Sector 7) ----------
  function rhea(o = {}) {
    const COL = { skin: '#c99a72', hair: '#241710', jacket: '#6b4a2f', shirt: '#e6dcc5', pants: '#3b3a36', boots: '#2a1d14', tie: '#8a3b22' };
    const J = COL.jacket, Jd = RT.shade(J, -0.28), Jl = RT.shade(J, 0.12);
    return buildAvatar({
      name: 'Rhea', skin: COL.skin, shoes: COL.boots, seed: 7, expression: o.expression || 'determined',
      face: faceStyle({ skin: COL.skin, iris: '#5b3a1f', brow: COL.hair, browW: 13, lashes: true }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? J : COL.pants);
          D.rect(g, c, 0, 0, 1, 1, J);
          if (f === 'front') {
            D.rect(g, c, 0.36, 0, 0.64, 0.88, COL.shirt);                                  // pale shirt in the open jacket
            D.poly(g, c, [[0.43, 0], [0.57, 0], [0.5, 0.09]], COL.skin);                     // V-neck
            D.poly(g, c, [[0.18, 0], [0.36, 0], [0.41, 0.3], [0.3, 0.18]], Jd);              // lapels
            D.poly(g, c, [[0.82, 0], [0.64, 0], [0.59, 0.3], [0.7, 0.18]], Jd);
            D.line(g, c, 0.36, 0.08, 0.36, 0.88, '#9c968c', 3); D.line(g, c, 0.64, 0.08, 0.64, 0.88, '#9c968c', 3);   // zipper edges
            for (const x of [0.07, 0.69]) { D.rect(g, c, x, 0.58, x + 0.24, 0.63, Jd); D.stitch(g, c, x + 0.02, 0.7, x + 0.22, 0.7); }   // pockets
            D.rect(g, c, 0.06, 0.2, 0.12, 0.42, Jl);                                       // worn leather highlight
          }
          if (f === 'back') { D.stitch(g, c, 0, 0.2, 1, 0.2); D.line(g, c, 0.5, 0.2, 0.5, 0.88, Jd, 3); }
          if (f === 'left' || f === 'right') D.line(g, c, 0.5, 0, 0.5, 0.88, Jd, 2);
          D.rect(g, c, 0, 0.88, 1, 1, COL.boots);                                           // belt
          if (f === 'front') { D.rect(g, c, 0.43, 0.895, 0.57, 0.99, '#c9a66b'); D.rect(g, c, 0.47, 0.92, 0.53, 0.965, COL.boots); }
          D.stitch(g, c, 0.02, 0.035, 0.98, 0.035);
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, Jd);
          bands(g, c, [[0.86, J], [1, Jd]]);
          if (outer(f, info)) { D.stitch(g, c, 0.5, 0.05, 0.5, 0.82); D.rect(g, c, 0.2, 0.5, 0.8, 0.6, Jl); }
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.pants : COL.boots);
          bands(g, c, [[0.72, COL.pants], [0.78, '#3a281b'], [1, COL.boots]]);
          if (f === 'front') for (let k = 0; k < 3; k++) D.line(g, c, 0.38, 0.81 + k * 0.05, 0.62, 0.81 + k * 0.05, '#7a6a55', 2);
          if (outer(f, info)) D.stitch(g, c, 0.5, 0.02, 0.5, 0.7);
        },
      },
      build(rig) {
        const hairMat = RT.plastic(COL.hair, { roughness: 0.55 });
        rig.headTop.add(merged([
          H(1.38, 0.44, 1.32, 0, 0.5, -0.03, 0, 0, 0, 0.2),            // top
          H(1.38, 0.98, 0.34, 0, 0.04, -0.47, 0, 0, 0, 0.14),          // back
          H(0.13, 0.98, 0.98, 0.685, 0.0, -0.1, 0, 0, 0.03, 0.06), H(0.13, 0.98, 0.98, -0.685, 0.0, -0.1, 0, 0, -0.03, 0.06),   // sides down to the jaw
          H(0.12, 0.42, 0.2, 0.68, -0.25, 0.36, 0.1, 0, 0.08, 0.05), H(0.12, 0.42, 0.2, -0.68, -0.25, 0.36, 0.1, 0, -0.08, 0.05),   // thin strands at the cheeks
          H(0.95, 0.2, 0.26, -0.14, 0.35, 0.55, 0, 0, 0.14, 0.09),     // one big swept bang
          H(0.42, 0.16, 0.24, 0.42, 0.38, 0.55, 0, 0, -0.18, 0.07),
        ], hairMat));
        // the big braid down her back (its own group so it can sway)
        const braid = new THREE.Group(); braid.position.set(0, -0.12, -0.72); rig.headTop.add(braid);
        const pieces = [];
        for (let k = 0; k < 6; k++) { const w = 0.36 - k * 0.022; pieces.push(H(w, 0.3, w * 0.9, (k % 2 ? 0.025 : -0.025), -0.15 - k * 0.27, -0.02 * k, 0, k % 2 ? 0.3 : -0.3, k % 2 ? 0.2 : -0.2, 0.08)); }
        braid.add(merged(pieces, hairMat));
        const tie = merged([H(0.26, 0.1, 0.26, 0, -1.78, -0.12, 0, 0, 0, 0.04)], RT.plastic(COL.tie));
        const tuft = merged([H(0.22, 0.2, 0.2, 0, -1.92, -0.12, 0, 0.3, 0, 0.07)], hairMat);
        braid.add(tie, tuft);
        rig.props.braid = braid;
        rig.sway.push((t, r) => { braid.rotation.x = 0.1 - r.waist.rotation.x * 0.8 - r.hips.rotation.x * 0.6 + Math.sin(t * 1.9) * 0.04; braid.rotation.z = Math.sin(t * 1.3 + 1) * 0.06; });
      },
    });
  }

  // ---------- 2. PIP VANCE (10, Rhea's little brother) ----------
  function pip(o = {}) {
    const COL = { skin: '#c99a72', hair: '#241710', sweater: '#7f9c6e', pants: '#6d5a44', shoes: '#3d3029', patchA: '#9a8a66', patchB: '#5f6f7e' };
    const Sd = RT.shade(COL.sweater, -0.18), Sl = RT.shade(COL.sweater, 0.15);
    const knit = (g, c) => { for (let y = 0.03; y < 0.84; y += 0.045) D.line(g, c, 0, y, 1, y, 'rgba(0,0,0,0.06)', 1.5); };
    return buildAvatar({
      name: 'Pip', scale: 0.75, headScale: 1.14, skin: COL.skin, shoes: COL.shoes, seed: 11, expression: o.expression || 'scared',
      dims: { uw: 2.1, ud: 1.08, lw: 1.98, ld: 1.04, aw: 0.8, ad: 0.82 },     // the sweater is too big for him
      face: faceStyle({ skin: COL.skin, iris: '#6b4423', brow: COL.hair, browW: 11, freckles: true, eyeSize: 1.12, blush: true }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.sweater : COL.pants);
          D.rect(g, c, 0, 0, 1, 1, COL.sweater); knit(g, c);
          D.rect(g, c, 0, 0.3, 1, 0.35, Sl); D.rect(g, c, 0, 0.37, 1, 0.39, Sd);              // a faded knit stripe
          if (f === 'front') { D.poly(g, c, [[0.34, 0], [0.66, 0], [0.6, 0.075], [0.4, 0.075]], Sd); D.poly(g, c, [[0.42, 0], [0.58, 0], [0.55, 0.045], [0.45, 0.045]], COL.skin); }
          D.rect(g, c, 0, 0.84, 1, 1, Sd); for (let x = 0.02; x < 1; x += 0.045) D.line(g, c, x, 0.85, x, 0.99, 'rgba(0,0,0,0.12)', 2);   // ribbed hem
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, Sd);
          bands(g, c, [[0.84, COL.sweater], [1, Sd]]); knit(g, c);
          for (let x = 0.05; x < 1; x += 0.1) D.line(g, c, x, 0.85, x, 0.99, 'rgba(0,0,0,0.12)', 2);
          if (outer(f, info) && info.side === 'L') { D.rect(g, c, 0.22, 0.48, 0.78, 0.62, '#8a6b4a'); D.stitch(g, c, 0.25, 0.5, 0.75, 0.5); D.stitch(g, c, 0.25, 0.6, 0.75, 0.6); }   // elbow patch
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.pants : COL.shoes);
          bands(g, c, [[0.84, COL.pants], [0.9, RT.shade(COL.pants, 0.15)], [1, COL.shoes]]);
          if (f === 'front' && info.side === 'R') { D.rect(g, c, 0.15, 0.5, 0.62, 0.68, COL.patchA); D.stitch(g, c, 0.17, 0.52, 0.6, 0.52); D.stitch(g, c, 0.17, 0.66, 0.6, 0.66); }
          if (f === 'front' && info.side === 'L') { D.rect(g, c, 0.38, 0.2, 0.86, 0.34, COL.patchB); D.stitch(g, c, 0.4, 0.22, 0.84, 0.22); D.stitch(g, c, 0.4, 0.32, 0.84, 0.32); }
        },
      },
      build(rig) {
        const hm = RT.plastic(COL.hair, { roughness: 0.55 });
        const P = [H(1.36, 0.42, 1.3, 0, 0.45, -0.02, 0, 0, 0, 0.16), H(1.36, 0.82, 0.32, 0, 0.1, -0.47, 0, 0, 0, 0.12),
          H(0.15, 0.5, 0.95, 0.69, 0.22, -0.1), H(0.15, 0.5, 0.95, -0.69, 0.22, -0.1)];
        const r = RT.rng(5);
        for (let k = 0; k < 11; k++) {      // messy spikes all over the top
          const a = (k / 11) * Math.PI * 2 + r() * 0.4, tilt = 0.5 + r() * 0.5;
          P.push(Cone(0.17, 0.5 + r() * 0.2, Math.sin(a) * 0.42, 0.66, Math.cos(a) * 0.4 - 0.05, Math.cos(a) * tilt, 0, -Math.sin(a) * tilt));
        }
        for (const x of [-0.3, 0.02, 0.32]) P.push(Cone(0.15, 0.38, x, 0.32, 0.6, 2.3 + x * 0.3, 0, x * 0.8));   // fringe spikes over the forehead
        rig.headTop.add(merged(P, hm));
      },
    });
  }

  // ---------- 3. JUNO CASTELL (16, inventor, Sector 3) ----------
  function juno(o = {}) {
    const COL = { skin: '#7a4b2c', hair: '#171313', overall: '#7b8088', tee: '#d9a441', boots: '#4a3020', leather: '#6b4226', brass: '#c8963e', pack: '#2f7d78' };
    const Od = RT.shade(COL.overall, -0.22), Ol = RT.shade(COL.overall, 0.15);
    return buildAvatar({
      name: 'Juno', skin: COL.skin, shoes: COL.boots, seed: 3, expression: o.expression || 'neutral',
      face: faceStyle({ skin: COL.skin, iris: '#2e1a0e', brow: '#120d0b', browW: 12, lashes: true, eyeSize: 1.03 }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.tee : COL.overall);
          D.rect(g, c, 0, 0, 1, 1, COL.tee);
          if (f === 'front') {
            D.poly(g, c, [[0.4, 0], [0.6, 0], [0.5, 0.06]], COL.skin);
            D.rect(g, c, 0.2, 0.26, 0.8, 1, COL.overall);                                        // bib
            D.poly(g, c, [[0.1, 0], [0.22, 0], [0.32, 0.27], [0.22, 0.27]], COL.overall);        // straps
            D.poly(g, c, [[0.9, 0], [0.78, 0], [0.68, 0.27], [0.78, 0.27]], COL.overall);
            D.circle(g, c, 0.26, 0.3, 6, COL.brass); D.circle(g, c, 0.74, 0.3, 6, COL.brass);
            D.rect(g, c, 0.36, 0.33, 0.64, 0.48, Od);                                            // bib pocket with tools
            D.rect(g, c, 0.4, 0.27, 0.44, 0.36, '#f2c84b'); D.rect(g, c, 0.55, 0.25, 0.59, 0.34, '#c0392b'); D.rect(g, c, 0.565, 0.33, 0.575, 0.36, '#b8bcc2');
            D.stitch(g, c, 0.22, 0.28, 0.78, 0.28); D.stitch(g, c, 0.37, 0.47, 0.63, 0.47);
          } else if (f === 'back') {
            D.poly(g, c, [[0.15, 0], [0.27, 0], [0.82, 0.55], [0.7, 0.55]], COL.overall); D.poly(g, c, [[0.85, 0], [0.73, 0], [0.18, 0.55], [0.3, 0.55]], COL.overall);
          }
          D.rect(g, c, 0, 0.55, 1, 1, COL.overall); D.line(g, c, 0, 0.55, 1, 0.55, Od, 2);
          if (f === 'front') D.line(g, c, 0.5, 0.82, 0.5, 1, Od, 3);
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.skin);
          bands(g, c, [[0.34, COL.tee], [0.37, RT.shade(COL.tee, -0.2)], [1, COL.skin]]);
          if (info.side === 'L') D.rect(g, c, 0, 0.82, 1, 0.9, COL.leather);      // leather wristband
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.overall : COL.boots);
          bands(g, c, [[0.72, COL.overall], [0.79, Ol], [1, COL.boots]]);
          if (f === 'front') { D.rect(g, c, 0.2, 0.44, 0.8, 0.56, Od); D.stitch(g, c, 0.22, 0.46, 0.78, 0.46); }
          if (outer(f, info)) D.stitch(g, c, 0.5, 0.02, 0.5, 0.7);
        },
      },
      build(rig, d) {
        // curly black hair: a puff of balls
        const r = RT.rng(9), P = [H(1.34, 0.34, 1.28, 0, 0.47, -0.03, 0, 0, 0, 0.15)];
        for (let k = 0; k < 22; k++) {
          const a = (k / 22) * Math.PI * 2 * 1.6, ring = k < 12;
          const ang = ring ? Math.PI * 0.42 + (k / 12) * Math.PI * 1.16 : a;
          const rad = ring ? 0.64 : 0.2 + r() * 0.35, y = ring ? 0.1 + r() * 0.35 : 0.62 + r() * 0.18;
          P.push(Ball(0.25 + r() * 0.1, Math.sin(ang) * rad, y, Math.cos(ang) * rad - (ring ? 0.04 : 0.08)));
        }
        rig.headTop.add(merged(P, RT.plastic(COL.hair, { roughness: 0.7 })));
        // round goggles pushed up on the forehead
        const brass = RT.metal(COL.brass), gog = new THREE.Group(); gog.position.set(0, 0.37, 0.56); gog.rotation.x = -0.3; rig.headTop.add(gog);
        for (const x of [-0.22, 0.22]) {
          const rim = RT.cyl(0.18, 0.18, 0.14, brass, 20); rim.rotation.x = Math.PI / 2; rim.position.x = x; gog.add(rim);
          const lens = RT.cyl(0.13, 0.13, 0.15, RT.plastic('#8fe0ff', { roughness: 0.1, metalness: 0.2, emissive: '#1c6f8a', emissiveIntensity: 0.4 }), 20); lens.rotation.x = Math.PI / 2; lens.position.set(x, 0, 0.01); gog.add(lens);
        }
        gog.add(merged([H(0.12, 0.07, 0.08, 0, 0, 0), H(0.05, 0.08, 1.0, 0.655, -0.02, -0.5, 0, 0, 0, 0.02), H(0.05, 0.08, 1.0, -0.655, -0.02, -0.5, 0, 0, 0, 0.02)], RT.plastic('#2a1d14')));
        // tool belt on the lower torso
        const belt = RT.atlasBox(d.lw + 0.12, 0.26, d.ld + 0.12, (g, cells) => { for (const k in cells) { D.rect(g, cells[k], 0, 0, 1, 1, COL.leather); D.stitch(g, cells[k], 0, 0.2, 1, 0.2); D.stitch(g, cells[k], 0, 0.8, 1, 0.8); } D.rect(g, cells.front, 0.44, 0.1, 0.56, 0.9, COL.brass); }, { pps: 80, round: 0.06 });
        belt.position.y = d.lh * 0.6; rig.hips.add(belt);
        const pouches = merged([H(0.36, 0.42, 0.22, 0.6, d.lh * 0.48, d.ld / 2 + 0.12), H(0.3, 0.36, 0.2, -0.62, d.lh * 0.5, d.ld / 2 + 0.11), H(0.22, 0.4, 0.4, -d.lw / 2 - 0.12, d.lh * 0.46, 0.1)], RT.plastic(RT.shade(COL.leather, 0.1)));
        rig.hips.add(pouches);
        const wrench = merged([H(0.08, 0.5, 0.06, 0.18, d.lh * 0.3, d.ld / 2 + 0.1, 0, 0, 0.15, 0.02), H(0.2, 0.12, 0.07, 0.22, d.lh * 0.08, d.ld / 2 + 0.1, 0, 0, 0.15, 0.03)], RT.metal('#a9adb3'));
        rig.hips.add(wrench);
        // scrap backpack with an antenna and a coil of wire
        const pack = RT.atlasBox(1.5, 1.35, 0.55, (g, cells) => {
          for (const k in cells) { D.rect(g, cells[k], 0, 0, 1, 1, COL.pack); D.bevel(g, cells[k], 0.12); }
          const b = cells.back; D.rect(g, b, 0, 0, 1, 0.34, RT.shade(COL.pack, -0.2)); D.rect(g, b, 0.3, 0.28, 0.4, 0.44, COL.brass); D.rect(g, b, 0.6, 0.28, 0.7, 0.44, COL.brass);
          D.rect(g, b, 0.12, 0.55, 0.42, 0.85, '#c97b3a'); D.stitch(g, b, 0.14, 0.57, 0.4, 0.57); D.circle(g, b, 0.72, 0.7, 10, '#e0e0e0'); D.circle(g, b, 0.72, 0.7, 5, '#c0392b');
        }, { pps: 90, round: 0.12 });
        pack.position.set(0, d.uh * 0.52, -(d.ud / 2 + 0.29)); rig.waist.add(pack);
        rig.waist.add(merged([H(0.16, 0.06, 1.08, 0.6, d.uh + 0.01, 0.0, 0, 0, 0, 0.025), H(0.16, 0.06, 1.08, -0.6, d.uh + 0.01, 0.0, 0, 0, 0, 0.025),
          H(0.16, 0.42, 0.05, 0.6, d.uh - 0.22, d.ud / 2 + 0.02, 0, 0, 0, 0.02), H(0.16, 0.42, 0.05, -0.6, d.uh - 0.22, d.ud / 2 + 0.02, 0, 0, 0, 0.02)], RT.plastic('#3a3a3a')));
        const antenna = new THREE.Group(); antenna.position.set(0.5, d.uh * 0.52 + 0.68, -(d.ud / 2 + 0.33)); rig.waist.add(antenna);
        antenna.add(merged([{ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), matrix: RT.mat4(0, 0.45, 0) }], RT.metal('#9aa0a6')));
        const tip = RT.ball(0.08, RT.plastic('#ff3b3b', { emissive: '#ff2020', emissiveIntensity: 0.6 })); tip.position.y = 0.92; antenna.add(tip);
        const coil = RT.mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 18), RT.metal(COL.brass)); coil.rotation.y = Math.PI / 2; coil.position.set(-0.8, d.uh * 0.45, -(d.ud / 2 + 0.3)); rig.waist.add(coil);
        rig.sway.push((t) => { antenna.rotation.z = Math.sin(t * 3.1) * 0.06; antenna.rotation.x = Math.sin(t * 2.3 + 1) * 0.05; });
      },
    });
  }

  // ---------- 4. DAX MORROW (17, rival, wealthy Sector 1) ----------
  function dax(o = {}) {
    const COL = { skin: '#f2c9a5', hair: '#f0be2e', under: '#4a1316', red: '#c0262f', gold: '#e8b83e', pants: '#2b2a31', boots: '#1c1b20' };
    const Rd = RT.shade(COL.red, -0.3);
    const crest = (g, c, x, y, r) => {      // Sector 1 crest: gold sun with eight rays (original design)
      g.fillStyle = COL.gold; const cx = c.x + c.w * x, cy = c.y + c.h * y;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.2) * r * 0.6, cy + Math.sin(a - 0.2) * r * 0.6); g.lineTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25); g.lineTo(cx + Math.cos(a + 0.2) * r * 0.6, cy + Math.sin(a + 0.2) * r * 0.6); g.fill(); }
      g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.fill(); g.fillStyle = COL.red; g.beginPath(); g.arc(cx, cy, r * 0.36, 0, Math.PI * 2); g.fill();
    };
    const plate = (g, cells, col = COL.red) => { for (const k in cells) { const c = cells[k]; D.rect(g, c, 0, 0, 1, 1, col); g.strokeStyle = COL.gold; g.lineWidth = Math.max(4, Math.min(c.w, c.h) * 0.12); g.strokeRect(c.x, c.y, c.w, c.h); D.bevel(g, c, 0.12); } };
    return buildAvatar({
      name: 'Dax', skin: COL.skin, shoes: COL.boots, hands: COL.boots, seed: 1, expression: o.expression || 'smirk',
      dims: { uw: 2.3, uh: 1.12, ud: 1.1, lw: 2.0, ld: 1.02, aw: 0.84, ad: 0.86, gw: 0.9, gd: 0.9, legX: 0.5, ul: 1.05, ll: 1.05, hand: 0.58 },
      face: faceStyle({ skin: COL.skin, iris: '#3d6fb8', brow: '#a07c2c', browW: 15 }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.under : COL.pants);
          D.rect(g, c, 0, 0, 1, 1, COL.under);
          if (f === 'front' || f === 'back') for (let k = 0; k < 3; k++) { const y = 0.55 + k * 0.105; D.rect(g, c, 0.1, y, 0.9, y + 0.09, COL.red); D.line(g, c, 0.1, y + 0.09, 0.9, y + 0.09, Rd, 2); D.circle(g, c, 0.15, y + 0.045, 3, COL.gold); D.circle(g, c, 0.85, y + 0.045, 3, COL.gold); }
          D.rect(g, c, 0, 0.88, 1, 1, '#141318');
          if (f === 'front') { D.rect(g, c, 0.42, 0.885, 0.58, 0.995, COL.gold); D.rect(g, c, 0.465, 0.915, 0.535, 0.965, COL.red); }
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.boots);
          bands(g, c, [[0.6, COL.under], [0.64, COL.gold], [0.9, COL.red], [0.94, COL.gold], [1, COL.boots]]);
          if (outer(f, info)) D.line(g, c, 0.5, 0.66, 0.5, 0.88, Rd, 3);
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.pants : COL.boots);
          bands(g, c, [[0.78, COL.pants], [0.82, COL.gold], [1, COL.boots]]);
          if (outer(f, info)) D.rect(g, c, 0.42, 0, 0.58, 0.78, COL.red);
          if (f === 'front') { D.rect(g, c, 0.18, 0.42, 0.82, 0.6, COL.red); g.strokeStyle = COL.gold; g.lineWidth = 4; g.strokeRect(c.x + c.w * 0.18, c.y + c.h * 0.42, c.w * 0.64, c.h * 0.18); }
        },
      },
      build(rig, d) {
        const hm = RT.plastic(COL.hair, { roughness: 0.32 });
        rig.headTop.add(merged([H(1.36, 0.4, 1.3, 0, 0.46, -0.03, 0, 0, 0, 0.16), H(1.36, 0.6, 0.3, 0, 0.22, -0.48, 0, 0, 0, 0.12),
          H(0.12, 0.42, 0.9, 0.69, 0.27, -0.1), H(0.12, 0.42, 0.9, -0.69, 0.27, -0.1),
          H(1.26, 0.44, 0.66, 0, 0.74, 0.26, -0.5, 0, 0, 0.2)], hm));   // the slicked-back pompadour
        // chest plate with the Sector 1 crest
        const chest = RT.atlasBox(1.95, 0.92, 0.24, (g, cells) => { plate(g, cells); crest(g, cells.front, 0.5, 0.48, cells.front.h * 0.3); }, { pps: 120, round: 0.08 });
        chest.position.set(0, d.uh * 0.56, d.ud / 2 + 0.08); rig.waist.add(chest);
        // shoulder plates (move with the arms)
        for (const [arm, s] of [[rig.armL, 1], [rig.armR, -1]]) {
          const p1 = RT.atlasBox(1.06, 0.4, 1.08, (g, cells) => plate(g, cells), { pps: 80, round: 0.13 });
          p1.position.set(s * 0.06, 0.5, 0); p1.rotation.z = s * 0.16; arm.add(p1);
          const p2 = RT.atlasBox(0.96, 0.28, 0.98, (g, cells) => plate(g, cells, RT.shade(COL.red, -0.1)), { pps: 80, round: 0.1 });
          p2.position.set(s * 0.09, 0.2, 0); p2.rotation.z = s * 0.22; arm.add(p2);
        }
      },
    });
  }

  // ---------- 5. OLD HASKIN (50s, mentor, past winner from Sector 7) ----------
  function haskin(o = {}) {
    const COL = { skin: '#d6a27c', hair: '#a8a8a3', coat: '#3a342d', shirt: '#958b78', pants: '#4a443c', boots: '#352619', flask: '#b9bcc2' };
    const Cd = RT.shade(COL.coat, -0.3), Cl = RT.shade(COL.coat, 0.18);
    const panelPaint = (g, cells) => { for (const k in cells) { const c = cells[k]; D.rect(g, c, 0, 0, 1, 1, COL.coat); D.rect(g, c, 0, 0.9, 1, 1, Cd); D.bevel(g, c, 0.12); } };
    return buildAvatar({
      name: 'Haskin', skin: COL.skin, shoes: COL.boots, seed: 50, expression: o.expression || 'neutral',
      base: { wx: 0.14, hx: -0.08, aLf: 0.08, aRf: 0.08 },        // slight hunch
      face: faceStyle({ skin: COL.skin, iris: '#7b8a5e', brow: '#8d8d88', browW: 16, bushy: true, stubble: '#5b534b', bags: true, lidBias: 0.12 }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.coat : COL.pants);
          D.rect(g, c, 0, 0, 1, 1, COL.coat);
          if (f === 'front') {
            D.rect(g, c, 0.38, 0, 0.62, 1, COL.shirt); D.poly(g, c, [[0.44, 0], [0.56, 0], [0.5, 0.08]], COL.skin);
            for (let k = 0; k < 4; k++) D.circle(g, c, 0.5, 0.16 + k * 0.2, 4, '#6d6556');
            D.poly(g, c, [[0.14, 0], [0.38, 0], [0.4, 0.42], [0.28, 0.24]], Cd); D.poly(g, c, [[0.86, 0], [0.62, 0], [0.6, 0.42], [0.72, 0.24]], Cd);
            for (let k = 0; k < 3; k++) D.circle(g, c, 0.32, 0.5 + k * 0.15, 5, '#8a7a55');
            D.rect(g, c, 0.7, 0.55, 0.9, 0.72, Cl); D.stitch(g, c, 0.71, 0.56, 0.89, 0.56); D.stitch(g, c, 0.71, 0.71, 0.89, 0.71);   // a patch
          }
          if (f === 'back') D.line(g, c, 0.5, 0.25, 0.5, 1, Cd, 3);
        },
        arm(g, f, c, info) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, Cd);
          bands(g, c, [[0.88, COL.coat], [1, Cd]]);
          if (outer(f, info)) D.rect(g, c, 0.25, 0.48, 0.75, 0.62, Cl);
        },
        leg(g, f, c, info) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.pants : COL.boots);
          bands(g, c, [[0.8, COL.pants], [1, COL.boots]]);
          if (f === 'front' && info.side === 'L') { D.rect(g, c, 0.25, 0.45, 0.75, 0.58, RT.shade(COL.pants, 0.15)); D.stitch(g, c, 0.27, 0.47, 0.73, 0.47); }
        },
      },
      build(rig, d) {
        const hm = RT.plastic(COL.hair, { roughness: 0.6 }), r = RT.rng(21);
        const P = [H(1.34, 0.3, 1.28, 0, 0.5, -0.04, 0, 0, 0, 0.13), H(1.38, 0.82, 0.3, 0, 0.05, -0.48, 0, 0, 0, 0.12),
          H(0.18, 0.56, 0.95, 0.7, 0.1, -0.1), H(0.18, 0.56, 0.95, -0.7, 0.1, -0.1)];
        for (let k = 0; k < 10; k++) {         // messy grey tufts
          const a = Math.PI * 0.35 + (k / 10) * Math.PI * 1.3;
          P.push(H(0.26, 0.18, 0.36, Math.sin(a) * 0.68, 0.25 + r() * 0.35, Math.cos(a) * 0.62 - 0.05, r() - 0.5, a, (r() - 0.5) * 1.2, 0.06));
        }
        P.push(H(0.3, 0.16, 0.3, 0.2, 0.66, 0.35, 0.4, 0.3, 0.2, 0.06), H(0.26, 0.16, 0.3, -0.25, 0.66, 0.3, 0.3, -0.4, -0.2, 0.06));
        rig.headTop.add(merged(P, hm));
        // long coat panels ("skirt" blocks) that swing with the legs
        const mk = (w, h, dd, x, z, follow) => {
          const g = new THREE.Group(); g.position.set(x, 0.05, z); rig.hips.add(g);
          const m = RT.atlasBox(w, h, dd, panelPaint, { pps: 60, round: 0.05 }); m.position.y = -h / 2; g.add(m);
          if (follow) rig.followers.push(follow(g));
          return g;
        };
        mk(0.92, 1.25, 0.12, 0.46, d.ld / 2 + 0.07, (g) => (r) => { g.rotation.x = Math.min(0, r.legL.rotation.x) * 0.9 + Math.max(0, r.legL.rotation.x) * 0.25; });
        mk(0.92, 1.25, 0.12, -0.46, d.ld / 2 + 0.07, (g) => (r) => { g.rotation.x = Math.min(0, r.legR.rotation.x) * 0.9 + Math.max(0, r.legR.rotation.x) * 0.25; });
        mk(1.95, 1.3, 0.12, 0, -(d.ld / 2 + 0.07), (g) => (r) => { g.rotation.x = Math.max(0, r.legL.rotation.x, r.legR.rotation.x) * 0.8; });
        mk(0.12, 1.2, 0.86, d.lw / 2 + 0.07, 0, null); mk(0.12, 1.2, 0.86, -(d.lw / 2 + 0.07), 0, null);
        // flask on his right hip
        const flask = new THREE.Group(); flask.position.set(-(d.lw / 2 + 0.17), d.lh * 0.25, 0.18); flask.rotation.y = -Math.PI / 2; rig.hips.add(flask);
        flask.add(merged([H(0.42, 0.56, 0.16, 0, 0, 0, 0, 0, 0, 0.07), { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), matrix: RT.mat4(0.08, 0.33, 0) }], RT.metal(COL.flask)));
        rig.props.flask = flask;
      },
    });
  }

  // ---------- 6. HIGH CHANCELLOR VIRE (villain, leader of the Crown Council) ----------
  function vire(o = {}) {
    const COL = { skin: '#f3e2d4', hair: '#f2f2ee', robe: '#f6f3ec', gold: '#d8ab3a', gold2: '#a87f22', shoes: '#efe9dc' };
    const gold = (g, c, x0, y0, x1, y1) => D.rect(g, c, x0, y0, x1, y1, COL.gold);
    const robePanel = (g, cells) => { for (const k in cells) { const c = cells[k]; D.rect(g, c, 0, 0, 1, 1, COL.robe); gold(g, c, 0, 0.9, 1, 0.96); D.line(g, c, 0, 0.87, 1, 0.87, COL.gold, 2); D.bevel(g, c, 0.08); } };
    return buildAvatar({
      name: 'Vire', skin: COL.skin, shoes: COL.shoes, seed: 99, expression: o.expression || 'smiling',
      dims: { uh: 1.26, lh: 1.14, ul: 1.2, ll: 1.2, ua: 1.14, la: 0.98, aw: 0.8, ad: 0.82 },    // tall: torso and legs × 1.2
      face: faceStyle({ skin: COL.skin, iris: '#8fb6d6', brow: '#dcdcd6', browW: 10, smile: 'closed', lidBias: 0.12, mouthW: 1.1 }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.robe);
          D.rect(g, c, 0, 0, 1, 1, COL.robe);
          if (f === 'front' || f === 'back') {
            gold(g, c, 0.44, 0, 0.56, 1);
            g.strokeStyle = COL.gold2; g.lineWidth = 3;
            for (let y = 0.06; y < 1; y += 0.08) { g.beginPath(); g.moveTo(c.x + c.w * 0.45, c.y + c.h * y); g.lineTo(c.x + c.w * 0.5, c.y + c.h * (y + 0.04)); g.lineTo(c.x + c.w * 0.55, c.y + c.h * y); g.stroke(); }
            D.line(g, c, 0.06, 0, 0.06, 1, COL.gold, 3); D.line(g, c, 0.94, 0, 0.94, 1, COL.gold, 3);
          }
          gold(g, c, 0, 0.5, 1, 0.56); D.line(g, c, 0, 0.53, 1, 0.53, COL.gold2, 2);       // gold sash
        },
        arm(g, f, c) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.gold);
          bands(g, c, [[0.84, COL.robe], [0.86, COL.gold2], [1, COL.gold]]);
        },
        leg(g, f, c) { bands(g, c, [[1, '#ece6d8']]); },
      },
      build(rig, d) {
        rig.headTop.add(merged([H(1.34, 0.36, 1.28, 0, 0.48, -0.04, 0, 0, 0, 0.15), H(1.34, 0.76, 0.28, 0, 0.15, -0.49, 0, 0, 0, 0.12),
          H(0.12, 0.44, 0.92, 0.68, 0.26, -0.1), H(0.12, 0.44, 0.92, -0.68, 0.26, -0.1),
          Wedge(1.2, 0.24, 0.98, 0, 0.74, -0.1)], RT.plastic(COL.hair, { roughness: 0.3 })));
        // high collar behind the head + side wings
        const collar = RT.atlasBox(2.35, 1.12, 0.2, (g, cells) => { for (const k in cells) { D.rect(g, cells[k], 0, 0, 1, 1, COL.robe); D.bevel(g, cells[k], 0.1); } gold(g, cells.front, 0, 0, 1, 0.12); gold(g, cells.back, 0, 0, 1, 0.12); D.line(g, cells.front, 0.06, 0.2, 0.06, 1, COL.gold, 3); D.line(g, cells.front, 0.94, 0.2, 0.94, 1, COL.gold, 3); }, { pps: 90, round: 0.07 });
        collar.position.set(0, d.uh + 0.36, -(d.ud / 2) + 0.03); collar.rotation.x = -0.2; rig.waist.add(collar);
        rig.waist.add(merged([H(0.2, 0.9, 0.62, 1.06, d.uh + 0.22, -0.16, 0, 0, -0.12, 0.06), H(0.2, 0.9, 0.62, -1.06, d.uh + 0.22, -0.16, 0, 0, 0.12, 0.06)], RT.plastic(COL.robe)));
        // gold chain with a medallion
        const links = [];
        for (let k = 0; k <= 12; k++) { const u = k / 12, x = (u - 0.5) * 1.5, y = d.uh - 0.04 - Math.sin(u * Math.PI) * d.uh * 0.5; links.push(H(0.13, 0.13, 0.07, x, y, d.ud / 2 + 0.03, 0, 0, k % 2 ? 0.6 : 0, 0.03)); }
        rig.waist.add(merged(links, RT.metal(COL.gold)));
        const emblem = RT.canvasTexture(128, 128, (g) => {
          g.fillStyle = COL.gold; g.fillRect(0, 0, 128, 128); g.strokeStyle = COL.gold2; g.lineWidth = 7;
          g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
          g.fillStyle = COL.gold2; g.beginPath(); g.moveTo(30, 78); g.lineTo(36, 44); g.lineTo(50, 62); g.lineTo(64, 36); g.lineTo(78, 62); g.lineTo(92, 44); g.lineTo(98, 78); g.closePath(); g.fill();   // crown (original)
          g.beginPath(); g.ellipse(64, 88, 22, 9, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = COL.gold; g.beginPath(); g.arc(64, 88, 5, 0, Math.PI * 2); g.fill();         // the watching eye
        });
        emblem.center.set(0.5, 0.5); emblem.rotation = Math.PI / 2;
        const med = RT.mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 24), [RT.metal(COL.gold), RT.metal('#ffffff', { map: emblem, metalness: 0.6 }), RT.metal(COL.gold)]);
        med.rotation.x = Math.PI / 2; med.position.set(0, d.uh * 0.47, d.ud / 2 + 0.07); rig.waist.add(med);
        // long robe panels to the ankles (they swing a little with the legs)
        const L = d.ul + d.ll - 0.22, mk = (w, dd, x, z, follow) => {
          const g = new THREE.Group(); g.position.set(x, 0.05, z); rig.hips.add(g);
          const m = RT.atlasBox(w, L, dd, robePanel, { pps: 55, round: 0.05 }); m.position.y = -L / 2; g.add(m);
          if (follow) rig.followers.push(follow(g));
        };
        mk(0.95, 0.12, 0.47, d.ld / 2 + 0.08, (g) => (r) => { g.rotation.x = Math.min(0, r.legL.rotation.x) * 0.95 + Math.max(0, r.legL.rotation.x) * 0.2; });
        mk(0.95, 0.12, -0.47, d.ld / 2 + 0.08, (g) => (r) => { g.rotation.x = Math.min(0, r.legR.rotation.x) * 0.95 + Math.max(0, r.legR.rotation.x) * 0.2; });
        mk(1.98, 0.12, 0, -(d.ld / 2 + 0.08), (g) => (r) => { g.rotation.x = Math.max(0, r.legL.rotation.x, r.legR.rotation.x) * 0.85; });
        mk(0.12, 0.9, d.lw / 2 + 0.08, 0, null); mk(0.12, 0.9, -(d.lw / 2 + 0.08), 0, null);
      },
    });
  }

  // ---------- 7. COUNCIL GUARD (white armor, black visor, helmet) ----------
  function guard(o = {}) {
    const COL = { armor: '#eef1f5', seam: '#c4cad3', under: '#1c1e24', visor: '#0b0c10', gold: '#d8ab3a' };
    return buildAvatar({
      name: 'Guard', skin: '#d9b08c', shoes: COL.under, hands: COL.under, seed: 200 + (o.seed || 0), expression: 'neutral',
      dims: { uw: 2.08, ud: 1.05 },
      face: faceStyle({ skin: '#d9b08c' }),
      clothes: {
        torso(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.armor : COL.under);
          D.rect(g, c, 0, 0, 1, 1, COL.under);
          D.rect(g, c, 0.03, 0, 0.97, 0.52, COL.armor);
          if (f === 'front') { D.line(g, c, 0.5, 0.06, 0.5, 0.5, COL.seam, 3); D.line(g, c, 0.1, 0.3, 0.9, 0.3, COL.seam, 2); D.circle(g, c, 0.5, 0.17, 9, COL.gold); }
          for (let k = 0; k < 3; k++) { const y = 0.56 + k * 0.1; D.rect(g, c, 0.06, y, 0.94, y + 0.08, COL.armor); }
          D.rect(g, c, 0, 0.88, 1, 1, COL.under); if (f === 'front') D.rect(g, c, 0.44, 0.9, 0.56, 0.98, COL.armor);
        },
        arm(g, f, c) {
          if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, COL.under);
          bands(g, c, [[0.44, COL.armor], [0.56, COL.under], [0.9, COL.armor], [1, COL.under]]);
          D.line(g, c, 0, 0.7, 1, 0.7, COL.seam, 2);
        },
        leg(g, f, c) {
          if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? COL.armor : COL.under);
          bands(g, c, [[0.44, COL.armor], [0.54, COL.under], [0.86, COL.armor], [1, COL.under]]);
          if (f === 'front') D.line(g, c, 0.5, 0.58, 0.5, 0.82, COL.seam, 3);
        },
      },
      build(rig) {
        rig.head.visible = false;                          // the helmet covers the whole head
        const helm = RT.mesh(RT.roundedBoxGeometry(1.42, 1.3, 1.36, 0.3, 4), RT.plastic(COL.armor, { roughness: 0.3 }));
        helm.position.set(0, 0.06, -0.02); rig.headTop.add(helm);
        const visor = RT.atlasBox(1.14, 0.52, 0.14, (g, cells) => {
          for (const k in cells) D.rect(g, cells[k], 0, 0, 1, 1, COL.visor);
          const c = cells.front; g.fillStyle = 'rgba(160,190,230,0.22)';
          g.beginPath(); g.moveTo(c.x + c.w * 0.12, c.y + c.h); g.lineTo(c.x + c.w * 0.3, c.y); g.lineTo(c.x + c.w * 0.4, c.y); g.lineTo(c.x + c.w * 0.22, c.y + c.h); g.fill();
          g.beginPath(); g.moveTo(c.x + c.w * 0.3, c.y + c.h); g.lineTo(c.x + c.w * 0.45, c.y); g.lineTo(c.x + c.w * 0.49, c.y); g.lineTo(c.x + c.w * 0.34, c.y + c.h); g.fill();
        }, { pps: 160, round: 0.06, mat: { roughness: 0.12, metalness: 0.5 } });
        visor.position.set(0, 0.0, 0.64); rig.headTop.add(visor);
        rig.headTop.add(merged([H(0.16, 0.24, 1.24, 0, 0.72, -0.02, 0, 0, 0, 0.06)], RT.plastic(COL.seam)));
        rig.headTop.add(merged([H(0.2, 0.2, 0.06, 0, 0.44, 0.68, 0, 0, Math.PI / 4, 0.03)], RT.metal(COL.gold)));
        for (const [arm, s] of [[rig.armL, 1], [rig.armR, -1]]) { const p = merged([H(0.96, 0.34, 0.98, s * 0.06, 0.48, 0, 0, 0, s * 0.18, 0.12)], RT.plastic(COL.armor, { roughness: 0.3 })); arm.add(p); }
      },
    });
  }

  // =================================================================================
  // CROWDS AND TRIBUTES: randomized citizens (seeded, so the same seed always gives the same person)
  // =================================================================================
  const SKINS = ['#f6d7bd', '#eec4a0', '#e0b089', '#c99a72', '#ad7a52', '#8c5a37', '#6f4529', '#57351f'];
  const HAIRS = ['#241710', '#3b2416', '#5a3825', '#1a1414', '#8a5a2b', '#b98b4a', '#d9c07a', '#9a9a96', '#c4c4c0', '#6b2f1a'];
  const IRIS = ['#4b2e1a', '#2e1a0e', '#5b3a1f', '#3d6fb8', '#5f7a3a', '#6b4423'];
  RT.PALETTES = {
    halcyon: { shirts: ['#e8574a', '#f2a541', '#4aa3d8', '#6cc4a1', '#f5f0e6', '#d96fa6', '#3b5ba5', '#ffd166'], pants: ['#2f3b52', '#5b6b7f', '#e9e1cf', '#3d3d3d', '#7a5c3e'], shoes: ['#f2f2f2', '#2b2b2b', '#8a5a34', '#c23b3b'] },
    sector7: { shirts: ['#8a6a48', '#6f7d4a', '#a3553f', '#5d6f80', '#b08a4a', '#7a5a6e', '#4f6b55', '#c2a878', '#8c4b3a', '#9b8c6e', '#5a6b3b', '#a07850'],
      pants: ['#3b3a36', '#4a4038', '#36404a', '#5a4a3a', '#2f3a2f', '#4d463e', '#5c5248'], shoes: ['#2a1d14', '#3d3029', '#4a3020', '#1f1f1f'] },
    capital: { shirts: ['#ff4fa3', '#7b4bff', '#00c2d1', '#ffd23f', '#ff7b2e', '#3ee07c', '#ff5e5e', '#ffffff', '#c86bff', '#4fd6ff'],
      pants: ['#ffffff', '#2b2b3a', '#ff9ad5', '#6ad3ff', '#f3e9ff', '#1d1d2b'], shoes: ['#ffffff', '#ffd23f', '#1d1d2b', '#ff4fa3'] },
  };
  // tribute uniforms: one color per Sector (1 … 8)
  RT.SECTOR_COLORS = { 1: '#c0262f', 2: '#2f6fe0', 3: '#7b8088', 4: '#1fa59a', 5: '#ef7d22', 6: '#7b4bc4', 7: '#6b4a2f', 8: '#2b2b2b' };

  function genericClothes(o) {
    const S = o.shirt, Sd = RT.shade(S, -0.22), P = o.pants;
    return {
      torso(g, f, c) {
        if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? S : P);
        D.rect(g, c, 0, 0, 1, 1, S);
        if (o.top === 'vest') { D.rect(g, c, 0, 0, 0.36, 0.9, o.vest); D.rect(g, c, 0.64, 0, 1, 0.9, o.vest); if (f !== 'front') D.rect(g, c, 0, 0, 1, 0.9, o.vest); }
        if (o.top === 'overalls') { if (f === 'front') { D.rect(g, c, 0.22, 0.3, 0.78, 1, P); D.poly(g, c, [[0.12, 0], [0.24, 0], [0.32, 0.31], [0.22, 0.31]], P); D.poly(g, c, [[0.88, 0], [0.76, 0], [0.68, 0.31], [0.78, 0.31]], P); } D.rect(g, c, 0, 0.6, 1, 1, P); }
        if (o.top === 'sweater') { for (let y = 0.05; y < 0.85; y += 0.05) D.line(g, c, 0, y, 1, y, 'rgba(0,0,0,0.07)', 1.5); D.rect(g, c, 0, 0.86, 1, 1, Sd); }
        if (f === 'front') {
          if (o.top === 'shirt' || o.top === 'vest') { D.poly(g, c, [[0.36, 0], [0.5, 0.08], [0.64, 0], [0.62, 0.05], [0.5, 0.13], [0.38, 0.05]], RT.shade(S, 0.2)); for (let k = 0; k < 4; k++) D.circle(g, c, 0.5, 0.2 + k * 0.17, 3.5, Sd); }
          else D.poly(g, c, [[0.4, 0], [0.6, 0], [0.5, 0.07]], o.skin);
        }
        if (o.top !== 'overalls' && o.top !== 'sweater') { D.rect(g, c, 0, 0.88, 1, 1, o.belt); if (f === 'front') D.rect(g, c, 0.45, 0.9, 0.55, 0.98, '#c9a66b'); }
        if (o.number && f === 'back') { g.fillStyle = '#ffffff'; g.font = `900 ${c.h * 0.32}px Montserrat, Arial Black, sans-serif`; g.textAlign = 'center'; g.fillText(String(o.number), c.x + c.w / 2, c.y + c.h * 0.5); }
      },
      arm(g, f, c) {
        if (f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, o.skin);
        const sleeve = o.top === 'tee' ? 0.36 : o.rolled ? 0.6 : 0.9;
        bands(g, c, [[sleeve, o.top === 'vest' ? S : S], [sleeve + 0.03, Sd], [1, o.skin]]);
      },
      leg(g, f, c) {
        if (f === 'top' || f === 'bottom') return D.rect(g, c, 0, 0, 1, 1, f === 'top' ? P : o.shoes);
        bands(g, c, [[0.84, P], [1, o.shoes]]);
        if (f === 'front' && o.patch) D.rect(g, c, 0.25, 0.48, 0.7, 0.6, RT.shade(P, 0.2));
      },
    };
  }
  const HAIRSTYLES = ['short', 'long', 'bun', 'ponytail', 'spiky', 'bald', 'curly', 'straw', 'cap', 'beanie'];
  function hairStyle(style, color, r) {
    const P = [];
    const cap = () => P.push(H(1.37, 0.4, 1.31, 0, 0.45, -0.02, 0, 0, 0, 0.16));
    switch (style) {
      case 'short': cap(); P.push(H(1.36, 0.6, 0.3, 0, 0.2, -0.47)); break;
      case 'long': cap(); P.push(H(1.38, 1.35, 0.34, 0, -0.15, -0.47), H(0.18, 1.1, 0.9, 0.7, -0.05, -0.1), H(0.18, 1.1, 0.9, -0.7, -0.05, -0.1)); break;
      case 'bun': cap(); P.push(H(1.36, 0.7, 0.3, 0, 0.15, -0.47), Ball(0.32, 0, 0.62, -0.62)); break;
      case 'ponytail': cap(); P.push(H(1.36, 0.7, 0.3, 0, 0.15, -0.47), H(0.3, 1.0, 0.3, 0, -0.2, -0.78, 0.2, 0, 0, 0.1)); break;
      case 'spiky': cap(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; P.push(Cone(0.16, 0.48, Math.sin(a) * 0.4, 0.66, Math.cos(a) * 0.38, Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7)); } break;
      case 'curly': for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 * 1.5; P.push(Ball(0.28, Math.sin(a) * (0.25 + (k % 3) * 0.17), 0.5 + (k % 2) * 0.15, Math.cos(a) * (0.25 + (k % 3) * 0.17) - 0.1)); } break;
      case 'straw': return { pieces: [{ geo: new THREE.CylinderGeometry(1.15, 1.2, 0.07, 24), matrix: RT.mat4(0, 0.52, 0) }, { geo: new THREE.CylinderGeometry(0.62, 0.7, 0.42, 20), matrix: RT.mat4(0, 0.74, 0) }], color: '#d9b35c', band: true };
      case 'cap': return { pieces: [H(1.36, 0.42, 1.32, 0, 0.5, 0, 0, 0, 0, 0.18), H(1.1, 0.07, 0.6, 0, 0.36, 0.82, -0.08, 0, 0, 0.03)], color: null };
      case 'beanie': return { pieces: [H(1.4, 0.55, 1.34, 0, 0.5, 0, 0, 0, 0, 0.22), Ball(0.16, 0, 0.84, 0)], color: null };
      default: return { pieces: [], color };   // bald
    }
    return { pieces: P, color };
  }

  // A random citizen. o: { palette: 'sector7' | 'capital', kid: true/false, expression, scale }
  function citizen(seed = 1, o = {}) {
    const r = RT.rng(seed * 7919 + 13), pick = (a) => a[Math.floor(r() * a.length)];
    const pal = RT.PALETTES[o.palette || 'sector7'];
    const skin = o.skin || pick(SKINS), hair = pick(HAIRS), shirt = o.shirt || pick(pal.shirts), pants = o.pants || pick(pal.pants), shoes = pick(pal.shoes);
    const kid = o.kid ?? r() < 0.18, style = o.hair || pick(HAIRSTYLES);
    const top = o.top || pick(['shirt', 'tee', 'vest', 'overalls', 'sweater']);
    const hatColor = pick(['#a3553f', '#4f6b55', '#5d6f80', '#c2a878', '#7a5a6e', '#2f3a2f']);
    return buildAvatar({
      name: 'Citizen' + seed, scale: o.scale || (kid ? 0.75 : 0.95 + r() * 0.1), skin, shoes, seed: seed + 300, expression: o.expression || 'neutral',
      face: faceStyle({ skin, iris: pick(IRIS), brow: RT.shade(hair, -0.2), browW: 10 + r() * 5, lashes: r() < 0.5, freckles: r() < 0.12, stubble: !kid && r() < 0.18 ? '#4b433d' : null, eyeSize: kid ? 1.1 : 0.95 + r() * 0.1 }),
      clothes: genericClothes({ top, shirt, pants, shoes, skin, vest: RT.shade(pick(pal.shirts), -0.25), belt: '#2a1d14', rolled: r() < 0.3, patch: r() < 0.25, number: o.number }),
      build(rig) {
        const h = hairStyle(style, hair, r);
        if (h.pieces.length) rig.headTop.add(merged(h.pieces, RT.plastic(h.color || hatColor, { roughness: 0.55 })));
        if (h.band) rig.headTop.add(merged([{ geo: new THREE.CylinderGeometry(0.71, 0.71, 0.12, 20), matrix: RT.mat4(0, 0.6, 0) }], RT.plastic('#8a3b22')));
      },
    });
  }
  // A tribute in their Sector's uniform, with the Sector number on the back.
  function tribute(sector = 5, seed = 1, o = {}) {
    const col = RT.SECTOR_COLORS[sector] || '#555555';
    return citizen(seed + sector * 101, Object.assign({ shirt: col, pants: RT.shade(col, -0.45), top: 'tee', kid: false, number: sector, hair: o.hair }, o));
  }

  // =================================================================================
  // INSTANCED CROWD: hundreds of people for ~18 draw calls (for the Choosing, the Capital, …)
  //   const crowd = RT.characters.crowd({ count: 200, seed: 4, spots: [[x, z, yaw], …] });   scene.add(crowd);
  //   every frame: crowd.update(t, { lookAt: new THREE.Vector3(0, 2, -10), cheer: 0..1 });
  // =================================================================================
  function crowd(o = {}) {
    const N = o.count || (o.spots ? o.spots.length : 60), r = RT.rng((o.seed || 1) * 131 + 7), pick = (a) => a[Math.floor(r() * a.length)];
    const pal = RT.PALETTES[o.palette || 'sector7'], d = DIMS, U = RT.STUD;
    const group = new THREE.Group(); group.name = 'crowd';
    const people = [];
    for (let i = 0; i < N; i++) {
      let x, z, yaw;
      if (o.spots) [x, z, yaw] = o.spots[i];
      else { const a = o.area || { x0: -10, x1: 10, z0: -10, z1: 10 }; x = RT.lerp(a.x0, a.x1, r()); z = RT.lerp(a.z0, a.z1, r()); yaw = o.yaw ?? 0; }
      const kid = r() < (o.kidRatio ?? 0.15);
      people.push({ x, z, yaw: yaw + (r() - 0.5) * 0.3, s: (kid ? 0.75 : 0.95 + r() * 0.1) * U, phase: r() * 10, look: (r() - 0.5) * 0.6,
        skin: pick(SKINS), shirt: pick(pal.shirts), pants: pick(pal.pants), shoes: pick(pal.shoes), hair: pick(HAIRS),
        style: pick(['short', 'long', 'bun', 'spiky', 'bald', 'straw', 'cap', 'short', 'long']), face: pick(o.faces || ['neutral', 'worried', 'neutral', 'scared']) });
    }
    const shirtTex = RT.canvasTexture(64, 64, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 54, 64, 10); g.fillRect(28, 0, 8, 6); });
    const mk = (geo, mat, list) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.castShadow = true; m.receiveShadow = true; m.count = list.length; m.frustumCulled = false; group.add(m); return m; };
    const torsoGeo = RT.mergeGeometries([{ geo: RT.roundedBoxGeometry(d.uw, d.uh, d.ud, 0.13, 2), matrix: RT.mat4(0, d.lh + d.uh / 2, 0) }, { geo: RT.roundedBoxGeometry(d.lw, d.lh, d.ld, 0.1, 2), matrix: RT.mat4(0, d.lh / 2, 0) }]);
    const legGeo = RT.mergeGeometries([-1, 1].map((s) => ({ geo: RT.roundedBoxGeometry(d.gw, d.ul + d.ll - 0.02, d.gd, 0.09, 2), matrix: RT.mat4(s * d.legX, -(d.ul + d.ll) / 2, 0) })));
    const shoeGeo = RT.mergeGeometries([-1, 1].map((s) => ({ geo: footGeometry(), matrix: RT.mat4(s * d.legX, -(d.ul + d.ll), 0.13, 0, 0, 0, d.shoe * 0.98, d.shoe * 0.9, d.shoe * 1.24) })));
    const armGeo = RT.roundedBoxGeometry(d.aw, d.ua + d.la, d.ad, 0.1, 2); armGeo.translate(0, 0.42 - (d.ua + d.la) / 2, 0);
    const handGeoL = handGeometry(1, d.hand).clone(), handGeoR = handGeometry(-1, d.hand).clone();
    handGeoL.translate(0, 0.42 - (d.ua + d.la), 0); handGeoR.translate(0, 0.42 - (d.ua + d.la), 0);
    const headGeo = RT.roundedBoxGeometry(d.hw, d.hh, d.hd, d.hr, 3); headGeo.translate(0, d.hh / 2 + 0.03, 0);
    const faceGeo = new THREE.PlaneGeometry(d.hw - 0.06, d.hh - 0.06); faceGeo.translate(0, d.hh / 2 + 0.03, d.hd / 2 + 0.012);
    const white = (o2) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.45 }, o2));
    const parts = {
      torso: mk(torsoGeo, white({ map: shirtTex }), people), legs: mk(legGeo, white(), people), shoes: mk(shoeGeo, white(), people),
      armL: mk(armGeo, white(), people), armR: mk(armGeo, white(), people), handL: mk(handGeoL, white(), people), handR: mk(handGeoR, white(), people),
      head: mk(headGeo, white(), people),
    };
    const crowdFace = faceStyle({ transparent: true, noLids: true, noTears: true, iris: '#3b2416', brow: '#2a1d14', browW: 11 });
    const faceKinds = [...new Set(people.map((p) => p.face))], faces = {};
    for (const k of faceKinds) { const list = people.filter((p) => p.face === k); faces[k] = { mesh: mk(faceGeo, new THREE.MeshStandardMaterial({ map: faceTexture(crowdFace, k, false, false, CROWD_EXPR), transparent: true, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2 }), list), list }; faces[k].mesh.castShadow = false; }
    const hairs = {};
    for (const p of people) { if (!hairs[p.style]) hairs[p.style] = []; hairs[p.style].push(p); }
    for (const k in hairs) {
      const h = hairStyle(k, '#ffffff', r);
      if (!h.pieces.length) { delete hairs[k]; continue; }
      const geo = RT.mergeGeometries(h.pieces); geo.translate(0, d.hh / 2 + 0.03, 0);
      const list = hairs[k]; hairs[k] = { mesh: mk(geo, white({ roughness: 0.55 }), list), list, fixed: h.color && k === 'straw' ? h.color : null };
    }
    // colors (set once)
    const col = new THREE.Color();
    people.forEach((p, i) => {
      parts.torso.setColorAt(i, col.set(p.shirt)); parts.armL.setColorAt(i, col); parts.armR.setColorAt(i, col);
      parts.legs.setColorAt(i, col.set(p.pants)); parts.shoes.setColorAt(i, col.set(p.shoes));
      parts.handL.setColorAt(i, col.set(p.skin)); parts.handR.setColorAt(i, col); parts.head.setColorAt(i, col);
    });
    for (const k in hairs) hairs[k].list.forEach((p, i) => hairs[k].mesh.setColorAt(i, col.set(hairs[k].fixed || (k === 'cap' ? p.shirt : p.hair))));
    group.traverse((m) => { if (m.isInstancedMesh && m.instanceColor) m.instanceColor.needsUpdate = true; });

    const M = new THREE.Matrix4(), B = new THREE.Matrix4(), J = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    group.update = function (t, opt = {}) {
      const cheer = opt.cheer || 0;
      people.forEach((p, i) => {
        const ph = t * 1.6 + p.phase, bob = Math.sin(ph * 1.3) * 0.025 + cheer * Math.max(0, Math.sin(t * 7 + p.phase * 3)) * 0.35;
        // body
        q.setFromEuler(e.set(0, p.yaw, 0)); B.compose(v.set(p.x, 0, p.z), q, sc.setScalar(p.s));
        M.copy(B).multiply(J.makeTranslation(0, d.ul + d.ll, 0)); parts.legs.setMatrixAt(i, M); parts.shoes.setMatrixAt(i, M);
        M.copy(B).multiply(J.makeTranslation(0, d.ul + d.ll + bob, 0)); parts.torso.setMatrixAt(i, M);
        const top = d.ul + d.ll + d.lh + bob;
        for (const [arm, hand, s] of [[parts.armL, parts.handL, 1], [parts.armR, parts.handR, -1]]) {
          const up = cheer * (2.6 + Math.sin(t * 6 + p.phase + s) * 0.3);
          q.setFromEuler(e.set(-(Math.sin(ph + s) * 0.04 + up), 0, s * (0.1 + cheer * 0.25), 'XZY'));
          M.copy(B).multiply(J.makeTranslation(s * (d.uw / 2 + d.aw / 2 + 0.03), top + d.uh - 0.42, 0)).multiply(J.makeRotationFromQuaternion(q));
          arm.setMatrixAt(i, M); hand.setMatrixAt(i, M);
        }
        // head looks toward opt.lookAt (if given) plus a little personal variation
        let yaw = p.look * 0.5 + Math.sin(t * 0.4 + p.phase) * 0.15;
        if (opt.lookAt) { tmp.set(opt.lookAt.x - p.x, 0, opt.lookAt.z - p.z); yaw = RT.clamp(Math.atan2(tmp.x, tmp.z) - p.yaw, -0.9, 0.9) + p.look * 0.2; }
        q.setFromEuler(e.set(-0.05 + Math.sin(ph * 0.7) * 0.03, yaw, 0, 'YXZ'));
        M.copy(B).multiply(J.makeTranslation(0, top + d.uh, 0)).multiply(J.makeRotationFromQuaternion(q));
        parts.head.setMatrixAt(i, M); p._head = p._head || new THREE.Matrix4(); p._head.copy(M);
      });
      for (const k in faces) faces[k].list.forEach((p, i) => faces[k].mesh.setMatrixAt(i, p._head));
      for (const k in hairs) hairs[k].list.forEach((p, i) => hairs[k].mesh.setMatrixAt(i, p._head));
      group.traverse((m) => { if (m.isInstancedMesh) m.instanceMatrix.needsUpdate = true; });
    };
    group.people = people;
    group.update(0);
    return group;
  }

  RT.characters = {
    rhea, pip, juno, dax, haskin, vire, guard, citizen, tribute, crowd,
    cast: ['rhea', 'pip', 'juno', 'dax', 'haskin', 'vire', 'guard'],
    build: buildAvatar, faceStyle, faceTexture, DIMS, EXPR, CROWD_EXPR,
    helpers: { D, H, Cone, Ball, Wedge, merged, bands, outer, inner, partBox, handGeometry, footGeometry, hairStyle, SKINS, HAIRS },
  };
})();
