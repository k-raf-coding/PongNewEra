/* Hazard: Bouncy Walls — game/content/conditions/bouncy.js
   The walls are LIVE: they spring the ball back with extra heat and wild spin. */
registerCondition('bouncy', { icon: '🫧', name: 'Bouncy Walls', desc: 'Wall hits gain wild random spin.' }, {
  onWall(b) {
    bonkAt(b.x, b.y, b.z, b.speed + 150);
    b.speed = Math.min(b.speed + 16 * hazardScale, BALL_HARD_MAX);
    const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
    b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
    wallFlashT = 0.35;
  },

  onServe(b) {
    b.spinX = (Math.random() < 0.5 ? 1 : -1) * 1.8;
    b.spinY = (Math.random() < 0.5 ? 1 : -1) * 1.8;
  },

  build() {
    const P = PALETTE[theme];
    const midC = P.mid, accC = P.accent;
    // Live spring walls: coil pads along both side walls that flash on impact.
    hz.pads = [];
    for (const side of [0, CW]) {
      for (let i = 0; i < 7; i++) {
        const g = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const coil = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 5), hzMat(midC, 0.9));
          coil.position.y = k * 7;
          g.add(coil);
        }
        const plate = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 8), hzMat(accC, 0.85));
        plate.position.y = 21;
        g.add(plate);
        g.position.set(side === 0 ? 3 : CW - 3, 8, -CL / 2 + 120 + i * ((CL - 240) / 6));
        g.rotation.y = side === 0 ? -Math.PI / 2 : Math.PI / 2;
        hazAdd(g);
        hz.pads.push({ group: g, plate, baseY: 8, ph: i * 0.9 });
      }
    }
  },

  vtick(dt, pace) {
    if (!hz.pads) return;
    const b = balls[0];
    const flash = wallFlashT > 0;
    for (const p of hz.pads) {
      const near = b ? Math.abs(b.x - p.group.position.x) < 90 : false;
      const k = (flash ? 1.35 : 1) + (near ? 0.15 : 0);
      p.group.scale.y = k;
      p.plate.material.opacity = 0.55 + 0.45 * (near || flash ? 1 : 0.5 + 0.5 * Math.sin(tNow * 3 + p.ph));
    }
  },
});
