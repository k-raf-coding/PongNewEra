/* Ability: Heavy Hands (stat) — game/content/abilities/stat_power.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('stat_power', { icon: '🔨', name: 'Heavy Hands',      rarity: 'common', cat: 'stat', desc: '+10 hit speed per stack.' });
