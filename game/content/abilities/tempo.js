/* Ability: Tempo (passive) — game/content/abilities/tempo.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('tempo', { icon: '⏱️', name: 'Tempo',            rarity: 'common', cat: 'passive', desc: 'Serve countdown is 40% faster per stack.' });
