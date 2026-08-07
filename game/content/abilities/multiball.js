/* Ability: Multiball Core (passive) — game/content/abilities/multiball.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('multiball', { icon: '🎱', name: 'Multiball Core',   rarity: 'rare',   cat: 'passive', desc: 'Your paddle hits split the ball (max 3 balls, tight spread).' });
