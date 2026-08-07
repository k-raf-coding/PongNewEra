/* ============================================================================
   STAGE TEMPLATE — copy this file to add a NEW arena.
   ----------------------------------------------------------------------------
   HOW TO ADD A STAGE (5 steps):
     1. COPY this file to:  game/content/stages/mynewstage.js
     2. Replace the id 'TEMPLATE' with a short lowercase id (letters/underscores).
     3. Fill in the THREE parts of the pattern:
          theme    — a visual direction. Use 'neon' | 'arena' | 'warm' | 'cosmic' |
                      'gothic' | 'organic' | 'prism' | 'stone' | 'bog' | 'storm' |
                      'deep'  (each maps to a color palette) — or leave it and
                      pick your own colors from the P palette passed to you.
          objects  — the props filling the background / side views.
          feature  — the ONE gimmick that makes this arena unique.
     4. Write your build(P) function below. P is the active color palette
        ({ bg, floor, gridA, ink, mid, soft, paper, player, cpu, accent, ... }).
     5. Run the split script ONCE (from the project root):
            python3 split_modular.py
        It automatically adds your file to the HTML script list and wires the
        arena into rotation. Your file is the ONLY file you need to create —
        nobody else's files are touched, so two people can add stages in
        parallel with zero merge conflicts.
   ----------------------------------------------------------------------------
   USEFUL HELPERS (already defined by the engine):
     stageGroup   — add your meshes to this group (stageGroup.add(mesh)).
     stageData    — bookkeeping object (stageData.floorMarks for shimmer floors).
     floorDecal(w, d, color, opacity, x, z, y, ph) — a flat floor shimmer patch.
     floorLine(x, z, len, rotZ, color, opacity)    — a thin floor bar.
     textPlane(w, h, draw)                          — a canvas-text plane.
     makeStageGlowMesh(color, scale)                — a soft glow disc.
     hexOf('#hex'), hexStr(0xhex), mixHex(a, b, t)  — color math.
   ============================================================================ */

registerStage('TEMPLATE', {
  theme: 'neon',                                   // palette direction (or pick your own)
  rotation: 'normal',                              // 'normal' = tour rotation, 'boss' = boss arena
  objects: ['describe prop 1', 'describe prop 2', 'describe prop 3'],
  feature: 'the one unique thing that makes this arena special',
}, function buildTEMPLATE(P) {
  // P = active palette: P.bg, P.floor, P.ink, P.mid, P.soft, P.paper,
  //     P.player, P.cpu, P.accent, P.glow, P.dark
  // Court volume: X from 0..CW (across), Y from 0..CH (height), Z from -CL/2..CL/2 (depth).
  // The arena should frame the court without blocking the ball — keep meshes
  // outside the play volume or far behind the far goal (-CL/2 - 100+).

  // --- Background / side-view objects ---
  // const sky = new THREE.Mesh(new THREE.PlaneGeometry(...), new THREE.MeshBasicMaterial({ color: P.bg, fog: false }));
  // sky.position.set(CW / 2, CH * 0.4, -CL / 2 - 150);
  // stageGroup.add(sky);
  // ... build your theme / objects here ...

  // --- Floor dressing (optional) ---
  // floorDecal(140, 140, P.accent, 0.08, CW / 2, 0, 0.5, 0);

  // --- The unique feature ---
  // Add any special meshes/groups your gimmick needs. Remember to give the
  // feature a handle if the engine needs to animate it later (e.g. store it on
  // stageData so you can find it again: stageData.myGimmick = mesh;).
});
