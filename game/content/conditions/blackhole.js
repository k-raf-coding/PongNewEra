/* Hazard: Black Hole — game/content/conditions/blackhole.js
   A gravity well in the center that pulls balls in and slings them into orbit. */
registerCondition('blackhole', { icon: '🕳️', name: 'Black Hole', desc: 'A gravity well in the center pulls the ball in.' }, {
  tick(dt) {
    const cx = CW / 2, cy = CH / 2, cz = 0;
    for (const b of balls) {
      const dx = cx - b.x, dy = cy - b.y, dz = cz - b.z;
      const d = Math.max(1, Math.hypot(dx, dy, dz));
      if (d < CL * 0.45) {
        // Near the event horizon the hole SLINGS the ball into a tight orbit
        // instead of a gentle tug — a redirection that can genuinely save or sink you.
        if (d < 110) {
          const tx = -dy, ty = dx;
          const tl = Math.hypot(tx, ty) || 1;
          b.vx += (tx / tl) * 5200 * hazardScale * dt;
          b.vy += (ty / tl) * 5200 * hazardScale * dt;
          b.vz += (dx / d) * 900 * hazardScale * dt;
          b.speed = Math.min(b.speed + 26 * hazardScale * dt * 60, BALL_HARD_MAX);
          shake = Math.min(shake + 3, 12);
          spawnBurst(b.x, b.y, b.z, '#a78bfa', 3);
        } else {
          b.vx += (dx / d) * 3400 * hazardScale * dt;
          b.vy += (dy / d) * 3400 * hazardScale * dt;
          b.vz += (dz / d) * 2000 * hazardScale * dt;
        }
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
        if (!b.bhSfxT || b.bhSfxT <= 0) { b.bhSfxT = 0.55; sfxSuck(); }
      }
      if (b.bhSfxT) b.bhSfxT -= dt;
    }
  },

  build() {
    const P = PALETTE[theme];
    const accC = P.accent;
    const pC = hexOf(P.player), cC = hexOf(P.cpu);
    const cx = CW / 2, cy = CH / 2;
    // Spiral arms: a slowly-whirling accretion spiral above the event horizon.
    hz.spiral = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const arm = hazAdd(new THREE.Mesh(new THREE.BoxGeometry(3.4, 26 + (i % 4) * 12, 3.4), hzMat(mixHex(cC, pC, 0.5), 0.8)));
      arm.position.set(cx, cy, 0);
      arm.rotation.z = (i / 14) * Math.PI * 2;
      arm.translateX(46 + (i % 4) * 12);
      hz.spiral.add(arm);
    }
    hz.spiral.position.set(cx, cy, 0);
    hazAdd(hz.spiral);
    // Floor gravity rings: three concentric warning rings that contract with the pull.
    hz.rings = [];
    for (let i = 0; i < 3; i++) {
      const r = hazAdd(new THREE.Mesh(new THREE.RingGeometry(70 + i * 40 - 2.5, 70 + i * 40, 40), hzMat(accC, 0.32)));
      r.rotation.x = -Math.PI / 2;
      r.position.set(cx, 0.7, cy - CH / 2);
      hz.rings.push({ mesh: r, base: 70 + i * 40 });
    }
    hz.halo = hazAdd(hzGlow(accC, 420));
    hz.halo.position.set(cx, cy, 0);
  },

  vtick(dt, pace) {
    if (!hz.spiral) return;
    const b = balls[0];
    hz.spiral.rotation.z += dt * 1.4;
    const suck = b ? clamp(1 - Math.hypot(b.x - CW / 2, b.y - CH / 2) / (CL * 0.4), 0, 1) : 0;
    hz.spiral.scale.setScalar(1 + suck * 0.5 + pace * 0.2);
    if (hz.rings) for (const r of hz.rings) {
      r.mesh.material.opacity = 0.22 + 0.18 * (0.5 + 0.5 * Math.sin(tNow * 3 + r.base)) + suck * 0.35;
      r.mesh.scale.setScalar(1 - suck * 0.25);
    }
    if (hz.halo) hz.halo.material.opacity = 0.3 + suck * 0.4 + 0.08 * Math.sin(tNow * 4);
  },
});
