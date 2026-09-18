import { level } from '../level-builder.mjs';

/**
 * 1-1 — Thirteenth Avenue.
 *
 * "Gentle intro. Pigeons, awnings, first Cholent box, teaches stomping and
 * boxes." (§6)
 *
 * Rebuilt at half again the length, with the rest of World 1's cast in it.
 * The old version taught three things and stopped; this one teaches them in
 * the same order and then spends the back half using them — rats, carts, a
 * van, falling pipes, and a stretch where the street splits in two.
 *
 * ## What it is still careful about
 *
 * **Nothing can kill you before the first checkpoint.** The teaching order is
 * unchanged: coins, a box, the Cholent, a pigeon on open ground, a pigeon over
 * a gap, then several at once.
 *
 * **Gaps stay at two tiles.** A walking jump clears three at the limit, and
 * the first level of the game is no place to spend that margin. Three-tile
 * gaps arrive in 1-3, at speed, on purpose.
 *
 * **Pigeons perch on row 16 or lower.** Standing on the pavement the camera
 * shows row 14.4 down, so a pigeon any higher is a pigeon that arrives without
 * ever having been on screen, which is not a warning.
 *
 * ## What is new
 *
 * **The street splits.** Tiles 118 to 158 have an upper route along the
 * awnings and a lower one along the pavement. The high road pays better and
 * has further to fall; the low road is flat and has the rats on it. Both come
 * out at the same place, because a fork you can be stuck on is a trap.
 *
 * **A trench under the pavement**, roofed with planks that only give way to a
 * ground pound — Berel's, and nobody else's (§4). What is down there is a life
 * and a pile of coins, and there is no way to need it.
 *
 * **The hazards get their own paragraphs**: a cart to ride, a van whose roof
 * is the way past it, and a scaffold that drops pipes. §6 is explicit that the
 * player "must climb the thing trying to kill them", and 1-1 now says so once
 * before 1-3 says it three times at speed.
 */
const FLOOR = 20;
const HEIGHT = 27;
const WIDTH = 322;

const L = level({
  key: '1-1',
  name: 'Thirteenth Avenue',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x1b1524',
  backdrop: 'day',
});

L.spawnAt(3);

// --- Coins, and the shape of a jump -----------------------------------------
L.ground(0, 26);
L.sign(3, ['THIRTEENTH AVENUE']);
L.coinRow(7, 18, 3);
L.coinArc(13, 17, 6);

// --- The first box, then the Cholent ----------------------------------------
L.block(22, 16, 'mystery', 'coin');
L.ground(26, 22);
L.block(30, 16, 'mystery', 'cholent');
L.bricks(33, 16, 2);
L.coinRow(33, 14, 2);
L.ledge(38, 17, 4);
L.coinRow(38, 15, 4);

// --- One pigeon, on open ground, with room to miss ---------------------------
L.ground(50, 28);
L.enemy(58, 16);
L.coinRow(55, 18, 3);
L.checkpoint(64);
L.sign(53, ['LAND ON TOP OF A PIGEON'], 16);

// --- A cart, and the rule the rest of the world runs on ----------------------
//
// §6: the player "must climb the thing trying to kill them". Walking into a
// cart hurts; standing on it is a ride. It is introduced here, alone, on flat
// ground with nothing else happening, so that the van at tile 196 and the
// three in 1-3 are a thing you already know rather than a thing you discover
// at speed.
L.ground(80, 32);
L.sign(81, ['JUMP ON TOP OF IT'], 16);
L.hazard('cart', 104, FLOOR, -1);
L.coinRow(86, 18, 5);
L.block(93, 16, 'mystery', 'lchaim');

// --- The street splits -------------------------------------------------------
//
// Upper: awnings, four of them, with the coins and a box on top. Lower: flat
// pavement with the rats. They rejoin at tile 158.
L.ground(114, 46);
L.sign(115, ['TWO WAYS ALONG. BOTH WORK.'], 16);

L.bounce(120, 17, 3);
L.slab(126, 15, 5, 1);
L.coinRow(126, 13, 5);
L.slab(134, 14, 5, 1);
L.coinRow(134, 12, 5);
L.enemy(138, 11);
L.slab(142, 15, 5, 1);
L.coinRow(142, 13, 5);
L.block(148, 13, 'mystery', 'lchaim');
L.slab(150, 16, 4, 1);

for (const x of [124, 137, 150]) L.enemy(x, FLOOR, 'rat');
L.coinRow(128, 18, 4);
L.coinRow(144, 18, 4);

L.checkpoint(158);

// --- The trench --------------------------------------------------------------
//
// Planks over a hole. They hold up anything that walks on them and give way to
// a ground pound, so the coins and the life underneath belong to Berel — hold
// Down in mid-air (§4, §5).
//
// Two rows deep, because three is Berel's standing jump exactly and a secret
// you cannot climb out of is a punishment for finding it.
// Pavement, hole, pavement. The planks sit AT pavement level rather than a
// tile above it, so walking over them is walking down the street — a secret
// you can see is not one.
L.ground(162, 6);
L.slab(168, 23, 8, HEIGHT - 23);
L.ground(176, 8);
for (let i = 0; i < 8; i += 1) L.block(168 + i, FLOOR, 'weak');
L.coinRow(169, 22, 6);
L.block(172, 21, 'mystery', 'lchaim');
L.sign(163, ['BEREL: DOWN, IN MID-AIR'], 16);

// --- Rats and a second cart --------------------------------------------------
L.ground(186, 28);
for (const x of [190, 198, 206]) L.enemy(x, FLOOR, 'rat');
L.hazard('cart', 210, FLOOR, -1);
L.bounce(194, 17, 3);
L.coinRow(194, 14, 3);
L.block(202, 16, 'mystery', 'coin');

// --- The van -----------------------------------------------------------------
//
// It sits still, then lurches (§6). Its roof is a platform, and the gap after
// it is two tiles, so the roof is the comfortable way across rather than the
// only way.
L.ground(216, 24);
L.hazard('van', 228, FLOOR, -1);
L.sign(217, ['IT MOVES WHEN IT FEELS LIKE IT'], 16);
L.coinRow(220, 18, 4);
L.checkpoint(238);

// --- Scaffolding, and the shadow on the pavement -----------------------------
L.ground(242, 34);
L.slab(242, 12, 32, 1);
for (const x of [248, 255, 262, 268]) L.hazard('pipe', x, 12);
L.sign(243, ['A SHADOW MEANS A PIPE'], 16);
L.coinRow(250, 18, 6);
L.enemy(259, 16);
L.enemy(266, 16);

// --- The Menorah, and something to use it on ---------------------------------
L.ground(278, 44);
L.block(284, 16, 'mystery', 'menorah');
L.label(282, 18, 'MENORAH — PRESS X');
L.enemy(292, 16);
L.enemy(298, 17);
L.enemy(304, 16);
for (const x of [296, 302]) L.enemy(x, FLOOR, 'rat');
L.coinRow(294, 18, 8);
L.sign(308, ['TOUCH THE POST'], 16);
L.goalAt(316);

export default L.build();
