/* Stage: THE HAUNTED HALLS — game/content/stages/haunt.js
   Pattern: theme (gothic) + objects ['candles', 'portraits', 'cobwebs', 'ground fog'] + unique feature: ghostly glow breathes along the walls.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('haunt', { name: 'THE HAUNTED HALLS', theme: 'gothic', rotation: 'boss', objects: ['candles', 'portraits', 'cobwebs', 'ground fog'], feature: 'ghostly glow breathes along the walls' }, buildStageHaunt);

function buildStageHaunt(P) {
  stageData = { tombs: [], wisps: [], mist: [], floorMarks: [] };
  const farZ = -CL / 2 - 160;
  const tombMat = new THREE.MeshBasicMaterial({ color: P.mid, fog: false });
  const rimMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.7, fog: false });
  const mistMat = new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.13, fog: false, depthWrite: false });
  const darkMat = new THREE.MeshBasicMaterial({ color: P.ink, transparent: true, opacity: 0.5, fog: false });
  let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Graveyard rows: two columns of tombstones per flank
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 16; i++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(14, 24 + rnd() * 22, 5), tombMat);
        t.position.set(side < 0 ? -120 - row * 44 : CW + 120 + row * 44, 12, -CL / 2 + 100 + (i / 15) * (CL - 240));
        t.rotation.z = (rnd() - 0.5) * 0.55;
        stageGroup.add(t);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(15, 3, 6), rimMat);
        rim.position.set(t.position.x, t.position.y + 13 + rnd() * 8, t.position.z);
        stageGroup.add(rim);
        stageData.tombs.push({ mesh: t, rim });
      }
    }
  }
  // Ruined keep behind the far goal: two towers + broken walls
  for (const side of [-1, 1]) {
    const tw = 66 + rnd() * 30, th = 150 + rnd() * 90;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(tw, th, 10), tombMat);
    tower.position.set(CW / 2 + side * 150, th / 2 - 8, farZ);
    stageGroup.add(tower);
    const cren = new THREE.Mesh(new THREE.BoxGeometry(tw + 8, 8, 12), darkMat);
    cren.position.set(tower.position.x, th - 2, farZ);
    stageGroup.add(cren);
    const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.3, 26, 3), rimMat);
    windowGlow.position.set(tower.position.x, th * 0.55, farZ + 4);
    stageGroup.add(windowGlow);
    stageData.wisps.push({ mesh: windowGlow, baseX: tower.position.x, baseY: th * 0.55, ph: rnd() * 6 });
  }
  // Wall of graves behind the far goal
  for (let i = 0; i < 26; i++) {
    const w = 34 + rnd() * 40, h = 30 + rnd() * 60;
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), tombMat);
    g.position.set((i / 25) * (CW + 300) - 150, h / 2 - 10, farZ);
    stageGroup.add(g);
    stageData.tombs.push({ mesh: g, rim: null });
  }
  // Floor mist banks + overhead hanging fog
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(520, 130), mistMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(CW / 2 + (rnd() - 0.5) * 500, 3 + i * 12, -CL / 2 + 160 + i * 330);
    stageGroup.add(m);
    stageData.mist.push({ mesh: m, speed: (rnd() < 0.5 ? -1 : 1) * (20 + rnd() * 30) });
  }
  for (let i = 0; i < 4; i++) {
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(300 + i * 60, 60), mistMat);
    hm.position.set(CW / 2 + (rnd() - 0.5) * 400, CH * 0.9 + i * 30, -CL / 2 + 200 + i * 380);
    stageGroup.add(hm);
    stageData.mist.push({ mesh: hm, speed: (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 20) });
  }
  // Wisp-lights
  for (let i = 0; i < 8; i++) {
    const w = makeStageGlowMesh(i % 2 ? mixHex(hexOf(P.player), hexOf(P.cpu), 0.5) : P.accent, 80 + rnd() * 50);
    w.position.set(CW / 2 + (rnd() - 0.5) * CW, 50 + rnd() * 280, -CL / 2 + 120 + rnd() * (CL - 300));
    stageGroup.add(w);
    stageData.wisps.push({ mesh: w, baseX: w.position.x, baseY: w.position.y, ph: rnd() * 6.28 });
  }
  // --- Themed rally floor: cracked earth + spectral rune patches ---
  for (let i = 0; i < 12; i++) floorLine(CW / 2 + (rnd() - 0.5) * CW * 0.8, (rnd() - 0.5) * CL * 0.7, 20 + rnd() * 60, (rnd() - 0.5) * 1.2, P.ink, 0.22);
  for (let i = 0; i < 4; i++) floorDecal(70, 70, P.accent, 0.12, CW / 2 + (rnd() - 0.5) * CW * 0.5, (rnd() - 0.5) * CL * 0.5, 0.52, i * 1.5);
}
