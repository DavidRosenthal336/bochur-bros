import type { BlockContents, BlockKind } from '../entities/Block';
import type { EnemyKind } from '../config/enemies';
import type { HazardKind } from '../config/hazards';
import type { BackdropVariant } from '../config/scenery';

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

/**
 * `pool` is the inside of a basin — the floor of the water and the shelves in
 * it. It is a solid like any other; it is a separate kind only because grass
 * on the bottom of a swimming pool reads as a bug.
 */
export type SolidKind = 'ground' | 'platform' | 'wall' | 'pool';

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

/**
 * A hazard, in tiles. `kind` is a key into the HAZARDS table.
 *
 * Region hazards (wind) use `w` and `h`; the rest ignore them and are placed at
 * `x`, `y` like anything else. `direction` is which way it faces or blows.
 */
export interface HazardPlacement extends TilePoint {
  readonly kind: HazardKind;
  readonly w: number;
  readonly h: number;
  readonly direction: -1 | 1;
}

/** Something you bounce off: an awning, a bag of rubbish (§6). */
/**
 * The three things in this game that throw you upward.
 *
 * An awning you land on, a trampoline that throws you further, and a sprinkler
 * that is not there most of the time — §6 makes the last one "the intended
 * route to high platforms", which means it is a platform with a timetable
 * rather than a hazard.
 */
export type BounceKind = 'awning' | 'trampoline' | 'sprinkler';

export interface BouncePlacement extends TilePoint {
  readonly w: number;
  /** Defaults to an awning, which is what every World 1 map means by one. */
  readonly kind?: BounceKind;
  /** Sprinklers: the full down-and-up cycle, ms. */
  readonly periodMs?: number;
  /** Sprinklers: how far into that cycle this one starts, so a row of them ripples. */
  readonly offsetMs?: number;
}

/**
 * A rectangle of water, in tiles (§6, 2-3).
 *
 * Water is terrain rather than a hazard: nothing in it can hurt you and there
 * is no air meter, because §5 does not ask for one and a drowning timer is a
 * mechanic this document does not have. What water changes is how you move,
 * and a region is the honest way to say that.
 *
 * The top row is the surface. Everything about swimming — whether you are
 * swimming at all, whether a jump is a stroke or a jump out — is decided from
 * that one line.
 */
export interface WaterDef {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * A current: water that is going somewhere (§6, "currents from the filter").
 *
 * The same idea as a wind zone with one deliberate difference — **nobody is
 * immune to it.** Berel walks through a leaf blower because §6 says so, and a
 * pool current that he could ignore would turn every water puzzle in the game
 * into "press the swap button". Air is one thing; being under water is
 * another, and this is the one place the heavy brother does not get a pass.
 */
export interface CurrentDef extends WaterDef {
  /** Which way it pushes. Either axis may be zero; both may not. */
  readonly dx: -1 | 0 | 1;
  readonly dy: -1 | 0 | 1;
  /** Acceleration, px/s^2. Omitted means the default in the hazard table. */
  readonly force?: number;
}

export interface LevelDef {
  readonly key: string;
  readonly name: string;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
  /** Where the player starts, in tiles. This is the bottom-centre of the body. */
  readonly spawn: { readonly x: number; readonly y: number };
  readonly backgroundColor: number;
  /**
   * Time of day behind the level. World 1 ends at a kiddush, so it runs from
   * day through dusk to night across its four levels.
   */
  readonly backdrop?: BackdropVariant;
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
  /** Crates. Berel shoves them; Mendy cannot budge them. */
  readonly crates?: readonly TilePoint[];
  /** Awnings and rubbish bags — land on one and you are launched (§6). */
  readonly bouncers?: readonly BouncePlacement[];
  /** Where the level's floor is, for hazards that cast a shadow on it. */
  readonly groundRow?: number;
  /** A boss, and the perches it retreats to between attacks (§6). */
  readonly boss?: TilePoint;
  readonly perches?: readonly TilePoint[];
  /**
   * Where the Yetzer Hara starts, in the prologue.
   *
   * He is not a boss and not an enemy: he cannot be caught, cannot be hurt and
   * cannot hurt you. He runs, and the level is over when you reach the end of
   * the street he ran down.
   */
  readonly thief?: TilePoint;
  /**
   * A climbing level whose camera rises on its own, px/s (1-2).
   *
   * The vertical twin of `autoScroll`, and not the same thing with the axis
   * swapped. Being left behind sideways is survivable — the chase shoves you
   * along — but there is nothing under a player the screen has left below, so
   * falling off the bottom is a death. The camera is a ratchet: it climbs on
   * this timer, climbs faster if the player outruns it, and never comes back
   * down.
   */
  readonly autoScrollUp?: number;
  /** Scroll the level along by itself, px/s. 1-3 is a chase (§6). */
  readonly autoScroll?: number;
  /** Wind and anything else that acts on a region rather than on contact. */
  readonly hazards?: readonly HazardPlacement[];
  /** Swimmable water (§6, 2-3). */
  readonly water?: readonly WaterDef[];
  /** Water that pushes. Only meaningful where it overlaps water. */
  readonly currents?: readonly CurrentDef[];
  /** The end of the level. Without one, the level cannot be completed. */
  readonly goal?: TilePoint;
}
