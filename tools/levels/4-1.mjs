import { level } from '../level-builder.mjs';

/**
 * 4-1 — The Alleys.
 *
 * "Stone stairs, arches, cats, hamsin gusts." (§6) World 4 is "Jerusalem.
 * Stone, arches, bright sun, narrow alleys. Visually the furthest thing from
 * Brooklyn."
 *
 * ## A neighbourhood on a hill
 *
 * Boro Park was flat and the Catskills were roofs over a lawn. Meah Shearim is
 * built on a slope, so this level is terraces — a street, an upper alley, a
 * courtyard, a lower alley — joined by flights of stone stairs, with arches over
 * the passages. Nothing here is a gap you could not see coming: the stairs are
 * single steps of one tile, which either brother takes at a walk, and every
 * rise is a flight of them rather than a ledge to jump.
 *
 * ## The cats
 *
 * §6: "everywhere, in packs, on walls and bins, darting across the player's
 * path." A cat sits until you are close, hisses, and then goes flat out in one
 * direction, straight through where you were. It does not chase. The first one
 * is alone on a wall at tile 21 with the whole street to learn it on; then a
 * pair, then a pack of three on one wall, where the answer is the gap between
 * one dart and the next.
 *
 * ## The hamsin
 *
 * §6: "a hot wind that gusts and pushes the player off narrow ledges. Berel is
 * immune." Two and a quarter seconds of still air, seven hundred milliseconds
 * of pashkevilin lifting off the walls, then thirteen hundred of wind at 420 —
 * more than Mendy's footing can hold against. The first is over a courtyard
 * with nothing to fall into, so the lesson is the rhythm. The second is over
 * three narrow stretches of stone between pits, where the rhythm is the level.
 *
 * Berel walks straight through it, as he did the leaf blowers of 2-2. §6 asks
 * for this world to make you swap, and the hamsin is the first reason.
 *
 * ## The rules this world inherits
 *
 * Every rise a single step, every pit three tiles at most, arches leaving three
 * tiles of headroom so the tallest form fits under standing up. World 3 learned
 * each of those by breaking it.
 */
const HEIGHT = 30;
const WIDTH = 240;

/** The street. */
const STREET = 22;
/** The upper alleys: four steps up a flight of stairs. */
const UPPER = STREET - 4;

const on = (top) => top - 1;

const L = level({
  key: '4-1',
  name: 'The Alleys',
  width: WIDTH,
  height: HEIGHT,
  floorTop: STREET,
  /**
   * The colour of the street's base in the near backdrop, sampled from its
   * bottom six rows — not a dark brown.
   *
   * This is the first level built on a slope, and that exposes a parallax gap
   * every flat level hid: world tiles move one-for-one with the camera and the
   * near backdrop only four-tenths, so whenever the camera sits above the height
   * the backdrop was lined up for, a band opens between the buildings and the
   * ground. On the lower alley it was a dark stripe a third of the screen high.
   * Filling it with the backdrop's own base colour makes it read as more wall.
   * The general fix — pinning the layer to the ground line — would also change
   * how 1-2's climb looks, where that lag is the point.
   */
  background: '0xbcaa8a',
  backdrop: 'meah_shearim_day',
});

L.spawnAt(3);

/** A stretch of ground whose top is at `top`, down to the bottom of the map. */
const terrace = (x, w, top) => L.ground(x, w, top);

/**
 * A flight of stone stairs: `steps` steps of one tile each, two tiles deep,
 * rising to the right if `dir` is 1 and falling if it is -1.
 *
 * Each step is solid to the bottom of the map, so a flight is a hillside and
 * never a set of floating slabs — there is nothing underneath a staircase to get
 * into.
 */
const stairs = (x, from, steps, dir) => {
  for (let i = 0; i < steps; i += 1) {
    const top = dir > 0 ? from - 1 - i : from - steps + 1 + i;
    L.ground(x + i * 2, 2, top);
  }
};

/**
 * An arch over the passage: a lintel three tiles above the ground at `floor`,
 * with the building it carries above it.
 *
 * Three tiles of headroom because the tallest form in the game is Berel in
 * Cholent, and an arch you have to duck under is a ceiling.
 */
const arch = (x, w, floor) => {
  L.slab(x, floor - 4, w, 1, 'arch');
  L.slab(x, floor - 6, w, 2, 'wall');
};

/** A wall a cat can sit on: two tiles, climbable from standing. */
const wall = (x, w, floor) => L.slab(x, floor - 2, w, 2, 'wall');

// ---------------------------------------------------------------------------
// The street.
// ---------------------------------------------------------------------------
terrace(0, 28, STREET);
L.sign(1, [
  'MEAH SHEARIM',
  'the cats hiss before they run.',
  'THE WIND HAS A RHYTHM. WAIT FOR THE CALM.',
], 15);
L.coinRow(6, on(STREET), 4);
arch(10, 6, STREET);
L.block(13, STREET - 4 - 3, 'mystery', 'cholent');

/** The first cat: alone, on a wall, with the whole street to learn it on. */
wall(19, 4, STREET);
L.enemy(21, STREET - 2, 'cat');
L.coinRow(19, on(STREET - 2), 4);
L.checkpoint(25);

// ---------------------------------------------------------------------------
// Up the stairs to the upper alley.
// ---------------------------------------------------------------------------
stairs(28, STREET, 4, 1);
L.coinRow(28, on(STREET) - 2, 8);
terrace(36, 28, UPPER);
arch(40, 5, UPPER);
L.coinRow(40, on(UPPER), 5);

/** A pair, on one wall. */
wall(48, 4, UPPER);
L.enemy(49, UPPER - 2, 'cat');
L.enemy(51, UPPER - 2, 'cat');
L.coinRow(48, on(UPPER - 2), 4);
arch(56, 6, UPPER);
L.checkpoint(61, UPPER);

// ---------------------------------------------------------------------------
// The courtyard, and the first hamsin. Nothing to fall into.
// ---------------------------------------------------------------------------
terrace(64, 40, UPPER);

/**
 * The lesson in the rhythm.
 *
 * Thirty tiles of open courtyard with a gust across it from the right, and the
 * stone underneath it the whole way. What it costs Mendy is ground: walk into a
 * gust and you go backwards. What it costs Berel is nothing. There is a Peyos
 * box in the middle of it, which hovers you over the worst of the next one.
 */
L.hamsin(68, UPPER - 5, 30, 5, -1);
L.label(66, on(UPPER) - 4, 'HAMSIN');
L.coinArc(72, on(UPPER) - 2, 8);
L.block(84, UPPER - 4, 'mystery', 'peyos');
L.coinRow(88, on(UPPER), 6);
L.checkpoint(100, UPPER);

// ---------------------------------------------------------------------------
// Down the stairs to the lower alley, and a pack.
// ---------------------------------------------------------------------------
stairs(104, STREET, 4, -1);
terrace(112, 40, STREET);
arch(114, 5, STREET);
L.coinRow(114, on(STREET), 5);

/**
 * Three on one wall.
 *
 * Each goes when you come within five tiles of it, so walking along the wall
 * sets them off one after another rather than together. The answer to a pack
 * is the gap between one dart and the next, and the hiss is how you count it.
 */
wall(126, 9, STREET);
L.enemy(127, STREET - 2, 'cat');
L.enemy(130, STREET - 2, 'cat');
L.enemy(133, STREET - 2, 'cat');
L.coinRow(126, on(STREET - 2), 9);
arch(138, 6, STREET);
L.block(141, STREET - 4 - 3, 'mystery', 'lulav');
L.checkpoint(148);

// ---------------------------------------------------------------------------
// Three narrow stretches between pits, under the second hamsin.
// ---------------------------------------------------------------------------
/**
 * The exam. Three tiles of stone, a three-tile pit, three tiles of stone, and
 * so on, with a gust coming from the far end.
 *
 * A pit of three is a walking jump in still air and a fall in a gust, so the
 * whole crossing is timing: wait on the stone for the calm, then go. Berel does
 * not have to wait, and that is the level telling you to swap.
 */
terrace(152, 6, STREET);
terrace(161, 3, STREET);
terrace(167, 3, STREET);
terrace(173, 7, STREET);
L.hamsin(154, STREET - 5, 24, 5, -1);
L.coin(162, on(STREET));
L.coin(168, on(STREET));
L.label(150, on(STREET) - 4, 'BEREL IS IMMUNE');

terrace(180, 20, STREET);
L.checkpoint(182);
L.enemy(188, STREET, 'cat');
L.enemy(192, STREET, 'cat');
L.coinRow(184, on(STREET), 6);

// ---------------------------------------------------------------------------
// Up to the plaza, and out.
// ---------------------------------------------------------------------------
stairs(200, STREET, 4, 1);
L.coinRow(200, on(STREET) - 2, 8);
terrace(208, WIDTH - 208, UPPER);
arch(212, 6, UPPER);
L.coinRow(212, on(UPPER), 6);
L.coinArc(222, on(UPPER) - 2, 8);
L.goalAt(234, UPPER);

export default L.build();
