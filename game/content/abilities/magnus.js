/* Ability: Curve Jolt (passive) — game/content/abilities/magnus.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('magnus', { icon: '🪄', name: 'Curve Jolt',       rarity: 'rare',   cat: 'passive', desc: 'Every hit leaves the ball with a burst of spin.' });
