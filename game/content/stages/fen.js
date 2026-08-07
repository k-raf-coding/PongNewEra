/* Stage: THE CURSED FEN — game/content/stages/fen.js
   Pattern: theme (bog) + objects ['twisted willows', 'fireflies', 'miasma'] + unique feature: wispy lights drift up from the marsh.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('fen', { name: 'THE CURSED FEN', theme: 'bog', rotation: 'boss', objects: ['twisted willows', 'fireflies', 'miasma'], feature: 'wispy lights drift up from the marsh' }, buildStageFen);

function buildStageFen(P) {
  stageData = { runes: [], flames: [], circle: null, trees: [], floorMarks: [] };
  const farZ = -CL / 2 - 150;
  const stoneMat = new THREE.MeshBasicMaterial({ color: P.mid, fog: false });
  const runeMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.85, fog: false });
  const potMat = new THREE.MeshBasicMaterial({ color: P.ink, fog: false });
  const trunkMat = new THREE.MeshBasicMaterial({ color: P.mid, fog: false });
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Ritual circle on the floor behind the CPU goal
  const circle = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(150, 165, 48), runeMat.clone());
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.6;
  circle.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(30, 34, 32), runeMat.clone());
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.7;
  circle.add(ring2);
  circle.position.set(CW / 2, 0, farZ + 80);
  stageGroup.add(circle);
  stageData.circle = circle;
  // Floating rune stones (more, in a ring around the far goal)
  for (let i = 0; i < 14; i++) {
    const x = (i / 13) * (CW + 340) - 170;
    const y = 70 + (i % 3) * 40;
    const z = farZ + 30 + (i % 2) * 60;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 22), stoneMat);
    stone.position.set(x, y, z);
    stageGroup.add(stone);
    const rune = new THREE.Mesh(new THREE.BoxGeometry(23, 4, 23), runeMat);
    rune.position.set(x, y - 12, z);
    stageGroup.add(rune);
    stageData.runes.push({ stone, rune, baseY: y, ph: i * 0.8 });
  }
  // Dead trees on the flanks (trunk + bare branches)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const h = 120 + rnd() * 90;
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), trunkMat);
      trunk.position.set(side < 0 ? -120 - i * 20 : CW + 120 + i * 20, h / 2, -CL / 2 + 100 + i * 240);
      stageGroup.add(trunk);
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(46, 5, 5), trunkMat);
      b1.position.set(trunk.position.x + side * 24, h * 0.72, trunk.position.z);
      stageGroup.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(36, 5, 5), trunkMat);
      b2.position.set(trunk.position.x + side * 18, h * 0.5, trunk.position.z);
      stageGroup.add(b2);
      stageData.trees.push({ trunk, ph: i * 1.4 });
    }
  }
  // Hanging vines from above
  for (let i = 0; i < 8; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(3, 90 + rnd() * 60, 3), trunkMat);
    v.position.set((i / 7) * (CW + 60) - 30, CH * 0.96, -CL / 2 + 120 + (i / 7) * (CL - 260));
    stageGroup.add(v);
    stageData.trees.push({ trunk: v, ph: i * 0.9 });
  }
  // Braziers with flames (4 total)
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      const pot = new THREE.Mesh(new THREE.BoxGeometry(26, 18, 26), potMat);
      pot.position.set(side < 0 ? -90 - row * 60 : CW + 90 + row * 60, 22, -CL / 2 + 140 + row * 300);
      stageGroup.add(pot);
      const flame = makeStageGlowMesh(P.accent, 60);
      flame.position.set(pot.position.x, 44, pot.position.z);
      stageGroup.add(flame);
      stageData.flames.push({ flame, baseY: 44, ph: side < 0 ? 0 : 2 + row });
    }
  }
  // Will-o'-wisps drifting over the swamp
  for (let i = 0; i < 5; i++) {
    const wisp = makeStageGlowMesh(i % 2 ? hexOf(P.player) : P.accent, 46 + i * 10);
    wisp.position.set(CW / 2 + (rnd() - 0.5) * (CW + 200), 60 + rnd() * 140, -CL / 2 + 100 + rnd() * (CL - 200));
    stageGroup.add(wisp);
    stageData.runes.push({ stone: wisp, rune: wisp, baseY: wisp.position.y, ph: i * 1.2 });
  }
  // Crescent moon
  const moon = makeStageGlowMesh(hexOf(P.paper), 120);
  moon.position.set(CW * 0.15, CH * 1.05, farZ);
  stageGroup.add(moon);
  // --- Themed rally floor: murky swamp patches + glowing ritual arcs ---
  for (let i = 0; i < 6; i++) floorDecal(70 + (i % 3) * 40, 90 + (i % 2) * 40, P.ink, 0.14, (i % 2 ? CW * 0.25 : CW * 0.75), (i < 3 ? -300 : 320) + (i % 3) * 120, 0.5, i);
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.Mesh(new THREE.RingGeometry(95 + i * 60, 101 + i * 60, 42, 1, 0, Math.PI), runeMat);
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(CW / 2, 0.56, 0);
    stageGroup.add(arc);
    stageData.floorMarks.push({ mesh: arc, baseOp: 0.4, ph: i * 1.1 });
  }
}
