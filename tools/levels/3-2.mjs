import { level } from '../level-builder.mjs';

/**
 * 3-2 — The Lake.
 *
 * "Canoes, rope swing, frogs, mud." (§6)
 *
 * ## Four crossings, not one swim
 *
 * The first version of this level was forty-four per cent open water, and two
 * bots driving it end to end spent eighty and ninety-four per cent of their runs
 * swimming. That is the whole level report in one number: a lake you are *in* is
 * not a lake you *cross*, and §6 asks for the second — "canoes as floating
 * platforms, a rope swing to cross".
 *
 * So the shape is a shore with four crossings cut into it. Each is ten or twelve
 * tiles of water with one way over it, and between them there is twenty tiles of
 * ground to stand on, breathe, and see the next one coming. Falling in is a
 * setback and never a trap, because the water is only three rows deep and every
 * island has a shelf at the surface to climb out onto.
 *
 * ## The four new things
 *
 * **Mud** on the near shore, before any water, because the first thing §6's mud
 * should cost is two seconds and not a life. It takes sixty per cent of your
 * speed and nothing at all from your jump — measured at 64px against 130px of
 * clear ground over the same two seconds.
 *
 * **Canoes**, at the first and third crossings. Floating platforms that cannot
 * hurt you, bounded at each end by an island, because a roller only turns at a
 * wall and water is not one — the same bug as 3-1's golf cart and 1-1's shopping
 * cart before it. Measured: a rider is carried with the gap held to three pixels.
 *
 * **The rope swing**, at the second. A real pendulum: release at the bottom of
 * the arc and you go flat and fast, near the top and you go high and short, hold
 * a direction and you pump it higher than it was hung to reach. Measured, holding
 * on for four frames puts you back where you started and twenty-eight carries you
 * eleven tiles. It hangs over the planking rather than past it, because a jump is
 * already 48px above a knot hung at standing head height by the time it gets
 * there.
 *
 * **Frogs**, at the fourth, where they are the crossing rather than an obstacle.
 * §6 calls them bounceable and that is what bounceable is for: 56px of hop to
 * time, and a landing worth 87px of lift, against a stomp's 19px.
 *
 * ## Both brothers
 *
 * 2-3's swim split comes back for free — Mendy strokes higher, Berel walks the
 * bottom — and the grey block on the bed at 94 is Berel's alone, in the one place
 * where getting down is easy and getting back up is the interesting part. Every
 * crossing can be swum by either of them if it goes wrong.
 *
 * Every rise is two tiles and butted against what it climbs from, which is 3-1's
 * rule and now the world's.
 */
const HEIGHT = 30;
const WIDTH = 208;

/** The shore. */
const FLOOR = 22;
/** A rock or a jetty: two tiles up, which both brothers clear from standing. */
const STEP = FLOOR - 2;
/** Two above that, for the things only worth reaching on a bounce. */
const HIGH = STEP - 2;
/** The surface of the lake, one row below the shore. */
const WATER = FLOOR + 1;
/**
 * The lake bed: three rows down, so the water is 48px deep.
 *
 * Shallow on purpose. 2-3 is the level about deep water; this one is about
 * getting over it, and a bed a single stroke below the surface means falling in
 * costs a few seconds rather than a minute of bobbing.
 */
const BED = WATER + 3;

const on = (top) => top - 1;

const L = level({
  key: '3-2',
  name: 'The Lake',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x101c26',
  backdrop: 'catskills_day',
});

L.spawnAt(3);

/** A rock or a plank: a thin solid you land on, open underneath. */
const rock = (x, w, top = STEP) => L.slab(x, top, w, 1, 'platform');

/**
 * A crossing: the water, its bed, and a shelf at each shore you can climb onto.
 *
 * The shelves are the fix for the version of this level where both brothers
 * drowned. An island or a bank that is sheer from the waterline to the bed is a
 * wall to a swimmer — Mendy spent eighty seconds bobbing against one — so every
 * edge of every piece of water here has a tile at the surface to haul out onto,
 * and from there the shore is a sixteen-pixel step.
 *
 * One tile thick, which is load-bearing: a canoe's hull sits in the seven pixels
 * directly above the surface, so its bottom edge and a shelf's top edge lie on
 * the same line and never overlap. Arcade needs real overlap to collide, so the
 * shelves catch swimmers without beaching the boats.
 */
const crossing = (x, w) => {
  L.slab(x, BED, w, HEIGHT - BED, 'pool');
  L.water(x, WATER, w, BED - WATER);
  L.slab(x, WATER, 1, 1, 'pool');
  L.slab(x + w - 1, WATER, 1, 1, 'pool');
};

/** An island in a crossing: standable on top, with a shelf on each side. */
const island = (x, w) => {
  L.slab(x, FLOOR, w, BED - FLOOR, 'ground');
  L.slab(x - 1, WATER, 1, 1, 'pool');
  L.slab(x + w, WATER, 1, 1, 'pool');
};

// ---------------------------------------------------------------------------
// The near shore. Mud, a frog, and a long look at the first crossing.
// ---------------------------------------------------------------------------
L.ground(0, 30);

L.sign(2, [
  'THE LAKE',
  'the mud is slow. your jump is not.',
  'FROGS BOUNCE YOU. CANOES CARRY YOU.',
], 15);

L.coinRow(7, on(FLOOR), 4);
L.mud(12, FLOOR, 6);
L.label(12, on(FLOOR) - 2, 'SLOW');
L.coinRow(18, on(FLOOR), 3);
rock(22, 4);
L.coinRow(22, on(STEP), 4);
L.enemy(26, FLOOR, 'frog');
L.checkpoint(28);

// ---------------------------------------------------------------------------
// Crossing one: a canoe, ten tiles, an island in the middle.
// ---------------------------------------------------------------------------
crossing(30, 10);
island(34, 2);
L.coinRow(34, on(FLOOR), 2);
L.hazard('canoe', 32, WATER, 1);
L.hazard('canoe', 37, WATER, -1);

L.ground(40, 20);
L.coinArc(42, on(FLOOR) - 2, 8);
L.enemy(48, FLOOR, 'frog');
rock(52, 6);
L.coinRow(52, on(STEP), 6);
L.sign(50, ['JUMP FOR THE ROPE. JUMP AGAIN TO LET GO.'], on(HIGH) - 2);

// ---------------------------------------------------------------------------
// Crossing two: the rope. It hangs over the last plank you stand on.
// ---------------------------------------------------------------------------
rock(56, 4);
L.swing(58, STEP - 10, 9, -2);
crossing(60, 12);
L.coinRow(64, STEP - 4, 4);
island(66, 2);
L.coinRow(66, on(FLOOR), 2);

L.ground(72, 22);
L.checkpoint(74);
L.mud(78, FLOOR, 5);
L.coinRow(78, on(FLOOR) - 2, 5);
L.enemy(84, FLOOR, 'frog');
rock(88, 4);
L.coinRow(88, on(STEP), 4);

// ---------------------------------------------------------------------------
// Crossing three: two canoes going opposite ways, and something on the bed.
// ---------------------------------------------------------------------------
crossing(94, 12);
L.hazard('canoe', 97, WATER, 1);
L.hazard('canoe', 103, WATER, -1);

/**
 * On the bed, under the boats: a grey block only Berel opens (§4).
 *
 * Down is easy and up is the work, which is the right shape for a reward at the
 * bottom of a lake, and the water here is three rows deep so the trip back is a
 * stroke rather than an expedition.
 */
L.block(100, BED - 1, 'reinforced', 'lchaim');
L.coin(98, BED - 1);
L.coin(102, BED - 1);

L.ground(106, 24);
L.enemy(110, FLOOR, 'frog');
L.coinRow(112, on(FLOOR), 4);

/**
 * The frog that is a staircase.
 *
 * Four tiles above the shore is past everybody's standing jump, and a landing on
 * the frog below is worth 87px — so the Menorah up there is reachable by either
 * brother, and only by using the animal.
 */
L.enemy(118, FLOOR, 'frog');
rock(120, 4, HIGH);
L.coinRow(120, on(HIGH), 4);
L.block(124, HIGH - 2, 'mystery', 'menorah');
rock(126, 4);
L.coinRow(126, on(STEP), 4);

// ---------------------------------------------------------------------------
// Crossing four: frogs on rocks, and one more rope for the last of it.
// ---------------------------------------------------------------------------
crossing(130, 12);
island(134, 3);
L.enemy(135, FLOOR, 'frog');
L.coinRow(134, on(FLOOR), 3);
L.hazard('canoe', 139, WATER, -1);

L.ground(142, 18);
rock(146, 4);
L.swing(148, STEP - 10, 9, -2);
L.coinRow(150, STEP - 4, 4);

crossing(160, 10);
island(164, 2);
L.coinRow(164, on(FLOOR), 2);
L.hazard('canoe', 162, WATER, 1);

// ---------------------------------------------------------------------------
// The far shore, and the way out.
// ---------------------------------------------------------------------------
L.ground(170, WIDTH - 170);
L.mud(174, FLOOR, 5);
L.enemy(180, FLOOR, 'frog');
L.coinRow(182, on(FLOOR), 4);
rock(186, 5);
L.coinRow(186, on(STEP), 5);
L.coinArc(192, on(FLOOR) - 2, 8);
L.goalAt(202);

export default L.build();
