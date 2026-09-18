import { level } from '../level-builder.mjs';

/**
 * "The Beis Medrash" — the Milestone 5 greybox range.
 *
 * One station per power form, each with something to use it on. Boxes come in
 * pairs so a form can be re-taken after you lose it, because testing a form
 * you cannot get back to is testing it once.
 */
const FLOOR = 20;
const HEIGHT = 27;
const L = level({
  key: 'powers',
  name: 'The Beis Medrash (greybox)',
  width: 190,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x1a1426',
});

L.spawnAt(3);

// --- A — the four forms, two boxes each -------------------------------------
L.ground(0, 46);
L.sign(2, [
  'X SWINGS, THROWS, OR NOTHING — IT DEPENDS ON THE FORM',
  'cholent grows.  menorah throws.  lulav swings.  peyos flies.',
]);
[
  ['cholent', 10],
  ['menorah', 18],
  ['lulav', 26],
  ['peyos', 34],
].forEach(([form, x]) => {
  L.block(x, 16, 'mystery', form);
  L.block(x + 2, 16, 'mystery', form);
  L.label(x, 18, form.toUpperCase());
});

// --- B — things to hit. Pigeons at ground level, so a rolling flame finds them.
L.ground(50, 40);
L.sign(51, ['B  TARGETS', 'flames bounce and roll. the lulav hits harder, but only up close.']);
for (const x of [58, 64, 70, 76, 82]) L.enemy(x, 19);
L.coinRow(56, 17, 6);

// --- C — a wall only Peyos gets over ----------------------------------------
L.ground(94, 12);
L.sign(95, ['C  PEYOS ONLY', 'hold jump after the top of a jump and keep going up.']);
L.slab(100, 6, 6, FLOOR - 6, 'wall');
L.ground(110, 30);
L.coinRow(106, 8, 4);
L.checkpoint(112);

// --- D — a gap far too wide to jump, and a perch to fly to -------------------
L.sign(113, ['D  FLY IT', 'flight refills the moment you land.']);
L.slab(126, 12, 6, 1);
L.coinRow(126, 10, 6);
L.ground(146, 20);
L.slab(136, 9, 5, 1);

// --- E — a L'chaim, and a heap of tzedakah ----------------------------------
L.ground(170, 20);
L.sign(171, ['E  L\'CHAIM AND TZEDAKAH', '100 coins is an extra life.']);
L.block(174, 16, 'mystery', 'lchaim');
for (let row = 0; row < 3; row += 1) L.coinRow(178, 18 - row * 2, 8);
L.goalAt(187);

export default L.build();
