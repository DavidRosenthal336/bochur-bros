import { level } from '../level-builder.mjs';

/**
 * 1-4 — The Pigeon King.
 *
 * "An enormous, grimy pigeon atop the scaffolding. Summons flocks of pigeons,
 * dive-bombs in arcs, and retreats to high perches between attacks. Sitting on
 * the meat board." (§6)
 *
 * Third version. The second one shipped with the player spawning inside a
 * sealed closet, and the lesson in that is worth more than the fix.
 *
 * The climbs are staircases rising towards the walls, which is right: the way
 * up belongs at the edges so the middle stays open. But a staircase drawn as
 * three floating shelves leaves the space underneath it enclosed — walled by
 * the map on one side, roofed by its own treads, and shut on the other side by
 * the bottom tread. Standing in there the ceiling is ten pixels over your head
 * and the step out is sixteen tall, so there is no jump that leaves. I put the
 * spawn in that pocket.
 *
 * So the treads are filled down to the floor now. A staircase is a solid
 * wedge, not a set of shelves, and a solid wedge has no underneath to be
 * trapped in. The top tread runs flush into the wall for the same reason: the
 * one-tile gap between them was a well you could drop into and not climb out
 * of.
 *
 * Everything else is as it was and for the reasons it was:
 *
 * **Room to move.** Fifty-six tiles, and tiles 12 to 43 are unbroken open
 * floor. Everything you climb is pushed out to the walls.
 *
 * **Steps you can make from a standstill.** One tile, then two, then two.
 * Nothing is three: Mendy's standing jump is 62px, but Berel's is 48px, which
 * is three tiles exactly and no margin. A boss arena is the last place to ask
 * for a run-up.
 *
 * **Nowhere to be cornered, and nothing to trip over.** No pits, and nothing
 * standing on the floor between the two staircases at all.
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

// In the open, in the middle, with the whole room visible and nothing
// overhead. Where you start a boss fight should need no explaining.
L.spawnAt(14);
L.ground(0, WIDTH);

// Walls, so the fight stays in the room. The King ignores them — he is a bird,
// and turns back on his own — but the player should not be able to leave.
L.slab(0, 5, 2, FLOOR - 5, 'wall');
L.slab(WIDTH - 2, 5, 2, FLOOR - 5, 'wall');

/**
 * A solid staircase up each wall, climbed from the middle of the room outwards.
 *
 * `ledge` fills from the tread down to the floor, which is what keeps this
 * honest — there is no space under a step to fall into. Read from the arena
 * inwards the profile only ever goes up, so the tread you are jumping to is
 * ahead of you rather than over you and there is open sky above the one you
 * take off from. That is the whole requirement, and the previous version broke
 * it by being built out of shelves.
 *
 * Both sides are the same shape on purpose: whichever way he drives you, you
 * are not learning a new climb while being dived at.
 */
L.ledge(9, 19, 3);  // left stair: floor -> 1 tile up
L.ledge(6, 17, 3);  //             -> 2 tiles
L.ledge(2, 15, 4);  //             -> 2 tiles, run flush into the wall

L.ledge(44, 19, 3); // right stair, mirrored
L.ledge(47, 17, 3);
L.ledge(50, 15, 4);

/**
 * The perches he retreats to: a line of them, six tiles apart, the whole width
 * of the room.
 *
 * There were three, at either end and the middle, and that was too few for the
 * rule he now picks by. He goes to the nearest perch that is not right on top
 * of you, so that the rear-up before a dive happens where you can see it — and
 * with three perches in fifty-six tiles the nearest one is routinely further
 * than the twenty tiles the camera shows. He would tell his dive off-screen.
 *
 * Six tiles apart, and wherever you stand there is a perch between five and
 * nine tiles away: far enough that the tell is a warning, close enough that it
 * is a warning you are looking at. The varied heights are so the room reads as
 * scaffolding rather than a shelf.
 */
L.perch(5, 12);
L.perch(11, 10);
L.perch(17, 11);
L.perch(23, 9);
L.perch(29, 10);
L.perch(35, 9);
L.perch(41, 11);
L.perch(47, 10);
L.perch(50, 12);

/**
 * No bounce pads, and that is the arena's whole argument.
 *
 * There were two of them out on the floor, as insurance against being knocked
 * down. Driving the real game loop across the room showed what they actually
 * were: a pad is a collider, so walking into the side of one stops you dead.
 * Three seconds of holding right from the spawn covered five tiles and then
 * hit a wall. Two of those in a thirty-two tile room is not insurance, it is
 * the "nowhere to move" this rebuild exists to fix.
 *
 * They were there so a knock-down would not cost you the climb, and the
 * staircases already answer that: every tread goes from a standstill, for both
 * brothers, so getting back up costs you seconds rather than a run-up. Tiles
 * 12 to 43 are now unbroken floor.
 */

// One box, out on the open floor where you can line it up. Going into this
// fight small is a rough evening.
L.block(18, 16, 'mystery', 'cholent');

L.bossAt(28, 11);

/**
 * Three sentences, one per thing the fight asks of you.
 *
 * He picks his target when he starts flashing, not when he lets go, so the
 * dodge is to be somewhere else by the time he arrives. At the bottom of the
 * arc he levels out and then stops dead for a beat — that pause is the whole
 * fight, and it is long enough to walk up to and jump on.
 */
L.sign(24, [
  'THE PIGEON KING',
  'he aims where you stand. move.',
  'duck, or land on his back. x3',
]);

export default L.build();
