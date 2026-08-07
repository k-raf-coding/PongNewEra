/* Ability: Magnet Grip (passive) — game/content/abilities/magnet.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('magnet', { icon: '🧲', name: 'Magnet Grip',      rarity: 'common', cat: 'passive', desc: 'Pulls incoming balls toward your paddle.' });
