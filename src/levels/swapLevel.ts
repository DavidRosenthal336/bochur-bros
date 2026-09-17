import type {
  BlockPlacement,
  EnemyPlacement,
  HazardPlacement,
  LabelDef,
  LevelDef,
  SolidDef,
  TilePoint,
} from './LevelDef';

/**
 * "The Chavrusa" — the Milestone 3 test level.
 *
 * One station per ability, each one a wall to somebody. §4 asks that level
 * design "regularly require both", so nothing here is passable as one brother
 * alone: Berel cannot reach, Mendy cannot shift, and the level alternates
 * between the two on purpose.
 *
 * Authored in TILES, top-left origin, y down.
 */

const FLOOR_TOP = 20;
const HEIGHT = 28;
/** The floor of the under-chamber at the weak-floor station. */
const CHAMBER_FLOOR = 23;

const solids: SolidDef[] = [];
const labels: LabelDef[] = [];
const coins: TilePoint[] = [];
const blocks: BlockPlacement[] = [];
const enemies: EnemyPlacement[] = [];
const crates: TilePoint[] = [];
const hazards: HazardPlacement[] = [];
const checkpoints: TilePoint[] = [];

/** Solid ground from the surface all the way down. */
function ground(x: number, w: number): void {
  solids.push({ x, y: FLOOR_TOP, w, h: HEIGHT - FLOOR_TOP, kind: 'ground' });
}

/** An arbitrary solid block. */
function slab(x: number, y: number, w: number, h: number, kind: SolidDef['kind'] = 'platform'): void {
  solids.push({ x, y, w, h, kind });
}

function coinRow(x: number, y: number, count: number): void {
  for (let i = 0; i < count; i += 1) coins.push({ x: x + i, y });
}

/**
 * Station signage.
 *
 * Measured, not guessed: standing on the floor the camera's top edge sits at
 * y=230, which is row 14.4. Row 15 is the first row reliably on screen, so
 * that is where signage starts.
 */
const FIRST_VISIBLE_ROW = 15;

function sign(x: number, lines: readonly string[]): void {
  lines.forEach((text, i) => labels.push({ x, y: FIRST_VISIBLE_ROW + i, text }));
}

// ---------------------------------------------------------------------------
// A — the swap itself. Nothing to get past; just feel it.
// ---------------------------------------------------------------------------
ground(0, 20);
sign(2, [
  'TAB or C SWAPS BROTHERS',
  'mendy jumps higher and further. berel is stronger.',
  'same spot, same speed, same power-up. free and instant.',
]);
coinRow(8, 18, 4);

// ---------------------------------------------------------------------------
// B — MENDY: a four-tile wall. Berel tops out just under four.
// ---------------------------------------------------------------------------
ground(20, 20);
sign(21, ['B  MENDY ONLY', 'four tiles up. berel cannot reach it.']);
slab(27, FLOOR_TOP - 4, 6, 4);
coinRow(27, 14, 6);
checkpoints.push({ x: 36, y: FLOOR_TOP });

// ---------------------------------------------------------------------------
// C — MENDY: a five-tile gap, and a real one. Berel lands in it.
// ---------------------------------------------------------------------------
// Measured: Mendy clears six at a run, Berel tops out at five. Six is also
// Mendy's exact limit, so this jump is genuinely demanding — which is fine,
// because missing it is not fatal. The gap bottoms out two tiles down and both
// brothers can hop back out, so a failed attempt costs a walk back and nothing
// else. Only the pits that teach nothing are worth killing for.
ground(40, 8);
sign(41, ['C  MENDY ONLY', 'six tiles across. run at it. missing it is survivable.']);
slab(48, FLOOR_TOP + 2, 6, HEIGHT - (FLOOR_TOP + 2), 'ground');
ground(54, 11);

// ---------------------------------------------------------------------------
// D — BEREL: a wind corridor. It blows Mendy back down the level; Berel does
// not notice it at all (§4).
// ---------------------------------------------------------------------------
ground(65, 20);
sign(66, ['D  BEREL ONLY', 'the wind does not move him.']);
hazards.push({ x: 68, y: 14, w: 12, h: 6, kind: 'wind', direction: -1 });
checkpoints.push({ x: 82, y: FLOOR_TOP });

// ---------------------------------------------------------------------------
// E — BEREL: a crate wedged in a doorway. The wall is too tall to go over and
// the doorway is one tile high, so the crate has to move, and only Berel moves
// crates.
// ---------------------------------------------------------------------------
ground(85, 20);
sign(86, ['E  BEREL ONLY', 'shove the crate out of the doorway.', 'then hold DOWN to duck through.']);
slab(92, 8, 2, 11, 'wall'); // rows 8-18, leaving row 19 as the doorway
crates.push({ x: 92, y: FLOOR_TOP });
coinRow(96, 18, 3);

// ---------------------------------------------------------------------------
// F — BEREL: a reinforced block. Mendy cannot break one in any form, so the
// only way up out of this corridor is Berel's headbutt.
// ---------------------------------------------------------------------------
ground(105, 25);
sign(106, ['F  BEREL ONLY', 'the grey block only breaks for berel.', 'hit it from underneath.']);
slab(105, 15, 4, 3, 'wall'); // stops you climbing onto the shelf from the left
slab(109, 17, 4, 1);
blocks.push({ x: 113, y: 17, kind: 'reinforced' });
blocks.push({ x: 114, y: 17, kind: 'reinforced' });
slab(115, 17, 8, 1);
slab(121, 18, 2, 2, 'wall'); // the corridor dead-ends here
coinRow(116, 15, 4);
enemies.push({ x: 118, y: 12, kind: 'pigeon' });

// ---------------------------------------------------------------------------
// G — BEREL: a weak floor. The way on is blocked above, so the route is down,
// and the only way down is Berel's ground pound (hold DOWN in mid-air).
// ---------------------------------------------------------------------------
sign(131, ['G  BEREL ONLY', 'jump, then hold DOWN to smash through.']);
slab(130, FLOOR_TOP, 6, 1, 'ground');
blocks.push({ x: 136, y: FLOOR_TOP, kind: 'weak' });
blocks.push({ x: 137, y: FLOOR_TOP, kind: 'weak' });
blocks.push({ x: 138, y: FLOOR_TOP, kind: 'weak' });
slab(139, FLOOR_TOP, 6, 1, 'ground');
slab(143, 10, 2, 10, 'wall'); // the upper route stops here
// The chamber underneath, and a step back out of it on the far side.
slab(130, CHAMBER_FLOOR, 28, HEIGHT - CHAMBER_FLOOR, 'ground');
slab(148, CHAMBER_FLOOR - 1, 2, 1);
slab(150, FLOOR_TOP, 8, 1, 'ground');
coinRow(145, 21, 3);

// ---------------------------------------------------------------------------
// H — the end.
// ---------------------------------------------------------------------------
ground(158, 14);
sign(160, ['H  END']);
const WIDTH = 172;

export const SWAP_LEVEL: LevelDef = {
  key: 'chavrusa',
  name: 'The Chavrusa (greybox)',
  widthInTiles: WIDTH,
  heightInTiles: HEIGHT,
  spawn: { x: 3, y: FLOOR_TOP },
  backgroundColor: 0x151a2c,
  solids,
  labels,
  coins,
  blocks,
  enemies,
  crates,
  hazards,
  checkpoints,
  goal: { x: 168, y: FLOOR_TOP },
};
