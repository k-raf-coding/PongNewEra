/* Ability: Trick Mirror (active) — game/content/abilities/doom.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('doom', { icon: '🪞', name: 'Trick Mirror',     rarity: 'epic',   cat: 'active', key: 't', cd: 12,   desc: 'Press T: the ball closest to the CPU goal reverses and flies back to you.' });

// Trigger effect — runs when fired via its bind.
registerActive('doom', () => {
    let rev = null, bd = Infinity;
    for (const b of balls) { if (b.vz < 0 && b.z < bd) { bd = b.z; rev = b; } }
    // Fury lets a ball slip past the mirror: enough denied points and a goal finally lands.
    if (rev && Math.random() >= Math.min(0.7, cpuFury * 0.14)) {
      cpuFury++;
      rev.vz = -rev.vz;
      spawnBurst(rev.x, rev.y, rev.z, '#a3e635', 10);
      procFlash('MIRROR!', rev.x, rev.y, '#a3e635'); sfxShield();
    } else { msgFlash('MIRROR WEAK…'); sfxLose(); }
  });
