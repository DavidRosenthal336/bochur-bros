import { level } from '../level-builder.mjs';

/**
 * 1-4 — The Pigeon King.
 *
 * "An enormous, grimy pigeon atop the scaffolding. Summons flocks of pigeons,
 * dive-bombs in arcs, and retreats to high perches between attacks. Sitting on
 * the meat board." (§6)
 *
 * The arena is a box with three perches and nothing to fall into. A boss fight
 * should be lost to the boss, not to the floor — so there are no pits here at
 * all, and the only thing that can hurt you is the fight itself.
 */
const FLOOR = 20;
const HEIGHT = 27;
const L = level({
  key: '1-4',
  name: 'The Pigeon King',
  width: 40,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x2a1a20',
  backdrop: 'night',
});

L.spawnAt(4);
L.ground(0, 40);

// Walls, so the fight stays in the room.
L.slab(0, 6, 2, FLOOR - 6, 'wall');
L.slab(38, 6, 2, FLOOR - 6, 'wall');

// Scaffolding to climb, and the perches it retreats to between attacks.
//
// Four tiles between each level, deliberately: five is Mendy's running maximum
// and beyond Berel entirely, and an arena you can be locked out of half of is
// not an arena. Both brothers can climb all of this from a standstill.
L.slab(5, 16, 6, 1);
L.slab(17, 12, 6, 1);
L.slab(29, 16, 6, 1);
L.perch(7, 15);
L.perch(19, 11);
L.perch(31, 15);

// Bags at the foot of each side: the way back up if you get knocked down.
L.bounce(13, 19, 3);
L.bounce(24, 19, 3);

L.bossAt(19, 11);
L.sign(12, ['THE PIGEON KING', 'land on him when he comes down. three times.']);

// One box, because going in small is a rough fight.
L.block(9, 13, 'mystery', 'cholent');

export default L.build();
