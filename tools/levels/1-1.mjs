import { level } from '../level-builder.mjs';

/**
 * 1-1 — Thirteenth Avenue.
 *
 * "Gentle intro. Pigeons, awnings, first Cholent box, teaches stomping and
 * boxes." (§6)
 *
 * Rebuilt against LEVELS.md after the first real playtest. The old version
 * was not short by the numbers — 322 tiles — but it felt short, because it
 * was flat, the first fifty tiles had nothing in them, and both carts had
 * rolled off into pits before the player arrived. This one is a third longer
 * and there is something to do every twenty tiles.
 *
 * ## The order of lessons
 *
 * Coins and the shape of a jump. A box, then the Cholent. A ledge. One pigeon,
 * alone, with a sign. A checkpoint. One rat, alone, with a sign; then two with
 * a ledge between them. A cart, alone, with a sign. The street splits. A
 * checkpoint. The trench, which is Berel's. Rats and a second cart. The van.
 * A checkpoint. The scaffolding and its pipes, with pigeons under it. The
 * Menorah, and a flock to use it on. The post.
 *
 * Every new thing is met on its own first. Nothing can kill you before the
 * first checkpoint.
 *
 * ## What is enforced
 *
 * Gaps are two tiles, all of them: a walking jump clears three at the limit,
 * and the first level of the game is no place to spend that margin. Rises are
 * two rows. Pigeons perch on row 16 or lower. Every checkpoint has eight
 * clear tiles either side and no cart on its stretch of floor; the van is
 * twenty tiles from the checkpoint after it, because it lurches ten.
 */
const FLOOR = 20;
/**
 * Where the pipes hang: on a rope from the scaffolding, with the bottom of the
 * pipe just over head height. On this street the camera shows about ninety
 * pixels above the pavement, so a pipe hung any higher is off the top of the
 * screen — and on top of the plank, where they first were, they could not be
 * seen at all until they were already falling. Hanging, a pipe is scenery you
 * can jump into; only a falling one hurts.
 */
const PIPE_ROW = FLOOR - 2;
const HEIGHT = 27;
const WIDTH = 426;

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
L.block(22, 16, 'mystery', 'coin');

// --- The Cholent, and a step up ----------------------------------------------
L.ground(28, 24);
L.sign(29, ['HIT THE BOX FROM BELOW'], 16);
L.block(32, 16, 'mystery', 'cholent');
L.bricks(35, 16, 2);
L.coinRow(35, 14, 2);
// Two rows: every rise in the game is climbable by Berel from a standing start.
L.ledge(42, 18, 4);
L.coinRow(42, 16, 4);

// --- One pigeon, on open ground, with room to miss ---------------------------
L.ground(54, 30);
L.sign(56, ['LAND ON TOP OF A PIGEON'], 16);
// Twelve tiles past the gap: the arc of the jump over it is long finished.
L.enemy(66, 16);
L.coinRow(58, 18, 3);
L.coinRow(72, 18, 4);
L.checkpoint(76);

// --- One rat, then two -------------------------------------------------------
//
// The rat is the ground grunt: it walks, slowly, and turns at the ends of its
// floor. Step on it. The first is alone; the next two have a ledge between
// them, which is the first time the level asks you to choose between going
// over something and going through it.
L.ground(86, 34);
L.sign(88, ['STEP ON A RAT'], 16);
L.enemy(96, FLOOR, 'rat');
L.coinRow(92, 18, 4);
L.block(100, 16, 'mystery', 'coin');
L.ledge(104, 18, 3);
L.coinRow(104, 16, 3);
L.enemy(112, FLOOR, 'rat');
L.enemy(118, FLOOR, 'rat');

// --- A cart, and the rule the rest of the world runs on ----------------------
//
// §6: the player "must climb the thing trying to kill them". Walking into a
// cart hurts; standing on it is a ride. It is introduced here, alone, on its
// own stretch of pavement with nothing else on it, so that the van and the
// carts of 1-3 are a thing you already know rather than a thing you discover
// at speed. It sleeps until you are near and turns at the ends of its floor,
// so it is here when you get here.
L.ground(122, 38);
L.sign(124, ['JUMP ON TOP OF IT'], 16);
L.hazard('cart', 150, FLOOR, -1);
L.coinRow(128, 18, 5);
L.block(136, 16, 'mystery', 'cholent');

// --- The street splits -------------------------------------------------------
//
// Upper: awnings, with the coins and a box on top. Lower: flat pavement with
// the rats. They rejoin at the trench. The checkpoint is on this stretch and
// the cart is not: a roller never shares a floor with a checkpoint. The floor
// runs six tiles past the last awning, so dropping off it lands on pavement
// and not in the gap after — Berel's shorter drop found that one.
L.ground(162, 46);
L.checkpoint(166);
L.sign(168, ['TWO WAYS ALONG. BOTH WORK.'], 16);

L.bounce(172, 17, 3);
L.slab(176, 15, 5, 1);
L.coinRow(176, 13, 5);
L.slab(184, 14, 5, 1);
L.coinRow(184, 12, 5);
L.enemy(189, 11);
L.slab(192, 15, 5, 1);
L.coinRow(192, 13, 5);
L.block(198, 13, 'mystery', 'lchaim');
L.slab(198, 16, 4, 1);

for (const x of [180, 192, 204]) L.enemy(x, FLOOR, 'rat');
L.coinRow(182, 18, 4);
L.coinRow(196, 18, 4);

// --- The trench --------------------------------------------------------------
//
// Planks over a hole. They hold up anything that walks on them and give way to
// a ground pound, so the coins and the life underneath belong to Berel — hold
// Down in mid-air (§4, §5).
//
// Two rows deep, because three is Berel's standing jump exactly and a secret
// you cannot climb out of is a punishment for finding it. The planks sit AT
// pavement level rather than a tile above it, so walking over them is walking
// down the street — a secret you can see is not one.
L.ground(210, 8);
L.slab(218, 23, 8, HEIGHT - 23);
L.ground(226, 10);
for (let i = 0; i < 8; i += 1) L.block(218 + i, FLOOR, 'weak');
L.coinRow(219, 22, 6);
L.block(222, 21, 'mystery', 'lchaim');
L.sign(211, ['BEREL: DOWN, IN MID-AIR'], 16);

// --- Rats under an awning ----------------------------------------------------
L.ground(238, 30);
L.checkpoint(242);
L.bounce(248, 17, 3);
L.coinRow(248, 14, 3);
for (const x of [252, 260]) L.enemy(x, FLOOR, 'rat');
L.block(256, 16, 'mystery', 'coin');

// --- A second cart, on a stretch of its own ----------------------------------
L.ground(270, 26);
L.hazard('cart', 290, FLOOR, -1);
L.coinRow(274, 18, 5);
L.bricks(280, 16, 3);
L.coinRow(280, 14, 3);

// --- The van -----------------------------------------------------------------
//
// It sits still, then lurches (§6). Its roof is a platform, and the gap after
// it is two tiles, so the roof is the comfortable way across rather than the
// only way.
L.ground(298, 26);
L.hazard('van', 310, FLOOR, -1);
L.sign(299, ['IT MOVES WHEN IT FEELS LIKE IT'], 16);
L.coinRow(302, 18, 4);

// --- Scaffolding, and the pipe that rattles first -----------------------------
L.ground(326, 40);
L.checkpoint(330);
L.coinRow(332, 18, 3);
L.slab(338, 12, 28, 1);
for (const x of [344, 351, 358]) L.hazard('pipe', x, PIPE_ROW);
L.sign(339, ['A RATTLING PIPE IS ABOUT TO FALL'], 16);
L.coinRow(346, 18, 6);
L.enemy(348, 16);
L.enemy(356, 16);

// --- The Menorah, and something to use it on ---------------------------------
L.ground(368, 58);
L.block(374, 16, 'mystery', 'menorah');
L.label(372, 18, 'MENORAH — PRESS X');
// Three, spread out — the most this level asks for at once. The Menorah
// is for the player who wants it to be none.
L.enemy(384, 16);
L.enemy(390, FLOOR, 'rat');
// Six tiles short of the ledge: a perched pigeon drifts three either way.
L.enemy(396, 16);
L.coinRow(386, 18, 8);
L.ledge(402, 18, 4);
L.coinRow(402, 16, 4);
L.sign(408, ['TOUCH THE POST'], 16);
L.goalAt(418);

export default L.build();
