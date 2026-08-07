/* Hazard: Boost Lanes — game/content/conditions/boosts.js
   Glowing lanes near the floor/ceiling that fire the ball up when crossed. */
registerCondition('boosts', { icon: '⚡', name: 'Boost Lanes', desc: 'Glowing lanes fire the ball up when crossed.' }, {
  tick(dt) {
    const laneA = CH * 0.12, laneB = CH * 0.88;
    for (const b of balls) {
      if (b.inLane === undefined) b.inLane = false;
      const inLane = Math.abs(b.y - laneA) < 34 || Math.abs(b.y - laneB) < 34;
      if (inLane && !b.inLane) {
        b.speed = Math.min(b.speed + Math.round(95 * hazardScale), BALL_HARD_MAX);
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
        spawnBurst(b.x, b.y, b.z, '#ffd76a', 10);
        sfxBoost();
      }
      b.inLane = inLane;
    }
  },

  build() {
    const P = PALETTE[theme];
    const accC = P.accent;
    const pC = hexOf(P.player), cC = hexOf(P.cpu);
    // Solid lane beams + rising chevrons marking the boost field.
    const laneA = CH * 0.12, laneB = CH * 0.88;
    hz.beams = [];
    for (const ly of [laneA, laneB]) {
      const beam = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(CW, CL), hzMat(mixHex(pC, 0xffffff, 0.4), 0.16)));
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(CW / 2, ly, 0);
      const edgeL = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(6, CL), hzMat(accC, 0.5)));
      edgeL.rotation.x = -Math.PI / 2;
      edgeL.position.set(6, ly, 0);
      const edgeR = edgeL.clone(); edgeR.position.x = CW - 6;
      hazAdd(edgeR);
      hz.beams.push({ beam, edgeL, edgeR, y: ly });
    }
    hz.chevrons = [];
    for (let i = 0; i < 12; i++) {
      const ch = hazAdd(hzArrow(mixHex(pC, cC, 0.5), 0.6));
      ch.rotation.x = -Math.PI / 2;
      ch.position.set(40 + (i % 6) * 100, i < 6 ? laneA : laneB, -CL / 2 + 60 + Math.floor(i / 6) * (CL - 120));
      ch.rotation.z = Math.PI / 2;
      hz.chevrons.push({ mesh: ch, y: ch.position.y, spd: 60 + (i % 4) * 30 });
    }
  },

  vtick(dt, pace) {
    if (!hz.beams) return;
    for (const bm of hz.beams) {
      bm.beam.material.opacity = 0.10 + 0.1 * (0.5 + 0.5 * Math.sin(tNow * 4 + bm.y));
      bm.edgeL.material.opacity = bm.edgeR.material.opacity = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(tNow * 5 + bm.y));
    }
    for (const ch of hz.chevrons) {
      ch.mesh.position.x += ch.spd * dt;
      if (ch.mesh.position.x > CW - 20) ch.mesh.position.x = 20;
      ch.mesh.material && (ch.mesh.material.opacity = 0.5 + 0.3 * Math.sin(tNow * 6 + ch.mesh.position.x));
    }
  },
});
