/* Hazard: Haunted Hall — game/content/conditions/ghosts.js
   Ghost balls tear through portals at random spots, warned by a telegraph ring. */
registerCondition('ghosts', { icon: '👻', name: 'Haunted Hall', desc: 'Ghost balls sometimes spawn from the walls.' }, {
  tick(dt) {
    ghostSpawnT -= dt;
    if (ghostSpawnT <= 0 && balls.length < MAX_BALLS) {
      ghostSpawnT = (1.8 + Math.random() * 1.2) / hazardScale;
      // A portal warns where the ghost will tear through before it arrives.
      ghostWarn = { x: BALL_R + 40 + Math.random() * (CW - 80), y: BALL_R + 40 + Math.random() * (CH - 80), t: 0.9 };
      procFlash('A PORTAL OPENS…', ghostWarn.x, ghostWarn.y, '#c084fc');
    }
    if (ghostWarn) {
      ghostWarn.t -= dt;
      if (ghostWarn.t <= 0) {
        const fromCPU = Math.random() < 0.5;
        const dir = fromCPU ? 1 : -1;
        const spd = 460 + Math.random() * 90;
        balls.push({ x: ghostWarn.x, y: ghostWarn.y, z: fromCPU ? -CL * 0.25 : CL * 0.25, speed: spd, vx: 0, vy: 0, vz: dir * spd, spinX: (Math.random() - 0.5) * 1.6, spinY: (Math.random() - 0.5) * 1.6, ghost: true });
        procFlash('HAUNTED!', ghostWarn.x, ghostWarn.y, '#c084fc');
        spawnBurst(ghostWarn.x, ghostWarn.y, 0, '#c084fc', 14);
        sfxGhost();
        ghostWarn = null;
      }
    }
  },

  build() {
    const P = PALETTE[theme];
    const cC = hexOf(P.cpu), pC = hexOf(P.player);
    // Spectral wisps drifting the court + portal rings that telegraph spawns.
    hz.wisps = [];
    for (let i = 0; i < 6; i++) {
      const w = hazAdd(hzGlow(mixHex(pC, cC, 0.5), 60 + (i % 3) * 22));
      w.position.set(60 + Math.random() * (CW - 120), 30 + Math.random() * (CH - 60), -CL / 2 + 120 + Math.random() * (CL - 240));
      hz.wisps.push({ mesh: w, baseX: w.position.x, baseY: w.position.y, baseZ: w.position.z, ph: i * 1.2 });
    }
    hz.portals = [];
    for (let i = 0; i < 2; i++) {
      const p = hazAdd(new THREE.Mesh(new THREE.RingGeometry(16, 22, 32), hzMat(cC, 0.9)));
      p.rotation.x = -Math.PI / 2;
      p.position.set(-999, 0, 0);
      p.visible = false;
      hz.portals.push({ mesh: p, ph: i * 2 });
    }
  },

  vtick(dt, pace) {
    if (!hz.portals) return;
    for (const w of hz.wisps) {
      w.mesh.position.x = w.baseX + Math.sin(tNow * 0.8 + w.ph) * 60;
      w.mesh.position.y = w.baseY + Math.sin(tNow * 1.3 + w.ph) * 22;
      w.mesh.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(tNow * 2 + w.ph)) + pace * 0.2;
    }
    // Portal telegraph: contract + flash as the ghost nears its tear.
    hz.portals.forEach((p, i) => {
      if (ghostWarn && i === 0) {
        p.mesh.visible = true;
        p.mesh.position.set(ghostWarn.x, ghostWarn.y, 0);
        const f = 1 - ghostWarn.t / 0.9;
        p.mesh.scale.setScalar(1 + f * 1.6);
        p.mesh.material.opacity = 0.3 + f * 0.7;
        p.mesh.rotation.z = tNow * 6;
      } else p.mesh.visible = false;
    });
  },
});
