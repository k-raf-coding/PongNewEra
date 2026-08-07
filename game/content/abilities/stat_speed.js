/* Ability: Quick Feet (stat) — game/content/abilities/stat_speed.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('stat_speed', { icon: '🦶', name: 'Quick Feet',       rarity: 'common', cat: 'stat', desc: '+9% paddle movement speed per stack.' });
