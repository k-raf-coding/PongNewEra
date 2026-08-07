/* Ability: Ghost Ball (active) — game/content/abilities/ghost_ball.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('ghost_ball', { icon: '👻', name: 'Ghost Ball',       rarity: 'epic',   cat: 'active', key: 'q', cd: 10,   desc: 'Press Q: phase 2 of your shots straight through the CPU paddle.' });

// Trigger effect — runs when fired via its bind.
registerActive('ghost_ball', () => {
    ghostCharges = Math.min(4, ghostCharges + 2);
    procFlash('PHASED ×' + ghostCharges + '!', paddleR.x, paddleR.y, '#c084fc'); sfxGhost();
  });
