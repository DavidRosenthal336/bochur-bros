import { level } from '../level-builder.mjs';

/**
 * 3-2 — The Lake.
 *
 * "Canoes, rope swing, frogs, mud." (§6)
 *
 * ## The lake is the level
 *
 * 3-1 taught that the roofs are the road. This is what happens when the road
 * runs out: a body of water too wide to jump, with three things on it that can
 * be stood on and one rope to get to them.
 *
 * The swim system from 2-3 does the rest, and that is deliberate — a player who
 * falls in does not die, they swim, and swimming to the far shore is always
 * available and always slower than the crossing above it. §7 asks for fair and
 * learnable, and a lake you can simply swim is the fairest possible floor under
 * a level about not falling in.
 *
 * ## The four new things
 *
 * **Mud** (tile 18), before the water, because §6 puts it in this level and
 * because the shore is where mud belongs. It takes sixty per cent of your speed
 * while your feet are in it and nothing at all from your jump — so the answer to
 * a mud patch is to be in the air, which is a thing this game has spent two
 * worlds teaching.
 *
 * **Frogs** (tile 30 onward). §6: "hop in arcs near the lake. Bounceable." They
 * sit still most of the time, which is what makes them something you can plan to
 * land on, and landing on one throws you 520 — twice a stomp and most of a
 * trampoline. The one at 118 is the only way to the high coins.
 *
 * **Canoes** (tiles 46, 62, 88). Floating platforms that drift between the ends
 * of their water and cannot hurt you. The first is in a narrow inlet so it can
 * only go two tiles; the pair at 88 drift in opposite directions across the
 * widest part of the lake, which is the crossing this level is about.
 *
 * **The rope swing** (tile 74). Tied to a branch over the deepest water, hanging
 * where somebody standing on the jetty can reach it. It is a pendulum, so when
 * you let go decides where you land: at the bottom of the arc you go flat and
 * fast, near the top you go high and short, and holding a direction pumps it
 * higher than it was hung to reach. Nothing else in the game rewards patience
 * mid-air.
 *
 * ## Both brothers
 *
 * The swim split from 2-3 comes back for free — Mendy strokes higher, Berel
 * walks along the bottom — and there is one grey block on the lake bed at 96
 * that only Berel opens, in a level where getting down to it is easy and getting
 * back up is the interesting part. Nothing is locked: every crossing here can be
 * swum by either of them.
 *
 * Every rise is two tiles and butted, which is 3-1's rule and now the world's.
 */
const HEIGHT = 30;
const WIDTH = 252;

/** The shore. */
const FLOOR = 22;
/** A jetty or a rock: two tiles up, which both brothers clear standing. */
const STEP = FLOOR - 2;
/** A porch or a high rock. Two above that. */
const HIGH = STEP - 2;
/** The surface of the lake. Three rows below the shore, so it reads as a basin. */
const WATER = FLOOR + 1;
/** The lake bed. */
const BED = 27;

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

/** A rock or a jetty post: a thin solid you land on, open underneath. */
const rock = (x, w, top = STEP) => L.slab(x, top, w, 1, 'platform');

/**
 * An island: solid from just above the waterline all the way to the bed.
 *
 * These are what make the canoes work, and they were the level's second
 * golf-cart bug. A canoe is a roller, a roller only turns at a wall, and a lake
 * has no walls — so the first draft's four canoes drifted away from their
 * compartments and out of the level, exactly as the first draft's golf cart drove
 * the length of 3-1. Water is not a boundary to anything.
 *
 * So every canoe has an island at each end of its run, and every island is a
 * place to stand: their tops are level with the shore, one row above the water,
 * so climbing out of the lake onto one is sixteen pixels and within anybody's
 * jump out of the water (§6, 2-3).
 */
const island = (x, w) => {
  L.slab(x, FLOOR, w, BED - FLOOR, 'ground');
  /**
   * The shoreline, and the reason both brothers used to drown here.
   *
   * An island whose sides are sheer from the waterline to the bed is a wall to a
   * swimmer. Driven end to end, Mendy stalled at the island before the jetty and
   * Berel at the one in the first inlet, and each spent the rest of the run —
   * eighty seconds — bobbing against a rock it could not get onto. Getting out
   * of water is the one thing 2-3 had to solve too, and it solved it with pool
   * edges built for it; a lake needs the same courtesy.
   *
   * So every island gets a shelf a tile wide on each side, one tile thick, whose
   * top sits exactly on the water's surface. A swimmer bumping into it is
   * already standing on it — nothing to climb — and from there the island top is
   * a sixteen-pixel step.
   *
   * Deliberately one tile thick rather than solid to the bed. A canoe's hull
   * occupies the seven pixels directly above the surface, so its bottom edge and
   * this shelf's top edge meet at exactly the same line and never overlap:
   * Arcade needs real overlap to collide, so the shelf catches swimmers without
   * beaching the boats.
   */
  L.slab(x - 1, WATER, 1, 1, 'pool');
  L.slab(x + w, WATER, 1, 1, 'pool');
};

/**
 * A stretch of lake.
 *
 * The bed and both walls, then the water in the hole they make. A pool needs
 * building before it needs filling — 2-3 learned that the hard way, with a
 * player swimming out through the bottom of the level.
 */
const lake = (x, w) => {
  L.slab(x, BED, w, HEIGHT - BED, 'pool');
  L.water(x, WATER, w, BED - WATER);
};

// ---------------------------------------------------------------------------
// The shore. Mud, and the first frogs.
// ---------------------------------------------------------------------------
L.ground(0, 26);

L.sign(2, [
  'THE LAKE',
  'the mud is slow. your jump is not.',
  'FROGS BOUNCE YOU. CANOES CARRY YOU.',
], 15);

L.coinRow(8, on(FLOOR), 4);

/**
 * The first mud, on open ground with nothing in it.
 *
 * Six tiles of it and a coin on the far side, so the only thing it costs is the
 * two seconds it takes to learn what it does. §6: "slows movement to a crawl."
 * Jumping is untouched, which is both the answer to mud and a safety property —
 * mud that shortened a jump would make a walled mud patch somewhere you cannot
 * get out of, and the build-time trap check cannot see mud, because mud is not
 * geometry.
 */
L.mud(14, FLOOR, 6);
L.label(14, on(FLOOR) - 2, 'SLOW');
L.coinRow(20, on(FLOOR), 3);

L.checkpoint(24);

// ---------------------------------------------------------------------------
// The near shallows: a frog, and the first canoe in an inlet.
// ---------------------------------------------------------------------------
lake(26, 20);
rock(26, 2);
rock(32, 3);
L.coinRow(32, on(STEP), 3);

/**
 * The first frog, on a rock with nowhere to fall.
 *
 * §6 calls frogs bounceable, so the first one is introduced as a platform rather
 * than as a threat: it sits on a rock in the shallows, it hops a tile and a half
 * either way, and landing on it throws you across the inlet. It takes two hits,
 * so the bounce does not cost you the bouncer.
 */
L.enemy(33, STEP, 'frog');
L.label(30, on(HIGH) - 1, 'LAND ON IT');

/**
 * The first canoe, in an inlet six tiles wide.
 *
 * Deliberately the shortest beat in the level: the shore walls it on the left
 * and the island at 44 walls it on the right, so it crosses its water in about
 * five seconds and comes back. A first canoe should be a thing you can stand and
 * watch a full cycle of before you step onto it.
 */
L.hazard('canoe', 38, WATER, 1);
island(44, 2);
L.coinRow(44, on(FLOOR), 2);

// ---------------------------------------------------------------------------
// The jetty, and the rope over the deep water.
// ---------------------------------------------------------------------------
lake(46, 30);
L.slab(50, STEP, 8, 1, 'platform');
L.coinRow(51, on(STEP), 6);
L.enemy(54, STEP, 'frog');

// The second canoe, between the island at 60 and the one under the jetty's
// near end at 68. Twelve tiles, which is long enough that you wait for it.
island(60, 2);
L.coinRow(60, on(FLOOR), 2);
L.hazard('canoe', 64, WATER, -1);
island(68, 2);

/**
 * The jetty, and the rope.
 *
 * The rope is tied four rows above the jetty and hangs three tiles, which puts
 * the knot at about the head height of somebody standing on the end of the
 * planking — a rope you have to jump blind for is a rope players walk past. It
 * leans towards the near shore so it is reaching for you when you arrive.
 *
 * You are airborne when you catch it, always: a rope that can be grabbed with
 * your feet down is a rope that grabs you as you walk under it.
 */
L.slab(70, STEP, 6, 1, 'platform');
L.coinRow(70, on(STEP), 3);
L.sign(68, ['JUMP FOR THE ROPE. JUMP AGAIN TO LET GO.'], on(HIGH) - 2);
/**
 * The rope hangs over the end of the planking, not past it.
 *
 * Tied nine tiles up and hanging nine, leaning back towards the shore, so the
 * knot sits at about the head height of somebody standing on the last plank —
 * and the catchable stretch of rope runs from there up to nearly the branch.
 * You jump straight up for it.
 *
 * Hung one tile past the end of the jetty instead, it was never caught once in
 * six attempts: a running jump is already 48px above the knot by the time it
 * has travelled the 24px to reach it. A rope has to be where the jump is, not
 * where the walking was.
 */
L.swing(74, STEP - 10, 9, -2);
L.coinRow(80, STEP - 4, 3);

// ---------------------------------------------------------------------------
// The middle of the lake: two canoes going opposite ways.
// ---------------------------------------------------------------------------
lake(76, 34);
/**
 * Where the rope puts you.
 *
 * Five tiles wide rather than three. Measured, a swing off the jetty lands
 * anywhere between tile 76 and tile 91 depending on when you let go — that
 * spread is the mechanic and not a fault — but a three-tile island inside a
 * sixteen-tile spread is a level asking for frame-accurate timing on the first
 * rope in the game. Five tiles makes a decent release land and a poor one swim.
 */
island(84, 5);
L.coinRow(84, on(FLOOR), 5);

/**
 * The crossing.
 *
 * Two canoes on the same water going opposite ways, which means the gap between
 * them opens and closes on a cycle you can watch from the rock at 84 before you
 * commit to it. Neither can hurt you and neither sinks; the cost of a mistake is
 * a swim, and the swim is always there.
 */
L.hazard('canoe', 92, WATER, 1);
island(98, 3);
L.coinRow(98, on(FLOOR), 3);
L.hazard('canoe', 102, WATER, -1);

/**
 * On the lake bed, under all of it: a grey block only Berel opens (§4).
 *
 * Down is easy and up is the work, which is the right shape for a reward at the
 * bottom of a lake. There is a coin trail leading to it so that a player who
 * dives once finds out it was worth diving.
 */
L.block(96, BED - 1, 'reinforced', 'lchaim');
L.coin(94, BED - 1);
L.coin(98, BED - 1);

island(106, 4);
L.coinRow(106, on(FLOOR), 4);

L.checkpoint(112);

// ---------------------------------------------------------------------------
// The far shore: mud, frogs, and the way up.
// ---------------------------------------------------------------------------
L.ground(110, 36);
L.mud(120, FLOOR, 7);
L.coinRow(120, on(FLOOR) - 2, 7);

/**
 * The frog that is a staircase.
 *
 * Four tiles above the shore is past everybody's standing jump, and the frog on
 * the rock below it is worth 520 upward — so the coins and the Menorah up there
 * are reachable by either brother, and only by using the animal. §6 said
 * bounceable; this is what bounceable is for.
 */
L.enemy(118, FLOOR, 'frog');
rock(128, 4, HIGH);
L.coinRow(128, on(HIGH), 4);
L.block(132, HIGH - 2, 'mystery', 'menorah');

rock(136, 4);
L.coinRow(136, on(STEP), 4);

// ---------------------------------------------------------------------------
// The last water, the last swing, and the way out.
// ---------------------------------------------------------------------------
lake(146, 26);
L.slab(146, STEP, 4, 1, 'platform');
L.enemy(148, STEP, 'frog');
L.swing(149, STEP - 10, 9, -2);
L.coinRow(158, STEP - 5, 4);
island(160, 2);
L.coinRow(160, on(FLOOR), 2);
L.hazard('canoe', 164, WATER, 1);
island(170, 2);

L.ground(172, WIDTH - 172);
L.mud(176, FLOOR, 5);
L.enemy(182, FLOOR, 'frog');
L.coinRow(184, on(FLOOR), 4);

rock(190, 5);
L.coinRow(190, on(STEP), 5);
L.enemy(196, FLOOR, 'frog');

L.coinArc(202, on(FLOOR) - 2, 8);
L.coinRow(212, on(FLOOR), 6);
L.goalAt(220);

export default L.build();
