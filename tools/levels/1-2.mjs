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
 * Two rules the geometry follows:
 *
 * Every platform overlaps the one below it by exactly one tile, so a missed
 * jump usually costs one landing rather than the whole climb — and, because
 * the overlap is only ever a single tile at the very edge, you can never end
 * up roofed with nowhere to go. An earlier version turned around by clamping
 * to the wall, which stacked two platforms almost on top of each other and
 * left a six-tile pocket with two tiles of headroom: you could walk in, and
 * then you could not jump out. Turning now reverses *before* stepping, so a
 * turn is a real step sideways like any other.
 *
 * Steps are three tiles apart against a four-tile standing jump, which leaves
 * room to be imprecise.
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

  // Pigeons perch above the route and swoop as you come level with them —
  // close enough above that they are on screen before they move.
  if (step % 5 === 3) L.enemy(x + 3, row - 3);

  // A box tucked under an overhang, hit from the landing below.
  if (step === 6) L.block(x + 1, row - 4, 'mystery', 'cholent');
  // Peyos in a climbing level: flight turns the back half into a different
  // problem, which is the point of giving it to you here.
  if (step === 11) L.block(x + 2, row - 4, 'mystery', 'peyos');

  row -= RISE;
  const next = x + direction * SIDESTEP;
  if (next < 2 || next + PLATFORM_WIDTH > WIDTH - 2) direction = -direction;
  x += direction * SIDESTEP;
}

// The top: a wide landing, extended in the direction of travel so that it
// overlaps the last platform by a single tile like every other step.
const LANDING_WIDTH = 12;
const landingX = direction === 1 ? x : x - (LANDING_WIDTH - PLATFORM_WIDTH);
L.slab(landingX, row, LANDING_WIDTH, 1);
L.label(landingX + 1, row - 3, 'TOUCH THE POST');
L.goalAt(landingX + LANDING_WIDTH - 3, row);

export default L.build();
