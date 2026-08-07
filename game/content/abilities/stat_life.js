/* Ability: Iron Heart (stat) — game/content/abilities/stat_life.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('stat_life', { icon: '💖', name: 'Iron Heart',       rarity: 'rare',   cat: 'stat', desc: '+1 max life per stack.' });
