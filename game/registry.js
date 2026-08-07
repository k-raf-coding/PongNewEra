/* ============================================================================
   Pong New Era — game/registry.js
   ----------------------------------------------------------------------------
   The ONE shared foundation: content registries + registration APIs. Every
   content module (abilities, stages, conditions, coaches, AI, synergies) loads
   after this file and registers into the containers below. The core engine
   (game/core.js) reads the populated registries at runtime.

   COLLABORATION RULES (two people, one game):
     • Adding an ability  → create game/content/abilities/<id>.js          (new file, no conflict)
     • Adding a stage     → create game/content/stages/<id>.js             (new file, no conflict)
     • Adding a hazard    → create game/content/conditions/<id>.js         (new file, no conflict)
     • New coach / AI / synergy → append to the matching content file.
     • NEVER edit this file or game/core.js to add CONTENT.
   ============================================================================ */

/* ---- Ability registry -------------------------------------------------- */
const ABILITIES = {};          // id -> { icon, name, rarity, cat, desc, ... }
const ABILITY_IDS = [];        // mirrors Object.keys(ABILITIES) (kept in sync by registerAbility)
const ACTIVE_ABILITIES = [];   // ids whose cat === 'active'
const ACTIVE_EFFECTS = {};     // id -> fn()  — fired when an active triggers
const PASSIVE_PROCS  = {};     // id -> fn()  — fired each time a passive's cooldown elapses
let passiveT = {};             // per-id timers for timed passives (ticked by the core engine)
const manualState = {};        // per-active cooldown state: { [id]: { cd, ready } }

const catOf = id => (ABILITIES[id] || {}).cat || 'passive';
const bindOf = id => ((ABILITIES[id].slot || ABILITIES[id].key) || '').toString();

function registerAbility(id, def) {
  if (ABILITIES[id]) { console.warn('registerAbility: "' + id + '" already exists'); return; }
  ABILITIES[id] = def;
  ABILITY_IDS.push(id);
  if (def.cat === 'active') {
    ACTIVE_ABILITIES.push(id);
    manualState[id] = { cd: 0, ready: true };   // safe even if registered after load
  }
}
function registerActive(id, fn) { ACTIVE_EFFECTS[id] = fn; }
function registerPassive(id, cd, fn) { ABILITIES[id].cd = cd; PASSIVE_PROCS[id] = fn; }

/* ---- Stage registry ---------------------------------------------------- */
const STAGE_DEFS = [];         // { id, name, theme, rotation, objects[], feature }
const STAGE_NAMES = {};        // id -> display name (filled by registerStage)
const STAGE_BUILDERS = {};     // id -> builder(P)
const BOSS_STAGES = {          // boss AI id -> its signature arena
  phantom: 'haunt', weaver: 'hive', mirror: 'prism',
  titan: 'peaks', warlock: 'fen', archon: 'tempest', leviathan: 'abyss',
};
const NORMAL_STAGES = ['city', 'crowd', 'dunes', 'nebula'];

function registerStage(id, def, builder) {
  STAGE_DEFS.push(Object.assign({ id }, def));
  if (builder) STAGE_BUILDERS[id] = builder;
  STAGE_NAMES[id] = def.name || id.toUpperCase();
  // Wire new arenas into rotation automatically: rotation 'normal' joins the normal
  // court tour, rotation 'boss' maps a boss (AI id === stage id) to this arena.
  if (def.rotation === 'normal' && !NORMAL_STAGES.includes(id)) NORMAL_STAGES.push(id);
  else if (def.rotation === 'boss') BOSS_STAGES[id] = id;
}

/* ---- Arena conditions (hazards) ---------------------------------------- */
const CONDITIONS = [];         // { id, icon, name, desc }
const COND_BY_ID = {};         // id -> condition def
const COND_HOOKS = {};         // id -> { setup?, tick?, onWall?, onServe?, player?, build?, vtick? }

function registerCondition(id, def, hooks) {
  if (COND_BY_ID[id]) { console.warn('registerCondition: "' + id + '" already exists'); return; }
  def.id = id;   // stamp the id so rollCondition()/COND_BY_ID lookups always work
  CONDITIONS.push(def);
  COND_BY_ID[id] = def;
  if (hooks) COND_HOOKS[id] = hooks;
}

let lastCondId = null;
function rollCondition() {
  // Every stage ALWAYS carries a randomized hazard now — never leave a level bare.
  // (Anti-repeat: never hand out the same hazard twice in a row when we can help it.)
  let id;
  do { id = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)].id; }
  while (id === lastCondId && CONDITIONS.length > 1);
  lastCondId = id;
  return id;
}

/* ---- Coaches / AI / synergies ------------------------------------------ */
const COACHES = [];            // { avatar, name, lines[] }
const AIS = {};                // id -> champion def
const NORMAL_POOL = ['wall', 'viper', 'diviner', 'smasher', 'glacier', 'gambler', 'knight', 'siren', 'falcon', 'tortoise', 'bastion', 'echo', 'zephyr', 'ogre'];
const BOSS_POOL = ['phantom', 'weaver', 'mirror', 'titan', 'warlock', 'archon', 'leviathan'];
const PERSONA = { defense: 'PURE DEFENSE', tricky: 'TRICKY SHOTS', aggressive: 'AGGRESSIVE', eccentric: 'ECCENTRIC' };
const SYNERGIES = [];          // { id, a, b, icon, name, desc }
