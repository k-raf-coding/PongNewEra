/* Ability: Cryo Field (passive) — game/content/abilities/freezer.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('freezer', { icon: '❄️', name: 'Cryo Field',       rarity: 'rare',   cat: 'passive', desc: 'CPU is frozen (slowed 40%) for 6s each round.' });
