import { level } from '../level-builder.mjs';

/**
 * 1-3 — The Stroller.
 *
 * "Auto-scroll chase level. The stroller pursues the whole way." (§6)
 *
 * Two pressures at once that are really one: the screen moves on by itself,
 * and the stroller comes from behind. Both say keep going. §6 also calls the
 * level timed, and it was; the clock came off in the rebuild against
 * LEVELS.md, because a moving screen is already a clock and a second one on
 * top of it was noise. 3-3 and 4-3 keep theirs.
 *
 * ## The rule it is built on
 *
 * **The route is never ambiguous.** At this speed there is no time to read a
 * fork, so there isn't one. 1-1 has the forks; this is a straight run with
 * things to clear, and every one of them is met head-on.
 *
 * ## What changed in the rebuild
 *
 * The stroller follows now — it jumps the gaps, where before it rolled into
 * the first one six seconds in and was never seen again. The checkpoints are
 * quiet: the first version had a pigeon two tiles from one, a pipe hung
 * directly over another, and a pigeon two tiles from the third, so a respawn
 * was a death. And the first half asks for less at once: a Cholent box right
 * at the start, two-tile gaps before the first checkpoint and three after it,
 * and never a cart and rats on the same stretch.
 *
 * Gaps go to three tiles here — a walking jump clears three at its limit, and
 * at chase speed you are not walking. It is the one World 1 level that spends
 * that margin, which is why 1-1 does not.
 */
const FLOOR = 20;
/**
 * Where the pipes hang: on a rope from the scaffolding, with the bottom of the
 * pipe just over head height. On this street the camera shows about ninety
 * pixels above the pavement, so a pipe hung any higher is off the top of the
 * screen. Hanging, a pipe is scenery you can jump into; only a falling one
 * hurts.
 */
const PIPE_ROW = FLOOR - 2;
const HEIGHT = 27;
const WIDTH = 362;

const L = level({
  key: '1-3',
  name: 'The Stroller',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x241826',
  backdrop: 'dusk',
});

L.spawnAt(10);
L.scrolls(86); // slightly under a walk, so standing still loses ground
L.sign(10, ['RUN.', 'the stroller does not get tired and neither does the screen.']);

/**
 * The stroller starts behind you and never stops coming.
 *
 * Nine tiles behind, not one. At one tile its hitbox overlapped the spawn
 * point, so the level killed you before you had pressed anything — a head
 * start of about a second is the difference between a chase and an ambush.
 */
L.hazard('stroller', 1, FLOOR, 1);

// --- Opening: clear ground to get moving, and a Cholent to go in big ---------
L.ground(0, 40);
L.block(16, 16, 'mystery', 'cholent');
L.coinRow(20, 18, 4);
L.bounce(28, 17, 3);
L.coinRow(28, 14, 3);

// --- Two-tile gaps, taken at speed ------------------------------------------
//
// Nothing hostile on either landing. A pigeon perched past the first gap was
// exactly where a running jump's arc went through, and a chase gives you no
// way to wait for it to move.
L.ground(42, 17);
L.coinArc(44, 18, 6);
L.ground(61, 20);
L.coinRow(64, 18, 4);
L.checkpoint(72);

// --- Three-tile gaps now, and rubbish bags to bounce over a longer one -------
L.ground(84, 15);
L.bounce(88, 19, 3);
L.coinRow(88, 15, 3);
L.ground(102, 20);
L.enemy(108, FLOOR, 'rat');
L.block(112, 16, 'mystery', 'cholent');

// --- Scaffolding: pipes drop as you pass under ------------------------------
L.ground(125, 30);
L.sign(126, ['SCAFFOLDING — WATCH FOR RATTLING PIPES'], 16);
L.slab(125, 12, 30, 1);
for (const x of [131, 138, 145, 151]) L.hazard('pipe', x, PIPE_ROW);
L.coinRow(133, 18, 4);

// --- A quiet checkpoint, then rats ------------------------------------------
L.ground(158, 26);
L.checkpoint(162);
L.coinRow(166, 18, 4);
L.block(170, 16, 'mystery', 'lchaim');
for (const x of [176, 182]) L.enemy(x, FLOOR, 'rat');

// --- A cart rolling the other way -------------------------------------------
L.ground(187, 28);
L.hazard('cart', 210, FLOOR, -1);
L.coinRow(191, 18, 5);
L.block(197, 16, 'mystery', 'cholent');

// --- The van, and the roof that is the way past it --------------------------
//
// A three-tile gap immediately after it. Coming off the roof you are already
// moving, so it is a gap you clear by not stopping — the whole level in one
// jump.
L.ground(218, 22);
L.hazard('van', 232, FLOOR, -1);
L.sign(219, ['OVER THE ROOF'], 16);
L.coinRow(222, 18, 4);

// --- A quiet checkpoint ------------------------------------------------------
L.ground(243, 22);
L.checkpoint(250);
L.coinRow(254, 18, 4);

// --- A cart under an awning -------------------------------------------------
L.ground(268, 24);
L.hazard('cart', 286, FLOOR, -1);
L.bounce(272, 17, 3);
L.coinRow(272, 14, 3);

// --- Scaffolding again, closer together, with pigeons under it --------------
L.ground(295, 34);
L.slab(295, 12, 34, 1);
for (const x of [299, 305, 311, 317, 323]) L.hazard('pipe', x, PIPE_ROW);
L.enemy(304, 16);
L.enemy(316, 16);
L.coinRow(307, 18, 6);
L.block(320, 16, 'mystery', 'lchaim');

// --- Home straight ----------------------------------------------------------
L.ground(332, 30);
L.checkpoint(338);
L.coinRow(342, 18, 8);
L.enemy(350, 16);
L.sign(346, ['ALMOST'], 16);
L.goalAt(356);

export default L.build();
