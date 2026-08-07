/* Stage: SKYLINE CITY - game/content/stages/city.js
   Pattern: theme (neon) + objects ['full night star sky', 'static skyline towers', 'neon signs + billboards', 'elevated monorail', 'utility cables', 'storefronts', 'wet neon street', 'street life'] + unique feature: a dense vertical neon canyon pressing in on both flanks.
   Registered via the shared API - rotation, names and build dispatch pick it up. */
registerStage('city', { name: 'SKYLINE CITY', theme: 'neon', rotation: 'normal', objects: ['star night sky', 'static skyline towers', 'neon signs + billboards', 'monorail + cables', 'storefronts', 'wet neon street', 'street life'], feature: 'a dense neon canyon pressing in on both flanks' }, buildStageCity);

function drawCityCell(src, bright) {
  const cell = src.cell;
  const col = hexStr(mixHex(hexOf(cell.base), 0x07080f, 1 - bright));
  src.c.shadowColor = col; src.c.shadowBlur = 3.5 * bright;
  src.c.fillStyle = col;
  src.c.fillRect(cell.x, cell.y, cell.w, cell.h);
  src.c.shadowBlur = 0;
  src.tex.needsUpdate = true;
}

function buildStageCity(P) {
  const farZ = -CL / 2 - 150;
  stageData = { floorMarks: [], winPool: [], steam: [], peds: [] };
  let seed = 1234;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pC = hexOf(P.player), cC = hexOf(P.cpu);
  const isInk = theme === 'ink';

  // Theme-aware neon set: player-side cyan, cpu-side pink/ember, warm window light.
  const neonA = isInk ? 0x191612 : mixHex(pC, 0xffffff, 0.30);
  const neonB = isInk ? 0xc0392b : mixHex(cC, 0xffffff, 0.30);
  const neonMix = isInk ? 0x6b6659 : mixHex(pC, cC, 0.5);
  const winWarm = isInk ? 0x191612 : mixHex(0xffd76a, 0xfff3d6, 0.45);
  const winCool = isInk ? 0x6b6659 : mixHex(pC, 0xffffff, 0.30);

  // Building silhouettes get darker the closer they sit - deep near-black slate so
  // the neon windows and signs pop like the night-street reference.
  const silFar = mixHex(mixHex(P.bg, P.ink, 0.14), 0x000000, 0.50);
  const silMid = mixHex(mixHex(P.bg, P.ink, 0.30), 0x000000, 0.60);
  const silNear = mixHex(mixHex(P.bg, P.ink, 0.46), 0x000000, 0.66);

  const mat = col => new THREE.MeshBasicMaterial({ color: col, fog: false });
  const winMat = col => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
  const glowMat = col => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, fog: false, depthWrite: false });

  /* --- FULL night sky: a giant static star dome that surrounds the whole arena,
     so the night sky + stars fill the entire background (not just a band behind
     the far goal). Canvas v=0 is the zenith, v=0.5 is the horizon, below is haze. --- */
  const skyCv = document.createElement('canvas'); skyCv.width = 1024; skyCv.height = 640;
  const sctx = skyCv.getContext('2d');
  const horizonCol = hexStr(isInk ? 0x5c5850 : mixHex(mixHex(pC, cC, 0.5), 0xffffff, 0.25));
  const skyGrad = sctx.createLinearGradient(0, 0, 0, 640);
  skyGrad.addColorStop(0, hexStr(mixHex(P.bg, 0x000000, isInk ? 0.15 : 0.5)));
  skyGrad.addColorStop(0.38, hexStr(mixHex(P.bg, 0x000000, isInk ? 0.08 : 0.25)));
  skyGrad.addColorStop(0.5, horizonCol);
  skyGrad.addColorStop(0.62, hexStr(mixHex(P.bg, 0x000000, 0.35)));
  skyGrad.addColorStop(1, hexStr(mixHex(P.bg, 0x000000, 0.5)));
  sctx.fillStyle = skyGrad; sctx.fillRect(0, 0, 1024, 640);
  const neb = sctx.createRadialGradient(760, 130, 10, 760, 130, 330);
  neb.addColorStop(0, isInk ? 'rgba(120,112,96,0.10)' : 'rgba(140,120,255,0.07)');
  neb.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = neb; sctx.fillRect(0, 0, 1024, 640);
  // Stars: a casual night sky - small crisp pin-pricks. Most stars are drawn as
  // sharp 1px dots (fillRect) so they read as distant pin-pricks, a few slightly
  // brighter ones get a soft 1-1.3px dot, and no big flare crosses.
  for (let i = 0; i < 480; i++) {
    const x = rnd() * 1024, y = 8 + rnd() * 300;
    const roll = rnd();
    const a = 0.3 + rnd() * 0.55;
    const w = rnd();
    const rgb = w < 0.12 ? '255,240,210' : w < 0.30 ? '190,220,255' : '255,255,255';
    sctx.fillStyle = 'rgba(' + rgb + ',' + a + ')';
    if (roll < 0.05) { sctx.beginPath(); sctx.arc(x, y, 1.3, 0, Math.PI * 2); sctx.fill(); }
    else if (roll < 0.25) { sctx.beginPath(); sctx.arc(x, y, 1.0, 0, Math.PI * 2); sctx.fill(); }
    else { sctx.fillRect(x, y, 1, 1); }
  }
  // A faint sprinkle of stars just below the horizon (distant city haze).
  for (let i = 0; i < 50; i++) {
    sctx.fillStyle = 'rgba(255,255,255,0.10)';
    sctx.beginPath(); sctx.arc(rnd() * 1024, 334 + rnd() * 48, 0.6, 0, Math.PI * 2); sctx.fill();
  }
  // The star dome itself: a huge back-facing sphere centered over the court. The
  // camera always sits inside it, so the sky wraps the whole view. (Camera far=4000,
  // camera is ~1180 from the dome center, so the far dome is ~3680 - safely inside.)
  const skyTex = new THREE.CanvasTexture(skyCv);
  skyTex.generateMipmaps = false;   // keep stars crisp, not smeared blobs
  skyTex.minFilter = THREE.LinearFilter;
  skyTex.magFilter = THREE.LinearFilter;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  sky.position.set(CW / 2, CH * 0.5, 0);
  sky.frustumCulled = false;
  stageGroup.add(sky);
  const horizon = makeStageGlowMesh(isInk ? mixHex(0xc0392b, 0xffffff, 0.5) : mixHex(pC, cC, 0.5), 820);
  horizon.position.set(CW / 2, CH * 0.10, farZ - 6);
  horizon.material.opacity = 0.5;
  stageGroup.add(horizon);

  /* --- Far skyline: three static depth layers of dark towers with lit windows --- */
  const LAYERS = [
    { count: 34, zOff: -30,  sil: mixHex(silFar, 0x000000, 0.45), win: winCool, winOp: 0.5,  winW: 6.0, winH: 8.0, rows: [1, 2], w: 0.3 },
    { count: 34, zOff: 0,    sil: silFar,  win: winCool, winOp: 0.7,  winW: 4.2, winH: 6.2, rows: [2, 4], w: 0.4 },
    { count: 24, zOff: 55,   sil: silMid,  win: winWarm, winOp: 0.85, winW: 2.6, winH: 4.0, rows: [4, 6], w: 0.55 },
    { count: 16, zOff: 110,  sil: silNear, win: winCool, winOp: 0.8,  winW: 2.0, winH: 3.4, rows: [4, 7], w: 0.7 },
    { count: 10, zOff: 140,  sil: mixHex(silNear, 0x000000, 0.25), win: winWarm, winOp: 0.9, winW: 1.7, winH: 2.8, rows: [5, 9], w: 0.9 },
  ];
  for (let li = 0; li < LAYERS.length; li++) {
    const L = LAYERS[li];
    for (let i = 0; i < L.count; i++) {
      const w = 24 + rnd() * 66;
      const h = 58 + rnd() * (li === 1 ? 300 : 235);
      const bx = (i / (L.count - 1)) * (CW + 560) - 280 + (rnd() - 0.5) * 40;
      const z = farZ + L.zOff;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), mat(L.sil));
      b.position.set(bx, h / 2 - 8, z);
      stageGroup.add(b);
      // Lit windows: a static grid, no flicker.
      const rows = L.rows[0] + Math.floor(rnd() * (L.rows[1] - L.rows[0] + 1));
      const cols = 1 + Math.floor(rnd() * 3);
      for (let r2 = 0; r2 < rows; r2++) {
        for (let c2 = 0; c2 < cols; c2++) {
          if (rnd() < 0.42) continue;
          const wdw = new THREE.Mesh(new THREE.BoxGeometry(L.winW, L.winH, 1.4), winMat(rnd() < 0.72 ? L.win : neonMix));
          wdw.material.opacity = L.winOp;
          wdw.position.set(bx + (c2 - (cols - 1) / 2) * (w / Math.max(cols, 1)) * 0.6, (r2 + 0.5) * (h / rows) * 0.8, z + 2);
          stageGroup.add(wdw);
          stageData.winPool.push({ kind: 'mesh', mesh: wdw, baseOp: L.winOp, w: L.w || 0.5 });
        }
      }
      // Rooftop neon line on taller towers (static).
      if (li >= 1 && rnd() < 0.55) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 3, 1.8, 3), glowMat(li === 1 ? neonB : neonA));
        edge.position.set(bx, h - 1, z);
        stageGroup.add(edge);
      }
      // Tiny antenna masts on some far towers (static).
      if (li >= 2 && rnd() < 0.45) {
        const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14 + rnd() * 18, 1.2), mat(mixHex(L.sil, 0x000000, 0.4)));
        mast.position.set(bx, h + 6 + 7, z);
        stageGroup.add(mast);
      }
    }
  }

  /* --- Neon sign helper: bakes a glowing canvas texture (fully static) --- */
  const mkNeon = (w, h, texW, texH, draw) => {
    const cv = document.createElement('canvas'); cv.width = texW; cv.height = texH;
    const ctx = cv.getContext('2d');
    draw(ctx, cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
    stageGroup.add(m);
    return m;
  };
  const hex = c => hexStr(c);

  // Vertical "LIFE" neon sign (tall, left-of-center skyline).
  const lifeSign = mkNeon(34, 190, 68, 380, ctx => {
    const col = hex(isInk ? 0x191612 : (theme === 'sunset' ? pC : cC));
    ctx.clearRect(0, 0, 68, 380);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px "Silkscreen", "Pixelify Sans", sans-serif';
    ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) ctx.fillText('LIFE'[i], 34, 55 + i * 92);
  });
  lifeSign.position.set(CW * 0.22, CH * 0.72, farZ + 130);

  // Tall vertical neon sign on the far right (pink) with stylized glyph strokes.
  const pinkSign = mkNeon(30, 170, 60, 340, ctx => {
    const col = hex(neonB);
    ctx.clearRect(0, 0, 60, 340);
    ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.strokeStyle = col; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 26); ctx.lineTo(30, 314);
    ctx.moveTo(16, 62); ctx.lineTo(44, 62);
    ctx.moveTo(16, 142); ctx.lineTo(44, 142);
    ctx.moveTo(16, 222); ctx.lineTo(44, 222);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
  pinkSign.position.set(CW * 0.86, CH * 0.62, farZ + 138);

  // Vertical cyan sign mid-left.
  const cyanSign = mkNeon(26, 140, 52, 280, ctx => {
    const col = hex(neonA);
    ctx.clearRect(0, 0, 52, 280);
    ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.strokeStyle = col; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(26, 18); ctx.lineTo(26, 262);
    for (let i = 1; i <= 4; i++) { ctx.moveTo(14, 30 + i * 50); ctx.lineTo(38, 30 + i * 50); }
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
  cyanSign.position.set(CW * 0.10, CH * 0.52, farZ + 142);

  // Bordered billboard with a glowing inner graphic (upper center).
  const bill = mkNeon(120, 72, 240, 144, ctx => {
    ctx.clearRect(0, 0, 240, 144);
    ctx.strokeStyle = hex(neonA); ctx.lineWidth = 6; ctx.shadowColor = hex(neonA); ctx.shadowBlur = 12;
    ctx.strokeRect(8, 8, 224, 128);
    ctx.shadowColor = hex(neonB); ctx.shadowBlur = 16; ctx.fillStyle = hex(neonB);
    ctx.beginPath(); ctx.arc(120, 72, 30, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hex(neonA); ctx.fillRect(70, 62, 100, 20);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(88, 30, 64, 8);
  });
  bill.position.set(CW * 0.55, CH * 0.78, farZ + 142);

  // Square orange icon sign (mid-right).
  const iconSign = mkNeon(40, 40, 80, 80, ctx => {
    const col = isInk ? 0xc0392b : 0xffb84d;
    ctx.clearRect(0, 0, 80, 80);
    ctx.shadowColor = hex(col); ctx.shadowBlur = 14; ctx.fillStyle = hex(col);
    ctx.beginPath(); ctx.arc(40, 40, 24, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(30, 30, 20, 20);
  });
  iconSign.position.set(CW * 0.68, CH * 0.44, farZ + 150);
  /* --- Elevated monorail + lit train crossing the skyline (static) --- */
  const railZ = farZ + 130, railY = CH * 0.78;
  const track = new THREE.Mesh(new THREE.BoxGeometry(CW + 560, 3.6, 6), mat(silNear));
  track.position.set(CW / 2, railY, railZ);
  stageGroup.add(track);
  for (let i = 0; i < 8; i++) {
    const pyl = new THREE.Mesh(new THREE.BoxGeometry(3.4, railY, 5), mat(silMid));
    pyl.position.set(-240 + i * 130 + (rnd() - 0.5) * 20, railY / 2, railZ + 4);
    stageGroup.add(pyl);
  }
  const train = new THREE.Group();
  const car = new THREE.Mesh(new THREE.BoxGeometry(150, 24, 14), mat(silNear));
  train.add(car);
  const winBand = new THREE.Mesh(new THREE.BoxGeometry(146, 8, 3), glowMat(isInk ? 0x6b6659 : 0xfff3d6));
  winBand.position.set(0, 4, 7);
  train.add(winBand);
  const headLamp = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 3), glowMat(neonA));
  headLamp.position.set(74, 0, 7);
  train.add(headLamp);
  train.position.set(CW * 0.60, railY - 16, railZ);
  stageGroup.add(train);

  /* --- Utility cables sagging across the upper sky (static lines) --- */
  for (let ci = 0; ci < 5; ci++) {
    const x1 = -80 + rnd() * 60, x2 = CW + 80 - rnd() * 60;
    const y1 = CH * (0.85 + rnd() * 0.35), y2 = CH * (0.55 + rnd() * 0.35);
    const sag = CH * (0.10 + rnd() * 0.12);
    const z = farZ + 80 + ci * 9;
    const pts = [];
    const segs = 10;
    for (let s2 = 0; s2 <= segs; s2++) {
      const t = s2 / segs;
      pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * sag, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: isInk ? 0x8a8578 : mixHex(P.bg, 0xffffff, 0.45), transparent: true, opacity: 0.85, fog: false }));
    stageGroup.add(line);
  }

  /* --- Flanking canyon walls: deep 3D towers - textured facades with window grids,
     protruding balconies, rooftop setbacks + antennas, and glowing storefronts.
     Every piece is static. --- */
  const facadeTex = (sil, w, h) => {
    const TW = 128;
    const TH = Math.round(Math.min(512, Math.max(160, 128 * (h / w))));
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    const c = cv.getContext('2d');
    const cells = [];
    const g = c.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, hexStr(mixHex(sil, 0xffffff, 0.05)));
    g.addColorStop(0.72, hexStr(sil));
    g.addColorStop(1, hexStr(mixHex(sil, 0xffffff, 0.10)));
    c.fillStyle = g; c.fillRect(0, 0, TW, TH);
    for (let n = 0; n < 800; n++) {
      c.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255,0.05' : '0,0,0,0.08') + ')';
      c.fillRect(rnd() * TW, rnd() * TH, 1.6, 1.6);
    }
    const cols = 6 + Math.floor(rnd() * 4);
    const rows = Math.max(6, Math.floor(TH / 20) - 1);
    const rowStep = TH / rows;
    const cw = 11;
    const litRatio = isInk ? 0.32 : 0.5 + rnd() * 0.28;
    for (let r2 = 0; r2 < rows; r2++) {
      for (let c2 = 0; c2 < cols; c2++) {
        const wx = 6 + c2 * ((TW - 12) / cols) + (rnd() - 0.5) * 2;
        const wy = 6 + r2 * rowStep + (rnd() - 0.5) * 2;
        const chh = 10 + rnd() * 5;
        if (rnd() > litRatio) {
          c.fillStyle = 'rgba(0,0,0,0.34)';
          c.fillRect(wx, wy, cw, chh);
        } else {
          const lit = rnd();
          const col = lit < 0.58 ? winWarm : lit < 0.84 ? winCool : (rnd() < 0.5 ? neonA : neonB);
          c.shadowColor = hexStr(col); c.shadowBlur = 4;
          c.fillStyle = hexStr(mixHex(col, 0xffffff, 0.25));
          c.fillRect(wx, wy, cw, chh);
          c.shadowBlur = 0;
          cells.push({ x: wx, y: wy, w: cw, h: chh, base: hexStr(mixHex(col, 0xffffff, 0.25)) });
        }
      }
      // thin floor slab line between storeys
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.fillRect(0, 6 + (r2 + 1) * rowStep - 1, TW, 1.4);
    }
    for (let v = 0; v < 2; v++) {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(8 + rnd() * (TW - 34), 46 + rnd() * (TH - 110), 20 + rnd() * 12, 11 + rnd() * 7);
    }
    if (rnd() < 0.5) {
      const col = rnd() < 0.5 ? neonA : neonB;
      c.shadowColor = hexStr(col); c.shadowBlur = 7; c.fillStyle = hexStr(col);
      c.fillRect(rnd() < 0.5 ? 2 : TW - 6, 6, 4, TH - 12);
      c.shadowBlur = 0;
    }
    const tex = new THREE.CanvasTexture(cv);
    return { tex, c, cells };
  };

  // Register facade cells for the slow window-dimming cycle: each entry carries a
  // weight (bigger/brighter windows get picked more) and a small cluster of sibling
  // cells, so a whole patch of lights visibly shuts off together.
  const regCells = texObj => {
    const n = texObj.cells.length;
    for (let ci = 0; ci < n; ci++) {
      const entry = { kind: 'cell', tex: texObj.tex, c: texObj.c, cell: texObj.cells[ci], w: 1.3 };
      entry.sibs = [];
      for (let k = 1; k <= 3; k++) {
        const j = (ci + k) % n;
        entry.sibs.push({ kind: 'cell', tex: texObj.tex, c: texObj.c, cell: texObj.cells[j] });
      }
      stageData.winPool.push(entry);
    }
  };
  for (const side of [-1, 1]) {
    const prot = -side;                    // direction toward the court center (X)
    for (let row = 0; row < 3; row++) {
      const xOff = side < 0 ? -110 - row * 68 : CW + 110 + row * 68;
      for (let i = 0; i < 16; i++) {
        const w = 34 + rnd() * 40;
        const h = 130 + rnd() * 230;
        const depth = 16 + rnd() * 26;
        const z = -CL / 2 + 60 + (i / 13) * (CL - 120) + (rnd() - 0.5) * 8;
        const sil = row ? silNear : silMid;
        const darkTop = mixHex(sil, 0x000000, 0.28);
        // Textured body: facade on the camera-facing (+Z) face, plain elsewhere.
        const ft = facadeTex(sil, w, h);
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [
          mat(sil), mat(sil),
          mat(darkTop), mat(mixHex(sil, 0x000000, 0.42)),
          new THREE.MeshBasicMaterial({ map: ft.tex, fog: false }),
          mat(mixHex(sil, 0x000000, 0.35)),
        ]);
        body.position.set(xOff, h / 2 - 14 + (row ? rnd() * 30 : 0), z);
        stageGroup.add(body);
        regCells(ft);
        // Front balconies: thin ledges jutting toward the camera across the facade.
        const balcN = 2 + Math.floor(rnd() * 3);
        for (let b2 = 0; b2 < balcN; b2++) {
          const bl = new THREE.Mesh(new THREE.BoxGeometry(w * (0.55 + rnd() * 0.35), 2.4, 4), mat(mixHex(sil, 0xffffff, 0.08)));
          bl.position.set(xOff, (h - 20) * (0.28 + (b2 / balcN) * 0.55) + (rnd() - 0.5) * 8, z + depth / 2 + 2);
          stageGroup.add(bl);
        }
        // Side ledges stepping out toward the court (depth silhouette).
        if (rnd() < 0.65) {
          const sl = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, w * 0.6), mat(mixHex(sil, 0xffffff, 0.06)));
          sl.position.set(xOff + prot * (depth / 2 + 3), (h - 24) * (0.35 + rnd() * 0.4), z);
          stageGroup.add(sl);
        }
        // Rooftop setback: stepped upper floor with its own lit facade + ledge.
        if (h > 140 && rnd() < 0.6) {
          const sh2 = h * (0.16 + rnd() * 0.1);
          const sw = w * (0.55 + rnd() * 0.15);
          const ft2 = facadeTex(sil, sw, sh2);
          const top = new THREE.Mesh(new THREE.BoxGeometry(sw, sh2, depth * 0.8), [
            mat(sil), mat(sil), mat(darkTop), mat(darkTop),
            new THREE.MeshBasicMaterial({ map: ft2.tex, fog: false }),
            mat(darkTop),
          ]);
          top.position.set(xOff, h - 14 + sh2 / 2, z);
          stageGroup.add(top);
          regCells(ft2);
          const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 3, 2.4, depth + 5), mat(mixHex(sil, 0xffffff, 0.1)));
          ledge.position.set(xOff, h - 14, z);
          stageGroup.add(ledge);
        }
        // Rooftop clutter: water towers + AC clusters on many buildings (static).
        if (rnd() < 0.5) {
          const wtH = 10 + rnd() * 8;
          const wt = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, wtH, 10), mat(mixHex(sil, 0x000000, 0.35)));
          wt.position.set(xOff + (rnd() - 0.5) * w * 0.4, h - 14 + wtH / 2 + 5, z);
          stageGroup.add(wt);
          const legs = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 10), mat(mixHex(sil, 0x000000, 0.5)));
          legs.position.set(wt.position.x, h - 14 + 4, z);
          stageGroup.add(legs);
        }
        if (rnd() < 0.45) {
          const ac = new THREE.Mesh(new THREE.BoxGeometry(6 + rnd() * 6, 4, 6 + rnd() * 6), mat(mixHex(sil, 0xffffff, 0.05)));
          ac.position.set(xOff + (rnd() - 0.5) * w * 0.5, h - 14 + 5, z);
          stageGroup.add(ac);
        }
        // Antenna mast with a neon tip on most towers.
        if (rnd() < 0.6) {
          const aH = 30 + rnd() * 52;
          const ax = xOff + (rnd() - 0.5) * w * 0.4;
          const ant = new THREE.Mesh(new THREE.BoxGeometry(1.8, aH, 1.8), mat(mixHex(sil, 0x000000, 0.55)));
          ant.position.set(ax, h - 14 + aH / 2 + 8, z);
          stageGroup.add(ant);
          if (rnd() < 0.6) {
            const tip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), glowMat(rnd() < 0.5 ? neonA : neonB));
            tip.position.set(ax, h - 14 + aH + 8, z);
            stageGroup.add(tip);
          }
        }
        // Rooftop neon sign.
        if (i % 4 === 0) {
          const signH = 26 + rnd() * 26;
          const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, signH, 2.4), glowMat(i % 8 === 0 ? neonB : neonA));
          sign.position.set(xOff, h + signH / 2 + 4, z);
          stageGroup.add(sign);
        }
        // Street-level storefront detail: awnings + glowing display windows.
        if (row === 0 && i % 4 === 2) {
          const aw = new THREE.Mesh(new THREE.BoxGeometry(Math.min(30, w * 0.6), 2.2, 12), mat(mixHex(sil, 0xffffff, 0.1)));
          aw.position.set(xOff, 34, z + depth / 2 + 2);
          aw.rotation.x = -0.3;
          stageGroup.add(aw);
          const awEdge = new THREE.Mesh(new THREE.BoxGeometry(Math.min(30, w * 0.6) + 1, 1.4, 1.4), glowMat(neonA));
          awEdge.position.set(xOff, 32.4, z + depth / 2 + 8);
          stageGroup.add(awEdge);
        }
        if (row === 0 && i % 3 === 1) {
          for (let w2 = 0; w2 < 2; w2++) {
            const wx = xOff + (w2 === 0 ? -8 : 8);
            const dWin = new THREE.Mesh(new THREE.BoxGeometry(11, 16, 2.4), glowMat(w2 === 0 ? neonB : neonA));
            dWin.position.set(wx, 16, z + depth / 2 + 2);
            stageGroup.add(dWin);
            const shade = new THREE.Mesh(new THREE.BoxGeometry(13, 17.5, 1), mat(mixHex(sil, 0x000000, 0.5)));
            shade.position.set(wx, 16, z + depth / 2 + 0.9);
            stageGroup.add(shade);
          }
        }
        // Glowing storefront doorway + sign strip + light pool at street level.
        if (i % 3 === 0) {
          const doorCol = (i % 6 === 0) !== (side < 0) ? neonB : neonA;
          const door = new THREE.Mesh(new THREE.BoxGeometry(16, 34, 2), glowMat(doorCol));
          door.position.set(xOff, 14, z + depth / 2 + 2);
          stageGroup.add(door);
          const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 3, 2), glowMat(doorCol));
          strip.position.set(xOff, 34, z + depth / 2 + 3);
          stageGroup.add(strip);
          const pool = makeStageGlowMesh(doorCol, 96);
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(xOff + prot * 8, 0.7, z);
          stageGroup.add(pool);
        }
      }
    }
  }

  /* --- Street life: silhouetted pedestrians + steam vents (ambient, buildings stay put) --- */
  const mkPed = (x, z, dir, glow) => {
    const g = new THREE.Group();
    const sk = mixHex(P.bg, 0x000000, 0.6);
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, 11, 3.6), mat(sk));
    body.position.y = 16;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.7, 10, 8), mat(sk));
    head.position.y = 23.5;
    g.add(head);
    const legL = new THREE.Group(); legL.position.set(-1.7, 11, 0);
    const legML = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.4), mat(sk)); legML.position.y = -4.5; legL.add(legML);
    const legR = new THREE.Group(); legR.position.set(1.7, 11, 0);
    const legMR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.4), mat(sk)); legMR.position.y = -4.5; legR.add(legMR);
    const armL = new THREE.Group(); armL.position.set(-3.8, 20, 0);
    const armML = new THREE.Mesh(new THREE.BoxGeometry(1.8, 7.5, 1.8), mat(sk)); armML.position.y = -3.5; armL.add(armML);
    const armR = new THREE.Group(); armR.position.set(3.8, 20, 0);
    const armMR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 7.5, 1.8), mat(sk)); armMR.position.y = -3.5; armR.add(armMR);
    g.add(legL, legR, armL, armR);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 1.4), glowMat(glow));
    visor.position.set(0, 23.8, 2.6);
    g.add(visor);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.4, 1.4), glowMat(glow));
    trim.position.set(0, 11.6, 2.2);
    g.add(trim);
    g.position.set(x, 0, z);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    stageGroup.add(g);
    stageData.peds.push({ group: g, dir, speed: 11 + rnd() * 9, ph: rnd() * 6.28, legL, legR, armL, armR, visor, minZ: -CL / 2 - 40, maxZ: CL / 2 + 40 });
  };
  const pedSpots = [-CL * 0.28, -CL * 0.05, CL * 0.16, CL * 0.36];
  for (let pi = 0; pi < 8; pi++) {
    const left = pi % 2 === 0;
    mkPed(left ? -24 - (pi % 4) * 4 : CW + 52 + (pi % 4) * 5, pedSpots[pi % 4] + (Math.random() - 0.5) * 26, left ? 1 : -1, left ? neonB : neonA);
  }
  const steamTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 192;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 108, 4, 64, 108, 100);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 192);
    return new THREE.CanvasTexture(cv);
  })();
  const mkVent = (x, z, sc) => {
    const grate = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 9), mat(mixHex(P.bg, 0x000000, 0.6)));
    grate.position.set(x, 0.8, z);
    stageGroup.add(grate);
    const plume = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    plume.position.set(x, 2, z);
    plume.scale.set(sc, sc * 1.6, 1);
    stageGroup.add(plume);
    stageData.steam.push({ mesh: plume, baseY: 2, rise: 70 + rnd() * 60, dur: 6.5 + rnd() * 4, ph: rnd() * 10, maxOp: 0.3 + rnd() * 0.14, baseScale: sc });
  };
  mkVent(-58, -CL * 0.10, 26);
  mkVent(CW + 58, CL * 0.12, 30);
  mkVent(-54, CL * 0.36, 22);
  // Foreground HVAC box with circular vents - far-left street edge, static.
  const hvacG = new THREE.Group();
  const hv = mixHex(0x4a4c52, 0x000000, 0.58);
  const hvDark = mixHex(0x4a4c52, 0x000000, 0.78);
  const hvBox = new THREE.Mesh(new THREE.BoxGeometry(50, 74, 34), [mat(hvDark), mat(hvDark), mat(hvDark), mat(hvDark), mat(mixHex(hv, 0xffffff, 0.08)), mat(hvDark)]);
  hvBox.position.y = 37;
  hvacG.add(hvBox);
  const ventCol = mixHex(0x5c5e64, 0xffffff, 0.22);
  for (let vi = 0; vi < 3; vi++) {
    const vy = 33 + (vi % 2) * 19;
    const vent = new THREE.Mesh(new THREE.CircleGeometry(9.5, 20), mat(ventCol));
    vent.position.set(-15 + vi * 15, vy, 17.5);
    hvacG.add(vent);
    const rim = new THREE.Mesh(new THREE.RingGeometry(9.5, 11.5, 20), mat(mixHex(ventCol, 0xffffff, 0.25)));
    rim.position.set(-15 + vi * 15, vy, 17.7);
    hvacG.add(rim);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(1.8, 12), mat(mixHex(ventCol, 0xffffff, 0.35)));
    hub.position.set(-15 + vi * 15, vy, 17.9);
    hvacG.add(hub);
  }
  for (let vi = 0; vi < 2; vi++) {
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 8), mat(hvDark));
    pipe.position.set(-12 + vi * 24, 79, 0);
    hvacG.add(pipe);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 2, 12), mat(mixHex(hvDark, 0xffffff, 0.1)));
    cap.position.set(-12 + vi * 24, 85, 0);
    hvacG.add(cap);
  }
  hvacG.position.set(-70, 0, CL * 0.28);
  stageGroup.add(hvacG);


  /* --- Wet neon street: asphalt sheen, lane lines, reflections, crosswalk ticks --- */
  floorDecal(CW - 60, CL - 120, mixHex(P.floor, 0x000000, 0.18), isInk ? 0 : 0.45, CW / 2, 0, 0.5, 0);
  for (let i = -1; i <= 1; i++) floorLine(CW / 2 + i * 150, 0, CL - 130, 0, P.ink, 0.16);
  // Neon reflections under the sign columns (pink left-ish / cyan right-ish).
  floorDecal(26, 240, neonB, 0.15, CW * 0.18, 60, 0.5, 0.5);
  floorDecal(26, 240, neonA, 0.15, CW * 0.82, -60, 0.5, 1.5);
  floorDecal(16, 200, neonA, 0.11, CW * 0.35, 140, 0.5, 2.5);
  floorDecal(16, 200, neonB, 0.11, CW * 0.65, -140, 0.5, 3.5);
  for (let i = 0; i < 9; i++) {
    floorDecal(46, 4, P.ink, 0.13, CW / 2 - 120, -CL / 2 + 100 + i * 42, 0.5, i);
    floorDecal(46, 4, P.ink, 0.13, CW / 2 + 120, -CL / 2 + 100 + i * 42, 0.5, i + 3);
  }

  // Street-level detailing: curb glow lines, fire hydrants, a neon marquee strip.
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, CL - 80), glowMat(neonMix));
    curb.position.set(side < 0 ? -46 : CW + 46, 1, 0);
    stageGroup.add(curb);
  }
  for (let i = 0; i < 5; i++) {
    const hx = (i % 2 ? -26 : CW + 26) + (rnd() - 0.5) * 10;
    const hz = -CL * 0.3 + i * CL * 0.15;
    const hyd = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 3), mat(mixHex(P.bg, 0x000000, 0.62)));
    post.position.y = 4.5;
    hyd.add(post);
    const cap1 = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 5), mat(mixHex(P.bg, 0x000000, 0.45)));
    cap1.position.y = 9.2;
    hyd.add(cap1);
    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), mat(mixHex(P.bg, 0x000000, 0.55)));
    cap2.position.y = 10.6;
    hyd.add(cap2);
    hyd.position.set(hx, 0, hz);
    stageGroup.add(hyd);
  }
  // Neon marquee strip on a mid-distance tower (static text glow).
  const marquee = mkNeon(150, 22, 300, 44, ctx => {
    const col = hex(isInk ? 0x6b6659 : neonA);
    ctx.clearRect(0, 0, 300, 44);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px "Silkscreen", "Pixelify Sans", sans-serif';
    ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = '#ffffff';
    ctx.fillText('PONG  CITY  24/7', 150, 22);
  });
  marquee.position.set(CW * 0.28, CH * 0.5, farZ + 92);

  // (Snow removed - the night sky now carries stars instead.)
}
