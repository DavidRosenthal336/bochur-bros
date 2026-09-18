import { level } from '../level-builder.mjs';

/**
 * 1-3 — The Stroller.
 *
 * "Auto-scroll chase level, timed. The stroller pursues the whole way." (§6)
 *
 * Two pressures at once and neither lets up: the screen moves on by itself,
 * and the stroller comes from behind. Half again as long as it was, with more
 * in the way, but the rule it is built on has not changed and will not:
 *
 * **The route is never ambiguous.** At this speed there is no time to read a
 * fork, so there isn't one. 1-1 has the forks; this is a straight run with
 * things to clear, and every one of them is met head-on.
 *
 * What is new is density. The middle of the level now runs cart, van,
 * scaffolding, rats and geese-in-all-but-name back to back with only enough
 * flat ground between them to land, and the back half asks for the van roof
 * and the awnings rather than offering them.
 *
 * Gaps go to three tiles here — a walking jump clears three at its limit, and
 * at chase speed you are not walking. It is the one level that spends that
 * margin, which is why 1-1 does not.
 */
const FLOOR = 20;
const HEIGHT = 27;
const WIDTH = 362;

const L = level({
  key: '1-3',
  name: 'The Stroller',
  width: WIDTH,
  height: HEIGHT,
  floorTop: FLOOR,
  background: '0x241826',
  backdrop: 'dusk',
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
L.ground(83, 15);
L.bounce(88, 19, 3);
L.coinRow(88, 15, 3);
L.ground(101, 20);
L.enemy(106, 16);
L.enemy(114, 17);
L.block(110, 16, 'mystery', 'cholent');

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
L.block(168, 16, 'mystery', 'lchaim');

// --- A cart rolling the other way -------------------------------------------
L.ground(186, 29);
L.hazard('cart', 210, FLOOR, -1);
L.coinRow(190, 18, 5);
L.block(196, 16, 'mystery', 'cholent');

// --- The van, and the roof that is the way past it --------------------------
//
// A three-tile gap immediately after it, which is the widest this world asks
// for. Coming off the roof you are already moving, so it is a gap you clear by
// not stopping — the whole level in one jump.
L.ground(218, 22);
L.hazard('van', 232, FLOOR, -1);
L.sign(219, ['OVER THE ROOF'], 16);
L.coinRow(222, 18, 4);
L.ground(243, 20);
L.enemy(248, 16);
L.enemy(256, 17);
L.checkpoint(258);

// --- Two carts and a narrowing street ---------------------------------------
L.ground(266, 24);
L.hazard('cart', 286, FLOOR, -1);
L.hazard('cart', 289, FLOOR, -1);
L.bounce(272, 17, 3);
L.coinRow(272, 14, 3);
for (const x of [278, 284]) L.enemy(x, FLOOR, 'rat');

// --- Scaffolding again, closer together, with pigeons under it --------------
L.ground(293, 34);
L.slab(293, 12, 34, 1);
for (const x of [297, 303, 309, 315, 321]) L.hazard('pipe', x, 12);
L.enemy(300, 16);
L.enemy(312, 16);
L.coinRow(305, 18, 6);
L.block(318, 16, 'mystery', 'lchaim');
L.checkpoint(324);

// --- Home straight ----------------------------------------------------------
L.ground(330, 32);
L.coinRow(334, 18, 8);
L.enemy(344, 16);
L.sign(346, ['ALMOST'], 16);
L.goalAt(356);

export default L.build();
