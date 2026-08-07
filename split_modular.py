#!/usr/bin/env python3
"""Split the monolithic PongNewEra.html into modular game files."""
import re, os, sys

# The monolithic source was moved to a backup once the split first ran (the HTML
# now IS the modular shell). Re-run against the backup to regenerate cleanly.
SRC = 'PongNewEra.html.bak-modular'
text = open(SRC, encoding='utf-8').read()

def find(text, marker, start=0):
    i = text.find(marker, start)
    if i < 0:
        print('!! MARKER NOT FOUND:', marker[:80])
    return i

def brace_match(text, i, o='{', c='}'):
    depth = 0
    n = len(text)
    in_str = None
    esc = False
    while i < n:
        ch = text[i]
        if in_str:
            if esc: esc = False
            elif ch == '\\': esc = True
            elif in_str == '`' and ch == '$' and i + 1 < n and text[i+1] == '{':
                in_str = 'TPL'
            elif in_str == 'TPL':
                if ch == '}': in_str = '`'
            elif ch == in_str: in_str = None
            i += 1
            continue
        if ch in "'\"`":
            in_str = ch
            i += 1
            continue
        if ch == '/' and i + 1 < n and text[i+1] == '/':
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        if ch == '/' and i + 1 < n and text[i+1] == '*':
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if ch == o:
            depth += 1
        elif ch == c:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1

def span_between(text, start_marker, end_marker, start=0):
    s = find(text, start_marker, start)
    if s < 0: return (-1, -1)
    e = find(text, end_marker, s + len(start_marker))
    if e < 0: return (-1, -1)
    return (s, e)

def fn_span(text, fn_name, start=0):
    i = find(text, fn_name, start)
    if i < 0: return (-1, -1)
    ob = text.find('{', i)
    if ob < 0: return (-1, -1)
    cb = brace_match(text, ob)
    if cb < 0: return (-1, -1)
    return (i, cb)

def arr_span(text, start):
    """Find the closing ']' of the array literal that starts at start.
    Skips strings (with escapes) so quotes inside content can't derail depth. """
    depth = 0
    i = start
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return i
        elif ch in "'\"`":
            q = ch
            i += 1
            while i < n:
                c = text[i]
                if c == '\\':
                    i += 1
                elif c == q:
                    break
                i += 1
        i += 1
    return -1

game_start = find(text, 'function startGame() {')
# The deep-link block AND startGame's closing brace live after the 'Optional
# deep-link' comment — run to the game script's closing </script> instead.
ge = find(text, '</script>', find(text, '/* Optional deep-link:', game_start))
body = text[game_start:ge]
print('game body length:', len(body))

os.makedirs('game/content/abilities', exist_ok=True)
os.makedirs('game/content/stages', exist_ok=True)
os.makedirs('game/content/conditions', exist_ok=True)

header_parts = []

def cut(start_idx, end_idx, note):
    global body
    seg = body[start_idx:end_idx]
    body = body[:start_idx] + '\n/* (moved: ' + note + ') */\n' + body[end_idx:]
    return seg

def hoist_span(start_marker, end_marker, note):
    s, e = span_between(body, start_marker, end_marker)
    if s < 0:
        print('!! hoist not found:', note); sys.exit(1)
    seg = cut(s, e + len(end_marker), note)
    header_parts.append(seg)
    return seg

def hoist_line(marker, note):
    s = find(body, marker)
    if s < 0:
        print('!! hoist line not found:', note); sys.exit(1)
    seg = cut(s, s + len(marker), note)
    header_parts.append(seg)
    return seg

def remove_span(start_marker, end_marker, note):
    s, e = span_between(body, start_marker, end_marker)
    if s < 0:
        print('!! remove not found:', note); sys.exit(1)
    cut(s, e + len(end_marker), note)

# remove the old stage registry block (BOSS_STAGES..registerStage) — registry.js owns it now
s = find(body, 'const BOSS_STAGES = {')
e = fn_span(body, 'function registerStage(id, def, builder) {')[1]
cut(s, e + 1, 'stage registry (moved to game/registry.js)')

# ---------------- HEADER HOISTS ----------------
hoist_span('const WIN_SCORE = 5;', "let COLORS = { player: '#191612', cpu: '#191612', ball: '#191612' };", 'constants')
hoist_span('/* ============================== Visual themes & fun modes ============================== */',
           "const BONK_COLORS = ['#ff5d5d', '#ffd76a', '#8ef0ff', '#ff9ef5', '#7dffa8', '#ff9f43', '#7dd3fc', '#ffb84d', '#ffe066'];", 'themes & palettes')
hoist_span('let stageGroup = null, stageData = null, dataStreams = [];', 'let stageLastT = 0;', 'stage state')
s0 = find(body, 'function disposeGroup(g) {')
s1 = find(body, 'function buildStage() {')
header_parts.append(cut(s0, s1, 'stage helpers (dispose/clean/color)'))
s0 = find(body, 'function makeStageGlowMesh(color, scale) {')
s1 = find(body, 'function buildStageCity(P) {')
header_parts.append(cut(s0, s1, 'stage helpers (glow/decal/line/text)'))
hoist_span('const cpuPlane = -CL / 2 + EDGE;', 'const playerPlane = CL / 2 - EDGE;', 'paddle planes')
hoist_span("let state = 'menu';", "const stacks = id => run.abilities.filter(x => x === id).length;", 'game state')
hoist_span('const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));',
           "function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }", 'helpers')
hoist_span('function beep(f0, f1, dur, type, vol) {',
           "const sfxLose   = () => beep(300, 110, 0.55, 'sawtooth', 0.12);",
           'audio')
# Three.js scene refs + hazard runtime state: content files (abilities/stages/
# conditions) reference these at runtime, so they must live at top level.
hoist_line('let renderer, scene, camera;', 'three scene refs')
hoist_span('let hazardGroup = null;', 'let hz = null;', 'hazard runtime state')
s0 = find(body, 'const $ = id => document.getElementById(id);')
header_parts.append(cut(s0, s0 + len('const $ = id => document.getElementById(id);'), '$ helper'))
for fn in ['function inkify(c) {', 'function synergyActive(s) {', 'function playerPaddleH() {',
           'function msgFlash(m) {', 'function procFlash(text, x, y, color) {',
           'function spawnBurst(x, y, z, color, n) {', 'function bonkAt(x, y, z, speed) {',
           'function hzMat(color, opacity) {', 'function hzGlow(color, scale) {', 'function hzArrow(color, size) {']:
    s, e = fn_span(body, fn)
    if s < 0:
        print('!! fx not found:', fn); sys.exit(1)
    header_parts.append(cut(s, e + 1, fn.split('(')[0]))
# extra shared declarations content modules rely on
header_parts.append('\nlet smashArmed = false, smashArmedUntil = 0;   // Wild Smash (active, slot 1)\n')
header_parts.append('const hazAdd = m => { if (hazardGroup) hazardGroup.add(m); return m; };   // hazard-visual add helper\n')

header = '\n'.join(header_parts)

# ---------------- ABILITIES -> per-ability content files ----------------
s = find(body, 'const ABILITIES = {')
s_smash = find(body, "registerActive('smash', () => {")
ob = body.find('{', s_smash)
e_smash = brace_match(body, ob) + 1
# The arrow body's '}' is NOT the end of the call — consume the closing ')' and ';'.
j = e_smash
while j < len(body) and body[j] in ' \t\r\n': j += 1
if j < len(body) and body[j] == ')': j += 1
while j < len(body) and body[j] in ' \t\r\n': j += 1
if j < len(body) and body[j] == ';': j += 1
e_smash = j
abil_block = body[s:e_smash]
cut(s, e_smash, 'abilities data + registration APIs')

entry_re = re.compile(r'^  (\w+):\s+(\{.*\}),?$')
eff = {
  'emp':        "() => {\n    empLockT = Math.max(empLockT, 0.5);\n    procFlash('EMP!', paddleL.x, paddleL.y, '#38e1ff'); sfxGhost();\n    spawnBurst(paddleL.x, paddleL.y, cpuPlane, '#38e1ff', 14);\n  }",
  'glitch':     "() => {\n    glitchActiveT = 2.5;\n    procFlash('GLITCH!', paddleL.x, paddleL.y, '#c084fc'); sfxGhost();\n  }",
  'time_warp':  "() => {\n    warpActive = 2.2;\n    msgFlash('SLOW-MO!'); sfxShield();\n  }",
  'doom':       "() => {\n    let rev = null, bd = Infinity;\n    for (const b of balls) { if (b.vz < 0 && b.z < bd) { bd = b.z; rev = b; } }\n    // Fury lets a ball slip past the mirror: enough denied points and a goal finally lands.\n    if (rev && Math.random() >= Math.min(0.7, cpuFury * 0.14)) {\n      cpuFury++;\n      rev.vz = -rev.vz;\n      spawnBurst(rev.x, rev.y, rev.z, '#a3e635', 10);\n      procFlash('MIRROR!', rev.x, rev.y, '#a3e635'); sfxShield();\n    } else { msgFlash('MIRROR WEAK…'); sfxLose(); }\n  }",
  'ghost_ball': "() => {\n    ghostCharges = Math.min(4, ghostCharges + 2);\n    procFlash('PHASED ×' + ghostCharges + '!', paddleR.x, paddleR.y, '#c084fc'); sfxGhost();\n  }",
}
count = 0
for line in abil_block.split('\n'):
    m = entry_re.match(line)
    if not m:
        continue
    aid, obj = m.group(1), m.group(2)
    name_m = re.search(r"name: '([^']+)'", obj)
    name = name_m.group(1) if name_m else aid
    cat_m = re.search(r"cat: '([^']+)'", obj)
    cat = cat_m.group(1) if cat_m else 'passive'
    content = ('/* Ability: %s (%s) — game/content/abilities/%s.js\n'
               '   One file per ability = merge-safe: two people can add abilities in\n'
               '   parallel without touching the same file. The draft, codex, HUD,\n'
               '   cooldown bar and stacking all read the registry automatically. */\n'
               "registerAbility('%s', %s);\n" % (name, cat, aid, aid, obj))
    if aid in eff:
        content += ("\n// Trigger effect — runs when fired via its bind.\n"
                    "registerActive('%s', %s);\n" % (aid, eff[aid]))
    open('game/content/abilities/%s.js' % aid, 'w', encoding='utf-8').write(content)
    count += 1
print('ability files written:', count)

open('game/content/abilities/smash.js', 'w', encoding='utf-8').write(
    '/* Ability: Wild Smash (active) — game/content/abilities/smash.js\n'
    '   The test ability that proved the registerAbility/registerActive pipeline:\n'
    '   slot 1 -> press 1 to arm, next hit detonates. */\n'
    "registerAbility('smash', {\n"
    "  icon: '💥', name: 'Wild Smash', rarity: 'epic', cat: 'active', slot: '1', cd: 7,\n"
    "  desc: 'Press 1: arm a WILD SMASH — your next hit within 3s flies at +160 speed with wild spin.',\n"
    "});\n"
    "registerActive('smash', () => {\n"
    "  smashArmed = true; smashArmedUntil = performance.now() + 3000;\n"
    "  procFlash('WILD SMASH ARMED!', paddleR.x, paddleR.y - playerPaddleH() / 2 - 16, '#fb923c');\n"
    "  spawnBurst(paddleR.x, paddleR.y, playerPlane, '#fb923c', 16);\n"
    "  sfxShield();\n"
    "});\n")

# ---------------- COACHES / SYNERGIES / CONDITIONS / AIS ----------------
def array_to_pushes(name, body, note):
    s = find(body, 'const ' + name + ' = [')
    e = arr_span(body, body.find('[', s))
    block = body[s:e+1]
    cut(s, e + 1, note)
    inner = block[block.find('[')+1:block.rfind(']')]
    parts, cur, depth = [], '', 0
    for ch in inner:
        if ch in '{[': depth += 1
        elif ch in '}]': depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
    if cur.strip(): parts.append(cur)
    return block, parts

def obj_to_assign(name, body, note):
    s = find(body, 'const ' + name + ' = {')
    e = brace_match(body, body.find('{', s))
    block = body[s:e+1]
    cut(s, e + 1, note)
    return block

block, parts = array_to_pushes('COACHES', body, 'coaches')
open('game/content/coaches.js', 'w', encoding='utf-8').write(
    '/* Coaches (the upgrade-screen animals) — game/content/coaches.js\n'
    '   Add new coaches by appending to this array. Quip pools: philosophy, dad\n'
    '   jokes, haiku, Twitch lore and game-dev satire — randomized every visit. */\n'
    'COACHES.push(' + ',\n'.join(parts) + ');\n')
print('coach entries:', len(parts))

block, parts = array_to_pushes('SYNERGIES', body, 'synergies')
open('game/content/synergies.js', 'w', encoding='utf-8').write(
    '/* Synergies — game/content/synergies.js\n'
    '   Pairs of abilities that unlock a combo when both are owned. */\n'
    'SYNERGIES.push(' + ',\n'.join(parts) + ');\n')
print('synergy entries:', len(parts))

block, parts = array_to_pushes('CONDITIONS', body, 'conditions data')
# conditions now register themselves per-file in game/content/conditions/ — drop the raw data
# Also drop the local COND_BY_ID / rollCondition / lastCondId — registry.js owns those now,
# so startGame must not shadow them with stale local copies (silent-trap source of truth).
s = find(body, 'const COND_BY_ID = Object.fromEntries(CONDITIONS.map(c => [c.id, c]));')
cut(s, s + len('const COND_BY_ID = Object.fromEntries(CONDITIONS.map(c => [c.id, c]));'), 'cond_by_id (moved to registry)')
s = find(body, 'let lastCondId = null;')
e = fn_span(body, 'function rollCondition() {')[1]
cut(s, e + 1, 'rollCondition (moved to registry)')

aiblock = obj_to_assign('AIS', body, 'ai roster')
open('game/content/ai.js', 'w', encoding='utf-8').write(
    '/* AI champion roster — game/content/ai.js\n'
    '   Add new champions by appending to this object. Rotation pools live in\n'
    '   game/registry.js (NORMAL_POOL / BOSS_POOL). */\n'
    'Object.assign(AIS, ' + aiblock[aiblock.find('{'):aiblock.rfind('}') + 1] + ');\n')
for marker in ['const NORMAL_POOL = ', 'const BOSS_POOL = ', 'const PERSONA = ']:
    s = find(body, marker)
    e = find(body, '\n', s)
    cut(s, e, 'pool/persona (moved to registry)')

# ---------------- STAGE BUILDERS -> per-stage content files ----------------
# (Run AFTER the header hoists: the last shared stage helper ends at buildStageCity,
# so the builders must still be intact when that span is cut.)
stage_defs = {
 'city':    dict(name='SKYLINE CITY', theme='neon', rotation='normal', objects=['layered skyline', 'leaning towers', 'rooftop neon signs', 'ground glow strips', 'data streams', 'street-lane rally floor'], feature='a dense vertical canyon pressing in on both flanks'),
 'crowd':   dict(name='THE COLOSSEUM', theme='arena', rotation='normal', objects=['roaring crowd', 'ticker boards', 'spotlight sweeps'], feature='the crowd erupts and surges on every goal'),
 'dunes':   dict(name='EMPTY DUNES', theme='warm', rotation='normal', objects=['sand dunes', 'drifting haze', 'low sun'], feature='wide open desert — nowhere to hide'),
 'nebula':  dict(name='VOID NEBULA', theme='cosmic', rotation='normal', objects=['gas clouds', 'star field', 'drifting rocks'], feature='stars and nebula gas drift behind the court'),
 'haunt':   dict(name='THE HAUNTED HALLS', theme='gothic', rotation='boss', objects=['candles', 'portraits', 'cobwebs', 'ground fog'], feature='ghostly glow breathes along the walls'),
 'hive':    dict(name='THE WEB-CAVERN', theme='organic', rotation='boss', objects=['silk webs', 'cocoons', 'hanging pods'], feature='silk strands quiver with every rally'),
 'prism':   dict(name='HALL OF PRISMS', theme='prism', rotation='boss', objects=['prism shards', 'light beams', 'reflections'], feature='light splits across the floor with each bounce'),
 'peaks':   dict(name='THE MONOLITHS', theme='stone', rotation='boss', objects=['monolith pillars', 'mist', 'glowing runes'], feature='giant monoliths frame the court like cathedral pillars'),
 'fen':     dict(name='THE CURSED FEN', theme='bog', rotation='boss', objects=['twisted willows', 'fireflies', 'miasma'], feature='wispy lights drift up from the marsh'),
 'tempest': dict(name='THE ETERNAL STORM', theme='storm', rotation='boss', objects=['storm clouds', 'lightning', 'rain sheets'], feature='lightning backlights the rallies'),
 'abyss':   dict(name='THE SUNKEN ABYSS', theme='deep', rotation='boss', objects=['coral', 'bubbles', 'distant glow'], feature='pressure-bent light rays shimmer underwater'),
}
for sid in ['city', 'crowd', 'dunes', 'nebula', 'haunt', 'hive', 'prism', 'peaks', 'fen', 'tempest', 'abyss']:
    fname = 'buildStage' + sid[0].upper() + sid[1:]
    s, e = fn_span(body, 'function ' + fname + '(P) {')
    if s < 0:
        print('!! builder not found:', fname); sys.exit(1)
    fn_text = body[s:e+1]
    cut(s, e + 1, 'stage builder ' + fname)
    d = stage_defs[sid]
    def_obj = ', '.join('%s: %r' % (k, v) for k, v in d.items())
    content = (
        '/* Stage: %s — game/content/stages/%s.js\n'
        '   Pattern: theme (%s) + objects %s + unique feature: %s.\n'
        '   Registered via the shared API — rotation, names and build dispatch pick it up. */\n'
        'registerStage(%r, { %s }, %s);\n\n%s\n'
        % (d['name'], sid, d['theme'],
           '[' + ', '.join("'" + o + "'" for o in d['objects']) + ']',
           d['feature'], sid, def_obj, fname, fn_text)
    )
    open('game/content/stages/%s.js' % sid, 'w', encoding='utf-8').write(content)
print('stage files written')

# ---------------- DISPATCHER REPLACEMENTS ----------------
def replace_span(start_marker, end_marker, replacement, include_end=False):
    global body
    s, e = span_between(body, start_marker, end_marker)
    if s < 0:
        print('!! dispatch span missing:', start_marker[:60]); sys.exit(1)
    if include_end:
        e += len(end_marker)
    body = body[:s] + replacement + body[e:]

def replace_line(marker, replacement):
    global body
    s = find(body, marker)
    if s < 0:
        print('!! line missing:', marker[:60]); sys.exit(1)
    body = body[:s] + replacement + body[s + len(marker):]

replace_span(
    "  obstacles = curCond === 'obstacles' ? [",
    "  if (windEl) { windEl.textContent = curCond === 'wind' ? '🌬️ →' : ''; windEl.style.opacity = '0.55'; }",
    "  // Generic hazard reset: every match clears ALL hazard state, then the active\n"
    "  // condition's own setup hook seeds its objects (see game/content/conditions/).\n"
    "  obstacles = []; machFans = []; machBoosters = []; machSpinners = [];\n"
    "  ghostSpawnT = 3; ghostWarn = null; slickVX = 0; slickVY = 0;\n"
    "  wallFlashT = 0; hazardFlash = 0;\n"
    "  hazardScale = 1 + Math.min(1.0, (run.round - 1) * 0.14);\n"
    "  windDir = Math.random() * Math.PI * 2; windMag = 1; windGustT = 1.5 + Math.random() * 2; windFlash = 0;\n"
    "  const hzSt = COND_HOOKS[curCond];\n"
    "  if (hzSt && hzSt.setup) hzSt.setup();\n"
    "  const windEl = $('windChip');\n"
    "  if (windEl) { windEl.textContent = curCond === 'wind' ? '🌬️ →' : ''; windEl.style.opacity = '0.55'; }",
    True)

replace_line(
    "  if (curCond === 'bouncy') { b.spinX = (Math.random() < 0.5 ? 1 : -1) * 1.8; b.spinY = (Math.random() < 0.5 ? 1 : -1) * 1.8; }",
    "  const hzS = COND_HOOKS[curCond];\n  if (hzS && hzS.onServe) hzS.onServe(b);")

replace_span(
    "  // Bouncy Walls: the walls are LIVE — they spring the ball back with extra heat.\n  if (curCond === 'bouncy') {",
    "    wallFlashT = 0.35;\n  }",
    "  // Bouncy Walls: wall behavior lives in the 'bouncy' condition hook (game/content/conditions/).\n"
    "  const hzW = COND_HOOKS[curCond];\n"
    "  if (hzW && hzW.onWall) hzW.onWall(b);",
    True)

replace_span(
    "  if (curCond === 'slick') {",
    "  } else if (mouseActive) {",
    "  const hzP = COND_HOOKS[curCond];\n"
    "  if (hzP && hzP.player) {\n"
    "    if (hzP.player(dt, speedFactor, invert)) moving = true;\n",
    False)

replace_span(
    "    // --- Arena conditions ---",
    "    updateAbilityTimers(dt);",
    "    // --- Arena conditions (dispatched to the active condition's tick hook) ---\n"
    "    const hzC = COND_HOOKS[curCond];\n"
    "    if (hzC && hzC.tick) hzC.tick(dt);\n"
    "    // Drifting obstacle blocks (Blockades) — they tumble now, telegraphing their reach.\n"
    "    for (const o of obstacles) {\n"
    "      o.y += o.vy * dt; o.x += o.vx * dt;\n"
    "      o.rot = (o.rot || 0) + (o.rs || 0.6) * dt;\n"
    "      if (o.flash) o.flash = Math.max(0, o.flash - dt);\n"
    "      if (o.y < o.h / 2 + 8) { o.y = o.h / 2 + 8; o.vy = Math.abs(o.vy); }\n"
    "      if (o.y > CH - o.h / 2 - 8) { o.y = CH - o.h / 2 - 8; o.vy = -Math.abs(o.vy); }\n"
    "      o.x = clamp(o.x, CW * 0.15, CW * 0.85);\n"
    "    }\n",
    False)

replace_span(
    "  if (curCond === 'wind') {",
    "  scene.add(hazardGroup);",
    "  // Each condition builds its own visuals via its registered build() hook.\n"
    "  const hzB = COND_HOOKS[curCond];\n"
    "  if (hzB && hzB.build) hzB.build();\n",
    False)

replace_span(
    "  if (curCond === 'wind' && hz.streaks) {",
    "/* ============================== Render sync (3D) ============================== */",
    "  const hzV = COND_HOOKS[curCond];\n"
    "  if (hzV && hzV.vtick) hzV.vtick(dt, pace);\n}\n",
    False)

# The old per-condition visual builders used a local `add` helper; content hooks now use
# the global hazAdd (game/registry.js), so this local is dead — drop it.
s = find(body, '  const add = m => { hazardGroup.add(m); return m; };')
cut(s, s + len('  const add = m => { hazardGroup.add(m); return m; };'), 'dead local add helper')

s = find(body, "  // New-style actives dispatch through the registry — no if-chain needed.")
e3 = body.find("  ms.cd = abilityCd(id);", s)
e3 = body.find("  ms.cd = abilityCd(id);", e3 + 1)   # the chain-tail occurrence
if e3 < 0:
    print('!! triggerAbility chain end not found'); sys.exit(1)
e4 = body.find("ms.ready = false;", e3)   # consume the trailing cd/ready pair too
if e4 < 0:
    print('!! triggerAbility ready line not found'); sys.exit(1)
e4 = body.find("\n", e4)
new_ta = (
    "  // Effects live with each ability in game/content/abilities/<id>.js.\n"
    "  const fx = ACTIVE_EFFECTS[id];\n"
    "  if (!fx) return;\n"
    "  fx();\n"
    "  ms.cd = abilityCd(id);\n"
    "  ms.ready = false;"
)
body = body[:s] + new_ta + body[e4:]

# ---------------- WRITE core.js ----------------
header_comment = (
    '/* ============================================================================\n'
    '   Pong New Era — game/core.js (engine)\n'
    '   ----------------------------------------------------------------------------\n'
    '   The shared runtime + engine. Load AFTER game/registry.js and the content\n'
    '   files (game/content/**) so the registries are populated before the engine\n'
    '   reads them at runtime. Everything here is ENGINE — adding content should\n'
    '   NEVER require an edit to this file.\n'
    '   ============================================================================ */\n'
)
core = header_comment + header + '\n\n' + body
open('game/core.js', 'w', encoding='utf-8').write(core)
print('core.js written:', len(core))

# ---------------- WRITE NEW HTML ----------------
boot_start = find(text, '<script>\n(function () {\n  function showFail', 0)
three_end = text.find('</script>', text.find('<script>'))
boot_block = text[boot_start:]
head = text[:three_end + len('</script>')]
conds = sorted(os.listdir('game/content/conditions'))
abil_tags = sorted(os.listdir('game/content/abilities'))
stage_tags = sorted(os.listdir('game/content/stages'))
# The script list is globbed from disk, so a newly added ability / stage / hazard
# file is picked up automatically on the next run — no editing of the HTML by hand.
game_tags = '\n'.join([
    '<script src="game/registry.js"></script>',
    '<script src="game/content/coaches.js"></script>',
    '<script src="game/content/ai.js"></script>',
    '<script src="game/content/synergies.js"></script>',
] + ['<script src="game/content/abilities/%s"></script>' % f for f in abil_tags]
   + ['<script src="game/content/stages/%s"></script>' % f for f in stage_tags]
   + ['<script src="game/content/conditions/%s"></script>' % f for f in conds]
   + ['<script src="game/core.js"></script>'])
html_out = head + '\n\n<!-- ===== Modular game scripts (see game/README.md) ===== -->\n' + game_tags + '\n\n' + boot_block
open('PongNewEra.html', 'w', encoding='utf-8').write(html_out)
print('HTML written:', len(html_out))
print('DONE')
