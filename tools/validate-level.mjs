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

function buildGrid(def) {
  const { widthInTiles: W, heightInTiles: H } = def;
  const grid = Array.from({ length: H }, () => new Uint8Array(W));
  for (const s of def.solids) {
    for (let y = s.y; y < s.y + s.h; y += 1) {
      for (let x = s.x; x < s.x + s.w; x += 1) {
        if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = 1;
      }
    }
  }
  return grid;
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
 * Is there something to jump up ONTO within reach?
 *
 * A vertical level's ground floor is walled in by the map on both sides and is
 * not a trap at all — you leave it by climbing. Allow a couple of tiles of
 * horizontal travel either side, since a jump moves you sideways too.
 */
function hasLandingAbove(grid, run, best, W) {
  const from = Math.max(0, run.x0 - 2);
  const to = Math.min(W - 1, run.x1 + 2);

  for (let dy = 1; dy <= best; dy += 1) {
    const y = run.y - dy;
    if (y < 1) break;
    for (let x = from; x <= to; x += 1) {
      if (!grid[y][x] && grid[y + 1][x] === 1) return true;
    }
  }
  return false;
}

export function findTraps(def) {
  const W = def.widthInTiles;
  const H = def.heightInTiles;
  const grid = buildGrid(def);
  const traps = [];
  const bouncers = def.bouncers ?? [];

  for (const run of floorRuns(grid, W, H)) {
    const width = run.x1 - run.x0 + 1;

    // A bounce pad on this stretch of floor is a way out on its own.
    const hasBouncer = bouncers.some(
      (b) => b.y >= run.y - 1 && b.y <= run.y + 1 && b.x + b.w > run.x0 && b.x <= run.x1,
    );

    // The best jump available anywhere along the run: a low ceiling over part
    // of it does not matter if you can step out from under before jumping.
    let best = 0;
    for (let x = run.x0; x <= run.x1; x += 1) {
      const ceiling = hasBouncer ? BOUNCE_JUMP : width >= RUNUP_WIDTH ? MAX_JUMP : NO_RUNUP_JUMP;
      best = Math.max(best, Math.min(ceiling, headroom(grid, x, run.y)));
    }

    const left = wallHeight(grid, run.x0 - 1, run.y, W);
    const right = wallHeight(grid, run.x1 + 1, run.y, W);

    // A side with no wall is a way out: you walk off it, or fall off it.
    if (left === 0 || right === 0) continue;

    const shortest = Math.min(left, right);
    if (shortest <= best) continue;
    if (hasLandingAbove(grid, run, best, W)) continue;

    traps.push({
      row: run.y,
      from: run.x0,
      to: run.x1,
      width,
      leftWall: left === Infinity ? 'map edge' : left,
      rightWall: right === Infinity ? 'map edge' : right,
      bestJump: best,
    });
  }

  return traps;
}

export function describeTraps(key, traps) {
  return traps
    .map(
      (t) =>
        `  ${key}: tiles ${t.from}-${t.to} on row ${t.row} (${t.width} wide) — ` +
        `walls ${t.leftWall} left, ${t.rightWall} right, but only ${t.bestJump} tiles of jump available`,
    )
    .join('\n');
}
