/* Stage: THE MONOLITHS — game/content/stages/peaks.js
   Pattern: theme (stone) + objects ['monolith pillars', 'mist', 'glowing runes'] + unique feature: giant monoliths frame the court like cathedral pillars.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('peaks', { name: 'THE MONOLITHS', theme: 'stone', rotation: 'boss', objects: ['monolith pillars', 'mist', 'glowing runes'], feature: 'giant monoliths frame the court like cathedral pillars' }, buildStagePeaks);

function buildStagePeaks(P) {
  stageData = { monoliths: [], peaks: [], clouds: [], floorMarks: [] };
  const farZ = -CL / 2 - 160;
  const rockMat = new THREE.MeshBasicMaterial({ color: P.mid, fog: false });
  const rockDarkMat = new THREE.MeshBasicMaterial({ color: P.soft, fog: false });
  const runeMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.75, fog: false });
  let seed = 42; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Two mountain layers behind the far goal
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 22 : 12;
    for (let i = 0; i < count; i++) {
      const w = 70 + rnd() * 130, h = 90 + rnd() * 240;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(w / 2, h, 4), (layer === 1 || i % 3 === 0) ? rockDarkMat : rockMat);
      cone.position.set((i / (count - 1)) * (CW + 560) - 280, h / 2 - 16, farZ + layer * 80);
      stageGroup.add(cone);
      stageData.peaks.push({ mesh: cone });
    }
  }
  // Giant stone colossi on the flanks (rough figure: pillar body + head block)
  for (const side of [-1, 1]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(58, 240, 40), rockMat);
    body.position.set(side < 0 ? -170 : CW + 170, 120, CL * 0.28);
    stageGroup.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(46, 56, 40), rockDarkMat);
    head.position.set(body.position.x, 268, body.position.z);
    stageGroup.add(head);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 6), runeMat);
    eye.position.set(body.position.x, 268, body.position.z - 21 * side);
    stageGroup.add(eye);
    stageData.monoliths.push({ mesh: body, side, bands: [eye] });
  }
  // Storm clouds wreathed around the peaks
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(120 + rnd() * 160, 22 + rnd() * 26, 8), new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.5, fog: false }));
    c.position.set((i / 9) * (CW + 500) - 250, 40 + rnd() * 160, farZ + 20 + (rnd() - 0.5) * 50);
    stageGroup.add(c);
    stageData.clouds.push({ mesh: c, ph: rnd() * 6.28 });
  }
  // Twin monolith pillars with rune bands (from the classic look)
  for (const side of [-1, 1]) {
    const h = 420;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(64, h, 64), rockMat);
    pillar.position.set(side < 0 ? -200 : CW + 200, h / 2 - 8, -CL * 0.18);
    stageGroup.add(pillar);
    const bands = [];
    for (let i = 0; i < 4; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(68, 5, 68), runeMat);
      band.position.set(pillar.position.x, h * (0.2 + i * 0.2), pillar.position.z);
      stageGroup.add(band);
      bands.push(band);
    }
    stageData.monoliths.push({ mesh: pillar, side, bands });
  }
  // --- Themed rally floor: glowing fault seams (lava-crack style ink) ---
  for (let i = 0; i < 9; i++) {
    floorLine(60 + i * 64, (i % 2 ? 240 : -260) + Math.sin(i * 2.3) * 70, 26 + (i % 3) * 18, (i % 2 ? 0.55 : -0.55), P.accent, 0.4);
  }
  floorDecal(120, 120, P.ink, 0.12, CW / 2, 0, 0.5, 0);
}
