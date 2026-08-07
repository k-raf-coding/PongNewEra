/* Ability: Charmed Round (passive) — game/content/abilities/lucky.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('lucky', { icon: '🍀', name: 'Charmed Round',    rarity: 'common', cat: 'passive', desc: "At round start, 70% chance the CPU's special ability is disabled for the round." });
