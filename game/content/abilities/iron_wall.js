/* Ability: Iron Will (passive) — game/content/abilities/iron_wall.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('iron_wall', { icon: '🏰', name: 'Iron Will',        rarity: 'epic',   cat: 'passive', desc: 'CPU needs 6 points to beat you instead of 5.' });
