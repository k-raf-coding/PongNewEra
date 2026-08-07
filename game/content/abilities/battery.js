/* Ability: Battery Core (passive) — game/content/abilities/battery.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('battery', { icon: '🔋', name: 'Battery Core',     rarity: 'common', cat: 'passive', desc: 'Every 8s (faster per stack) your paddle charges: your next hit is +40 speed per stack (glows when ready).' });
