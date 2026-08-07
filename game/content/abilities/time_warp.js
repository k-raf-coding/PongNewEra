/* Ability: Chrono Field (active) — game/content/abilities/time_warp.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('time_warp', { icon: '⏳', name: 'Chrono Field',     rarity: 'epic',   cat: 'active', key: 'r', cd: 14,   desc: 'Press R: bend time — the rally slows to 60% for 2s.' });

// Trigger effect — runs when fired via its bind.
registerActive('time_warp', () => {
    warpActive = 2.2;
    msgFlash('SLOW-MO!'); sfxShield();
  });
