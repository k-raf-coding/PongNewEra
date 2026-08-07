/* Ability: Long Arms (stat) — game/content/abilities/stat_reach.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('stat_reach', { icon: '🎯', name: 'Long Arms',        rarity: 'common', cat: 'stat', desc: '+8% max hit angle per stack.' });
