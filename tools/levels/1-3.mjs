import { level } from '../level-builder.mjs';

/**
 * 1-3 — The Stroller.
 *
 * "Auto-scroll chase level, timed. The stroller pursues the whole way." (§6)
 *
 * Two pressures at once and neither lets up: the screen moves on by itself, and
 * the stroller comes from behind. The design rule here is that the route is
 * never ambiguous — at this speed there is no time to read a fork, so there
 * isn't one. Everything is a straight run with things to clear.
 */
const FLOOR = 20;
const HEIGHT = 27;
const L = level({
  key: '1-3',
  name: 'The Stroller',
  width: 260,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x241826',
});

L.spawnAt(10);
L.scrolls(86); // slightly under a walk, so standing still loses ground
L.sign(10, ['RUN.', 'the stroller does not get tired and neither does the screen.']);

/**
 * The stroller starts behind you and never stops coming.
 *
 * Nine tiles behind, not one. At one tile its hitbox overlapped the spawn
 * point, so the level killed you before you had pressed anything — a head
 * start of about a second is the difference between a chase and an ambush.
 */
L.hazard('stroller', 1, FLOOR, 1);

// --- Opening: clear ground to get moving ------------------------------------
L.ground(0, 40);
L.coinRow(12, 18, 6);
L.bounce(26, 17, 3);
L.coinRow(26, 14, 3);

// --- Gaps, taken at speed ---------------------------------------------------
L.ground(43, 16);
L.coinArc(43, 18, 6);
L.ground(62, 18);
L.enemy(68, 16);
L.checkpoint(70);

// --- Rubbish bags to bounce over a longer gap -------------------------------
L.ground(83, 14);
L.bounce(88, 19, 3);
L.coinRow(88, 15, 3);
L.ground(101, 20);
L.enemy(106, 16);
L.enemy(114, 17);

// --- Scaffolding: pipes drop as you pass under ------------------------------
L.ground(124, 30);
L.sign(125, ['SCAFFOLDING — WATCH THE GROUND'], 16);
L.slab(124, 12, 30, 1);
for (const x of [130, 137, 144, 150]) L.hazard('pipe', x, 12);
L.coinRow(132, 18, 4);
L.checkpoint(150);

// --- Rats out of the grates -------------------------------------------------
L.ground(157, 26);
for (const x of [162, 170, 178]) L.enemy(x, FLOOR, 'rat');
L.coinRow(165, 18, 4);
L.bounce(174, 17, 3);

// --- A cart rolling the other way -------------------------------------------
L.ground(186, 28);
L.hazard('cart', 210, FLOOR, -1);
L.coinRow(190, 18, 5);
L.block(196, 16, 'mystery', 'cholent');

// --- Home straight ----------------------------------------------------------
L.ground(217, 43);
L.coinRow(222, 18, 8);
L.enemy(232, 16);
L.sign(240, ['ALMOST'], 16);
L.goalAt(252);

export default L.build();
