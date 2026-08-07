/* Ability: Turbo Core (passive) — game/content/abilities/turbo.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('turbo', { icon: '⚡', name: 'Turbo Core',       rarity: 'common', cat: 'passive', desc: 'Each rally hit adds speed (8 px/s first stack, less per extra).' });
