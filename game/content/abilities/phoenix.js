/* Ability: True Phoenix (passive) — game/content/abilities/phoenix.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('phoenix', { icon: '🔥', name: 'True Phoenix',     rarity: 'epic',   cat: 'passive', desc: 'Once per run, survive a fatal loss with 1 life.' });
