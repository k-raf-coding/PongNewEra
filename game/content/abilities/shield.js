/* Ability: Aegis Shield (passive) — game/content/abilities/shield.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('shield', { icon: '🛡️', name: 'Aegis Shield',     rarity: 'common', cat: 'passive', desc: 'Bounces one goal back into play per round.' });
