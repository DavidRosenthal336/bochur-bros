import { level } from '../level-builder.mjs';

/**
 * 2-2 — Backyards.
 *
 * "Trampolines, sprinklers, mowers, leaf blowers, fences. Heavy Mendy/Berel
 * swapping." (§6)
 *
 * Central Avenue was a street: one long line with traffic on it. This is the
 * gardens behind it, so the shape is different — a row of walled boxes, and
 * getting out of each one is the level. Fences you cannot walk round,
 * trampolines and sprinklers that throw you over them, and machinery that was
 * running before you arrived.
 *
 * ## The swapping, and why it is not a demand
 *
 * §6 asks for heavy swapping here, and the honest way to get it is to make
 * each brother obviously better at something rather than to lock doors.
 *
 * **Berel walks through the leaf blowers.** He is immune (§6); Mendy is pushed
 * backwards mid-jump and has to fight the gap. Both can cross — one of them
 * just does not have to think about it.
 *
 * **Berel opens the grey blocks**, which hold the coins and one of the lives.
 *
 * **Mendy reaches the high decks**, because four tiles is past Berel's jump
 * with a run-up and comfortably inside Mendy's.
 *
 * Nothing here is impossible as either brother. The level is shaped so that
 * doing it as one of them is work and as the other is nothing, and which one
 * changes every fifty tiles.
 *
 * ## Sprinklers
 *
 * §6 calls them "the intended route to high platforms", which makes a
 * sprinkler a platform with a timetable rather than a hazard. They are up for
 * nine hundred milliseconds in every cycle and the head pops before it throws,
 * so the read is visual and from a distance. A row of them is offset so it
 * ripples rather than firing as one wall.
 */
const FLOOR = 20;
const HEIGHT = 27;
const WIDTH = 312;

const L = level({
  key: '2-2',
  name: 'Backyards',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x1d1b2a',
  backdrop: 'five_towns_dusk',
});

L.spawnAt(3);

/**
 * A back fence: too tall to jump, which is the whole point of a backyard.
 *
 * Five tiles, not six. A jump is under four so it is still a fence, and a
 * trampoline throws you seven and a half — but a launch taken badly, with the
 * jump button held or from a standing start, comes out around five and a half,
 * and a fence at six tiles turns those into a wall you bounce against forever.
 * The route over has to have slack in it or it is not a route.
 */
const fence = (x) => L.slab(x, 15, 1, FLOOR - 15, 'wall');

// --- The first yard. A fence, and a trampoline to clear it. ------------------
L.ground(0, 34);
L.sign(3, ['BACKYARDS', 'the fences do not have gates.']);
L.coinRow(7, 18, 4);
// Three tiles short of the fence, not eight. A launch hangs about
// seven tenths of a second, which carries you five tiles at a run — so a
// trampoline further from its fence than that throws you straight into the
// side of it, which is a worse outcome than no trampoline at all.
L.trampoline(18, 19, 3);
L.coinRow(18, 13, 3);
fence(22);
L.coinRow(24, 18, 4);
L.enemy(29, FLOOR, 'chipmunk');
L.checkpoint(31);

// --- Sprinklers, on their own, with nothing else happening -------------------
//
// Three of them, rippling, under a deck you cannot otherwise reach. The deck
// is optional and has the coins on it — the first time you meet a mechanic it
// should be worth something rather than required.
L.ground(37, 40);
L.sign(38, ['THEY COME UP ON A TIMER. RIDE ONE.'], 16);
//
// The deck sits BESIDE the sprinklers, not over them. A launcher with a
// platform directly above it throws you into that platform's underside
// forever — measured, the first draft capped every launch at 90px against a
// throw of 162 and the deck was simply unreachable. You go up next to it and
// come down on it.
L.sprinkler(44, 19, { periodMs: 2600, offsetMs: 0 });
L.sprinkler(50, 19, { periodMs: 2600, offsetMs: 700 });
L.sprinkler(56, 19, { periodMs: 2600, offsetMs: 1400 });
L.slab(60, 13, 14, 1);
L.coinRow(62, 11, 6);
L.block(68, 11, 'mystery', 'lchaim');
L.enemy(66, FLOOR, 'goose');
L.ledge(70, 18, 5);

// --- The first leaf blower ---------------------------------------------------
//
// Pointed back the way you came, across a three-tile gap. As Mendy it is a
// real jump; as Berel it is a step. The sign says so, because a mechanic
// nobody notices is a mechanic that reads as the game misbehaving.
L.ground(80, 26);
L.sign(81, ['BEREL DOES NOT FEEL THE WIND.'], 16);
L.blower(92, 15, 12, 5, -1);
L.coinRow(94, 18, 6);
L.ground(109, 30);
L.enemy(116, FLOOR, 'chipmunk');
L.enemy(124, FLOOR, 'goose');
L.checkpoint(112);

// --- Mowers on a long lawn ---------------------------------------------------
//
// Two of them, in opposite directions, with hedges to stand on between. They
// are slow and their decks are platforms, so the lawn is a timing exercise
// with an answer that does not involve waiting.
L.sign(130, ['THE MOWERS ARE NOT WATCHING WHERE THEY GO'], 16);
L.hazard('mower', 132, FLOOR, 1);
L.hazard('mower', 136, FLOOR, -1);
L.ledge(126, 18, 4);
L.ledge(134, 18, 4);
L.coinRow(126, 16, 4);
L.coinRow(134, 16, 4);

// --- Over the fences, one trampoline at a time -------------------------------
//
// Three yards in a row. The fence is the wall, the trampoline is the door, and
// there is a goose in two of them, because a yard you have to bounce into is a
// yard you cannot see the floor of first.
L.ground(142, 61);
fence(150);
L.trampoline(146, 19, 3);
L.coinRow(146, 12, 3);
L.enemy(156, FLOOR, 'goose');

fence(168);
L.trampoline(164, 19, 3);
L.coinRow(164, 12, 3);
L.block(158, 15, 'reinforced');
L.block(159, 15, 'mystery', 'lchaim');
L.sign(154, ['BEREL BREAKS THE GREY ONE'], 13);

fence(186);
L.trampoline(182, 19, 3);
L.coinRow(182, 12, 3);
L.enemy(174, FLOOR, 'goose');
L.enemy(192, FLOOR, 'chipmunk');
L.checkpoint(198);

// --- The long blower ---------------------------------------------------------
//
// Twenty tiles of it, over ground you can stand on the whole way, with a
// trampoline in the middle. Nothing here can kill you; it is a stretch that is
// simply harder as one brother than the other, and it lasts long enough to be
// worth swapping for.
L.ground(206, 41);
L.sign(207, ['A LONG WAY TO BE PUSHED'], 16);
L.blower(212, 13, 22, 7, -1);
L.coinRow(214, 18, 8);
L.trampoline(224, 19, 3);
L.slab(230, 13, 12, 1);
L.coinRow(232, 11, 6);
L.enemy(238, FLOOR, 'goose');

// --- Sprinklers and a deck only Mendy reaches --------------------------------
//
// The deck is four tiles up off the sprinkler's throw, which is past Berel and
// inside Mendy. What is on it is a life, so it is worth the swap and costs
// nothing to skip.
L.ground(250, 62);
L.sprinkler(254, 19, { periodMs: 2400, offsetMs: 0 });
L.sprinkler(258, 19, { periodMs: 2400, offsetMs: 800 });
L.slab(262, 13, 12, 1);
L.coinRow(264, 11, 6);
// Four rows over the deck: 64px, which is past Mendy's standing jump of 62
// and reached off the run-up the deck is wide enough to give him. Berel's
// run-up jump is 62 and lands him two pixels short, which is the gate.
L.slab(275, 9, 8, 1);
L.block(278, 7, 'mystery', 'lchaim');
L.sign(264, ['MENDY JUMPS HIGHER'], 11);
L.enemy(284, FLOOR, 'goose');
L.enemy(292, FLOOR, 'chipmunk');
L.coinRow(286, 18, 6);
L.sign(298, ['TOUCH THE POST'], 16);
L.goalAt(306);

export default L.build();
