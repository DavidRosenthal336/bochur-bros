import type {
  BlockPlacement,
  EnemyPlacement,
  LabelDef,
  LevelDef,
  SolidDef,
  TilePoint,
} from './LevelDef';

/**
 * "Thirteenth Avenue (greybox)" — the Milestone 2 test level.
 *
 * Still placeholder rectangles, but this one is a level rather than an
 * instrument: it introduces coins, then boxes, then a pigeon, then a pit that
 * can actually kill you, and ends at a goal. The real 1-1 gets designed in
 * Milestone 4 once levels come out of Tiled.
 *
 * Unlike the Gym, the gaps here are real: fall in one and you die and come back
 * at the last checkpoint. Checkpoints are deliberately frequent, per §7.
 *
 * Authored in TILES, top-left origin, y down.
 */

const FLOOR_TOP = 20;
const HEIGHT = 27;

const solids: SolidDef[] = [];
const labels: LabelDef[] = [];
const coins: TilePoint[] = [];
const blocks: BlockPlacement[] = [];
const enemies: EnemyPlacement[] = [];
const checkpoints: TilePoint[] = [];

function ground(x: number, w: number): void {
  solids.push({ x, y: FLOOR_TOP, w, h: HEIGHT - FLOOR_TOP, kind: 'ground' });
}

function ledge(x: number, top: number, w: number): void {
  solids.push({ x, y: top, w, h: FLOOR_TOP - top, kind: 'platform' });
}

function coinRow(x: number, y: number, count: number): void {
  for (let i = 0; i < count; i += 1) coins.push({ x: x + i, y });
}

function label(x: number, y: number, text: string): void {
  labels.push({ x, y, text });
}

// ---------------------------------------------------------------------------
// Coins, then boxes. Nothing here can hurt you.
// ---------------------------------------------------------------------------
ground(0, 22);
label(2, 14, 'COINS ARE FREE. BOXES GO OVERHEAD.');
label(2, 15, 'jump up into a box to open it');
coinRow(6, 18, 3);
blocks.push({ x: 11, y: 16, kind: 'mystery', contents: 'cholent' });
blocks.push({ x: 14, y: 16, kind: 'mystery', contents: 'coin' });
coinRow(17, 17, 2);

// ---------------------------------------------------------------------------
// First pit, first pigeon. Land on it from above; walking into it costs you.
// ---------------------------------------------------------------------------
ground(25, 18);
label(26, 14, 'PIGEONS DIVE. LAND ON TOP OF ONE.');
enemies.push({ x: 33, y: 13, kind: 'pigeon' });
coinRow(28, 18, 3);

// Bricks overhead with coins above them: break through as Cholent, or walk on by.
blocks.push({ x: 37, y: 15, kind: 'brick' });
blocks.push({ x: 38, y: 15, kind: 'brick' });
blocks.push({ x: 39, y: 15, kind: 'brick' });
coinRow(37, 13, 3);
label(36, 11, 'CHOLENT BREAKS BRICKS FROM UNDERNEATH');

// ---------------------------------------------------------------------------
// Checkpoint, a step up, and a second pigeon.
// ---------------------------------------------------------------------------
ground(43, 14);
checkpoints.push({ x: 44, y: FLOOR_TOP });
label(44, 14, 'CHECKPOINT');
ledge(52, 17, 5);
enemies.push({ x: 49, y: 12, kind: 'pigeon' });
coinRow(52, 15, 5);

// ---------------------------------------------------------------------------
// Two more pigeons over a wider gap.
// ---------------------------------------------------------------------------
ground(61, 16);
enemies.push({ x: 66, y: 13, kind: 'pigeon' });
enemies.push({ x: 73, y: 15, kind: 'pigeon' });
coinRow(63, 18, 2);
// Three tiles, not four: four is exactly the height of a standing jump, so it
// would come down to frame-perfect timing on the main path.
ledge(69, 17, 4);
coinRow(69, 15, 4);

// ---------------------------------------------------------------------------
// Last stretch: checkpoint, one more box, the goal.
// ---------------------------------------------------------------------------
ground(81, 23);
checkpoints.push({ x: 84, y: FLOOR_TOP });
label(84, 14, 'CHECKPOINT');
blocks.push({ x: 90, y: 16, kind: 'mystery', contents: 'cholent' });
coinRow(93, 18, 4);
label(96, 14, 'TOUCH THE POST TO FINISH');

const WIDTH = 104;

export const CORE_LOOP_LEVEL: LevelDef = {
  key: 'core-loop',
  name: 'Thirteenth Avenue (greybox)',
  widthInTiles: WIDTH,
  heightInTiles: HEIGHT,
  spawn: { x: 3, y: FLOOR_TOP },
  backgroundColor: 0x161b2e,
  solids,
  labels,
  coins,
  blocks,
  enemies,
  checkpoints,
  goal: { x: 99, y: FLOOR_TOP },
};
