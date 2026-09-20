import { level } from '../level-builder.mjs';

/**
 * 2-3 — The Pool.
 *
 * "Water level. Swim physics, currents from the filter, a pool cover to swim
 * beneath." (§6)
 *
 * The first level in the game where the ground stops being the point. Every
 * other level so far is a floor with things on it; this one is a floor with
 * holes in it, and the holes are where you spend your time.
 *
 * ## The one rule the water is built on
 *
 * **You are never asked to swim head-on into a current.**
 *
 * Horizontal movement in this engine is a velocity approached at a rate, so a
 * current weaker than your acceleration does nothing at all and one stronger
 * than it is a wall with no door. There is no interesting middle. That is the
 * same trap the leaf blowers fell into in 2-2 at a force of 560, and it is
 * settled here by design rather than by tuning: currents are things you ride,
 * things you fall through, and things you go over the top of. A current band
 * never fills the column it is in — there is always clear water above it or
 * below it, and finding that water is the puzzle.
 *
 * ## What the brothers do differently in it
 *
 * **Mendy strokes higher** — about two and a half tiles to Berel's one and a
 * half, because the stroke is a fraction of each one's standing jump. Anything
 * that has to be climbed *through* water is his.
 *
 * **Mendy swims harder**, for the same reason his walk accelerates faster. He
 * recovers from a current in about half the time.
 *
 * **Berel breaks the grey blocks**, and two of them are on the bottom of a
 * pool, which is a place Mendy cannot do anything about however well he swims.
 *
 * **Berel walks through the leaf blower** on the far deck, as he does
 * everywhere else in this world.
 *
 * ## Depth, and why the map is taller
 *
 * Twenty-nine rows against the usual twenty-seven. A pool four tiles deep is a
 * puddle you hop out of before the physics has said anything; at seven, going
 * down is a decision and coming back up takes three strokes. The deck stays at
 * row 20 so that the water's surface and the concrete are the same line, which
 * is what a pool looks like and also what makes climbing out work: a stroke
 * taken at the surface is a full jump, so the deck is always one stroke away.
 */
const FLOOR = 20;
const HEIGHT = 29;
const WIDTH = 330;

const L = level({
  key: '2-3',
  name: 'The Pool',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x122530',
  backdrop: 'five_towns_dusk',
});

L.spawnAt(3);

/**
 * A pool: a hole in the deck with water in it.
 *
 * The basin has to be built as well as filled. Water is a region and not a
 * solid, so a pool with no floor is a hole you sink out of the bottom of.
 */
const pool = (x, w, bottom) => {
  L.slab(x, bottom, w, HEIGHT - bottom, 'pool');
  L.water(x, FLOOR, w, bottom - FLOOR);
};

// --- The deck. Dry, and long enough to forget the water is coming. ----------
L.ground(0, 38);
L.sign(3, ['THE POOL', 'the water is the way through, not the thing in the way.']);
L.coinRow(8, 18, 5);
L.coinArc(15, 17, 6);
L.block(22, 16, 'mystery', 'cholent');
L.ledge(26, 18, 5);
L.coinRow(26, 16, 5);
L.enemy(32, FLOOR, 'chipmunk');
L.sign(34, ['JUMP TO SWIM UP. KEEP ASKING.'], 16);

// --- The shallow end ---------------------------------------------------------
//
// Twelve tiles across and four deep, with nothing in it. The first time you
// meet a mechanic it should be worth something and cost nothing, so what is
// down here is coins and the only way to fail is to enjoy it.
pool(38, 12, 24);
L.coinRow(40, 22, 8);
L.coin(44, 21);
L.coin(45, 21);

L.ground(50, 16);
L.checkpoint(52);
L.sign(53, ['A GOOSE ON THE DECK IS STILL A GOOSE'], 16);
L.ledge(56, 18, 5);
L.coinRow(56, 16, 5);
L.enemy(62, FLOOR, 'goose');

// --- The deep end, and the first current -------------------------------------
//
// Six tiles of water with the filter pushing right along the bottom four. The
// top two rows are still, so the current is a lift you take if you want it —
// ride the bottom and cross in half the time, or swim the surface and take the
// long way. The coins are in the fast water.
//
// The grey blocks are at row 23, which is one stroke off the floor and two
// under the surface: Berel has to be down there to break them, and being down
// there is exactly what the level has just spent twelve tiles teaching.
pool(66, 20, 26);
L.current(68, 22, 16, 4, 1, 0);
L.coinRow(69, 24, 6);
L.coinRow(77, 24, 6);
L.block(75, 23, 'reinforced');
L.block(76, 23, 'mystery', 'lchaim');
L.sign(63, ['BEREL BREAKS GREY ONES UNDER WATER TOO'], 15);

L.ground(86, 14);
L.enemy(90, FLOOR, 'chipmunk');
L.sprinkler(93, 19, { periodMs: 2500, offsetMs: 0 });
L.slab(96, 13, 10, 1);
L.coinRow(97, 11, 6);
L.block(103, 11, 'mystery', 'lchaim');

// --- The filter, and the drain ------------------------------------------------
//
// The deepest water in the level, and the only place it goes down as well as
// along. A jet lifts the left-hand column; the drain at 116 pulls the bottom
// five rows straight down.
//
// Both are bands, and neither reaches the surface. Crossing this pool along
// rows 20 and 21 is uneventful and always available. Everything worth having
// is in the part that is trying to move you.
L.checkpoint(96);
pool(100, 26, 27);
L.jet(103, 21, 3, 6);
L.slab(108, 24, 6, 3, 'pool');
L.coinRow(108, 23, 6);
L.current(116, 22, 5, 5, 0, 1, 320);
L.coinRow(116, 25, 5);
L.coin(118, 24);
L.sign(87, ['THE FILTER MOVES THE WATER. THE TOP IS STILL.'], 16);

L.ground(126, 16);
L.enemy(131, FLOOR, 'goose');
L.hazard('mower', 136, FLOOR, -1);
L.ledge(128, 18, 4);
L.coinRow(128, 16, 4);
L.checkpoint(138);

// --- Under the cover -----------------------------------------------------------
//
// §6 asks for "a pool cover to swim beneath", which means the cover cannot be
// a thing you walk over instead. The first draft said that with a fence at the
// water's edge, and watching it played showed why that is the wrong shape: a
// wall standing where you are bobbing turns the entrance into a pocket you
// bounce around in, and a player holding the jump button never gets under at
// all — every stroke near the surface is a jump, so it throws you at the fence
// again.
//
// So the cover is a walkway with a hole in it. You step off the deck onto the
// lid, walk six tiles, and the lid stops. Six tiles of open water is past any
// jump in the game, so you go in — and the second stretch of lid has a fence
// on it, so climbing back out on the far side is not on offer either. Nothing
// herds you. The floor just runs out.
//
// The fence stands on 156 and not on 155, which is the difference between a
// dead end and a trap. On 155 it is a wall at the waterline: you surface, get
// thrown at it, fall back, surface again, and the cycle is entirely invisible
// because you never stop moving. One tile back, there is a board to land on
// first — so you climb out, see the fence in front of you, and step off
// backwards. A dead end has to be somewhere you can stand still and look at.
//
// What is under there is a slalom. A ledge hangs off the underside of the
// cover at 158 and another sits on the floor at 166, so the route goes low,
// then high, then low again, with the filter helping for the first stretch and
// dropping you for the second. Nothing down here can kill you. It is dark and
// it is long and you cannot surface, and that is the whole idea.
pool(142, 36, 26);
L.slab(142, 20, 7, 1);   // lid, near side: decking, not pool tile
L.slab(155, 20, 19, 1);  // lid, far side
L.slab(156, 14, 1, 6, 'wall');
L.sign(136, ['THE COVER RUNS OUT. KEEP GOING.'], 16);
L.current(156, 21, 6, 5, 1, 0);
L.slab(158, 21, 4, 2, 'pool');
L.coinRow(158, 24, 4);
L.slab(166, 24, 4, 2, 'pool');
L.coinRow(166, 22, 4);
L.current(164, 23, 3, 3, 0, 1, 300);
L.coinRow(170, 23, 4);

L.ground(178, 18);
L.checkpoint(182);
L.sign(179, ['BEREL DOES NOT FEEL THE WIND. HE STILL HAS TO SWIM.'], 16);
L.blower(186, 15, 9, 5, -1);
L.coinRow(187, 18, 7);

// --- The long swim -------------------------------------------------------------
//
// Thirty-four tiles of water with the filter running the wrong way along the
// bottom four rows. Rows 20 to 22 are clear the whole length, so the crossing
// is never in doubt — what the current costs you is the coins, which are all
// in it, and the way to take them is to drop in, let it carry you back a
// little, and climb out of the band before it has finished with you. Mendy
// gets out of it in about half the time Berel does.
pool(196, 34, 27);
// Rows 24 to 26, not 23 to 26. The band has to leave a lane wide enough to
// swim in without threading it: at three clear rows the surface route is
// forty-eight pixels for a twenty-two pixel body, and anything tighter turns
// the one route that is always meant to work into a thing you can miss and
// fall out of — which is how a run ended up spending a minute pinned against
// the bottom of this pool being pushed backwards.
L.current(200, 24, 26, 3, -1, 0, 300);
L.coinRow(202, 25, 6);
L.coinRow(212, 25, 6);
L.coinRow(222, 25, 6);
// Ledges under the lane and over the band: somewhere to stand that the filter
// cannot reach, which is what makes going down for the coins a round trip
// rather than a commitment.
L.slab(206, 23, 5, 1, 'pool');
L.slab(216, 23, 5, 1, 'pool');
L.block(210, 21, 'mystery', 'lchaim');

L.ground(230, 20);
L.enemy(234, FLOOR, 'goose');
L.enemy(246, FLOOR, 'chipmunk');
L.checkpoint(244);
L.hazard('minivan', 240, FLOOR, -1);

// --- The boards ----------------------------------------------------------------
//
// A ladder of three, and the top one is Mendy's.
//
// Row 17 to row 13 is four tiles, which is sixty-four pixels: past Mendy's
// standing jump of sixty-two and inside his running one, and past Berel's
// running jump of sixty-two by two pixels. It is the same gate 2-2 used on a
// deck, said again with a diving board, and what is on the end of it is a life
// and a long way down into the deep end.
L.slab(233, 17, 6, 1);
L.coinRow(233, 15, 6);
L.slab(241, 13, 6, 1);
L.block(244, 11, 'mystery', 'lchaim');
L.label(238, 12, 'MENDY ONLY');
L.coinArc(248, 12, 8);

pool(250, 30, 26);
L.coinRow(252, 22, 6);
L.coinRow(262, 23, 6);
L.jet(270, 21, 3, 5);
L.coinRow(270, 21, 3);
L.block(274, 22, 'reinforced');
L.block(275, 22, 'mystery', 'lchaim');

// --- Out, and along the last of the deck ----------------------------------------
L.ground(280, 50);
L.checkpoint(286);
L.enemy(292, FLOOR, 'goose');
L.enemy(300, FLOOR, 'chipmunk');
L.enemy(308, FLOOR, 'goose');
L.ledge(296, 18, 6);
L.coinRow(296, 16, 6);
L.block(304, 16, 'mystery', 'menorah');
L.label(302, 18, 'MENORAH — PRESS X');
L.coinRow(312, 18, 6);
L.sign(316, ['TOUCH THE POST'], 16);
L.goalAt(324);

export default L.build();
