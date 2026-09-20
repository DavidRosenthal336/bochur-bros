import { level } from '../level-builder.mjs';

/**
 * 2-1 — Central Avenue.
 *
 * "Minivans, the carpool line, street crossings, introduces geese." (§6)
 *
 * The first level of a new world has one job beyond being a level: say what
 * the world is. §6 calls The Five Towns "open, manicured, quiet, and full of
 * machinery that turns itself on", and the shape of this one follows that
 * sentence. Long flat lawns with a lot of air over them, and the danger is
 * traffic and a bird rather than a street that is trying to fall on you.
 *
 * ## What it teaches, in order
 *
 * **The goose**, alone, on open grass, with a hedge to stand on. It hisses
 * first, then comes, and it does not stop coming — §6 says geese "don't scare
 * off", so the lesson is that standing your ground is not one of the options.
 * Two stomps, or get above it.
 *
 * **Chipmunks**, which are rats by another name and are introduced next to
 * something you already know how to do so that nobody has to think twice.
 *
 * **The crossing.** Minivans driving through, both ways, over a road you have
 * to be on. Nothing to climb; it is pure timing, and it is short.
 *
 * **The carpool line**, which is the level's centrepiece and the reason 1-1
 * spends a whole paragraph on one shopping cart. Four minivans nose to tail,
 * roofs at a height you can chain across, each one lurching forward when you
 * get close. §6: the player "must climb the thing trying to kill them". The
 * pavement beside it is walkable the whole way, so the roofs are the fast
 * route and not the only one.
 *
 * ## The rules it keeps from World 1
 *
 * Gaps stay at two tiles — this is a first level, and three-tile gaps are
 * something 2-3 can spend. Nothing can kill you before the first checkpoint.
 * Everything that hurts you announces itself first.
 */
const FLOOR = 20;
const HEIGHT = 27;
const WIDTH = 300;

const L = level({
  key: '2-1',
  name: 'Central Avenue',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x14231c',
  backdrop: 'five_towns_day',
});

L.spawnAt(3);

// --- Open lawn. Nothing happens here, on purpose. ---------------------------
L.ground(0, 30);
L.sign(3, ['CENTRAL AVENUE', 'quieter. not safer.']);
L.coinRow(8, 18, 5);
L.coinArc(16, 17, 6);
L.block(24, 16, 'mystery', 'cholent');

// --- The goose ---------------------------------------------------------------
//
// One, on flat grass, with a hedge two tiles up that it cannot follow you onto.
// The hedge is the answer to the whole species and it is put within reach the
// first time you meet one.
L.ground(33, 34);
L.sign(34, ['IT DOES NOT GIVE UP. GET ABOVE IT.'], 16);
L.enemy(48, FLOOR, 'goose');
L.ledge(40, 18, 5);
L.coinRow(40, 16, 5);
L.ledge(54, 18, 5);
L.coinRow(54, 16, 5);
L.checkpoint(64);

// --- Chipmunks, and a second goose with more room ----------------------------
L.ground(70, 38);
for (const x of [76, 88, 100]) L.enemy(x, FLOOR, 'chipmunk');
L.enemy(94, FLOOR, 'goose');
L.ledge(80, 17, 6);
L.coinRow(80, 15, 6);
L.block(86, 15, 'mystery', 'lchaim');
L.ledge(96, 18, 4);

// --- The crossing ------------------------------------------------------------
//
// A road with minivans on it and nothing to climb. Short, because timing
// puzzles stop being puzzles and start being tolls if you make them long.
L.ground(111, 32);
L.sign(112, ['SCHOOL PICKUP. WAIT FOR A GAP.'], 16);
L.hazard('minivan', 134, FLOOR, -1);
L.hazard('minivan', 118, FLOOR, 1);
L.coinRow(120, 18, 4);
L.ledge(126, 17, 4);
L.coinRow(126, 15, 4);

// --- The carpool line --------------------------------------------------------
//
// Four of them nose to tail. Each waits, then lurches when you come near, so
// crossing the roofs is a sequence you read rather than a run you commit to.
// The grass alongside goes all the way through — the roofs are the quick way,
// not the only way.
L.ground(145, 58);
L.sign(146, ['OVER THE ROOFS, OR ROUND THE LONG WAY'], 16);
for (const x of [154, 166, 178, 190]) L.hazard('minivan', x, FLOOR, -1);
L.coinRow(150, 14, 4);
L.coinRow(162, 14, 4);
L.coinRow(174, 14, 4);
L.coinRow(186, 14, 4);
L.enemy(160, FLOOR, 'chipmunk');
L.enemy(184, FLOOR, 'chipmunk');
L.checkpoint(198);

// --- Hedges, geese, and somewhere to be ---------------------------------------
//
// Two geese on the same lawn, and a run of hedges at two tiles. Everything a
// goose can reach on foot it eventually reaches, so the hedges are not cover,
// they are a route — you are meant to be moving along the tops of them.
L.ground(205, 46);
L.enemy(214, FLOOR, 'goose');
L.enemy(236, FLOOR, 'goose');
L.ledge(210, 18, 6);
L.ledge(220, 18, 6);
L.ledge(230, 18, 6);
L.ledge(240, 18, 6);
L.coinRow(211, 16, 4);
L.coinRow(231, 16, 4);
L.block(225, 15, 'mystery', 'menorah');
L.label(222, 17, 'MENORAH — PRESS X');

// --- A mower on the last lawn -------------------------------------------------
//
// It is slow, it turns at the edges, and its deck is a platform. After four
// minivans it should read immediately as one more thing to stand on.
L.ground(253, 47);
L.hazard('mower', 268, FLOOR, -1);
L.coinRow(258, 18, 6);
L.enemy(272, FLOOR, 'chipmunk');
L.enemy(280, FLOOR, 'goose');
L.block(264, 16, 'mystery', 'lchaim');
L.sign(286, ['TOUCH THE POST'], 16);
L.goalAt(294);

export default L.build();
