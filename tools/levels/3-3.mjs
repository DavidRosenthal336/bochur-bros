import { level } from '../level-builder.mjs';

/**
 * 3-3 — Lights Out.
 *
 * "Night level, timed. Visibility reduced to a circle of light around the
 * player. Fireflies mark safe paths. Crickets on the soundtrack. Eyes blink in
 * the dark just outside the light radius." (§6)
 *
 * ## The colony again, with the lights off
 *
 * Nothing in this level is new terrain. Porches, roofs, rotting steps, a
 * clothesline, three-tile pits — all of it was taught in daylight in 3-1, and
 * that is the design. The new thing is not being able to see it, and the only
 * fair way to take sight away is to take it away from things the player already
 * knows how to do.
 *
 * ## The one number that makes it work
 *
 * The lantern reaches 58px. A walking jump carries about four tiles, which is
 * 64. So **you cannot see where a jump lands** — not quite — and that gap
 * between what you can see and how far you can go is the entire level. The
 * fireflies close it. They hover over the far side of every pit and along every
 * roof you are meant to land on, and they shine through the dark and light a
 * little of the ground beneath them. A line of fireflies is a line of places
 * that are there.
 *
 * So the rule, taught in the first thirty tiles and never broken: **every
 * firefly is over something you can stand on.** There are no decoy fireflies
 * and none over a pit. A mechanic that exists to let the player trust the dark
 * cannot also be the thing that lies to them.
 *
 * ## The clock
 *
 * §7 times this level, and the timer is what stops the dark being solved by
 * standing still. A player can creep, but not forever. The limit is set from a
 * measured run with room to spare — this is a level about nerve, not about a
 * speedrun.
 *
 * ## Mosquitoes
 *
 * §6's swarms, saved for the night because a whine you cannot see coming is
 * what mosquitoes are. They drift at 46px/s, slower than either brother walks,
 * so the answer is always to keep moving — which is also the answer to the
 * clock and to the rotting steps. Everything in this level says the same thing.
 *
 * There is a Menorah box before the first swarm, because §6 says they can be
 * dispersed with a power-up and the first time is when you want to find that
 * out.
 *
 * ## What is not here
 *
 * §6's crickets. There is no audio in the game yet — §10 has music produced
 * separately and asks for a system that tracks drop into as files — and the
 * crickets belong to that system when it exists, not to a sound engine built
 * inside one level.
 */
const HEIGHT = 28;
const WIDTH = 232;

const FLOOR = 21;
const PORCH = FLOOR - 2;
const ROOF = PORCH - 2;
const TALL = ROOF - 2;

const on = (top) => top - 1;

/**
 * Where a swarm hangs: five tiles up, above anybody's head and out of reach of
 * a walk. It notices you as you pass beneath it and comes down after you, which
 * is what makes "outrun them" (§6) a thing you do rather than a thing you read.
 */
const SWARM = FLOOR - 5;

const L = level({
  key: '3-3',
  name: 'Lights Out',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x05070d',
  backdrop: 'catskills_night',
});

/**
 * Fifty-eight pixels of lantern.
 *
 * Just short of a walking jump's sixty-four, on purpose — see above. Larger and
 * the fireflies are decoration; smaller and a player cannot see the edge they
 * are standing on, which is not darkness but blindness.
 */
L.dark(58);
L.spawnAt(3);

const bungalow = (x, w, top, { porch = 2 } = {}) => {
  L.slab(x, top, w, 2, 'roof');
  if (porch > 0) L.ledge(x - porch, PORCH, porch);
};
const board = (x, w) => L.slab(x, PORCH, w, 1, 'platform');
const shed = (x, w) => L.slab(x, ROOF, w, 2, 'roof');
const tree = (x) => L.slab(x, PORCH, 2, 2, 'wall');

/**
 * A pit, three tiles wide, with fireflies over the ground on the far side.
 *
 * Three is the widest pit this game allows anywhere and is exactly what a
 * walking jump clears. In daylight it is the easiest gap there is. Here it is
 * the level's basic sentence: a hole you cannot see across, and lights telling
 * you where the other side is.
 */
const pitThenGround = (x, groundTo) => {
  L.ground(x + 3, groundTo - (x + 3));
  L.firefly(x + 3, on(FLOOR) - 1);
  L.firefly(x + 5, on(FLOOR) - 1);
};

// ---------------------------------------------------------------------------
// Lesson one: fireflies are ground.
// ---------------------------------------------------------------------------
L.ground(0, 30);
L.sign(1, [
  'LIGHTS OUT',
  'the fireflies are over the ground.',
  'ALL OF THEM. ALWAYS. FOLLOW THEM.',
], 16);

// Along flat grass first, where nothing can go wrong, so the association is made
// before it is needed: a firefly means a floor.
L.fireflyRow(6, on(FLOOR) - 1, 6, 3);
L.coinRow(8, on(FLOOR), 4);
L.checkpoint(26);

// ---------------------------------------------------------------------------
// Lesson two: fireflies are where the jump ends.
// ---------------------------------------------------------------------------
pitThenGround(30, 56);
L.label(27, on(FLOOR) - 3, 'JUMP TO THE LIGHTS');
L.coinArc(30, on(FLOOR) - 2, 4);

/**
 * A Menorah, before the first swarm.
 *
 * §6 says the swarms can be dispersed with a power-up, and the first swarm is
 * when a player wants to find that out rather than read it. A firefly sits over
 * the box, because a box you cannot see is a box nobody hits.
 */
L.block(40, FLOOR - 4, 'mystery', 'menorah');
L.firefly(40, FLOOR - 6);
L.coinRow(38, on(FLOOR), 2);

/**
 * The first swarm, on open lawn, with room to walk away from it.
 *
 * Forty-six pixels a second against a walk of seventy-five or ninety, so this
 * one teaches the only thing a swarm needs teaching: it is slower than you, and
 * it does not stop.
 */
L.enemy(50, SWARM, 'mosquito');
pitThenGround(56, 92);

// ---------------------------------------------------------------------------
// The colony at night: porch, roof, roof.
// ---------------------------------------------------------------------------
L.checkpoint(60);
bungalow(66, 8, ROOF);
L.firefly(64, on(PORCH) - 1);
L.fireflyRow(67, on(ROOF) - 1, 3, 3);
L.coinRow(67, on(ROOF), 6);

/**
 * Two roofs with a three-tile gap between them, both lit.
 *
 * In 3-1 this gap was two tiles and the lesson was that roofs are a road. Here
 * it is three, which is past what the lantern shows, and the lesson is that the
 * lights on the next roof are the next roof.
 */
bungalow(77, 8, ROOF, { porch: 0 });
L.fireflyRow(77, on(ROOF) - 1, 3, 3);
L.coinRow(78, on(ROOF), 5);

L.enemy(88, FLOOR, 'raccoon');
L.coinRow(86, on(FLOOR), 3);

// ---------------------------------------------------------------------------
// Rotting steps in the dark.
// ---------------------------------------------------------------------------
L.ground(92, 8);
L.checkpoint(94);

/**
 * Three rotting boards over a pit, and a firefly over each of them.
 *
 * The one place a firefly marks something that will not be there for long —
 * which is still true to the rule. It is over something you can stand on; the
 * rot is what the step was always going to do, and the shudder still warns you.
 * In the dark, the warning is the only way to know which board you are on.
 */
board(100, 2);
L.stepRow(102, PORCH, 3);
board(105, 2);
L.fireflyRow(100, on(PORCH) - 1, 4, 2);
L.coinRow(102, on(PORCH), 3);
L.ground(100, 2);
L.ground(105, 25);

L.enemy(114, SWARM, 'mosquito');
L.coinRow(112, on(FLOOR), 4);
L.fireflyRow(110, on(FLOOR) - 1, 4, 4);

// ---------------------------------------------------------------------------
// The clothesline, from a roof you cannot see the end of.
// ---------------------------------------------------------------------------
L.checkpoint(126);
// The lawn runs on under the tall bungalow. The first draft forgot it, and the
// trap check found fifteen tiles of nothing under two roofs — which in a level
// where you cannot see the ground is not a pit, it is a trapdoor.
L.ground(130, 12);
L.ledge(128, PORCH, 2);
shed(130, 3);
bungalow(133, 9, TALL, { porch: 0 });
L.firefly(128, on(PORCH) - 1);
L.firefly(131, on(ROOF) - 1);
L.fireflyRow(134, on(TALL) - 1, 3, 3);
L.coinRow(134, on(TALL), 7);

/**
 * The rope, over a pit, in the dark.
 *
 * Its far end is eleven tiles from where you step onto it, which is three
 * lanterns away. The fireflies are strung along the ground where it lets you
 * down, so the thing a rider can see is where the ride ends.
 */
L.clothesline(142, TALL + 1, 11, 5);
pitThenGround(142, 186);
L.fireflyRow(149, on(FLOOR) - 1, 3, 2);
L.coinRow(147, TALL + 4, 4);

L.enemy(160, FLOOR, 'raccoon');
L.block(166, FLOOR - 4, 'mystery', 'cholent');
L.firefly(166, FLOOR - 6);

// ---------------------------------------------------------------------------
// The woods: trees, swarms, and the last pits.
// ---------------------------------------------------------------------------
L.checkpoint(172);
tree(176);
L.firefly(176, on(PORCH) - 1);
L.enemy(182, SWARM, 'mosquito');
L.coinRow(178, on(FLOOR), 4);

pitThenGround(186, 210);
tree(196);
L.firefly(196, on(PORCH) - 1);
L.enemy(202, SWARM, 'mosquito');

pitThenGround(210, WIDTH);
L.fireflyRow(214, on(FLOOR) - 1, 5, 3);
L.coinRow(216, on(FLOOR), 6);
L.goalAt(226);

export default L.build();
