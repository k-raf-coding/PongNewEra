/* Stage: EMPTY DUNES — game/content/stages/dunes.js
   Pattern: theme (warm) + objects ['sand dunes', 'drifting haze', 'low sun'] + unique feature: wide open desert — nowhere to hide.
   Registered via the shared API — rotation, names and build dispatch pick it up. */
registerStage('dunes', { name: 'EMPTY DUNES', theme: 'warm', rotation: 'normal', objects: ['sand dunes', 'drifting haze', 'low sun'], feature: 'wide open desert — nowhere to hide' }, buildStageDunes);

function buildStageDunes(P) {
  const duneMat = new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.55, fog: false });
  const mesaMat = new THREE.MeshBasicMaterial({ color: P.mid, fog: false });
  stageData = { dunes: [], sun: null, clouds: [], floorMarks: [] };
  const mkDune = (w, d, amp, freq, off) => {
    const geo = new THREE.PlaneGeometry(w, d, 40, 5);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(x * freq + off) * amp + Math.sin(x * freq * 2.3 + off * 1.7) * amp * 0.4);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, duneMat);
    m.rotation.x = -Math.PI / 2;
    return m;
  };
  // Two dune rows per flank for a full desert field
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 4; i++) {
        const d = mkDune(360, CL + 300, 14 + i * 6 + row * 8, 0.012 + i * 0.006, i * 2.2 + row);
        d.position.set(side < 0 ? -260 - row * 90 : CW + 260 + row * 90, -6, -CL / 2 + i * (CL + 200) / 3);
        stageGroup.add(d);
        stageData.dunes.push({ mesh: d, speed: (side < 0 ? 1 : -1) * (14 + i * 9 + row * 6) });
      }
    }
  }
  const fd = mkDune(CW + 800, 300, 20, 0.014, 5);
  fd.position.set(CW / 2, -6, -CL / 2 - 220);
  stageGroup.add(fd);
  stageData.dunes.push({ mesh: fd, speed: 8 });
  // Distant mesas + glowing buttes behind the far goal
  let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9; i++) {
    const w = 90 + rnd() * 140, h = 60 + rnd() * 90;
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), mesaMat);
    mesa.position.set((i / 8) * (CW + 600) - 300, h / 2 - 12, -CL / 2 - 210);
    stageGroup.add(mesa);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w - 22, 6, 8), new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.6, fog: false }));
    top.position.set(mesa.position.x, h - 2, -CL / 2 - 210);
    stageGroup.add(top);
  }
  // Wandering sun + horizon band (kept from the classic look)
  const sunCv = document.createElement('canvas'); sunCv.width = 128; sunCv.height = 128;
  const sc = sunCv.getContext('2d');
  const sg = sc.createRadialGradient(64, 64, 6, 64, 64, 64);
  const sunCol = hexStr(P.glow);
  sg.addColorStop(0, sunCol); sg.addColorStop(0.35, sunCol + 'cc'); sg.addColorStop(0.7, sunCol + '66'); sg.addColorStop(1, sunCol + '00');
  sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sunCv), transparent: true, depthWrite: false, fog: false }));
  sun.position.set(CW / 2, CH * 0.62, -CL / 2 - 260);
  stageGroup.add(sun);
  stageData.sun = { mesh: sun };
  const hzCv = document.createElement('canvas'); hzCv.width = 64; hzCv.height = 64;
  const hc = hzCv.getContext('2d');
  const hg = hc.createLinearGradient(0, 0, 0, 64);
  const accStr = hexStr(P.accent);
  hg.addColorStop(0, accStr + '00'); hg.addColorStop(0.5, accStr + '66'); hg.addColorStop(1, accStr + 'cc');
  hc.fillStyle = hg; hc.fillRect(0, 0, 64, 64);
  const hz = new THREE.Mesh(new THREE.PlaneGeometry(CW + 900, 300), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hzCv), transparent: true, depthWrite: false, fog: false, opacity: 0.5 }));
  hz.position.set(CW / 2, 18, -CL / 2 - 190);
  stageGroup.add(hz);
  // Drifting heat-haze clouds
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(120 + i * 30, 26), new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
    c.position.set((i / 5) * (CW + 420) - 210, CH * (0.78 + (i % 2) * 0.1), -CL / 2 - 270);
    stageGroup.add(c);
    stageData.clouds.push({ mesh: c, ph: i * 1.3 });
  }
  // --- Themed rally floor: sand ripples (low sine wash) + darker swash bands ---
  const rippleGeo = new THREE.PlaneGeometry(CW + 60, CL + 60, 40, 8);
  const rp = rippleGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) rp.setZ(i, Math.sin(rp.getX(i) * 0.02) * 3);
  const ripple = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: P.soft, transparent: true, opacity: 0.16, depthWrite: false, fog: false }));
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.set(CW / 2, 0.5, 0);
  stageGroup.add(ripple);
  stageData.floorMarks.push({ mesh: ripple, baseOp: 0.16, ph: 2 });
  floorDecal(46, CL - 60, P.ink, 0.1, 120, 0, 0.5, 1);
  floorDecal(46, CL - 60, P.ink, 0.1, CW - 120, 0, 0.5, 1.6);
}
