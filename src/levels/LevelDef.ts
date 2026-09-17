import type { BlockContents, BlockKind } from '../entities/Block';
import type { EnemyKind } from '../config/enemies';

/**
 * The greybox level format.
 *
 * Milestone 1 only. From Milestone 4 onward levels come out of Tiled `.tmj`
 * files and this module goes away — which is exactly why level geometry is
 * described as *data* here rather than built with scene code. The loader in
 * `TestLevelScene` reads this shape; swapping in a Tiled parser means
 * producing the same shape from a different source.
 *
 * All coordinates and sizes are in TILES, with the origin at the top-left of
 * the level and y increasing downward.
 */

/** A solid, immovable block of collision. */
export interface SolidDef {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Purely cosmetic in greybox — picks the placeholder colour. */
  readonly kind?: SolidKind;
}

export type SolidKind = 'ground' | 'platform' | 'wall';

/** A bit of in-world text. Greybox signage, so the test level explains itself. */
export interface LabelDef {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

/** A position in tiles. */
export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

/** A mystery box or a breakable brick, placed on the tile grid. */
export interface BlockPlacement extends TilePoint {
  readonly kind: BlockKind;
  /** Only meaningful for a mystery box. */
  readonly contents?: BlockContents;
}

/** An enemy spawn. `kind` is a key into the ENEMIES table. */
export interface EnemyPlacement extends TilePoint {
  readonly kind: EnemyKind;
}

export interface LevelDef {
  readonly key: string;
  readonly name: string;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
  /** Where the player starts, in tiles. This is the bottom-centre of the body. */
  readonly spawn: { readonly x: number; readonly y: number };
  readonly backgroundColor: number;
  readonly solids: readonly SolidDef[];
  readonly labels: readonly LabelDef[];

  // --- Milestone 2 contents. All optional: the Gym has none of them. ---
  /** Tzedakah coins. */
  readonly coins?: readonly TilePoint[];
  /** Mystery boxes and breakable bricks. */
  readonly blocks?: readonly BlockPlacement[];
  /** Enemy spawns. */
  readonly enemies?: readonly EnemyPlacement[];
  /** Mid-level checkpoints. §7 asks for these to be generous. */
  readonly checkpoints?: readonly TilePoint[];
  /** The end of the level. Without one, the level cannot be completed. */
  readonly goal?: TilePoint;
}
