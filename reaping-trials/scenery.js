// =====================================================================================
// scenery.js: one function per location (built from Roblox-style "Parts": blocks, wedges, cylinders, spheres).
//
//   RT.scenery.baseplate({ size: 80, color: '#5bb04a' })   → studded floor (used by the viewer)
//   (coming next, one at a time after your approval: sector7Village, sector7Square, capital, trainingCenter, arena, councilHall)
// =====================================================================================
(function () {
  'use strict';
  const RT = window.RT;

  // Classic stud texture (one stud per tile). repeat = how many studs across the floor.
  RT.studTexture = function (color = '#5bb04a', o = {}) {
    const N = 64, tex = RT.canvasTexture(N, N, (g) => {
      g.fillStyle = color; g.fillRect(0, 0, N, N);
      g.fillStyle = 'rgba(0,0,0,0.10)'; g.beginPath(); g.arc(N / 2 + 2, N / 2 + 3, N * 0.27, 0, Math.PI * 2); g.fill();      // stud shadow
      g.fillStyle = RT.shade(color, 0.08); g.beginPath(); g.arc(N / 2, N / 2, N * 0.27, 0, Math.PI * 2); g.fill();          // stud
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2; g.beginPath(); g.arc(N / 2, N / 2, N * 0.22, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, N - 1, N - 1);                         // faint tile seam
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (o.repeat) tex.repeat.set(o.repeat, o.repeat);
    return tex;
  };

  function baseplate(o = {}) {
    const size = o.size || 80, studs = size / RT.STUD;     // one stud = RT.STUD world units
    const mat = new THREE.MeshStandardMaterial({ map: RT.studTexture(o.color || '#5bb04a', { repeat: studs }), roughness: 0.6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.name = 'baseplate';
    return m;
  }

  RT.scenery = { baseplate, locations: ['studio'] };
})();
