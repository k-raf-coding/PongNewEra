/* Ability: Signal Ghost (active) — game/content/abilities/glitch.js
   One file per ability = merge-safe: two people can add abilities in
   parallel without touching the same file. The draft, codex, HUD,
   cooldown bar and stacking all read the registry automatically. */
registerAbility('glitch', { icon: '🖥️', name: 'Signal Ghost',     rarity: 'epic',   cat: 'active', key: 'f', cd: 10,   desc: 'Press F: scramble the CPU aim (3× error) for 2.5s.' });

// Trigger effect — runs when fired via its bind.
registerActive('glitch', () => {
    glitchActiveT = 2.5;
    procFlash('GLITCH!', paddleL.x, paddleL.y, '#c084fc'); sfxGhost();
  });
