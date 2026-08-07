/* Ability: Overdrive Paddles (passive) — game/content/abilities/paddle_plus.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('paddle_plus', { icon: '🏓', name: 'Overdrive Paddles', rarity: 'common', cat: 'passive', desc: 'Paddle height grows (25% first stack, less per extra).' });
