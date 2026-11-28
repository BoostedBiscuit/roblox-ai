// =====================================================================================
// post.js: THE MIDNIGHT SEA look. Everything that happens to the picture after the 3D render (three.js r128 only).
//
//   const post = RT.post.create(renderer);                 // once
//   each frame:  post.capturePrev(camera)                  // camera of the previous frame (same shot) → camera motion blur
//                post.clearPrev()                          // … or at a cut (no blur across the cut)
//                post.render(scene, camera, fx)            // instead of renderer.render(scene, camera)
//
// fx (all optional, 0 = off):
//   grade     0..1   red-and-black grade (1 = full: crushed blacks, crimson mids, hot pink-white highlights)
//   bloom     0..2   glow on bright things          bloomThreshold 0..1 (default 0.55)
//   focus     world units from the camera that stay sharp (null = no depth blur)   aperture 0..1 (blur strength)
//   motion    0..1   camera motion blur (shutter; needs capturePrev)
//   ca        0..1   chromatic aberration (colour split toward the edges)
//   zoom      0..1   radial zoom blur toward zoomCenter [x, y] (0..1 screen)
//   whip      -1..1  horizontal whip-pan smear (sign = direction)
//   glitch    0..1   digital glitch: sliced rows, RGB split, noise blocks (phone footage)
//   vignette  0..1   (default 0.55)        grain 0..1 (default 0.12)        t: time (grain/glitch seed)
//   lift      -1..1  brightness offset after the grade (fade to black = -1)
//   gamma     tone curve of the red grade before the colour ramp (default 1.55: deep, dark; lower = brighter mid-tones)
//
// How it works: the scene renders to the screen with MSAA (smooth edges), is copied into a texture, a cheap
// half-size depth pass gives distances, then 3 small passes (bright-pass + blur for the glow) and one full-size
// pass (depth/motion blur) and the final pass (zoom, whip, colour split, glitch, grade, vignette, grain).
// Objects with userData.noDepth (mist, particles, sprites) are left out of the depth pass.
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT;
  const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';

  // depth + camera motion blur (full size)
  const BLUR_FS = `
  #include <packing>
  uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res;
  uniform float cNear; uniform float cFar; uniform float focus; uniform float aperture; uniform float useDof;
  uniform mat4 projInv; uniform mat4 viewInv; uniform mat4 prevViewProj; uniform float motion;
  varying vec2 vUv;
  float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return perspectiveDepthToViewZ(d, cNear, cFar); }
  float coc(float z){ float dist = -z; return useDof * clamp(abs(dist - focus) / max(dist, 0.001) * aperture * 26.0, 0.0, 14.0); }
  void main(){
    float z = viewZ(vUv);
    float c0 = coc(z);
    vec2 vel = vec2(0.0);
    if (motion > 0.0) {
      float d = texture2D(tDepth, vUv).x;
      vec4 clip = vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      vec4 vp = projInv * clip; vp /= vp.w;
      vec4 wp = viewInv * vp;
      vec4 pc = prevViewProj * wp; pc /= pc.w;
      vec2 puv = pc.xy * 0.5 + 0.5;
      vel = (vUv - puv) * motion;
      float m = length(vel * res); if (m > 60.0) vel *= 60.0 / m;
    }
    if (c0 < 0.6 && length(vel * res) < 0.8) { gl_FragColor = texture2D(tColor, vUv); return; }
    vec3 acc = vec3(0.0); float wsum = 0.0;
    const int N = 16;
    for (int i = 0; i < N; i++) {
      float fi = float(i);
      float a = fi * 2.39996;                       // golden-angle disk
      float r = sqrt((fi + 0.5) / float(N));
      vec2 disk = vec2(cos(a), sin(a)) * r * c0 / res;
      vec2 mv = vel * ((fi + 0.5) / float(N) - 0.5);
      vec2 uv = vUv + disk + mv;
      float cs = coc(viewZ(uv));
      float w = (cs >= c0 * r * 0.8 || cs > 1.5) ? 1.0 : 0.25;   // keep sharp foreground from bleeding into blurred background
      acc += texture2D(tColor, uv).rgb * w; wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, 1.0);
  }`;

  const BRIGHT_FS = `uniform sampler2D tColor; uniform float thr; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tColor, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(thr, thr + 0.25, l), 1.0); }`;
  const GAUSS_FS = `uniform sampler2D tColor; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tColor, vUv).rgb * 0.2270;
    c += (texture2D(tColor, vUv + dir * 1.3846).rgb + texture2D(tColor, vUv - dir * 1.3846).rgb) * 0.3162;
    c += (texture2D(tColor, vUv + dir * 3.2308).rgb + texture2D(tColor, vUv - dir * 3.2308).rgb) * 0.0703;
    gl_FragColor = vec4(c, 1.0); }`;

  const FINAL_FS = `
  uniform sampler2D tColor; uniform sampler2D tBloom1; uniform sampler2D tBloom2; uniform vec2 res;
  uniform float bloom; uniform float grade; uniform float ca; uniform float zoom; uniform vec2 zoomC; uniform float whip;
  uniform float glitch; uniform float vignette; uniform float grain; uniform float t; uniform float lift; uniform float mono; uniform float gamma; uniform float redLum;
  varying vec2 vUv;
  float h1(float n){ return fract(sin(n) * 43758.5453); }
  float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 src(vec2 uv){
    vec3 c = texture2D(tColor, uv).rgb;
    c += (texture2D(tBloom1, uv).rgb * 0.6 + texture2D(tBloom2, uv).rgb * 0.9) * bloom;
    return c;
  }
  vec3 gradeRB(vec3 c){
    // darker, easier on the eyes: deep blacks, a muted crimson for the mid-tones, highlights that stay red
    // (only the brightest specks, like the eye's glint, reach a soft pink); a touch of the original colour keeps faces readable
    float l = max(dot(c, vec3(0.299, 0.587, 0.114)), c.r * redLum);   // redLum > 0: saturated reds (the sea) keep their brightness
    float redness = clamp((c.r - max(c.g, c.b)) * 1.6, 0.0, 1.0);
    l = pow(clamp(l, 0.0, 1.4), gamma);
    vec3 g = mix(vec3(0.0), vec3(0.24, 0.018, 0.022), smoothstep(0.0, 0.32, l));
    g = mix(g, vec3(0.62, 0.075, 0.06), smoothstep(0.22, 0.7, l));
    g = mix(g, vec3(0.86, 0.30, 0.24), smoothstep(0.85, 1.35, l));
    g += vec3(0.16, 0.01, 0.0) * redness * smoothstep(0.05, 0.4, l);
    g = mix(g, c * vec3(0.55, 0.22, 0.2), 0.12);
    return mix(c, g, grade);
  }
  void main(){
    vec2 uv = vUv;
    // glitch: rows of the picture slide sideways in blocks
    if (glitch > 0.0) {
      float row = floor(uv.y * 46.0), tick = floor(t * 24.0);
      float on = step(1.0 - glitch * 0.55, h1(row * 1.7 + tick * 3.1));
      uv.x += on * (h1(row + tick) - 0.5) * 0.16 * glitch;
      float big = step(0.86, h1(floor(uv.y * 7.0) + tick * 0.7)) * glitch;
      uv.x += big * 0.05 * sin(tick);
    }
    vec3 c;
    if (zoom > 0.001 || abs(whip) > 0.001) {
      vec2 dz = (uv - zoomC) * zoom * 0.16, dw = vec2(whip * 0.11, 0.0);
      c = vec3(0.0);
      for (int i = 0; i < 12; i++) { float k = float(i) / 11.0; c += src(uv - dz * k - dw * (k - 0.5)); }
      c /= 12.0;
    } else c = src(uv);
    // chromatic aberration: red and blue pulled apart toward the edges
    float caT = ca + glitch * 0.6;
    if (caT > 0.001) {
      vec2 d = (uv - 0.5) * caT * 0.018 + vec2(glitch * 0.006, 0.0);
      c.r = mix(c.r, src(uv + d).r, 0.9); c.b = mix(c.b, src(uv - d).b, 0.9);
    }
    vec3 cr = gradeRB(c);
    if (mono > 0.0) {   // the epilogue: cold black and grey, no red at all
      float lm = pow(clamp(dot(c, vec3(0.299, 0.587, 0.114)), 0.0, 1.4), 1.3);
      vec3 gm = mix(vec3(0.0), vec3(0.26, 0.28, 0.31), smoothstep(0.0, 0.55, lm)); gm = mix(gm, vec3(0.72, 0.74, 0.78), smoothstep(0.55, 1.25, lm));
      cr = mix(cr, gm, mono);
    }
    c = cr;
    if (glitch > 0.0) {
      float tick = floor(t * 24.0);
      vec2 bl = floor(vUv * vec2(18.0, 32.0));
      float blk = step(1.0 - glitch * 0.12, h2(bl + tick));
      c = mix(c, vec3(h2(bl * 3.1 + tick)) * vec3(1.0, 0.25, 0.25), blk * 0.8);
      c *= 1.0 - glitch * 0.18 * step(0.5, fract(vUv.y * res.y * 0.25));          // scanlines
    }
    vec2 q = vUv - 0.5; q.x *= res.x / res.y;
    c *= 1.0 - vignette * smoothstep(0.25, 0.95, length(q) * 1.15);
    c += (h2(vUv * res + fract(t * 7.13) * 100.0) - 0.5) * grain * 0.16;
    c = c + lift;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;

  function create(renderer, o = {}) {
    const quadScene = new THREE.Scene(), quadCam = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
    const mat = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
    const blurM = mat(BLUR_FS, { tColor: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2() }, cNear: { value: 0.1 }, cFar: { value: 1000 },
      focus: { value: 5 }, aperture: { value: 0 }, useDof: { value: 0 }, projInv: { value: new THREE.Matrix4() }, viewInv: { value: new THREE.Matrix4() },
      prevViewProj: { value: new THREE.Matrix4() }, motion: { value: 0 } });
    const brightM = mat(BRIGHT_FS, { tColor: { value: null }, thr: { value: 0.55 } });
    const gaussM = mat(GAUSS_FS, { tColor: { value: null }, dir: { value: new THREE.Vector2() } });
    const finalM = mat(FINAL_FS, { tColor: { value: null }, tBloom1: { value: null }, tBloom2: { value: null }, res: { value: new THREE.Vector2() },
      bloom: { value: 0 }, grade: { value: 1 }, ca: { value: 0 }, zoom: { value: 0 }, zoomC: { value: new THREE.Vector2(0.5, 0.5) }, whip: { value: 0 },
      glitch: { value: 0 }, vignette: { value: 0.55 }, grain: { value: 0.12 }, t: { value: 0 }, lift: { value: 0 }, mono: { value: 0 }, gamma: { value: 1.55 }, redLum: { value: 0 } });
    const depthOverride = new THREE.MeshBasicMaterial({ colorWrite: false });

    let W = 0, H = 0, colorTex, depthRT, blurRT, b1a, b1b, b2a, b2b;
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false };
    function resize() {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (size.x === W && size.y === H) return;
      W = size.x; H = size.y;
      [colorTex, depthRT, blurRT, b1a, b1b, b2a, b2b].forEach((x) => x && x.dispose());
      colorTex = new THREE.DataTexture(new Uint8Array(W * H * 3), W, H, THREE.RGBFormat);
      colorTex.minFilter = colorTex.magFilter = THREE.LinearFilter; colorTex.generateMipmaps = false;
      const dw = Math.max(2, Math.round(W / 2)), dh = Math.max(2, Math.round(H / 2));
      depthRT = new THREE.WebGLRenderTarget(dw, dh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, stencilBuffer: false });
      depthRT.depthTexture = new THREE.DepthTexture(dw, dh); depthRT.depthTexture.type = THREE.UnsignedIntType;
      blurRT = new THREE.WebGLRenderTarget(W, H, rtOpts);
      const q1w = Math.round(W / 4), q1h = Math.round(H / 4), q2w = Math.round(W / 8), q2h = Math.round(H / 8);
      b1a = new THREE.WebGLRenderTarget(q1w, q1h, rtOpts); b1b = new THREE.WebGLRenderTarget(q1w, q1h, rtOpts);
      b2a = new THREE.WebGLRenderTarget(q2w, q2h, rtOpts); b2b = new THREE.WebGLRenderTarget(q2w, q2h, rtOpts);
    }
    function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }

    const prevVP = new THREE.Matrix4(); let hasPrev = false;
    const hidden = [];
    const post = {
      enabled: true,
      capturePrev(camera) { camera.updateMatrixWorld(); prevVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); hasPrev = true; },
      clearPrev() { hasPrev = false; },
      render(scene, camera, fx = {}) {
        if (!post.enabled) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
        resize();
        const auto = renderer.autoClear;
        // 1. the scene, antialiased, on screen → copied into a texture
        renderer.setRenderTarget(null); renderer.render(scene, camera);
        renderer.copyFramebufferToTexture(new THREE.Vector2(0, 0), colorTex);
        const needDepth = fx.focus != null || (fx.motion > 0 && hasPrev);
        // 2. half-size depth (no lights, no shadows; mist/particles/sprites left out)
        if (needDepth) {
          hidden.length = 0;
          scene.traverse((ob) => { if (ob.visible && (ob.isSprite || ob.isPoints || ob.userData.noDepth)) { hidden.push(ob); ob.visible = false; } });
          const sm = renderer.shadowMap.autoUpdate, bg = scene.background; renderer.shadowMap.autoUpdate = false; scene.background = null;
          scene.overrideMaterial = depthOverride;
          renderer.setRenderTarget(depthRT); renderer.clear(); renderer.render(scene, camera);
          scene.overrideMaterial = null; renderer.shadowMap.autoUpdate = sm; scene.background = bg;
          for (const ob of hidden) ob.visible = true;
        }
        // 3. depth of field + camera motion blur
        let base = colorTex;
        if (needDepth) {
          const u = blurM.uniforms;
          u.tColor.value = colorTex; u.tDepth.value = depthRT.depthTexture; u.res.value.set(W, H);
          u.cNear.value = camera.near; u.cFar.value = camera.far;
          u.useDof.value = fx.focus != null ? 1 : 0; u.focus.value = fx.focus || 5; u.aperture.value = fx.aperture ?? 0.5;
          u.projInv.value.copy(camera.projectionMatrixInverse); u.viewInv.value.copy(camera.matrixWorld);
          u.prevViewProj.value.copy(prevVP); u.motion.value = hasPrev ? (fx.motion || 0) : 0;
          pass(blurM, blurRT); base = blurRT.texture;
        }
        // 4. glow: bright parts, blurred at 1/4 and 1/8 size
        const bloom = (fx.bloom ?? 0.8) * 0.45;          // softer glow (it was hard on the eyes)
        if (bloom > 0) {
          brightM.uniforms.tColor.value = base; brightM.uniforms.thr.value = fx.bloomThreshold ?? 0.82; pass(brightM, b1a);
          for (let k = 0; k < 2; k++) {
            gaussM.uniforms.tColor.value = b1a.texture; gaussM.uniforms.dir.value.set(1.6 / b1a.width, 0); pass(gaussM, b1b);
            gaussM.uniforms.tColor.value = b1b.texture; gaussM.uniforms.dir.value.set(0, 1.6 / b1a.height); pass(gaussM, b1a);
          }
          gaussM.uniforms.tColor.value = b1a.texture; gaussM.uniforms.dir.value.set(1.6 / b2a.width, 0); pass(gaussM, b2b);
          gaussM.uniforms.tColor.value = b2b.texture; gaussM.uniforms.dir.value.set(0, 1.6 / b2a.height); pass(gaussM, b2a);
          gaussM.uniforms.tColor.value = b2a.texture; gaussM.uniforms.dir.value.set(2.4 / b2a.width, 0); pass(gaussM, b2b);
          gaussM.uniforms.tColor.value = b2b.texture; gaussM.uniforms.dir.value.set(0, 2.4 / b2a.height); pass(gaussM, b2a);
        }
        // 5. final picture
        const f = finalM.uniforms;
        f.tColor.value = base; f.tBloom1.value = b1a.texture; f.tBloom2.value = b2a.texture; f.res.value.set(W, H);
        f.bloom.value = bloom; f.grade.value = fx.grade ?? 1; f.ca.value = fx.ca || 0; f.zoom.value = fx.zoom || 0;
        f.zoomC.value.set(...(fx.zoomCenter || [0.5, 0.5])); f.whip.value = fx.whip || 0; f.glitch.value = fx.glitch || 0;
        f.vignette.value = fx.vignette ?? 0.55; f.grain.value = fx.grain ?? 0.12; f.t.value = fx.t || 0; f.lift.value = fx.lift || 0; f.mono.value = fx.mono || 0; f.gamma.value = fx.gamma || 1.55; f.redLum.value = fx.redLum || 0;
        pass(finalM, null);
        renderer.autoClear = auto;
      },
    };
    return post;
  }

  RT.post = { create };
})();
