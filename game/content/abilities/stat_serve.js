/* Ability: Cannon Arm (stat) — game/content/abilities/stat_serve.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('stat_serve', { icon: '🎇', name: 'Cannon Arm',       rarity: 'common', cat: 'stat', desc: '+55 serve speed per stack.' });
