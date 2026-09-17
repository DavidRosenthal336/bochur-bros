import type { LabelDef, LevelDef, SolidDef } from './LevelDef';

/**
 * "The Gym" — the Milestone 1 greybox test level.
 *
 * This is not a level from the game. It is a calibration range: every station
 * measures one property of the jump so you can tell, numerically and not just
 * by vibe, what the current tuning buys you. Run it, then go edit
 * `src/config/Tuning.ts`.
 *
 * There are deliberately no bottomless pits. Every gap has a floor a short hop
 * below it, so a missed jump costs you a walk back and nothing else. Failing a
 * jump twenty times in a row is the entire point of this level.
 *
 * Everything below is authored in TILES, top-left origin, y down.
 */

/** Row whose top edge is the main ground surface. */
const FLOOR_TOP = 20;
/** Total level height in tiles. */
const HEIGHT = 27;
/** Row whose top edge catches you when you miss a gap in the gap ladder. */
const PIT_TOP = 23;

const solids: SolidDef[] = [];
const labels: LabelDef[] = [];

/** A run of main ground, from `x`, `w` tiles wide, down to the bottom of the level. */
function ground(x: number, w: number): void {
  solids.push({ x, y: FLOOR_TOP, w, h: HEIGHT - FLOOR_TOP, kind: 'ground' });
}

/** A block whose top surface sits at row `top`, resting on the main ground. */
function pillar(x: number, top: number, w: number): void {
  solids.push({ x, y: top, w, h: FLOOR_TOP - top, kind: 'platform' });
}

/** A block from row `top` to the bottom of the level. */
function column(x: number, top: number, w: number, kind: SolidDef['kind'] = 'wall'): void {
  solids.push({ x, y: top, w, h: HEIGHT - top, kind });
}

function label(x: number, y: number, text: string): void {
  labels.push({ x, y, text });
}

// ---------------------------------------------------------------------------
// A — FLAT. Acceleration, top speed, stopping distance, pivoting.
// ---------------------------------------------------------------------------
ground(0, 34);
label(2, 15, 'A  FLAT GROUND');
label(2, 16, 'walk, hold SHIFT or X to run, turn around, stop');

// ---------------------------------------------------------------------------
// B — HEIGHT LADDER. Five pillars, each one tile taller than the last.
// They are solid to the floor on purpose: you cannot chain from one top to the
// next, so each is a clean measurement of jump height from flat ground.
// ---------------------------------------------------------------------------
ground(34, 30);
label(36, 15, 'B  HOW HIGH?');
label(36, 16, 'each pillar is 1 tile taller. running gets you one higher.');
const PILLAR_HEIGHTS = [2, 3, 4, 5, 6] as const;
PILLAR_HEIGHTS.forEach((tilesUp, i) => {
  const x = 36 + i * 6;
  const top = FLOOR_TOP - tilesUp;
  pillar(x, top, 3);
  label(x, top - 1, `${tilesUp}`);
});

// ---------------------------------------------------------------------------
// C — GAP LADDER. Gaps widen by exactly one tile at a time. Built in a loop so
// the widths are exact; a hand-typed ladder with an off-by-one measures nothing.
// ---------------------------------------------------------------------------
label(66, 15, 'C  HOW FAR?');
label(66, 16, 'gaps grow by 1 tile. walking vs running should differ a lot.');
label(66, 17, 'measured: 3 tiles walking, 6 at a run.');

let cursor = 64;
ground(cursor, 8);
cursor += 8;

const GAP_WIDTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
for (const gap of GAP_WIDTHS) {
  solids.push({ x: cursor, y: PIT_TOP, w: gap, h: HEIGHT - PIT_TOP, kind: 'ground' });
  label(cursor, FLOOR_TOP + 1, `${gap}`);
  cursor += gap;
  ground(cursor, 5);
  cursor += 5;
}
ground(cursor, 6); // a little landing pad after the last gap
cursor += 6;

// ---------------------------------------------------------------------------
// D — COYOTE LEDGE. Run off the end of the plateau and press jump a beat LATE.
// With coyote time on you clear the gap; with it off you drop straight in.
// Toggle `coyoteTimeMs` to 0 in Tuning.ts and try this station again.
// ---------------------------------------------------------------------------
ground(cursor, 6);
cursor += 6;
const LEDGE_TOP = 16;
column(cursor, LEDGE_TOP, 16, 'platform');
label(cursor, 15, 'D  COYOTE TIME');
label(cursor, 16, 'run off the edge, then jump a moment too late');
cursor += 16;
// The catch floor sits only 3 tiles down, so a miss is a hop back up.
solids.push({ x: cursor, y: LEDGE_TOP + 3, w: 5, h: HEIGHT - (LEDGE_TOP + 3), kind: 'ground' });
cursor += 5;
column(cursor, LEDGE_TOP, 14, 'platform');
cursor += 14;

// ---------------------------------------------------------------------------
// E — STAIRCASE. Hop up without breaking stride, then take the big drop off the
// right-hand end and hit jump BEFORE you land. Jump buffering is what makes the
// bounce come out instantly instead of eating the input.
// ---------------------------------------------------------------------------
const STAIR_X = cursor;
ground(STAIR_X, 34);
label(STAIR_X, 15, 'E  JUMP BUFFER');
label(STAIR_X, 16, 'run the stairs; off the top, press jump before you land');
for (let i = 0; i < 5; i += 1) {
  pillar(STAIR_X + i * 3, FLOOR_TOP - 1 - i, 3);
}
pillar(STAIR_X + 15, FLOOR_TOP - 6, 8); // top landing, then a 6-tile drop off its right edge
cursor = STAIR_X + 34;

// ---------------------------------------------------------------------------
// F — LOW CEILING. Two tiles of clearance: you can run under it, you cannot
// jump under it. Checks that head collisions kill upward velocity cleanly
// instead of sticking or juddering.
// ---------------------------------------------------------------------------
ground(cursor, 29);
label(cursor, 15, 'F  HEAD BONK');
label(cursor, 16, 'run under the slab, then try to jump under it');
solids.push({ x: cursor + 4, y: FLOOR_TOP - 4, w: 18, h: 2, kind: 'platform' });
cursor += 29;

// ---------------------------------------------------------------------------
// G — CROUCH TUNNEL. One tile of clearance. Standing you are 22px tall and it
// is 16px, so the only way through is ducking. As Cholent you are 18px even
// crouched, so this stretch is closed to you until you take a hit — which is
// the kind of trade the bigger tiers are supposed to make.
// ---------------------------------------------------------------------------
ground(cursor, 26);
label(cursor, 15, 'G  CROUCH');
label(cursor, 16, 'hold DOWN to duck through. try it again as Cholent.');
solids.push({ x: cursor + 6, y: FLOOR_TOP - 4, w: 14, h: 3, kind: 'platform' });
cursor += 26;

// ---------------------------------------------------------------------------
// H — END. A wall, so you can feel what running into one does.
// ---------------------------------------------------------------------------
ground(cursor, 16);
label(cursor + 2, 15, 'H  END OF THE LINE');
column(cursor + 14, 8, 2, 'wall');
const WIDTH = cursor + 16;

export const TEST_LEVEL: LevelDef = {
  key: 'gym',
  name: 'The Gym',
  widthInTiles: WIDTH,
  heightInTiles: HEIGHT,
  spawn: { x: 3, y: FLOOR_TOP },
  backgroundColor: 0x121726,
  solids,
  labels,
};
