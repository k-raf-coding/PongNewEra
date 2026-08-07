/* Hazard: Gale Winds — game/content/conditions/wind.js
   A cross-court gale that shoves balls (and your paddle) sideways.
   New hazards: copy this file, change the id, and register your own hooks. */
registerCondition('wind', { icon: '🌬️', name: 'Gale Winds', desc: 'A cross-court wind pushes the ball sideways.' }, {
  // Direction/magnitude are seeded generically in core (windDir/windMag/windGustT/windFlash).
  setup() { },

  tick(dt) {
    windGustT -= dt;
    if (windGustT <= 0) {
      windGustT = 1.8 + Math.random() * 1.8;   // the gale re-aims often — never comfortable
      windDir += (Math.random() - 0.5) * 3.2;
      windMag = 1.7 + Math.random() * 1.5;      // real gust spikes
      windFlash = 1;
      sfxWindGust();
      shake = Math.min(shake + 4, 10);
    }
    windMag = Math.max(0.8, windMag - dt * 1.1);
    windFlash = Math.max(0, windFlash - dt * 2.5);
    const dirX = Math.cos(windDir), dirY = Math.sin(windDir);
    for (const b of balls) {
      b.vx += dirX * 2800 * hazardScale * windMag * dt;
      b.vy += dirY * 1800 * hazardScale * windMag * dt;
      const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
      b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
    }
    // Gusts shove YOUR paddle too — the gale is alive, not a background decal.
    if (windFlash > 0) {
      paddleR.x += dirX * 320 * windMag * dt;
      paddleR.y += dirY * 150 * windMag * dt;
      paddleR.x = clamp(paddleR.x, PADDLE_W / 2, CW - PADDLE_W / 2);
      paddleR.y = clamp(paddleR.y, playerPaddleH() / 2, CH - playerPaddleH() / 2);
    }
    // HUD wind compass: arrow follows the gale's direction, brightens on gusts.
    const windEl = $('windChip');
    if (windEl) {
      const arrows = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
      const ang = ((windDir % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const idx = Math.round(ang / (Math.PI / 4)) % 8;
      windEl.textContent = '🌬️ ' + arrows[idx] + ' ×' + windMag.toFixed(1);
      windEl.style.opacity = 0.55 + windFlash * 0.45;
    }
  },

  build() {
    const P = PALETTE[theme];
    const midC = P.mid, softC = P.soft;
    // Flow streaks: thin vertical ribbons racing the gale across the whole court.
    hz.streaks = [];
    for (let i = 0; i < 18; i++) {
      const h = 70 + (i % 5) * 26;
      const s = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(3.2, h), hzMat(mixHex(midC, 0xffffff, 0.25), 0.5)));
      s.position.set((i / 17) * (CW + 200) - 100, CH * (0.12 + (i % 4) * 0.22), -CL / 2 + 60 + (i % 5) * (CL / 4));
      hz.streaks.push({ mesh: s, baseX: s.position.x, baseY: s.position.y, baseZ: s.position.z, spd: 220 + (i % 6) * 60 });
    }
    // Floor compass arrows that re-aim with every gust.
    hz.arrows = [];
    for (let i = 0; i < 5; i++) {
      const a = hazAdd(hzArrow(midC, 1));
      a.rotation.x = -Math.PI / 2;
      a.position.set(CW * (0.15 + i * 0.175), 0.9, (i % 2 ? 1 : -1) * CL * 0.22);
      hz.arrows.push(a);
    }
    // A huge translucent band so the whole court reads as a wind tunnel.
    hz.band = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(CW + 120, CL - 120), hzMat(softC, 0.07)));
    hz.band.rotation.x = -Math.PI / 2;
    hz.band.position.set(CW / 2, CH * 0.55, 0);
  },

  vtick(dt, pace) {
    if (!hz.streaks) return;
    const dirX = Math.cos(windDir), dirY = Math.sin(windDir);
    const spdMul = 1 + windMag * 1.6 + pace * 0.5;
    for (const s of hz.streaks) {
      s.mesh.position.x += dirX * s.spd * spdMul * dt;
      s.mesh.position.y += dirY * s.spd * spdMul * dt;
      // wrap within the court volume
      if (s.mesh.position.x > CW + 140) s.mesh.position.x = -140;
      if (s.mesh.position.x < -140) s.mesh.position.x = CW + 140;
      if (s.mesh.position.y > CH + 40) s.mesh.position.y = -30;
      if (s.mesh.position.y < -30) s.mesh.position.y = CH + 40;
      s.mesh.material.opacity = 0.25 + 0.3 * windMag + (windFlash > 0 ? 0.25 : 0);
      s.mesh.rotation.z = windDir;
    }
    for (const a of hz.arrows) {
      a.rotation.z = windDir - Math.PI / 2;
      a.material && (a.material.opacity = 0.4 + windFlash * 0.5);
    }
    if (hz.band) {
      hz.band.material.opacity = 0.05 + windMag * 0.05 + (windFlash > 0 ? 0.06 : 0);
      hz.band.position.x += dirX * 40 * windMag * dt;
      hz.band.position.x = ((hz.band.position.x - CW / 2) % 120 + 120) % 120 + CW / 2 - 60;
    }
  },
});
