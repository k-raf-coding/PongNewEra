/* Stage: THE SUNKEN ABYSS — game/content/stages/abyss.js
   Pattern: theme (deep) + objects ['coral', 'bubbles', 'distant glow'] + unique feature: pressure-bent light rays shimmer underwater.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('abyss', { name: 'THE SUNKEN ABYSS', theme: 'deep', rotation: 'boss', objects: ['coral', 'bubbles', 'distant glow'], feature: 'pressure-bent light rays shimmer underwater' }, buildStageAbyss);

function buildStageAbyss(P) {
  stageData = { bubbles: [], kelp: [], shafts: [], fish: [], floorMarks: [] };
  const farZ = -CL / 2 - 150;
  const bubbleMat = new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.7, fog: false, depthWrite: false });
  const kelpMat = new THREE.MeshBasicMaterial({ color: P.mid, transparent: true, opacity: 0.8, fog: false });
  const coralMat = new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.6, fog: false });
  const fishMat = new THREE.MeshBasicMaterial({ color: P.paper, transparent: true, opacity: 0.8, fog: false });
  let seed = 8; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Multiple light shafts following the ball X
  const mkShaft = x => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
    const c = cv.getContext('2d');
    const col = hexStr(P.accent);
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, col + '44'); g.addColorStop(1, col + '00');
    c.fillStyle = g; c.fillRect(0, 0, 64, 128);
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(70, CH + 140), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
    shaft.position.set(x, CH / 2, farZ + 40);
    stageGroup.add(shaft);
    return shaft;
  };
  const shaft = mkShaft(CW / 2);
  stageData.shafts.push({ mesh: shaft, baseX: CW / 2 });
  for (let i = 0; i < 3; i++) {
    const s2 = mkShaft(CW * (0.2 + i * 0.3));
    s2.scale.setScalar(0.7 + rnd() * 0.3);
    stageData.shafts.push({ mesh: s2, baseX: CW * (0.2 + i * 0.3) });
  }
  // Schools of fish swimming along the flanks
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? -1 : 1;
    const f = new THREE.Mesh(new THREE.ConeGeometry(3, 9, 3), fishMat);
    f.rotation.x = Math.PI / 2;
    f.position.set(side < 0 ? -140 - (i % 3) * 30 : CW + 140 + (i % 3) * 30, 40 + (i % 4) * 34, -CL / 2 + 90 + (i / 9) * (CL - 220));
    stageGroup.add(f);
    stageData.fish.push({ mesh: f, baseX: f.position.x, baseY: f.position.y, baseZ: f.position.z, dir: side, speed: 24 + (i % 3) * 14, ph: i * 0.9 });
  }
  // Kelp forest (two rows)
  for (let i = 0; i < 20; i++) {
    const h = 90 + (i % 5) * 70;
    const k = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), kelpMat);
    const row = i % 2 ? 1 : 0;
    k.position.set(row ? CW * 0.05 + (i % 10) * 30 : CW * 0.95 - (i % 10) * 30, h / 2, farZ + 10 + row * 26);
    stageGroup.add(k);
    stageData.kelp.push({ mesh: k, baseX: k.position.x, baseY: h / 2, ph: i * 0.9 });
  }
  // Coral / shipwreck silhouettes on the flanks
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const h = 40 + rnd() * 70;
      const coral = new THREE.Mesh(new THREE.ConeGeometry(16 + rnd() * 12, h, 6), coralMat);
      coral.position.set(side < 0 ? -90 - (i % 2) * 40 : CW + 90 + (i % 2) * 40, h / 2 - 4, -CL / 2 + 140 + i * 360);
      stageGroup.add(coral);
      stageData.kelp.push({ mesh: coral, baseX: coral.position.x, baseY: h / 2, ph: i * 1.2 });
    }
  }
  // Bubbles stay BEHIND the far goal — they read as depth, never as in-play clutter.
  for (let i = 0; i < 14; i++) {
    const bub = new THREE.Mesh(new THREE.SphereGeometry(3 + (i % 4) * 2, 8, 8), bubbleMat);
    bub.position.set((i / 13) * (CW + 160) - 80, 6 + (i % 5) * 30, -CL / 2 - 40 - (i % 4) * 26);
    stageGroup.add(bub);
    stageData.bubbles.push({ mesh: bub, baseX: bub.position.x, baseY: bub.position.y, ph: i * 0.7, speed: 30 + i * 6 });
  }
  // --- Themed rally floor: sand ripples + a light pool that follows the ball ---
  const rippleGeo = new THREE.PlaneGeometry(CW + 60, CL + 60, 40, 8);
  const rp = rippleGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) rp.setZ(i, Math.sin(rp.getX(i) * 0.018) * 3);
  const ripple = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.14, depthWrite: false, fog: false }));
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.set(CW / 2, 0.5, 0);
  stageGroup.add(ripple);
  stageData.floorMarks.push({ mesh: ripple, baseOp: 0.14, ph: 2 });
  const pool = makeStageGlowMesh(hexOf(P.accent), 300);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(CW / 2, 0.53, 0);
  stageGroup.add(pool);
  stageData.floorMarks.push({ mesh: pool, baseOp: 0.13, ph: 0 });
  stageData.pool = pool;
}
