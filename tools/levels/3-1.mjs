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
 * grass under it, and the ground is a slower, duller, perfectly safe way to
 * reach the same place. A world that moves the route into the air has to teach
 * the route before it starts charging for mistakes.
 *
 * ## A bungalow is a roof and a porch, and nothing in between
 *
 * The first draft built each one as a solid block from the shingle to the lawn,
 * which is what a bungalow looks like, and the build-time trap check threw out
 * the whole level: eight bungalows meant eight canyons, and the two-tile alley
 * between two of them was six tiles deep with a six-tile wall on either side.
 * Walk in and you live there.
 *
 * So the roof is a roof — two tiles of shingle with open air beneath it — and
 * the only part that reaches the ground is the porch, three tiles up, which is
 * Berel's standing jump and therefore never a wall. The lawn runs unbroken
 * under every house in the colony. That is also, as it happens, how a bungalow
 * porch actually feels: the front of the house is a veranda you can walk right
 * through.
 *
 * ## The four new things, in order, one at a time
 *
 * **A bungalow** (tile 66). Porch, then roof, then a two-tile hop to the next
 * roof. Nothing on it and nothing chasing you.
 *
 * **A rotting step** (tile 88). §6: "crumble a beat after the player lands."
 * The first is one board in the middle of a run with whole boards either side
 * and the lawn a metre below, so the lesson is the shudder and the sound. The
 * second is a run of three over a hole, where standing still is the mistake.
 *
 * **A raccoon** (tile 104), right after the only Cholent in the first half — so
 * there is something to steal and the theft is the demonstration. §6: "steal
 * the player's power-up and bolt under a porch. Chase one down and it drops
 * what it took."
 *
 * **A clothesline** (tile 146). From the tall roof down to the next porch, with
 * coins strung under the middle of it, and walkable lawn the whole way beneath.
 * §6 says "ride them like ziplines, or duck under them", and the first one has
 * to be a thing you are shown rather than a thing you are made to do. The one
 * at 263 crosses a hole.
 *
 * ## The colony road
 *
 * Golf carts putter along it and wasps circle the bins outside the canteen,
 * because §6 puts both there. Both are old mechanics in local clothes: the cart
 * is 1-1's shopping cart at half speed with its roof still solid, and the wasp
 * is a pigeon that only minds you once you are at its bin. That is deliberate.
 * The new vocabulary here is the terrain, so the things moving about on it
 * should be readable on sight.
 *
 * ## Both brothers
 *
 * Nothing here needs a particular brother, which is right for the first level
 * of a world whose novelty is already the ground. What it does instead is make
 * them feel different on it: the tall roofs are three tiles above the low ones,
 * which either can manage, and the high roof at 226 is four, which is inside
 * Mendy's jump and outside Berel's. The coins and the life are up there. The
 * route past is not.
 */
const HEIGHT = 28;
const WIDTH = 296;

/** The lawn. Everything else in the level is measured off it. */
const FLOOR = 21;
/** The top row of a porch: three tiles up, which is Berel's standing jump. */
const PORCH = FLOOR - 3;
/** The top row of an ordinary bungalow roof. Three above a porch. */
const ROOF = FLOOR - 6;
/** A taller one. Three above an ordinary roof, so either brother can get up. */
const TALL = FLOOR - 9;
/** The one Mendy can reach and Berel cannot: four above an ordinary roof. */
const HIGH = FLOOR - 10;

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
 * A bungalow: two tiles of shingle, and a porch under the near end of it.
 *
 * The roof is deliberately thin and deliberately floating. See the note above
 * about what happened when it was not.
 */
const bungalow = (x, w, top, { porch = 2 } = {}) => {
  L.slab(x, top, w, 2, 'roof');
  if (porch > 0) L.ledge(x - porch, PORCH, porch);
  return { left: x - porch, right: x + w, top };
};

/** A porch board. One tile thick, so the lawn under it stays walkable. */
const board = (x, w) => L.slab(x, PORCH, w, 1, 'platform');

// ---------------------------------------------------------------------------
// The road in. Lawn, a sign, and the first thing that moves.
// ---------------------------------------------------------------------------
L.ground(0, 62);

L.sign(2, [
  'THE BUNGALOW COLONY',
  'the roofs are the road up here.',
  'PORCH, THEN ROOF, THEN THE NEXT ROOF.',
]);

L.coinRow(8, on(FLOOR), 4);
// Puttering, both of them, slowly enough that you can stand and watch one
// arrive. The roof is solid: ride it along if you like.
L.hazard('golfCart', 20, FLOOR, -1);
L.coinArc(24, on(FLOOR) - 2, 8);

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
// the lawn is six tiles below, not a pit.
bungalow(76, 7, ROOF, { porch: 0 });
L.coinRow(77, on(ROOF), 5);

/**
 * The first rotting step.
 *
 * One board in the middle of a run, with whole boards either side of it and
 * open lawn below. §6 gives it "a beat", and the beat is four hundred and
 * twenty milliseconds: long enough to walk off, not long enough to stand and
 * think about it. There is nothing to lose here. The point is to learn what the
 * shudder means somewhere it costs nothing.
 */
board(86, 2);
L.step(88, PORCH);
board(89, 2);
L.label(85, on(PORCH) - 2, 'IT CREAKS');
L.coin(88, on(PORCH));

// A pot on the way past. Everything after this assumes you are carrying
// something, because the next thing along wants to take it.
L.block(94, FLOOR - 5, 'mystery', 'cholent');
L.coinRow(92, on(FLOOR), 2);

// ---------------------------------------------------------------------------
// The raccoon, and the porch it bolts under.
// ---------------------------------------------------------------------------
L.ground(102, 52);

/**
 * §6: "steal the player's power-up and bolt under a porch. Chase one down and
 * it drops what it took."
 *
 * It ambles at fifty-two, slower than either brother walks, so the collision is
 * always your own doing. What follows costs no health at all: the pot comes off,
 * it bolts for eleven hundred milliseconds, goes to ground under the porch at
 * 112 for two seconds, then wanders back out with your Cholent still on its
 * back. Stomp it and it drops what it took where it stood.
 *
 * On open lawn with its escape route in plain sight, and the porch it runs for
 * is one you were going to cross anyway.
 */
L.enemy(106, FLOOR, 'raccoon');
L.label(103, on(FLOOR) - 3, 'MIND YOUR POT');

const third = bungalow(112, 9, ROOF);
L.coinRow(113, on(ROOF), 7);

/**
 * The run of three, and the first one that can drop you.
 *
 * Three rotting boards over a three-tile hole in the lawn. Any one of them
 * holds long enough to stand on and none of them holds long enough to stand on
 * twice, so the crossing is a sentence with one verb in it: keep going. The
 * hole is three tiles wide, which a walking jump clears — so the boards are the
 * comfortable way across and not the only one.
 */
L.slab(124, PORCH, 3, 1, 'platform');
L.stepRow(127, PORCH, 3);
L.slab(130, PORCH, 3, 1, 'platform');
L.coinRow(127, on(PORCH), 3);
L.label(123, on(PORCH) - 2, 'DO NOT STOP');

// ---------------------------------------------------------------------------
// The first clothesline. Shown, not demanded.
// ---------------------------------------------------------------------------
bungalow(136, 10, TALL, { porch: 0 });
L.coinRow(137, on(TALL), 8);
// The way up to it: the third bungalow's roof is three tiles below this one.
L.coinRow(133, on(ROOF), 2);
L.slab(132, ROOF, 4, 2, 'roof');

/**
 * §6: "clotheslines — ride them like ziplines, or duck under them."
 *
 * Twelve tiles of rope from the tall roof down to the next porch, which is
 * about a second of riding. Both readings of the thing are available on the
 * same walk: step off the roof onto it and you ride, stroll along the lawn
 * beneath it and nothing at all happens — a rope catches feet that come down
 * through it and ignores a head going under.
 *
 * Nothing is being crossed here, and the coins are strung under the middle of
 * the rope where only a rider collects them. A missed grab costs six tiles of
 * climbing and no more, which is the right price for the first one.
 */
L.clothesline(146, TALL + 1, 12, 4);
L.coinRow(149, TALL + 3, 6);

const low = bungalow(160, 8, ROOF);
L.coinRow(161, on(ROOF), 6);
L.sign(158, ['RIDE IT. OR DUCK UNDER IT.'], on(PORCH) - 3);

L.checkpoint(157);

// ---------------------------------------------------------------------------
// The woods, and three roofs with holes between them.
// ---------------------------------------------------------------------------
L.ground(154, 38);

/** A tree: two tiles of trunk, and a wall exactly as tall as the porch. */
const tree = (x) => L.slab(x, PORCH, 2, 3, 'wall');
tree(170);
tree(186);
L.coinRow(174, on(FLOOR), 4);
L.enemy(178, FLOOR, 'raccoon');

/**
 * Three roofs, and three holes in the lawn under them.
 *
 * The first stretch where the ground is not an answer. Each hole is three tiles
 * — what a walking jump clears, and the widest pit this game allows itself
 * anywhere — and the roofs above are spaced the same three tiles apart, so the
 * route up top and the route down below cost the same jump. Up top pays in
 * coins.
 */
L.ground(195, 14);
L.ground(212, 30);

L.slab(192, ROOF, 5, 2, 'roof');
L.coinRow(193, on(ROOF), 3);
L.slab(200, ROOF, 5, 2, 'roof');
L.coinArc(200, on(ROOF) - 1, 5);
L.slab(208, ROOF, 6, 2, 'roof');
L.coinRow(209, on(ROOF), 4);

L.block(218, FLOOR - 5, 'mystery', 'menorah');
L.coinRow(216, on(FLOOR), 3);

/**
 * The high roof, and the two brothers going different ways.
 *
 * Four tiles above the roof beside it, which Mendy clears and Berel does not.
 * Eight coins along the top and a life at the end of them, and a perfectly good
 * route past one roof lower. §4's split should be worth something without ever
 * being a locked door.
 */
bungalow(226, 10, HIGH);
L.coinRow(227, on(HIGH), 8);
L.block(236, on(HIGH) - 1, 'mystery', 'lchaim');
bungalow(238, 6, ROOF, { porch: 0 });
L.coinRow(239, on(ROOF), 4);

L.hazard('golfCart', 246, FLOOR, -1);
L.crate(244);
L.enemy(244, FLOOR - 3, 'wasp');

// ---------------------------------------------------------------------------
// The last line, over a hole, and the way out.
// ---------------------------------------------------------------------------
L.ground(242, 22);

/**
 * The climb to the last roof: porch, shed, roof.
 *
 * Three tiles at a time, twice, which is the same staircase the level opened
 * with. The shed in the middle has nothing under it on purpose — a porch
 * directly beneath a roof leaves sixteen pixels to stand up in, and the trap
 * check is right to call that somewhere nobody fits.
 */
L.ledge(246, PORCH, 2);
L.slab(250, ROOF, 3, 2, 'roof');
L.coinRow(250, on(ROOF), 3);

bungalow(254, 9, TALL, { porch: 0 });
L.coinRow(255, on(TALL), 7);

/**
 * The exam: the same rope, over a hole in the ground.
 *
 * Eleven tiles from the tall roof down to the lawn on the far side of a
 * three-tile pit. It is still not the only way across — the pit is a walking
 * jump like every other pit in the game — but from up here the rope is by some
 * distance the best one, and by now it is a thing you know how to use.
 */
L.clothesline(263, TALL + 1, 11, 6);

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
