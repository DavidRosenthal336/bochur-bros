import { level } from '../level-builder.mjs';

/**
 * The prologue — "The Kiddush".
 *
 * §1 opens with the premise and the game never showed it: "The Yetzer Hara
 * crashed the kiddush and made off with the entire spread, scattering it
 * across four places. Mendy and his chavrusa Berel have to get it all back."
 * Without it the game starts on a map of four neighbourhoods with no account
 * of why anyone is going to them.
 *
 * Three rules this level is built to, and everything in it follows from them.
 *
 * **It cannot be lost.** No pits, no enemies, no hazards, no clock — §7 names
 * the only three timed levels in the game and this is not one of them. The
 * ground runs unbroken from the first tile to the last. A player's first
 * minute should not contain a failure state, and a prologue that can be failed
 * is a prologue that gets skipped.
 *
 * **It cannot be won either.** He is faster than both brothers and holds
 * station ahead of you no matter how you run, so the chase has no outcome to
 * play for. What it has is a direction, which is all an opening needs.
 *
 * **It teaches by being walked through.** Coins mark the line to run. The
 * hops are low enough for Berel's standing jump — three tiles is his ceiling
 * with no margin at all, so nothing here is above two. The awnings are there
 * to be found rather than needed. Nobody is asked to do anything they have not
 * been shown, because nothing here is a test.
 */
const WIDTH = 116;
const HEIGHT = 27;
const FLOOR = 20;

const L = level({
  key: 'intro',
  name: 'The Kiddush',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x1b2440',
  backdrop: 'day',
});

// Unbroken, the whole way. This is the level's main promise.
L.ground(0, WIDTH);

// The shul wall, so the street has somewhere to start from and nobody wanders
// backwards out of the scene looking for something that is not there.
L.slab(0, 8, 2, FLOOR - 8, 'wall');

L.spawnAt(5);

/**
 * The kiddush itself: two trestle tables, one tile high, still standing.
 *
 * One tile because they are furniture and not obstacles — you hop over them
 * without thinking about it, which is the first thing the level teaches and
 * the last time it will be free.
 */
L.ledge(8, 19, 4);
L.ledge(15, 19, 3);

// What was on them, now on the floor.
L.coinRow(9, 18, 3);
L.coin(16, 18);
L.coin(17, 18);

/**
 * He starts here, a few tiles ahead, standing still.
 *
 * Standing still matters: the level opens on a held beat so the player reads
 * the room and the sign before anything moves, and then he bolts. That moment
 * — the shape turning and going — is the crash, and it is the only thing the
 * prologue actually has to sell.
 *
 * Which is why he is at fourteen and not out past the tables where he was.
 * The view is twenty tiles wide and the camera opens hard against the left
 * wall, so anything past about tile twenty is simply not on screen: he was
 * standing off the edge of the picture for the entire held beat, and the
 * camera shook at an empty street. A beat nobody can see is not a beat.
 */
L.thiefAt(14, FLOOR);

L.sign(4, [
  'THE KIDDUSH',
  'someone just took the whole spread.',
  'after him.',
]);

/**
 * The street.
 *
 * A long clear run with three easy hops in it, spaced far enough apart to be
 * arrived at rather than reacted to. Everything is two tiles or less.
 */
L.ledge(38, 19, 5);
L.coinArc(37, 17, 8);

L.ledge(56, 18, 4);
L.ledge(62, 19, 3);
L.coinRow(57, 16, 3);

L.ledge(80, 19, 6);
L.coinArc(79, 17, 8);

// Awnings over the shopfronts. Not needed to get anywhere — they are there so
// that a player who jumps at everything is rewarded rather than punished.
L.bounce(48, 15, 3);
L.bounce(70, 15, 3);
L.bounce(95, 15, 3);
L.coinRow(48, 13, 3);
L.coinRow(70, 13, 3);
L.coinRow(95, 13, 3);

L.sign(44, ['hold SHIFT to run.'], 16);
L.sign(74, ['TAB swaps brothers, any time.'], 16);

/**
 * The end of the street, and the end of the chase.
 *
 * He stops at 104 and goes up and over; the goal sits three tiles past that,
 * so the player walks the last of it and the escape happens in front of them
 * rather than off the edge of the screen.
 */
L.goalAt(107);

export default L.build();
