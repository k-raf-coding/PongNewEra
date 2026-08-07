/* Ability: Seeker Rounds (passive) — game/content/abilities/seeker.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('seeker', { icon: '🧿', name: 'Seeker Rounds',    rarity: 'rare',   cat: 'passive', desc: 'Your shots bend gently toward the CPU paddle.' });
