/* Ability: Curve Control (passive) — game/content/abilities/curve.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('curve', { icon: '🪄', name: 'Curve Control',    rarity: 'rare',   cat: 'passive', desc: 'Hold SHIFT + WASD to bend your shots in flight (always available, stronger here).' });
