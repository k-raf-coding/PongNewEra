/* Stage: THE WEB-CAVERN — game/content/stages/hive.js
   Pattern: theme (organic) + objects ['silk webs', 'cocoons', 'hanging pods'] + unique feature: silk strands quiver with every rally.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('hive', { name: 'THE WEB-CAVERN', theme: 'organic', rotation: 'boss', objects: ['silk webs', 'cocoons', 'hanging pods'], feature: 'silk strands quiver with every rally' }, buildStageHive);

function buildStageHive(P) {
  stageData = { web: [], cocoons: [], floorMarks: [] };
  const farZ = -CL / 2 - 150;
  const webMat = new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.5, fog: false });
  const strandMat = new THREE.MeshBasicMaterial({ color: P.mid, transparent: true, opacity: 0.7, fog: false });
  const cocoonMat = new THREE.MeshBasicMaterial({ color: P.paper, transparent: true, opacity: 0.85, fog: false });
  const bandMat = new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.6, fog: false });
  const cx = CW / 2, cy = CH * 0.5;
  // Giant web: 14 spokes + 7 concentric rings
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const len = 340 + (i % 2) * 140;
    const spoke = new THREE.Mesh(new THREE.PlaneGeometry(3, len), strandMat);
    spoke.position.set(cx + Math.cos(ang) * len / 2, cy + Math.sin(ang) * len / 2, farZ + 2);
    spoke.rotation.z = ang - Math.PI / 2;
    stageGroup.add(spoke);
    stageData.web.push({ mesh: spoke, base: len, ph: i * 0.9 });
  }
  for (let r = 1; r <= 7; r++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 64 - 2.4, r * 64, 48), webMat);
    ring.position.set(cx, cy, farZ + 3);
    stageGroup.add(ring);
    stageData.web.push({ mesh: ring, base: r * 64, ph: r * 1.3 });
  }
  // Strand columns flanking the court (tapered pillars of silk)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = -CL / 2 + 120 + (i / 6) * (CL - 260);
      const col = new THREE.Mesh(new THREE.BoxGeometry(7, CH * 1.25, 7), strandMat);
      col.position.set(side < 0 ? -100 : CW + 100, CH * 0.62, z);
      stageGroup.add(col);
      stageData.web.push({ mesh: col, base: 1, ph: i * 0.7 });
    }
  }
  // Hanging cocoons in clusters
  for (let i = 0; i < 18; i++) {
    const x = (i / 17) * (CW + 60) - 30;
    const yTop = CH + 6 - (i % 3) * 26;
    const rope = new THREE.Mesh(new THREE.BoxGeometry(1.6, 22 + (i % 3) * 12, 1.6), strandMat);
    rope.position.set(x, yTop - 14, farZ + 30 + (i % 4) * 18);
    stageGroup.add(rope);
    const pod = new THREE.Mesh(new THREE.BoxGeometry(15, 24, 15), cocoonMat);
    pod.position.set(x, yTop - 38, farZ + 30 + (i % 4) * 18);
    stageGroup.add(pod);
    const band = new THREE.Mesh(new THREE.BoxGeometry(16, 3, 16), bandMat);
    band.position.set(pod.position.x, pod.position.y, pod.position.z);
    stageGroup.add(band);
    stageData.cocoons.push({ rope, pod, x, baseY: pod.position.y, ph: i * 1.1 });
  }
  // Overhead silk strands
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 240 + (i % 3) * 120), strandMat);
    s.position.set((i / 7) * (CW + 40) - 20, CH * 1.08, -CL / 2 + 200 + (i / 7) * (CL - 400));
    stageGroup.add(s);
    stageData.web.push({ mesh: s, base: 1, ph: i * 0.6 });
  }
  // --- Themed rally floor: web lines radiating from center court ---
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI;
    floorLine(CW / 2 + Math.cos(ang) * 140, Math.sin(ang) * 90, CL * 0.6, ang, P.ink, 0.1);
  }
  floorDecal(120, 120, P.paper, 0.07, CW / 2, 0, 0.52, 1);
}
