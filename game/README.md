# Pong New Era — Modular Codebase

The game is split into a small **engine** plus **one file per piece of content**.
The rule that makes two people safe to work on this at once:

> **Adding content = creating a NEW file. Never edit files that already exist.**
> New files never collide, so parallel edits can't merge-conflict.

## File map

```
PongNewEra.html                  Slim shell: THREE.js + the script list + boot loader.
game/registry.js                 THE shared foundation — registration APIs + empty registries.
                                 (Add new registry types here, NEVER new content.)
game/core.js                     THE engine — physics, AI, input, HUD, draft logic.
                                 (NEVER edit this to add content. It reads the registries.)
game/content/coaches.js          The 5 upgrade-screen animals + quips.      (append new coaches)
game/content/ai.js               AI champion roster.                         (append new champions)
game/content/synergies.js        Ability-combo definitions.                 (append new synergies)
game/content/abilities/<id>.js   ONE FILE PER ABILITY (41 files).            (create new file)
game/content/stages/<id>.js      ONE FILE PER ARENA (11 files).              (create new file)
game/content/conditions/<id>.js  ONE FILE PER HAZARD (8 files).              (create new file)
game/content/TEMPLATE_stage.js   Copyable stage template — not loaded by the game.
split_modular.py                 One-time migration/regenerator tool (see below).
```

## How to add content (no conflicts)

### 🏟️ Add a stage (your friend's job)
1. Copy `game/content/TEMPLATE_stage.js` → `game/content/stages/<yourstage>.js`
2. Fill in the template: id, theme, objects, feature, and the `build(P)` function.
3. Run `python3 split_modular.py` once — it regenerates the HTML script list so
   your new file loads, and wires the arena into rotation automatically.

### 🌀 Add an ability
Create `game/content/abilities/<id>.js`:

```js
registerAbility('my_ability', {
  icon: '✨', name: 'My Ability', rarity: 'common',
  cat: 'active',          // 'active' | 'passive' | 'stat'
  slot: '1',              // actives: bind to a key 1-4 (or key: 'e' for legacy letters)
  cd: 8,                  // actives/passives: cooldown seconds
  desc: 'What it does.',
});
// Actives: what happens when fired
registerActive('my_ability', () => { /* your effect */ });
// Passives: optional — fire every time cd elapses
// registerPassive('my_ability', 6, () => { /* your effect */ });
```

The draft, codex, HUD hotbar, cooldown bar and stacking all pick it up
automatically. No other file changes needed (just re-run the split script).

### 🌪️ Add a hazard
Create `game/content/conditions/<id>.js`:

```js
registerCondition('myhazard', {
  icon: '☄️', name: 'My Hazard', desc: 'What it does to the rally.',
}, {
  setup()  { /* seed obstacle/state arrays for the round  */ },
  tick(dt) { /* per-frame mechanic                          */ },
  onWall(b)    { /* ball hit a wall                         */ },
  onServe(b)   { /* ball served                            */ },
  player(dt, speedFactor, invert) { /* affect the player paddle; return true if it moved */ },
  build()  { /* build the hazard's THREE visuals into `hz` via hazAdd() */ },
  vtick(dt, pace) { /* animate the visuals every frame    */ },
});
```

### 🦉 Add a coach / 🤖 champion / ✨ synergy
Append entries to `game/content/coaches.js`, `ai.js`, or `synergies.js`.
These three files are the only ones where appending is expected — if two people
both append to the same file, add your entries at opposite ends or merge by hand.

## The split script

`split_modular.py` regenerates `PongNewEra.html`'s script list from whatever
files exist in `game/content/**` (abilities, stages, conditions are globbed).
Run it from the project root after adding any content file:

```bash
python3 split_modular.py
```

It reads the monolithic backup (`PongNewEra.html.bak-modular`) and re-emits
`game/core.js` + the HTML. The content files are not rewritten by it.

## Registry API cheat-sheet (game/registry.js)

| API | Adds |
|---|---|
| `registerAbility(id, def)` | an ability (draft/codex/HUD/stacking aware) |
| `registerActive(id, fn)` | an active's trigger effect |
| `registerPassive(id, cd, fn)` | a passive's timed proc |
| `registerStage(id, def, builder)` | an arena (auto-wired into rotation) |
| `registerCondition(id, def, hooks)` | a hazard (auto-rolled every round) |

## Two-people workflow

1. Both pull the same base commit.
2. You add an ability → you create `game/content/abilities/yourthing.js`.
3. Your friend adds a stage → they create `game/content/stages/theirthing.js`.
4. Merge: the two new files + a regenerated `PongNewEra.html` (run the split
   script after merging to combine both script lists). Zero overlapping lines.
