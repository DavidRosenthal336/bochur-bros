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
  const pockets = [];

  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (grid[y][x] || !grid[y + 1][x]) continue; // not a surface you could stand on
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

export function findTraps(def) {
  const W = def.widthInTiles;
  const H = def.heightInTiles;
  const grid = buildGrid(def);
  const traps = findCrushPockets(def).map((p) => ({ kind: 'pocket', ...p }));
  const bouncers = def.bouncers ?? [];

  for (const run of floorRuns(grid, W, H)) {
    const width = run.x1 - run.x0 + 1;

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
        : `  ${key}: tiles ${t.from}-${t.to} on row ${t.row} (${t.width} wide) — ` +
          `walls ${t.leftWall} left, ${t.rightWall} right, but only ${t.bestJump} tiles of jump available`,
    )
    .join('\n');
}
