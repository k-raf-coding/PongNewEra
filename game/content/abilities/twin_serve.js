/* Ability: Twin Serve (passive) — game/content/abilities/twin_serve.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('twin_serve', { icon: '👯', name: 'Twin Serve',       rarity: 'rare',   cat: 'passive', desc: 'Each serve launches +1 ball per stack (max 3, tight spread).' });
