/* Stage: VOID NEBULA — game/content/stages/nebula.js
   Pattern: theme (cosmic) + objects ['gas clouds', 'star field', 'drifting rocks'] + unique feature: stars and nebula gas drift behind the court.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('nebula', { name: 'VOID NEBULA', theme: 'cosmic', rotation: 'normal', objects: ['gas clouds', 'star field', 'drifting rocks'], feature: 'stars and nebula gas drift behind the court' }, buildStageNebula);

function buildStageNebula(P) {
  const starMat = new THREE.PointsMaterial({ color: mixHex(P.bg, P.ink, 0.75), size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
  const N = 900;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = (Math.random() - 0.5) * (CW + 1500) + CW / 2;
    positions[i * 3 + 1] = Math.random() < 0.6 ? CH + 60 + Math.random() * 520 : -30 - Math.random() * 460;
    positions[i * 3 + 2] = (Math.random() - 0.5) * (CL + 1900);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(starGeo, starMat);
  stageGroup.add(stars);
  stageData = { stars, glows: [], clouds: [], floorMarks: [] };
  const mkGlow = (color, scale, ph) => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    const col = hexStr(color);
    const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, col + '88'); g.addColorStop(0.5, col + '33'); g.addColorStop(1, col + '00');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
    m.scale.set(scale, scale, 1);
    stageGroup.add(m);
    stageData.glows.push({ mesh: m, base: scale, ph });
    return m;
  };
  const pC = hexOf(P.player), cC = hexOf(P.cpu);
  const g1 = mkGlow(pC, 520, 0); g1.position.set(CW / 2, CH * 0.7, -CL / 2 - 160);
  const g2 = mkGlow(cC, 430, 2.1); g2.position.set(CW / 2, CH * 0.25, -CL / 2 - 220);
  const g3 = mkGlow(mixHex(pC, cC, 0.5), 380, 4.2); g3.position.set(CW / 2, CH * 0.5, CL / 2 + 120);
  // Nebula clouds: big soft drifting blobs
  for (let i = 0; i < 4; i++) {
    const cl = makeStageGlowMesh(i % 2 ? mixHex(pC, cC, 0.5) : pC, 480 + i * 170);
    cl.position.set(CW / 2 + (i % 2 ? -420 : 420), CH * (0.3 + (i % 3) * 0.2), -CL / 2 - 120 - i * 70);
    stageGroup.add(cl);
    stageData.clouds.push({ mesh: cl, ph: i * 1.7 });
  }
  // Moon
  const moon = makeStageGlowMesh(hexOf(P.paper), 150);
  moon.position.set(CW * 0.78, CH * 1.05, -CL / 2 - 200);
  stageGroup.add(moon);
  stageData.clouds.push({ mesh: moon, ph: 3.4 });
  // --- Themed rally floor: a soft light pool + star specks ---
  const floorGlow = makeStageGlowMesh(hexOf(P.player), 430);
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(CW / 2, 0.52, 0);
  stageGroup.add(floorGlow);
  stageData.floorMarks.push({ mesh: floorGlow, baseOp: 0.16, ph: 0 });
  for (let i = 0; i < 44; i++) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(1.4, 6), new THREE.MeshBasicMaterial({ color: P.paper, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
    s.rotation.x = -Math.PI / 2;
    s.position.set(Math.random() * CW, 0.52, (Math.random() - 0.5) * CL);
    stageGroup.add(s);
    stageData.floorMarks.push({ mesh: s, baseOp: 0.35, ph: Math.random() * 6 });
  }
}
