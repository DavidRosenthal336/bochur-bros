import { AVAILABLE_ART } from 'virtual:available-art';

/**
 * Scenery: the backdrops, the level furniture and the interface art.
 *
 * Kept apart from `sprites.ts` because none of it is an actor — nothing here
 * moves under its own steam or has a hitbox derived from its frame. What it
 * shares with the sprite registry is the rule that matters: anything listed
 * here that is not on disk simply does not exist as far as the game is
 * concerned, and whatever was drawing a rectangle before carries on doing so.
 */

/** Is this file actually in `public/`? Decided at build time, not fetch time. */
export const artExists = (url: string): boolean => AVAILABLE_ART.has(url);

// ------------------------------------------------------------- backdrops ---

/**
 * Every sky in the game, named for where and when.
 *
 * World 1's three are bare times of day because they were the only ones when
 * they were drawn; everything since is prefixed with its neighbourhood. The
 * plain names are kept rather than renamed so that World 1's maps, which are
 * data files carrying `backdrop: "night"`, go on meaning what they say.
 */
export type BackdropVariant =
  | 'day'
  | 'dusk'
  | 'night'
  | 'five_towns_day'
  | 'five_towns_dusk'
  | 'catskills_day'
  | 'catskills_night'
  | 'meah_shearim_day'
  | 'meah_shearim_dusk';

export const BACKDROP_VARIANTS: readonly BackdropVariant[] = [
  'day',
  'dusk',
  'night',
  'five_towns_day',
  'five_towns_dusk',
  'catskills_day',
  'catskills_night',
  'meah_shearim_day',
  'meah_shearim_dusk',
];

export interface BackdropLayer {
  readonly key: string;
  readonly url: string;
  /**
   * How far the layer moves for a given camera movement.
   *
   * 0 is pinned to the camera and reads as infinitely far away; 1 would move
   * with the world and read as part of it. The gaps between the layers are
   * what sell the depth, so they are spread rather than clustered.
   */
  readonly scrollX: number;
  readonly scrollY: number;
}

/**
 * Three layers per time of day, back to front.
 *
 * Every layer tiles seamlessly left to right, so horizontal scrolling is done
 * by moving the *texture* inside a sprite pinned to the camera — a sprite as
 * wide as a 260-tile level would be enormous. Vertical movement moves the
 * sprite itself, because a skyline does not tile top to bottom.
 */
const layers = (
  variant: BackdropVariant,
  [back, middle, front]: readonly [string, string, string],
): readonly BackdropLayer[] => [
  { key: `${back}_${variant}`, url: `sprites/backdrops/${back}_${variant}.png`, scrollX: 0, scrollY: 0.12 },
  { key: `${middle}_${variant}`, url: `sprites/backdrops/${middle}_${variant}.png`, scrollX: 0.25, scrollY: 0.2 },
  { key: `${front}_${variant}`, url: `sprites/backdrops/${front}_${variant}.png`, scrollX: 0.5, scrollY: 0.4 },
];

/** Boro Park: sky, skyline, shopfronts. */
const boroPark = (variant: BackdropVariant) => layers(variant, ['bg_sky', 'bg_skyline', 'bg_street']);
/** Everywhere since: sky, far, near — the naming the later art packs use. */
const suburb = (variant: BackdropVariant) => layers(variant, ['bg_sky', 'bg_far', 'bg_near']);

export const BACKDROPS: Record<BackdropVariant, readonly BackdropLayer[]> = {
  day: boroPark('day'),
  dusk: boroPark('dusk'),
  night: boroPark('night'),
  five_towns_day: suburb('five_towns_day'),
  five_towns_dusk: suburb('five_towns_dusk'),
  catskills_day: suburb('catskills_day'),
  catskills_night: suburb('catskills_night'),
  meah_shearim_day: suburb('meah_shearim_day'),
  meah_shearim_dusk: suburb('meah_shearim_dusk'),
};

/**
 * The taller sky, for levels that climb above the shopfronts.
 *
 * Its bottom 180px match the short one exactly, so the two are interchangeable
 * and the choice is purely about whether there is sky above the view to reveal.
 */
export const tallSky = (variant: BackdropVariant): BackdropLayer => {
  const url = `sprites/backdrops/bg_sky_tall_${variant}.png`;
  // Only Boro Park was drawn with a tall sky. Everywhere else, a climbing
  // level gets the ordinary one rather than a hole where the sky should be.
  if (!artExists(url)) return BACKDROPS[variant][0] as BackdropLayer;
  return { key: `bg_sky_tall_${variant}`, url, scrollX: 0, scrollY: 0.12 };
};

export const DEFAULT_BACKDROP: BackdropVariant = 'day';

// ------------------------------------------------------------- furniture ---

export interface SceneryArt {
  readonly key: string;
  readonly url: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Named frame → index. Single-frame sheets just have `idle`. */
  readonly frames: Readonly<Record<string, number>>;
}

const scenery = (
  key: string,
  path: string,
  frameWidth: number,
  frameHeight: number,
  frames: Readonly<Record<string, number>> = { idle: 0 },
): SceneryArt => ({ key, url: `sprites/${path}.png`, frameWidth, frameHeight, frames });

export const SCENERY = {
  /**
   * The prize at the end of a level, one per world (§6).
   *
   * `goal` stays as World 1's meat board so that every map already drawn keeps
   * the post it was built with; the others are picked per world by the level
   * scene from the catalog's `prizeIcon`.
   */
  goal: scenery('goal_meat_board', 'goal_meat_board', 36, 34),
  goalPoppers: scenery('goal_poppers', 'goal_poppers', 36, 28),
  goalKugel: scenery('goal_kugel', 'goal_kugel', 28, 28),
  goalTequila: scenery('goal_tequila', 'goal_tequila', 24, 26),
  /** A pushke on a post. Lights up gold when you reach it. */
  checkpoint: scenery('checkpoint', 'checkpoint', 20, 36, { off: 0, on: 1 }),
  /** Riveted metal: Berel only. */
  reinforcedBlock: scenery('reinforced_block', 'reinforced_block', 16, 16),
  /** A cracked plank, waiting for a ground pound from above. */
  weakFloor: scenery('weak_floor', 'weak_floor', 16, 16),

  mapNode: scenery('map_node', 'ui/map_node', 12, 12, { locked: 0, open: 1, cleared: 2 }),
  mapPathDot: scenery('map_path_dot', 'ui/map_path_dot', 4, 4),
  kiddushTable: scenery('kiddush_table', 'ui/kiddush_table', 64, 32),
  prizeIcons: scenery('prize_icons', 'ui/prize_icons', 12, 12, {
    meat_board: 0,
    poppers: 1,
    kugel: 2,
    tequila: 3,
    empty: 4,
  }),
  hudIcons: scenery('hud_icons', 'ui/hud_icons', 8, 8, { coin: 0, life: 1, clock: 2 }),
} as const satisfies Record<string, SceneryArt>;

export type SceneryName = keyof typeof SCENERY;

/** The sheet, if it has been drawn. `undefined` means "still a rectangle". */
export function sceneryArt(name: SceneryName): SceneryArt | undefined {
  const art = SCENERY[name];
  return artExists(art.url) ? art : undefined;
}
