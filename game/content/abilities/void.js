/* Ability: Void Gate (passive) — game/content/abilities/void.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('void', { icon: '🕳️', name: 'Void Gate',        rarity: 'rare',   cat: 'passive', desc: '20% chance per stack a ball passing you is erased (no point).' });
