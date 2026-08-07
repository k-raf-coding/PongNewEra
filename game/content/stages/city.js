/* Stage: SKYLINE CITY — game/content/stages/city.js
   Pattern: theme (neon) + objects ['layered skyline', 'leaning towers', 'rooftop neon signs', 'ground glow strips', 'data streams', 'street-lane rally floor'] + unique feature: a dense vertical canyon pressing in on both flanks.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('city', { name: 'SKYLINE CITY', theme: 'neon', rotation: 'normal', objects: ['layered skyline', 'leaning towers', 'rooftop neon signs', 'ground glow strips', 'data streams', 'street-lane rally floor'], feature: 'a dense vertical canyon pressing in on both flanks' }, buildStageCity);

function buildStageCity(P) {
  const farZ = -CL / 2 - 150;
  const skyMat = new THREE.MeshBasicMaterial({ color: P.bg, transparent: true, opacity: 0.94, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(CW + 900, CH + 560), skyMat);
  sky.position.set(CW / 2, CH * 0.42, farZ - 30);
  stageGroup.add(sky);
  const silMat = new THREE.MeshBasicMaterial({ color: P.mid, fog: false });
  const silFarMat = new THREE.MeshBasicMaterial({ color: P.soft, fog: false });
  const rimMat = new THREE.MeshBasicMaterial({ color: P.accent, fog: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.7, fog: false, depthWrite: false });
  let winColA = P.accent, winColB = mixHex(hexOf(P.player), hexOf(P.cpu), 0.5);
  if (theme === 'ink' && winColB === hexOf(P.player)) winColB = P.soft;   // keep e-ink windows visible on gray towers
  stageData = { towers: [], windows: [], signs: [], floorMarks: [] };
  let seed = 1234;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const winMat = col => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, fog: false, depthWrite: false });
  // --- Far skyline: two depth layers of towers behind the CPU goal ---
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 22 : 15;
    const zOff = layer * 70;
    for (let i = 0; i < count; i++) {
      const w = 26 + rnd() * 64, h = 50 + rnd() * 210;
      const bx = (i / (count - 1)) * (CW + 340) - 170 + (rnd() - 0.5) * 60;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), layer === 0 ? silFarMat : silMat);
      b.position.set(bx, h / 2 - 6, farZ + zOff);
      stageGroup.add(b);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 2.4, 4), rimMat);
      edge.position.set(bx, h - 4.8, farZ + zOff);
      stageGroup.add(edge);
      const wm = winMat(i % 3 === 0 ? winColB : winColA);
      const n = 3 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) {
        const wdw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 1.6), wm);
        wdw.position.set(bx + (rnd() - 0.5) * (w - 8), rnd() * (h - 14), farZ + zOff + 2);
        stageGroup.add(wdw);
        stageData.windows.push({ mesh: wdw, ph: rnd() * 6.28, z: farZ + zOff });
      }
      if (layer === 0 && i % 4 === 0) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 4, 3), glowMat);
        sign.position.set(bx, h + 6, farZ + 1);
        stageGroup.add(sign);
        stageData.signs.push({ mesh: sign, ph: rnd() * 6.28 });
      }
    }
  }
  // --- Flanking towers: two rows per side form a full canyon wall ---
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      const xOff = side < 0 ? -110 - row * 62 : CW + 110 + row * 62;
      for (let i = 0; i < 14; i++) {
        const w = 34 + rnd() * 40, h = 120 + rnd() * 190;
        const z = -CL / 2 + 60 + (i / 13) * (CL - 120);
        const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), silMat);
        t.position.set(xOff, h / 2 - 14 + (row ? rnd() * 30 : 0), z);
        stageGroup.add(t);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 2.6, 4), rimMat);
        rim.position.set(xOff, h - 5, z);
        stageGroup.add(rim);
        const band = new THREE.Mesh(new THREE.BoxGeometry(w - 6, 3, 3), winMat(i % 2 ? winColB : winColA));
        band.position.set(xOff, h * 0.45, z);
        stageGroup.add(band);
        stageData.towers.push({ mesh: t, side });
        stageData.windows.push({ mesh: band, ph: rnd() * 6.28, z });
        if (i % 3 === 0) {
          const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 4, 3), glowMat);
          sign.position.set(xOff, h + 6, z);
          stageGroup.add(sign);
          stageData.signs.push({ mesh: sign, ph: rnd() * 6.28 });
        }
      }
    }
  }
  // Ground-level neon strips running the court length outside the play width
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, CL - 60), glowMat);
    strip.position.set(side < 0 ? -26 : CW + 26, 0.8, 0);
    stageGroup.add(strip);
    stageData.signs.push({ mesh: strip, ph: side < 0 ? 0 : 2 });
  }
  // Data streams climbing the skyline (global: also animated in renderSync for vibrant)
  for (let i = 0; i < 30; i++) {
    const sh = 60 + rnd() * 110;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(2.2, sh), new THREE.MeshBasicMaterial({ color: i % 2 ? hexOf(P.player) : hexOf(P.cpu), transparent: true, opacity: 0.4, fog: false, depthWrite: false }));
    sm.position.set((i / 29) * (CW + 240) - 120 + (rnd() - 0.5) * 30, CH * (0.2 + rnd() * 0.7), farZ + 24);
    stageGroup.add(sm);
    dataStreams.push({ mesh: sm, speed: 60 + rnd() * 140 });
  }
  // --- Themed rally floor: neon street lanes + crosswalk ticks ---
  for (let i = -1; i <= 1; i++) floorDecal(5, CL - 120, P.ink, 0.13, CW / 2 + i * 170, 0, 0.5, i * 1.4);
  for (let i = 0; i < 9; i++) {
    floorDecal(56, 4, P.ink, 0.11, CW / 2 - 130, -CL / 2 + 90 + i * 40, 0.5, i);
    floorDecal(56, 4, P.ink, 0.11, CW / 2 + 130, -CL / 2 + 90 + i * 40, 0.5, i + 3);
  }
}
