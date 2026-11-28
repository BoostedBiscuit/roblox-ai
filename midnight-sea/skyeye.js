// =====================================================================================
// skyeye.js: THE EYE in the sky over Hollow Bay (instead of a moon). A realistic eye in a stylized world:
// veined sclera with shading and lid shadows, a detailed iris (fibres, crypts, collarette, limbal ring),
// a wet cornea highlight that stays put while the eye turns, skin eyelids with thickness and lashes,
// and a fleshy socket that fades into the black sky. Pure function of t (deterministic).
//
//   const eye = RT.skyEye.create(group, env, { radius: 105, distance: 900, dir: [-0.16, 0.2, 1] });
//   every frame (after the camera is placed):  eye.place(camera);  eye.set(open 0..1, lookAtVector3, t);
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT, clamp = RT.clamp;

  const EYE_VS = `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const EYE_FS = `
  uniform sampler2D map; uniform vec3 uCenter; uniform vec3 uNU; uniform vec3 uNL; uniform float uR;
  varying vec3 vW; varying vec2 vUv;
  void main(){
    vec3 p = normalize(vW - uCenter), V = normalize(cameraPosition - vW);
    vec3 c = texture2D(map, vUv).rgb;
    float ndv = max(dot(p, V), 0.0);
    c *= 0.38 + 0.62 * pow(ndv, 0.55);                                  // rounder toward the edges
    float su = dot(p, uNU), sl = dot(p, uNL);                            // < 0 where the lids do not cover
    c *= mix(0.35, 1.0, smoothstep(-0.0, -0.32, su));                    // the upper lid casts a soft shadow
    c *= mix(0.6, 1.0, smoothstep(-0.0, -0.18, sl));
    gl_FragColor = vec4(c, 1.0);
  }`;
  const SKIN_VS = `varying vec3 vN; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const SKIN_FS = `
  uniform sampler2D map; uniform vec3 uLight; uniform float uAmb; uniform float uAlphaMap;
  varying vec3 vN; varying vec2 vUv; varying vec3 vW;
  void main(){
    vec4 t = texture2D(map, vUv);
    vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
    float d = max(dot(N, uLight), 0.0), rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 c = t.rgb * (uAmb + (1.0 - uAmb) * d) + vec3(0.5, 0.08, 0.05) * rim * 0.35;
    c += vec3(1.0, 0.9, 0.85) * pow(max(dot(reflect(-uLight, N), V), 0.0), 24.0) * 0.12;   // a little sheen on the skin
    gl_FragColor = vec4(c, uAlphaMap > 0.5 ? t.a : 1.0);
  }`;

  function create(parent, env, o = {}) {
    const R = o.radius || 105, DIST = o.distance || 900, rnd = RT.rng(o.seed || 77);
    const dir = new THREE.Vector3(...(o.dir || [-0.16, 0.2, 1])).normalize();
    const root = new THREE.Group(); root.name = 'SkyEye'; parent.add(root);

    // ---------- textures ----------
    // sclera + iris in one equirect map: the iris sits at +z of the sphere (u = 0.25, v = 0.5)
    const W = 2048, H = 1024, CX = 512, CY = 512, PXR = W / (Math.PI * 2);
    const IRIS = 0.42 * PXR, PUPIL = 0.15 * PXR;
    const eyeTex = RT.canvasTexture(W, H, (g) => {
      const base = g.createRadialGradient(CX, CY, IRIS, CX, CY, 1.5 * PXR);
      base.addColorStop(0, '#efe3dc'); base.addColorStop(0.55, '#e2c8be'); base.addColorStop(1, '#b98a80');
      g.fillStyle = '#b98a80'; g.fillRect(0, 0, W, H); g.fillStyle = base; g.fillRect(0, 0, 1100, H);
      for (let i = 0; i < 260; i++) { const x = CX + (rnd() - 0.5) * 900, y = CY + (rnd() - 0.5) * 700; g.fillStyle = `rgba(${170 + rnd() * 50 | 0},${90 + rnd() * 40 | 0},${70 + rnd() * 30 | 0},0.05)`; g.beginPath(); g.ellipse(x, y, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, 6.3); g.fill(); }
      // veins: from the corners toward the iris, branching and thinning
      const vein = (x, y, a, w, n, alpha) => {
        for (let s = 0; s < n && w > 0.35; s++) {
          const len = 9 + rnd() * 16, nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
          g.strokeStyle = `rgba(${150 + rnd() * 50 | 0},${12 + rnd() * 22 | 0},${18 + rnd() * 16 | 0},${alpha})`; g.lineWidth = w;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + nx) / 2 + (rnd() - 0.5) * 6, (y + ny) / 2 + (rnd() - 0.5) * 6, nx, ny); g.stroke();
          x = nx; y = ny; a += (rnd() - 0.5) * 0.7; w *= 0.93;
          if (rnd() < 0.16) vein(x, y, a + (rnd() < 0.5 ? 0.8 : -0.8), w * 0.7, n - s - 2, alpha * 0.9);
          if (Math.hypot(x - CX, y - CY) < IRIS + 6) break;
        }
      };
      for (let k = 0; k < 110; k++) {
        const side = rnd() < 0.5 ? -1 : 1, ang = (side < 0 ? Math.PI : 0) + (rnd() - 0.5) * 1.4;
        const d = (1.05 + rnd() * 0.4) * PXR, x = CX + Math.cos(ang) * d, y = CY + Math.sin(ang) * d * 0.8;
        vein(x, y, Math.atan2(CY - y, CX - x) + (rnd() - 0.5) * 0.5, 2.2 + rnd() * 3.2, 40, 0.35 + rnd() * 0.45);
      }
      for (let k = 0; k < 220; k++) { const ang = rnd() * 6.28, d = IRIS + 20 + rnd() * 0.9 * PXR; vein(CX + Math.cos(ang) * d, CY + Math.sin(ang) * d, rnd() * 6.28, 0.7 + rnd() * 1.0, 12, 0.25 + rnd() * 0.3); }
      // iris: dark limbal ring → mottled stroma with radial fibres and crypts → collarette → pupil
      const ir = g.createRadialGradient(CX, CY, PUPIL, CX, CY, IRIS);
      ir.addColorStop(0, '#c8582c'); ir.addColorStop(0.3, '#a8341a'); ir.addColorStop(0.7, '#6a1410'); ir.addColorStop(0.92, '#3a0707'); ir.addColorStop(1, '#170202');
      g.fillStyle = ir; g.beginPath(); g.arc(CX, CY, IRIS, 0, 6.3); g.fill();
      for (let k = 0; k < 1400; k++) {
        const a = rnd() * 6.28, r0 = PUPIL * (1 + rnd() * 0.2), r1 = IRIS * (0.55 + rnd() * 0.42), wob = (rnd() - 0.5) * 0.06;
        g.strokeStyle = rnd() < 0.55 ? `rgba(255,${150 + rnd() * 70 | 0},${110 + rnd() * 50 | 0},${0.06 + rnd() * 0.12})` : `rgba(20,0,0,${0.08 + rnd() * 0.16})`;
        g.lineWidth = 0.8 + rnd() * 1.6; g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
        g.quadraticCurveTo(CX + Math.cos(a + wob) * (r0 + r1) / 2, CY + Math.sin(a + wob) * (r0 + r1) / 2, CX + Math.cos(a + wob * 2) * r1, CY + Math.sin(a + wob * 2) * r1); g.stroke();
      }
      for (let k = 0; k < 46; k++) { const a = rnd() * 6.28, d = IRIS * (0.45 + rnd() * 0.35); g.fillStyle = `rgba(18,0,0,${0.35 + rnd() * 0.3})`; g.beginPath(); g.ellipse(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 4 + rnd() * 9, 2 + rnd() * 3, a, 0, 6.3); g.fill(); }   // crypts
      g.strokeStyle = 'rgba(255,170,120,0.45)'; g.lineWidth = 3;                                  // collarette (jagged ring)
      g.beginPath(); for (let k = 0; k <= 120; k++) { const a = k / 120 * 6.28, d = PUPIL * 1.75 + Math.sin(a * 23) * 5 + (rnd() - 0.5) * 5; const x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      const lim = g.createRadialGradient(CX, CY, IRIS * 0.82, CX, CY, IRIS * 1.03); lim.addColorStop(0, 'rgba(10,0,0,0)'); lim.addColorStop(0.8, 'rgba(10,0,0,0.75)'); lim.addColorStop(1, 'rgba(10,0,0,0)');
      g.fillStyle = lim; g.beginPath(); g.arc(CX, CY, IRIS * 1.03, 0, 6.3); g.fill();
      const pu = g.createRadialGradient(CX, CY, PUPIL * 0.75, CX, CY, PUPIL * 1.06); pu.addColorStop(0, '#020000'); pu.addColorStop(1, 'rgba(2,0,0,0)');
      g.fillStyle = pu; g.beginPath(); g.arc(CX, CY, PUPIL * 1.06, 0, 6.3); g.fill();
    });
    eyeTex.anisotropy = 4;
    const skinCanvas = (alpha) => RT.canvasTexture(1024, 512, (g) => {
      g.fillStyle = '#5c211c'; g.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? 'rgba(20,4,3,0.18)' : 'rgba(150,70,60,0.10)'; g.fillRect(rnd() * 1024, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2); }   // pores
      for (let k = 0; k < 60; k++) {                                                              // creases
        const y = rnd() * 512, amp = 6 + rnd() * 14, ph = rnd() * 6, w = 1 + rnd() * 2.5;
        g.strokeStyle = 'rgba(18,3,2,0.55)'; g.lineWidth = w; g.beginPath();
        for (let x = 0; x <= 1024; x += 16) { const yy = y + Math.sin(x * 0.006 + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke();
        g.strokeStyle = 'rgba(170,85,70,0.22)'; g.lineWidth = w * 0.7; g.beginPath();
        for (let x = 0; x <= 1024; x += 16) { const yy = y + 3 + Math.sin(x * 0.006 + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke();
      }
      if (alpha) {   // the socket: opaque around the eye, fading out into the sky; deep folds circle the eye
        const img = g.getImageData(0, 0, 1024, 512), d = img.data;
        for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) {
          const nx = (x - 512) / 512, ny = (y - 256) / 256, rr = Math.sqrt(nx * nx + ny * ny);
          const an = Math.atan2(ny, nx), fold = 0.9 + 0.1 * Math.sin(rr * 24 + Math.sin(an * 3) * 2.2 + Math.sin(an * 7 + rr * 5) * 0.9);
          const i = (y * 1024 + x) * 4; d[i] *= fold; d[i + 1] *= fold; d[i + 2] *= fold;
          d[i + 3] = 255 * Math.pow(clamp((1 - rr) / 0.7, 0, 1), 1.6);
        }
        g.putImageData(img, 0, 0);
      }
    });
    const skinTex = skinCanvas(false), socketTex = skinCanvas(true);

    // ---------- meshes ----------
    const uNU = new THREE.Vector3(), uNL = new THREE.Vector3(), center = new THREE.Vector3();
    const eyeM = new THREE.ShaderMaterial({ vertexShader: EYE_VS, fragmentShader: EYE_FS, uniforms: { map: { value: eyeTex }, uCenter: { value: center }, uNU: { value: uNU }, uNL: { value: uNL }, uR: { value: R } } });
    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), eyeM); root.add(eyeball);
    const light = new THREE.Vector3();
    const skinM = (map, alpha) => new THREE.ShaderMaterial({ vertexShader: SKIN_VS, fragmentShader: SKIN_FS, transparent: !!alpha, depthWrite: !alpha, side: THREE.DoubleSide,
      uniforms: { map: { value: map }, uLight: { value: light }, uAmb: { value: 0.32 }, uAlphaMap: { value: alpha ? 1 : 0 } } });
    const socket = new THREE.Group(); root.add(socket);
    const lidM = skinM(skinTex, false);
    const lidU = new THREE.Group(), lidL = new THREE.Group(); socket.add(lidU, lidL);
    lidU.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2), lidM));
    lidL.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 96, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidM));
    // lid thickness: a rounded rim along each edge (the front half), with a wet darker waterline
    const rimGeo = new THREE.TorusGeometry(R * 1.04, R * 0.07, 10, 96, Math.PI);
    const rimU = new THREE.Mesh(rimGeo, lidM), rimL = new THREE.Mesh(rimGeo, lidM);
    rimU.rotation.set(Math.PI / 2, 0, 0); rimL.rotation.set(Math.PI / 2, 0, 0); lidU.add(rimU); lidL.add(rimL);   // both along the front half of the lid edge
    const wetM = new THREE.MeshBasicMaterial({ color: '#7a1712' });
    const wetU = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, R * 0.03, 6, 96, Math.PI), wetM), wetL = wetU.clone();
    wetU.rotation.copy(rimU.rotation); wetL.rotation.copy(rimL.rotation); wetU.position.y = -R * 0.035; wetL.position.y = R * 0.035; lidU.add(wetU); lidL.add(wetL);
    // eyelashes: thin tapered strands along the rims, curling away from the eye
    const lashGeo = new THREE.ConeGeometry(R * 0.012, 1, 4); lashGeo.translate(0, 0.5, 0);
    const lashM = new THREE.MeshBasicMaterial({ color: '#0c0303' });
    const lashes = (grp, n, len, down) => {
      const im = new THREE.InstancedMesh(lashGeo, lashM, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const a = 0.12 + (i / (n - 1)) * (Math.PI - 0.24) + (rnd() - 0.5) * 0.03;     // along the front half of the rim
        const x = Math.cos(a) * R * 1.08, zf = Math.sin(a) * R * 1.08;                  // rim point (lid plane: y = 0)
        const l = len * (0.55 + 0.45 * Math.sin(a)) * (0.85 + rnd() * 0.3);
        e.set((down ? 1 : -1) * (1.05 + rnd() * 0.25), Math.atan2(x, zf) * 0, 0);
        q.setFromEuler(e);
        const out = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, (down ? -1 : 1) * R * 0.55, zf).normalize());
        m.compose(new THREE.Vector3(x, 0, zf), out, new THREE.Vector3(1, l, 1)); im.setMatrixAt(i, m);
      }
      im.frustumCulled = false; grp.add(im);
    };
    const lashU = new THREE.Group(), lashL = new THREE.Group(); rimU.parent.add(lashU); lidL.add(lashL);
    lashes(lashU, 90, R * 0.3, false); lashes(lashL, 45, R * 0.13, true);
    // the socket around the eye (fleshy folds, fading into the sky)
    const socketM = skinM(socketTex, true);
    const sock = new THREE.Mesh(new THREE.PlaneGeometry(R * 5.2, R * 3.4), socketM); sock.renderOrder = -2; socket.add(sock);
    // wet highlights on the cornea (they stay where the light is while the eye turns)
    const hiTex = RT.canvasTexture(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const hiM = new THREE.SpriteMaterial({ map: hiTex, transparent: true, depthWrite: false, fog: false, toneMapped: false });
    const hi1 = new THREE.Sprite(hiM), hi2 = new THREE.Sprite(hiM.clone()); hi1.scale.set(R * 0.2, R * 0.13, 1); hi2.scale.setScalar(R * 0.07); hi2.material.opacity = 0.7;
    root.add(hi1, hi2);
    // a red halo behind everything
    const glowTex = RT.canvasTexture(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 18, 64, 64, 64); gr.addColorStop(0, 'rgba(255,50,30,0.8)'); gr.addColorStop(0.5, 'rgba(255,30,15,0.22)'); gr.addColorStop(1, 'rgba(255,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, toneMapped: false }));
    glow.scale.set(R * 7, R * 5, 1); glow.renderOrder = -6; root.add(glow);
    for (const ob of [eyeball, sock, hi1, hi2, glow]) ob.frustumCulled = false;
    root.traverse((ob) => { if (ob.material) ob.material.fog = false; });

    const tmp = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), toCam = new THREE.Vector3();
    let cam = null;
    const eye = {
      group: root, dir, radius: R,
      place(camera) {
        cam = camera;
        root.position.copy(camera.position).addScaledVector(dir, DIST);
        socket.lookAt(camera.position);
        if (env) { env.skyDir.copy(dir); env.sunDisc.visible = false; env.glow.visible = false; }
      },
      set(open, look, t = 0) {
        open = clamp(open, 0, 1);
        // a slow blink now and then (pure function of t), the lids breathe a little
        const bk = Math.max(0, 1 - Math.abs(((t + 1.3) % 7.3) - 0.12) / 0.12);
        const o = RT.easeOut(open) * (0.95 + 0.05 * Math.sin(t * 0.8)) * (1 - bk * 0.95);
        lidU.rotation.x = -o * 0.58; lidL.rotation.x = o * 0.42;
        eyeball.visible = open > 0.01;
        // gaze: toward the target, with small saccades
        if (look) {
          tmp.copy(look);
          const sx = Math.sin(Math.floor(t * 1.7) * 12.9898) * 0.5, sy = Math.sin(Math.floor(t * 1.7) * 78.233) * 0.5;
          eyeball.lookAt(tmp); eyeball.rotateY(sx * 0.03); eyeball.rotateX(sy * 0.02);
        }
        // shading inputs: lid plane normals (world), light from above-front of the viewer
        socket.updateMatrixWorld(true);
        center.setFromMatrixPosition(root.matrixWorld);
        const q = new THREE.Quaternion(); lidU.getWorldQuaternion(q); uNU.set(0, 1, 0).applyQuaternion(q);
        lidL.getWorldQuaternion(q); uNL.set(0, -1, 0).applyQuaternion(q);
        if (cam) {
          toCam.copy(cam.position).sub(center).normalize();
          up.set(0, 1, 0).applyQuaternion(socket.getWorldQuaternion(q)); right.crossVectors(toCam, up).normalize();
          light.copy(toCam).multiplyScalar(0.55).addScaledVector(up, 0.8).normalize();
          hi1.position.copy(center).addScaledVector(tmp.copy(toCam).multiplyScalar(0.92).addScaledVector(up, 0.3).addScaledVector(right, 0.22).normalize(), R * 1.03);
          hi2.position.copy(center).addScaledVector(tmp.copy(toCam).multiplyScalar(0.95).addScaledVector(up, -0.12).addScaledVector(right, -0.2).normalize(), R * 1.03);
          const vis = o > 0.35 ? 1 : 0; hi1.visible = hi2.visible = !!vis;
        }
        glow.material.opacity = 0.35 + 0.65 * open;
      },
    };
    return eye;
  }

  RT.skyEye = { create };
})();
