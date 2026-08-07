/* Ability: Phoenix Heart (passive) — game/content/abilities/extra_life.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('extra_life', { icon: '❤️', name: 'Phoenix Heart',    rarity: 'epic',   cat: 'passive', desc: '+1 life immediately.' });
