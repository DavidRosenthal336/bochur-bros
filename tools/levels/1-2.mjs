import { level } from '../level-builder.mjs';

/**
 * 1-2 — The Scaffolding.
 *
 * "Vertical climb. Falling pipes, fire escapes, rats. Teaches telegraphed
 * hazards." (§6)
 *
 * The screen climbs on its own now. Standing still is not a rest, it is the
 * bottom of the screen coming up to meet you, and there is nothing under a
 * player it has passed — so unlike 1-3's chase, which shoves you along, being
 * outpaced here is a death. The camera is a ratchet: it climbs on its clock,
 * climbs faster if you climb faster, and never gives back ground you made.
 *
 * Sixteen pixels a second against a climb that gains thirty-two every time you
 * land a jump. It is not a race — it is a floor that keeps rising, which is
 * what lets the level fork, and forking is most of what is new here.
 *
 * ## Two numbers the whole level is built from
 *
 * **A step you must climb is two rows.** Berel's standing jump is 48px, three
 * tiles exactly and no margin, so three-row steps quietly belong to Mendy. Two
 * rows is 32px and leaves both brothers sixteen pixels of slack from a
 * standstill.
 *
 * **A platform two rows above another must not sit over it.** This is the one
 * that is easy to miss and it broke the first draft in six places. Two rows of
 * spacing leaves one empty row between the boards — sixteen pixels — and the
 * shortest character in the game is twenty-two. Standing on the lower board
 * under the upper one is not a tight fit, it is not a fit at all. So the climb
 * is a two-column ladder: each step crosses to the other column, and boards in
 * the same column are four rows apart, which leaves three tiles of headroom.
 *
 * Where something does need to sit over something else — the wide landings —
 * it goes three rows up and eight tiles wide, so there is both room to stand
 * and room for the run-up that makes 48px comfortable.
 *
 * `step()` enforces all of it at build time.
 *
 * ## Forks
 *
 * Every fork rejoins, and the rejoin is measured from the *easier* branch. A
 * player who takes the long way up a rising level and finds the next platform
 * out of reach cannot go back down and try the other one — the screen has
 * eaten it. The branches differ in what they cost and what they pay, never in
 * whether they work.
 */
const WIDTH = 44;
/**
 * Ten rows of road below the pavement.
 *
 * Not decoration: the rising camera is clamped to the level's own bounds, so
 * how far below the player it can sit at the start is decided by how much
 * level there is underneath them. At 98 rows the view bottom was sixty-four
 * pixels under their feet on the first frame, which is three seconds of
 * standing still, grace period or no grace period.
 */
const HEIGHT = 104;
const FLOOR = 94;

const L = level({
  key: '1-2',
  name: 'The Scaffolding',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x141a26',
  backdrop: 'day',
});

L.ground(0, WIDTH);
L.spawnAt(5, FLOOR);
L.rises(20);

/**
 * The climb, in three numbers.
 *
 * `STEP` is three rows — 48px, which is Berel's standing jump exactly, and
 * comfortable for him off the run-up an eight-wide board gives. Two rows would
 * be kinder to jump and is not available: see the ceiling rule below.
 *
 * `CEILING` is how many rows must separate boards that sit over one another.
 *
 * `COLS` are the four columns everything is built from, eight wide with a tile
 * between them — near enough to cross, far enough never to overlap. Ladders
 * use an adjacent pair; a fork sends one branch up the left pair and the other
 * up the right, so the two never share a column.
 */
const STEP = 3;
const CEILING = 6;
const BOARD = 8;
const COLS = [2, 11, 20, 29];
const [C0, C1, C2, C3] = COLS;

/** Every board placed so far, so new ones can be checked against them. */
const boards = [];
/**
 * Every jump the level claims is makeable, as the pair of boards it goes
 * between.
 *
 * Exported so a harness can drive the real game up each one rather than
 * trusting the arithmetic. The arithmetic is what said a two-row step was fine
 * and it was wrong about six of them.
 */
export const EDGES = [];

/**
 * Place a board, and refuse it if it breaks the climb.
 *
 * `from` is explicit rather than "whatever was placed last", so a branch is
 * measured against the board it actually leaves rather than against the other
 * branch's last board.
 */
function step(from, x, row, w, { maxRise = STEP } = {}) {
  if (from) {
    const rise = from.row - row;
    if (rise > maxRise) {
      throw new Error(`1-2: (${x},${row}) is ${rise} rows above (${from.x},${from.row}); max ${maxRise}`);
    }
    if (rise < 1) {
      throw new Error(`1-2: (${x},${row}) does not climb from (${from.x},${from.row})`);
    }
    const gap = x > from.x + from.w ? x - (from.x + from.w) : from.x - (x + w);
    if (gap > 4) {
      throw new Error(`1-2: (${x},${row}) is ${gap} tiles sideways from (${from.x},${from.row}); max 4`);
    }
  }

  /**
   * The ceiling rule, and the one that matters most.
   *
   * A board overlapping another one `n` rows above it leaves `16n - 16` pixels
   * of clear air over the lower board's surface, and a player standing there
   * can only raise their feet by that minus their own height. Berel is 24px,
   * so a board four rows up allows 48 - 24 = 24px of rise — and the step this
   * level asks for is 48. You jump, you hit your head, you land where you
   * started, forever.
   *
   * Driving the real game up the first draft's ladder showed exactly that: a
   * jump that gained twenty-five pixels and stopped, at every single step,
   * because a two-column ladder in two-row steps puts a board four rows over
   * your head by construction. It is not a level that is hard, it is a level
   * that is impossible, and no amount of looking at the numbers found it.
   *
   * Six rows clears it: 80px of air, 24px of Berel, 56px of rise against a
   * 48px step.
   */
  for (const b of boards) {
    const overlaps = x < b.x + b.w && b.x < x + w;
    const above = b.row - row;
    if (overlaps && above >= 1 && above < CEILING) {
      throw new Error(
        `1-2: (${x},${row}) sits ${above} row(s) over (${b.x},${b.row}) and overlaps it — ` +
          `that leaves ${16 * above - 16}px of air and the step out of there is ${16 * STEP}px`,
      );
    }
  }

  L.slab(x, row, w, 1);
  const board = { x, row, w };
  boards.push(board);
  if (from) EDGES.push({ from, to: board });
  return board;
}

/**
 * A run of alternating boards, crossing between two columns.
 *
 * Alternating is what keeps the ceiling clear: the same column only comes
 * round every other board, so boards above each other are `2 * STEP` rows
 * apart, which is the whole reason `STEP` is three rather than two.
 */
function ladder(from, [colA, colB], topRow, steps, decorate) {
  let cur = from;
  for (let i = 0; i < steps; i += 1) {
    const row = topRow - i * STEP;
    cur = step(cur, i % 2 === 0 ? colA : colB, row, BOARD);
    if (decorate) decorate(i, cur);
  }
  return cur;
}


// ---------------------------------------------------------------------------
// The bottom: a plain ladder up the two middle columns.
//
// Long enough to learn that the screen is coming, and what a step costs,
// before anything is asked of you.
// ---------------------------------------------------------------------------
L.sign(3, ['THE SCAFFOLDING', 'the screen goes up. keep up.'], FLOOR - 7);

const base = ladder(null, [C1, C2], FLOOR - 3, 8, (i, board) => {
  if (i % 3 === 1) L.coinRow(board.x + 2, board.row - 2, 4);
  if (i === 3) L.block(board.x + 3, board.row - 3, 'mystery', 'cholent');
  if (i === 5) L.enemy(board.x + 4, board.row - 4);
  if (i === 7) L.enemy(board.x + 2, board.row - 4, 'rat');
});
L.checkpoint(base.x + 4, base.row);
L.sign(C1, ['TWO WAYS UP. BOTH WORK.'], FLOOR - 28);

// ---------------------------------------------------------------------------
// Fork one — the fire escape, or the long way round.
//
// The fork leaves from a middle column so both branches have somewhere to go:
// LEFT takes the two left-hand columns, RIGHT takes the two right-hand ones,
// and they share nothing, which is what keeps each branch's boards out of the
// other's ceiling.
//
// LEFT is the fire escape, four rows a step. Sixty-four pixels is past Mendy's
// standing jump of 62 and well past Berel's 48, so it is Mendy's, and it is
// four jumps against six with the coins on it.
//
// RIGHT is the ordinary three-row ladder with a rat and a pigeon on it. §4
// makes the brothers a choice, so the route anybody can climb always exists.
// ---------------------------------------------------------------------------
let left = base;
for (let i = 0; i < 4; i += 1) {
  left = step(left, i % 2 === 0 ? C1 : C0, FLOOR - 28 - i * 4, BOARD, { maxRise: 4 });
  L.coinRow(left.x + 2, left.row - 2, 4);
}

const right = ladder(base, [C3, C2], FLOOR - 27, 6, (i, board) => {
  if (i === 1) L.enemy(board.x + 4, board.row - 4, 'rat');
  if (i === 3) L.enemy(board.x + 2, board.row - 4);
  if (i === 5) L.enemy(board.x + 4, board.row - 4, 'rat');
});

/**
 * The rejoin goes in the column both branch tops have as a neighbour.
 *
 * LEFT tops out on C0 and RIGHT on C2, so C1 touches both and sits over
 * neither. It also has to be within a step of the LOWER of the two tops, which
 * is why the branches are built to finish within a row or two of each other
 * rather than wherever their step counts happen to land.
 */
if (left.x !== C0 || right.x !== C2) throw new Error('1-2: fork one no longer tops out where the rejoin expects');
const rejoinA = step(left, C1, Math.max(left.row, right.row) - STEP, BOARD);
L.checkpoint(rejoinA.x + 4, rejoinA.row);

// ---------------------------------------------------------------------------
// The pipes.
//
// §6's telegraphed hazard: a shadow on the boards, then the pipe. A rising
// screen is the right place for them — you cannot outwait one, so the answer
// has to be to read it and move.
//
// The gantry hangs over the left-hand column and the climb goes up underneath
// it, so the pipes come down the shaft you are in. It is nine rows clear of
// the highest board beneath it, because a gantry is a solid thing and a solid
// thing three rows over a board you stand on is a box, not a hazard.
// ---------------------------------------------------------------------------
let here = ladder(rejoinA, [C0, C1], rejoinA.row - STEP, 4, (i, board) => {
  if (i === 1) L.coinRow(board.x + 2, board.row - 2, 4);
  if (i === 2) L.enemy(board.x + 4, board.row - 4, 'rat');
  if (i === 3) L.enemy(board.x + 2, board.row - 4);
});
const gantryRow = here.row - 6;
L.slab(C0, gantryRow, 9, 1);
for (const px of [C0 + 1, C0 + 4, C0 + 7]) L.hazard('pipe', px, gantryRow);
L.sign(C0, ['A SHADOW MEANS A PIPE'], rejoinA.row - 4);

// Out from under the gantry, into the right-hand columns.
here = step(here, C2, here.row - STEP, BOARD);
here = ladder(here, [C3, C2], here.row - STEP, 2, (i, board) => {
  if (i === 1) L.enemy(board.x + 4, board.row - 4);
});
L.checkpoint(here.x + 4, here.row);
L.block(here.x + 3, here.row - 3, 'mystery', 'peyos');
L.sign(here.x - 4, ['PEYOS: HOLD JUMP TO CLIMB'], here.row - 6);

// ---------------------------------------------------------------------------
// Fork two — the reinforced block.
//
// Berel smashes a reinforced block from below and Mendy cannot, in any form,
// and behind this one is a life. It is the single thing in the level exactly
// one brother can do, and it is worth exactly one life — about the right price
// for a swap.
//
// The other branch is the same climb with a rat and a pigeon on it.
// ---------------------------------------------------------------------------
const forkTwo = here;
const secret = ladder(forkTwo, [C1, C0], forkTwo.row - STEP, 4, (i, board) => {
  if (i % 2 === 1) L.coinRow(board.x + 2, board.row - 2, 4);
});
// Three rows up, not four: four puts the block two rows under the next board
// in the same column, and the one-tile slot between them is somewhere nobody
// fits. Three is still hit from below from the board you are standing on.
L.block(secret.x + 2, secret.row - 3, 'reinforced');
L.block(secret.x + 3, secret.row - 3, 'mystery', 'lchaim');
L.sign(secret.x, ['BEREL BREAKS THE GREY ONE'], secret.row - 6);

const plain = ladder(forkTwo, [C3, C2], forkTwo.row - STEP, 4, (i, board) => {
  if (i === 0) L.enemy(board.x + 2, board.row - 4);
  if (i === 1) L.enemy(board.x + 4, board.row - 4, 'rat');
  if (i === 3) L.enemy(board.x + 4, board.row - 4);
});

if (secret.x !== C0 || plain.x !== C2) throw new Error('1-2: fork two no longer tops out where the rejoin expects');
const rejoinB = step(secret, C1, Math.max(secret.row, plain.row) - STEP, BOARD);
L.checkpoint(rejoinB.x + 4, rejoinB.row);

// ---------------------------------------------------------------------------
// The last stretch: a pigeon over every crossing, and no more forks.
// ---------------------------------------------------------------------------
here = ladder(rejoinB, [C2, C1], rejoinB.row - STEP, 3, (i, board) => {
  L.enemy(board.x + 4, board.row - 4, i === 1 ? 'rat' : 'pigeon');
  if (i % 2 === 1) L.coinRow(board.x + 1, board.row - 2, 3);
});

/**
 * The top. Eight wide like every other board, and the width is the whole point.
 *
 * At nine it reached across the one-tile gap and sat flush against the board
 * being jumped from, so the take-off was already underneath it: you have to
 * get your feet over a board's surface before you are under it, and there was
 * nowhere to do that. Measured, it was the only jump in the level neither
 * brother could make, and it looked like the most generous one.
 */
const landing = step(here, C1, here.row - STEP, BOARD);
L.label(landing.x + 1, landing.row - 3, 'TOUCH THE POST');
L.goalAt(landing.x + landing.w - 3, landing.row);

export default L.build();
