/* Ability: Shockwave (passive) — game/content/abilities/bash.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('bash', { icon: '💢', name: 'Shockwave',        rarity: 'rare',   cat: 'passive', desc: 'Your hard hits (>600 px/s) stun the CPU for 0.5s.' });
