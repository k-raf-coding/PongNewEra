/* Hazard: Slick Ice — game/content/conditions/slick.js
   Your paddle slides with momentum — it chases the cursor with inertia.
   The player(dt, speedFactor, invert) hook returns true when the paddle moved. */
registerCondition('slick', { icon: '🧊', name: 'Slick Ice', desc: 'Your paddle slides with momentum — hard to stop.' }, {
  player(dt, speedFactor, invert) {
    let moving = false;
    if (mouseActive) {
      const dx = mouseX - paddleR.x, dy = mouseY - paddleR.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wantVX = (dx / dist) * Math.min(dist * 12, PLAYER_SPEED * 1.6);
      const wantVY = (dy / dist) * Math.min(dist * 12, PLAYER_SPEED * 1.6);
      slickVX = clamp(slickVX + (wantVX - slickVX) * Math.min(1, dt * 3.2), -PLAYER_SPEED * 1.6, PLAYER_SPEED * 1.6);
      slickVY = clamp(slickVY + (wantVY - slickVY) * Math.min(1, dt * 3.2), -PLAYER_SPEED * 1.6, PLAYER_SPEED * 1.6);
    } else {
      slickVX *= Math.pow(0.22, dt);
      slickVY *= Math.pow(0.22, dt);
    }
    if (Math.abs(slickVX) > 4 || Math.abs(slickVY) > 4) {
      paddleR.x += slickVX * speedFactor * dt * invert;
      paddleR.y += slickVY * speedFactor * dt * invert;
      moving = true;
    }
    return moving;
  },

  build() {
    const P = PALETTE[theme];
    const pC = hexOf(P.player);
    // Ice sheets: frosted quads with a bright shine sweep, scattered across the floor.
    hz.ice = [];
    for (let i = 0; i < 12; i++) {
      const w = 90 + (i % 4) * 60, d = 90 + (i % 3) * 60;
      const sheet = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(w, d), hzMat(mixHex(0xffffff, pC, 0.75), 0.24)));
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = (Math.random() - 0.5) * 0.5;
      sheet.position.set(60 + Math.random() * (CW - 120), 0.55, -CL / 2 + 120 + Math.random() * (CL - 240));
      const shine = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, d * 0.5), hzMat(0xffffff, 0.30)));
      shine.rotation.x = -Math.PI / 2;
      shine.rotation.z = sheet.rotation.z;
      shine.position.set(sheet.position.x - w * 0.12, 0.62, sheet.position.z - d * 0.12);
      hz.ice.push({ sheet, shine, baseX: sheet.position.x, baseY: sheet.position.z, ph: Math.random() * 6.28 });
    }
  },

  vtick(dt, pace) {
    if (!hz.ice) return;
    for (const ic of hz.ice) {
      ic.sheet.material.opacity = 0.16 + 0.1 * Math.sin(tNow * 1.4 + ic.ph) + pace * 0.05;
      ic.shine.material.opacity = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(tNow * 3 + ic.ph));
      ic.shine.position.x = ic.baseX + Math.sin(tNow * 0.9 + ic.ph) * 26;
      ic.shine.position.z = ic.baseY + Math.cos(tNow * 0.7 + ic.ph) * 26;
    }
  },
});
