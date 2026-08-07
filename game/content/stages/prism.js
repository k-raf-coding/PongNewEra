/* Stage: HALL OF PRISMS — game/content/stages/prism.js
   Pattern: theme (prism) + objects ['prism shards', 'light beams', 'reflections'] + unique feature: light splits across the floor with each bounce.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('prism', { name: 'HALL OF PRISMS', theme: 'prism', rotation: 'boss', objects: ['prism shards', 'light beams', 'reflections'], feature: 'light splits across the floor with each bounce' }, buildStagePrism);

function buildStagePrism(P) {
  stageData = { shards: [], panels: [], columns: [], ceiling: [], beams: [], floorMarks: [] };
  const farZ = -CL / 2 - 150;
  const shardA = new THREE.MeshBasicMaterial({ color: mixHex(hexOf(P.player), 0xffffff, 0.3), transparent: true, opacity: 0.85, fog: false });
  const shardB = new THREE.MeshBasicMaterial({ color: mixHex(hexOf(P.cpu), 0xffffff, 0.3), transparent: true, opacity: 0.85, fog: false });
  const panelMat = new THREE.MeshBasicMaterial({ color: P.ink, transparent: true, opacity: 0.12, fog: false });
  const edgeMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.8, fog: false });
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Crystal shards flanking the court (two rows)
  for (let i = 0; i < 30; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = i % 3 === 0 ? 1 : 0;
    const h = 60 + rnd() * 130;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(18 + rnd() * 18, h, 5), i % 3 === 0 ? shardB : shardA);
    cone.position.set(side < 0 ? -140 - row * 70 : CW + 140 + row * 70, h / 2 - 4, -CL / 2 + 60 + (i / 29) * (CL - 160));
    cone.rotation.y = rnd() * Math.PI;
    stageGroup.add(cone);
    stageData.shards.push({ mesh: cone, side, ph: rnd() * 6.28 });
  }
  // Floor-to-ceiling mirror columns behind the flanks
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(16, CH + 120, 16), shardA);
      col.position.set(side < 0 ? -70 : CW + 70, CH / 2, -CL / 2 + 120 + (i / 5) * (CL - 260));
      stageGroup.add(col);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(17, 4, 17), edgeMat);
      seam.position.set(col.position.x, CH * 0.7, col.position.z);
      stageGroup.add(seam);
      stageData.columns.push({ mesh: col, seam, side, ph: i * 1.1 });
    }
  }
  // Hanging ceiling shards
  for (let i = 0; i < 14; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(12 + rnd() * 14, 46 + rnd() * 60, 5), i % 2 ? shardB : shardA);
    cone.position.set((i / 13) * (CW + 120) - 60, CH * 1.1, -CL / 2 + 100 + (i / 13) * (CL - 240));
    cone.rotation.z = Math.PI;   // hang point-down
    stageGroup.add(cone);
    stageData.ceiling.push({ mesh: cone, baseY: CH * 1.1, ph: i * 0.8 });
  }
  // Light beams: angled translucent planes falling from above
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(46, CH * 0.7), new THREE.MeshBasicMaterial({ color: mixHex(hexOf(P.player), 0xffffff, 0.5), transparent: true, opacity: 0.14, fog: false, depthWrite: false }));
    beam.position.set(CW * (0.15 + i * 0.24), CH * 0.35, -CL / 2 + 60 + i * 90);
    beam.rotation.z = (i % 2 ? 0.18 : -0.18);
    stageGroup.add(beam);
    stageData.beams.push({ mesh: beam, ph: i * 1.6 });
  }
  // Reflection panels with glowing seams on the far wall
  for (let i = 0; i < 3; i++) {
    const h = 300;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(300, h), panelMat);
    panel.position.set(CW / 2, CH * (0.3 + i * 0.2), farZ + 4);
    stageGroup.add(panel);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(304, 2.4, 2.4), edgeMat);
    seam.position.set(CW / 2, CH * (0.3 + i * 0.2) - h / 2, farZ + 5);
    stageGroup.add(seam);
    stageData.panels.push({ mesh: panel, seam, ph: i * 2.1 });
  }
  // --- Themed rally floor: mirror checker (alternating translucent tiles) ---
  for (let ix = 0; ix < 8; ix++) {
    for (let iz = 0; iz < 6; iz++) {
      if ((ix + iz) % 2) continue;
      floorDecal(CW / 8 - 7, CL / 6 - 7, P.paper, 0.05, (ix + 0.5) * CW / 8, -CL / 2 + (iz + 0.5) * CL / 6, 0.52, ix + iz);
    }
  }
}
