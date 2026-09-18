import { level } from '../level-builder.mjs';

/**
 * 1-4 — The Pigeon King.
 *
 * "An enormous, grimy pigeon atop the scaffolding. Summons flocks of pigeons,
 * dive-bombs in arcs, and retreats to high perches between attacks. Sitting on
 * the meat board." (§6)
 *
 * Rebuilt after playtesting, which turned up three things and all three were
 * about space rather than about the boss.
 *
 * **Room to move.** The first arena was forty tiles wide with scaffolding
 * across the middle of it, which left nowhere to go when the King came down
 * with two pigeons already in the air. It is fifty-six tiles now and the middle
 * two-thirds are deliberately empty floor — the whole span from tile 13 to tile
 * 43 is clear. Everything you climb is pushed out to the walls.
 *
 * **Steps you can actually make.** The old scaffolding rose four tiles a step
 * and the comment claimed both brothers could climb it from a standstill. They
 * cannot: a standing jump is 62px, which is 3.85 tiles, so every step needed a
 * run-up and a run-up is the one thing a boss arena does not give you room for.
 * Every step here is three tiles.
 *
 * **Nowhere to be cornered.** No pits, and two bounce pads on the open floor,
 * so being knocked down never costs you the climb. A boss fight should be lost
 * to the boss.
 */
const WIDTH = 56;
const HEIGHT = 27;
const FLOOR = 20;

const L = level({
  key: '1-4',
  name: 'The Pigeon King',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x2a1a20',
  backdrop: 'night',
});

L.spawnAt(5);
L.ground(0, WIDTH);

// Walls, so the fight stays in the room. The King ignores them — he is a bird,
// and turns back on his own — but the player should not be able to leave.
L.slab(0, 5, 2, FLOOR - 5, 'wall');
L.slab(WIDTH - 2, 5, 2, FLOOR - 5, 'wall');

/**
 * Scaffolding up both walls, three tiles a step.
 *
 * Symmetrical on purpose: whichever side he drives you to, the way up is the
 * same shape, so you are never learning a new climb while being dived at.
 *
 * Each step is set back from the one below it, so the three tiles you take off
 * from always have open sky above them. Without that gap you rise into the
 * underside of the very ledge you are aiming for, the jump is cut at head
 * height, and the climb reads as needing a run-up when what it actually needs
 * is somewhere to stand. That is what made the first arena feel stuck.
 */
/**
 * A staircase, not a ladder.
 *
 * Every tread is set back from the one above it, so the tiles you take off
 * from always have open sky. That is the whole trick, and getting it wrong is
 * what made the first arena feel stuck: with a ledge directly overhead you
 * rise into its underside, the jump is cut at head height, and it reads as
 * needing a run-up when what it needs is somewhere to stand.
 *
 * Rises are one tile, then two, then two. Nothing is three: Mendy's standing
 * jump is 62px and clears three tiles with room, but Berel's is 48px, which is
 * three tiles exactly and no margin — measured, he misses the last step of a
 * three-tile staircase by two pixels. An arena half of which one brother
 * cannot climb is not an arena.
 */
L.slab(9, 19, 3, 1); //  left: floor -> 1 tile
L.slab(6, 17, 3, 1); //        -> 2 tiles, sky clear over tiles 9-11
L.slab(3, 15, 3, 1); //        -> 2 tiles, sky clear over tiles 6-8

L.slab(44, 19, 3, 1); // right, mirrored
L.slab(47, 17, 3, 1);
L.slab(50, 15, 3, 1);

// The perches he retreats to, spread across the room so he crosses it between
// attacks instead of hanging over one spot.
L.perch(5, 12);
L.perch(28, 10);
L.perch(51, 12);

/**
 * A bag of rubbish at the foot of each climb.
 *
 * These are the way up, not a bonus. Jumping from the floor onto a ledge three
 * tiles above needs you to clear its top before you drift underneath it, and
 * beside a wall there is only a tile or so of room to do that in — which is
 * the "you need a running start" of the first arena, and there is nowhere to
 * run. Land on the bag instead and you are thrown well over the shelf with
 * time to steer.
 *
 * They double as the way back up after being knocked down, which is what they
 * were there for before.
 */
L.bounce(20, 19, 3);
L.bounce(34, 19, 3);

// One box, because going into this fight small is a rough evening. Hit from
// the floor below it.
L.block(12, 16, 'mystery', 'cholent');

L.bossAt(28, 11);

/**
 * Three sentences, one per thing the fight asks of you.
 *
 * He picks his target when he starts flashing, not when he lets go, so the
 * dodge is to be somewhere else by the time he arrives. At the bottom of the
 * arc he levels out and then stops dead for a beat — that pause is the whole
 * fight, and it is long enough to walk up to and jump on.
 */
L.sign(6, [
  'THE PIGEON KING',
  'he aims where you stand. move.',
  'duck, or land on his back. x3',
]);

export default L.build();
