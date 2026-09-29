import { level } from '../level-builder.mjs';

/**
 * 2-4 — The Escalade.
 *
 * "A mother in sunglasses, on the phone, eating a salad, driving an enormous
 * Escalade around a cul-de-sac." (§6)
 *
 * ## The shape of the arena is the fight
 *
 * A cul-de-sac is a road with a wall at each end, and that is all this is: a
 * flat run of driveway with a raised stoop at either end and a hydrant where
 * the stoop meets the road. The Escalade drives between the two hydrants and
 * cannot leave that lane, because the lane is measured from the stoops rather
 * than written down anywhere — move a stoop and the car's run changes with it.
 *
 * There are exactly two places to be while it is coming, and both are in §6.
 *
 * **On the stoops.** Three tiles up, at either end, outside the lane. It
 * cannot reach you there. This is the honest answer and it is always
 * available, and it gets you precisely nothing except still being alive.
 *
 * **On the roof.** §6 says of this world's minivans that "the player must
 * climb the thing trying to kill them", which the game has been teaching since
 * the shopping cart in 1-1 and four vans nose to tail in 2-1. Here it is the
 * exam: the roof is solid at any speed, and riding it into the hydrant leaves
 * you already standing where the dent goes.
 *
 * ## The one brother
 *
 * A dent is a ground pound, and a ground pound is Berel's (§4). It is the only
 * thing in the game that needs a particular brother, so the arena says so on a
 * sign at the spawn and again at the far stoop, and the scene puts the words
 * over your head if you are stood on a stalled Escalade as Mendy. The swap is
 * free, instant and unlimited; the point is that you have to think of it.
 *
 * ## What else is in a cul-de-sac
 *
 * Geese and sprinklers, because §6 asks for them in phase 2 — "sprinklers
 * kicking on, geese scattering" — and because this is the last level of the
 * Five Towns and it should look like the rest of it. They are on the stoops
 * and the verges, out of the lane. Nothing in the middle of the road: a fight
 * this fast does not need a second thing to trip over.
 */
const FLOOR = 20;
const HEIGHT = 27;
const WIDTH = 56;

const L = level({
  key: '2-4',
  name: 'The Escalade',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x161d2b',
  backdrop: 'five_towns_dusk',
});

L.spawnAt(4);
L.ground(0, WIDTH);

/**
 * A stoop: three tiles up, which is Berel's standing jump exactly and inside
 * Mendy's with room to spare. It has to be reachable in a hurry by both.
 */
const stoop = (x, w) => L.ledge(x, FLOOR - 3, w);

// --- The near end ------------------------------------------------------------
L.sign(2, [
  'THE CUL-DE-SAC',
  'she is on the phone. she has not noticed you.',
  'GET ON THE ROOF WHEN IT CRASHES.',
  'THEN BEREL: JUMP, AND PRESS DOWN.',
]);
stoop(6, 6);
L.coinRow(6, FLOOR - 5, 6);

/**
 * The hydrant, at the end of the lane.
 *
 * §6: "it clips a fire hydrant and stalls". It is one tile of wall rather than
 * scenery because it is what stops the car — the lane is worked out from the
 * geometry, so the hydrant has to be geometry.
 */
L.slab(12, FLOOR - 2, 1, 2, 'wall');
// Only on the far stoop. The near one has the sign beside it saying the same
// thing at more length, and the two of them landed on top of each other.
L.label(46, FLOOR - 5, 'WAIT UP HERE');

// --- The road ----------------------------------------------------------------
//
// Thirty-two tiles of flat driveway and nothing on it. Five hundred pixels at
// two hundred and fifty px/s is two seconds end to end in phase 1 and about
// one and a third in phase 3, which is the whole escalation stated in distance.
L.coinRow(16, FLOOR - 6, 5);
L.coinArc(24, FLOOR - 5, 8);
L.coinRow(36, FLOOR - 6, 5);

// --- The far end -------------------------------------------------------------
L.slab(43, FLOOR - 2, 1, 2, 'wall');
/**
 * The far stoop butts straight onto its hydrant, the way the near one does.
 *
 * It started a tile clear of it and that one tile was the whole fight. The
 * stoop is three tiles up and the Escalade's roof is two and three quarters,
 * so a player standing on the stoop when it crashes is looking *down* at the
 * roof from four pixels above it and twenty across — you step onto it. With a
 * gap in between, that step became a jump over a hole, next to a car, on a
 * clock.
 */
stoop(44, 8);
L.coinRow(44, FLOOR - 5, 8);
L.sign(45, ['SWAP IS FREE. USE IT.'], FLOOR - 9);

/**
 * Nothing else lives here, and that took a playtest to learn.
 *
 * The first draft put a goose on each stoop, because §6 has geese scattering
 * in phase 2 and because the rest of this world is full of them. A goose does
 * not scatter. §6's own line is that they "hiss, chase on foot, relentless,
 * don't scare off" — so the one on the near stoop walked over to the spawn
 * point and killed the player five times before the Escalade had moved at all.
 * Game over, in a boss arena, without a fight.
 *
 * So the geese in phase 2 are scenery and not opposition: the scene spawns a
 * handful that run off the screen and are gone, which is what "scattering"
 * means, and nothing in the cul-de-sac can hurt you except the car. 1-4 is
 * empty for the same reason. A boss arena should contain the boss.
 *
 * The sprinklers stay — they cannot hurt anyone, they are §6's phase 2, and
 * they are on the verges behind the stoops where a badly taken launch costs
 * nothing.
 */
L.sprinkler(2, FLOOR - 1, { periodMs: 2600, offsetMs: 0 });
L.sprinkler(53, FLOOR - 1, { periodMs: 2600, offsetMs: 1300 });

/**
 * She starts at the near end, facing away down the street, because the first
 * thing the fight should do is nothing. The opening wait is long enough to
 * read the sign and get onto a stoop before anything moves.
 */
L.bossAt(18, FLOOR, 'escalade');

export default L.build();
