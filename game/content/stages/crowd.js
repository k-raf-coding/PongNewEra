/* Stage: THE COLOSSEUM — game/content/stages/crowd.js
   Pattern: theme (arena) + objects ['roaring crowd', 'ticker boards', 'spotlight sweeps'] + unique feature: the crowd erupts and surges on every goal.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('crowd', { name: 'THE COLOSSEUM', theme: 'arena', rotation: 'normal', objects: ['roaring crowd', 'ticker boards', 'spotlight sweeps'], feature: 'the crowd erupts and surges on every goal' }, buildStageCrowd);

function buildStageCrowd(P) {
  const bodyMat = new THREE.MeshBasicMaterial({ color: mixHex(P.bg, P.ink, 0.38), fog: false });
  const headMat = new THREE.MeshBasicMaterial({ color: mixHex(P.bg, P.ink, 0.68), fog: false });
  const accMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.5, fog: false, depthWrite: false });
  const standMat = new THREE.MeshBasicMaterial({ color: mixHex(P.bg, P.ink, 0.24), fog: false });
  stageData = { crowd: [], lights: [], board: null, floorMarks: [] };
  for (const side of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      const xOff = side < 0 ? -(120 + row * 27) : CW + 120 + row * 27;
      const standY = 8 + row * 16;
      // Tiered stand bank (raised block)
      const bank = new THREE.Mesh(new THREE.BoxGeometry(24, 12 + row * 7, CL - 80), standMat);
      bank.position.set(xOff, standY + 4, 0);
      stageGroup.add(bank);
      // Glow banner along the tier front
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(CL - 60, 5), accMat);
      banner.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      banner.position.set(xOff - 8 * side, standY + 12, 0);
      stageGroup.add(banner);
      // Spectators filling the tier
      const cols = 24;
      for (let i = 0; i < cols; i++) {
        const z = -CL / 2 + 70 + (i / (cols - 1)) * (CL - 140) + (i % 3) * 7;
        const dx = i % 2 ? -3 : 3;
        const body = new THREE.Mesh(new THREE.BoxGeometry(9, 13, 8), bodyMat);
        body.position.set(xOff + dx, standY + 8, z);
        stageGroup.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), headMat);
        head.position.set(xOff + dx, standY + 18, z);
        stageGroup.add(head);
        stageData.crowd.push({ body, head, x: xOff + dx, baseY: standY + 8, phase: i * 1.3 + row * 0.9 });
      }
      // Overhead light pods
      for (let i = 0; i < 5; i++) {
        const light = makeStageGlowMesh(P.accent, 46);
        light.position.set(xOff - 6 * side, standY + 44, -CL / 2 + 120 + i * (CL - 240) / 4);
        stageGroup.add(light);
        stageData.lights.push({ mesh: light, ph: i * 1.2 + row });
      }
    }
  }
  // LIVE scoreboard above the far goal — shows the real match score
  stageData.board = textPlane(360, 132, ctx => {
    ctx.clearRect(0, 0, 256, 96);
    ctx.fillStyle = theme === 'ink' ? '#191612' : '#0b0d16';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = theme === 'ink' ? '#faf7ee' : '#d8deea';
    ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 90);
    ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#faf7ee'; ctx.fillText(String(scores.p), 64, 50);
    ctx.fillStyle = theme === 'ink' ? '#b9b3a2' : '#94a3b8'; ctx.fillText('·', 128, 44);
    ctx.fillStyle = theme === 'ink' ? '#faf7ee' : '#ffffff'; ctx.fillText(String(scores.c), 192, 50);
  });
  stageData.board.mesh.position.set(CW / 2, CH * 0.95, -CL / 2 - 60);
  stageData.board.lastP = -1; stageData.board.lastC = -1;
  // --- Themed rally floor: painted court — center emblem + edge bands ---
  floorDecal(180, 180, P.ink, 0.1, CW / 2, 0, 0.5, 0);
  floorDecal(120, 120, P.ink, 0.12, CW / 2, 0, 0.52, 2);
  floorDecal(52, CL - 40, P.accent, 0.08, 90, 0, 0.5, 1);
  floorDecal(52, CL - 40, P.accent, 0.08, CW - 90, 0, 0.5, 1.5);
}
