/**
 * Tuning.ts — the single place to adjust how the game *feels*.
 *
 * Everything a playtester would want to fiddle with lives here. If you find
 * yourself editing a number anywhere else in `src/`, that number probably
 * belongs in this file instead.
 *
 * Values marked [SPEC] come straight from BOCHUR_BROS_DESIGN.md §11.
 * Values marked [ADDED] are not in the spec — they were needed to make the
 * movement feel like a platformer at all. They are tuning knobs, not new
 * mechanics, and you should feel free to move them.
 *
 * Units: pixels and seconds, except where a name ends in `Ms`.
 */

/** Size of one level grid cell, in pixels. All level data is authored in these. */
export const TILE = 16;

/**
 * Internal render resolution. The canvas is scaled up to fill the window, so
 * this is the "virtual" screen the game is designed against, not the pixel
 * size of the window. 384x216 is exactly 16:9 and exactly 24x13.5 tiles, and
 * it multiplies cleanly to 1920x1080 (x5).
 */
export const VIEW_WIDTH = 384;
export const VIEW_HEIGHT = 216;

/** Physics steps per second. Fixed, so the jump feels identical on any display. */
export const PHYSICS_FPS = 60;

export interface CharacterStats {
  /** Display name, for debug output. */
  readonly label: string;
  /** Downward acceleration applied to this character, px/s^2. */
  readonly gravity: number;
  /** Top horizontal speed with the run button up, px/s. */
  readonly walkSpeed: number;
  /** Top horizontal speed with the run button held, px/s. */
  readonly runSpeed: number;
  /** Instantaneous upward velocity at the moment of a jump, px/s (negative = up). */
  readonly jumpVelocity: number;
  /** How fast horizontal speed builds toward the target, px/s^2. */
  readonly acceleration: number;
  /** How fast horizontal speed bleeds off with no input, px/s^2. */
  readonly deceleration: number;
  /** How fast speed bleeds off when reversing direction, px/s^2. [ADDED] */
  readonly turnDeceleration: number;
  /** Multiplier on acceleration while airborne. 1 = full ground control. [ADDED] */
  readonly airControl: number;
  /** Multiplier on deceleration while airborne with no input. [ADDED] */
  readonly airDrag: number;
  /** Fastest the character may fall, px/s. Without a cap, long drops go silly. [ADDED] */
  readonly maxFallSpeed: number;
  /** Grace period after walking off a ledge during which a jump still counts, ms. */
  readonly coyoteTimeMs: number;
  /** How early a jump press is remembered and fired on landing, ms. */
  readonly jumpBufferMs: number;
  /** Upward velocity is multiplied by this when jump is released early. */
  readonly jumpCutMultiplier: number;
  /** Placeholder body size, in pixels, for the Small tier. */
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  /** Placeholder fill colour. */
  readonly color: number;
}

/**
 * Mendy — light and agile. Higher jump, faster top speed, better air control.
 *
 * With these numbers: apex ~75px (4.7 tiles), airtime ~0.58s, so a full-speed
 * running jump clears roughly 9 tiles of gap. The test level measures both.
 */
export const MENDY: CharacterStats = {
  label: 'Mendy',
  gravity: 1800, // [SPEC]
  walkSpeed: 160, // [SPEC]
  runSpeed: 260, // [SPEC]
  jumpVelocity: -520, // [SPEC]
  acceleration: 1200, // [SPEC]
  deceleration: 1600, // [SPEC]
  turnDeceleration: 2600, // [ADDED] snappier pivots than a dead stop
  airControl: 0.7, // [ADDED]
  airDrag: 0.18, // [ADDED] keep air momentum; platformers feel bad without this
  maxFallSpeed: 800, // [ADDED]
  coyoteTimeMs: 100, // [SPEC]
  jumpBufferMs: 120, // [SPEC]
  jumpCutMultiplier: 0.5, // [SPEC] "releasing jump early cuts upward velocity by 50%"
  bodyWidth: 14,
  bodyHeight: 22,
  color: 0x4ea8de,
};

/**
 * Berel — heavy and strong. Lower jump, slower top speed, heavier fall.
 *
 * NOT PLAYABLE YET. Berel arrives in Milestone 3 along with the swap mechanic.
 * His numbers live here now only so the two stat blocks can be compared and
 * tuned side by side; nothing instantiates him.
 */
export const BEREL: CharacterStats = {
  label: 'Berel',
  gravity: 2000, // [SPEC]
  walkSpeed: 130, // [SPEC]
  runSpeed: 210, // [SPEC]
  jumpVelocity: -440, // [SPEC]
  acceleration: 1200, // [SPEC]
  deceleration: 1600, // [SPEC]
  turnDeceleration: 2000, // [ADDED] heavier, so he pivots slower than Mendy
  airControl: 0.45, // [ADDED] "better air control" is Mendy's edge, so Berel's is worse
  airDrag: 0.18, // [ADDED]
  maxFallSpeed: 900, // [ADDED] heavier fall
  coyoteTimeMs: 100, // [SPEC]
  jumpBufferMs: 120, // [SPEC]
  jumpCutMultiplier: 0.5, // [SPEC]
  bodyWidth: 16,
  bodyHeight: 24,
  color: 0xe07a5f,
};

/** Camera behaviour. [ADDED] — the spec only says "camera follows". */
export const CAMERA = {
  /** Horizontal follow smoothing, 0..1 per frame. Higher = tighter. */
  lerpX: 0.14,
  /** Vertical follow smoothing. Lower than X so small hops don't rock the view. */
  lerpY: 0.1,
  /** Half-size of the box the player can move in before the camera reacts, px. */
  deadzoneWidth: 48,
  deadzoneHeight: 72,
  /** Shifts the framing so there is more room above the player than below. */
  offsetY: 16,
} as const;

/** Anything below (world height + this) is treated as "fell out of the level". */
export const FELL_OUT_MARGIN = 128;
