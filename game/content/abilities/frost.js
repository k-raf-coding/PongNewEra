/* Ability: Frostbite (passive) — game/content/abilities/frost.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('frost', { icon: '🧊', name: 'Frostbite',        rarity: 'rare',   cat: 'passive', desc: 'Your hits chill the CPU (20% slower for 2s).' });
