import { level } from '../level-builder.mjs';

/**
 * 4-3 — Rooftops.
 *
 * "Timed chase across solar water tanks and laundry lines." (§6)
 *
 * ## The chase
 *
 * The Yetzer Hara is on the roofs ahead of you, the same smoke that ran off with
 * the spread in the prologue, and he holds the same rubber band: about half a
 * screen ahead whatever pace you set. He cannot be caught here either. What
 * makes it a chase is the clock — the level is timed, and tight enough that a
 * player who stops on every roof to look will run out of it — and him, always
 * just there, telling you which way. At the far end, as you close on him, he
 * goes over the last wall towards the fight that ends the game.
 *
 * ## The tanks
 *
 * §6: "round, awkward platforms." A solar tank is a drum on its side, and a drum
 * rolls you off it. Keep going and it never takes you; stop and it does. They
 * start as furniture on a roof, where sliding off costs nothing, and end as the
 * only thing to stand on between two gaps.
 *
 * ## The laundry lines
 *
 * §6: "strung across alleys, above and below the player." A floor from above
 * and nothing from below. The first is a bridge at roof height, which you walk
 * across without knowing it was anything else. The second has a second line
 * over it with the coins on, which you jump up through. The last is a stack of
 * them up an alley between a low roof and a high one: a ladder you climb by
 * jumping.
 *
 * ## The birds
 *
 * §6 gives this world sparrows, "quick and erratic, hard to hit", and the
 * rooftop pigeons are back from 1-2. They are the two ways a bird can be in your
 * way: the pigeon holds a line and commits, the sparrow never holds anything. A
 * sparrow stays in its own patch of air, so each one is a question of when to
 * go past, never of whether it will follow.
 *
 * ## The rules this world inherits
 *
 * Every rise two tiles and butted, every pit three tiles at most unless a line
 * is strung across it.
 */
const HEIGHT = 30;
const WIDTH = 220;

/** The ordinary height of the roofs. */
const ROOF = 20;

const on = (top) => top - 1;

const L = level({
  key: '4-3',
  name: 'Rooftops',
  width: WIDTH,
  height: HEIGHT,
  floorTop: ROOF,
  // The near backdrop's base at dusk, sampled — see 4-1 for why it is not dark.
  background: '0x8a6e66',
  backdrop: 'meah_shearim_dusk',
});

/** A building, its roof at `top`, down to the bottom of the map. */
const roof = (x, w, top = ROOF) => L.slab(x, top, w, HEIGHT - top, 'roof');

/** A chimney stack two tiles wide with a tank astride it: the only place to stand. */
const stack = (x, top) => {
  roof(x, 2, top);
  L.tank(x + 0.5, top);
};

L.spawnAt(3);

// ---------------------------------------------------------------------------
// The first roof: he is there, and he goes.
// ---------------------------------------------------------------------------
roof(0, 23);
L.sign(1, [
  'ROOFTOPS',
  "HE'S GETTING AWAY. KEEP UP.",
  'a tank rolls you off if you stop on it.',
], 14);
L.thiefAt(17);
L.coinRow(5, on(ROOF), 4);
/** The first tank: furniture, with the roof all round it. */
L.tank(12);
L.coin(12, on(ROOF) - 2);
L.block(19, ROOF - 4, 'mystery', 'peyos');

// A gap of two.
roof(25, 16);
L.tank(29);
L.tank(34);
L.coinArc(29, on(ROOF) - 1, 6);
L.enemy(37, ROOF - 5, 'pigeon');

/**
 * The first line: a bridge at roof height across a gap of three. You run
 * across it, and only find out it was washing if you stop and look down.
 */
L.laundry(41, ROOF, 3);
roof(44, 13);
L.checkpoint(46);
L.coinRow(48, on(ROOF), 4);

// ---------------------------------------------------------------------------
// Up a storey, and the alley with two lines over it.
// ---------------------------------------------------------------------------
const UP1 = ROOF - 2;
roof(57, 14, UP1);
L.tank(62, UP1);
L.coin(62, on(UP1) - 2);
L.enemy(67, UP1 - 5, 'sparrow');

/**
 * Below and above. The lower line is the way across; the upper one is three
 * tiles over it with the coins along it, and you get there by jumping up
 * through it from below — the thing a laundry line lets you do that a roof
 * does not.
 */
L.laundry(71, UP1, 8);
L.laundry(71, UP1 - 3, 8);
L.coinRow(72, on(UP1 - 3), 6);
L.enemy(76, UP1 - 6, 'sparrow');
roof(79, 14, UP1);
L.checkpoint(81, UP1);
L.coinRow(84, on(UP1), 4);

// ---------------------------------------------------------------------------
// Two stacks between three gaps. The tanks are the floor now.
// ---------------------------------------------------------------------------
/**
 * Gaps of three, a stack with a tank on it, and again. Land, keep going: the
 * tank only takes you if you stop on it, and stopping on it is the one thing
 * this stretch is asking you not to do.
 *
 * The spacing is measured, not guessed. A stack is two tiles with the tank
 * across the middle, a tile below the roofs, and the stacks are three tiles
 * apart: wherever you jump from, the landing — tank or the strip of stack
 * either side of it — is somewhere between 44 and 88 pixels away, which takes
 * every jump in the game from Berel's walk (48) to Mendy's run (about 85 when
 * the landing is a little lower). The first version used one-tile stacks, a
 * twenty-pixel target, and a running jump sailed over it into the gap behind.
 */
const STACK = UP1 + 1;
stack(96, STACK);
stack(101, STACK);
L.coin(96, on(STACK) - 2);
L.coin(102, on(STACK) - 2);
roof(105, 14, UP1);
L.checkpoint(107, UP1);
L.block(110, UP1 - 4, 'mystery', 'lulav');
L.enemy(114, UP1, 'cat');

// ---------------------------------------------------------------------------
// Down again, and the sparrows over the gaps.
// ---------------------------------------------------------------------------
roof(119, 12);
L.coinRow(121, on(ROOF), 4);
/**
 * A gap of three with a sparrow over it — high, so a plain jump passes under
 * the patch of air it keeps to and only the top of the arc is ever in question.
 * Hung in the middle of the jump, the first version was a coin toss each time:
 * one run lost a life to it, the next lost six.
 */
L.enemy(132, ROOF - 5, 'sparrow');
roof(134, 7);
L.tank(137);
// A gap of two, another sparrow, as high.
L.enemy(142, ROOF - 5, 'sparrow');
roof(143, 7);
L.checkpoint(145);

// ---------------------------------------------------------------------------
// The ladder of lines up the alley.
// ---------------------------------------------------------------------------
roof(150, 7, UP1);
/**
 * Two lines, one above the other, up an alley six tiles wide, from a roof two
 * storeys below the next one. From the low roof, up onto the first line; from
 * the first line, up through the second; from the second, onto the high roof.
 * Every one of those is a two-tile climb.
 */
const UP2 = UP1 - 2;
const UP3 = UP2 - 2;
const TOP = UP3 - 2;
L.laundry(157, UP2, 6);
L.laundry(157, UP3, 6);
L.coin(159, on(UP2) - 1);
L.coin(161, on(UP3) - 1);
roof(163, 16, TOP);
L.checkpoint(165, TOP);
L.tank(169, TOP);
L.coinRow(171, on(TOP), 4);
L.enemy(175, TOP - 5, 'pigeon');

// ---------------------------------------------------------------------------
// Down the far side and out. He is waiting at the last wall.
// ---------------------------------------------------------------------------
roof(179, 8, TOP + 4);
L.coinArc(180, on(TOP + 4) - 1, 6);
roof(187, WIDTH - 187);
L.coinRow(190, on(ROOF), 6);
L.goalAt(212);

export default L.build();
