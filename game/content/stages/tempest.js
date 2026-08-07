/* Stage: THE ETERNAL STORM — game/content/stages/tempest.js
   Pattern: theme (storm) + objects ['storm clouds', 'lightning', 'rain sheets'] + unique feature: lightning backlights the rallies.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('tempest', { name: 'THE ETERNAL STORM', theme: 'storm', rotation: 'boss', objects: ['storm clouds', 'lightning', 'rain sheets'], feature: 'lightning backlights the rallies' }, buildStageTempest);

function buildStageTempest(P) {
  stageData = { clouds: [], bolts: [], rain: [], platforms: [], floorMarks: [] };
  const farZ = -CL / 2 - 160;
  const cloudMat = new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.55, fog: false });
  const rainMat = new THREE.MeshBasicMaterial({ color: P.paper, transparent: true, opacity: 0.22, fog: false, depthWrite: false });
  const runeMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.7, fog: false });
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Layered cloud banks (three depths)
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 18; i++) {
      const w = 120 + rnd() * 200, h = 24 + rnd() * 40;
      const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 10), cloudMat);
      c.position.set((i / 17) * (CW + 560) - 280, 14 + layer * 36 + rnd() * 40, farZ + (rnd() - 0.5) * 90 + layer * 40);
      stageGroup.add(c);
      stageData.clouds.push({ mesh: c, ph: rnd() * 6.28 });
    }
  }
  // Falling rain streaks (many thin planes, animated in updateStage)
  for (let i = 0; i < 46; i++) {
    const rn = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 42), rainMat);
    rn.position.set((i / 45) * (CW + 340) - 170, (i % 6) * 80, farZ + 20 + (i % 4) * 40);
    stageGroup.add(rn);
    stageData.rain.push({ mesh: rn, ph: i * 1.3 });
  }
  // Floating rune platforms
  for (let i = 0; i < 7; i++) {
    const plat = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 70), new THREE.MeshBasicMaterial({ color: P.mid, fog: false }));
    plat.position.set((i / 6) * (CW + 200) - 100, CH * (0.4 + (i % 3) * 0.22), farZ + 40 + (i % 2) * 70);
    stageGroup.add(plat);
    const rune = new THREE.Mesh(new THREE.BoxGeometry(74, 3, 74), runeMat);
    rune.position.set(plat.position.x, plat.position.y - 7, plat.position.z);
    stageGroup.add(rune);
    stageData.platforms.push({ plat, rune, baseY: plat.position.y, ph: i * 0.9 });
  }
  // Lightning bolts (kept, brighter)
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const mats = [];
    let px = 0, py = -40;
    for (let k = 0; k < 5; k++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false });
      const seg = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), mat);
      seg.position.set(px, py, 0);
      g.add(seg);
      mats.push(mat);
      px += (rnd() - 0.5) * 40; py -= 32;
    }
    g.position.set(CW * (0.15 + i * 0.24), CH * 0.85, farZ + 20);
    stageGroup.add(g);
    stageData.bolts.push({ group: g, mats, ph: i });
  }
  // --- Themed rally floor: rain-dark sheen + lightning-scar streaks ---
  floorDecal(CW + 80, CL + 80, P.ink, 0.08, CW / 2, 0, 0.48, 0);
  for (let i = 0; i < 7; i++) {
    floorLine(CW / 2 + (rnd() - 0.5) * CW * 0.7, (rnd() - 0.5) * CL * 0.6, 30 + rnd() * 50, (rnd() - 0.5) * 1.1, P.accent, 0.3);
  }
}
