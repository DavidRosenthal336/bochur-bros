/**
 * Checks a level for places a player can get into and cannot get out of.
 *
 * This exists because the same bug shipped twice — once in 1-2's climb and
 * once in 1-1's awnings — and both times it was found by a person playing the
 * level rather than by anything automatic. A trap is a geometry fact, so it
 * should be caught by reading the geometry.
 *
 * The model is deliberately conservative: it would rather flag a passable spot
 * than miss an impassable one.
 */

/** Tiles a standing jump reliably clears. Measured, not guessed — see PROGRESS.md. */
const MAX_JUMP = 4;
/** Tiles a bounce pad throws you. Conservative against the real launch. */
const BOUNCE_JUMP = 9;
/** Below this width there is no room for a run-up, so assume the standing jump. */
const RUNUP_WIDTH = 5;
const NO_RUNUP_JUMP = 3;

/**
 * Tiles of clear space a surface needs above it before anyone can *stand*
 * there.
 *
 * The shortest character in the game is Mendy Small at 22px, so one tile —
 * sixteen pixels — is a slot nobody fits in standing up. Two tiles fits
 * everyone except Berel in Cholent form, who is 33px.
 */
const MIN_HEADROOM = 2;

/** The widest pit a walking jump clears. Beyond this it is not a gap, it is a wall. */
const MAX_GAP = 3;

/**
 * Which tiles are water (§6, 2-3).
 *
 * Water changes what the rest of this file means. A pool is a pit you do not
 * have to jump, a pool floor is a surface you do not have to stand up on, and
 * a walled basin is somewhere you get out of by swimming rather than by
 * climbing. Every check below asks this first.
 */
function buildWater(def) {
  const { widthInTiles: W, heightInTiles: H } = def;
  const wet = Array.from({ length: H }, () => new Uint8Array(W));
  for (const r of def.water ?? []) {
    for (let y = r.y; y < r.y + r.h; y += 1) {
      for (let x = r.x; x < r.x + r.w; x += 1) {
        if (y >= 0 && y < H && x >= 0 && x < W) wet[y][x] = 1;
      }
    }
  }
  return wet;
}

function buildGrid(def, { includeBlocks = false } = {}) {
  const { widthInTiles: W, heightInTiles: H } = def;
  const grid = Array.from({ length: H }, () => new Uint8Array(W));
  const mark = (x, y) => {
    if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = 1;
  };

  for (const s of def.solids) {
    for (let y = s.y; y < s.y + s.h; y += 1) {
      for (let x = s.x; x < s.x + s.w; x += 1) mark(x, y);
    }
  }

  // Blocks are static bodies the player collides with, so for the purpose of
  // "is there room to stand here" they are terrain. They are left out of the
  // trap analysis on purpose: a brick can be broken, so treating a row of them
  // as a wall you cannot climb would fail levels that are perfectly passable.
  if (includeBlocks) for (const b of def.blocks ?? []) mark(b.x, b.y);

  /**
   * Rotting porch steps are floor (§6, World 3).
   *
   * They are floor when you arrive at one, which is what every check in this
   * file is asking about, and they come back a couple of seconds after they
   * give way — so a step is never the reason a level cannot be finished. Left
   * out of the grid they would read as holes in a porch, and a porch made of
   * them would fail as an unjumpable pit that is in fact a floor you run
   * across.
   */
  for (const step of def.steps ?? []) mark(step.x, step.y);

  return grid;
}

/**
 * Surfaces with too little room above them to stand on, that you cannot duck
 * into either.
 *
 * Distinct from a trap: a trap is somewhere you can walk into and not out of,
 * this is somewhere your body does not fit at all.
 *
 * A one-tile ceiling is not wrong by itself — the greybox gym has two of them
 * on purpose, because ducking through a low gap is a mechanic and crouched is
 * only thirteen pixels. What makes one wrong is arriving at it any way other
 * than crouched, and the geometry that decides this is whether the low stretch
 * connects sideways to a surface you can stand up on. A crouch tunnel does. A
 * block tucked one tile under an overhang does not: the only way onto it is
 * from below or above, at full height, and the physics answers that by shoving
 * you back and forth between the block and the ceiling.
 *
 * That block shipped in 1-2 as the peyos box.
 */
function findCrushPockets(def) {
  const W = def.widthInTiles;
  const H = def.heightInTiles;
  const grid = buildGrid(def, { includeBlocks: true });
  const wet = buildWater(def);
  const pockets = [];

  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (grid[y][x] || !grid[y + 1][x]) continue; // not a surface you could stand on
      // Under water nobody is standing up, so headroom is not the question.
      if (wet[y][x]) continue;
      // The standable cell is itself part of the clearance: `headroom` counts
      // the empty rows *above* it, and you stand in it.
      const clearance = 1 + headroom(grid, x, y);
      if (clearance >= MIN_HEADROOM) continue;
      pockets.push({ x, y, headroom: clearance });
    }
  }

  // Report one entry per contiguous run, so a long low shelf is one problem.
  const merged = [];
  for (const p of pockets) {
    const last = merged[merged.length - 1];
    if (last && last.y === p.y && last.to === p.x - 1 && last.headroom === p.headroom) last.to = p.x;
    else merged.push({ y: p.y, from: p.x, to: p.x, headroom: p.headroom });
  }

  /** Could you walk onto this cell upright, and duck as you go? */
  const enterableUpright = (x, y) =>
    x >= 0 && x < W && !grid[y][x] && grid[y + 1][x] === 1 && 1 + headroom(grid, x, y) >= MIN_HEADROOM;

  return merged.filter((m) => !enterableUpright(m.from - 1, m.y) && !enterableUpright(m.to + 1, m.y));
}

/** How many empty rows sit above this cell before something solid. */
function headroom(grid, x, y) {
  let n = 0;
  for (let r = y - 1; r >= 0 && !grid[r][x]; r -= 1) n += 1;
  return n;
}

/** How tall the wall is at column x, counting up from row y. Infinity past the map edge. */
function wallHeight(grid, x, y, W) {
  if (x < 0 || x >= W) return Infinity;
  if (!grid[y][x]) return 0;
  let n = 0;
  for (let r = y; r >= 0 && grid[r][x]; r -= 1) n += 1;
  return n;
}

/**
 * Every place you can stand, grouped into the horizontal runs you can walk
 * along without jumping.
 */
function floorRuns(grid, W, H) {
  const runs = [];
  for (let y = 0; y < H - 1; y += 1) {
    let start = -1;
    for (let x = 0; x <= W; x += 1) {
      const standable = x < W && !grid[y][x] && grid[y + 1][x] === 1;
      if (standable && start < 0) start = x;
      if (!standable && start >= 0) {
        runs.push({ y, x0: start, x1: x - 1 });
        start = -1;
      }
    }
  }
  return runs;
}

/**
 * How far a jump carries you sideways, in tiles.
 *
 * You cannot climb a wall from the far end of the room: whatever jump the
 * middle of a run affords, the one that matters is the jump available from the
 * tiles beside the thing you are trying to get over. Reading the best jump
 * anywhere along the run is what let 1-4 ship with the player sealed under a
 * staircase — seven tiles of open floor, three of them with sky above, and a
 * one-tile step out that could only be attempted from under a ceiling ten
 * pixels over his head.
 */
const REACH = 2;

/**
 * How many tiles you can raise your feet, standing on this exact tile.
 *
 * Two separate limits, and it took getting it wrong to see they are separate.
 * One is the jump itself, which is `ceiling`. The other is the roof: you rise
 * through the empty rows above you, but you also have to fit in them, and a
 * 22px body standing with its feet on a tile boundary occupies its own row and
 * part of the next. So of the empty rows overhead, one is spent on your head
 * and the rest are available to climb through.
 *
 * Folding that allowance into the jump instead of into the roof makes a wall
 * as tall as the jump unclimbable everywhere, which is wrong — the gym has
 * several of those and they are fine.
 */
function riseFrom(grid, x, row, ceiling) {
  return Math.min(ceiling, headroom(grid, x, row) - 1);
}

/** Could you land `rise` tiles up, taking off from this tile? */
function canRiseTo(grid, x, row, rise, ceiling) {
  if (rise === 0) return true;
  if (!Number.isFinite(rise)) return false;
  return riseFrom(grid, x, row, ceiling) >= rise;
}

/** Could you get over the wall at one end of this run, from beside it? */
function canClimbSide(grid, run, height, side, ceiling) {
  const from = side === 'left' ? run.x0 : Math.max(run.x0, run.x1 - REACH);
  const to = side === 'left' ? Math.min(run.x1, run.x0 + REACH) : run.x1;
  for (let x = from; x <= to; x += 1) if (canRiseTo(grid, x, run.y, height, ceiling)) return true;
  return false;
}

/**
 * Is there something to jump up ONTO within reach?
 *
 * A vertical level's ground floor is walled in by the map on both sides and is
 * not a trap at all — you leave it by climbing. Allow a couple of tiles of
 * horizontal travel either side, since a jump moves you sideways too, and only
 * count a landing you could actually stand on.
 */
function hasLandingAbove(grid, run, ceiling, W) {
  for (let x = run.x0; x <= run.x1; x += 1) {
    const reach = riseFrom(grid, x, run.y, ceiling);
    for (let dy = 1; dy <= reach; dy += 1) {
      const y = run.y - dy;
      if (y < 1) break;
      for (let c = Math.max(0, x - REACH); c <= Math.min(W - 1, x + REACH); c += 1) {
        if (grid[y][c] || grid[y + 1][c] !== 1) continue;
        if (1 + headroom(grid, c, y) >= MIN_HEADROOM) return true;
      }
    }
  }
  return false;
}

/**
 * Pits too wide to jump.
 *
 * A trap is somewhere you can get into and not out of; this is somewhere you
 * simply fall in, which the trap analysis has nothing to say about because
 * falling in is what pits are for. What makes one wrong is being wider than
 * the jump that has to cross it.
 *
 * Three tiles is what a walking jump clears at its limit. A four-tile gap
 * looks like every other gap in the level and is not one, and 1-1 and 1-3
 * shipped six of them between them — every one introduced by nudging a stretch
 * of pavement and not re-reading what it left behind.
 *
 * A gap with something standable in it at a height you could land on is a
 * stepping stone rather than a pit, so it is measured from the stone. Blocks
 * count as ground here, unlike in the trap analysis: a brick you can break is
 * still a brick you can walk along, and 1-1's plank-covered trench is a floor
 * until somebody grounds-pounds it.
 */
function findLeaps(def) {
  const W = def.widthInTiles;
  const H = def.heightInTiles;
  const grid = buildGrid(def, { includeBlocks: true });
  const floor = def.groundRow;
  if (floor === undefined) return [];

  const wet = buildWater(def);

  /** Is there anything to land on at column x, at or above the floor? */
  const standableNear = (x) => {
    // Water is not a pit. You do not jump a pool, you swim it, so a column
    // with water in it needs nothing to land on.
    for (let y = 0; y < H; y += 1) if (wet[y][x]) return true;
    /**
     * A pit is a hole, not a hill.
     *
     * Solid at the floor row means the ground carries on through this column,
     * however high it is piled above that. Meah Shearim is built on a slope,
     * and 4-1's upper alleys are terraces four steps above the street, reached
     * by stairs — which this check, looking only four rows up for somewhere to
     * stand, reported as a seventy-tile pit. A stretch of ground too tall to
     * climb is a wall, and walls are the trap analysis's business, not this.
     */
    if (grid[floor] && grid[floor][x] === 1) return true;
    /**
     * A laundry line across a gap is a bridge (§6, World 4).
     *
     * Not in the grid, because it is not terrain: you jump up through one, so
     * as a wall or a ceiling it would fail the trap and pocket checks for
     * something that stops nobody. But it is a floor from above, and a gap with
     * one strung across it at a height you could land on is not a pit.
     */
    for (const line of def.laundry ?? []) {
      if (x >= line.x && x < line.x + line.w && line.y <= floor && line.y >= floor - MAX_JUMP) return true;
    }
    for (let y = floor; y >= Math.max(1, floor - MAX_JUMP); y -= 1) {
      if (!grid[y][x] && grid[y + 1] && grid[y + 1][x] === 1) return true;
    }
    return false;
  };

  const leaps = [];
  let gapFrom = -1;
  for (let x = 0; x <= W; x += 1) {
    const solid = x < W && standableNear(x);
    if (!solid && gapFrom < 0) gapFrom = x;
    if (solid && gapFrom >= 0) {
      const width = x - gapFrom;
      // A gap at the very start or end of the map is the edge of the world.
      if (width > MAX_GAP && gapFrom > 0 && x < W) leaps.push({ from: gapFrom, to: x - 1, width });
      gapFrom = -1;
    }
  }
  return leaps;
}

export function findTraps(def, { checkLeaps = true } = {}) {
  const W = def.widthInTiles;
  const H = def.heightInTiles;
  const grid = buildGrid(def);
  const wet = buildWater(def);
  const traps = findCrushPockets(def).map((p) => ({ kind: 'pocket', ...p }));
  if (checkLeaps) traps.push(...findLeaps(def).map((l) => ({ kind: 'leap', ...l })));
  const bouncers = def.bouncers ?? [];

  for (const run of floorRuns(grid, W, H)) {
    const width = run.x1 - run.x0 + 1;

    // The bottom of a pool is walled on both sides by definition, and getting
    // out of it is not a jump. Swimming is the way out, and it goes straight
    // up, so a wet run is only a trap if the water has a lid over all of it —
    // which is the `pocket` check's business, not this one's.
    if (wet[run.y] && wet[run.y][run.x0] && wet[run.y][run.x1]) continue;

    // A bounce pad on this stretch of floor is a way out on its own.
    const hasBouncer = bouncers.some(
      (b) => b.y >= run.y - 1 && b.y <= run.y + 1 && b.x + b.w > run.x0 && b.x <= run.x1,
    );

    const ceiling = hasBouncer ? BOUNCE_JUMP : width >= RUNUP_WIDTH ? MAX_JUMP : NO_RUNUP_JUMP;

    const left = wallHeight(grid, run.x0 - 1, run.y, W);
    const right = wallHeight(grid, run.x1 + 1, run.y, W);

    // A side with no wall is a way out: you walk off it, or fall off it.
    if (left === 0 || right === 0) continue;

    if (canClimbSide(grid, run, left, 'left', ceiling)) continue;
    if (canClimbSide(grid, run, right, 'right', ceiling)) continue;
    if (hasLandingAbove(grid, run, ceiling, W)) continue;

    traps.push({
      kind: 'trap',
      row: run.y,
      from: run.x0,
      to: run.x1,
      width,
      leftWall: left === Infinity ? 'map edge' : left,
      rightWall: right === Infinity ? 'map edge' : right,
      bestJump: ceiling,
    });
  }

  return traps;
}

export function describeTraps(key, traps) {
  return traps
    .map((t) =>
      t.kind === 'pocket'
        ? `  ${key}: tiles ${t.from}-${t.to} on row ${t.y} have ${t.headroom} tile(s) of headroom — ` +
          `nobody fits, the shortest character is 22px`
        : t.kind === 'leap'
          ? `  ${key}: nothing to land on across tiles ${t.from}-${t.to} (${t.width} wide) — ` +
            `a walking jump clears ${MAX_GAP}`
          : `  ${key}: tiles ${t.from}-${t.to} on row ${t.row} (${t.width} wide) — ` +
            `walls ${t.leftWall} left, ${t.rightWall} right, but only ${t.bestJump} tiles of jump available`,
    )
    .join('\n');
}

// ---------------------------------------------------------------------------
// Design rules.
//
// Everything above is geometry: can the level be finished at all. These are
// the rules that decide whether it is fair, and they exist because the first
// playtest of World 1 found every one of them broken somewhere — a pigeon two
// tiles from a checkpoint, a pipe hung directly over one, carts rolling off
// into pits before anyone arrived, a climb whose checkpoints could not be
// taken, and a level with no enemies in it at all. LEVELS.md explains the
// numbers; this is what enforces them.
// ---------------------------------------------------------------------------

/**
 * Levels the design rules are errors for. The rest get warnings, until each
 * world is rebuilt against the rules and added here. World by world, with the
 * developer playing each one before the next.
 */
export const STRICT_LEVELS = new Set(['1-1', '1-2', '1-3', '1-4']);

/** Tiles either side of a spawn or checkpoint that nothing hostile may be in. */
export const CLEAR_TILES = 8;
/** The furthest apart two checkpoints may be, in tiles along the route. */
export const MAX_CHECKPOINT_GAP = 90;
/** On a climb, the same in rows. */
export const MAX_CHECKPOINT_RISE = 32;
/** How far into the route the first Cholent box must appear, as a share of it. */
export const EARLY_CHOLENT = 0.45;
/** Hostile things per tile of route, at least. One every forty tiles. */
export const MIN_HOSTILE_DENSITY = 1 / 40;
/** Mystery boxes a level must have, at least. */
export const MIN_BOXES = 3;

/** Things that are placed in a level but cannot hurt anyone. */
const HARMLESS_ENEMIES = new Set(['raccoon']);
const HARMLESS_HAZARDS = new Set(['canoe', 'stroller']);
/** Hazards that are a region rather than a thing: wind. Their whole width counts. */
const REGION_HAZARDS = new Set(['wind', 'blower', 'hamsin']);
/** Hazards that patrol the whole stretch of floor they stand on. */
const ROLLERS = new Set(['cart', 'mower', 'golfCart']);
/** Enemies that hold a line in the air, where a jump goes. */
const FLIERS = new Set(['pigeon', 'sparrow', 'wasp', 'mosquito']);
/** How far a perched flier drifts along its line, tiles (patrolRange 48px), plus one. */
const PERCH_DRIFT = 4;
/**
 * Tiles after a gap's far edge (or a bounce pad) that a jump's arc is still
 * passing through, and tiles before a gap's near edge that it has already
 * begun. A pigeon perched in either is a pigeon you jump into.
 */
export const ARC_AFTER = 8;
export const ARC_BEFORE = 6;
/** An awning throws you nine tiles up; at a run that is fourteen tiles along before you are down. */
export const ARC_AFTER_PAD = 14;

/**
 * Every way a level is unfair, as a list of faults. Empty is a pass.
 *
 * Expects a LevelDef (the level builder's output); `check-maps.mjs` builds the
 * same shape from a .tmj.
 */
export function findDesignFaults(def) {
  const faults = [];
  const W = def.widthInTiles;
  const H = def.heightInTiles;
  const grid = buildGrid(def, { includeBlocks: true });
  const runs = floorRuns(grid, W, H);
  const runAt = (x, cellRow) => runs.find((r) => r.y === cellRow && x >= r.x0 && x <= r.x1);
  const rising = def.autoScrollUp !== undefined;
  const boss = def.boss !== undefined;
  const prologue = def.key === 'intro';
  const greybox = /greybox/i.test(def.name ?? '');
  const spawn = def.spawn;
  const goal = def.goal;

  const hostiles = [];
  for (const e of def.enemies ?? []) {
    if (!HARMLESS_ENEMIES.has(e.kind)) hostiles.push({ what: e.kind, x0: e.x, x1: e.x, y: e.y });
  }
  for (const h of def.hazards ?? []) {
    if (HARMLESS_HAZARDS.has(h.kind)) continue;
    const w = REGION_HAZARDS.has(h.kind) ? h.w || 1 : 1;
    hostiles.push({ what: h.kind, x0: h.x, x1: h.x + w - 1, y: h.y, roller: ROLLERS.has(h.kind) });
  }

  // --- Spawn and checkpoints: nothing hostile near, and on the floor -------
  const points = [{ label: 'the spawn', x: spawn.x, y: spawn.y }];
  (def.checkpoints ?? []).forEach((c, i) => points.push({ label: `checkpoint ${i + 1}`, x: c.x, y: c.y, index: i }));

  for (const p of points) {
    if (!(grid[p.y] && grid[p.y][p.x] === 1) || (grid[p.y - 1] && grid[p.y - 1][p.x] === 1)) {
      faults.push({ kind: 'floor', message: `${p.label} at (${p.x},${p.y}) is not standing on a floor` });
    }
    for (const h of hostiles) {
      const dx = h.x0 > p.x ? h.x0 - p.x : h.x1 < p.x ? p.x - h.x1 : 0;
      // A climb's boards are a few rows apart: only what is near in height counts.
      const near = dx <= CLEAR_TILES && (!rising || Math.abs(h.y - p.y) <= 6);
      if (near) {
        faults.push({
          kind: 'clearance',
          message: `${h.what} at (${h.x0},${h.y}) is ${dx} tile(s) from ${p.label} at (${p.x},${p.y}); nothing hostile within ${CLEAR_TILES}`,
        });
      }
      // A roller patrols its whole stretch of floor, so distance is not enough.
      if (h.roller) {
        const run = runAt(h.x0, h.y - 1);
        if (run && run === runAt(p.x, p.y - 1)) {
          faults.push({ kind: 'roller', message: `${h.what} at (${h.x0},${h.y}) rolls along the floor ${p.label} stands on (tiles ${run.x0}-${run.x1})` });
        }
      }
    }
  }

  // --- Nothing perched in a jump's arc ----------------------------------------
  //
  // Found twice in one playtest: a pigeon on row 16 five tiles past a gap,
  // and one four tiles past an awning. A running jump over a two-tile gap
  // reaches four tiles high and lands five or six tiles on, and an awning
  // throws you nine; the perch line was in the middle of both.
  if (!rising && def.groundRow !== undefined) {
    const floor = def.groundRow;
    const fliers = (def.enemies ?? []).filter((e) => FLIERS.has(e.kind) && e.y <= floor - 2);
    const launches = [];
    // Gaps along the floor: columns with nothing to stand on near the floor row.
    const standable = (x) => { for (let y = floor; y >= Math.max(1, floor - MAX_JUMP); y -= 1) if (grid[y] && grid[y][x] && !grid[y - 1][x]) return true; return grid[floor] && grid[floor][x] === 1; };
    let gapFrom = -1;
    for (let x = 0; x <= W; x += 1) {
      const ok = x < W && standable(x);
      if (!ok && gapFrom < 0) gapFrom = x;
      if (ok && gapFrom >= 0) { if (gapFrom > 0 && x < W) launches.push({ what: 'gap', from: gapFrom, to: x - 1 }); gapFrom = -1; }
    }
    for (const b of def.bouncers ?? []) if (b.y >= floor - 4) launches.push({ what: b.kind ?? 'awning', from: b.x, to: b.x + (b.w || 1) - 1 });
    for (const l of launches) {
      for (const f of fliers) {
        const reach = l.what === 'gap' ? ARC_AFTER : ARC_AFTER_PAD;
        const after = f.x > l.to && f.x - l.to <= reach;
        const before = l.what === 'gap' && f.x < l.from && l.from - f.x <= ARC_BEFORE;
        if (after || before) {
          faults.push({ kind: 'arc', message: `${f.kind} at (${f.x},${f.y}) is perched in the jump over the ${l.what} at ${l.from}-${l.to} (keep ${ARC_BEFORE} tiles before a gap, ${ARC_AFTER} after one and ${ARC_AFTER_PAD} after a pad clear)` });
        }
      }
    }
  }

  // --- A flier does not perch on a landing ---------------------------------
  //
  // A pigeon a row above a board is standing on it, and if the board is one
  // the route lands on, so is the player — into the pigeon. 1-2 had one on
  // the right-hand ladder's third board, and Berel could not get past it.
  // Perches go in the empty column beside the boards, or well above them —
  // and a perched flier drifts three tiles either way, so the whole drift
  // has to clear the landing, not just the perch.
  for (const f of (def.enemies ?? []).filter((e) => FLIERS.has(e.kind))) {
    let under = null;
    for (let dy = 1; dy <= 2 && !under; dy += 1) {
      for (let dx = -PERCH_DRIFT; dx <= PERCH_DRIFT; dx += 1) {
        const row = grid[f.y + dy];
        if (row && row[f.x + dx] && !(grid[f.y + dy - 1] && grid[f.y + dy - 1][f.x + dx])) under = { x: f.x + dx, y: f.y + dy };
      }
    }
    if (under && (def.groundRow === undefined || under.y !== def.groundRow)) {
      faults.push({ kind: 'perch', message: `${f.kind} at (${f.x},${f.y}) is perched on the landing at (${under.x},${under.y}); put it further out (it drifts ${PERCH_DRIFT - 1} tiles) or three rows up` });
    }
  }

  // --- Rollers stand on a floor to begin with ------------------------------
  for (const h of hostiles) {
    if (h.roller && !runAt(h.x0, h.y - 1)) {
      faults.push({ kind: 'roller', message: `${h.what} at (${h.x0},${h.y}) is not on a floor` });
    }
  }

  // --- Checkpoints come in the order they are reached ----------------------
  const cps = def.checkpoints ?? [];
  for (let i = 1; i < cps.length; i += 1) {
    const ok = rising ? cps[i].y < cps[i - 1].y : cps[i].x > cps[i - 1].x;
    if (!ok) {
      faults.push({ kind: 'order', message: `checkpoint ${i + 1} at (${cps[i].x},${cps[i].y}) is not ${rising ? 'above' : 'right of'} checkpoint ${i} at (${cps[i - 1].x},${cps[i - 1].y})` });
    }
  }

  // --- The rest is about a level's content, which a boss arena or an
  //     instrument is not measured on.
  if (boss || prologue || greybox || !goal) return faults;

  const along = (p) => (rising ? spawn.y - p.y : p.x - spawn.x);
  const length = along(goal);
  const maxGap = rising ? MAX_CHECKPOINT_RISE : MAX_CHECKPOINT_GAP;
  let last = 0;
  for (const [i, c] of cps.entries()) {
    const gap = along(c) - last;
    if (gap > maxGap) faults.push({ kind: 'spacing', message: `checkpoint ${i + 1} is ${gap} ${rising ? 'rows' : 'tiles'} after the last; at most ${maxGap}` });
    last = along(c);
  }
  if (length - last > maxGap) faults.push({ kind: 'spacing', message: `the goal is ${length - last} ${rising ? 'rows' : 'tiles'} after the last checkpoint; at most ${maxGap}` });

  const boxes = (def.blocks ?? []).filter((b) => b.kind === 'mystery');
  if (boxes.length < MIN_BOXES) faults.push({ kind: 'content', message: `${boxes.length} mystery box(es); at least ${MIN_BOXES}` });
  const cholent = boxes.filter((b) => b.contents === 'cholent').map(along);
  if (!cholent.some((d) => d <= length * EARLY_CHOLENT)) {
    faults.push({ kind: 'content', message: `no Cholent box in the first ${Math.round(EARLY_CHOLENT * 100)}% of the route (${Math.round(length * EARLY_CHOLENT)} of ${length} ${rising ? 'rows' : 'tiles'})` });
  }
  const need = Math.ceil(length * MIN_HOSTILE_DENSITY);
  if (hostiles.length < need) faults.push({ kind: 'content', message: `${hostiles.length} enemies and hazards over ${length} ${rising ? 'rows' : 'tiles'}; at least ${need}` });

  return faults;
}

export function describeFaults(key, faults) {
  return faults.map((f) => `  ${key}: ${f.message}`).join('\n');
}
