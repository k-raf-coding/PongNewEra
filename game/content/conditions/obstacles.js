/* Hazard: Blockades — game/content/conditions/obstacles.js
   Floating brick walls drift mid-court and bounce the ball. */
registerCondition('obstacles', { icon: '🧱', name: 'Blockades', desc: 'Floating brick walls drift mid-court and bounce the ball.' }, {
  setup() {
    // Seeded every match by the core's generic reset, then populated here.
    obstacles = [
      { x: CW * 0.28, y: CH * 0.30, z: -CL * 0.16, w: 16, h: 96, d: 240, vy: 150, vx: 40, rot: 0, rs: 0.7 },
      { x: CW * 0.72, y: CH * 0.70, z: CL * 0.16, w: 16, h: 96, d: 240, vy: -150, vx: -40, rot: 0, rs: -0.5 },
      { x: CW * 0.50, y: CH * 0.50, z: CL * 0.02, w: 20, h: 60, d: 130, vy: 110, vx: 0, rot: 0, rs: 1.1 },
    ];
  },

  build() {
    const P = PALETTE[theme];
    const midC = P.mid, accC = P.accent;
    // Warning hatches on the floor under each tumbling block + orbiting rim rings.
    hz.hatches = [];
    hz.rims = [];
    obstacles.forEach(o => {
      const hatch = hazAdd(new THREE.Mesh(new THREE.PlaneGeometry(o.w + 26, o.d + 26), hzMat(midC, 0.18)));
      hatch.rotation.x = -Math.PI / 2;
      hatch.position.set(o.x, 0.55, o.z);
      for (let k = 0; k < 4; k++) {
        const corner = hazAdd(new THREE.Mesh(new THREE.BoxGeometry(14, 1, 14), hzMat(accC, 0.8)));
        corner.position.set(o.x + (k % 2 ? 1 : -1) * (o.w / 2 + 16), 0.6, o.z + (k < 2 ? 1 : -1) * (o.d / 2 + 16));
        hz.hatches.push({ corner, ox: corner.position.x, oz: corner.position.z });
      }
      const rim = hazAdd(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.w + 6, o.h + 6, o.d + 6)), new THREE.LineBasicMaterial({ color: accC, transparent: true, opacity: 0.9 })));
      hz.rims.push({ line: rim, ox: o.x, oy: o.y, oz: o.z });
    });
  },

  vtick(dt, pace) {
    if (!hz.hatches) return;
    let hi = 0;
    for (const o of obstacles) {
      const flash = o.flash > 0;
      for (let k = 0; k < 4 && hi < hz.hatches.length; k++, hi++) {
        hz.hatches[hi].corner.material.opacity = flash ? 0.9 : 0.4 + 0.2 * Math.sin(tNow * 4 + hi);
        hz.hatches[hi].corner.position.x = hz.hatches[hi].ox + (o.x - hz.hatches[hi].ox);
        hz.hatches[hi].corner.position.z = hz.hatches[hi].oz + (o.z - hz.hatches[hi].oz);
      }
      if (hi < hz.rims.length) {
        hz.rims[hi].line.position.set(o.x, o.y, o.z);
        hz.rims[hi].line.rotation.z = o.rot || 0;
        hz.rims[hi].line.material.opacity = flash ? 1 : 0.55 + 0.2 * Math.sin(tNow * 3 + hi);
      }
    }
  },
});
