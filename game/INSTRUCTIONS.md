# Pong New Era — Quick Guide for AIs & Programmers

The game is split into an **engine** + **one file per piece of content**.
There is ONE rule — follow it and you cannot break anything:

> **ADDING CONTENT = CREATING A NEW FILE. NEVER EDIT EXISTING FILES.**
> New files can't collide, so two people can add content in parallel
> with zero merge conflicts.

## File map

| File | What it is | Do you edit it? |
|---|---|---|
| `PongNewEra.html` | Shell: script list + boot loader | No (regenerated) |
| `game/registry.js` | Registries + registration APIs | **NEVER** for content |
| `game/core.js` | Engine: physics, AI, input, HUD, draft | **NEVER** — it reads the registries |
| `game/content/abilities/<id>.js` | One ability per file | ➕ Create new |
| `game/content/stages/<id>.js` | One arena per file | ➕ Create new |
| `game/content/conditions/<id>.js` | One hazard per file | ➕ Create new |
| `game/content/coaches.js` | Coach animals + quips | Append only |
| `game/content/ai.js` | AI champions | Append only |
| `game/content/synergies.js` | Ability combos | Append only |
| `game/content/TEMPLATE_stage.js` | Copyable stage template | Copy it |

## After you add ANY file — run this once

```bash
python3 split_modular.py
```

It regenerates the HTML script list (new files are auto-included) and wires
new stages/abilities/hazards into rotation. Content files are never rewritten.

## Recipe: add a stage

1. Copy `game/content/TEMPLATE_stage.js` → `game/content/stages/mystage.js`
2. Set a lowercase `id`, then fill in `theme`, `objects`, `feature`, and the `build(P)` function.
3. Run the split script.

## Recipe: add an ability

Create `game/content/abilities/myability.js`:

```js
registerAbility('myability', {
  icon: '✨', name: 'My Ability', rarity: 'common',
  cat: 'active',        // 'active' | 'passive' | 'stat'
  slot: '1',            // actives: key 1-4 (or key: 'e' for legacy letters)
  cd: 8,                // cooldown seconds (actives/passives)
  desc: 'What it does.',
});
registerActive('myability', () => { /* effect when fired */ });
// registerPassive('myability', 6, () => { /* timed proc */ });   // passives
```

The draft, codex, HUD hotbar, cooldown bar, and stacking pick it up automatically.

## Recipe: add a hazard

Create `game/content/conditions/myhazard.js`:

```js
registerCondition('myhazard', {
  icon: '☄️', name: 'My Hazard', desc: 'What it does to the rally.',
}, {
  setup()  { /* seed round state */ },
  tick(dt) { /* per-frame mechanic */ },
  onWall(b)    { /* ball hit a wall */ },
  onServe(b)   { /* ball was served */ },
  player(dt, speedFactor, invert) { /* move player paddle; return true if moved */ },
  build()  { /* build THREE visuals into `hz` via hazAdd() */ },
  vtick(dt, pace) { /* animate visuals each frame */ },
});
```

Every round ALWAYS rolls a random hazard — never leave one unhandled.

## Useful runtime globals (for writing effects)

Defined by `core.js` and visible to all content files:

- Paddles/ball: `paddleR` (player), `paddleL` (CPU), `balls[]`, `ball`, `playerPlane`, `cpuPlane`
- State: `curCond` (hazard id), `state`, `run`, `scene`, `camera`, `renderer`
- Helpers: `procFlash(msg,x,y,color)`, `spawnBurst(...)`, `hazAdd(mesh)`, `sfx*()`,
  `hexOf()/hexStr()/mixHex()`, `floorDecal()`, `floorLine()`, `stageGroup`, `stageData`
- Timer idiom: store a timestamp on a top-level var (`smashArmed = true; smashArmedUntil = performance.now() + 3000;`) and check it in the main loop or your own hook.

## Testing your changes

The game MUST be served over HTTP (it loads `game/*.js` scripts):

```bash
cd <project root>
python3 -m http.server 8791
# open http://127.0.0.1:8791/PongNewEra.html
```

Check the console (F12) for errors after loading. Play a run and confirm your
content appears (draft cards / stage intro / hazard banner).

## Hard rules recap

1. Never edit `registry.js` or `core.js` to add content.
2. Never hand-edit the script list in `PongNewEra.html` — run the split script.
3. Every content file must be syntactically valid standalone JS (no imports/exports).
4. Adding to `coaches.js` / `ai.js` / `synergies.js` is append-only — if two people
   append simultaneously, add at opposite ends and merge manually.
