import { level } from '../level-builder.mjs';

/**
 * 4-4 — The Yetzer Hara. The final boss.
 *
 * "A shape-shifter with no true form. He cycles through the forms of every boss
 * already beaten: Pigeon King — summons flocks, dive-bombs. The Escalade —
 * charges in straight lines. The Bear — swipes, hurls, calls minions. Then
 * flickers between all three, faster and faster, never holding one form long
 * enough to settle into a rhythm. He never resolves into a stable shape. On
 * defeat he gives up the tequila." (§6)
 *
 * ## One courtyard for three fights
 *
 * Each borrowed shape is the real boss underneath, so this room has to be all
 * three of their rooms at once, and it is built from the parts each one needs:
 *
 * - **The pigeon** needs the air over the room and perches to retreat to, and a
 *   flat floor to sweep along. The perches are those of 1-4.
 * - **The car** needs a straight road with something at each end to hit. The
 *   road is the courtyard floor, and the ends are the two hydrants, exactly as
 *   in 2-4's cul-de-sac, with a stoop behind each to wait on.
 * - **The bear** needs something to charge into, which the hydrants are, and a
 *   dumpster to climb and throw from, which in Jerusalem is the right-hand
 *   stoop — the far one from where you start, as 3-4's dumpster was. With the
 *   near stoop as its bin it climbed up beside a player who had just respawned
 *   there and swiped them off it.
 *
 * The stoops are three tiles up with the hydrant in front of each as a step:
 * floor, hydrant, stoop, two tiles and then one. That is the rule World 3
 * learned the hard way — every rise climbable by Berel from a standing start.
 */
const WIDTH = 56;
const HEIGHT = 27;
const FLOOR = 20;

const L = level({
  key: '4-4',
  name: 'The Yetzer Hara',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x8a6e66',
  backdrop: 'meah_shearim_dusk',
});

L.spawnAt(6, FLOOR - 3);
L.ground(0, WIDTH);

// The courtyard walls, so the fight stays in it.
L.slab(0, 5, 2, FLOOR - 5, 'wall');
L.slab(WIDTH - 2, 5, 2, FLOOR - 5, 'wall');

// The two stoops, each with a hydrant in front of it as a step.
L.ledge(2, FLOOR - 3, 9);
L.slab(11, FLOOR - 2, 1, 2, 'wall');
L.ledge(45, FLOOR - 3, 9);
L.slab(44, FLOOR - 2, 1, 2, 'wall');
L.coinRow(3, FLOOR - 4, 4);
L.coinRow(48, FLOOR - 4, 4);

/**
 * The perches. The first is on the right-hand stoop, and it is also how the
 * scene finds the bear's dumpster — it must stay first.
 */
L.perch(49, FLOOR - 3);
// Lower than 1-4's: with the player on the floor the camera shows down from
// about row 11, and a pigeon perched above that telegraphs off the top of the
// screen.
L.perch(14, 14);
L.perch(21, 13);
L.perch(28, 13);
L.perch(35, 13);
L.perch(42, 14);
L.perch(6, FLOOR - 3);

// One box out on the floor where it can be lined up. Going into this small
// is a long evening.
L.block(28, FLOOR - 4, 'mystery', 'cholent');

// Low enough to clear the boss's health bar, which sits along the top.
L.sign(2, [
  'THE YETZER HARA',
  'every shape he takes, you have beaten before.',
  'BEAT THEM AGAIN.',
], 13);

L.bossAt(28, 13, 'yetzerHara');

export default L.build();
