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

export type BackdropVariant = 'day' | 'dusk' | 'night';

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
const backdrop = (variant: BackdropVariant): readonly BackdropLayer[] => [
  { key: `bg_sky_${variant}`, url: `sprites/backdrops/bg_sky_${variant}.png`, scrollX: 0, scrollY: 0.12 },
  { key: `bg_skyline_${variant}`, url: `sprites/backdrops/bg_skyline_${variant}.png`, scrollX: 0.25, scrollY: 0.2 },
  { key: `bg_street_${variant}`, url: `sprites/backdrops/bg_street_${variant}.png`, scrollX: 0.5, scrollY: 0.4 },
];

export const BACKDROPS: Record<BackdropVariant, readonly BackdropLayer[]> = {
  day: backdrop('day'),
  dusk: backdrop('dusk'),
  night: backdrop('night'),
};

/**
 * The taller sky, for levels that climb above the shopfronts.
 *
 * Its bottom 180px match the short one exactly, so the two are interchangeable
 * and the choice is purely about whether there is sky above the view to reveal.
 */
export const tallSky = (variant: BackdropVariant): BackdropLayer => ({
  key: `bg_sky_tall_${variant}`,
  url: `sprites/backdrops/bg_sky_tall_${variant}.png`,
  scrollX: 0,
  scrollY: 0.12,
});

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
  /** The World 1 goal: the meat board the Pigeon King was sitting on (§6). */
  goal: scenery('goal_meat_board', 'goal_meat_board', 36, 34),
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
