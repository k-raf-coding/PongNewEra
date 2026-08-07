/* Ability: champion (passive) — game/content/abilities/champion.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('champion', { icon: '👑', name: "Champion's Aura",  rarity: 'epic',   cat: 'passive', desc: 'CPU abilities trigger 40% slower.' });
