// =====================================================================================
// glow.js: selective bloom. Only objects tagged userData.glow = true (Echoes, auras, energy effects) shine;
// sunlit walls never bloom. Needs vendor/EffectComposer.js, RenderPass.js, UnrealBloomPass.js (+ shaders).
//
//   const glow = RT.glow.create(renderer, scene, camera, { strength: 1.1, radius: 0.55, scale: 0.5 });
//   instead of renderer.render(scene, camera):  glow.render();      glow.strength = 1.6 (any time)
// How: (1) render the scene at half size with every non-glowing object painted black, blur it (UnrealBloomPass);
//      (2) render the normal frame; (3) add the blurred glow on top.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT;
  function create(renderer, scene, camera, o = {}) {
    const size = new THREE.Vector2(); renderer.getSize(size);
    const scale = o.scale ?? 0.5, w = Math.max(2, Math.round(size.x * scale)), h = Math.max(2, Math.round(size.y * scale));
    const composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }));
    composer.renderToScreen = false; composer.setPixelRatio(1); composer.setSize(w, h);
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), o.strength ?? 0.9, o.radius ?? 0.6, o.threshold ?? 0.05);
    composer.addPass(bloom);
    // three.js r128 does not rebuild a shader when an instanced mesh with per-instance colors and one without share
    // a material, so the glow pass keeps three separate black materials (plain, instanced, instanced + colors)
    const black = new THREE.MeshBasicMaterial({ color: 0x000000 }), blackI = black.clone(), blackIC = black.clone(), saved = new Map(), hidden = [];
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { tGlow: { value: null }, gain: { value: o.gain ?? 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tGlow; uniform float gain; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tGlow, vUv).rgb * gain, 1.0); }',
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
    }));
    quad.frustumCulled = false;
    const overlayScene = new THREE.Scene(); overlayScene.add(quad);
    const overlayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const isGlow = (obj) => { for (let p = obj; p; p = p.parent) if (p.userData && p.userData.glow) return true; return false; };
    let anyGlow = false;
    function darken() {
      anyGlow = false;
      scene.traverseVisible((obj) => {
        if (isGlow(obj)) { anyGlow = true; if (obj.userData.haloMat && !obj.userData.shell) { saved.set(obj, obj.material); obj.material = obj.userData.haloMat; } return; }
        if (obj.isMesh || obj.isInstancedMesh) { saved.set(obj, obj.material); obj.material = obj.isInstancedMesh ? (obj.instanceColor ? blackIC : blackI) : black; }
        else if (obj.isSprite || obj.isPoints || obj.isLine) { if (obj.visible) { obj.visible = false; hidden.push(obj); } }
      });
    }
    function restore() { for (const [obj, m] of saved) obj.material = m; saved.clear(); for (const obj of hidden) obj.visible = true; hidden.length = 0; }
    const api = {
      bloom, enabled: true,
      get strength() { return bloom.strength; }, set strength(v) { bloom.strength = v; },
      render() {
        if (api.enabled) {
          const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null;
          darken();
          if (anyGlow) composer.render();
          restore(); scene.background = bg; scene.fog = fog;
        }
        renderer.render(scene, camera);
        if (api.enabled && anyGlow) {
          quad.material.uniforms.tGlow.value = composer.renderTarget2.texture;
          const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(overlayScene, overlayCam); renderer.autoClear = ac;
        }
      },
      resize(W, H) { const ww = Math.max(2, Math.round(W * scale)), hh = Math.max(2, Math.round(H * scale)); composer.setSize(ww, hh); bloom.setSize(ww, hh); },
    };
    return api;
  }
  RT.glow = { create };
})();
