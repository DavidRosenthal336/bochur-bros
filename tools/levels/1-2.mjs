import { level } from '../level-builder.mjs';

/**
 * 1-2 — The Scaffolding.
 *
 * "Vertical climb. Falling pipes, fire escapes, rats. Teaches telegraphed
 * hazards." (§6)
 *
 * The climb and the fire escapes are here. Falling pipes and rats are World 1
 * content and arrive in Milestone 6; when they do, they go on these same
 * platforms and this level gets its teaching job.
 *
 * The rule the geometry follows: every platform overlaps the one below it, so
 * a missed jump costs you one landing rather than the whole climb. Steps are
 * three tiles apart against a four-tile standing jump, which leaves room to be
 * imprecise.
 */
const WIDTH = 40;
const HEIGHT = 64;
const FLOOR = 60;

const L = level({
  key: '1-2',
  name: 'The Scaffolding',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x141a26',
});

L.ground(0, WIDTH);
L.spawnAt(4, FLOOR);
L.label(3, FLOOR - 5, 'THE SCAFFOLDING');
L.label(3, FLOOR - 4, 'go up.');
L.coinRow(8, FLOOR - 2, 4);

const PLATFORM_WIDTH = 7;
const RISE = 3;      // rows between steps, against a four-tile standing jump
const SIDESTEP = 6;  // one tile less than a platform, so every step overlaps

let row = FLOOR - RISE;
let x = 6;
let direction = 1;

for (let step = 0; step < 16; step += 1) {
  L.slab(x, row, PLATFORM_WIDTH, 1);

  // A checkpoint every fourth landing, so a long fall is not a long re-climb.
  if (step % 4 === 2) L.checkpoint(x + 3, row);

  if (step % 2 === 0) L.coinRow(x + 2, row - 2, 3);

  // Pigeons perch above the route and swoop as you come level with them.
  if (step % 5 === 3) L.enemy(x + 3, row - 4);

  // A box tucked under an overhang, hit from the landing below.
  if (step === 6) L.block(x + 1, row - 4, 'mystery', 'cholent');
  if (step === 11) L.block(x + 2, row - 4, 'mystery', 'coin');

  row -= RISE;
  x += direction * SIDESTEP;
  if (x + PLATFORM_WIDTH > WIDTH - 2) {
    direction = -1;
    x = WIDTH - 2 - PLATFORM_WIDTH;
  }
  if (x < 2) {
    direction = 1;
    x = 2;
  }
}

// The top: a wide landing and the way out.
L.slab(x - 2, row, 12, 1);
L.label(x - 1, row - 3, 'TOUCH THE POST');
L.goalAt(x + 4, row);

export default L.build();
