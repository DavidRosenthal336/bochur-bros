import { level } from '../level-builder.mjs';

/**
 * 1-1 — Thirteenth Avenue.
 *
 * "Gentle intro. Pigeons, awnings, first Cholent box, teaches stomping and
 * boxes." (§6)
 *
 * The teaching order is deliberate and each idea gets a safe rehearsal before
 * it is asked for under pressure: coins, then a box, then the Cholent, then a
 * single pigeon on open ground, then a pigeon over a gap, then several at once.
 * Nothing here can kill you until after the first checkpoint.
 *
 * Not yet: awnings bounce in the design doc but bounce pads are World 1 terrain
 * (Milestone 6), so they are platforms for now.
 */
const FLOOR = 20;
const HEIGHT = 27;
const L = level({
  key: '1-1',
  name: 'Thirteenth Avenue',
  width: 210,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x1b1524',
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

// --- One pigeon, on open ground, with room to miss.
// Pigeons perch on row 16. Standing on the floor the camera shows rows 14.4
// down, so anything higher than that is off the top of the screen — which is
// no warning at all. Perches stay inside the band you can see.
// ---------------------------------------------------------------------------
L.ground(50, 27);
L.enemy(58, 16);
L.coinRow(55, 18, 3);
L.checkpoint(64);
L.sign(53, ['LAND ON TOP OF A PIGEON'], 16);

// --- Awnings: a climb for coins, over solid ground. Falling off costs nothing
// here on purpose — this is where climbing gets introduced, not tested.
L.ground(77, 25);
L.ledge(80, 17, 3);
L.ledge(85, 15, 3);
L.ledge(90, 13, 3);
L.coinRow(90, 11, 3);
L.enemy(86, 11);

// --- The first real gaps. Two tiles: a walk clears three, so two is a gap you
// can be sloppy about. They widen to three after the next checkpoint.
L.ground(104, 10);
L.coinArc(104, 18, 6);
L.ground(116, 10);
// This stretch is long enough that being knocked back by a pigeon cannot put
// you in a pit. The short ledges between pits are deliberately left empty.
L.ground(128, 15);
L.enemy(134, 16);
L.block(133, 16, 'mystery', 'coin');
L.block(136, 16, 'mystery', 'lchaim');
L.checkpoint(140);

// --- Pigeons over the gaps now. Still two tiles: a walking jump clears three
// at the very limit, and the first level of the game is no place to spend it.
L.ground(145, 13);
L.enemy(150, 16);
L.bricks(152, 15, 3);
L.coinRow(152, 13, 3);
L.ground(160, 11);
L.ledge(165, 17, 4);
L.coinRow(165, 15, 4);

// --- Home straight ----------------------------------------------------------
L.ground(173, 37);
// The first power form the game hands you, on a long safe straight with two
// pigeons past it to try it on.
L.block(180, 16, 'mystery', 'menorah');
L.label(178, 18, 'MENORAH — PRESS X');
L.enemy(188, 16);
L.enemy(196, 17);
L.coinRow(192, 18, 6);
L.sign(198, ['TOUCH THE POST'], 16);
L.goalAt(204);

export default L.build();
