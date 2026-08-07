/* Ability: Vampire Paddle (passive) — game/content/abilities/vamp.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('vamp', { icon: '🧛', name: 'Vampire Paddle',   rarity: 'rare',   cat: 'passive', desc: 'Every hit grows your paddle & shrinks theirs (more per stack).' });
