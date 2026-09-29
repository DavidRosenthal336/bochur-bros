import { level } from '../level-builder.mjs';

/**
 * 3-1 — The Colony.
 *
 * "Bungalow roofs, clotheslines, porch steps, raccoons." (§6)
 *
 * ## What is different about The Catskills
 *
 * Boro Park was a street and The Five Towns was the gardens behind one. Both
 * were level: the ground ran the length of them and everything interesting sat
 * on top of it. §6 changes that in one line — "bungalow roofs as the main
 * platforming route, with gaps between them" — so this world's route is the
 * roofs, and the lawn underneath is where you end up when you miss.
 *
 * Which is why this level can afford to be gentle. Almost every gap up here has
 * grass under it, and the ground is a slower, duller, safer way to the same
 * place. A world that moves the route into the air has to teach the route
 * before it starts charging for mistakes.
 *
 * ## Two tiles at a time, and why that number is measured
 *
 * Every step up in this level is **two tiles**, and every one of them is butted
 * against what it climbs from — you are never asked to clear a gap and a rise
 * at the same moment. That is not a style choice, it is arithmetic, and the
 * first draft got it wrong in a way that made the whole level Mendy's.
 *
 * Driven in the real game, jumping at this level's own geometry:
 *
 *     Mendy walking   65px      Mendy running   77px
 *     Berel walking   48px      Berel running   59px
 *
 * A three-tile ledge is a 48px rise. Berel's standing jump is 48px **exactly**,
 * which fails — and worse, the climb from a porch to a roof was also three
 * tiles, taken from a porch two tiles wide, where there is no room to build the
 * run that would have carried him. Berel could not get onto a single roof in
 * the colony. A bot driving the level as him got fourteen tiles from the spawn
 * and stopped at a tree for the remaining eighty-seven seconds.
 *
 * So the routine step is 32px, which both brothers clear from standing with
 * sixteen pixels to spare, and §4's difference is spent where it belongs: on
 * the high roof at 226, a four-tile rise that Mendy makes with a run-up and
 * Berel cannot make at all. The coins and the spare life are up there. The
 * route past is not.
 *
 * ## The four new things, in order, one at a time
 *
 * **A bungalow** (tile 66). Porch, then roof, then a two-tile hop to the next
 * roof. Nothing on it and nothing chasing you.
 *
 * **A rotting step** (tile 88). §6: "crumble a beat after the player lands."
 * The first is one board in the middle of a run with whole boards either side
 * and the lawn below, so the lesson is the shudder and the sound. The second,
 * at 127, is three of them over a hole in the ground.
 *
 * **A raccoon** (tile 106), right after the only Cholent in the first half — so
 * there is something to steal and the theft is the demonstration. §6: "steal
 * the player's power-up and bolt under a porch. Chase one down and it drops
 * what it took."
 *
 * **A clothesline** (tile 146). From the tall roof down to the lawn, with coins
 * strung under the middle of it. §6 says "ride them like ziplines, or duck
 * under them", and the first one has to be shown rather than demanded: walkable
 * grass runs the whole way beneath it. The one at 263 crosses a hole.
 *
 * ## The colony road
 *
 * Golf carts putter along it and wasps circle the bins outside the canteen,
 * because §6 puts both there. Both are old mechanics in local clothes: the cart
 * is 1-1's shopping cart at half speed with its roof still solid, and the wasp
 * is a pigeon that only minds you once you are at its bin. The new vocabulary
 * here is the terrain, so the things moving about on it should be readable on
 * sight.
 *
 * Each cart has two ends to its beat, because a roller only turns at a wall and
 * an open lawn has none — the first draft's cart drove the length of the level
 * and ran the player down at the front door, two seconds in.
 */
const HEIGHT = 28;
const WIDTH = 296;

/** The lawn: occupies row 21 down, so you stand at the top of row 21. */
const FLOOR = 21;
/** A porch. Two tiles up, which both brothers clear from a standstill. */
const PORCH = FLOOR - 2;
/** An ordinary bungalow roof. Two above a porch. */
const ROOF = PORCH - 2;
/** A taller one. Two above an ordinary roof. */
const TALL = ROOF - 2;
/** Four above a roof: Mendy with a run-up, and Berel not at all. */
const HIGH = ROOF - 4;

/** Where feet rest on a surface whose top row is `top`. Coins go here. */
const on = (top) => top - 1;

const L = level({
  key: '3-1',
  name: 'The Colony',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x14200f',
  backdrop: 'catskills_day',
});

L.spawnAt(3);

/**
 * A bungalow: two tiles of shingle, and a porch butted against the near end.
 *
 * The roof is deliberately thin and deliberately floating. Built solid from
 * shingle to lawn — which is what a bungalow looks like — eight of them made
 * eight canyons, and the two-tile alley between two was six deep with six-tile
 * walls on both sides. Walk in and you live there. The build-time trap check
 * threw out the whole level, and was right to.
 *
 * So only the porch reaches the ground, and the lawn runs unbroken under every
 * house in the colony. Which is also how a bungalow porch feels: the front of
 * the house is a veranda you can walk straight through.
 */
const bungalow = (x, w, top, { porch = 2 } = {}) => {
  L.slab(x, top, w, 2, 'roof');
  if (porch > 0) L.ledge(x - porch, PORCH, porch);
  return { left: x - porch, right: x + w, top };
};

/** A porch board. One tile thick, so the lawn under it stays walkable. */
const board = (x, w) => L.slab(x, PORCH, w, 1, 'platform');

/** A shed roof: roof height, open underneath, and something to climb from. */
const shed = (x, w) => L.slab(x, ROOF, w, 2, 'roof');

/**
 * A tree. Two tiles, like every porch here, so it is something both brothers go
 * over — and something a golf cart bounces off, which is its other job.
 */
const tree = (x) => L.slab(x, PORCH, 2, 2, 'wall');

// ---------------------------------------------------------------------------
// The road in. Lawn, a sign, and the first thing that moves.
// ---------------------------------------------------------------------------
L.ground(0, 62);

L.sign(2, [
  'THE BUNGALOW COLONY',
  'the roofs are the road up here.',
  'PORCH, THEN ROOF, THEN THE NEXT ROOF.',
], 14);

L.coinRow(8, on(FLOOR), 4);

/**
 * The first golf cart, and the two trees that keep it on its road.
 *
 * The near tree earns its place twice: it stops the cart ever reaching the
 * spawn, and it is the first thing in the world you climb. You meet your first
 * golf cart from the top of a tree, looking down at the roof you are about to
 * find out is solid.
 */
tree(14);
tree(30);
L.hazard('golfCart', 22, FLOOR, 1);
L.coinRow(14, on(PORCH), 2);
L.coinArc(24, on(FLOOR) - 2, 6);

/**
 * The bins outside the canteen, and what lives on them.
 *
 * A wasp commits from about three tiles and recovers for a second afterwards,
 * so walking the lawn past a bin is a choice with a cost and stomping one is a
 * choice with a reward. Two of them, far enough apart to take one at a time.
 */
L.crate(36);
L.crate(37);
L.enemy(36, FLOOR - 3, 'wasp');
L.coinRow(42, FLOOR - 5, 4);
L.crate(48);
L.enemy(48, FLOOR - 3, 'wasp');

L.checkpoint(56);

// ---------------------------------------------------------------------------
// The first two bungalows, and the first gap between two roofs.
// ---------------------------------------------------------------------------
L.ground(62, 40);

const first = bungalow(66, 8, ROOF);
L.coinRow(first.left, on(PORCH), 2);
L.coinRow(67, on(ROOF), 6);

// Two tiles of air between the roofs, at the same height. A walking jump
// crosses four, so this is the gentlest possible statement of the idea — and
// the lawn is below, not a pit.
bungalow(76, 7, ROOF, { porch: 0 });
L.coinRow(77, on(ROOF), 5);

/**
 * The first rotting step.
 *
 * One board in the middle of a run, with whole boards either side and open lawn
 * below. §6 gives it "a beat", and the beat is four hundred and twenty
 * milliseconds — long enough to walk off, not long enough to stand and think.
 * Measured: five hundred and eighty-three milliseconds from landing on it to
 * falling through it, and it is back two and a half seconds later.
 *
 * There is nothing to lose here. The point is to learn what the shudder means
 * somewhere it costs nothing.
 */
board(86, 2);
L.step(88, PORCH);
board(89, 2);
L.label(85, on(PORCH) - 2, 'IT CREAKS');
L.coin(88, on(PORCH));

// A pot on the way past. Everything after this assumes you are carrying
// something, because the next thing along wants to take it.
L.block(94, FLOOR - 4, 'mystery', 'cholent');
L.coinRow(92, on(FLOOR), 2);

// ---------------------------------------------------------------------------
// The raccoon, and the porch it bolts under.
// ---------------------------------------------------------------------------
L.ground(102, 25);

/**
 * §6: "steal the player's power-up and bolt under a porch. Chase one down and
 * it drops what it took."
 *
 * It ambles at fifty-two, slower than either brother walks, so the collision is
 * always your own doing. What follows costs no health at all: the pot comes off,
 * it bolts for eleven hundred milliseconds, goes to ground against the porch at
 * 110 for two seconds, then wanders back out with your Cholent still on its
 * back. Stomp it and it drops what it took where it stood.
 *
 * Measured end to end: robbed at 0.3s, caught and the pot back on the grass at
 * 2.8s. A Small player it ignores entirely — there is nothing to take, and §6
 * describes the raccoon as a thief and never as a danger.
 */
L.enemy(106, FLOOR, 'raccoon');
L.label(103, on(FLOOR) - 3, 'MIND YOUR POT');

bungalow(112, 9, ROOF);
L.coinRow(113, on(ROOF), 7);

/**
 * The run of three, over a real hole.
 *
 * Three rotting boards across a three-tile gap in the lawn. Any one of them
 * holds long enough to stand on and none of them holds long enough to stand on
 * twice, so the crossing is a sentence with one verb in it: keep going. Three
 * tiles is what a walking jump clears, so the hole is survivable without the
 * boards — but only from up here, and only if you are moving.
 */
board(124, 3);
L.stepRow(127, PORCH, 3);
board(130, 3);
L.coinRow(127, on(PORCH), 3);
L.label(123, on(PORCH) - 2, 'DO NOT STOP');

L.ground(130, 24);

// ---------------------------------------------------------------------------
// The first clothesline. Shown, not demanded.
// ---------------------------------------------------------------------------
// The way up: the third bungalow's roof, then a shed two tiles above it.
shed(132, 4);
L.coinRow(132, on(ROOF), 2);
bungalow(136, 10, TALL, { porch: 0 });
L.coinRow(137, on(TALL), 8);

/**
 * §6: "clotheslines — ride them like ziplines, or duck under them."
 *
 * Ten tiles of rope from the tall roof down to the grass, which is about a
 * second of riding at 195px/s — measured, and the same for both brothers, since
 * the rope does the work and §4's weight has nothing to push against.
 *
 * Both readings of the thing are available on the same walk: step off the roof
 * onto it and you ride, stroll along the lawn beneath it and nothing at all
 * happens. A rope catches feet that come down through it and ignores a head
 * going under, which is one rule doing both jobs.
 *
 * The coins are strung under the middle of the rope where only a rider collects
 * them, and a missed grab costs the climb back up and nothing else.
 */
L.clothesline(146, TALL + 1, 10, 4);
L.coinRow(149, TALL + 3, 5);

bungalow(160, 8, ROOF);
L.coinRow(161, on(ROOF), 6);
L.sign(157, ['RIDE IT. OR DUCK UNDER IT.'], on(PORCH) - 3);

L.checkpoint(157);

// ---------------------------------------------------------------------------
// The woods, and three roofs with holes under them.
// ---------------------------------------------------------------------------
L.ground(154, 38);

tree(170);
tree(186);
L.coinRow(174, on(FLOOR), 4);
L.enemy(178, FLOOR, 'raccoon');

/**
 * Three roofs, and three-tile holes in the lawn under them.
 *
 * The first stretch where the ground is not an answer — or rather, where it is
 * the harder answer: the holes are exactly what a walking jump clears, and the
 * roofs above them are spaced the same, so both routes cost the same jump and
 * only one pays in coins. The porch at 189 is the way up, butted against the
 * first roof the way everything in this colony is.
 */
L.ledge(189, PORCH, 2);
shed(191, 5);
L.coinRow(192, on(ROOF), 3);
shed(199, 5);
L.coinArc(199, on(ROOF) - 1, 5);
shed(207, 6);
L.coinRow(208, on(ROOF), 4);

L.ground(195, 13);
L.ground(211, 31);

L.block(213, FLOOR - 4, 'mystery', 'menorah');
L.coinRow(211, on(FLOOR), 3);

/**
 * The high roof, and the two brothers going different ways.
 *
 * Porch, shed, and then four tiles — sixty-four pixels, which is past Berel's
 * running jump of fifty-nine and inside Mendy's of seventy-seven. Eight coins
 * along the top and a spare life at the end of them, and a perfectly good route
 * past it at roof height. §4's split should be worth something without ever
 * being a locked door.
 *
 * The shed under it is eight tiles long, and that length is the whole reason
 * this works. Sixty-four pixels is past Mendy's *walking* jump too — he needs
 * the run — so a two-tile shed to start from would have made the high roof
 * unreachable by anybody and turned eight coins and a spare life into
 * decoration. This is the same mistake as the porch-to-roof climb, which is
 * worth saying twice: a rise is only as possible as the run-up in front of it.
 */
L.ledge(216, PORCH, 2);
shed(218, 8);
L.coinRow(219, on(ROOF), 6);
bungalow(226, 10, HIGH, { porch: 0 });
L.coinRow(227, on(HIGH), 8);
L.block(234, on(HIGH) - 1, 'mystery', 'lchaim');

L.ledge(236, PORCH, 2);
bungalow(238, 6, ROOF, { porch: 0 });
L.coinRow(239, on(ROOF), 4);

/**
 * The second cart, on a beat between the porch at 236 and the one at 246.
 * Nine tiles of road and nothing added to make it — the dividend of building
 * the colony out of one shape.
 */
L.hazard('golfCart', 241, FLOOR, -1);
L.crate(244);
L.enemy(244, FLOOR - 3, 'wasp');

// ---------------------------------------------------------------------------
// The last line, over a hole, and the way out.
// ---------------------------------------------------------------------------
L.ground(242, 22);

/**
 * The climb to the last roof: porch, shed, roof, each butted against the last.
 *
 * Nothing here asks for a gap and a rise in the same jump. That combination is
 * what makes a two-tile step impossible from a two-tile porch — there is no
 * room to build the speed that carries you across — and it is the quiet reason
 * a level can measure every rise correctly and still be impassable.
 */
L.ledge(246, PORCH, 2);
shed(248, 3);
L.coinRow(248, on(ROOF), 3);
bungalow(251, 12, TALL, { porch: 0 });
L.coinRow(252, on(TALL), 10);

/**
 * The exam: the same rope, over a hole in the ground.
 *
 * Eleven tiles from the tall roof down to the lawn on the far side of a
 * three-tile pit. Still not the only way across — the pit is a walking jump
 * like every other pit in this game — but from up here the rope is by some
 * distance the best one, and by now it is a thing you know how to use.
 */
L.clothesline(263, TALL + 1, 11, 5);

L.ground(267, WIDTH - 267);
L.enemy(272, FLOOR, 'raccoon');

// One last porch, rotten at the near end, because a colony should send you off
// the way it greeted you.
board(276, 2);
L.stepRow(278, PORCH, 3);
board(281, 2);
L.coinRow(277, on(PORCH), 5);

L.coinRow(286, on(FLOOR), 4);
L.goalAt(292);

export default L.build();
