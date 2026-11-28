// =====================================================================================
// mood.js: lighting presets. One call sets the sky colors, fog, sun direction, light colors and exposure.
//
//   const env = RT.mood.create(scene, renderer);   // builds sky dome, sun disc + glow, lights (ONE shadow light)
//   env.set('sunrise');                            // or 'overcast', 'capitalDay', 'arenaDay', 'arenaNight', 'storm', 'councilDark', 'studio'
//   env.set(RT.mood.mix('sunrise', 'overcast', 0.5));   // blend two presets (e.g. a sky slowly clouding over)
//   every frame: env.follow(camera); env.shadowFocus(x, y, z, radius);
//
// The sky shader, sun disc and glow are the ones from the original test scene (reference/ep1-part1-test.html).
// To change a mood, edit its numbers below. Colors are '#rrggbb'. sunDir points FROM the scene TOWARD the sun.
// =====================================================================================
(function () {
  'use strict';
  const RT = (window.RT = window.RT || {});

  const PRESETS = {
    // Sector 7 village at dawn (matches the test scene exactly, a touch brighter for the Roblox look)
    sunrise: { top: '#4f74ad', horizon: '#f4c08f', sunCol: '#ffb36b', sunDir: [-0.6, 0.14, -0.79], sunDisc: 1,
      fog: '#e7b88f', fogNear: 90, fogFar: 1150, hemiSky: '#bcd0ff', hemiGround: '#6b5a3a', hemi: 0.75,
      sun: '#ffcf99', sunI: 1.75, fill: '#ffd9c0', fillI: 0.5, exposure: 1.28 },
    // the Choosing: flat grey sky, soft cool light, weak shadows
    overcast: { top: '#7d8796', horizon: '#c9ccd1', sunCol: '#d9dde3', sunDir: [0.3, 0.6, -0.5], sunDisc: 0,
      fog: '#b9bec6', fogNear: 60, fogFar: 700, hemiSky: '#d6dbe3', hemiGround: '#6f6a60', hemi: 1.05,
      sun: '#e8ecf2', sunI: 0.65, fill: '#dfe4ea', fillI: 0.45, exposure: 1.15 },
    // the Capital: bright, clean, slightly cool, glossy
    capitalDay: { top: '#2f6fd6', horizon: '#bfe0ff', sunCol: '#fff3d6', sunDir: [0.45, 0.55, -0.45], sunDisc: 1,
      fog: '#cfe6ff', fogNear: 150, fogFar: 1600, hemiSky: '#cfe3ff', hemiGround: '#9a8f80', hemi: 0.8,
      sun: '#fff6e5', sunI: 1.9, fill: '#d9ecff', fillI: 0.5, exposure: 1.2 },
    // the Arena by day: saturated "Roblox noon"
    arenaDay: { top: '#3a8ef0', horizon: '#cfeaff', sunCol: '#fff1c8', sunDir: [-0.35, 0.7, 0.45], sunDisc: 1,
      fog: '#bfe1f7', fogNear: 120, fogFar: 1400, hemiSky: '#c8e4ff', hemiGround: '#5f7a3a', hemi: 0.8,
      sun: '#fff4dc', sunI: 1.85, fill: '#dbeeff', fillI: 0.4, exposure: 1.18 },
    // the Arena at night: deep blue, moonlight, the dome glow does the rest
    arenaNight: { top: '#070d24', horizon: '#1d3157', sunCol: '#9fb8ff', sunDir: [0.4, 0.45, -0.6], sunDisc: 0.55, moon: 1,
      fog: '#0e1a33', fogNear: 25, fogFar: 420, hemiSky: '#5a78c0', hemiGround: '#1c2433', hemi: 0.95,
      sun: '#a9c0ff', sunI: 0.95, fill: '#6f8fd8', fillI: 0.45, exposure: 1.35 },
    // the Arena storm: dark green-grey, low fog
    storm: { top: '#2b3338', horizon: '#5d6a6a', sunCol: '#8f9c9a', sunDir: [0.2, 0.7, 0.3], sunDisc: 0,
      fog: '#4a5656', fogNear: 20, fogFar: 300, hemiSky: '#7b8a8f', hemiGround: '#2c3128', hemi: 0.85,
      sun: '#b8c4c4', sunI: 0.5, fill: '#8a9a9e', fillI: 0.3, exposure: 1.2 },
    // the Council Hall: dark, warm gold key light from the huge windows, deep red shadows
    councilDark: { top: '#140b10', horizon: '#3a1f1a', sunCol: '#ffb560', sunDir: [0.55, 0.35, 0.3], sunDisc: 0,
      fog: '#1c0f0e', fogNear: 30, fogFar: 260, hemiSky: '#5a3a3a', hemiGround: '#1a0c0c', hemi: 0.55,
      sun: '#ffc67a', sunI: 1.6, fill: '#a03a3a', fillI: 0.35, exposure: 1.3 },
    // ---------- ECHO BREAKERS (Port Halcyon) ----------
    // sunny Italian harbor noon: deep blue sky, strong warm sun, light haze far away (stairway, piazza, promenade)
    halcyon: { top: '#1a5fd6', horizon: '#b4dcfb', sunCol: '#fff1cf', sunDir: [0.62, 0.62, 0.45], sunDisc: 1,
      fog: '#c6e2f6', fogNear: 260, fogFar: 2600, hemiSky: '#cfe3ff', hemiGround: '#8a7656', hemi: 0.6,
      sun: '#fff0d2', sunI: 1.7, fill: '#d6e8ff', fillI: 0.32, exposure: 1.0 },
    // sunset over the sea (the Sea Fortress): orange-pink horizon, violet sky, low golden sun from the west (-x)
    sunset: { top: '#3a3f8c', horizon: '#ff9c5e', sunCol: '#ffb36b', sunDir: [-0.86, 0.13, -0.33], sunDisc: 1,
      fog: '#f0a77e', fogNear: 220, fogFar: 2400, hemiSky: '#ffc7a2', hemiGround: '#4c3b5a', hemi: 0.72,
      sun: '#ffb46e', sunI: 2.0, fill: '#9d8ad8', fillI: 0.45, exposure: 1.22 },
    // the Ancient Arena at night: deep blue-violet sky, cold moonlight; purple and gold stage lights do the rest
    arenaPurple: { top: '#05071a', horizon: '#2b2058', sunCol: '#b8c6ff', sunDir: [0.35, 0.42, -0.62], sunDisc: 0.55, moon: 1,
      fog: '#120f2a', fogNear: 120, fogFar: 900, hemiSky: '#4a4c9a', hemiGround: '#151020', hemi: 0.5,
      sun: '#b9c8ff', sunI: 0.75, fill: '#6a50c0', fillI: 0.3, exposure: 1.3 },
    // dawn over the promenade (the ending): soft peach light from the east, pale sky
    dawn: { top: '#5f86c9', horizon: '#ffd3ab', sunCol: '#ffc58f', sunDir: [0.75, 0.12, -0.65], sunDisc: 1,
      fog: '#f2cdb0', fogNear: 240, fogFar: 2400, hemiSky: '#d9dcff', hemiGround: '#7a6a5a', hemi: 0.8,
      sun: '#ffcf9e', sunI: 1.55, fill: '#c8d4ff', fillI: 0.4, exposure: 1.2 },
    // a dark room at night (the TO BE CONTINUED teaser): cold moonlight through one window
    darkRoom: { top: '#05060c', horizon: '#0c1020', sunCol: '#8fa8ff', sunDir: [-0.55, 0.45, 0.7], sunDisc: 0,
      fog: '#05060b', fogNear: 14, fogFar: 70, hemiSky: '#38406a', hemiGround: '#08080c', hemi: 0.32,
      sun: '#9fb4ff', sunI: 0.75, fill: '#2a2f48', fillI: 0.12, exposure: 1.25 },
    // neutral bright light for the character viewer
    studio: { top: '#4f8fe8', horizon: '#dceeff', sunCol: '#fff5e0', sunDir: [0.45, 0.75, 0.55], sunDisc: 0.6,
      fog: '#dceeff', fogNear: 80, fogFar: 600, hemiSky: '#e4f0ff', hemiGround: '#8c8a7a', hemi: 0.55,
      sun: '#fffaf0', sunI: 0.95, fill: '#e8f0ff', fillI: 0.28, exposure: 1.0 },
  };

  const SKY_VS = 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const SKY_FS = 'uniform vec3 top;uniform vec3 horizon;uniform vec3 sunCol;uniform vec3 sunDir;uniform float disc;varying vec3 vP;' +
    'void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=mix(horizon,top,smoothstep(-0.02,0.55,h));' +
    'float s=max(dot(d,sunDir),0.0);c+=sunCol*pow(s,6.0)*0.55*disc+vec3(1.0,0.9,0.75)*pow(s,400.0)*1.2*disc;' +
    'c=mix(c,horizon*0.9,smoothstep(0.0,-0.2,h));gl_FragColor=vec4(c,1.0);}';

  function create(scene, renderer, o = {}) {
    const sunDir = new THREE.Vector3(-0.6, 0.14, -0.79).normalize();
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: sunDir }, disc: { value: 1 } },
      vertexShader: SKY_VS, fragmentShader: SKY_FS,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(o.skyRadius || 1500, 32, 16), skyMat);
    sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(28, 24, 12), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false, toneMapped: false }));
    scene.add(sunDisc);
    const glowTex = RT.canvasTexture(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,230,180,1)'); gr.addColorStop(0.25, 'rgba(255,190,120,0.45)'); gr.addColorStop(1, 'rgba(255,150,80,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, toneMapped: false, opacity: 0.8 }));
    glow.scale.set(520, 520, 1); scene.add(glow);

    const hemi = new THREE.HemisphereLight(0xbcd0ff, 0x6b5a3a, 0.65); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffcf99, 1.7);       // the ONLY shadow-casting light
    sun.castShadow = true;
    const sm = o.shadowSize || 2048; sun.shadow.mapSize.set(sm, sm);
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0xffd9c0, 0.45); scene.add(fill);   // no shadows
    scene.fog = new THREE.Fog(0xe7b88f, 90, 1150);

    const env = {
      sky, sunDisc, glow, hemi, sun, fill, sunDir, preset: null,
      set(p) {
        if (typeof p === 'string') { if (!PRESETS[p]) throw new Error('unknown mood ' + p); this.name = p; p = PRESETS[p]; }
        this.preset = p;
        skyMat.uniforms.top.value.set(p.top); skyMat.uniforms.horizon.value.set(p.horizon); skyMat.uniforms.sunCol.value.set(p.sunCol);
        skyMat.uniforms.disc.value = p.sunDisc;
        sunDir.set(p.sunDir[0], p.sunDir[1], p.sunDir[2]).normalize();
        scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
        hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemi;
        sun.color.set(p.sun); sun.intensity = p.sunI;
        fill.color.set(p.fill); fill.intensity = p.fillI;
        sunDisc.visible = glow.visible = p.sunDisc > 0.05;
        sunDisc.material.color.set(p.moon ? '#dfe8ff' : '#fff6e0'); sunDisc.scale.setScalar(p.moon ? 0.7 : 1);
        glow.material.opacity = 0.8 * p.sunDisc;
        if (renderer) renderer.toneMappingExposure = p.exposure;
        return this;
      },
      // keep the sky centered on the camera and the sun disc far away in the sun's direction
      follow(camera) {
        sky.position.copy(camera.position);
        sunDisc.position.copy(camera.position).addScaledVector(sunDir, 1300);
        glow.position.copy(sunDisc.position);
        // the fill light shines from the camera's side toward the scene center (soft front light, no shadows)
        fill.position.copy(camera.position).sub(sun.target.position).normalize().multiplyScalar(10).add(new THREE.Vector3(0, 3, 0));
      },
      // put the shadow camera around what the shot is looking at (radius in world units: small = sharper shadows)
      shadowFocus(x, y, z, radius = 40) {
        sun.target.position.set(x, y, z);
        sun.position.set(x, y, z).addScaledVector(sunDir, Math.max(150, radius * 3));
        const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius;
        c.near = 1; c.far = Math.max(400, radius * 8); c.updateProjectionMatrix();
        sun.target.updateMatrixWorld();
      },
    };
    env.set(o.mood || 'sunrise');
    env.shadowFocus(0, 0, 0, 45);
    return env;
  }

  // blend two presets (p = 0 → a, p = 1 → b)
  function mix(a, b, p) {
    a = typeof a === 'string' ? PRESETS[a] : a; b = typeof b === 'string' ? PRESETS[b] : b;
    const out = {};
    for (const k in a) {
      if (typeof a[k] === 'number') out[k] = RT.lerp(a[k], b[k] ?? a[k], p);
      else if (Array.isArray(a[k])) out[k] = a[k].map((v, i) => RT.lerp(v, b[k][i], p));
      else if (typeof a[k] === 'string' && a[k][0] === '#') out[k] = RT.mixColor(a[k], b[k] || a[k], p);
      else out[k] = p < 0.5 ? a[k] : b[k];
    }
    return out;
  }

  // renderer settings shared by every scene (ACESFilmic like the test scene, pixel ratio capped at 2)
  function renderer(canvasOrNull, o = {}) {
    const r = new THREE.WebGLRenderer({ canvas: canvasOrNull || undefined, antialias: true, preserveDrawingBuffer: !!o.preserve });
    r.setPixelRatio(Math.min(o.pixelRatio || window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.25;
    return r;
  }

  RT.mood = { PRESETS, create, mix, renderer, names: Object.keys(PRESETS) };
})();
