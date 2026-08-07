/* Ability: Sniper Scope (passive) — game/content/abilities/sniper.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('sniper', { icon: '🎯', name: 'Sniper Scope',     rarity: 'common', cat: 'passive', desc: 'Serves launch nearly dead straight.' });
