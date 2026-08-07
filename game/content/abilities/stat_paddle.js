/* Ability: Giant Frame (stat) — game/content/abilities/stat_paddle.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('stat_paddle', { icon: '📐', name: 'Giant Frame',      rarity: 'common', cat: 'stat', desc: '+14% paddle height per stack.' });
