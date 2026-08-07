/* Hazard: Machinery — game/content/conditions/machinery.js
   Rotating fans, boost vents, and spinner traps fill the court! */
registerCondition('machinery', { icon: '⚙️', name: 'Machinery', desc: 'Rotating fans, boost vents, and spinner traps fill the court!' }, {
  setup() {
    // Fan positions: three spinning obstacles at different heights
    machFans = [
      { x: CW * 0.25, y: CH * 0.35, z: -CL * 0.2, r: 30, speed: 4, dir: 1 },
      { x: CW * 0.75, y: CH * 0.65, z: CL * 0.1, r: 30, speed: 3, dir: -1 },
      { x: CW * 0.50, y: CH * 0.25, z: CL * 0.3, r: 30, speed: 5, dir: 1 },
    ];
    machBoosters = [
      { x: CW * 0.15, y: 0, z: 0, w: 16, h: 10, d: 16, active: true },
      { x: CW * 0.85, y: 0, z: -CL * 0.05, w: 16, h: 10, d: 16, active: true },
      { x: CW * 0.50, y: 0, z: CL * 0.18, w: 16, h: 10, d: 16, active: true },
    ];
    machSpinners = [
      { x: CW * 0.50, y: 0, z: -CL * 0.25, w: 50, h: 4, d: 50, speed: 0.9, active: true },
      { x: CW * 0.35, y: 0, z: CL * 0.25, w: 50, h: 4, d: 50, speed: -0.7, active: true },
      { x: CW * 0.70, y: 0, z: CL * 0.02, w: 44, h: 4, d: 44, speed: 0.6, active: true },
    ];
  },

  tick(dt) {
    for (const f of machFans) {
      // Fans rotate and push balls away with a radial force
      f.angle = (f.angle || 0) + f.speed * dt;
      f.sfxT = (f.sfxT || 0) - dt;
      for (const b of balls) {
        const dx = b.x - f.x, dy = b.y - f.y, dz = b.z - f.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > 0 && d < 170) {
          const force = 3800 * hazardScale * (1 - d / 170) * dt;
          b.vx += (dx / d) * force;
          b.vy += (dy / d) * force;
          b.vz += (dz / d) * force * 0.5;
          const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
          b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
          b.spinX = clamp(b.spinX + f.speed * 0.09 * (Math.random() < 0.5 ? 1 : -1), -MAX_SPIN, MAX_SPIN);
          b.spinY = clamp(b.spinY + f.speed * 0.09 * (Math.random() < 0.5 ? 1 : -1), -MAX_SPIN, MAX_SPIN);
          if (f.sfxT <= 0) { f.sfxT = 0.5; sfxFan(); }
        }
      }
    }
    for (const bs of machBoosters) {
      // Boosters: vertical lift columns. Ball passing directly above gets launched upward.
      if (bs.active) {
        for (const b of balls) {
          const dx = b.x - bs.x, dz = b.z - bs.z;
          if (Math.abs(dx) < 34 && Math.abs(dz) < 34) {
            b.vy -= 3800 * hazardScale * dt;  // Lift upward
            b.speed = Math.min(b.speed + 20, BALL_HARD_MAX);
            b.spinX = clamp(b.spinX + (Math.random() < 0.5 ? 1 : -1) * 0.5, -MAX_SPIN, MAX_SPIN);
            spawnBurst(b.x, b.y, b.z, '#b9b3a2', 7);
            if (!bs.sfxT || bs.sfxT <= 0) { bs.sfxT = 0.45; sfxBoost(); }
          }
        }
        if (bs.sfxT) bs.sfxT -= dt;
      }
    }
    for (const sp of machSpinners) {
      // Spinner traps: slow-rotating gears that grab the ball and add heavy spin.
      if (sp.active) {
        for (const b of balls) {
          const dx = b.x - sp.x, dz = b.z - sp.z;
          if (Math.abs(dx) < 40 && Math.abs(dz) < 40 && Math.abs(b.y - 0) < 30) {
            b.speed = Math.min(b.speed + 26, BALL_HARD_MAX);
            b.spinX = clamp(b.spinX + sp.speed * 1.3, -MAX_SPIN, MAX_SPIN);
            b.spinY = clamp(b.spinY + sp.speed * 0.9, -MAX_SPIN, MAX_SPIN);
          }
        }
        sp.angle = (sp.angle || 0) + sp.speed * dt;
      }
    }
  },

  build() {
    const P = PALETTE[theme];
    const midC = P.mid, softC = P.soft;
    // Fan thrust cones, booster steam columns, and gear teeth on the spinner traps.
    hz.fanCones = [];
    machFans.forEach(f => {
      const cone = hazAdd(hzGlow(softC, 130));
      cone.position.set(f.x, f.y, f.z);
      hz.fanCones.push({ mesh: cone, x: f.x, y: f.y, z: f.z });
    });
    hz.steam = [];
    machBoosters.forEach(bs => {
      for (let k = 0; k < 3; k++) {
        const st = hazAdd(new THREE.Mesh(new THREE.BoxGeometry(10, 26, 10), hzMat(softC, 0.28)));
        st.position.set(bs.x, 14 + k * 16, bs.z);
        hz.steam.push({ mesh: st, baseY: st.position.y, ph: k * 2.1 });
      }
    });
    hz.teeth = [];
    machSpinners.forEach(sp => {
      const g = new THREE.Group();
      for (let k = 0; k < 8; k++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(9, 3.4, 9), hzMat(midC, 0.9));
        const a = (k / 8) * Math.PI * 2;
        t.position.set(Math.cos(a) * 30, 0, Math.sin(a) * 30);
        g.add(t);
      }
      g.position.set(sp.x, 0.6, sp.z);
      g.rotation.x = -Math.PI / 2;
      hazAdd(g);
      hz.teeth.push({ group: g, x: sp.x, z: sp.z });
    });
  },

  vtick(dt, pace) {
    if (hz.fanCones) for (const fc of hz.fanCones) fc.mesh.material.opacity = 0.25 + 0.2 * Math.sin(tNow * 8 + fc.x);
    if (hz.steam) for (const st of hz.steam) {
      st.mesh.position.y += 30 * dt;
      st.mesh.material.opacity = 0.2 + 0.12 * Math.sin(tNow * 3 + st.ph);
      if (st.mesh.position.y > 90) st.mesh.position.y = st.baseY;
    }
    if (hz.teeth) hz.teeth.forEach((t, i) => { if (machSpinners[i]) t.group.rotation.z = -(machSpinners[i].angle || 0); });
  },
});
