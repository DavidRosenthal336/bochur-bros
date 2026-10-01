import { level } from '../level-builder.mjs';

/**
 * 4-2 — The Shuk.
 *
 * "Crates, carts, awnings, geckos. Heavy Berel usage." (§6) And from the World 4
 * hazards: "shuk crates and carts to climb, push, and knock over (Berel pushes
 * the heavy ones)."
 *
 * ## Berel's level
 *
 * Every world so far has given each brother something. This one is weighted,
 * on purpose, because §6 says so: the shuk is crates and carts, and only Berel
 * can move them (§4). So the level is a sequence of things that are better as
 * Berel, and one that *needs* him.
 *
 * **The passage at 30.** A covered way under a building, with a crate in it.
 * There is no going over — the building is nine tiles high — and Mendy cannot
 * budge the crate. Berel shoves it through and out the far end, where it drops
 * into the gap there, and the way is open for both. Swapping is free and
 * instant, so this is a door with a handle rather than a lock: it is the same
 * deal as the dent in the Escalade's roof.
 *
 * **The cart at 82.** A shuk cart on wheels, which a shove sends rolling. The
 * stall roof beyond it is three tiles up — inside Mendy's jump and exactly the
 * height of Berel's, which fails — and a cart run up against it is the step that
 * gets Berel up. Mendy can make the climb alone; Berel cannot without the cart,
 * and Mendy cannot move the cart. Each brother has the half of the answer the
 * other one lacks.
 *
 * **The cellar at 124.** A weak floor that only Berel's ground pound breaks,
 * over a cellar with the coins and the spare life in it. Optional.
 *
 * **The grey ceiling at 64.** Reinforced boxes only Berel's head breaks, with a
 * power-up behind them. Optional.
 *
 * ## The geckos, and the awnings
 *
 * Geckos live on the stall walls (§6: "cling to stone walls, scurry when
 * approached"), creeping up and down the stone and bolting when you come near —
 * not at you, away from you, which is the trouble: a wall you are jumping past
 * has something on it, and it moves when you arrive. The awnings over the
 * stalls are the shuk's own and bounce you as Boro Park's did.
 */
const HEIGHT = 29;
const WIDTH = 232;

const FLOOR = 22;
const on = (top) => top - 1;

const L = level({
  key: '4-2',
  name: 'The Shuk',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  // The street base in the near backdrop, for the same reason as 4-1.
  background: '0xbcaa8a',
  backdrop: 'meah_shearim_day',
});

L.spawnAt(3);

/**
 * A market stall: two tiles of stone wall with an awning over the top.
 *
 * Always two tiles, and there is no height argument any more, because the first
 * draft had one and used it. Stalls four tiles tall gave the geckos a tall face
 * to climb — and were walls across the alley that Berel could not get over: his
 * running jump is 59px and four tiles is 64. Driven as him, the run reached the
 * first one and died sixteen times at its foot, jumping into the gecko it could
 * not get past. It is 3-1's lesson again, and World 3 wrote it down: every rise
 * is two tiles. A gecko needs a wall to sit on, not a tall one.
 */
const stall = (x, w) => {
  L.slab(x, FLOOR - 2, w, 2, 'wall');
  L.bounce(x, FLOOR - 3, w);
};

/** A gecko on the near face of a stall at `x`, a tile up the stone. */
const gecko = (x) => L.enemy(x - 1, FLOOR - 1, 'gecko');

// ---------------------------------------------------------------------------
// The way in.
// ---------------------------------------------------------------------------
L.ground(0, 45);
L.sign(1, [
  'THE SHUK',
  'berel shoves the crates. mendy cannot.',
  'SWAP IS FREE. USE IT.',
], 15);
L.coinRow(6, on(FLOOR), 4);
stall(12, 4);
L.coinRow(12, FLOOR - 7, 4);
L.enemy(20, FLOOR, 'cat');
L.checkpoint(24);

// ---------------------------------------------------------------------------
// The passage at 30: a crate in a covered way, and only Berel can shift it.
// ---------------------------------------------------------------------------
/**
 * The building over the passage: from three tiles above the street to the top
 * of the screen, so there is no way over. Three tiles of headroom underneath,
 * which the tallest form fits through standing.
 */
L.slab(30, FLOOR - 13, 14, 10, 'wall');
L.slab(30, FLOOR - 4, 14, 1, 'arch');
L.crate(33);
L.label(26, on(FLOOR) - 4, 'BEREL: PUSH');
L.coinRow(36, on(FLOOR), 6);

// The gap the crate goes into on the far side. A walking jump, as every pit is.
L.ground(48, 34);
L.checkpoint(50);

// ---------------------------------------------------------------------------
// Stalls, geckos, and a grey ceiling.
// ---------------------------------------------------------------------------
stall(54, 3);
gecko(54);
L.coinRow(54, FLOOR - 7, 3);

/**
 * Grey boxes, only Berel's head breaks them (§4), with a Lulav behind the
 * middle one. A row of them at reaching height over open ground, so there is
 * nothing to lose by trying them as Mendy and finding out.
 */
L.block(62, FLOOR - 4, 'reinforced', 'coin');
L.block(63, FLOOR - 4, 'reinforced', 'lulav');
L.block(64, FLOOR - 4, 'reinforced', 'coin');
L.label(60, FLOOR - 7, 'GREY BOXES: BEREL');

stall(70, 3);
gecko(70);
L.enemy(73, FLOOR - 1, 'gecko');
L.coinRow(70, FLOOR - 7, 3);
L.enemy(77, FLOOR, 'cat');

// ---------------------------------------------------------------------------
// The cart at 82, and a roof that is one brother's half of a step each.
// ---------------------------------------------------------------------------
L.cart(84);
L.label(80, on(FLOOR) - 4, 'IT ROLLS');

/**
 * Three tiles up — a 48px rise, which is Mendy's walk with room to spare and
 * Berel's standing jump exactly, which fails. A cart run up against the wall is
 * thirteen pixels of step, and from the cart it is thirty-five, which Berel
 * clears. The coins and the Cholent up there are worth the shove.
 */
L.slab(94, FLOOR - 3, 8, 3, 'roof');
L.coinRow(94, on(FLOOR - 3), 8);
L.block(98, FLOOR - 7, 'mystery', 'cholent');
L.ground(82, 30);
L.checkpoint(104);

// ---------------------------------------------------------------------------
// A crate to tip into a gap, and the cellar.
// ---------------------------------------------------------------------------
L.crate(108);
L.ground(115, 9);
// Shove the crate into the gap at 112 and it fills the near half of it.
L.coinArc(112, on(FLOOR) - 2, 3);

/**
 * The cellar. A weak floor in the street, three tiles across, that only a
 * ground pound breaks (§4) — and under it, a room with coins and the spare life,
 * and stairs back up at the far end. Optional, which is why it is a reward and
 * not a route: nothing on the way to the goal is under the floor.
 */
L.ground(124, 2);
L.block(126, FLOOR, 'weak', 'coin');
L.block(127, FLOOR, 'weak', 'coin');
L.block(128, FLOOR, 'weak', 'coin');
/**
 * Four rows of room under the street, and the spare life set into the ceiling.
 *
 * The first draft had three rows with the box hanging in them, and the trap
 * check found sixteen pixels of headroom on top of the box — and steps "back up"
 * that climbed into the underside of the street, with no opening above them at
 * all. A cellar you can fall into and not leave. Now the box is part of the
 * ceiling, hit from below like any other, and the street stops two tiles short
 * of the far wall so the stairs come up into daylight.
 */
L.slab(126, FLOOR + 5, 14, 2, 'ground');
L.slab(129, FLOOR, 4, 1, 'ground');
L.block(133, FLOOR, 'mystery', 'lchaim');
L.slab(134, FLOOR, 4, 1, 'ground');
L.coinRow(127, FLOOR + 3, 10);
// Two steps of two tiles, up into the open.
L.slab(138, FLOOR + 3, 1, 2, 'ground');
L.slab(139, FLOOR + 1, 1, 4, 'ground');
L.ground(140, 50);
L.label(124, on(FLOOR) - 3, 'BEREL: JUMP, THEN DOWN');

// ---------------------------------------------------------------------------
// The market proper: awnings to bounce along, and everything at once.
// ---------------------------------------------------------------------------
L.checkpoint(146);
stall(150, 4);
stall(158, 4);
stall(166, 4);
L.coinRow(150, FLOOR - 7, 4);
L.coinRow(158, FLOOR - 8, 4);
L.coinRow(166, FLOOR - 7, 4);
L.enemy(156, FLOOR, 'cat');
L.enemy(164, FLOOR, 'cat');
gecko(150);
gecko(166);

L.crate(178);
L.coinRow(180, on(FLOOR), 4);
L.ground(193, WIDTH - 193);
L.checkpoint(196);
stall(200, 5);
gecko(200);
L.coinRow(200, FLOOR - 7, 5);
L.coinArc(208, on(FLOOR) - 2, 8);
L.goalAt(224);

export default L.build();
