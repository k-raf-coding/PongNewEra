/* Ability: Rocket Servers (passive) — game/content/abilities/speed_boost.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('speed_boost', { icon: '🚀', name: 'Rocket Servers',   rarity: 'common', cat: 'passive', desc: 'Serves launch faster (70 px/s first stack, less per extra).' });
