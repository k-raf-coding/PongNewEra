/* Ability: Wild Smash (active) — game/content/abilities/smash.js
   The test ability that proved the registerAbility/registerActive pipeline:
   slot 1 -> press 1 to arm, next hit detonates. */
registerAbility('smash', {
  icon: '💥', name: 'Wild Smash', rarity: 'epic', cat: 'active', slot: '1', cd: 7,
  desc: 'Press 1: arm a WILD SMASH — your next hit within 3s flies at +160 speed with wild spin.',
});
registerActive('smash', () => {
  smashArmed = true; smashArmedUntil = performance.now() + 3000;
  procFlash('WILD SMASH ARMED!', paddleR.x, paddleR.y - playerPaddleH() / 2 - 16, '#fb923c');
  spawnBurst(paddleR.x, paddleR.y, playerPlane, '#fb923c', 16);
  sfxShield();
});
