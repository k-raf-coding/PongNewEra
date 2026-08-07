/* Ability: Chain Bolt (passive) — game/content/abilities/bolt.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('bolt', { icon: '☄️', name: 'Chain Bolt',       rarity: 'rare',   cat: 'passive', desc: '20% chance per stack per hit to fire a super-fast bolt.' });
