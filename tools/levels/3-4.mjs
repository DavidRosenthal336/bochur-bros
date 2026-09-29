import { level } from '../level-builder.mjs';

/**
 * 3-4 — The Bear.
 *
 * "Lives behind the canteen dumpster with the kugel. Charges, swipes, climbs
 * the dumpster and hurls garbage bags, and calls in raccoons when wounded." (§6)
 *
 * ## The arena is the answer
 *
 * The bear charges until it hits something, and it is only dazed — only
 * stompable — once it has. So the fight is about giving it something to hit
 * with you standing on top of it. There are two such things here, both two
 * tiles high, which both brothers can climb from standing:
 *
 * **The woodpile**, at the fence end. Stand on it and let it come.
 *
 * **Its own dumpster.** Stand on the lid and it runs into the side of its own
 * bin and sits there with stars round its head, one short drop below you.
 *
 * Both are two tiles because the bear is two and a half: it cannot run under
 * either, and it cannot run over either, so a charge at one always ends against
 * it. Neither is safe for long — the bear goes up the dumpster after every daze
 * and throws bags from the top — so the fight moves between them.
 *
 * ## Why nothing else is in the clearing
 *
 * 2-4 learned this with a goose that killed the player five times before the
 * Escalade had moved: a boss arena should contain the boss. The raccoons the
 * bear calls in are the only other animals here, and they arrive because you
 * are winning.
 */
const FLOOR = 20;
const HEIGHT = 27;
const WIDTH = 56;

const L = level({
  key: '3-4',
  name: 'The Bear',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x0e1510',
  backdrop: 'catskills_day',
});

L.spawnAt(9);
L.ground(0, WIDTH);

/** The fence at the woods end and the canteen's back wall at the other. */
L.slab(0, FLOOR - 8, 2, 8, 'wall');
L.slab(WIDTH - 2, FLOOR - 8, 2, 8, 'roof');

/**
 * The woodpile. Two tiles up, butted against the fence so there is no gap to
 * fall into behind it, and wide enough to stand on while a bear arrives.
 */
L.slab(2, FLOOR - 2, 4, 2, 'platform');
L.coinRow(2, FLOOR - 3, 4);

L.sign(8, [
  'BEHIND THE CANTEEN',
  'it charges until it hits something.',
  'STAND ON SOMETHING. THEN LAND ON IT.',
], 12);

/**
 * The dumpster, and the perch on its lid that tells the scene which solid it
 * is. Five tiles, two high. The kugel is behind it (§6), and it comes back to
 * the lid when the fight is over.
 */
L.slab(38, FLOOR - 2, 5, 2, 'wall');
L.perch(40, FLOOR - 2);
L.coinRow(38, FLOOR - 3, 5);

L.coinArc(18, FLOOR - 4, 8);

// Behind the dumpster, where it lives.
L.bossAt(48, FLOOR, 'bear');

export default L.build();
