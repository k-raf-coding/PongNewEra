/* Ability: EMP Surge (active) — game/content/abilities/emp.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('emp', { icon: '📡', name: 'EMP Surge',        rarity: 'rare',   cat: 'active', key: 'e', cd: 8,    desc: 'Press E: overload the CPU — it locks to 35% speed for 0.5s.' });

// Trigger effect — runs when fired via its bind.
registerActive('emp', () => {
    empLockT = Math.max(empLockT, 0.5);
    procFlash('EMP!', paddleL.x, paddleL.y, '#38e1ff'); sfxGhost();
    spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#38e1ff', 14);
  });
