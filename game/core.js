/* ============================================================================
   Pong New Era — game/core.js (engine)
   ----------------------------------------------------------------------------
   The shared runtime + engine. Load AFTER game/registry.js and the content
   files (game/content/**) so the registries are populated before the engine
   reads them at runtime. Everything here is ENGINE — adding content should
   NEVER require an edit to this file.
   ============================================================================ */
const WIN_SCORE = 5;
// Court: X = across-court width, Y = height, Z = length (toward/away from you).
const CW = 640;            // court width (X)
const CH = 500;            // court height (Y)
const CL = 1740;           // court length (Z) — paddles sit closer for hotter rallies
const PADDLE_W = 132;      // player paddle width (X)
const PADDLE_H = 132;      // player paddle height (Y)
const PADDLE_T = 14;       // paddle thickness (Z)
const BALL_R = 8;
const EDGE = 46;           // paddle plane inset from the end wall
const PLAYER_SPEED = 500;
const BALL_START = 820, BALL_MAX = 1110, BALL_HARD_MAX = 1190;
const MAX_TILT = 66 * Math.PI / 180;
const CURVE_CAP = 65 * Math.PI / 180;
const SPIN_CURVE = 140, MAX_SPIN = 4;   // Magnus effect in 3D: spinX curves X, spinY curves Y
const SPIN_VIS_THRESH = 0.4;            // minimum |spin| before visuals (trail tint + HUD meter) engage
const MAX_BALLS = 3;
const START_LIVES = 3, MAX_LIVES = 6;
let COLORS = { player: '#191612', cpu: '#191612', ball: '#191612' };
/* ============================== Visual themes & fun modes ============================== */
// 'ink' = the classic e-ink paper look. 'vibrant' = dynamic neon (clean, but alive:
// the grid and ball glow pulse with the rally, paddles are cyan vs magenta).
let theme = 'ink';
let prevTheme = 'ink';     // theme before the current one (palette-remap source)
let funMode = 'none';            // 'none' | 'upside' | 'barrel'
// Logarithmic per-hit speed ramp: gains start hot and taper near the cap, so rallies
// speed up noticeably but can never snowball into impossible speeds.
function speedRamp(base, speed) {
  const t = clamp((speed - BALL_START) / Math.max(1, BALL_HARD_MAX - BALL_START), 0, 1);
  return Math.max(6, Math.round(base * Math.pow(1 - t, 1.25)));
}
let gridMesh = null;
let gridHue = 0.55;
const PALETTE = {
  ink: {
    bg: 0xf2efe6, floor: 0xefeae0, gridA: 0xc9c2ae, gridB: 0xd8d2c0,
    ink: 0x191612, mid: 0x6b6659, soft: 0xb9b3a2, paper: 0xfaf7ee,
    player: '#191612', cpu: '#191612',
    ballCore: 0xfaf7ee, ballPin: 0x191612,
    trailH: 0x4a463c, trailV: 0x8a8578, trailF: 0xc9c2ae,
    accent: 0xc0392b, glow: 0xffffff, dark: 0x191612,
  },
  vibrant: {
    // 'ink' here is a LIGHT slate so all structural elements (goal frames, dashes,
    // chevrons, pits, curbs) read clearly against the dark background.
    bg: 0x0a0d14, floor: 0x10141d, gridA: 0x26304d, gridB: 0x1a2134,
    ink: 0xd8deea, mid: 0x94a3b8, soft: 0x3d4657, paper: 0x111827,
    player: '#22d3ee', cpu: '#ff2d55',
    ballCore: 0xffffff, ballPin: 0x22d3ee,
    trailH: 0xf43f5e, trailV: 0x22d3ee, trailF: 0x475569,
    accent: 0x22d3ee, glow: 0x0f172a, dark: 0x0a0d14,
  },
  sunset: {
    // Sunset hour: deep violet night, cool cyan on your side, ember orange on theirs.
    bg: 0x240668, floor: 0x2a0b50, gridA: 0x8f5cff, gridB: 0x4a2a7a,
    ink: 0xffe3b3, mid: 0xff9d5c, soft: 0x5b2a86, paper: 0x2a0d5e,
    player: '#41ead4', cpu: '#ff8912',
    ballCore: 0xffffff, ballPin: 0x41ead4,
    trailH: 0xff8912, trailV: 0x41ead4, trailF: 0xff206e,
    accent: 0x41ead4, glow: 0xffb84d, dark: 0x12033a,
  },
};
let PALETTE_ACTIVE = PALETTE.ink;
let selBall = 'standard';     // the arena ball for this round (picked on the intro screen)
let flashVig = 0;             // flashbang vignette (decays toward 0)
let playerSlowT = 0;          // Chill ball: player paddle slow timer
let hazardScale = 1;          // stage hazards intensify as the run deepens
let windDir = 0, windMag = 1, windGustT = 0, windFlash = 0;   // gale-wind state: random direction + gust spikes
let bonks = [];               // cartoon impact words (Pizza-Tower style hit pops)
const BONK_WORDS = ['BONK!', 'POW!', 'WHAM!', 'BOOM!', 'ZAP!', 'SMACK!', 'THWACK!', 'KRAK!', 'BAM!', 'PING!', 'ZING!', 'KAPOW!', 'BOINK!', 'BLAM!', 'CLANG!', 'DONG!', 'FWAP!', 'SLAP!', 'SPLAT!', 'THUD!', 'BASH!', 'WHACK!', 'CRACK!', 'SWISH!', 'FWOOSH!', 'BZZT!', 'POW-POW!', 'KERBLAM!', 'BLAMMO!', 'CRUNCH!', 'SNIKT!', 'VROOM!', 'KABOOM!', 'WHAMMO!', 'SPROING!', 'TWANG!'];   // impact words, all ≤ 12 chars
const BONK_COLORS = ['#ff5d5d', '#ffd76a', '#8ef0ff', '#ff9ef5', '#7dffa8', '#ff9f43', '#7dd3fc', '#ffb84d', '#ffe066'];
let stageGroup = null, stageData = null, dataStreams = [];
let extraBallMeshes = [];
let extraShadowMeshes = [];   // pooled ground shadows for secondary balls (multiball depth)
// Arenas are AUTO-ASSIGNED: every boss commands its own dynamic stage, and normal
// rounds tour the courts in order. Players no longer pick stages — the arena follows
// the match (ball, rally count, close calls at the goal mouths, returns).
let stage = 'court';           // default clean court (no backdrop)
let stageCheer = 0;            // 1 -> 0 decay; stages erupt on goals and key hits
let stageLastT = 0;
function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}
function stageClean() {
  if (stageGroup) { scene.remove(stageGroup); disposeGroup(stageGroup); }
  stageGroup = null; stageData = null; dataStreams = [];
}
function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
const hexOf = c => parseInt(String(c).replace('#', ''), 16);
const hexStr = c => '#' + ('000000' + (c & 0xffffff).toString(16)).slice(-6);
// Stage scenery is palette-driven: every material is built from the active palette,
// so themes are pure color and stages are pure scenery. Rebuilt on theme OR stage change.

function makeStageGlowMesh(color, scale) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const c = cv.getContext('2d');
  const col = hexStr(color);
  const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, col + 'aa'); g.addColorStop(0.5, col + '44'); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
  m.scale.set(scale, scale, 1);
  return m;
}

/* Shared floor-decal helper: a flat, palette-tinted plane laid ON the court surface
   (never a wall, always below the ball's bounce plane). Auto-registers for shimmer. */
function floorDecal(w, d, color, opacity, x = CW / 2, z = 0, y = 0.5, ph = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  stageGroup.add(m);
  (stageData.floorMarks = stageData.floorMarks || []).push({ mesh: m, baseOp: opacity, ph });
  return m;
}
/* Shared floor-line helper: a thin flat bar lying in the floor plane (rotated via Z). */
function floorLine(x, z, len, rotZ, color, opacity) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, len), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
  m.rotation.z = rotZ;
  m.position.set(x, 0.5, z);
  stageGroup.add(m);
  (stageData.floorMarks = stageData.floorMarks || []).push({ mesh: m, baseOp: opacity, ph: Math.random() * 6 });
  return m;
}
/* Shared canvas-texture plane (live scoreboards, neon signs). Returns { mesh, cv, ctx }. */
function textPlane(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const ctx = cv.getContext('2d');
  draw(ctx);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
  stageGroup.add(m);
  return { mesh: m, cv, ctx, draw };
}

/* --- STAGE: SKYLINE CITY — a full neon canyon: layered far skyline, twin rows of
   leaning towers per flank, rooftop signs, ground glow strips, data streams, and a
   themed rally floor (street lanes + crosswalk ticks). --- */

const cpuPlane = -CL / 2 + EDGE;       // CPU paddle Z plane
const playerPlane = CL / 2 - EDGE;
let state = 'menu';
let run = { lives: START_LIVES, round: 1, wins: 0, abilities: [] };
let curAI = null;
let oppBoss = false;
let scores = { p: 0, c: 0 };
let balls = [];
let paddleL = { x: CW / 2, y: CH / 2, vx: 0, vy: 0 };   // CPU paddle (X,Y position, Z fixed)
let paddleR = { x: CW / 2, y: CH / 2, vx: 0, vy: 0 };   // player paddle
let paddleR2 = { x: CW / 2, y: CH / 2 };                // backup defender
let tNow = 0, last = 0;
let particles = [];
let shake = 0;
let serveTimer = 0;
let msg = '', msgT = 0;
let cpuRerollT = 0, cpuTargetX = CW / 2, cpuTargetY = CH / 2;
let hist = [];
let ghostCharges = 0, shieldsLeft = 0, vampGrow = 0, cpuShrink = 0;
let cpuFury = 0;   // CPU Fury: each denied point makes the CPU deadlier for the rest of the match
let phaseActive = false, phaseDur = 0, surgeActive = 0, frozenLeft = 0, weaverT = 0, surgeT = 0, phaseT = 0;
let frostT = 0, warpActive = 0, hexT = 6, hexActive = 0, quakeT = 7, quakeActive = 0;
let ghostCd = 0, charmed = false, empLockT = 0, glitchActiveT = 0, tremorT = 0;
let gambleT = 4, gambleFreeze = 0, parryT = 6, parryActive = 0, lureT = 7, lureActive = 0, shellT = 5, shellOpen = 0;
let batteryT = 8, batteryReady = false;
let chargeT = 0, chargeActive = 0;
let procs = [];
let phoenixUsed = false;
let serveLaunchT = 0;
let bastionT = 6, bastionActive = 0, echoT = 6, echoActive = 0, echoX = CW / 2, echoY = CH / 2;
let gustT = 7, gustActive = 0, rageT = 7, rageActive = 0;
let stormT = 8, stormActive = 0, tideT = 9, tideActive = 0, tideDir = 1;
let pendingDrafts = 0, draftContext = 'start';
let rally = 0, winStreak = 0;
// Manual (player-triggered) abilities: { [id]: { cd: seconds until ready, ready: bool } }
ACTIVE_ABILITIES.forEach(id => manualState[id] = { cd: 0, ready: true });
const keys = {};
let mouseX = CW / 2, mouseY = CH / 2, mouseActive = false;   // mouse aim state (player paddle plane)
let muted = false;
let sfx = null;
let curCond = null;
let obstacles = [];
let machFans = [];
let machBoosters = [];
let machSpinners = [];
let ghostSpawnT = 0, ghostWarn = null;
let slickVX = 0, slickVY = 0, wallFlashT = 0, hazardFlash = 0;

const has = id => run.abilities.includes(id);
const stacks = id => run.abilities.filter(x => x === id).length;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
// Diminishing returns: each stack is worth ~22% less than the last, so stacking never
// lets a stat run away (the game's scaling philosophy — strong early, capped late).
function dimStacks(n, per) { let s = 0; for (let i = 0; i < n; i++) s += per * Math.pow(0.78, i); return s; }
// Bernoulli stacking for chances: 20% + 20% + ... approaches ~67%, never 100%.
function bern(base, n) { return 1 - Math.pow(1 - base, n); }
function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
function beep(f0, f1, dur, type, vol) {
  if (muted || !sfx) return;
  try {
    const t = sfx.currentTime;
    const o = sfx.createOscillator(), g = sfx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* ignore */ }
}
const sfxPaddle = s => beep(170 + Math.min(s, BALL_MAX) * 0.45, 330, 0.07, 'square', 0.10);
// Rally escalation: the longer the rally, the higher the pitch — adrenaline that builds (Risk of Rain 2 style).
const sfxRallyTick = n => { if (n >= 4) beep(320 + Math.min(n, 20) * 22, 420, 0.05, 'square', 0.07); };
const sfxWall   = () => beep(430, 310, 0.05, 'triangle', 0.09);
const sfxServe  = () => beep(300, 340, 0.09, 'triangle', 0.08);
const sfxScore  = () => beep(540, 190, 0.28, 'sawtooth', 0.13);
const sfxPick   = () => { [660, 880].forEach((f, i) => setTimeout(() => beep(f, f, 0.12, 'square', 0.1), i * 70)); };
// Rarity-tinted pickup chime: bronze = single low blip, silver = two-step, gold = rising arpeggio.
const sfxRarity = r => {
  if (r === 'epic')   { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, f, 0.13, 'square', 0.11), i * 75)); }
  else if (r === 'rare') { [392, 587].forEach((f, i) => setTimeout(() => beep(f, f, 0.11, 'square', 0.1), i * 65)); }
  else                { beep(262, 330, 0.13, 'square', 0.1); }
};
const sfxShield = () => beep(700, 900, 0.18, 'sine', 0.14);
const sfxGhost  = () => beep(500, 300, 0.15, 'sine', 0.1);
const sfxWindGust = () => beep(170, 40, 0.34, 'sawtooth', 0.06);   // whoosh when the gale shifts
const sfxSuck     = () => beep(95, 28, 0.4, 'sine', 0.1);           // black-hole pull
const sfxBoost    = () => beep(230, 640, 0.14, 'square', 0.08);     // boost lane / booster launch
const sfxFan      = () => beep(130, 70, 0.12, 'triangle', 0.07);    // fan turbulence
const sfxWin    = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, f, 0.14, 'square', 0.11), i * 95));
const sfxLose   = () => beep(300, 110, 0.55, 'sawtooth', 0.12);
let renderer, scene, camera;
let hazardGroup = null;
let hz = null;
const $ = id => document.getElementById(id);
function inkify(c) {
  const h = (c || '#191612').replace('#', '');
  if (h.length < 6) return '#191612';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const k = Math.max(24, Math.min(200, v));
  const hx = k.toString(16).padStart(2, '0');
  return '#' + hx + hx + hx;
}
function synergyActive(s) { return !!s && has(s.a) && has(s.b); }
function playerPaddleH() {
  const tg = synergyActive(SYNERGIES.find(s => s.id === 'syn_titan'));
  const colossus = (1 + dimStacks(stacks('colossus'), 0.4)) * (tg ? 1.3 : 1);
  const hex = hexActive > 0 ? 0.7 : 1;
  // Length stacking is DIMINISHING (not linear) and hard-capped: no build may wall off the
  // whole court, so the CPU always has a reachable angle on you.
  const len = PADDLE_H * (1 + dimStacks(stacks('paddle_plus'), 0.25) + dimStacks(stacks('stat_paddle'), 0.14)) + vampGrow;
  return clamp(len * colossus * hex, 20, CH * 0.55);
}
function msgFlash(m) { msg = m; msgT = 0.9; }
function procFlash(text, x, y, color) {
  procs.push({ text, x: clamp(x, 20, CW - 20), y: clamp(y, 20, CH - 20), color: inkify(color), t: 0.8, max: 0.8 });
  if (procs.length > 6) procs.shift();
}
function spawnBurst(x, y, z, color, n) {
  // Colored themes keep the burst hue; e-ink drops it to a grayscale ink tone.
  const gc = (theme === 'vibrant' || theme === 'sunset') ? color : inkify(color);
  // Keep in-play sparks small, fast-fading and budgeted so they never clutter the view.
  const inPlay = state === 'play';
  const budget = inPlay ? Math.min(n, 7) : n;
  for (let i = 0; i < budget; i++) {
    if (inPlay && particles.length > 90) break;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const sp = inPlay ? 40 + Math.random() * 120 : 60 + Math.random() * 230;
    particles.push({ x, y, z, vx: Math.sin(ph) * Math.cos(th) * sp, vy: Math.sin(ph) * Math.sin(th) * sp, vz: Math.cos(ph) * sp, life: inPlay ? 0.2 + Math.random() * 0.2 : 0.4 + Math.random() * 0.35, max: inPlay ? 0.4 : 0.75, size: inPlay ? 1.4 + Math.random() * 1.6 : 2.5 + Math.random() * 3, color: gc });
  }
}
function bonkAt(x, y, z, speed) {
  if (bonks.length > 10) bonks.shift();
  bonks.push({ text: BONK_WORDS[Math.floor(Math.random() * BONK_WORDS.length)], color: BONK_COLORS[Math.floor(Math.random() * BONK_COLORS.length)], x, y, z, t: 0.62, max: 0.62, s: clamp(0.7 + speed / 1600, 0.7, 1.5), rot: (Math.random() * 2 - 1) * 0.3 });
}
function hzMat(color, opacity) { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }); }
function hzGlow(color, scale) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const col = hexStr(color);
  const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, col + 'aa'); g.addColorStop(0.5, col + '44'); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
  m.scale.set(scale, scale, 1);
  return m;
}
function hzArrow(color, size) {
  const g = new THREE.Group();
  const s = size || 1;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(26 * s, 2.6 * s, 2.2), hzMat(color, 0.85));
  const head = new THREE.Mesh(new THREE.BoxGeometry(9 * s, 10 * s, 2.2), hzMat(color, 0.85));
  head.position.set(16 * s, 0, 0);
  g.add(shaft); g.add(head);
  return g;
}

let smashArmed = false, smashArmedUntil = 0;   // Wild Smash (active, slot 1)

const hazAdd = m => { if (hazardGroup) hazardGroup.add(m); return m; };   // hazard-visual add helper


function startGame() {
'use strict';

// Surface any unexpected runtime error on the failure card so the real cause is visible.
// Guarded by a booted flag: once the game is running normally we stop hijacking the screen.
var __booted = false;
window.addEventListener('error', function (ev) {
  var el = document.getElementById('loadFail');
  if (__booted || !el) return;
  el.innerHTML = 'STARTUP ERROR.<br><br>' + (ev.message || 'Unknown error') + '<br><br>Reload the page.';
  el.classList.remove('hidden');
});
function webglSupported() {
  try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
}
// Diagnostic breadcrumbs: if anything fails to boot, log enough detail to pinpoint why.
function __diag(tag, extra) {
  try {
    console.log('[PongNewEra ' + tag + ']', extra || '', 'THREE.REVISION=' + (typeof THREE !== 'undefined' && THREE.REVISION ? THREE.REVISION : 'N/A'), 'inlineEngineBytes=' + (document.scripts && document.scripts[0] ? document.scripts[0].textContent.length : 'N/A'), 'state=' + (typeof state !== 'undefined' ? state : 'N/A'));
  } catch (e) { /* ignore */ }
}
if (typeof THREE === 'undefined') {
  document.getElementById('loadFail').classList.remove('hidden');
  return;
}
document.getElementById('loadFail').classList.add('hidden');

/* ============================== DOM refs ============================== */
const canvas = document.getElementById('game');

/* (moved: $ helper) */

const scorePEl = $('scoreP'), scoreCEl = $('scoreC'), levelChipEl = $('levelChip');
const heartsEl = $('hearts'), aiStatusEl = $('aiStatus'), pupIconsEl = $('pupIcons');
const spinMeterEl = $('spinMeter');
const menuEl = $('menu'), introEl = $('intro'), draftEl = $('draft');
const defeatEl = $('defeat'), overEl = $('over'), pauseEl = $('pauseOverlay');
const metaEl = $('meta');
const btnMute = $('btnMute'), btnPause = $('btnPause');

/* Floating center message + proc text (DOM, projected over the 3D view). */
const msgBox = document.createElement('div');
msgBox.style.cssText = 'position:fixed;left:50%;top:34%;transform:translateX(-50%);z-index:6;font-family:"Pixelify Sans",monospace;font-weight:700;font-size:22px;color:#191612;text-shadow:3px 3px 0 #d8d2c2, 2px 2px 0 rgba(255,255,255,.8);pointer-events:none;text-align:center;';
document.body.appendChild(msgBox);
const procsEl = document.createElement('div');
procsEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:6;pointer-events:none;';
document.body.appendChild(procsEl);
const bonksEl = document.createElement('div');
bonksEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:7;pointer-events:none;';
document.body.appendChild(bonksEl);
const flashEl = document.createElement('div');
flashEl.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5;pointer-events:none;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 55%, transparent 82%);opacity:0;mix-blend-mode:screen;';
document.body.appendChild(flashEl);

/* ============================== Constants (3D court) ============================== */

/* (moved: constants) */



/* (moved: themes & palettes) */

const BALL_TYPES = [
  { id: 'standard', icon: '⚪', name: 'Standard',  desc: 'The classic rally ball — nothing fancy.' },
  { id: 'rocket',   icon: '🚀', name: 'Rocket',    desc: '+25% serve speed, +30 px/s on every paddle hit.' },
  { id: 'flash',    icon: '💥', name: 'Flashbang', desc: 'Flashes every ~3.5s — stuns whoever is receiving for a blink.' },
  { id: 'holo',     icon: '👻', name: 'Holo',      desc: 'Spawns faint fake clones that fool the CPU.' },
  { id: 'wave',     icon: '🌊', name: 'Wave',      desc: 'Sways side to side as it flies.' },
  { id: 'split',    icon: '🍀', name: 'Split',     desc: 'Every paddle hit cracks off a short-lived mini-ball.' },
  { id: 'heavy',    icon: '🪨', name: 'Heavy',     desc: 'Dips with gravity — low, weird bounces.' },
  { id: 'chill',    icon: '❄️', name: 'Chill',     desc: 'Hits slow the receiver\'s paddle for a moment.' },
  { id: 'charge',   icon: '🔋', name: 'Charge',    desc: '+45 px/s per paddle hit — ramps all rally.' },
  { id: 'jitter',   icon: '🎲', name: 'Jitter',    desc: 'Randomly twitches direction mid-flight.' },
  { id: 'trick',    icon: '🃏', name: 'Feint',     desc: 'One sharp fake curve per flight.' },
  { id: 'echo',     icon: '🫧', name: 'Echo',      desc: 'Leaves ghost trails and ring bursts on every bounce.' },
];

function rebuildGrid() {
  if (!scene || !gridMesh) return;
  scene.remove(gridMesh);
  const P = PALETTE_ACTIVE;
  if (theme === 'vibrant' || theme === 'sunset') {
    // Single-color grid: we drive its hue per-frame so the court breathes.
    gridMesh = new THREE.GridHelper(Math.max(CW + 400, CL + 400), 64, 0x26304d, 0x26304d);
    gridMesh.material.vertexColors = false;
    gridMesh.material.color = new THREE.Color().setHSL(theme === 'sunset' ? 0.52 : 0.55, 0.62, 0.4);
  } else {
    gridMesh = new THREE.GridHelper(Math.max(CW + 400, CL + 400), 64, P.gridA, P.gridB);
  }
  gridMesh.position.set(CW / 2, 0, 0);
  gridMesh.material.transparent = true; gridMesh.material.opacity = 0.5;
  scene.add(gridMesh);
}

/* ============================== Stage backdrops ==============================
   The arena sits on a stage: a neon cyberpunk skyline (vibrant theme) or a warm
   sunset sun + horizon (sunset theme). Built once, toggled per theme, and always
   placed well behind the far goal so it never obstructs play. */

/* (moved: stage state) */


/* (moved: stage registry (moved to game/registry.js)) */

function stageForRound() {
  const opp = opponentFor(run.round);
  return opp.boss ? (BOSS_STAGES[opp.id] || 'nebula') : NORMAL_STAGES[(run.round - 1) % NORMAL_STAGES.length];
}

/* (moved: stage helpers (dispose/clean/color)) */
function buildStage() {
  if (!scene) return;
  stageClean();
  stageGroup = new THREE.Group(); stageGroup.name = 'stage';
  const P = PALETTE[theme];
  const builder = STAGE_BUILDERS[stage];
  if (builder) builder(P);
  scene.add(stageGroup);
}

/* Shared soft-glow disc (palette-tinted) for stage lighting — used by boss arenas. */

/* (moved: stage helpers (glow/decal/line/text)) */

/* (moved: stage builder buildStageCity) */


/* --- STAGE: STADIUM CROWD — a full arena bowl: four tiers of spectators per side
   that track the ball and erupt on goals, overhead light pods, and a LIVE scoreboard
   behind the far goal that shows the real match score. Painted rally floor. --- */

/* (moved: stage builder buildStageCrowd) */


/* --- STAGE: EMPTY DUNES — a vast desert: layered dune seas on both flanks, distant
   mesas behind the far goal, a wandering sun, drifting heat clouds, and a sand-rippled
   rally floor. --- */

/* (moved: stage builder buildStageDunes) */


/* --- STAGE: VOID NEBULA — a deep-space field: dense starfield, drifting nebula
   clouds, a moon, and a star-dusted rally floor with a central glow. --- */

/* (moved: stage builder buildStageNebula) */


/* --- STAGE: THE HAUNTED HALLS (The Phantom) — a full spectral graveyard: leaning
   tombstones in rows, a ruined keep behind the far goal, drifting mist banks, overhead
   fog, wisp-lights, and a cracked, rune-lit rally floor. --- */

/* (moved: stage builder buildStageHaunt) */


/* --- STAGE: THE WEB-CAVERN (The Weaver) — a full den: a giant cavern web behind the
   far goal, strand columns along the flanks, hanging cocoon clusters, overhead silk,
   and web lines radiating across the rally floor. --- */

/* (moved: stage builder buildStageHive) */


/* --- STAGE: HALL OF PRISMS (The Mirror) — a full mirrored hall: crystal shards
   flanking the court, floor-to-ceiling mirror columns, hanging ceiling shards, light
   beams, reflection panels that flash on returns, and a checker mirror rally floor. --- */

/* (moved: stage builder buildStagePrism) */


/* --- STAGE: THE MONOLITHS (The Titan) — a mountain fastness: two layers of jagged
   peaks behind the far goal, giant stone colossi on the flanks, storm clouds wreathed
   around the summits, twin trembling monoliths, and a cracked rune-lit rally floor. --- */

/* (moved: stage builder buildStagePeaks) */


/* --- STAGE: THE CURSED FEN (The Warlock) — a full ritual swamp: a spinning rune
   circle, floating rune stones, braziers, dead trees on the flanks, hanging vines,
   will-o'-wisps, a crescent moon, and a swampy rune-lit rally floor. --- */

/* (moved: stage builder buildStageFen) */


/* --- STAGE: THE ETERNAL STORM (The Archon) — a full sky-temple storm: churning cloud
   banks, falling rain, floating rune platforms, crackling lightning, and a rain-dark
   rally floor with lightning-scar streaks. --- */

/* (moved: stage builder buildStageTempest) */


/* --- STAGE: THE SUNKEN ABYSS (The Leviathan) — a full ocean: light shafts that follow
   the ball, schools of swimming fish, a kelp forest, coral/shipwreck silhouettes, rising
   bubbles, and a sand-rippled floor with a light pool. --- */

/* (moved: stage builder buildStageAbyss) */


/* Per-frame stage animation: every stage reacts to the ball's position/speed. */
function updateStage() {
  if (!stageGroup || stage === 'none' || stage === 'court' || !stageData) return;
  const dt = clamp(tNow - stageLastT, 0, 1 / 30); stageLastT = tNow;
  const b = balls[0];
  const bx = b ? b.x : CW / 2, bz = b ? b.z : 0, bs = b ? b.speed : BALL_START;
  stageCheer = Math.max(0, stageCheer - dt * 1.7);
  // Match-pace hooks shared by every arena: close calls at the goal mouths,
  // rally escalation, and ball speed drive flashes / surges so stages follow the action.
  const close = state === 'play' && balls.some(x => Math.abs(x.z) > CL / 2 - 150);
  const rallyHeat = clamp((rally - 4) / 10, 0, 1);
  const pace = clamp((bs - BALL_START) / 420, 0, 1);
  // Themed rally floors shimmer + brighten with ball speed and close calls (every stage).
  if (stageData.floorMarks) {
    for (const f of stageData.floorMarks) {
      const shimmer = f.baseOp * (0.72 + 0.28 * Math.sin(tNow * 1.9 + f.ph)) + pace * 0.05 + (close ? 0.07 : 0);
      f.mesh.material.opacity = clamp(shimmer, 0, 1);
    }
  }
  if (stage === 'city') {
    // Very few building lights slowly turn OFF, stay off a while, then slowly come
    // back - a long, lazy cycle, never a flash. Picks across the skyline + towers.
    const W = stageData.winPool;
    if (W && W.length) {
      const act = stageData.winActive || (stageData.winActive = []);
      if (act.length < 3 && Math.random() < dt * 0.14) {
        const pick = W[Math.floor(Math.random() * W.length)];
        if (pick && !act.some(e => e.src === pick)) {
          act.push({ src: pick, t: 0, lastB: 1,
            dimT: 1.4 + Math.random() * 1.0,
            holdT: 8 + Math.random() * 14,
            riseT: 1.8 + Math.random() * 1.4 });
        }
      }
      for (let i = act.length - 1; i >= 0; i--) {
        const e = act[i];
        const srcW = e.src;
        e.t += dt;
        let b;
        if (e.t < e.dimT) b = 1 - (e.t / e.dimT) * 0.85;
        else if (e.t < e.dimT + e.holdT) b = 0.15;
        else if (e.t < e.dimT + e.holdT + e.riseT) b = 0.15 + ((e.t - e.dimT - e.holdT) / e.riseT) * 0.85;
        else b = 1;
        if (e.t >= e.dimT + e.holdT + e.riseT) {
          if (srcW.kind === 'mesh') srcW.mesh.material.opacity = srcW.baseOp;
          else drawCityCell(srcW, 1);
          act.splice(i, 1);
          continue;
        }
        if (srcW.kind === 'mesh') srcW.mesh.material.opacity = srcW.baseOp * b;
        else if (Math.abs(b - e.lastB) > 0.02) drawCityCell(srcW, b);
        e.lastB = b;
      }
    }
    // Steam vents puff softly; silhouetted pedestrians shuffle the sidewalks.
    for (const st of stageData.steam) {
      const tk = (tNow + st.ph) % st.dur;
      const k = tk / st.dur;
      st.mesh.position.y = st.baseY + k * st.rise;
      st.mesh.material.opacity = Math.sin(k * Math.PI) * st.maxOp;
      st.mesh.scale.x = st.baseScale * (1 + k * 0.7);
      st.mesh.scale.y = st.baseScale * 1.6 * (1 + k * 0.9);
    }
    for (const p of stageData.peds) {
      p.group.position.z += p.dir * p.speed * dt;
      if (p.group.position.z > p.maxZ) { p.dir = -1; p.group.rotation.y = Math.PI; }
      if (p.group.position.z < p.minZ) { p.dir = 1; p.group.rotation.y = 0; }
      p.group.position.y = Math.abs(Math.sin(tNow * 4.4 + p.ph)) * 1.6;
      const sw = Math.sin(tNow * 4.4 + p.ph) * 0.55;
      p.legL.rotation.x = -sw; p.legR.rotation.x = sw;
      p.armL.rotation.x = sw; p.armR.rotation.x = -sw;
      p.visor.material.opacity = 0.75 + 0.25 * Math.sin(tNow * 2 + p.ph);
    }
  
  } else if (stage === 'crowd') {
    for (const s of stageData.crowd) {
      s.head.rotation.z = clamp((bx - s.x) * 0.0025, -0.35, 0.35);
      const wave = Math.sin(tNow * 2.4 + s.phase);
      s.body.position.y = s.baseY + wave * 1.8 + stageCheer * 15;
      s.head.position.y = s.body.position.y + 10;
    }
    // Overhead light pods pulse and flare with close calls.
    for (const l of stageData.lights) {
      l.mesh.material.opacity = 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(tNow * 2.6 + l.ph)) + stageCheer * 0.3 + (close ? 0.22 : 0);
    }
    // LIVE scoreboard: redraw only when the score changes, pulse on close calls.
    if (stageData.board) {
      const bd = stageData.board;
      if (bd.lastP !== scores.p || bd.lastC !== scores.c) {
        bd.lastP = scores.p; bd.lastC = scores.c;
        bd.draw(bd.ctx);
        bd.mesh.material.map.needsUpdate = true;
      }
      bd.mesh.material.opacity = clamp(0.85 + 0.12 * Math.sin(tNow * 2) + (close ? 0.15 : 0) + pace * 0.05, 0, 1);
    }
  } else if (stage === 'dunes') {
    for (const d of stageData.dunes) {
      d.mesh.position.z += d.speed * dt;
      if (d.mesh.position.z > CL / 2 + 400) d.mesh.position.z -= (CL + 800);
      if (d.mesh.position.z < -CL / 2 - 500) d.mesh.position.z += (CL + 800);
    }
    if (stageData.sun) {
      const tx = CW / 2 + (bx - CW / 2) * 0.5;
      stageData.sun.mesh.position.x += (tx - stageData.sun.mesh.position.x) * Math.min(1, dt * 3);
    }
    // Heat-haze clouds drift across the horizon, quickening with ball speed.
    for (const c of stageData.clouds) {
      c.mesh.position.x += (10 + pace * 60) * dt;
      if (c.mesh.position.x > CW + 350) c.mesh.position.x = -350;
      c.mesh.material.opacity = 0.16 + 0.09 * Math.sin(tNow * 1.4 + c.ph) + pace * 0.08;
    }
  } else if (stage === 'nebula') {
    if (stageData.stars) {
      stageData.stars.rotation.y += dt * 0.035;
      stageData.stars.rotation.z = Math.sin(tNow * 0.06) * 0.03;
    }
    const swell = 1 + clamp((bs - BALL_START) / 700, 0, 1) * 0.5;
    for (const g of stageData.glows) {
      g.mesh.scale.setScalar(g.base * swell);
      g.mesh.material.opacity = 0.3 + 0.16 * Math.sin(tNow * 1.7 + g.ph);
    }
    // Nebula clouds drift; the moon breathes.
    for (const c of stageData.clouds) {
      if (c.mesh.scale.x > 200) {
        c.mesh.position.x += (8 + pace * 40) * dt;
        if (c.mesh.position.x > CW + 500) c.mesh.position.x = -450;
      } else {
        c.mesh.position.y = CH * 1.05 + Math.sin(tNow * 0.7 + c.ph) * 14;
        c.mesh.material.opacity = 0.55 + 0.2 * Math.sin(tNow * 1.1 + c.ph);
      }
    }
  } else if (stage === 'haunt') {
    for (const w of stageData.wisps) {
      w.mesh.position.x += (bx - w.mesh.position.x) * Math.min(1, dt * 0.5) + Math.sin(tNow * 1.1 + w.ph) * 12 * dt;
      w.mesh.position.y += Math.sin(tNow * 1.7 + w.ph) * 14 * dt;
      w.mesh.material.opacity = 0.25 + 0.3 * Math.abs(Math.sin(tNow * 2 + w.ph)) + (close ? 0.4 : 0) + rallyHeat * 0.15;
    }
    for (const t of stageData.tombs) {
      if (!t.rim) continue;
      t.mesh.rotation.z = clamp((CW / 2 - bx) * 0.0005, -0.2, 0.2) + (close ? 0.05 : 0);
      t.rim.material.opacity = 0.4 + 0.3 * Math.sin(tNow * 3 + t.mesh.position.x);
    }
    for (const m of stageData.mist) {
      m.mesh.position.x += m.speed * dt;
      if (m.mesh.position.x > CW + 300) m.mesh.position.x = -300;
      if (m.mesh.position.x < -300) m.mesh.position.x = CW + 300;
      m.mesh.material.opacity = 0.1 + 0.08 * Math.sin(tNow * 0.8 + m.mesh.position.z);
    }
  } else if (stage === 'hive') {
    for (const w of stageData.web) {
      const k = (w.base + pace * 26 + close * 14) / w.base;
      w.mesh.scale.setScalar(k);
      w.mesh.material.opacity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(tNow * 2.4 + w.ph)) + pace * 0.2;
    }
    for (const c of stageData.cocoons) {
      c.pod.rotation.z = clamp((bx - c.x) * 0.0012, -0.3, 0.3) + Math.sin(tNow * 1.4 + c.ph) * 0.04;
      c.rope.scale.y = 1 + (close ? 0.25 : 0) + rallyHeat * 0.2;
    }
  } else if (stage === 'prism') {
    for (const s of stageData.shards) {
      s.mesh.rotation.y += dt * (0.4 + (close ? 4 : 0)) * s.side;
      s.mesh.rotation.x = clamp((bx - CW / 2) * 0.0006 * s.side, -0.25, 0.25);
      s.mesh.material.opacity = 0.6 + 0.25 * Math.sin(tNow * 2 + s.ph);
    }
    for (const p of stageData.panels) {
      p.mesh.material.opacity = 0.08 + 0.05 * Math.sin(tNow * 1.6 + p.ph) + (close ? 0.22 : 0) + pace * 0.08;
      p.seam.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(tNow * 3 + p.ph)) + (close ? 0.4 : 0);
    }
    // Mirror columns' seams + hanging ceiling shards + light beams all follow the rally.
    for (const c of stageData.columns) {
      c.seam.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(tNow * 2.4 + c.ph)) + (close ? 0.3 : 0) + pace * 0.15;
    }
    for (const ce of stageData.ceiling) {
      ce.mesh.rotation.z = Math.sin(tNow * 0.9 + ce.ph) * 0.08;
      ce.mesh.position.y = ce.baseY + Math.sin(tNow * 1.3 + ce.ph) * 6;
    }
    for (const bm of stageData.beams) {
      bm.mesh.material.opacity = 0.09 + 0.07 * Math.abs(Math.sin(tNow * 1.4 + bm.ph)) + pace * 0.08 + (close ? 0.06 : 0);
    }
  } else if (stage === 'peaks') {
    for (const m of stageData.monoliths) {
      const tremble = 0.004 + pace * 0.01 + (close ? 0.03 : 0) + rallyHeat * 0.01;
      m.mesh.rotation.z = (Math.sin(tNow * 9) + Math.sin(tNow * 13.7)) * tremble;
      for (const band of m.bands) band.material.opacity = 0.45 + 0.35 * Math.sin(tNow * 2.2 + m.side) + pace * 0.2 + (close ? 0.3 : 0);
    }
    // Mountain layers breathe gently; storm clouds race with the ball.
    for (const pk of stageData.peaks) {
      if (pk.baseY === undefined) pk.baseY = pk.mesh.position.y;
      pk.mesh.position.y = pk.baseY + Math.sin(tNow * 0.8 + pk.mesh.position.x * 0.02) * 4;
    }
    for (const c of stageData.clouds) {
      c.mesh.position.x += (16 + pace * 90) * dt;
      if (c.mesh.position.x > CW + 400) c.mesh.position.x = -350;
      c.mesh.material.opacity = 0.35 + 0.15 * Math.sin(tNow * 1.6 + c.ph) + pace * 0.15;
    }
  } else if (stage === 'fen') {
    stageData.circle.rotation.z += dt * (0.2 + pace * 1.6 + (close ? 2.2 : 0));
    for (const r of stageData.runes) {
      const pulse = 1 + 0.12 * Math.sin(tNow * 2.6 + r.ph) + rallyHeat * 0.2 + (close ? 0.15 : 0);
      r.stone.position.y = r.baseY + Math.sin(tNow * 1.9 + r.ph) * 7;
      r.stone.scale.setScalar(pulse);
      r.rune.material.opacity = 0.5 + 0.4 * Math.sin(tNow * 3.2 + r.ph) + pace * 0.3;
    }
    for (const f of stageData.flames) {
      f.flame.scale.setScalar(1 + pace * 0.6 + Math.sin(tNow * 7 + f.ph) * 0.25 + (close ? 0.4 : 0));
      f.flame.material.opacity = 0.5 + 0.4 * Math.sin(tNow * 6 + f.ph);
    }
    // Dead trees + hanging vines sway with the match's energy.
    for (const t of stageData.trees) {
      t.trunk.rotation.z = Math.sin(tNow * 1.1 + t.ph) * 0.04 + pace * 0.02 * Math.sin(tNow * 2.2 + t.ph);
    }
  } else if (stage === 'tempest') {
    for (const c of stageData.clouds) {
      c.mesh.position.x += (30 + pace * 260 + rallyHeat * 60) * dt;
      if (c.mesh.position.x > CW + 400) c.mesh.position.x = -400;
      c.mesh.material.opacity = 0.4 + 0.15 * Math.sin(tNow * 1.8 + c.ph) + pace * 0.2;
    }
    for (const lb of stageData.bolts) {
      let flash = Math.random() < (close ? 0.35 : 0.02) ? 0.95 : 0;
      lb.flash = Math.max(lb.flash || 0, flash);
      lb.flash = Math.max(0, lb.flash - dt * 5);
      for (const m of lb.mats) m.opacity = lb.flash;
      lb.group.position.x = CW * (0.2 + lb.ph * 0.3) + (bx - CW / 2) * 0.2;
    }
    // Rain falls harder as the rally and ball speed climb.
    for (const r of stageData.rain) {
      r.mesh.position.y -= (190 + pace * 340 + rallyHeat * 70) * dt;
      if (r.mesh.position.y < -50) r.mesh.position.y = 430;
    }
    // Rune platforms bob higher with the storm's fury.
    for (const p of stageData.platforms) {
      p.plat.position.y = p.baseY + Math.sin(tNow * 1.2 + p.ph) * (7 + pace * 6);
      p.rune.position.y = p.plat.position.y - 7;
      p.rune.material.opacity = 0.4 + 0.3 * Math.abs(Math.sin(tNow * 2.6 + p.ph)) + pace * 0.2;
    }
  } else if (stage === 'abyss') {
    for (const bu of stageData.bubbles) {
      bu.mesh.position.y += (bu.speed + rallyHeat * 80 + pace * 30) * dt;
      if (bu.mesh.position.y > CH + 10) bu.mesh.position.y = 4;
    }
    for (const k of stageData.kelp) {
      k.mesh.rotation.z = clamp((bx - k.baseX) * 0.0011, -0.35, 0.35) + Math.sin(tNow * 1.3 + k.ph) * 0.06;
      k.mesh.material.opacity = 0.55 + 0.25 * Math.sin(tNow * 2 + k.ph) + pace * 0.2 + (close ? 0.2 : 0);
    }
    // Light shafts + the floor light pool all track the ball.
    for (const s of stageData.shafts) {
      const tx = CW / 2 + (bx - CW / 2) * 0.6;
      s.mesh.position.x += (tx - s.mesh.position.x) * Math.min(1, dt * 3.5);
      s.mesh.material.opacity = 0.4 + pace * 0.35 + (close ? 0.28 : 0);
    }
    if (stageData.pool) {
      const px = CW / 2 + (bx - CW / 2) * 0.4;
      stageData.pool.position.x += (px - stageData.pool.position.x) * Math.min(1, dt * 4);
      stageData.pool.scale.setScalar(300 + pace * 90 + (close ? 40 : 0));
    }
    // Schools of fish swim the flanks, quickening with the rally.
    for (const f of stageData.fish) {
      f.mesh.position.z += f.dir * (f.speed + pace * 40 + rallyHeat * 25) * dt;
      if (f.mesh.position.z > CL / 2 + 260) f.mesh.position.z = -CL / 2 - 260;
      if (f.mesh.position.z < -CL / 2 - 260) f.mesh.position.z = CL / 2 + 260;
      f.mesh.position.y = f.baseY + Math.sin(tNow * 1.8 + f.ph) * 6;
      f.mesh.rotation.z = Math.sin(tNow * 2 + f.ph) * 0.18;
    }
  }
}

function applyTheme() {
  const P = PALETTE[theme];
  PALETTE_ACTIVE = P;
  document.body.classList.toggle('vibrant', theme === 'vibrant');
  document.body.classList.toggle('sunset', theme === 'sunset');
  COLORS = { player: P.player, cpu: P.cpu, ball: P.player };
  if (renderer) { renderer.setClearColor(P.bg); scene.fog.color.set(P.bg); }
  if (!scene) return;
  // Recolor every scene material by palette matching (previous palette -> new palette),
  // so walls, frames, pits, dashes, chevrons, paddles all restyle at once.
  const OLD = PALETTE[prevTheme];
  prevTheme = theme;
  const map = [[OLD.bg, P.bg], [OLD.floor, P.floor], [OLD.ink, P.ink], [OLD.mid, P.mid], [OLD.soft, P.soft], [OLD.paper, P.paper]];
  scene.traverse(obj => {
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m && m.color) {
          const hex = m.color.getHex();
          for (const [from, to] of map) { if (hex === from) { m.color.set(to); break; } }
          m.needsUpdate = true;
        }
      }
    }
  });
  rebuildGrid();
  // Stage scenery is palette-driven: rebuilt with the active palette on theme change.
  buildStage();
  buildHazardVisuals();
  if (meshes.ball) {
    meshes.ball.children[0].material.color.set(P.ballCore);
    meshes.ball.children[1].material.color.set(P.ballPin);
    meshes.ball.children[2].material.color.set(P.ballPin);
  }
  for (const g of [meshes.voidGlowP, meshes.voidGlowC, meshes.glowL, meshes.glowR, meshes.ballGlow]) {
    if (g && g.material) g.material.color.set(P.glow);
  }
  // The black hole stays dark in every theme; rim/halo pick warm accent tones.
  if (meshes.blackhole) meshes.blackhole.material.color.set(P.dark);
  if (meshes.blackholeRim) meshes.blackholeRim.material.color.set(theme === 'ink' ? 0x6b6659 : 0xffb04d);
  if (meshes.blackholeHalo) meshes.blackholeHalo.material.color.set(theme === 'ink' ? 0xffffff : 0xb78cff);
  gridHue = 0.55;
  META.vTheme = theme; META.funMode = funMode; metaSave();
  updateVisualsUI();
}
// e-ink mapper: any color -> grayscale ink tone (keeps brightness hierarchy, drops hue)

/* (moved: function inkify) */

const FONT_PIXEL = '"Pixelify Sans", monospace';
const FONT_BODY = '"Pixelify Sans", monospace';

/* (moved: paddle planes) */
     // player paddle Z plane
const PAD_CAP_X = CW / 2 - 20;         // paddle travel limit (X)

/* ============================== Abilities ==============================
   The whole progression system, rebuilt around THREE categories:
     cat 'active'  — player-triggered on a cooldown. NEW actives bind to SLOTS 1-4
                     (`slot` field → number keys); the 5 legacy actives keep their
                     letter keys (Q/E/R/T/F) until the roster is replaced.
     cat 'passive' — always-on effects. NEW: a passive may declare `cd` (seconds) to
                     tick a timed proc — register it via registerPassive(id, cd, fn).
     cat 'stat'    — raw stat bumps, read by the stat helper functions.
   Adding a new ability = ONE registerAbility(id, def) call + its effect registered
   through registerActive / registerPassive (or a hook in the physics code). The
   draft offers, codex, HUD, cooldown bar and stacking all read this table and the
   derived lists automatically — no wiring beyond the entry + its effect. */

/* (moved: abilities data + registration APIs) */


/* ============================== Coaches (the upgrade-screen animals) ==============================
   Five animals run the upgrade screen after every win. Each has its own quip pool of
   philosophy, dad jokes, haiku, Twitch lore and game-dev satire — randomized every visit. */

/* (moved: coaches) */
;

/* ============================== Meta-progression ============================== */
const META_UPGRADES = {
  meta_hp:     { icon: '❤️', name: 'Vitality Core',  desc: '+1 max life on every run.', max: 2, cost: 8, inc: 1 },
  meta_luck:   { icon: '✨', name: 'Rarity Sigil',   desc: '+10% rare & epic draft odds.', max: 3, cost: 7, inc: 10 },
  meta_start:  { icon: '🎁', name: 'Head Start',     desc: 'Begin every run with 1 random free ability.', max: 1, cost: 12, inc: 1 },
};
const META_IDS = Object.keys(META_UPGRADES);

/* ============================== Synergies ============================== */

/* (moved: synergies) */
;

/* ============================== Arena conditions ============================== */

/* (moved: conditions data) */
;

/* (moved: cond_by_id (moved to registry)) */


/* ============================== AI roster ============================== */

/* (moved: ai roster) */
;

/* (moved: pool/persona (moved to registry)) */


/* (moved: pool/persona (moved to registry)) */


/* (moved: pool/persona (moved to registry)) */


/* ============================== State ============================== */

/* (moved: game state) */

function maxLives() { return Math.min(MAX_LIVES, START_LIVES + stacks('stat_life') + META_UPGRADES.meta_hp.inc * metaLvl('meta_hp')); }

/* ============================== Meta-progression ============================== */
let META = { cores: 0, upg: {}, seenPups: [], seenAI: [], seenSyn: [] };
function metaLoad() {
  try { const d = JSON.parse(storeGet('pongnewera_meta') || 'null'); if (d && typeof d === 'object') META = Object.assign(META, d); META.upg = META.upg || {}; META.seenPups = META.seenPups || []; META.seenAI = META.seenAI || []; META.seenSyn = META.seenSyn || []; } catch (e) { /* ignore */ }
}
function metaSave() { try { storeSet('pongnewera_meta', JSON.stringify(META)); } catch (e) { /* ignore */ } }
function metaLvl(id) { return META.upg[id] || 0; }
function metaMaxed(id) { return metaLvl(id) >= META_UPGRADES[id].max; }
function earnCores(n) { META.cores += n; metaSave(); updateMetaUI(); }
function codexPup(id) {
  if (META.seenPups.includes(id)) return;
  META.seenPups.push(id); META.cores += 1; metaSave();
  msgFlash('CODEX: ' + ABILITIES[id].name + ' +1⚡');
}
function codexAI(id) {
  if (META.seenAI.includes(id)) return;
  META.seenAI.push(id); META.cores += 1; metaSave();
  msgFlash('CODEX: ' + AIS[id].name + ' +1⚡');
}
function codexSyn(id) {
  const s = SYNERGIES.find(x => x.id === id);
  if (!s || META.seenSyn.includes(id)) return;
  META.seenSyn.push(id); META.cores += 1; metaSave();
  procFlash('SYNERGY! ' + s.name + ' +1⚡', CW / 2, CH / 2 - 60, '#38e1ff');
  sfxWin();
}
function updateMetaUI() {
  const el = $('menuCores'); if (el) el.textContent = '⚡ CORES: ' + META.cores;
  const mc = $('metaCores'); if (mc) mc.textContent = 'CORES: ' + META.cores;
  const cl = $('codexLine');
  if (cl) cl.textContent = `Abilities ${META.seenPups.length}/${ABILITY_IDS.length} · Champions ${META.seenAI.length}/${Object.keys(AIS).length} · Synergies ${META.seenSyn.length}/${SYNERGIES.length}`;
}
function upgradeMeta(id) {
  const u = META_UPGRADES[id];
  if (metaMaxed(id) || META.cores < u.cost) return;
  META.cores -= u.cost;
  META.upg[id] = metaLvl(id) + 1;
  metaSave(); sfxPick();
  renderMetaList();
}
function renderMetaList() {
  const el = $('metaList');
  el.innerHTML = '';
  META_IDS.forEach((id, i) => {
    const u = META_UPGRADES[id];
    const lvl = metaLvl(id), maxed = metaMaxed(id);
    const card = document.createElement('div');
    card.className = 'meta-card' + (maxed ? ' maxed' : '');
    card.style.animationDelay = (i * 0.04) + 's';
    card.innerHTML = `<div class="mt-ic">${u.icon}</div><div style="flex:1"><div class="mt-name">${u.name}</div><div class="mt-desc">${u.desc}</div></div><div class="mt-lvl">LV ${lvl}/${u.max}</div>`;
    if (!maxed) {
      const b = document.createElement('button');
      b.className = 'btn ghost mt-btn';
      b.style.cssText = 'font-size:8px; padding:10px 14px;';
      b.textContent = u.cost + '⚡';
      b.disabled = META.cores < u.cost;
      b.addEventListener('click', () => upgradeMeta(id));
      card.appendChild(b);
    }
    el.appendChild(card);
  });
  updateMetaUI();
}

/* ============================== Helpers ============================== */

/* (moved: helpers) */


/* ============================== Audio ============================== */
function ensureAudio() {
  if (!sfx) { try { sfx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { sfx = null; } }
}

/* (moved: audio) */


/* ============================== Three.js scene ============================== */

/* (moved: three scene refs) */

let meshes = {};   // named meshes updated every frame
let trailMeshes = [];   // ball trail pool
let glowSprites = [];   // additive glow sprites
let camPos = null, camLook = null;   // smoothed camera targets (dt-aware damping)

function makeGlowSprite(color, scale) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  // e-ink shadow: soft dark ink that fades out (no additive glow on paper).
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(25,22,18,0.5)');
  grd.addColorStop(0.35, 'rgba(25,22,18,0.22)');
  grd.addColorStop(1, 'rgba(25,22,18,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.NormalBlending, depthWrite: false, transparent: true }));
  sp.scale.set(scale, scale, 1);
  return sp;
}

const PAPER = 0xf2efe6, PAPER_D = 0xe6e0d0, INK = 0x191612, INK_MID = 0x6b6659, INK_SOFT = 0xb9b3a2;

function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(PAPER);
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAPER, 1100, 3000);
  camera = new THREE.PerspectiveCamera(64, 1, 1, 4000);
  resizeThree();

  /* --- Court floor: paper with faint ink grid --- */
  const floorGeo = new THREE.PlaneGeometry(CW + 400, CL + 400);
  const floorMat = new THREE.MeshBasicMaterial({ color: 0xefeae0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(CW / 2, -2, 0);
  scene.add(floor);

  gridMesh = new THREE.GridHelper(Math.max(CW + 400, CL + 400), 64, 0xc9c2ae, 0xd8d2c0);
  gridMesh.position.set(CW / 2, 0, 0);
  gridMesh.material.transparent = true; gridMesh.material.opacity = 0.5;
  scene.add(gridMesh);

  /* --- Court boundary: thin ink lines (e-ink style) --- */
  const edgeMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.28 });
  // Side walls run along the court LENGTH (thin in X, long in Z) — the court must stay open
  // and readable; a full-width slab would hide half the playfield.
  // Side CURBS instead of tall translucent slabs: full-height rails read as floating
  // hitboxes hovering along the boundaries; low curbs frame the arena cleanly.
  const sideWallGeo = new THREE.BoxGeometry(10, 34, CL + 200);
  const wallL = new THREE.Mesh(sideWallGeo, edgeMat); wallL.position.set(-100, 17, 0); scene.add(wallL);
  const wallR = new THREE.Mesh(sideWallGeo, edgeMat); wallR.position.set(CW + 100, 17, 0); scene.add(wallR);
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(CW + 200, CH + 200, 10), edgeMat); wallBack.position.set(CW / 2, CH / 2, -CL / 2 - 100); scene.add(wallBack);
  const wallFront = new THREE.Mesh(new THREE.BoxGeometry(CW + 200, CH + 200, 10), edgeMat); wallFront.position.set(CW / 2, CH / 2, CL / 2 + 100); scene.add(wallFront);

  /* --- Center-court divider: a thin flat ground line, a center ring and quarter ticks.
     Always ON THE FLOOR (palette-aware ink marks) — never a translucent wall — so the
     court stays open and readable. Pulses softly with the rally. --- */
  const centerMat = new THREE.MeshBasicMaterial({ color: INK_MID, transparent: true, opacity: 0.5 });
  meshes.centerLine = new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, CL - 160), centerMat);
  meshes.centerLine.position.set(CW / 2, 0.5, 0);
  scene.add(meshes.centerLine);
  meshes.centerRing = new THREE.Mesh(new THREE.RingGeometry(56, 62, 48), centerMat);
  meshes.centerRing.rotation.x = -Math.PI / 2;
  meshes.centerRing.position.set(CW / 2, 0.55, 0);
  scene.add(meshes.centerRing);
  meshes.centerTicks = [];
  for (let i = 0; i < 2; i++) {
    const tk = new THREE.Mesh(new THREE.BoxGeometry(9, 0.9, 3), centerMat);
    tk.position.set(CW / 2, 0.5, i === 0 ? -CL * 0.25 : CL * 0.25);
    scene.add(tk);
    meshes.centerTicks.push(tk);
  }

  /* --- Paddle meshes: solid ink player, hatched-gray CPU --- */
  meshes.paddleL = new THREE.Mesh(new THREE.BoxGeometry(PADDLE_W, PADDLE_H, PADDLE_T), new THREE.MeshBasicMaterial({ color: INK }));
  scene.add(meshes.paddleL);
  // Player paddle: translucent ink fill with a solid ink outline — the ball and the
  // CPU paddle stay visible through it, but the outline keeps it clearly detectable.
  meshes.paddleR = new THREE.Mesh(new THREE.BoxGeometry(PADDLE_W, PADDLE_H, PADDLE_T), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.38 }));
  scene.add(meshes.paddleR);
  meshes.paddleROutline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PADDLE_W, PADDLE_H, PADDLE_T)), new THREE.LineBasicMaterial({ color: INK }));
  scene.add(meshes.paddleROutline);
  meshes.paddleR2 = new THREE.Mesh(new THREE.BoxGeometry(PADDLE_W * 0.8, PADDLE_H * 0.6, PADDLE_T), new THREE.MeshBasicMaterial({ color: INK_MID, transparent: true, opacity: 0.6 }));
  scene.add(meshes.paddleR2);
  meshes.echo = new THREE.Mesh(new THREE.BoxGeometry(PADDLE_W, PADDLE_H, PADDLE_T), new THREE.MeshBasicMaterial({ color: INK_SOFT, transparent: true, opacity: 0.5 }));
  scene.add(meshes.echo); meshes.echo.visible = false;
  meshes.bastionWall = new THREE.Mesh(new THREE.BoxGeometry(PADDLE_W + 60, CH, 10), new THREE.MeshBasicMaterial({ color: INK_MID, transparent: true, opacity: 0.25 }));
  scene.add(meshes.bastionWall); meshes.bastionWall.visible = false;

  /* --- Ball: paper core + ink pinwheel, brighter halo, clearer trail (e-ink) --- */
  meshes.ball = new THREE.Group();
  // Paper sphere core (lighter, catches the eye) with ink cross-hair pinwheel
  const ballCore = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfaf7ee }));
  meshes.ball.add(ballCore);
  // Ink pinwheel: four thin blades that make the ball's rotation/spin instantly readable
  const pinMat = new THREE.MeshBasicMaterial({ color: INK });
  const pw1 = new THREE.Mesh(new THREE.BoxGeometry(BALL_R * 2.4, 1.2, 1.2), pinMat);
  const pw2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, BALL_R * 2.4, 1.2), pinMat);
  meshes.ball.add(pw1); meshes.ball.add(pw2);
  scene.add(meshes.ball);
  // Slightly larger than physics for readability (visual-only scale).
  meshes.ball.scale.setScalar(1.5);
  // Brighter halo for the ball — makes it pop against the paper court.
  meshes.ballGlow = makeGlowSprite('#191612', 100);
  scene.add(meshes.ballGlow);
  // Ball tracking aids: a soft ink ground shadow + a thin vertical drop-line so the
  // ball's depth (Z) is readable at a glance in the 3D court.
  meshes.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 2.2, 18), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.35, depthWrite: false }));
  // Pooled spheres for secondary balls (twin serves, split minis, holo clones).
  extraBallMeshes = [];
  for (let i = 0; i < 6; i++) {
    const eb = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    eb.visible = false;
    scene.add(eb);
    extraBallMeshes.push(eb);
  }
  // Pooled ground shadows for EVERY secondary ball — each ball in play reads with its
  // own shadow (and fades with height), not just the main one.
  extraShadowMeshes = [];
  for (let i = 0; i < 6; i++) {
    const es = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 2.2, 18), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.35, depthWrite: false }));
    es.rotation.x = -Math.PI / 2;
    es.position.y = 0.9;
    es.visible = false;
    scene.add(es);
    extraShadowMeshes.push(es);
  }
  meshes.ballShadow.rotation.x = -Math.PI / 2;
  meshes.ballShadow.position.y = 0.9;
  scene.add(meshes.ballShadow);
  const dropGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]);
  meshes.ballDrop = new THREE.Line(dropGeo, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35, depthWrite: false }));
  scene.add(meshes.ballDrop);

  /* --- Hazard meshes --- */
  // Black hole: dense core + photon rim + orbiting accretion sparks + soft halo.
  // Kept small and low-alpha so it reads as a vortex — never a vision-blocking blob.
  meshes.blackhole = new THREE.Mesh(new THREE.SphereGeometry(24, 20, 20), new THREE.MeshBasicMaterial({ color: 0x191612, transparent: true, opacity: 0.92 }));
  meshes.blackholeRim = new THREE.Mesh(new THREE.TorusGeometry(36, 1.4, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffb04d, transparent: true, opacity: 0.85, depthWrite: false }));
  meshes.blackhole.add(meshes.blackholeRim);
  meshes.blackholeDisk = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const mk = new THREE.Mesh(new THREE.SphereGeometry(1.8 + (i % 3) * 0.7, 6, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd76a : 0xfff3d6, transparent: true, opacity: 0.9, depthWrite: false }));
    const rad = 44 + (i % 4) * 8, ang = (i / 16) * Math.PI * 2;
    mk.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 0);
    meshes.blackholeDisk.add(mk);
  }
  meshes.blackhole.add(meshes.blackholeDisk);
  const haloCv = document.createElement('canvas'); haloCv.width = haloCv.height = 64;
  const hg = haloCv.getContext('2d');
  const hgrad = hg.createRadialGradient(32, 32, 2, 32, 32, 32);
  hgrad.addColorStop(0, 'rgba(168,85,247,0.4)');
  hgrad.addColorStop(0.5, 'rgba(168,85,247,0.12)');
  hgrad.addColorStop(1, 'rgba(168,85,247,0)');
  hg.fillStyle = hgrad; hg.fillRect(0, 0, 64, 64);
  meshes.blackholeHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(haloCv), blending: THREE.NormalBlending, depthWrite: false, transparent: true }));
  meshes.blackholeHalo.scale.set(190, 190, 1);
  meshes.blackhole.add(meshes.blackholeHalo);
  scene.add(meshes.blackhole); meshes.blackhole.visible = false;
  // Boost lane zones: WIREFRAME outlines (not filled slabs). A filled slab read as
  // solid geometry the ball 'phased into'; an outlined zone reads as a field the
  // ball clearly passes through. Height matches the gameplay lane (±34 of center).
  const boostGeo = new THREE.BoxGeometry(CW, 68, CL - 100);
  const boostEdgeMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.3 });
  meshes.boostA = new THREE.LineSegments(new THREE.EdgesGeometry(boostGeo), boostEdgeMat);
  meshes.boostB = new THREE.LineSegments(new THREE.EdgesGeometry(boostGeo), boostEdgeMat.clone());
  scene.add(meshes.boostA); scene.add(meshes.boostB);
  meshes.boostA.visible = meshes.boostB.visible = false;
  meshes.obstacleMeshes = [];

  /* --- Machinery hazard meshes: fans, boosters, spinners --- */
  meshes.machFans = [];    // spinning fan blades (rotating cross)
  meshes.machBoosters = []; // vertical boost vents
  meshes.machSpinners = []; // slow-spinning trap gears
  const fanMat = new THREE.MeshBasicMaterial({ color: INK_MID });
  const boostMat = new THREE.MeshBasicMaterial({ color: INK_SOFT, transparent: true, opacity: 0.45 });
  const spinMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.25 });
  // Pre-build assets for up to 3 of each, hidden until machinery condition is active.
  for (let i = 0; i < 3; i++) {
    const fan = new THREE.Group();
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(40, 3, 3), fanMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(3, 40, 3), fanMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 8), new THREE.MeshBasicMaterial({ color: INK }));
    fan.add(blade1); fan.add(blade2); fan.add(hub);
    fan.visible = false;
    scene.add(fan); meshes.machFans.push(fan);
  }
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 18), boostMat);
    b.visible = false;
    scene.add(b); meshes.machBoosters.push(b);
  }
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(50, 4, 50), spinMat);
    g.visible = false;
    scene.add(g); meshes.machSpinners.push(g);
  }

  /* --- Glow sprites for paddles / effects --- */
  meshes.glowL = makeGlowSprite('#b9b3a2', 240); scene.add(meshes.glowL);
  meshes.glowR = makeGlowSprite('#b9b3a2', 240); scene.add(meshes.glowR);

  /* --- VOID goal regions: clean e-ink pits (flat shade + dashed boundary) --- */
  // FLAT ink wash instead of diagonal crosshatch stripes: the moving hatch pattern
  // read as clutter from the camera, so the pits are now a clean 'erased' shade.
  const pitMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.10 });
  // Floor pits behind each goal line (ball crosses the dashed line INTO the void).
  const pitGeo = new THREE.PlaneGeometry(CW * 0.92, 78);
  meshes.voidPitP = new THREE.Mesh(pitGeo, pitMat); meshes.voidPitP.rotation.x = -Math.PI / 2; meshes.voidPitP.position.set(CW / 2, 0.6, CL / 2 - 50); scene.add(meshes.voidPitP);
  meshes.voidPitC = new THREE.Mesh(pitGeo, pitMat.clone()); meshes.voidPitC.rotation.x = -Math.PI / 2; meshes.voidPitC.position.set(CW / 2, 0.6, -CL / 2 + 50); scene.add(meshes.voidPitC);
  // NOTE: the oversized back-wall planes were REMOVED — from certain camera angles they read
  // as a solid gray box in the void and clouded the play area. The doorway frame, internal
  // shade panel, floor pit, dashed line, glow and chevrons define the void cleanly on their own.
  // Dashed 'no-return' lines on the floor right at the goal mouth.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0x191612 });
  meshes.voidDashesP = []; meshes.voidDashesC = [];
  const dashN = 14;
  for (let i = 0; i < dashN; i++) {
    const w = (CW - 20) / dashN * 0.55;
    const dP = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, 5), dashMat);
    dP.position.set(10 + i * (CW - 20) / dashN + w / 2, 0.7, CL / 2 - 4);
    scene.add(dP); meshes.voidDashesP.push(dP);
    const dC = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, 5), dashMat);
    dC.position.set(10 + i * (CW - 20) / dashN + w / 2, 0.7, -CL / 2 + 4);
    scene.add(dC); meshes.voidDashesC.push(dC);
  }
  // Soft gray ambient wash (no neon glow) so the void reads but never glares.
  meshes.voidGlowP = makeGlowSprite('#d8d2c0', 340); meshes.voidGlowP.position.set(CW / 2, CH / 2, CL / 2 + 40); scene.add(meshes.voidGlowP);
  meshes.voidGlowC = makeGlowSprite('#d8d2c0', 340); meshes.voidGlowC.position.set(CW / 2, CH / 2, -CL / 2 - 40); scene.add(meshes.voidGlowC);
  // Definitive void: full goal-mouth ink frames (a solid doorway to nowhere) that
  // wrap the entire court cross-section, with floor chevrons pointing INTO the void
  // so the goal reads unmistakably. No interior shade panels — any full cross-section
  // plane read as a gray sheet from the camera and clouded the bottom of the view.
  const frameMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.9 });
  function buildVoidFrame(z) {
    const g = new THREE.Group();
    const t = 9;
    const mk = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), frameMat); m.position.set(x, y, 0); g.add(m); return m; };
    mk(CW + t * 2, t, CW / 2, CH + t / 2);     // top rail
    mk(CW + t * 2, t, CW / 2, -t / 2);          // bottom rail
    mk(t, CH + t * 2, -t / 2, CH / 2);          // left rail
    mk(t, CH + t * 2, CW + t / 2, CH / 2);      // right rail
    g.position.z = z;
    return g;
  }
  meshes.voidFrameP = buildVoidFrame(CL / 2 + 66); scene.add(meshes.voidFrameP);
  meshes.voidFrameC = buildVoidFrame(-CL / 2 - 66); scene.add(meshes.voidFrameC);
  // Floor chevrons: sketched arrows on the floor that point INTO the void mouth.
  // Each chevron is two angled strokes forming a '>' that clearly points toward the goal.
  const chevMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.7 });
  meshes.voidChevP = []; meshes.voidChevC = [];
  const chevX = [CW * 0.18, CW * 0.34, CW * 0.5, CW * 0.66, CW * 0.82];
  function makeChevron() {
    const g = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 3.4), chevMat);
    const s2 = s1.clone();
    s1.rotation.z = 0.6; s2.rotation.z = -0.6;
    g.add(s1); g.add(s2);
    return g;
  }
  for (const cx of chevX) {
    for (let i = 0; i < 2; i++) {
      const cz = CL / 2 - 16 - i * 20;
      const aP = makeChevron(); aP.position.set(cx, 0.7, cz); aP.rotation.y = Math.PI / 2; scene.add(aP); meshes.voidChevP.push(aP);
      const aC = makeChevron(); aC.position.set(cx, 0.7, -cz); aC.rotation.y = Math.PI / 2; scene.add(aC); meshes.voidChevC.push(aC);
    }
  }


  camera.position.set(CW / 2, CH * 0.8, playerPlane + 300);
  camera.lookAt(CW / 2, CH * 0.45, 0);
  // Camera smoothing state (dt-aware damping targets).
  camPos = new THREE.Vector3(CW / 2, CH * 0.8, playerPlane + 300);
  camLook = new THREE.Vector3(CW / 2, CH * 0.45, 0);
}

function resizeThree() {
  const rect = canvas.getBoundingClientRect();
  const cw = Math.max(1, Math.round(rect.width)), ch = Math.max(1, Math.round(rect.height));
  const scale = 0.6;
  const w = Math.max(1, Math.round(cw * scale));
  const h = Math.max(1, Math.round(ch * scale));
  if (renderer) {
    renderer.setSize(w, h, false);   // keep style in CSS hands so windowed/borderless both size right
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }
}

/* ============================== Run / match flow ============================== */
function updateScores() { scorePEl.textContent = scores.p; scoreCEl.textContent = scores.c; }

function updateHearts() {
  let s = '';
  for (let i = 0; i < maxLives(); i++) s += i < run.lives ? '<span class="alive">♥</span>' : '<span class="dead">♡</span>';
  heartsEl.innerHTML = s;
}

function renderRunDots() {
  const el = $('runDots');
  if (!el) return;
  if (state === 'menu') { el.innerHTML = ''; return; }
  // Show cleared rounds as lit pips, the current round as a blinking marker,
  // and boss rounds as skulls — a mini map of the gauntlet (roguelike feel).
  const cur = Math.max(1, run.round);
  const total = Math.min(15, cur + 4);
  let h = '';
  for (let r = 1; r <= total; r++) {
    if (r === cur) h += '<span class="rundot cur">▶</span>';
    else if (r < cur) h += r % 5 === 0 ? '<span class="rundot boss">☠</span>' : '<span class="rundot lit">•</span>';
    else h += r % 5 === 0 ? '<span class="rundot skel">☠</span>' : '<span class="rundot">•</span>';
  }
  el.innerHTML = h;
}

function updatePupIcons() {
  if (!run.abilities.length) { pupIconsEl.innerHTML = ''; }
  else {
    const counts = {};
    run.abilities.forEach(id => counts[id] = (counts[id] || 0) + 1);
    pupIconsEl.innerHTML = Object.entries(counts)
      .map(([id, n]) => `<span class="pup-chip" title="${ABILITIES[id].name}">${ABILITIES[id].icon}${n > 1 ? ' ×' + n : ''}</span>`)
      .join('');
  }
  const syns = activeSynergies();
  const synEl = $('synIcons');
  if (!syns.length) { synEl.innerHTML = ''; return; }
  synEl.innerHTML = syns.map(s => `<span class="syn-chip" title="${s.name} — ${s.desc}">✦ ${s.icon} ${s.name}</span>`).join('');
}

function updateBestLine() {
  const best = parseInt(storeGet('pongnewera_best') || '0', 10) || 0;
  $('menuBest').textContent = best > 0 ? 'BEST RUN: ROUND ' + best : 'BEST RUN: —';
}

function hideOverlays() {
  [introEl, draftEl, defeatEl, overEl, pauseEl, metaEl].forEach(el => { if (el) el.classList.add('hidden'); });
}
function showMenu() {
  state = 'menu';
  menuEl.classList.remove('hidden');
  hideOverlays();
  if (!balls.length) balls.push({ x: CW / 2, y: CH * 0.4, z: 0, speed: 130, vx: 0, vy: 60, vz: 130, spinX: 0, spinY: 0 });
  renderRunDots();
  updateBestLine();
  updateMetaUI();
}

function opponentFor(round) {
  if (round % 5 === 0) return { id: BOSS_POOL[((round / 5) - 1) % BOSS_POOL.length], ai: AIS[BOSS_POOL[((round / 5) - 1) % BOSS_POOL.length]], boss: true };
  const nonBoss = round - 1 - Math.floor((round - 1) / 5);
  const id = NORMAL_POOL[nonBoss % NORMAL_POOL.length];
  return { id, ai: AIS[id], boss: false };
}

/* Synergy + condition helpers */

/* (moved: function synergyActive) */

function activeSynergies() { return SYNERGIES.filter(synergyActive); }

/* (moved: rollCondition (moved to registry)) */


function aiStats(opp) {
  const a = opp.ai;
  // CPUs scale with BOTH the round AND your build: every ability you take makes the roster
  // a little faster and a little bigger, so you can never out-invest them into an
  // untouchable stat line. Growth is capped so it stays hard-but-possible.
  const invested = run.abilities.length || 0;
  const inv = Math.min(1.6, 1 + invested * 0.04);
  const mult = Math.min(1.95, (1 + (run.round - 1) * 0.065) * inv * (opp.boss ? 1.12 : 1));
  const padMult = Math.min(1.45, 1 + invested * 0.03);   // reach grows, but never walls the court
  return {
    ...a,
    speed: a.speed * mult,
    error: a.error * Math.max(0.55, 1 - (run.round - 1) * 0.03),
    paddleH: PADDLE_H * a.paddleMult * padMult,
    paddleW: PADDLE_W * a.paddleMult * padMult,
  };
}

function startRun() {
  const lives = Math.min(MAX_LIVES, START_LIVES + metaLvl('meta_hp'));
  run = { lives, round: 1, wins: 0, abilities: [] };
  phoenixUsed = false;
  winStreak = 0;
  rally = 0;
  curCond = null; obstacles = []; machFans = []; machBoosters = []; machSpinners = [];
  if (metaLvl('meta_start') > 0) {
    const commons = ABILITY_IDS.filter(id => ABILITIES[id].rarity === 'common');
    const pick = commons[Math.floor(Math.random() * commons.length)];
    run.abilities.push(pick);
    msgFlash('HEAD START: ' + ABILITIES[pick].name + '!');
  }
  updateHearts(); updatePupIcons();
  pendingDrafts = 1;
  draftContext = 'start';
  openDraft('CHOOSE YOUR STARTER', 'Pick 1 to start your run');
}

function showIntro() {
  const opp = opponentFor(run.round);
  const a = opp.ai;
  curAI = aiStats(opp);
  oppBoss = opp.boss;
  $('roundLabel').textContent = (opp.boss ? '☠ BOSS ROUND ' : 'ROUND ') + run.round;
  $('oppEmoji').textContent = a.icon;
  $('oppName').textContent = a.name;
  $('oppName').style.color = opp.boss ? '' : inkify(a.color); // boss card uses its own light-on-dark rule
  $('oppTitle').textContent = a.title;
  $('bossBadge').classList.toggle('hidden', !opp.boss);
  $('oppCard').classList.toggle('boss', opp.boss);
  $('oppAbility').textContent = a.abilityName;
  $('oppAbilityDesc').textContent = a.abilityDesc;
  $('oppPersona').textContent = 'PERSONALITY: ' + (PERSONA[a.personality] || 'ECCENTRIC');
  curCond = rollCondition();
  $('oppCond').textContent = curCond ? (COND_BY_ID[curCond].icon + ' HAZARD — ' + COND_BY_ID[curCond].desc) : 'NO HAZARD THIS ROUND';
  // Arenas are auto-assigned: bosses command their own stage, normal rounds tour the courts.
  stage = stageForRound();
  buildStage();
  const arenaEl = $('oppArena');
  if (arenaEl) arenaEl.textContent = '🏟️ ARENA — ' + (STAGE_NAMES[stage] || stage.toUpperCase());
  const maxSpd = 1000;
  const spd = Math.min(100, Math.round(curAI.speed / maxSpd * 100));
  const prec = Math.max(15, Math.round((1 - curAI.error / 70) * 100));
  const size = Math.min(100, Math.round(a.paddleMult / 1.8 * 100));
  $('oppStats').innerHTML = `
    <div class="stat"><div class="lbl">Speed</div><div class="val">${Math.round(curAI.speed)}</div><div class="bar"><span style="width:${spd}%"></span></div></div>
    <div class="stat"><div class="lbl">Precision</div><div class="val">${prec}</div><div class="bar"><span style="width:${prec}%"></span></div></div>
    <div class="stat"><div class="lbl">Reach</div><div class="val">${Math.round(a.paddleMult * 100)}%</div><div class="bar"><span style="width:${size}%"></span></div></div>`;
  state = 'intro';
  menuEl.classList.add('hidden');
  introEl.classList.remove('hidden');
  updateBallPick();
  // Onboarding tips: early rounds teach one mechanic at a time (implicit tutorial).
  const TIPS = [
    'TIP: Move your mouse to aim the paddle — it tracks your cursor exactly, so outthink the CPU',
    'TIP: Hold SHIFT + WASD after your hit to curve the ball in flight',
    'TIP: Swipe your paddle into the ball to add spin — it bends mid-flight',
    'TIP: Chain long rallies — the pitch rises and your abilities make it nastier',
    'TIP: Win to advance — the coach drafts you abilities every OTHER win · actives fire on 1-4 slots',
  ];
  const tipIdx = Math.min(run.round - 1, TIPS.length - 1);
  const tipEl = $('introTip');
  if (tipEl) tipEl.textContent = run.round <= TIPS.length ? TIPS[tipIdx] : '';
}

function startMatch() {
  if (run.lives <= 0) return;   // a dead run can't be re-served
  const opp = opponentFor(run.round);
  curAI = aiStats(opp);
  oppBoss = opp.boss;
  codexAI(opp.id);
  // Re-assert the arena (covers retry / direct-serve paths).
  stage = stageForRound();
  buildStage();
  scores = { p: 0, c: 0 };
  updateScores();
  balls = [];
  // Generic hazard reset: every match clears ALL hazard state, then the active
  // condition's own setup hook seeds its objects (see game/content/conditions/).
  obstacles = []; machFans = []; machBoosters = []; machSpinners = [];
  ghostSpawnT = 3; ghostWarn = null; slickVX = 0; slickVY = 0;
  wallFlashT = 0; hazardFlash = 0;
  hazardScale = 1 + Math.min(1.0, (run.round - 1) * 0.14);
  windDir = Math.random() * Math.PI * 2; windMag = 1; windGustT = 1.5 + Math.random() * 2; windFlash = 0;
  const hzSt = COND_HOOKS[curCond];
  if (hzSt && hzSt.setup) hzSt.setup();
  const windEl = $('windChip');
  if (windEl) { windEl.textContent = curCond === 'wind' ? '🌬️ →' : ''; windEl.style.opacity = '0.55'; }
  const condEl = $('condChip');
  condEl.textContent = curCond ? (COND_BY_ID[curCond].icon + ' ' + COND_BY_ID[curCond].name) : '';
  $('oppCond').textContent = curCond ? (COND_BY_ID[curCond].icon + ' HAZARD — ' + COND_BY_ID[curCond].desc) : 'NO HAZARD THIS ROUND';
  buildHazardVisuals();
  ghostCharges = 0;   // Ghost Ball is a legacy active: press Q to charge 2 phase-passes
  shieldsLeft = stacks('shield');
  vampGrow = 0; cpuShrink = 0; cpuFury = 0;   // reset per match
  surgeActive = 0; phaseActive = false;
  surgeT = 6; phaseT = 5; weaverT = 8;
  quakeT = 7; quakeActive = 0; hexT = 6; hexActive = 0;
  gambleT = 4; gambleFreeze = 0; parryT = 6; parryActive = 0; lureT = 7; lureActive = 0; shellT = 5; shellOpen = 0;
  batteryT = Math.max(1.5, 8 * Math.pow(0.75, Math.max(0, stacks('battery') - 1))); batteryReady = false;   // Battery floors at 1.5s
  chargeT = (curAI && curAI.charge) || 0; chargeActive = 0;
  bastionT = 6; bastionActive = 0; echoT = 6; echoActive = 0;
  gustT = 7; gustActive = 0; rageT = 7; rageActive = 0;
  stormT = 8; stormActive = 0; tideT = 9; tideActive = 0; tideDir = Math.random() < 0.5 ? 1 : -1;
  frozenLeft = stacks('freezer') > 0 ? (synergyActive(SYNERGIES.find(s => s.id === 'syn_frost')) ? 6 : 4.5) : 0;
  frostT = 0; warpActive = 0;
  ghostCd = 0; empLockT = 0; glitchActiveT = 0; tremorT = 0;
  // Manual abilities start ready; cooldowns tick down during play.
  ACTIVE_ABILITIES.forEach(id => { manualState[id].cd = 0; manualState[id].ready = true; });
  // Charmed Round: the CPU's special ability may be disabled for the whole round (Fortuna Aegis makes it certain).
  charmed = has('lucky') && (Math.random() < Math.min(0.95, 0.7 + 0.1 * (stacks('lucky') - 1)) || synergyActive(SYNERGIES.find(s => s.id === 'syn_shield')));
  if (charmed) { msgFlash('🍀 CHARMED!'); sfxPick(); }
  paddleL.x = paddleR.x = paddleR2.x = CW / 2;
  paddleL.y = paddleR.y = paddleR2.y = CH / 2;
  paddleL.vx = paddleR.vx = paddleL.vy = paddleR.vy = 0;
  renderRunDots();
  levelChipEl.textContent = (oppBoss ? '☠ BOSS · ' : '') + 'ROUND ' + run.round + ' · ' + curAI.name;
  levelChipEl.classList.toggle('boss', oppBoss);
  serve(1);
  setMsg(oppBoss ? 'BOSS ROUND ' + run.round : 'ROUND ' + run.round);
  introEl.classList.add('hidden');
  defeatEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  state = 'play';
  ensureAudio();
}

function serve(dir) {
  balls = [newBall(CW / 2, CH / 2, 0)];
  const b = balls[0];
  const tiltRand = has('sniper') ? 0.15 : 0.36;
  const tiltX = (Math.random() * 2 - 1) * tiltRand;
  const tiltY = (Math.random() * 2 - 1) * tiltRand;
  let serveSpd = BALL_START + 70 * dimStacks(stacks('speed_boost'), 1) + 55 * dimStacks(stacks('stat_serve'), 1);
  b.speed = Math.min(serveSpd, BALL_HARD_MAX);
  const cosEl = Math.cos(tiltY);
  b.vx = Math.sin(tiltX) * cosEl * b.speed;
  b.vy = Math.sin(tiltY) * b.speed;
  b.vz = dir * Math.cos(tiltX) * cosEl * b.speed;
  const hzS = COND_HOOKS[curCond];
  if (hzS && hzS.onServe) hzS.onServe(b);
  if (has('twin_serve') && balls.length < MAX_BALLS) {
    // Twin Serve (max 3 total balls): the spread stays NARROWER than even the smallest
    // CPU paddle, so every serve ball is physically receivable by the opponent.
    const extra = Math.min(stacks('twin_serve'), MAX_BALLS - 1);
    for (let i = 1; i <= extra; i++) {
      const b2 = newBall(CW / 2, CH / 2, 0);
      b2.speed = b.speed;
      const off = i * 0.045 * (i % 2 === 0 ? -1 : 1);
      const t2x = tiltX + off, t2y = tiltY + off;
      const c2 = Math.cos(t2y);
      b2.vx = Math.sin(t2x) * c2 * b2.speed;
      b2.vy = Math.sin(t2y) * b2.speed;
      b2.vz = dir * Math.cos(t2x) * c2 * b2.speed;
      balls.push(b2);
    }
  }
  balls.forEach(initBallType);   // apply the chosen arena ball to every serve ball
  serveTimer = Math.max(0.2, 1.0 * Math.pow(0.6, stacks('tempo')));   // Tempo floors: no infinite serve-spam
  serveLaunchT = tNow;
  hist = [];
}

function newBall(x, y, z) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, speed: BALL_START, spinX: 0, spinY: 0 };
}

/* ============================== Arena balls ============================== */
function initBallType(b) {
  b.type = selBall;
  b.waveT = 0; b.flashT = 3.0 + Math.random(); b.holoT = 2.2 + Math.random();
  b.jitterT = 0.9; b.trickDist = 0; b.trickFired = false; b.trickT = 0;
  if (selBall === 'rocket') b.speed = Math.min(b.speed * 1.25, BALL_HARD_MAX);
  else if (selBall === 'heavy') b.speed = b.speed * 0.92;
}


/* (moved: function bonkAt) */


function ballHitFx(b, byPlayer) {
  if (b.mini || b.clone) return;   // spawned balls don't re-trigger ball-type effects
  const tp = b.type || 'standard';
  if (tp === 'rocket') b.speed = Math.min(b.speed + 30, BALL_HARD_MAX);
  else if (tp === 'charge') b.speed = Math.min(b.speed + 45, BALL_HARD_MAX);
  else if (tp === 'split') spawnSplitMini(b);
  else if (tp === 'chill') {
    if (byPlayer) { frostT = Math.max(frostT, 1.2); procFlash('CHILL!', b.x, b.y, '#7dd3fc'); }
    else { playerSlowT = 1.2; procFlash('CHILLED!', b.x, b.y, '#7dd3fc'); }
  }
  else if (tp === 'trick') { b.trickFired = false; b.trickDist = 0; }
  bonkAt(b.x, b.y, b.z, b.speed);
}

function spawnSplitMini(b) {
  if (balls.length >= MAX_BALLS + 2) return;
  const sp = b.speed * 0.85;
  const jX = (Math.random() * 2 - 1) * 0.6, jY = (Math.random() * 2 - 1) * 0.6;
  const cY = Math.cos(jY);
  const nb = { x: b.x, y: clamp(b.y, BALL_R, CH - BALL_R), z: b.z, speed: sp, vx: Math.sin(jX) * cY * sp, vy: Math.sin(jY) * sp, vz: Math.sign(b.vz || -1) * Math.cos(jX) * cY * sp, spinX: 0, spinY: 0, mini: true, life: 2.5 };
  balls.push(nb);
}

function spawnHoloClones(b) {
  if (balls.length > MAX_BALLS + 4) return;
  for (const [ox, oy] of [[1, 0.6], [-1, 0.6]]) {
    balls.push({ x: b.x + ox * 26, y: b.y + oy * 26, z: b.z, speed: b.speed, vx: b.vx, vy: b.vy, vz: b.vz, spinX: 0, spinY: 0, clone: true, life: 2.2 });
  }
  procFlash('HOLO!', b.x, b.y, '#8ef0ff');
}

function flashBang(b) {
  const towardCPU = b.vz < 0;
  spawnBurst(b.x, b.y, b.z, '#ffffff', 18);
  shake = Math.min(shake + 6, 12);
  bonkAt(b.x, b.y, b.z, b.speed + 200);
  if (towardCPU) {
    empLockT = Math.max(empLockT, 0.45);   // stun the CPU for a blink
    msgFlash('💥 FLASH!');
    procFlash('STUNNED!', b.x, b.y, '#fde047');
  } else {
    flashVig = 0.26;   // the player gets a white blink, no control loss
    msgFlash('💥 FLASH!');
    shake = Math.min(shake + 8, 13);
  }
  sfxWall();
}

function point(side) {
  if (state !== 'play') return;
  rally = 0;
  stageCheer = 1;   // crowd erupts on every goal
  if (side === 'p') { scores.p++; setMsg('YOU SCORE!'); }
  else { scores.c++; setMsg('CPU SCORES!'); }
  updateScores();
  shake = Math.min(shake + 9, 15);
  spawnBurst(balls.length ? balls[0].x : CW / 2, balls.length ? balls[0].y : CH / 2, balls.length ? balls[0].z : 0, side === 'p' ? COLORS.player : COLORS.cpu, 42);
  sfxScore();
  const cpuWinAt = has('iron_wall') ? WIN_SCORE + 1 : WIN_SCORE;
  if (scores.p >= WIN_SCORE) { winMatch(); return; }
  if (scores.c >= cpuWinAt) { loseMatch(); return; }
  serve(side === 'p' ? -1 : 1);
  resetPaddles();
}

const DRAFT_EVERY = 2;   // the coach drafts you abilities every OTHER win, not every win
function winMatch() {
  winStreak++;
  run.wins = (run.wins || 0) + 1;
  state = 'over';
  msgFlash('VICTORY!');
  sfxWin();
  spawnConfetti();
  const draftDue = (run.wins % DRAFT_EVERY) === 0;
  pendingDrafts = 2;
  draftContext = 'victory';
  setTimeout(() => {
    if (state !== 'over') return;
    if (draftDue) {
      openDraft('VICTORY!', 'CHOOSE 2 ABILITIES' + (winStreak >= 2 ? ' — STREAK ×' + winStreak : ''));
    } else {
      // Off-win: no draft — advance straight to the next challenger.
      run.round++;
      msgFlash('WIN — COACH IS ON BREAK, NO DRAFT');
      showIntro();
    }
  }, 350);
}

function loseMatch() {
  winStreak = 0;
  run.lives--;
  updateHearts();
  sfxLose();
  if (run.lives <= 0) {
    if (has('phoenix') && !phoenixUsed) {
      phoenixUsed = true;
      run.lives = synergyActive(SYNERGIES.find(s => s.id === 'syn_life')) ? 3 : 1;
      updateHearts();
      msgFlash('PHOENIX!');
      sfxWin();
      defeatEl.classList.add('hidden');
      startMatch();
      return;
    }
    runOver(); return;
  }
  state = 'defeat';
  $('defeatSummary').innerHTML = `Round ${run.round} — ${(curAI && curAI.name) || 'The Arena'} won the match.<br>Lives left: ${'❤️'.repeat(run.lives)}${'🖤'.repeat(Math.max(0, maxLives() - run.lives))}<br>Your abilities carry over.`;
  defeatEl.classList.remove('hidden');
}

function runOver() {
  state = 'over';
  winStreak = 0;
  const reached = run.round - 1;
  const best = parseInt(storeGet('pongnewera_best') || '0', 10) || 0;
  if (reached > best) storeSet('pongnewera_best', String(reached));
  const cores = Math.max(2, reached + (run.lives > 0 ? 1 : 0) + (oppBoss ? 2 : 0));
  earnCores(cores);
  $('runSummary').innerHTML = `You fell at Round ${run.round} against ${(curAI && curAI.name) || 'The Arena'}.<br>Rounds cleared: ${reached}<br>Abilities held: ${run.abilities.length}<br>+${cores} ⚡ CORES earned`;
  $('runBest').textContent = 'BEST RUN: ROUND ' + Math.max(best, reached);
  overEl.classList.remove('hidden');
}

/* ============================== Draft ============================== */
function rarityWeight(r) {
  const luck = metaLvl('meta_luck');
  if (r === 'epic') return 10 + luck;
  if (r === 'rare') return 32 + luck;
  return Math.max(20, 58 - luck * 2);
}
function weightedRoll() {
  const total = ABILITY_IDS.reduce((s, id) => s + rarityWeight(ABILITIES[id].rarity), 0);
  let r = Math.random() * total;
  for (const id of ABILITY_IDS) {
    r -= rarityWeight(ABILITIES[id].rarity);
    if (r < 0) return id;
  }
  return ABILITY_IDS[ABILITY_IDS.length - 1];
}
function rollOffers(n) {
  const out = [];
  const cats = ['passive', 'active', 'stat'];
  // Draw with a random category bias per card so drafts always mix playstyles;
  // if every offer somehow lands on one category, swap the last for another.
  for (let tries = 0; tries < 200 && out.length < n; tries++) {
    const bias = cats[Math.floor(Math.random() * cats.length)];
    const pool = ABILITY_IDS.filter(id => ABILITIES[id].cat === bias && !out.includes(id));
    if (!pool.length) continue;
    const total = pool.reduce((s, id) => s + rarityWeight(ABILITIES[id].rarity), 0);
    let r = Math.random() * total, id = null;
    for (const pid of pool) { r -= rarityWeight(ABILITIES[pid].rarity); if (r < 0) { id = pid; break; } }
    if (id) out.push(id);
  }
  const seen = new Set(out.map(id => catOf(id)));
  if (seen.size === 1 && out.length === n && n >= 2) {
    const other = cats.find(c => c !== catOf(out[0]));
    const pool = ABILITY_IDS.filter(id => ABILITIES[id].cat === other && !out.includes(id));
    if (pool.length) out[out.length - 1] = pool[Math.floor(Math.random() * pool.length)];
  }
  return out;
}
function openDraft(title, sub) {
  state = 'draft';
  // A coach animal greets the upgrade screen with a randomized quip.
  const coach = COACHES[Math.floor(Math.random() * COACHES.length)];
  $('dkAvatar').textContent = coach.avatar;
  $('dkName').textContent = coach.name;
  $('dkLine').textContent = coach.lines[Math.floor(Math.random() * coach.lines.length)] || 'Pick wisely!';
  $('draftTitle').textContent = title;
  $('draftSub').textContent = sub + (draftContext === 'start' ? ' · PICK YOUR STARTER' : ' · PICK ' + (3 - pendingDrafts) + ' OF 2');
  const offers = rollOffers(3 + Math.floor(metaLvl('meta_luck') / 10));
  const cardsEl = $('draftCards');
  cardsEl.innerHTML = '';
  offers.forEach((id, i) => {
    const p = ABILITIES[id];
    const card = document.createElement('div');
    card.className = 'draft-card rarity-' + p.rarity;
    card.style.animationDelay = (i * 0.06) + 's';
    const combo = SYNERGIES.find(s => (s.a === id && has(s.b)) || (s.b === id && has(s.a)));
    const catTag = p.cat === 'active' ? (p.slot ? 'ACTIVE · ' + p.slot : (p.key ? 'ACTIVE · ' + p.key.toUpperCase() : 'ACTIVE')) : p.cat.toUpperCase();
    card.innerHTML = `<div class="pup-icon">${p.icon}</div><div class="pup-name">${p.name}</div><div class="pup-rarity">${p.rarity}</div><div class="pup-desc">${p.desc}</div><div class="pup-cat cat-${p.cat}">${catTag}</div>${combo ? `<div class="draft-syn">✨ SYNERGY: ${combo.name}</div>` : ''}`;
    card.addEventListener('click', () => pickDraft(id));
    cardsEl.appendChild(card);
  });
  renderOwned();
  hideOverlays();
  draftEl.classList.remove('hidden');
}

function renderOwned() {
  const counts = {};
  run.abilities.forEach(id => counts[id] = (counts[id] || 0) + 1);
  $('ownedPups').innerHTML = run.abilities.length
    ? Object.entries(counts).map(([id, n]) => `<span class="owned-chip">${ABILITIES[id].icon} ${ABILITIES[id].name}${n > 1 ? ' <span class="cnt">×' + n + '</span>' : ''}</span>`).join('')
    : '<span class="owned-chip">No abilities yet</span>';
}

let lastPickT = 0;
function pickDraft(id) {
  if (pendingDrafts <= 0) return;
  const now = performance.now();
  if (now - lastPickT < 150) return;
  lastPickT = now;
  run.abilities.push(id);
  codexPup(id);
  if (id === 'extra_life' || id === 'stat_life') { run.lives = Math.min(maxLives(), run.lives + 1); updateHearts(); }
  updatePupIcons();
  sfxRarity(ABILITIES[id] ? ABILITIES[id].rarity : 'common');
  spawnBurst(CW / 2, CH / 2, 0, '#ffd76a', 30);
  activeSynergies().forEach(s => codexSyn(s.id));
  pendingDrafts--;
  if (pendingDrafts > 0) {
    openDraft('VICTORY!', 'CHOOSE 2 ABILITIES');
  } else {
    finishDraft();
  }
}
function finishDraft() {
  draftEl.classList.add('hidden');
  // Victory drafts advance to the next round; the STARTER draft keeps you on round 1.
  if (draftContext !== 'start') run.round++;
  showIntro();
}


/* ============================== Meta upgrades overlay ============================== */
function openMeta() {
  state = 'meta';
  hideOverlays();
  renderMetaList();
  metaEl.classList.remove('hidden');
}
function closeMeta() { metaEl.classList.add('hidden'); showMenu(); }

/* ============================== Visuals (themes + fun modes) ============================== */
const visualsEl = $('visuals'), themeListEl = $('themeList'), funModeListEl = $('funModeList'), displayListEl = $('displayList');
const THEMES_UI = [
  { id: 'ink',     icon: '📄', name: 'E-INK PAPER',   desc: 'The classic black & white sketchbook court.' },
  { id: 'vibrant', icon: '🌈', name: 'VIBRANT ARENA', desc: 'Neon dynamic colors — the grid and ball glow pulse with every rally.' },
  { id: 'sunset',  icon: '🌇', name: 'NEON SUNSET',   desc: 'Cyan dusk on your side, ember orange on theirs — the horizon follows the ball.' },
];
const FUN_UI = [
  { id: 'none',   icon: '🧭', name: 'UPRIGHT',       desc: 'Standard view.' },
  { id: 'upside', icon: '🙃', name: 'UPSIDE DOWN',   desc: 'Flip the whole court over. Chaos.' },
  { id: 'barrel', icon: '🌀', name: 'BARREL ROLL',   desc: 'The camera does a continuous barrel roll mid-rally.' },
];
function updateVisualsUI() {
  if (!themeListEl) return;
  themeListEl.innerHTML = THEMES_UI.map(t => `<div class="stake-card${theme === t.id ? ' on' : ''}" data-theme="${t.id}"><div class="st-ic">${t.icon}</div><div><div class="st-name">${t.name}</div><div class="st-desc">${t.desc}</div></div><div class="st-gold">${theme === t.id ? 'ACTIVE' : '—'}</div></div>`).join('');
  funModeListEl.innerHTML = FUN_UI.map(f => `<div class="stake-card${funMode === f.id ? ' on' : ''}" data-fun="${f.id}"><div class="st-ic">${f.icon}</div><div><div class="st-name">${f.name}</div><div class="st-desc">${f.desc}</div></div><div class="st-gold">${funMode === f.id ? 'ACTIVE' : '—'}</div></div>`).join('');
  if (displayListEl) {
    displayListEl.innerHTML = DISPLAY_UI.map(d => `<div class="stake-card${displayMode === d.id ? ' on' : ''}" data-disp="${d.id}"><div class="st-ic">${d.icon}</div><div><div class="st-name">${d.name}</div><div class="st-desc">${d.desc}</div></div><div class="st-gold">${displayMode === d.id ? 'ACTIVE' : '—'}</div></div>`).join('');
    for (const c of displayListEl.children) c.addEventListener('click', () => { displayMode = c.dataset.disp; applyDisplay(); sfxPick(); });
  }
  for (const c of themeListEl.children) c.addEventListener('click', () => { theme = c.dataset.theme; applyTheme(); sfxPick(); });
  for (const c of funModeListEl.children) c.addEventListener('click', () => { funMode = c.dataset.fun; META.funMode = funMode; metaSave(); updateVisualsUI(); sfxPick(); });
}
let visualsReturn = 'menu';

/* ============================== Display modes ============================== */
let displayMode = 'window';        // 'window' | 'borderless' | 'fullscreen'
const DISPLAY_UI = [
  { id: 'window', icon: '🪟', name: 'WINDOWED', desc: 'Boxed arena with a frame' },
  { id: 'borderless', icon: '📺', name: 'BORDERLESS', desc: 'Edge-to-edge, no frame' },
  { id: 'fullscreen', icon: '⛶', name: 'FULLSCREEN', desc: 'Native fullscreen — Esc exits' },
];
function applyDisplay() {
  document.body.classList.toggle('disp-window', displayMode === 'window');
  document.body.classList.toggle('disp-borderless', displayMode !== 'window');
  if (displayMode === 'fullscreen') {
    const el = document.documentElement;
    if (el && el.requestFullscreen) el.requestFullscreen().catch(() => { displayMode = 'borderless'; applyDisplay(); });
    else { displayMode = 'borderless'; applyDisplay(); return; }
  } else if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  META.displayMode = displayMode; metaSave();
  updateVisualsUI();
  void canvas.offsetWidth;          // reflow so the boxed rect is fresh
  resizeThree();
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && displayMode === 'fullscreen') { displayMode = 'borderless'; applyDisplay(); }
});

function openVisuals(from) {
  visualsReturn = from || 'menu';
  menuEl.classList.add('hidden'); pauseEl.classList.add('hidden');
  visualsEl.classList.remove('hidden'); updateVisualsUI();
}
function closeVisuals() {
  visualsEl.classList.add('hidden');
  if (visualsReturn === 'pause') pauseEl.classList.remove('hidden');
  else menuEl.classList.remove('hidden');
}
function updateBallPick() {
  const bp = $('ballPick'); if (!bp) return;
  bp.innerHTML = BALL_TYPES.map(t => `<div class="stake-card${selBall === t.id ? ' on' : ''}" data-ball="${t.id}"><div class="st-ic">${t.icon}</div><div><div class="st-name">${t.name}</div><div class="st-desc">${t.desc}</div></div><div class="st-gold">${selBall === t.id ? 'READY' : ''}</div></div>`).join('');
  for (const c of bp.children) c.addEventListener('click', () => { selBall = c.dataset.ball; updateBallPick(); sfxPick(); });
}


function resetPaddles() { paddleL.x = paddleR.x = paddleR2.x = CW / 2; paddleL.y = paddleR.y = paddleR2.y = CH / 2; paddleL.vx = paddleR.vx = paddleL.vy = paddleR.vy = 0; }

function setMsg(m) { msg = m; msgT = 1.3; }

/* (moved: function msgFlash) */


/* Floating proc indicators. */

/* (moved: function procFlash) */


/* ============================== Physics (3D) ============================== */

/* (moved: function playerPaddleH) */

function cpuPaddleH() {
  const shell = curAI && curAI.ability === 'shell' && shellOpen > 0 ? 0.5 : 1;
  // Panel size is hard-capped so a fast angled shot always has a reachable corner window
  // (no champion may wall off the court cross-section — speed must earn the point).
  return clamp(((curAI ? curAI.paddleH : PADDLE_H) - cpuShrink) * shell, 44, CH * 0.55);
}
function cpuPaddleW() {
  const shell = curAI && curAI.ability === 'shell' && shellOpen > 0 ? 0.5 : 1;
  return clamp(((curAI ? curAI.paddleW : PADDLE_W) - cpuShrink * 0.9) * shell, 44, CW * 0.5);
}
function defenderH() { return playerPaddleH() * 0.55; }

function stepBalls(dt) {
  for (const b of balls) {
    if (b.dead) continue;
    const speed = Math.hypot(b.vx, b.vy, b.vz) || 1;
    let remaining = dt;
    let scored = false;
    while (remaining > 1e-6 && !scored) {
      const step = Math.min(remaining, BALL_R / speed);
      remaining -= step;
      scored = moveBall(b, step);
    }
    if (scored) return;
  }
  balls = balls.filter(x => !x.dead);
}

function applySpin(b, dt) {
  // Magnus in 3D: spinX curves the ball across the court (X), spinY curves it vertically (Y).
  const k = SPIN_CURVE * (1 + 0.18 * dimStacks(stacks('stat_curve'), 1));
  if (b.spinX) b.vx += b.spinX * k * dt;
  if (b.spinY) b.vy += b.spinY * k * dt;
  // Hard angle guard (2D parity): keep flight within a sane cone of the Z travel axis so
  // heavy spin can never drive the ball into a physically-broken trajectory. Preserves
  // each component's own sign. (MAX_TILT*1.5 would exceed 90° where tan turns negative,
  // so we cap the flight cone at a safe ~80°.)
  const absZ = Math.max(0.01, Math.abs(b.vz));
  const maxA = Math.tan(1.40);   // ~80° flight cone cap
  const sx = b.vx >= 0 ? 1 : -1, sy = b.vy >= 0 ? 1 : -1;
  b.vx = sx * Math.min(Math.abs(b.vx), maxA * absZ);
  b.vy = sy * Math.min(Math.abs(b.vy), maxA * absZ);
  const sp = Math.hypot(b.vx, b.vy, b.vz);
  if (sp > 0.01) { const f = b.speed / sp; b.vx *= f; b.vy *= f; b.vz *= f; }
}

function moveBall(b, dt) {
  // Holo clones are decoys: they fly and bounce visually but never touch paddles or goals.
  if (b.clone) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.x - BALL_R <= 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
    else if (b.x + BALL_R >= CW) { b.x = CW - BALL_R; b.vx = -Math.abs(b.vx); }
    if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
    else if (b.y + BALL_R >= CH) { b.y = CH - BALL_R; b.vy = -Math.abs(b.vy); }
    if (b.z <= -CL / 2 + BALL_R) { b.z = -CL / 2 + BALL_R; b.vz = Math.abs(b.vz); }
    else if (b.z >= CL / 2 - BALL_R) { b.z = CL / 2 - BALL_R; b.vz = -Math.abs(b.vz); }
    return false;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;

  // X walls (left / right) — bounces never add spin: walls preserve the ball's existing spin
  // but never pump it up. Bouncy Walls only boost speed (handled inside onWall).
  if (b.x - BALL_R <= 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); onWall(b); }
  else if (b.x + BALL_R >= CW) { b.x = CW - BALL_R; b.vx = -Math.abs(b.vx); onWall(b); }
  // Y walls (floor / ceiling)
  if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); onWall(b); }
  else if (b.y + BALL_R >= CH) { b.y = CH - BALL_R; b.vy = -Math.abs(b.vy); onWall(b); }

  // Drifting obstacle blocks (Blockades): 3D boxes the ball bounces off.
  for (const o of obstacles) {
    const cx = clamp(b.x, o.x - o.w / 2, o.x + o.w / 2);
    const cy = clamp(b.y, o.y - o.h / 2, o.y + o.h / 2);
    const cz = clamp(b.z, o.z - o.d / 2, o.z + o.d / 2);
    const dx = b.x - cx, dy = b.y - cy, dz = b.z - cz;
    if (dx * dx + dy * dy + dz * dz <= BALL_R * BALL_R) {
      if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz)) { b.vx = Math.sign(b.vx || 1) * Math.abs(b.vx); b.x = cx + Math.sign(b.x - cx || 1) * (BALL_R + 1); }
      else if (Math.abs(dy) >= Math.abs(dz)) { b.vy = Math.sign(b.vy || 1) * Math.abs(b.vy); b.y = cy + Math.sign(b.y - cy || 1) * (BALL_R + 1); }
      else { b.vz = Math.sign(b.vz || 1) * Math.abs(b.vz); b.z = cz + Math.sign(b.z - cz || 1) * (BALL_R + 1); }
      spawnBurst(b.x, b.y, b.z, '#c084fc', 8);
      sfxWall();
      o.flash = 0.3;
      shake = Math.min(shake + 2, 8);
    }
  }

  applySpin(b, dt);

  // --- CPU side (Z negative) ---
  if (b.vz < 0) {
    if (b.z <= cpuPlane + PADDLE_T / 2 + BALL_R) {
      if (hitPaddle3D(b, paddleL, cpuPaddleH(), cpuPaddleW(), cpuPlane)) {
        if (ghostCharges > 0 && ghostCd <= 0 && !b.ghost) {
          ghostCharges--;
          ghostCd = 1.5;
          // Park the ball well outside the paddle's hit window so a steep shot can't
          // re-trigger the collision and burn the remaining passes.
          b.z = cpuPlane - 34;
          b.phased = true;
          sfxGhost(); spawnBurst(b.x, b.y, b.z, '#c084fc', 12); msgFlash('PHASED!');
        } else if (!b.phased && curAI && curAI.ability === 'phantom' && phaseActive) {
          b.z = cpuPlane - 34;
        } else if (curAI) {
          b.phased = false;
          cpuHitBall(b);
        }
      } else if (curAI && curAI.ability === 'echo' && echoActive > 0 && hitPaddle3D(b, { x: echoX, y: echoY }, cpuPaddleH(), cpuPaddleW(), cpuPlane)) {
        echoActive = 0;
        echoReturnBall(b);
      }
    }
    // The Bastion's energy wall catches ONE ball that slips past its paddle.
    if (b.vz < 0 && curAI && curAI.ability === 'bastion' && bastionActive > 0 && b.z < cpuPlane - PADDLE_T - 12) {
      b.z = cpuPlane + PADDLE_T / 2 + BALL_R + 0.5;
      b.vz = Math.abs(b.vz);
      bastionActive = 0;
      procFlash('BASTION!', b.x, b.y, '#9ad0ff');
      spawnBurst(b.x, b.y, b.z, '#9ad0ff', 16);
      shake = Math.min(shake + 5, 12);
      sfxShield();
      return false;
    }
    if (b.z < cpuPlane - 60) { point('p'); return true; }
  }

  // --- Player side (Z positive) ---
  if (b.vz > 0) {
    if (b.z >= playerPlane - PADDLE_T / 2 - BALL_R) {
      if (hitPaddle3D(b, paddleR, playerPaddleH(), PADDLE_W, playerPlane)) { b.phased = false; playerHitBall(b, false); }
      else if (has('second_paddle') && hitPaddle3D(b, paddleR2, defenderH(), PADDLE_W * 0.8, playerPlane - 16)) playerHitBall(b, true);
    }
    if (b.z > playerPlane + 60) {
      if (shieldsLeft > 0) {
        const free = synergyActive(SYNERGIES.find(s => s.id === 'syn_shield')) && Math.random() < 0.5;
        if (!free) shieldsLeft--;
        b.z = playerPlane - PADDLE_T / 2 - BALL_R - 0.5;
        b.vz = -Math.abs(b.vz);
        cpuFury++;
        sfxShield();
        msgFlash('SHIELD!');
        spawnBurst(b.x, b.y, b.z, '#7dd3fc', 20);
        shake = Math.min(shake + 4, 10);
        return false;
      }
      const pierce = 1 - Math.min(0.75, cpuFury * 0.15);   // Fury erodes chance-denial: each denied point makes the next goal likelier
      if (has('void') && Math.random() < bern(0.20 * pierce, Math.min(stacks('void'), 3))) {   // capped at 3 effective stacks (48.8%) — defense has a ceiling
        cpuFury++;
        msgFlash('VOID!');
        sfxGhost();
        spawnBurst(b.x, b.y, b.z, '#a78bfa', 18);
        if (synergyActive(SYNERGIES.find(s => s.id === 'syn_ghost'))) { ghostCharges = Math.min(ghostCharges + 1, 4); }
        serve(-1);
        resetPaddles();
        return true;
      }
      point('c');
      return true;
    }
  }
  return false;
}

function hitPaddle3D(b, p, h, w, plane) {
  const nx = clamp(b.x, p.x - w / 2, p.x + w / 2);
  const ny = clamp(b.y, p.y - h / 2, p.y + h / 2);
  const dx = b.x - nx, dy = b.y - ny;
  return dx * dx + dy * dy <= BALL_R * BALL_R && Math.abs(b.z - plane) <= PADDLE_T / 2 + BALL_R * 1.5;
}

function playerHitBall(b, fromDefender) {
  const p = fromDefender ? paddleR2 : paddleR;
  const h = fromDefender ? defenderH() : playerPaddleH();
  const w = fromDefender ? PADDLE_W * 0.8 : PADDLE_W;
  const ox = clamp((b.x - p.x) / (w / 2), -1, 1);
  const oy = clamp((b.y - p.y) / (h / 2), -1, 1);
  const maxTilt = MAX_TILT * (1 + dimStacks(stacks('wide'), 0.25) + dimStacks(stacks('stat_reach'), 0.08));
  let tiltX = ox * maxTilt + (Math.random() * 2 - 1) * 0.02;
  let tiltY = oy * maxTilt + (Math.random() * 2 - 1) * 0.02;
  tiltX += clamp((fromDefender ? 0 : p.vx) * 0.0011, -0.22, 0.22);
  tiltY += clamp((fromDefender ? 0 : p.vy) * 0.0011, -0.22, 0.22);
  tiltX = clamp(tiltX, -maxTilt, maxTilt);
  tiltY = clamp(tiltY, -maxTilt, maxTilt);
  if (!fromDefender) {
    const batteryBonus = batteryReady ? 40 * dimStacks(stacks('battery'), 1) : 0;
    const over = synergyActive(SYNERGIES.find(s => s.id === 'syn_power'));
    b.speed = Math.min(b.speed + speedRamp(30, b.speed) + 12 * dimStacks(stacks('power_shot'), 1) + 10 * dimStacks(stacks('turbo'), 1) + 10 * dimStacks(stacks('stat_power'), 1) + batteryBonus + (over ? 14 : 0), BALL_HARD_MAX);   // logarithmic ramp: hot early, tapers near the cap
    if (batteryReady) { batteryReady = false; batteryT = Math.max(1.5, 8 * Math.pow(0.75, Math.max(0, stacks('battery') - 1))); procFlash('POWER HIT!', b.x, b.y, '#ffd76a'); }   // Battery floors at 1.5s
    if (has('vamp')) { vampGrow = Math.min(vampGrow + 1.2 * stacks('vamp'), 40); cpuShrink = Math.min(cpuShrink + 1.2 * stacks('vamp'), 48); }
    if (has('frost')) { frostT = synergyActive(SYNERGIES.find(s => s.id === 'syn_frost')) ? 3 : 1.5; procFlash('CHILL!', b.x, b.y, '#7dd3fc'); }
    // Colossus Frame tremor: your hits slow the CPU for a moment.
    if (has('colossus')) { tremorT = 1.5; procFlash('TREMOR!', paddleL.x, paddleL.y, '#b0b7c9'); }
    // Shockwave: hard hits stun the CPU for a blink.
    if (has('bash') && b.speed > 600) { empLockT = Math.max(empLockT, 0.5); procFlash('SHOCKWAVE!', paddleL.x, paddleL.y, '#ff9f43'); }
  }
  if (fromDefender && synergyActive(SYNERGIES.find(s => s.id === 'syn_vamp'))) {
    vampGrow = Math.min(vampGrow + 1.2 * stacks('vamp'), 40);
    cpuShrink = Math.min(cpuShrink + 1.2 * stacks('vamp'), 48);
  }
  // Table-tennis spin in 3D: swiping your paddle as you strike imparts spin that curves the ball.
  // Magnus direction is OPPOSITE the swipe — slide left → ball curves right, brush up → ball dives down.
  b.spinX = fromDefender ? 0 : clamp(-p.vx * 0.006 * (1 + dimStacks(stacks('stat_spin'), 0.3)), -MAX_SPIN, MAX_SPIN);
  b.spinY = fromDefender ? 0 : clamp(-p.vy * 0.006 * (1 + dimStacks(stacks('stat_spin'), 0.3)), -MAX_SPIN, MAX_SPIN);
  if (!fromDefender && Math.hypot(p.vx, p.vy) > 380) procFlash('SPIN SHOT!', b.x, b.y, '#8ef0ff');
  // Curve Jolt: every hit leaves the ball with a burst of spin.
  if (!fromDefender && has('magnus')) {
    b.spinX = clamp(b.spinX + (Math.random() < 0.5 ? 1 : -1) * 1.3, -MAX_SPIN, MAX_SPIN);
    b.spinY = clamp(b.spinY + (Math.random() < 0.5 ? 1 : -1) * 1.3, -MAX_SPIN, MAX_SPIN);
    procFlash('CURVE JOLT!', b.x, b.y, '#c4b5fd');
  }
  // WILD SMASH (active, slot 1): an armed smash detonates on your next hit.
  if (!fromDefender && smashArmed && performance.now() < smashArmedUntil) {
    smashArmed = false;
    b.speed = Math.min(b.speed + 160, BALL_HARD_MAX);
    b.spinX = (Math.random() < 0.5 ? 1 : -1) * 2.8;
    b.spinY = (Math.random() < 0.5 ? 1 : -1) * 2.8;
    procFlash('WILD SMASH!', b.x, b.y, '#fb923c');
    spawnBurst(b.x, b.y, b.z, '#fb923c', 22);
    shake = Math.min(shake + 8, 12);
    sfxWin();
  }
  const cosY = Math.cos(tiltY);
  b.vx = Math.sin(tiltX) * cosY * b.speed;
  b.vy = Math.sin(tiltY) * b.speed;
  b.vz = -Math.cos(tiltX) * cosY * b.speed;
  b.z = (fromDefender ? playerPlane - 16 : playerPlane) - PADDLE_T / 2 - BALL_R - 0.5;
  if (!fromDefender && has('multiball')) { let n = stacks('multiball'); while (n-- > 0) splitBall(b); }
  const boltChance = Math.min(0.95, (has('bolt') ? bern(0.20, stacks('bolt')) : 0) + (synergyActive(SYNERGIES.find(s => s.id === 'syn_bolt')) ? 0.35 : 0));   // never >100%
  if (!fromDefender && boltChance > 0 && Math.random() < boltChance && balls.length < MAX_BALLS) {
    const bs = Math.min(b.speed + 160, BALL_HARD_MAX);
    const nb = { x: b.x, y: clamp(b.y, BALL_R, CH - BALL_R), z: b.z, speed: bs, vx: 0, vy: 0, vz: -bs, spinX: 0, spinY: 0, bolt: true };
    balls.push(nb);
    msgFlash('CHAIN BOLT!');
    spawnBurst(b.x, b.y, b.z, '#ffd76a', 14);
  }
  spawnBurst(b.x, b.y, b.z, COLORS.player, 10);
  shake = Math.min(shake + 3, 8);
  rally++;
  stageCheer = Math.max(stageCheer, 0.3);   // stages react to every return
  sfxRallyTick(rally);
  sfxPaddle(b.speed);
  ballHitFx(b, true);
}

function splitBall(b) {
  if (balls.length >= MAX_BALLS) return;
  // Tighter split angles and slightly slower clones: multiball is still hard to receive,
  // but a single CPU paddle can always physically cover the spread (never a free point).
  const jitterX = (Math.random() * 2 - 1) * 0.3;
  const jitterY = (Math.random() * 2 - 1) * 0.3;
  const sp = b.speed * 0.9;
  const cosY = Math.cos(jitterY);
  const nb = { x: b.x, y: clamp(b.y, BALL_R, CH - BALL_R), z: b.z, speed: sp, vx: Math.sin(jitterX) * cosY * sp, vy: Math.sin(jitterY) * sp, vz: -Math.cos(jitterX) * cosY * sp, spinX: b.spinX, spinY: b.spinY };
  balls.push(nb);
}

function cpuHitBall(b) {
  const a = curAI;
  const h = cpuPaddleH();
  const w = cpuPaddleW();
  const ox = clamp((b.x - paddleL.x) / (w / 2), -1, 1);
  const oy = clamp((b.y - paddleL.y) / (h / 2), -1, 1);
  let tiltX = ox * MAX_TILT + (Math.random() * 2 - 1) * 0.02;
  let tiltY = oy * MAX_TILT + (Math.random() * 2 - 1) * 0.02;
  if (a.ability === 'diviner') { tiltX += clamp(paddleR.vx * 0.0013, -0.28, 0.28); tiltY += clamp(paddleR.vy * 0.0013, -0.28, 0.28); }
  if (a.ability === 'mirror') { tiltX *= 1.6; tiltY *= 1.6; }
  // Aimed returns toward the open corner of the court.
  if (a.aim > 0 && !b.bolt) {
    const openX = paddleR.x > CW / 2 ? CW * 0.15 : CW * 0.85;
    const openY = paddleR.y > CH / 2 ? CH * 0.18 : CH * 0.82;
    const aimed = cpuAimAngles(b, openX, openY);
    tiltX = lerp(tiltX, aimed.ax, a.aim * 0.85);
    tiltY = lerp(tiltY, aimed.ay, a.aim * 0.85);
  }
  tiltX = clamp(tiltX, -1.25, 1.25);
  tiltY = clamp(tiltY, -1.25, 1.25);
  const parryHit = a.ability === 'parry' && parryActive > 0;
  const powerShot = chargeActive > 0;
  let accel = a.ability === 'smasher' ? 36 : (parryHit ? 60 : 22);
  if (rageActive > 0) accel += 30;
  if (stormActive > 0) accel += 50;
  let spinX = 0, spinY = 0;
  if (powerShot) {
    accel += 110;
    spinX = (Math.random() < 0.5 ? 1 : -1) * 2.2;
    spinY = (Math.random() < 0.5 ? 1 : -1) * 2.2;
    chargeActive = 0; chargeT = a.charge || 10;
    procFlash('POWER SHOT!', b.x, b.y, '#ffd76a');
    spawnBurst(b.x, b.y, b.z, '#ffd76a', 26);
    shake = Math.min(shake + 10, 18);
    sfxGhost();
  } else if (a.ability === 'mirror') {
    spinX = (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.abs(tiltX) * 1.6);
    spinY = (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.abs(tiltY) * 1.6);
  } else if (a.ability === 'diviner') {
    spinX = clamp(-paddleR.vx * 0.006, -2.6, 2.6);
    spinY = clamp(-paddleR.vy * 0.006, -2.6, 2.6);
  } else if (a.ability === 'smasher') {
    spinX = (Math.random() < 0.5 ? 1 : -1) * 0.9;
    spinY = (Math.random() < 0.5 ? 1 : -1) * 0.9;
  } else if (rageActive > 0) {
    spinX = (Math.random() < 0.5 ? 1 : -1) * 1.2;
    spinY = (Math.random() < 0.5 ? 1 : -1) * 1.2;
  }
  if (parryHit) { parryActive = 0; procFlash('PARRY!', b.x, b.y, '#93c5fd'); }
  // CPU swipes too: paddle motion imparts spin on the return.
  spinX += clamp(paddleL.vx * 0.004, -1.4, 1.4);
  spinY += clamp(paddleL.vy * 0.004, -1.4, 1.4);
  b.speed = Math.min(b.speed + speedRamp(accel + 8, b.speed), BALL_HARD_MAX);   // log ramp keeps CPU returns fair
  const cosY = Math.cos(tiltY);
  b.vx = Math.sin(tiltX) * cosY * b.speed;
  b.vy = Math.sin(tiltY) * b.speed;
  b.vz = Math.cos(tiltX) * cosY * b.speed;
  b.z = cpuPlane + PADDLE_T / 2 + BALL_R + 0.5;
  b.spinX = clamp(spinX, -MAX_SPIN, MAX_SPIN);
  b.spinY = clamp(spinY, -MAX_SPIN, MAX_SPIN);
  // CPU curve-in-flight: AI with high curve stat bends the ball after the hit.
  // This creates a Magnus-style curve that makes returns hard to read (like table tennis spin).
  if (a.curve > 0) {
    const curveStr = 24 * a.curve * (1 + 0.5 * Math.random());
    b.spinX = clamp(b.spinX + (Math.random() < 0.5 ? 1 : -1) * curveStr, -MAX_SPIN, MAX_SPIN);
    b.spinY = clamp(b.spinY + (Math.random() < 0.5 ? 1 : -1) * curveStr * 0.7, -MAX_SPIN, MAX_SPIN);
    // Diviner intentionally curves based on player velocity
    if (a.ability === 'diviner') {
      b.spinX = clamp(-paddleR.vx * 0.008, -2.6, 2.6);
      b.spinY = clamp(-paddleR.vy * 0.008, -2.6, 2.6);
    }
  }
  spawnBurst(b.x, b.y, b.z, COLORS.cpu, 10);
  shake = Math.min(shake + 3, 8);
  rally++;
  stageCheer = Math.max(stageCheer, 0.3);   // stages react to every return
  sfxRallyTick(rally);
  sfxPaddle(b.speed);
  ballHitFx(b, false);
}

/* Compute the azimuth/elevation that lands the ball near (targetX, targetY) at the player
   plane, folding X and Y wall bounces. Slope = displacement / travel is speed-independent. */
function cpuAimAngles(b, targetX, targetY) {
  const travel = Math.max(1, playerPlane - b.z);
  const RX = CW - 2 * BALL_R, RY = CH - 2 * BALL_R;
  let bestX = 0, bestErrX = Infinity;
  for (let k = -4; k <= 4; k++) {
    const u1 = targetX + k * 2 * RX;
    const u2 = 2 * BALL_R + 2 * RX - targetX + k * 2 * RX;
    for (const u of [u1, u2]) { const slope = (u - b.x) / travel; if (Math.abs(slope) < bestErrX) { bestErrX = Math.abs(slope); bestX = slope; } }
  }
  let bestY = 0, bestErrY = Infinity;
  for (let k = -4; k <= 4; k++) {
    const u1 = targetY + k * 2 * RY;
    const u2 = 2 * BALL_R + 2 * RY - targetY + k * 2 * RY;
    for (const u of [u1, u2]) { const slope = (u - b.y) / travel; if (Math.abs(slope) < bestErrY) { bestErrY = Math.abs(slope); bestY = slope; } }
  }
  return { ax: clamp(Math.atan(bestX), -1.25, 1.25), ay: clamp(Math.atan(bestY), -1.25, 1.25) };
}

function echoReturnBall(b) {
  const h = cpuPaddleH();
  const w = cpuPaddleW();
  const ox = clamp((b.x - echoX) / (w / 2), -1, 1);
  const oy = clamp((b.y - echoY) / (h / 2), -1, 1);
  let tiltX = clamp(ox * MAX_TILT * 1.4, -1.25, 1.25);
  let tiltY = clamp(oy * MAX_TILT * 1.4, -1.25, 1.25);
  b.speed = Math.min(b.speed + 10, BALL_HARD_MAX);
  const cosY = Math.cos(tiltY);
  b.vx = Math.sin(tiltX) * cosY * b.speed;
  b.vy = Math.sin(tiltY) * b.speed;
  b.vz = Math.cos(tiltX) * cosY * b.speed;
  b.z = cpuPlane + PADDLE_T / 2 + BALL_R + 0.5;
  b.spinX = (Math.random() < 0.5 ? 1 : -1) * 1.8;
  b.spinY = (Math.random() < 0.5 ? 1 : -1) * 1.8;
  spawnBurst(b.x, b.y, b.z, '#7dd3fc', 10);
  sfxPaddle(b.speed);
}

function onWall(b) {
  spawnBurst(b.x, b.y, b.z, COLORS.ball, 4);
  sfxWall();
  // Bouncy Walls: wall behavior lives in the 'bouncy' condition hook (game/content/conditions/).
  const hzW = COND_HOOKS[curCond];
  if (hzW && hzW.onWall) hzW.onWall(b);
}

function fold(v, lo, hi) {
  const range = hi - lo;
  let t = (v - lo) % (2 * range);
  if (t < 0) t += 2 * range;
  return t <= range ? lo + t : hi - (t - range);
}
function predict3D(s, targetZ) {
  if (s.vz === 0) return { x: s.x, y: s.y };
  const t = (targetZ - s.z) / s.vz;
  if (t <= 0) return { x: s.x, y: s.y };
  return { x: fold(s.x + s.vx * t, BALL_R, CW - BALL_R), y: fold(s.y + s.vy * t, BALL_R, CH - BALL_R) };
}

/* ============================== AI ============================== */
function histAt(t) {
  if (!hist.length) return null;
  if (t <= hist[0].t) return hist[0];
  const l = hist[hist.length - 1];
  if (t >= l.t) return l;
  for (let i = hist.length - 2; i >= 0; i--) {
    const x = hist[i], y = hist[i + 1];
    if (t >= x.t && t <= y.t) {
      const f = (t - x.t) / Math.max(1e-6, y.t - x.t);
      return { x: x.x + (y.x - x.x) * f, y: x.y + (y.y - x.y) * f, z: x.z + (y.z - x.z) * f, vx: x.vx, vy: x.vy, vz: x.vz };
    }
  }
  return hist[0];
}

function updateAbilityTimers(dt) {
  const a = curAI;
  if (!a) return;
  // Charmed Round: the CPU's special ability is disabled for the whole round.
  const abilityOn = !charmed;
  const cd = dt * (1 - Math.min(0.7, 0.4 * dimStacks(stacks('champion'), 1)));  // never negative at high stacks
  if (abilityOn && a.ability === 'surge') {
    surgeT -= cd;
    if (surgeT <= 0) { surgeT = 6; surgeActive = 1.5; }
    if (surgeActive > 0) surgeActive -= dt;
  }
  if (abilityOn && a.ability === 'phantom') {
    if (phaseActive) {
      phaseDur -= dt;
      if (phaseDur <= 0) { phaseActive = false; phaseT = 5; }
    } else {
      phaseT -= cd;
      if (phaseT <= 0) { phaseActive = true; phaseDur = 1.2; }
    }
  }
  if (abilityOn && a.ability === 'weaver') {
    weaverT -= cd;
    if (weaverT <= 0) {
      weaverT = 8;
      let spawned = 0;
      while (spawned < 2 && balls.length < MAX_BALLS && balls.length > 0) {
        const src = balls[Math.floor(Math.random() * balls.length)];
        const jx = (Math.random() * 2 - 1) * 0.3;
        const jy = (Math.random() * 2 - 1) * 0.3;
        const cY = Math.cos(jy);
        balls.push({ x: clamp(src.x, BALL_R, CW - BALL_R), y: clamp(src.y, BALL_R, CH - BALL_R), z: clamp(src.z, -CL / 2 + 100, CL / 2 - 100), speed: src.speed, vx: Math.sin(jx) * cY * src.speed, vy: Math.sin(jy) * src.speed, vz: Math.cos(jx) * cY * src.speed * (src.vz < 0 ? -1 : 1), spinX: (Math.random() < 0.5 ? 1 : -1) * 1.2, spinY: (Math.random() < 0.5 ? 1 : -1) * 1.2 });
        spawned++;
      }
      if (spawned > 0) {
        msgFlash('SWARM ×' + spawned + '!');
        procFlash('SWARM!', CW / 2, CH / 2, '#f0abfc');
        spawnBurst(CW / 2, CH / 2, 0, '#f0abfc', 16);
      }
    }
  }
  if (abilityOn && a.ability === 'gamble') {
    gambleT -= cd;
    if (gambleT <= 0) {
      gambleT = 4;
      if (Math.random() < 0.5) {
        let tb = null, bt = Infinity;
        for (const b of balls) {
          if (b.vz < 0) {
            const t = (b.z - cpuPlane) / -b.vz;
            if (t >= 0 && t < bt) { bt = t; tb = b; }
          }
        }
        if (tb) {
          const pr = a.predict ? predict3D(tb, cpuPlane) : { x: tb.x, y: tb.y };
          paddleL.x = clamp(pr.x, cpuPaddleW() / 2, CW - cpuPaddleW() / 2);
          paddleL.y = clamp(pr.y, cpuPaddleH() / 2, CH - cpuPaddleH() / 2);
          procFlash('GAMBLE!', paddleL.x, paddleL.y, '#fbbf24');
          spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#fbbf24', 18);
        }
      } else {
        gambleFreeze = 0.7;
        procFlash('BLUFF!', paddleL.x, paddleL.y, '#94a3b8');
      }
    }
    if (gambleFreeze > 0) gambleFreeze -= dt;
  }
  if (abilityOn && a.ability === 'parry') {
    parryT -= cd;
    if (parryT <= 0) { parryT = 6; parryActive = 1.2; procFlash('PARRY!', paddleL.x, paddleL.y, '#93c5fd'); spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#93c5fd', 12); }
    if (parryActive > 0) parryActive -= dt;
  }
  if (abilityOn && a.ability === 'lure') {
    lureT -= cd;
    if (lureT <= 0) { lureT = 7; lureActive = 1.8; procFlash('LURED!', paddleR.x, paddleR.y, '#f9a8d4'); sfxGhost(); }
    if (lureActive > 0) lureActive -= dt;
  }
  if (abilityOn && a.ability === 'shell') {
    shellT -= cd;
    if (shellT <= 0) { shellT = 5; shellOpen = 1.0; procFlash('SHELL!', paddleL.x, paddleL.y, '#86efac'); }
    if (shellOpen > 0) shellOpen -= dt;
  }
  if (abilityOn && a.ability === 'quake') {
    quakeT -= cd;
    if (quakeT <= 0) {
      quakeT = 7;
      quakeActive = 1.0;
      shake = Math.min(shake + 16, 22);
      msgFlash('QUAKE!');
      sfxLose();
      for (const b of balls) {
        b.speed = Math.min(b.speed + 40, BALL_HARD_MAX);
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
        b.spinX = clamp(b.spinX + (Math.random() < 0.5 ? 1 : -1) * 1.8, -MAX_SPIN, MAX_SPIN);
        b.spinY = clamp(b.spinY + (Math.random() < 0.5 ? 1 : -1) * 1.8, -MAX_SPIN, MAX_SPIN);
      }
    }
    if (quakeActive > 0) quakeActive -= dt;
  }
  if (abilityOn && a.ability === 'hex') {
    hexT -= cd;
    if (hexT <= 0) {
      hexT = 6;
      hexActive = 2.5;
      msgFlash('HEXED!');
      sfxGhost();
    }
    if (hexActive > 0) hexActive -= dt;
  }
  if (abilityOn && a.ability === 'bastion') {
    bastionT -= cd;
    if (bastionT <= 0) { bastionT = 6; bastionActive = 1.5; procFlash('BASTION!', paddleL.x, paddleL.y, '#9ad0ff'); spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#9ad0ff', 12); }
    if (bastionActive > 0) bastionActive -= dt;
  }
  if (abilityOn && a.ability === 'echo') {
    echoT -= cd;
    if (echoT <= 0) { echoT = 6; echoActive = 2.0; echoX = paddleL.x; echoY = paddleL.y; procFlash('ECHO!', paddleL.x, paddleL.y, '#7dd3fc'); spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#7dd3fc', 12); }
    if (echoActive > 0) echoActive -= dt;
  }
  if (abilityOn && a.ability === 'gust') {
    gustT -= cd;
    if (gustT <= 0) { gustT = 7; gustActive = 2.5; msgFlash('GUST!'); sfxGhost(); }
    if (gustActive > 0) gustActive -= dt;
  }
  if (abilityOn && a.ability === 'rage') {
    rageT -= cd;
    if (rageT <= 0) { rageT = 7; rageActive = 3.0; msgFlash('RAGE!'); procFlash('RAGE!', paddleL.x, paddleL.y, '#f87171'); sfxLose(); }
    if (rageActive > 0) rageActive -= dt;
  }
  if (abilityOn && a.ability === 'storm') {
    stormT -= cd;
    if (stormT <= 0) {
      stormT = 8; stormActive = 2.0;
      shake = Math.min(shake + 14, 20);
      msgFlash('STORM!');
      sfxLose();
      for (const b of balls) {
        b.speed = Math.min(b.speed + 30, BALL_HARD_MAX);
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
        b.spinX = clamp(b.spinX + (Math.random() < 0.5 ? 1 : -1) * 1.4, -MAX_SPIN, MAX_SPIN);
        b.spinY = clamp(b.spinY + (Math.random() < 0.5 ? 1 : -1) * 1.4, -MAX_SPIN, MAX_SPIN);
      }
    }
    if (stormActive > 0) stormActive -= dt;
  }
  if (abilityOn && a.ability === 'tide') {
    tideT -= cd;
    if (tideT <= 0) {
      tideT = 9; tideActive = 3.0; tideDir = -tideDir;
      msgFlash('TIDE!');
      shake = Math.min(shake + 10, 16);
      sfxGhost();
    }
    if (tideActive > 0) tideActive -= dt;
  }
  if (abilityOn && a.charge) {
    chargeT -= cd;
    if (chargeT <= 0) {
      chargeT = a.charge;
      chargeActive = 2.0;
      procFlash('CHARGING!', paddleL.x, paddleL.y - cpuPaddleH() / 2 - 16, '#ffd76a');
      spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#ffd76a', 12);
      sfxShield();
    }
    if (chargeActive > 0) chargeActive -= dt;
  }
  if (frozenLeft > 0) frozenLeft = Math.max(0, frozenLeft - dt);
  if (frostT > 0) frostT = Math.max(0, frostT - dt);
}

function cpuUpdate(dt) {
  const a = curAI;
  if (!a) return;
  // Comeback drive + Charmed focus are used by both the aim-error and movement blocks below.
  const comeback = (scores.c + 2 <= scores.p) ? 1.18 : 1;   // trailing by 2+: plays harder
  const focus = charmed ? 1.1 : 1;                          // ability silenced: raw fundamentals
  const prevX = paddleL.x, prevY = paddleL.y;

  const tb0 = balls.length ? balls[0] : null;
  hist.push({ x: tb0 ? tb0.x : CW / 2, y: tb0 ? tb0.y : CH / 2, z: tb0 ? tb0.z : 0, vx: tb0 ? tb0.vx : 0, vy: tb0 ? tb0.vy : 0, vz: tb0 ? tb0.vz : 0, t: tNow });
  if (hist.length > 240) hist.shift();

  // Track the incoming ball that demands the most: soonest to arrive AND farthest from
  // the paddle's current spot. This lets the CPU cover multishot serves instead of
  // fixating on the first ball it sees.
  let targetBall = null, bestScore = -Infinity;
  for (const b of balls) {
    if (b.vz < 0) {
      const t = (b.z - cpuPlane) / Math.max(-b.vz, 1);
      if (t < 0) continue;
      const pr = predict3D(b, cpuPlane);
      const need = Math.hypot(pr.x - paddleL.x, pr.y - paddleL.y) / Math.max(t, 0.05);
      const score = need * (1 / (0.25 + t));
      if (score > bestScore) { bestScore = score; targetBall = b; }
    }
  }

  let tx, ty;
  if (targetBall) {
    // On very fast balls the CPU reads from a slightly older state (reaction lag grows
    // with the pace) — fast shots can out-run the read, slow ones are read perfectly.
    const react = (tNow - serveLaunchT) < 0.5 ? Math.min(a.react, 0.10) : a.react * (targetBall.speed > 1000 ? 2.0 : 1);
    const look = balls.length === 1
      ? (histAt(tNow - react) || { x: targetBall.x, y: targetBall.y, z: targetBall.z, vx: targetBall.vx, vy: targetBall.vy, vz: targetBall.vz })
      : { x: targetBall.x, y: targetBall.y, z: targetBall.z, vx: targetBall.vx, vy: targetBall.vy, vz: targetBall.vz };
    const pr = a.predict ? predict3D(look, cpuPlane) : { x: look.x, y: look.y };
    tx = pr.x; ty = pr.y;
  } else {
    const b0 = balls[0];
    tx = (a.personality === 'defense' && b0 && b0.vz > 0) ? b0.x : CW / 2 + Math.sin(tNow * 0.6) * CW * 0.12;
    ty = (a.personality === 'defense' && b0 && b0.vz > 0) ? b0.y : CH / 2 + Math.cos(tNow * 0.5) * CH * 0.1;
  }

  cpuRerollT -= dt;
  if (cpuRerollT <= 0) {
    const distFactor = targetBall ? clamp((targetBall.z - cpuPlane) / 700, 0.25, 1) : 1;
    // Aim error: a floor keeps every champion human (never perfect), and fast balls are
    // harder to read — so a fast angled shot always has a real window to beat them.
    const ballSpd = targetBall ? targetBall.speed : BALL_START;
    // Fast balls are genuinely harder to read: speed pushes their aim error up, so a
    // hot shot has a real chance even against a precise champion.
    const spdErr = 1 + clamp((ballSpd - BALL_START) / BALL_START, 0, 1) * 0.9;
    const cloneDist = balls.filter(x => x.clone).length;   // holo decoys distract the CPU's aim
    const err = Math.max(6, a.error * distFactor * spdErr * (frozenLeft > 0 && synergyActive(SYNERGIES.find(s => s.id === 'syn_frost')) ? 1.5 : 1) * (glitchActiveT > 0 ? 3 : 1) * (comeback ? 0.8 : 1) * (1 - Math.min(0.55, cpuFury * 0.07)) * (1 + 0.16 * cloneDist));   // comeback + fury = sharper aim; holo clones = fuzzier aim
    cpuTargetX = tx + (Math.random() * 2 - 1) * err;
    cpuTargetY = ty + (Math.random() * 2 - 1) * err;
    cpuRerollT = 0.10 + Math.random() * 0.10;
  }

  // Slows stack multiplicatively — floor the SLOW product so the CPU always keeps ~35% of its
  // speed: it can be pressured hard, but never frozen into a statue it cannot play out of.
  let slowMul = (frozenLeft > 0 ? 0.6 : 1) * (frostT > 0 ? 0.8 : 1) * (gambleFreeze > 0 ? 0.15 : 1) * (tremorT > 0 ? 0.85 : 1) * (empLockT > 0 ? 0.05 : 1);
  slowMul = Math.max(0.35, slowMul);
  // Fury: every denied point sharpens the CPU (permanent for the match, capped) — the more
  // defense you stack, the harder the CPU pushes, so no build can lock it out forever.
  const furyMul = 1 + Math.min(0.6, cpuFury * 0.10);
  // Ability boosts are CAPPED so no champion can teleport: even a surging Viper keeps
  // its panel physically beatable by a hard, fast, angled shot.
  const boostMul = Math.min(1.55, (surgeActive > 0 ? 1.5 : 1) * (a.ability === 'phantom' && phaseActive ? 1.45 : 1) * (rageActive > 0 ? 1.6 : 1));
  const speedMul = Math.min(1.9, slowMul * boostMul * comeback * focus * furyMul);
  const dx = cpuTargetX - paddleL.x, dy = cpuTargetY - paddleL.y;
  const d = Math.hypot(dx, dy);
  if (d > 4) {
    const near = targetBall && (targetBall.z - cpuPlane) < 200;
    const ease = near ? 1.15 : Math.min(1, d / 120);
    // Physical reach limit: lateral speed can never wildly outpace the ball, so a
    // sharp cross-court shot always keeps a lane open past the panel.
    const wantVX = (dx / d) * a.speed * speedMul * ease;
    const wantVY = (dy / d) * a.speed * speedMul * ease;
    const wantSpd = Math.hypot(wantVX, wantVY);
    // Reach cap scales modestly with ability boosts so surges still matter — but stays
    // below the fastest possible shot's lateral speed, keeping every champion beatable.
    // The CPU may chase at most ~82% of the incoming ball's own lateral speed (floored
    // so slow rallies still get covered). A fast, hard-angled shot therefore out-paces
    // the panel over the final stretch — every champion keeps a reachable window, while
    // crisp read-and-hold defense keeps slow shots returnable (pressure stays on you).
    const tb = targetBall || balls[0];
    const ballLat = tb ? Math.hypot(tb.vx, tb.vy) : 0;
    const latCap = Math.max(380, ballLat * 0.82) * Math.min(1.12, boostMul);
    const vx = wantSpd > latCap ? wantVX / wantSpd * latCap : wantVX;
    const vy = wantSpd > latCap ? wantVY / wantSpd * latCap : wantVY;
    // Inertia: the CPU cannot instantly reverse direction — sharp fakes genuinely beat it.
    const accel = a.personality === 'defense' ? 1500 : 2100;   // px/s^2
    // Fast balls are stiff to correct: near the plane the CPU can't snap onto a fresh
    // read, so a hot angled shot keeps a genuine scoring window instead of an endless wall.
    const maxDV = accel * (targetBall && targetBall.speed > 1000 ? 0.55 : 1) * dt;
    const dvx = vx - paddleL.vx, dvy = vy - paddleL.vy;
    const dv = Math.hypot(dvx, dvy);
    if (dv > maxDV) { paddleL.vx += dvx / dv * maxDV; paddleL.vy += dvy / dv * maxDV; }
    else { paddleL.vx = vx; paddleL.vy = vy; }
    paddleL.x += paddleL.vx * dt;
    paddleL.y += paddleL.vy * dt;
  }
  paddleL.x = clamp(paddleL.x, cpuPaddleW() / 2, CW - cpuPaddleW() / 2);
  paddleL.y = clamp(paddleL.y, cpuPaddleH() / 2, CH - cpuPaddleH() / 2);
  paddleL.vx = (paddleL.x - prevX) / Math.max(dt, 1e-4);
  paddleL.vy = (paddleL.y - prevY) / Math.max(dt, 1e-4);
}

/* ============================== Player ============================== */
function playerUpdate(dt) {
  const a = curAI;
  const colossusSpeed = 1 + dimStacks(stacks('colossus'), 0.3);
  const hexSpeed = hexActive > 0 ? 0.7 : 1;
  // Mouse aims the paddle by projecting the cursor onto the player plane; WASD/arrows
  // are freed up for active abilities and ball-curving. Speed comes from abilities only.
  const speedFactor = (a && a.ability === 'glacier' ? 0.5 : 1) * (1 + dimStacks(stacks('stat_speed'), 0.09)) * colossusSpeed * hexSpeed;
  const invert = lureActive > 0 ? -1 : 1;
  const prevX = paddleR.x, prevY = paddleR.y;
  let moving = false;
  const slowF = playerSlowT > 0 ? 0.7 : 1;   // Chill arena ball: the receiver's paddle slows briefly
  const hzP = COND_HOOKS[curCond];
  if (hzP && hzP.player) {
    if (hzP.player(dt, speedFactor, invert)) moving = true;
  } else if (mouseActive) {
    // Classic near-instant aim: glide toward the cursor at a rate that stays beatable.
    paddleR.x += (mouseX - paddleR.x) * Math.min(1, dt * 16 * speedFactor * slowF) * invert;
    paddleR.y += (mouseY - paddleR.y) * Math.min(1, dt * 16 * speedFactor * slowF) * invert;
    moving = true;
  }
  paddleR.x = clamp(paddleR.x, PADDLE_W / 2, CW - PADDLE_W / 2);
  paddleR.y = clamp(paddleR.y, playerPaddleH() / 2, CH - playerPaddleH() / 2);
  paddleR.vx = (paddleR.x - prevX) / Math.max(dt, 1e-4);
  paddleR.vy = (paddleR.y - prevY) / Math.max(dt, 1e-4);

  // Curve control: hold Shift and steer YOUR outgoing shots (vz < 0 = toward the CPU).
  // Always available; the Curve Control powerup and Magnus Cell upgrade boost strength.
  if (keys.shift) {
    let steerX = 0, steerY = 0;
    if (keys.left || keys.a) steerX -= 1;
    if (keys.right || keys.d) steerX += 1;
    if (keys.up || keys.w) steerY -= 1;
    if (keys.down || keys.s) steerY += 1;
    if (steerX !== 0 || steerY !== 0) {
      // Balanced curve: enough to bend a shot, never enough to steer it like a guided
      // missile — capped at ~40% of the ball's speed of lateral bend per second.
      const curveStr = 620 * (1 + (has('curve') ? 0.6 : 0) + 0.18 * dimStacks(stacks('stat_curve'), 1));
      const maxBend = 0.4;
      for (const b of balls) {
        if (b.vz < 0) {
          const cap = b.speed * maxBend * dt;
          b.vx += clamp(steerX * curveStr * dt, -cap, cap);
          b.vy += clamp(steerY * curveStr * dt, -cap, cap);
          const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
          const f = b.speed / sp;
          b.vx *= f; b.vy *= f; b.vz *= f;
          b.spinX = steerX; b.spinY = steerY;
        }
      }
    }
  }
  for (const b of balls) { if (b.spinX) b.spinX *= Math.pow(0.45, dt); if (b.spinY) b.spinY *= Math.pow(0.45, dt); }

  // Seeker Rounds: outgoing shots bend toward the CPU paddle. (Gravity Well: 40% stronger)
  const seekerMult = synergyActive(SYNERGIES.find(s => s.id === 'syn_magseek')) ? 1.4 : 1;
  if (has('seeker')) {
    for (const b of balls) {
      if (b.vz < 0) {
        const sp = Math.hypot(b.vx, b.vy, b.vz);
        b.vx += clamp((paddleL.x - b.x) * 2.2 * dt * dimStacks(stacks('seeker'), 1) * seekerMult, -440 * dt, 440 * dt);
        b.vy += clamp((paddleL.y - b.y) * 2.2 * dt * dimStacks(stacks('seeker'), 1) * seekerMult, -440 * dt, 440 * dt);
        const ns = Math.hypot(b.vx, b.vy, b.vz);
        if (ns > 0) { b.vx = b.vx / ns * sp; b.vy = b.vy / ns * sp; b.vz = b.vz / ns * sp; }
      }
    }
  }
  // Magnet Grip: pull incoming balls toward your paddle.
  if (has('magnet')) {
    for (const b of balls) {
      if (b.vz > 0 && Math.hypot(b.x - paddleR.x, b.y - paddleR.y) < 150) {
        const sp = Math.hypot(b.vx, b.vy, b.vz);
        b.vx += clamp((paddleR.x - b.x) * 5 * dt * dimStacks(stacks('magnet'), 1) * seekerMult, -480 * dt, 480 * dt);
        b.vy += clamp((paddleR.y - b.y) * 5 * dt * dimStacks(stacks('magnet'), 1) * seekerMult, -480 * dt, 480 * dt);
        const ns = Math.hypot(b.vx, b.vy, b.vz);
        if (ns > 0) { b.vx = b.vx / ns * sp; b.vy = b.vy / ns * sp; b.vz = b.vz / ns * sp; }
      }
    }
  }

  // Backup paddle auto-defender.
  if (has('second_paddle')) {
    let tX = paddleR.x, tY = paddleR.y;
    let inBall = null, bd = Infinity;
    for (const b of balls) { if (b.vz > 0) { const d = Math.hypot(b.x - paddleR2.x, b.y - paddleR2.y); if (d < bd) { bd = d; inBall = b; } } }
    if (inBall) { tX = inBall.x; tY = inBall.y; }
    tX = clamp(tX, PADDLE_W * 0.4, CW - PADDLE_W * 0.4);
    tY = clamp(tY, defenderH() / 2, CH - defenderH() / 2);
    const maxStep = PLAYER_SPEED * 0.9 * speedFactor * dt;
    const dx = clamp(tX - paddleR2.x, -maxStep, maxStep);
    const dy = clamp(tY - paddleR2.y, -maxStep, maxStep);
    paddleR2.x += dx; paddleR2.y += dy;
    paddleR2.x = clamp(paddleR2.x, PADDLE_W * 0.4, CW - PADDLE_W * 0.4);
    paddleR2.y = clamp(paddleR2.y, defenderH() / 2, CH - defenderH() / 2);
  }
}

/* ============================== Particles (3D) ============================== */

/* (moved: function spawnBurst) */

function spawnConfetti() {
  const colors = theme === 'vibrant' ? ['#22d3ee', '#f43f5e', '#a78bfa', '#facc15', '#34d399']
    : theme === 'sunset' ? ['#41ead4', '#ff8912', '#ff206e', '#ffe3b3', '#8f5cff']
    : ['#191612', '#4a463c', '#8a8578', '#b9b3a2', '#e6e0d0'];
  for (let i = 0; i < 70; i++) {
    if (particles.length > 150) break;
    particles.push({ x: CW / 2 + (Math.random() * 2 - 1) * CW * 0.4, y: CH + 30, z: (Math.random() * 2 - 1) * CL * 0.4, vx: (Math.random() * 2 - 1) * 140, vy: -60 - Math.random() * 160, vz: (Math.random() * 2 - 1) * 140, life: 1.6 + Math.random(), max: 2.6, size: 3 + Math.random() * 3, color: colors[i % colors.length] });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.vx *= 0.985; p.vy *= 0.985; p.vz *= 0.985;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ============================== Update ============================== */
function update(rawDt) {
  let dt = rawDt;
  if (state === 'play') {
    // Manual ability cooldowns tick down; a ready ability stays armed until the player fires it.
    for (const id of ACTIVE_ABILITIES) {
      const ms = manualState[id];
      if (!ms.ready && ms.cd > 0) {
        ms.cd -= rawDt;
        if (ms.cd <= 0) { ms.cd = 0; ms.ready = true; }
      }
    }
    // Generic timed-passive procs: any passive registered with a cooldown ticks here.
    // cd can be a number or a function of stacks (e.g. n => 8 * 0.75^(n-1)) — future
    // timed passives just call registerPassive(id, cd, fn) and this loop runs them.
    for (const id of Object.keys(PASSIVE_PROCS)) {
      if (!has(id)) continue;
      const cdv = typeof ABILITIES[id].cd === 'function' ? ABILITIES[id].cd(stacks(id)) : ABILITIES[id].cd;
      const full = Math.max(0.5, cdv || 8);
      // First frame owned seeds the timer at FULL cooldown so a fresh pickup
      // doesn't proc instantly — it charges up like a real cooldown.
      if (passiveT[id] === undefined) { passiveT[id] = full; continue; }
      passiveT[id] -= rawDt;
      if (passiveT[id] <= 0) {
        passiveT[id] = full;
        PASSIVE_PROCS[id]();
      }
    }
    // Chrono Field (legacy active): while active the whole rally runs slow-mo.
    if (warpActive > 0) { warpActive -= rawDt; dt *= synergyActive(SYNERGIES.find(s => s.id === 'syn_clock')) ? 0.5 : 0.6; }
    if (has('emp') && empLockT > 0) empLockT -= rawDt;
    if (has('glitch') && glitchActiveT > 0) glitchActiveT -= rawDt;
    if (ghostCd > 0) ghostCd -= dt;
    if (tremorT > 0) tremorT -= dt;
    if (has('battery')) {
      if (!batteryReady) {
        batteryT -= rawDt;
        if (batteryT <= 0) { batteryT = Math.max(1.5, 8 * Math.pow(0.75, Math.max(0, stacks('battery') - 1))); batteryReady = true; procFlash('CHARGED!', paddleR.x, paddleR.y - playerPaddleH() / 2 - 16, '#ffd76a'); sfxPick(); }   // Battery floors at 1.5s
      }
    }
  }

  if (state === 'menu') {
    for (const b of balls) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.x < BALL_R || b.x > CW - BALL_R) b.vx *= -1;
      if (b.y < BALL_R || b.y > CH - BALL_R) b.vy *= -1;
      if (b.z < -CL / 2 + BALL_R || b.z > CL / 2 - BALL_R) b.vz *= -1;
    }
  }

  if (state === 'play') {
    if (serveTimer > 0) {
      serveTimer -= dt;
      if (serveTimer <= 0) sfxServe();
    } else {
      stepBalls(dt);
      for (const b of balls) {
        if (Math.abs(b.spinX) > 0.1 || Math.abs(b.spinY) > 0.1) {
          b.trail = b.trail || [];
          b.trail.push({ x: b.x, y: b.y, z: b.z });
          if (b.trail.length > 9) b.trail.shift();
        } else if (b.trail && b.trail.length) { b.trail.length = 0; }
      }
    }
    // The Zephyr's gust: wobble every ball in flight (speed preserved).
    if (gustActive > 0) {
      for (const b of balls) {
        b.vy += Math.sin(tNow * 8 + b.y * 0.05) * 1600 * dt;
        b.vx += Math.sin(tNow * 7 + b.z * 0.05) * 1200 * dt;
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
      }
    }
    // The Leviathan's tide: drag every ball sideways (swaps direction each activation).
    if (tideActive > 0) {
      for (const b of balls) {
        b.vx += tideDir * 900 * hazardScale * dt;
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx = b.vx / sp * b.speed; b.vy = b.vy / sp * b.speed; b.vz = b.vz / sp * b.speed;
      }
    }
    // --- Arena ball type effects (the ball you picked on the intro screen) ---
    for (const b of balls) {
      if (b.clone) { b.life -= dt; if (b.life <= 0) b.dead = true; continue; }
      if (b.mini) { b.life -= dt; if (b.life <= 0) b.dead = true; }
      const tp = b.type || 'standard';
      const spd = Math.hypot(b.vx, b.vy, b.vz) || 1;
      if (tp === 'wave') {
        b.waveT += dt * 5.2;
        b.vx += Math.sin(b.waveT) * 300 * dt;
        if (spd > 0.01) { const f = b.speed / (Math.hypot(b.vx, b.vy, b.vz) || 1); b.vx *= f; b.vy *= f; b.vz *= f; }
      } else if (tp === 'heavy') {
        b.vy -= 950 * dt;
        if (spd > 0.01) { const f = b.speed / (Math.hypot(b.vx, b.vy, b.vz) || 1); b.vx *= f; b.vy *= f; b.vz *= f; }
      } else if (tp === 'jitter') {
        b.jitterT -= dt;
        if (b.jitterT <= 0) {
          b.jitterT = 0.9 + Math.random() * 0.9;
          const a = Math.random() * Math.PI * 2;
          b.vx += Math.cos(a) * 60; b.vy += Math.sin(a) * 60;
          if (spd > 0.01) { const f = b.speed / (Math.hypot(b.vx, b.vy, b.vz) || 1); b.vx *= f; b.vy *= f; b.vz *= f; }
        }
      } else if (tp === 'flash') {
        b.flashT -= dt;
        if (b.flashT <= 0) { b.flashT = 3.2 + Math.random() * 0.8; flashBang(b); }
      } else if (tp === 'holo') {
        b.holoT -= dt;
        if (b.holoT <= 0) { b.holoT = 2.2 + Math.random(); spawnHoloClones(b); }
      } else if (tp === 'trick') {
        b.trickDist += spd * dt;
        if (!b.trickFired && b.trickDist > 420) {
          b.trickFired = true; b.trickT = 0.4;
          b.spinX = clamp(b.spinX + (Math.random() < 0.5 ? 1 : -1) * 1.6, -MAX_SPIN, MAX_SPIN);
          b.spinY = clamp(b.spinY + (Math.random() < 0.5 ? 1 : -1) * 1.6, -MAX_SPIN, MAX_SPIN);
          spawnBurst(b.x, b.y, b.z, '#c4b5fd', 6);
        }
        if (b.trickT > 0) { b.trickT -= dt; if (b.trickT <= 0) { b.spinX = 0; b.spinY = 0; } }
      }
    }
    balls = balls.filter(x => !x.dead);
    // --- Arena conditions (dispatched to the active condition's tick hook) ---
    const hzC = COND_HOOKS[curCond];
    if (hzC && hzC.tick) hzC.tick(dt);
    // Drifting obstacle blocks (Blockades) — they tumble now, telegraphing their reach.
    for (const o of obstacles) {
      o.y += o.vy * dt; o.x += o.vx * dt;
      o.rot = (o.rot || 0) + (o.rs || 0.6) * dt;
      if (o.flash) o.flash = Math.max(0, o.flash - dt);
      if (o.y < o.h / 2 + 8) { o.y = o.h / 2 + 8; o.vy = Math.abs(o.vy); }
      if (o.y > CH - o.h / 2 - 8) { o.y = CH - o.h / 2 - 8; o.vy = -Math.abs(o.vy); }
      o.x = clamp(o.x, CW * 0.15, CW * 0.85);
    }
    updateAbilityTimers(dt);
    playerUpdate(dt);
    cpuUpdate(dt);
  }

  updateParticles(dt);
  for (let i = procs.length - 1; i >= 0; i--) { procs[i].t -= dt; if (procs[i].t <= 0) procs.splice(i, 1); }
  for (let i = bonks.length - 1; i >= 0; i--) { bonks[i].t -= dt; if (bonks[i].t <= 0) bonks.splice(i, 1); }
  if (flashVig > 0) flashVig -= dt;
  if (playerSlowT > 0) playerSlowT -= dt;
  if (shake > 0) shake = Math.max(0, shake - 26 * dt);
  if (msgT > 0) msgT -= dt;

  // HUD status line
  let status = '';
  if (state === 'play' && curAI) {
    if (curAI.ability === 'phantom' && phaseActive) status = '👻 PHASED';
    else if (curAI.ability === 'surge' && surgeActive > 0) status = '⚡ SURGE';
    else if (curAI.ability === 'quake' && quakeActive > 0) status = '🗿 QUAKE';
    else if (curAI.ability === 'hex' && hexActive > 0) status = '🧙 HEXED';
    else if (curAI.charge && chargeActive > 0) status = '⚡ ' + curAI.name.toUpperCase() + ' CHARGING';
    else if (curAI.ability === 'lure' && lureActive > 0) status = '🧜 CONTROLS INVERTED!';
    else if (curAI.ability === 'parry' && parryActive > 0) status = '🛡️ PARRY UP';
    else if (curAI.ability === 'shell' && shellOpen > 0) status = '🐢 SHELL OPEN';
    else if (curAI.ability === 'gamble' && gambleFreeze > 0) status = '🎲 BLUFFING';
    else if (curAI.ability === 'weaver') status = '🕸️ BALLS: ' + balls.length + '/3';
    else if (curAI.ability === 'bastion' && bastionActive > 0) status = '🏰 BASTION WALL';
    else if (curAI.ability === 'echo' && echoActive > 0) status = '👥 ECHO UP';
    else if (curAI.ability === 'gust' && gustActive > 0) status = '🌬️ GUST';
    else if (curAI.ability === 'rage' && rageActive > 0) status = '👹 RAGE';
    else if (curAI.ability === 'storm' && stormActive > 0) status = '⚡ STORM';
    else if (curAI.ability === 'tide' && tideActive > 0) status = '🌊 TIDE';
    else if (warpActive > 0) status = '⏳ SLOW-MO';
    else if (frostT > 0) status = '🧊 CHILLED ' + frostT.toFixed(1) + 's';
    else if (frozenLeft > 0) status = '❄️ CPU FROZEN ' + frozenLeft.toFixed(1) + 's';
    else if (empLockT > 0) status = '📡 EMP LOCK';
    else if (glitchActiveT > 0) status = '🖥️ GLITCHED';
    else if (tremorT > 0) status = '🗿 TREMOR';
    if (charmed) status += (status ? ' · ' : '') + '🍀 CHARMED';
    if (batteryReady) status += (status ? ' · ' : '') + '🔋 CHARGED';
    if (has('ghost_ball') && ghostCharges > 0) status += (status ? ' · ' : '') + '👻 ' + ghostCharges + ' passes';
    if (has('shield') && shieldsLeft > 0) status += (status ? ' · ' : '') + '🛡️ ' + shieldsLeft;
    if (has('phoenix') && !phoenixUsed) status += (status ? ' · ' : '') + '🔥 phoenix';
  }
  if (cpuFury > 0) status += (status ? ' · ' : '') + '<span class="fury">😡 CPU FURY ×' + cpuFury + '</span>';
  aiStatusEl.innerHTML = status;   // innerHTML: status only holds static text/numbers + the .fury span
  updateAbilityBar();

  // Rally counter + velocity pressure meter (Risk of Rain 2-style difficulty transparency).
  const rallyEl = $('rallyChip');
  if (state === 'play') {
    if (rally >= 4) {
      rallyEl.style.display = 'block';
      rallyEl.textContent = '⚔️ RALLY ×' + rally + (rally >= 12 ? ' — ON FIRE!' : rally >= 8 ? ' — HEATING UP' : '');
    } else rallyEl.style.display = 'none';
    const b0 = balls[0];
    if (b0) {
      const sp = Math.hypot(b0.vx, b0.vy, b0.vz) || 0;
      $('speedWrap').style.display = 'block';
      $('speedFill').style.width = Math.min(100, Math.round(sp / BALL_HARD_MAX * 100)) + '%';
    } else $('speedWrap').style.display = 'none';
  } else {
    rallyEl.style.display = 'none';
    $('speedWrap').style.display = 'none';
  }

  // Spin meter: live readout of the strongest-spinning ball in play.
  if (state === 'play' && balls.length) {
    let mx = 0, my = 0;
    for (const b of balls) { mx = Math.max(mx, Math.abs(b.spinX || 0)); my = Math.max(my, Math.abs(b.spinY || 0)); }
    const total = mx + my;
    if (total > SPIN_VIS_THRESH) {
      spinMeterEl.style.display = 'block';
      const dirs = (mx > SPIN_VIS_THRESH ? (mx >= my ? '↔' : '') : '') + (my > SPIN_VIS_THRESH ? (my > mx ? '↕' : '') : '');
      const pct = Math.min(100, Math.round((total / (MAX_SPIN * 2)) * 100));
      spinMeterEl.textContent = '🌀 SPIN ' + dirs + ' ' + pct + '%';
    } else spinMeterEl.style.display = 'none';
  } else spinMeterEl.style.display = 'none';
}

/* ============================== Hazard visuals ==============================
   Every arena condition now gets a full, loud visual apparatus built per round:
   flowing wind streaks + floor compass arrows, a roaring black hole with spiral arms,
   solid boost beams with rising chevrons, slick ice sheets, live spring walls,
   ghost portals that telegraph spawns, tumbling blockade blocks with warning hatches,
   and glowing machinery (fan cones, steam columns, gear teeth). Palette-driven,
   rebuilt every round, animated in updateHazardVisuals(). */

/* (moved: hazard runtime state) */

function hazardClean() { if (hazardGroup) { scene.remove(hazardGroup); disposeGroup(hazardGroup); } hazardGroup = null; hz = null; }

/* (moved: function hzMat) */


/* (moved: function hzGlow) */

// A chunky sketch arrow (compass / lane direction markers).

/* (moved: function hzArrow) */

function buildHazardVisuals() {
  if (!scene) return;
  hazardClean();
  if (!curCond || state === 'menu') return;
  hazardGroup = new THREE.Group(); hazardGroup.name = 'hazards';
  const P = PALETTE[theme];
  const midC = P.mid, softC = P.soft, accC = P.accent, inkC = P.ink;
  const pC = hexOf(P.player), cC = hexOf(P.cpu);
  hz = {};

/* (moved: dead local add helper) */


  // Each condition builds its own visuals via its registered build() hook.
  const hzB = COND_HOOKS[curCond];
  if (hzB && hzB.build) hzB.build();
  scene.add(hazardGroup);
}
function updateHazardVisuals(dt) {
  if (!hazardGroup || !hz || state !== 'play') return;
  const P = PALETTE[theme];
  const b = balls[0];
  const pace = b ? clamp((b.speed - BALL_START) / 420, 0, 1) : 0;
  const hzV = COND_HOOKS[curCond];
  if (hzV && hzV.vtick) hzV.vtick(dt, pace);
}
/* ============================== Render sync (3D) ============================== */
const _tmpV = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();

function worldToScreen(x, y, z) {
  _tmpV.set(x, y, z).project(camera);
  return { x: (_tmpV.x * 0.5 + 0.5) * window.innerWidth, y: (-_tmpV.y * 0.5 + 0.5) * window.innerHeight, z: _tmpV.z };
}

function renderSync(dt) {
  dt = dt || 0.016;
  // Camera: damped follow of the ball + player paddle, looking down the court.
  // The camera is smoothed with frame-rate-independent damping so the pan never
  // snaps or jitters, and it swells with the rally for a sense of pace.
  const bx = balls.length ? balls[0].x : CW / 2;
  const by = balls.length ? balls[0].y : CH / 2;
  const bz = balls.length ? balls[0].z : 0;
  const follow = state === 'play' ? 1 : 0.3;
  // Fun visual modes roll the whole camera (upside-down court / barrel roll).
  if (funMode === 'upside') camera.up.set(0, -1, 0);
  else if (funMode === 'barrel') { const rr = tNow * 1.35; camera.up.set(Math.sin(rr), Math.cos(rr), 0); }
  else camera.up.set(0, 1, 0);
  const dCamX = CW / 2 + (bx - CW / 2) * 0.22 * follow;
  const dCamY = CH * 0.5 + (by - CH * 0.5) * 0.18 * follow + (state === 'play' ? (paddleR.y - CH / 2) * 0.06 : 0);
  const dCamZ = playerPlane + 320;
  const dLookX = CW / 2 + (bx - CW / 2) * 0.12;
  const dLookY = CH * 0.48 + (by - CH * 0.48) * 0.08;
  const dLookZ = bz * 0.35;
  const k = 1 - Math.exp(-dt * 5.2);
  if (camPos) {
    camPos.x += (dCamX - camPos.x) * k;
    camPos.y += (dCamY - camPos.y) * k;
    camPos.z += (dCamZ - camPos.z) * k;
    camLook.x += (dLookX - camLook.x) * k;
    camLook.y += (dLookY - camLook.y) * k;
    camLook.z += (dLookZ - camLook.z) * k;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  } else {
    camera.position.set(dCamX, dCamY, dCamZ);
    _tmpV2.set(dLookX, dLookY, dLookZ); camera.lookAt(_tmpV2);
  }
  // FOV swells with ball speed for a subtle sense of pace.
  const spd = balls.length ? balls[0].speed : BALL_START;
  const targetFov = 64 + clamp((spd - BALL_START) / 90, 0, 6);
  if (Math.abs(camera.fov - targetFov) > 0.02) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 3));
    camera.updateProjectionMatrix();
  }
  if (shake > 0) { camera.position.x += (Math.random() * 2 - 1) * shake * 0.8; camera.position.y += (Math.random() * 2 - 1) * shake * 0.8; }

  // Paddles
  const cpuH = state === 'play' ? cpuPaddleH() : PADDLE_H;
  const cpuW = state === 'play' ? cpuPaddleW() : PADDLE_W;
  meshes.paddleL.position.set(paddleL.x, paddleL.y, cpuPlane);
  meshes.paddleL.scale.set(cpuW / PADDLE_W, cpuH / PADDLE_H, 1);
  // CPU paddle is always solid and high-contrast so it reads instantly.
  meshes.paddleL.material.color.set(COLORS.cpu);
  meshes.paddleL.material.transparent = (curAI && curAI.ability === 'phantom' && phaseActive);
  meshes.paddleL.material.opacity = (curAI && curAI.ability === 'phantom' && phaseActive) ? 0.35 : 1;
  meshes.glowL.position.set(paddleL.x, paddleL.y, cpuPlane);
  meshes.glowL.material.color.set(curAI && state === 'play' ? ((theme === 'vibrant' || theme === 'sunset') ? curAI.color : inkify(curAI.color)) : COLORS.cpu);
  meshes.glowL.scale.set(1 + (surgeActive > 0 ? 0.5 : 0) + (chargeActive > 0 ? 0.4 : 0), 1 + (surgeActive > 0 ? 0.5 : 0) + (chargeActive > 0 ? 0.4 : 0), 1);

  const ph = playerPaddleH();
  meshes.paddleR.position.set(paddleR.x, paddleR.y, playerPlane);
  meshes.paddleR.scale.set(1, ph / PADDLE_H, 1);
  meshes.paddleR.material.color.set(hexActive > 0 ? PALETTE_ACTIVE.dark : COLORS.player);
  meshes.paddleROutline.position.copy(meshes.paddleR.position);
  meshes.paddleROutline.scale.copy(meshes.paddleR.scale);
  meshes.glowR.position.set(paddleR.x, paddleR.y, playerPlane);
  meshes.glowR.material.color.set(hexActive > 0 ? PALETTE_ACTIVE.dark : COLORS.player);

  meshes.paddleR2.visible = has('second_paddle') && state === 'play';
  if (meshes.paddleR2.visible) {
    meshes.paddleR2.position.set(paddleR2.x, paddleR2.y, playerPlane - 16);
    meshes.paddleR2.scale.set(1, defenderH() / PADDLE_H, 1);
  }
  // The Echo's afterimage
  meshes.echo.visible = curAI && curAI.ability === 'echo' && echoActive > 0 && state === 'play';
  if (meshes.echo.visible) meshes.echo.position.set(echoX, echoY, cpuPlane);
  // The Bastion's energy wall
  meshes.bastionWall.visible = curAI && curAI.ability === 'bastion' && bastionActive > 0 && state === 'play';
  if (meshes.bastionWall.visible) meshes.bastionWall.position.set(CW / 2, CH / 2, cpuPlane - 20);

  // Ball(s)
  const b0 = balls.length ? balls[0] : null;
  if (b0) {
    meshes.ball.visible = true;
    meshes.ball.position.set(b0.x, b0.y, b0.z);
    meshes.ball.rotation.x = tNow * (b0.spinY * 3 + 1.5);
    meshes.ball.rotation.y = tNow * (b0.spinX * 3 + 1.5);
    meshes.ball.scale.setScalar(1.5 * (b0.mini ? 0.65 : 1));
    meshes.ballGlow.position.set(b0.x, b0.y, b0.z);
    meshes.ballGlow.material.opacity = 0.5;
    // Ground shadow + drop-line: scale/fade with height so depth reads instantly.
    meshes.ballShadow.visible = true;
    const hf = clamp(b0.y / CH, 0, 1);
    meshes.ballShadow.position.set(b0.x, 0.9, b0.z);
    meshes.ballShadow.scale.setScalar(1 + hf * 0.9);
    meshes.ballShadow.material.opacity = 0.34 - hf * 0.16;
    const dp = meshes.ballDrop.geometry.attributes.position;
    dp.setXYZ(0, b0.x, b0.y, b0.z);
    dp.setXYZ(1, b0.x, 0.9, b0.z);
    dp.needsUpdate = true;
    meshes.ballDrop.visible = b0.y > 1.4;
  } else {
    meshes.ball.visible = false;
    meshes.ballGlow.position.set(-9999, 0, 0);
    meshes.ballShadow.visible = false;
    meshes.ballDrop.visible = false;
  }
  // Secondary balls (twin serves, split minis, holo clones) via the pooled spheres.
  for (let i = 0; i < extraBallMeshes.length; i++) {
    const em = extraBallMeshes[i];
    const es = extraShadowMeshes[i];
    const bb = balls[i + 1];
    if (bb) {
      em.visible = true;
      em.position.set(bb.x, bb.y, bb.z);
      em.scale.setScalar(bb.mini ? 0.65 : 1);
      em.material.opacity = bb.clone ? 0.32 + Math.sin(tNow * 18) * 0.16 : (bb.mini ? 0.9 : 1);
      em.material.color.set(bb.clone ? 0x8ef0ff : (bb.mini ? 0x7dffa8 : 0xffffff));
      // Every ball casts its own ground shadow (scale/fade with height; clones stay faint).
      es.visible = true;
      const hf2 = clamp(bb.y / CH, 0, 1);
      es.position.set(bb.x, 0.9, bb.z);
      es.scale.setScalar((bb.mini ? 0.65 : 1) * (1 + hf2 * 0.9));
      es.material.opacity = Math.max(0, (bb.clone ? 0.13 : 0.34) - hf2 * 0.16);
    } else { em.visible = false; es.visible = false; }
  }
  // Center divider breathes with the rally (flat floor mark — never a wall).
  if (meshes.centerLine) {
    const pace = clamp(((b0 ? b0.speed : BALL_START) - BALL_START) / 300, 0, 1);
    const pulse = 0.42 + 0.1 * Math.sin(tNow * 1.5) + pace * 0.22 + (rally >= 8 ? 0.08 : 0);
    meshes.centerLine.material.opacity = pulse;
  }
  // Spin trail ribbons (fading cubes behind spinning balls, tinted by spin axis)
  for (let i = 0; i < trailMeshes.length; i++) {
    const tm = trailMeshes[i];
    if (b0 && b0.trail && i < b0.trail.length) {
      const t = b0.trail[i];
      tm.visible = true;
      tm.position.set(t.x, t.y, t.z);
      tm.material.opacity = (i / b0.trail.length) * 0.34;
      tm.scale.setScalar(0.55 + (i / b0.trail.length) * 1.2);
      // Trail tint: vibrant = hue follows spin; ink = ink-weight (light/mid/faint).
      const sx = Math.abs(b0.spinX || 0), sy = Math.abs(b0.spinY || 0);
      if (theme === 'vibrant') {
        const hue = ((tNow * 0.12 + (sx - sy) * 0.35) % 1 + 1) % 1;
        tm.material.color.setHSL(hue, 0.85, 0.6);
      } else {
        if (sy > SPIN_VIS_THRESH && sy >= sx) tm.material.color.set(PALETTE_ACTIVE.trailV);
        else if (sx > SPIN_VIS_THRESH) tm.material.color.set(PALETTE_ACTIVE.trailH);
        else tm.material.color.set(PALETTE_ACTIVE.trailF);
      }
    } else tm.visible = false;
  }

  // Reactive pulse: vibrant drifts hue; sunset sweeps from cool cyan (your side) to
  // ember orange (their side), following the ball like a living horizon.
  if ((theme === 'vibrant' || theme === 'sunset') && gridMesh && b0) {
    const pace = clamp((b0.speed - BALL_START) / 420, 0, 1);
    if (theme === 'vibrant') {
      gridHue = (gridHue + dt * 0.018) % 1;
      if (gridMesh.material.vertexColors === false) gridMesh.material.color.setHSL(gridHue, 0.62, 0.4);
      meshes.ballGlow.material.color.setHSL((gridHue + 0.12) % 1, 0.9, 0.5 + pace * 0.2);
      meshes.ballGlow.material.opacity = 0.42 + pace * 0.4;
    } else {
      const tt = clamp((b0.z - playerPlane) / (cpuPlane - playerPlane), 0, 1);
      const hue = 0.52 - 0.44 * tt;   // cyan (0.52) -> ember orange (0.08)
      if (gridMesh.material.vertexColors === false) gridMesh.material.color.setHSL(hue, 0.8, 0.42);
      meshes.ballGlow.material.color.setHSL(0.07, 0.95, 0.55 + pace * 0.25);
      meshes.ballGlow.material.opacity = 0.5 + pace * 0.4;
    }
  }

  // Neon city data streams scroll downward behind the far goal (vibrant stage).
  if (theme === 'vibrant' && dataStreams.length) {
    for (const s of dataStreams) {
      s.mesh.position.y -= s.speed * dt;
      if (s.mesh.position.y < -CH * 0.25) s.mesh.position.y = CH * 0.85;
    }
  }

  // VOID goal regions: breathe the flat pits + animated ink shimmer (e-ink style).
  if (meshes.voidPitP) {
    const op = 0.10 + Math.sin(tNow * 2.2) * 0.05;
    meshes.voidPitP.material.opacity = op;
    meshes.voidPitC.material.opacity = op;
    meshes.voidGlowP.material.opacity = 0.3 + Math.sin(tNow * 2.2) * 0.12;
    meshes.voidGlowC.material.opacity = 0.3 + Math.sin(tNow * 2.2) * 0.12;
    // Dashes blink subtly to mark the point of no return.
    const db = 0.75 + Math.sin(tNow * 3.1) * 0.25;
    for (const d of meshes.voidDashesP) d.material.opacity = db;
    for (const d of meshes.voidDashesC) d.material.opacity = db;
    // Frames breathe (no interior shade panel — that read as a gray sheet).
    if (meshes.voidFrameP) {
      const fw = 0.9 + Math.sin(tNow * 2.2) * 0.1;
      meshes.voidFrameP.position.z = CL / 2 + 66 + Math.sin(tNow * 2.2) * 2;
      meshes.voidFrameC.position.z = -CL / 2 - 66 - Math.sin(tNow * 2.2) * 2;
      for (let i = 0; i < 4; i++) { meshes.voidFrameP.children[i].material.opacity = fw; meshes.voidFrameC.children[i].material.opacity = fw; }
      // Chevrons slide toward the void mouth, like sketch arrows being drawn in.
      const slide = (tNow * 26) % 20;
      for (let i = 0; i < meshes.voidChevP.length; i++) {
        const base = CL / 2 - 16 - (i % 2) * 20;
        const op = 0.5 + 0.4 * Math.sin(tNow * 6 + i);
        meshes.voidChevP[i].position.z = base + slide;
        meshes.voidChevC[i].position.z = -base - slide;
        for (const s of meshes.voidChevP[i].children) s.material.opacity = op;
        for (const s of meshes.voidChevC[i].children) s.material.opacity = op;
      }
    }
  }

  // Hazard meshes
  meshes.blackhole.visible = curCond === 'blackhole' && state === 'play';
  if (meshes.blackhole.visible) {
    meshes.blackhole.position.set(CW / 2, CH / 2, 0);
    const s = 1 + Math.sin(tNow * 3) * 0.1;
    meshes.blackhole.scale.set(s, s, s);
    meshes.blackhole.rotation.x = 0.22;               // tilt the accretion plane slightly
    meshes.blackhole.rotation.y = tNow * 0.6;         // slow vortex precession
    meshes.blackholeRim.scale.setScalar(1 + Math.sin(tNow * 4) * 0.08);
    meshes.blackholeRim.material.opacity = 0.55 + 0.3 * Math.sin(tNow * 4);
    meshes.blackholeDisk.rotation.z = tNow * 2.1;     // sparks orbit the event horizon
    meshes.blackholeHalo.material.opacity = 0.2 + 0.07 * Math.sin(tNow * 2);
  }
  meshes.boostA.visible = meshes.boostB.visible = curCond === 'boosts' && state === 'play';
  if (meshes.boostA.visible) {
    meshes.boostA.position.set(CW / 2, CH * 0.12, 0);
    meshes.boostB.position.set(CW / 2, CH * 0.88, 0);
    // Pulse faintly so the lane reads as an active field, never a hitbox.
    const o = 0.22 + 0.12 * Math.sin(tNow * 5);
    meshes.boostA.material.opacity = o; meshes.boostB.material.opacity = o;
  }
  updateStage();
  updateHazardVisuals(dt || 0.016);
  wallFlashT = Math.max(0, wallFlashT - (dt || 0.016));
  hazardFlash = Math.max(0, hazardFlash - (dt || 0.016));
  // Blockade obstacle meshes
  for (let i = 0; i < obstacles.length; i++) {
    if (!meshes.obstacleMeshes[i]) {
      meshes.obstacleMeshes[i] = new THREE.Mesh(new THREE.BoxGeometry(obstacles[i].w, obstacles[i].h, obstacles[i].d), new THREE.MeshBasicMaterial({ color: 0x6b6659, transparent: true, opacity: 0.85 }));
      scene.add(meshes.obstacleMeshes[i]);
    }
    const o = obstacles[i];
    meshes.obstacleMeshes[i].visible = true;
    meshes.obstacleMeshes[i].position.set(o.x, o.y, o.z);
    meshes.obstacleMeshes[i].rotation.z = o.rot || 0;
  }
  for (let i = obstacles.length; i < meshes.obstacleMeshes.length; i++) meshes.obstacleMeshes[i].visible = false;

  // Machinery hazard meshes: fans, boosters, spinners
  const machVis = curCond === 'machinery' && state === 'play';
  for (let i = 0; i < meshes.machFans.length; i++) {
    const fan = meshes.machFans[i];
    if (machVis && i < machFans.length) {
      const f = machFans[i];
      fan.visible = true;
      fan.position.set(f.x, f.y, f.z);
      fan.rotation.z = (f.angle || 0);
      fan.rotation.x = Math.PI / 2;
      const pulse = 1 + Math.sin(tNow * 5 + i) * 0.15;
      fan.scale.setScalar(pulse);
    } else fan.visible = false;
  }
  for (let i = 0; i < meshes.machBoosters.length; i++) {
    const b = meshes.machBoosters[i];
    if (machVis && i < machBoosters.length) {
      const bs = machBoosters[i];
      b.visible = true;
      b.position.set(bs.x, 0.5, bs.z);
      b.material.opacity = 0.3 + Math.sin(tNow * 4 + i) * 0.15;
    } else b.visible = false;
  }
  for (let i = 0; i < meshes.machSpinners.length; i++) {
    const g = meshes.machSpinners[i];
    if (machVis && i < machSpinners.length) {
      const sp = machSpinners[i];
      g.visible = true;
      g.position.set(sp.x, 0.5, sp.z);
      g.rotation.y = (sp.angle || 0);
      g.material.opacity = 0.2 + Math.sin(tNow * 2 + i) * 0.1;
    } else g.visible = false;
  }

  // Particles (THREE.Points)
  if (!meshes.particles) {
    const geo = new THREE.BufferGeometry();
    const maxP = 200;
    meshes.partPos = new Float32Array(maxP * 3);
    meshes.partCol = new Float32Array(maxP * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(meshes.partPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(meshes.partCol, 3));
    const mat = new THREE.PointsMaterial({ size: 5, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true });
    meshes.particles = new THREE.Points(geo, mat);
    meshes.particles.frustumCulled = false;
    scene.add(meshes.particles);
  }
  const n = Math.min(particles.length, 200);
  const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    meshes.partPos[i * 3] = p.x; meshes.partPos[i * 3 + 1] = p.y; meshes.partPos[i * 3 + 2] = p.z;
    const a = clamp(p.life / p.max, 0, 1);
    const [r, g, bl] = hex(p.color);
    meshes.partCol[i * 3] = r * a; meshes.partCol[i * 3 + 1] = g * a; meshes.partCol[i * 3 + 2] = bl * a;
  }
  meshes.particles.geometry.attributes.position.needsUpdate = true;
  meshes.particles.geometry.attributes.color.needsUpdate = true;
  meshes.particles.geometry.setDrawRange(0, n);

  // Center message (DOM)
  if (msgT > 0 && (state === 'play' || state === 'over' || state === 'draft')) {
    const alpha = msgT > 1.1 ? (1.3 - msgT) / 0.2 : Math.min(1, msgT / 0.45);
    msgBox.style.opacity = clamp(alpha, 0, 1);
    msgBox.textContent = msg;
  } else msgBox.style.opacity = 0;
  flashEl.style.opacity = flashVig > 0 ? Math.min(0.85, flashVig * 3) : 0;

  // Floating proc indicators (DOM, projected from court coords)
  procsEl.innerHTML = '';
  for (const pr of procs) {
    const sp = worldToScreen(pr.x, pr.y, state === 'play' ? 0 : 0);
    if (sp.z > 1 || sp.z < -1) continue;
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${sp.x}px;top:${sp.y}px;transform:translate(-50%,-100%);font-family:'Silkscreen',monospace;font-size:8px;letter-spacing:0;color:${pr.color};text-shadow:1px 1px 0 #f2efe6;opacity:${clamp(pr.t / pr.max, 0, 0.92)};pointer-events:none;white-space:nowrap;`;
    el.textContent = pr.text;
    procsEl.appendChild(el);
  }

  // Cartoon hit-pops (Pizza-Tower style): chunky impact words that punch in and float up.
  bonksEl.innerHTML = '';
  for (const bk of bonks) {
    const sp = worldToScreen(bk.x, bk.y, bk.z);
    if (sp.z > 1 || sp.z < -1) continue;
    const p = clamp(bk.t / bk.max, 0, 1);
    const punch = 1 + (1 - Math.min(1, (bk.max - bk.t) / 0.12)) * 0.85;
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${sp.x}px;top:${sp.y}px;transform:translate(-50%,-100%) rotate(${bk.rot}rad) scale(${punch * bk.s});font-family:'Silkscreen',monospace;font-weight:bold;font-size:${Math.round(15 * bk.s)}px;letter-spacing:0;color:${bk.color};-webkit-text-stroke:1.5px #191612;text-shadow:2px 2px 0 rgba(0,0,0,.45);opacity:${p};pointer-events:none;white-space:nowrap;`;
    el.textContent = bk.text;
    bonksEl.appendChild(el);
  }
}

/* ============================== Manual abilities ============================== */
// Cooldown for an active ability (stacks shave it down, never below a floor).
function abilityCd(id) { return Math.max(2, (ABILITIES[id].cd || 8) * Math.pow(0.85, Math.max(0, stacks(id) - 1))); }
function triggerSlot(n) {
  // Keys 1-4 fire every owned active bound to that slot (fire all so a future
  // slot collision can never silently orphan an ability).
  for (const id of ACTIVE_ABILITIES) {
    if (has(id) && ABILITIES[id].slot === String(n)) triggerAbility(id);
  }
}
function triggerAbility(id) {
  if (state !== 'play' || !has(id)) return;
  const ms = manualState[id];
  if (!ms || !ms.ready) { if (ms) msgFlash(ABILITIES[id].name.toUpperCase() + ' CHARGING…'); return; }
  // Effects live with each ability in game/content/abilities/<id>.js.
  const fx = ACTIVE_EFFECTS[id];
  if (!fx) return;
  fx();
  ms.cd = abilityCd(id);
  ms.ready = false;
}
// HUD hotbar: each owned active shows its bind (slot 1-4 or legacy letter) + cooldown fill.
function updateAbilityBar() {
  const el = $('abilityBar');
  if (!el) return;
  const owned = ACTIVE_ABILITIES.filter(id => has(id));
  if (state !== 'play' || !owned.length) { el.innerHTML = ''; return; }
  el.innerHTML = owned.map(id => {
    const a = ABILITIES[id], ms = manualState[id];
    const frac = ms.ready ? 0 : clamp(ms.cd / abilityCd(id), 0, 1);
    const bind = a.slot ? a.slot : a.key.toUpperCase();
    return `<span class="abil-chip${ms.ready ? ' ready' : ''}" title="${a.name} — ${a.desc}"><span class="kbd">${bind}</span>${a.icon}<span class="cd-fill" style="width:${Math.round((1 - frac) * 100)}%"></span>${ms.ready ? '' : `<span class="cd-txt">${ms.cd.toFixed(1)}</span>`}</span>`;
  }).join('');
}

/* ============================== Input ============================== */
function ndcFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
}
window.addEventListener('mousemove', e => {
  const ndc = ndcFromEvent(e);
  // Project the cursor onto the player paddle plane (Z = playerPlane) for direct 3D aim.
  _tmpV.set(ndc.x, ndc.y, 0.5).unproject(camera);
  const dir = _tmpV.sub(camera.position).normalize();
  const t = (playerPlane - camera.position.z) / dir.z;
  if (t > 0) {
    mouseX = camera.position.x + dir.x * t;
    mouseY = camera.position.y + dir.y * t;
    if (state === 'play') mouseActive = true;
  }
});
window.addEventListener('touchmove', e => {
  if (e.touches.length) {
    const t = e.touches[0];
    const ndc = ndcFromEvent(t);
    _tmpV.set(ndc.x, ndc.y, 0.5).unproject(camera);
    const dir = _tmpV.sub(camera.position).normalize();
    const tt = (playerPlane - camera.position.z) / dir.z;
    if (tt > 0) {
      mouseX = camera.position.x + dir.x * tt;
      mouseY = camera.position.y + dir.y * tt;
      if (state === 'play') mouseActive = true;
    }
  }
}, { passive: false });
window.addEventListener('keydown', e => {
  const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(k)) e.preventDefault();
  const n = k === 'ArrowUp' ? 'up' : k === 'ArrowDown' ? 'down' : k === 'ArrowLeft' ? 'left' : k === 'ArrowRight' ? 'right' : k.toLowerCase();
  keys[n] = true;
  if (k === 'p' || k === 'P' || k === 'Escape') togglePause();
  if (k === 'm' || k === 'M') toggleMute();
  // Active abilities: number keys 1-4 fire SLOT-bound actives; legacy letter keys
  // (Q/E/R/T/F) still fire the old roster actives that carry a `key` instead of a slot.
  if (state === 'play') {
    const kl = k.toLowerCase();
    if (['1', '2', '3', '4'].includes(kl)) triggerSlot(parseInt(kl, 10));
    for (const id of ACTIVE_ABILITIES) { if (ABILITIES[id].key && ABILITIES[id].key === kl) triggerAbility(id); }
  }
});
window.addEventListener('keyup', e => {
  const k = e.key;
  const n = k === 'ArrowUp' ? 'up' : k === 'ArrowDown' ? 'down' : k === 'ArrowLeft' ? 'left' : k === 'ArrowRight' ? 'right' : k.toLowerCase();
  keys[n] = false;
});
window.addEventListener('blur', () => { if (state === 'play') togglePause(); });
window.addEventListener('resize', resizeThree);

$('btnNewRun').addEventListener('click', startRun);
$('btnNewRun2').addEventListener('click', startRun);
$('btnUpgrades').addEventListener('click', openMeta);
$('btnMetaBack').addEventListener('click', closeMeta);
$('btnVisuals').addEventListener('click', () => openVisuals('menu'));
$('btnPauseVisuals').addEventListener('click', () => openVisuals('pause'));
$('btnVisualsBack').addEventListener('click', closeVisuals);
$('btnServe').addEventListener('click', startMatch);
$('btnRetry').addEventListener('click', startMatch);
$('btnAbandon').addEventListener('click', showMenu);
$('btnMenu2').addEventListener('click', showMenu);
btnPause.addEventListener('click', togglePause);
btnMute.addEventListener('click', toggleMute);
$('btnResume').addEventListener('click', togglePause);
$('btnQuit').addEventListener('click', showMenu);

function togglePause() {
  if (state === 'play') { state = 'paused'; pauseEl.classList.remove('hidden'); }
  else if (state === 'paused') {
    // If the visuals overlay is open (opened from pause), ESC/P just closes it and stays paused.
    if (!visualsEl.classList.contains('hidden')) { closeVisuals(); return; }
    state = 'play'; pauseEl.classList.add('hidden'); last = performance.now();
  }
}
function toggleMute() {
  muted = !muted;
  storeSet('pongnewera_muted', muted ? '1' : '0');
  btnMute.textContent = muted ? '🔇' : '🔊';
}

/* ============================== Main loop ============================== */
muted = storeGet('pongnewera_muted') === '1';
btnMute.textContent = muted ? '🔇' : '🔊';
try {
  initThree();
} catch (err) {
  var fel = document.getElementById('loadFail');
  if (fel) {
    fel.innerHTML = '3D RENDERER FAILED TO START.<br><br>' + (webglSupported() ? (err && err.message ? String(err.message) : 'Unknown renderer error') : 'WebGL is not available or is disabled in this browser. Enable hardware acceleration / WebGL in your browser settings, then reload.') + '<br><br>Reload the page.';
    fel.classList.remove('hidden');
  }
  return;
}
// Pre-build the trail pool
for (let i = 0; i < 9; i++) {
  const tm = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial({ color: 0x8a8578, transparent: true, opacity: 0 }));
  tm.visible = false;
  scene.add(tm);
  trailMeshes.push(tm);
}
metaLoad();
theme = META.vTheme === 'vibrant' ? 'vibrant' : META.vTheme === 'sunset' ? 'sunset' : 'ink';
funMode = META.funMode || 'none';
displayMode = META.displayMode || 'borderless';
stage = 'court';
applyTheme();
applyDisplay();
updateBestLine();
updateMetaUI();
updateHearts();
if (document.fonts && document.fonts.load) {
  try { document.fonts.load('16px "Pixelify Sans"'); document.fonts.load('8px "Silkscreen"'); document.fonts.load('bold 8px "Silkscreen"'); } catch (e) { /* ignore */ }
}

function loop(t) {
  const dt = Math.min(Math.max((t - last) / 1000, 0), 1 / 30);
  last = t;
  tNow += dt;
  update(dt);
  renderSync(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* Debug / validation hooks (invisible to players). */
window.__pong = {
  get state() { return state; },
  get round() { return run.round; },
  get lives() { return run.lives; },
  get scores() { return scores; },
  get ballCount() { return balls.length; },
  get balls() { return balls; },
  get serveTimer() { return serveTimer; },
  get playerPaddleH() { return playerPaddleH(); },
  get cpuPaddleH() { return cpuPaddleH(); },
  get player() { return paddleR; },
  get cpu() { return paddleL; },
  get abilities() { return run.abilities.slice(); },
  get abilityCount() { return run.abilities.length; },
  get maxLives() { return maxLives(); },
  get cores() { return META.cores; },
  get meta() { return { cores: META.cores, upg: { ...META.upg }, seenPups: META.seenPups.length, seenAI: META.seenAI.length, seenSyn: META.seenSyn.length }; },
  get condition() { return curCond; },
  get obstacles() { return obstacles.length; },
  get synergies() { return activeSynergies().map(s => s.id); },
  get actives() { return ACTIVE_ABILITIES.filter(id => has(id)).map(id => ({ id, bind: bindOf(id), ready: manualState[id].ready, cd: Math.round(manualState[id].cd * 10) / 10 })); },
  get hasVoidMeshes() { return !!(meshes.voidPitP && meshes.voidPitC && meshes.voidDashesP && meshes.voidGlowP); },
  get stageLive() {
    if (!stageGroup) return null;
    const b = balls[0];
    return {
      stage, cheer: Math.round(stageCheer * 100) / 100, data: stageData ? Object.keys(stageData) : [], meshes: stageGroup.children.length,
      towers: stageData && stageData.towers ? Math.round(stageData.towers[0].mesh.rotation.z * 1000) / 1000 : null,
      starsRotY: stageData && stageData.stars ? Math.round(stageData.stars.rotation.y * 1000) / 1000 : null,
      sunX: stageData && stageData.sun ? Math.round(stageData.sun.mesh.position.x) : null,
      ballX: b ? Math.round(b.x) : null,
    };
  },
  get blackholeLive() {
    if (!meshes.blackhole) return null;
    const b = meshes.blackhole, r = meshes.blackholeRim, d = meshes.blackholeDisk, h = meshes.blackholeHalo;
    return { cond: curCond, visible: b.visible, pos: [Math.round(b.position.x), Math.round(b.position.y), Math.round(b.position.z)], rim: r ? { visible: r.visible, op: Math.round(r.material.opacity * 100) / 100 } : null, disk: d ? d.children.length : 0, halo: h ? h.visible : false, scale: [Math.round(b.scale.x * 100) / 100, Math.round(b.scale.y * 100) / 100] };
  },
  get voidFramesLive() { return !!(meshes.voidFrameP && meshes.voidFrameC && meshes.voidChevP && meshes.voidChevP.length > 0); },
  get ballTrackLive() { return !!(meshes.ballShadow && meshes.ballDrop); },
  get ballTrackPos() { return meshes.ballShadow ? { sx: Math.round(meshes.ballShadow.position.x), sz: Math.round(meshes.ballShadow.position.z), dropVisible: meshes.ballDrop.visible } : null; },
  get extraShadows() { return extraShadowMeshes.map(m => ({ visible: m.visible, x: Math.round(m.position.x), z: Math.round(m.position.z), op: Math.round(m.material.opacity * 100) / 100 })); },
  get centerMark() { return meshes.centerLine ? { op: Math.round(meshes.centerLine.material.opacity * 100) / 100, hasRing: !!meshes.centerRing, ticks: meshes.centerTicks ? meshes.centerTicks.length : 0 } : null; },
  get camSmoothed() { return !!(camPos && camLook && Math.abs(camPos.x - (balls.length ? balls[0].x : CW / 2) * 0.22 - CW / 2) < 400); },
  get spinMeterVisible() { const el = $('spinMeter'); return el ? el.style.display !== 'none' : false; },
  get ai() { return curAI ? curAI.name : null; },
  get shields() { return shieldsLeft; },
  get ghostCharges() { return ghostCharges; },
  get phased() { return phaseActive; },
  get frozen() { return frozenLeft; },
  get surgeActive() { return surgeActive; },
  get frostT() { return frostT; },
  get warpActive() { return warpActive; },
  get hexActive() { return hexActive; },
  get quakeActive() { return quakeActive; },
  get gustActive() { return gustActive; },
  get tideActive() { return tideActive; },
  get rageActive() { return rageActive; },
  get stormActive() { return stormActive; },
  get bastionActive() { return bastionActive; },
  get echoActive() { return echoActive; },
  get phoenixUsed() { return phoenixUsed; },
  get cpuShrink() { return cpuShrink; },
  get batteryReady() { return batteryReady; },
  get parryActive() { return parryActive; },
  get lureActive() { return lureActive; },
  get shellOpen() { return shellOpen; },
  get gambleFreeze() { return gambleFreeze; },
  get chargeActive() { return chargeActive; },
  get cpuFury() { return cpuFury; },
  get spinX() { return balls.length ? balls[0].spinX : 0; },
  get spinY() { return balls.length ? balls[0].spinY : 0; },
  get ballSpeed() { return balls.length ? Math.hypot(balls[0].vx, balls[0].vy, balls[0].vz) : 0; },
  get playerSlowT() { return playerSlowT; },
  get empLockT() { return empLockT; },
  get flashVig() { return flashVig; },
  get bonks() { return bonks.length; },
  get selBall() { return selBall; },
  get procs() { return procs.length; },
  get winScore() { return WIN_SCORE; },
  get cpuPlane() { return cpuPlane; },
  get playerPlane() { return playerPlane; },
  get mouseActive() { return mouseActive; },
  get mouseX() { return Math.round(mouseX); },
  get mouseY() { return Math.round(mouseY); },
  get paddleRX() { return Math.round(paddleR.x); },
  get paddleRY() { return Math.round(paddleR.y); },
  key(n, v) { keys[n] = v; },
  deploy(x, y, z, vx, vy, vz, speed) {
    const b = balls[0] || newBall(x, y, z);
    b.x = x; b.y = y; b.z = z; b.vx = vx; b.vy = vy; b.vz = vz;
    b.speed = speed || Math.hypot(vx, vy, vz);
    if (!balls.includes(b)) balls.push(b);
    serveTimer = 0;
    return b;
  },
  startRun, pick: pickDraft, serve: startMatch, retry: startMatch, quit: showMenu, point,
  openMeta, trigger: triggerAbility,
  forceCond(id) {
    curCond = id;
    const o = $('oppCond'); if (o && id) o.textContent = COND_BY_ID[id].icon + ' HAZARD — ' + COND_BY_ID[id].desc;
    const c = $('condChip'); if (c) c.textContent = id ? COND_BY_ID[id].icon + ' ' + COND_BY_ID[id].name : '';
    if (id === 'obstacles') obstacles = [
      { x: CW * 0.30, y: CH * 0.30, z: -CL * 0.15, w: 14, h: 92, d: 220, vy: 120, vx: 40 },
      { x: CW * 0.70, y: CH * 0.70, z: CL * 0.15, w: 14, h: 92, d: 220, vy: -120, vx: -40 },
    ]; else obstacles = [];
    if (id === 'machinery') {
      machFans = [
        { x: CW * 0.25, y: CH * 0.35, z: -CL * 0.2, r: 30, speed: 4, dir: 1 },
        { x: CW * 0.75, y: CH * 0.65, z: CL * 0.1, r: 30, speed: 3, dir: -1 },
      ];
      machBoosters = [ { x: CW * 0.15, y: 0, z: 0, w: 16, h: 10, d: 16, active: true } ];
      machSpinners = [ { x: CW * 0.50, y: 0, z: -CL * 0.25, w: 50, h: 4, d: 50, speed: 0.8, active: true } ];
    } else { machFans = []; machBoosters = []; machSpinners = []; }
  },
  addCores(n) { earnCores(n); },
  addAbility(id) {
    run.abilities.push(id);
    if (id === 'extra_life' || id === 'stat_life') run.lives = Math.min(maxLives(), run.lives + 1);
    updateHearts(); updatePupIcons();
  },
  win: winMatch,
  lose: loseMatch,
  skipToRound(n) { run.round = n; },
  tick(ms = 16.667) {
    const dt = Math.min(ms / 1000, 1 / 30);
    last = performance.now();
    tNow += dt;
    update(dt);
    renderSync();
    renderer.render(scene, camera);
  },
};

/* Optional deep-link: PongNewEra.html?autostart=1 begins a run immediately. */
try {
  if (new URLSearchParams(location.search).get('autostart')) startRun();
} catch (e) { /* ignore */ }
}
