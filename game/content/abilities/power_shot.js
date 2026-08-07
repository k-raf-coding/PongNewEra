/* Ability: Power Shot (passive) — game/content/abilities/power_shot.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('power_shot', { icon: '💥', name: 'Power Shot',       rarity: 'rare',   cat: 'passive', desc: 'Doubles the speed gain on your hits.' });
