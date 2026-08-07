/* Ability: Colossus Frame (passive) — game/content/abilities/colossus.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('colossus', { icon: '🏯', name: 'Colossus Frame',   rarity: 'epic',   cat: 'passive', desc: "+50% paddle height. Your hits tremor the CPU (15% slower for 1.5s)." });
