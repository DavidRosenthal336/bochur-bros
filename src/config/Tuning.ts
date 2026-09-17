/**
 * Tuning.ts — the single place to adjust how the game *feels*.
 *
 * Everything a playtester would want to fiddle with lives here. If you find
 * yourself editing a number anywhere else in `src/`, that number probably
 * belongs in this file instead.
 *
 * Mendy's movement is modelled on Super Mario Bros. (NES), by request. Values
 * marked [SMB] are that game's own figures, converted from pixels-per-frame at
 * 60fps into the pixels-per-second this project works in. Where a playtest
 * found one of them wrong for this game, it is marked [PLAYTEST] and says so.
 * Values marked [SPEC] come from BOCHUR_BROS_DESIGN.md §11, and [ADDED] marks
 * a knob neither source provides.
 *
 * Mechanics are not being copied here — speeds and accelerations are facts
 * about how fast a character moves, and none of Nintendo's code, art, sound,
 * or naming is used anywhere in this project. See CREDITS.md.
 *
 * Units: pixels and seconds, except where a name ends in `Ms`.
 */

/** Size of one level grid cell, in pixels. Same as Mario's, which is why the figures transfer. */
export const TILE = 16;

/**
 * Internal render resolution. The canvas is scaled up to fill the window, so
 * this is the "virtual" screen the game is designed against, not the pixel
 * size of the window. 384x216 is exactly 16:9 and exactly 24x13.5 tiles, and
 * it multiplies cleanly to 1920x1080 (x5).
 *
 * Mario's playfield is about 16x13 tiles. 320x180 gives 20x11.25, which is as
 * close as 16:9 gets without squashing the vertical. This was 384x216 (24
 * tiles wide) and everything read as slow, because the same 90 px/s walk has
 * half again as much screen to cross. **If the game feels too zoomed-in or too
 * zoomed-out, this is the dial** — 384x216 to pull back, 288x162 to push in.
 * Both still scale to 1080p without blurring.
 */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 180;

/** Physics steps per second. Fixed, so the jump feels identical on any display. */
export const PHYSICS_FPS = 60;

/**
 * One rung of the speed-dependent jump.
 *
 * Mario does not have a single jump. The faster he is moving when he leaves
 * the ground, the higher he goes and the harder he falls — which is why a
 * running jump clears five blocks and a standing one clears four. Each bracket
 * describes the jump you get in one speed band.
 */
export interface JumpBracket {
  /** Use this bracket when horizontal speed is at or below this, px/s. */
  readonly upToSpeed: number;
  /** Upward velocity at the moment of takeoff, px/s (negative is up). */
  readonly launchVelocity: number;
  /** Gravity while the jump button is still held and you are still rising. */
  readonly holdGravity: number;
  /** Gravity once the button is released, or once you start falling. */
  readonly fallGravity: number;
}

/**
 * Build a jump bracket from what you actually care about.
 *
 * Rather than asking for a launch velocity and two gravities — which are hard
 * to reason about and easy to get subtly wrong — this takes the three things
 * you can feel:
 *
 *   apexTiles    how high the jump goes, in tiles
 *   riseSeconds  how long it takes to get to the top
 *   fallFactor   how much harder it falls than it rose (1 = symmetrical,
 *                higher = snappier landing, which is most of "not floaty")
 *
 * **To make jumping feel faster without changing how high it goes, lower
 * `riseSeconds`.** The height stays exactly where it was.
 */
function jumpArc(
  upToSpeed: number,
  apexTiles: number,
  riseSeconds: number,
  fallFactor: number,
): JumpBracket {
  const apex = apexTiles * TILE;
  const holdGravity = (2 * apex) / (riseSeconds * riseSeconds);
  return {
    upToSpeed,
    launchVelocity: -(2 * apex) / riseSeconds,
    holdGravity,
    fallGravity: holdGravity * fallFactor,
  };
}

export interface CharacterStats {
  /** Display name, for debug output. */
  readonly label: string;
  /** Top speed with the run button up, px/s. */
  readonly walkSpeed: number;
  /** Top speed with the run button held, px/s. */
  readonly runSpeed: number;
  /** How fast speed builds toward the walking cap, px/s^2. */
  readonly walkAcceleration: number;
  /** How fast speed builds toward the running cap, px/s^2. */
  readonly runAcceleration: number;
  /** How fast speed bleeds off with no input on the ground, px/s^2. */
  readonly friction: number;
  /** How fast speed bleeds off when you hold the opposite direction, px/s^2. */
  readonly skidDeceleration: number;
  /** Multiplier on acceleration while airborne. Mario keeps nearly full control. */
  readonly airControl: number;
  /** Multiplier on friction while airborne. Mario has none: momentum is kept. */
  readonly airDrag: number;
  /** Fastest the character may fall, px/s. */
  readonly maxFallSpeed: number;
  /** Jump brackets, ordered slowest first. The last one catches everything above it. */
  readonly jumpBrackets: readonly JumpBracket[];
  /** Grace period after walking off a ledge during which a jump still counts, ms. */
  readonly coyoteTimeMs: number;
  /** How early a jump press is remembered and fired on landing, ms. */
  readonly jumpBufferMs: number;
  /** Placeholder body size, in pixels, for the Small tier. */
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  /** Crouched body height as a fraction of the standing height. */
  readonly crouchHeightFactor: number;
  /** Top speed while crouched, px/s. Zero means ducking roots you, as in Mario. */
  readonly crouchSpeed: number;
  /** Placeholder fill colour. */
  readonly color: number;
}

/**
 * Mendy — light and agile.
 *
 * Horizontal movement is SMB's outright. The jump keeps SMB's heights — 4
 * tiles standing, 5 at a run — but gets to them faster: SMB takes 0.53s to the
 * apex, and at this game's wider camera that read as floating. Same height,
 * shorter climb, harder fall.
 */
export const MENDY: CharacterStats = {
  label: 'Mendy',
  walkSpeed: 90, // [SMB] 1.5 px/frame
  runSpeed: 150, // [SMB] 2.5 px/frame
  walkAcceleration: 133, // [SMB] 0.0369 px/frame^2 — a slow, deliberate build-up
  runAcceleration: 323, // [SMB] 0.0898 px/frame^2
  friction: 177, // [SMB] 0.0492 px/frame^2
  skidDeceleration: 361, // [SMB] 0.1004 px/frame^2 — the screech-turn
  airControl: 1, // [SMB] steering in the air is barely reduced
  airDrag: 0, // [SMB] no friction in the air: momentum is kept
  // [PLAYTEST] SMB's own figure is about 270 px/s, but at that cap the limiter
  // was engaging partway down an ordinary jump and stretching the descent —
  // which is exactly what "floaty" feels like. A terminal velocity should only
  // ever bite on a long drop, so it now sits above what a normal jump reaches.
  maxFallSpeed: 620,
  jumpBrackets: [
    // Standing or barely moving: 4 tiles up.
    jumpArc(60, 4, 0.44, 2.8),
    // Walking: fractionally higher.
    jumpArc(139, 4.25, 0.44, 2.8),
    // At a run: 5 tiles up.
    jumpArc(Infinity, 5, 0.46, 2.8),
  ],
  coyoteTimeMs: 100, // [SPEC] Mario has none of this; it is a kindness worth keeping
  jumpBufferMs: 120, // [SPEC] likewise
  bodyWidth: 14,
  bodyHeight: 22,
  crouchHeightFactor: 0.6,
  // SMB roots you while ducking. This does not, because the design doc's own
  // obstacles — clotheslines in the Catskills (§6), laundry lines strung across
  // the Meah Shearim alleys — are things you duck under *and travel through*.
  crouchSpeed: 45,
  color: 0x4ea8de,
};

/**
 * Berel — heavy and strong. Lower jump, slower top speed, heavier fall.
 *
 * NOT PLAYABLE YET. Berel arrives in Milestone 3 along with the swap mechanic.
 * His numbers are the same model as Mendy's, shifted: roughly a fifth slower,
 * three tiles of standing jump against Mendy's four, and a harder fall.
 */
export const BEREL: CharacterStats = {
  label: 'Berel',
  walkSpeed: 75,
  runSpeed: 120,
  walkAcceleration: 110,
  runAcceleration: 260,
  friction: 190,
  skidDeceleration: 300, // heavier, so he takes longer to turn around
  airControl: 0.75, // "better air control" is Mendy's edge (§4), so Berel's is worse
  airDrag: 0,
  maxFallSpeed: 620, // heavier fall
  jumpBrackets: [
    jumpArc(50, 3, 0.42, 3.1),
    jumpArc(115, 3.15, 0.42, 3.1),
    jumpArc(Infinity, 3.85, 0.44, 3.1),
  ],
  coyoteTimeMs: 100,
  jumpBufferMs: 120,
  bodyWidth: 16,
  bodyHeight: 24,
  crouchHeightFactor: 0.6,
  crouchSpeed: 38,
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

// ---------------------------------------------------------------------------
// Milestone 2 — the core loop
// ---------------------------------------------------------------------------

import type { PowerTier } from '../systems/PowerState';

/**
 * What a power-up tier does to the character wearing it.
 *
 * Sizes are multipliers on the character's own Small body rather than absolute
 * pixels, so Berel stays bigger than Mendy in every tier without a second table.
 */
export interface TierStats {
  /** Body height as a multiple of the character's Small height. */
  readonly heightScale: number;
  /** Body width as a multiple of the character's Small width. */
  readonly widthScale: number;
  /** Overrides the character's placeholder colour. Undefined keeps it. */
  readonly tint?: number;
  /** Can this tier smash a breakable block from below? (§5: Cholent can.) */
  readonly breaksBlocks: boolean;
}

export const TIERS: Record<PowerTier, TierStats> = {
  small: { heightScale: 1, widthScale: 1, breaksBlocks: false },
  // "Puffs up round and heavy, steam rising." Wider as well as taller.
  cholent: { heightScale: 1.36, widthScale: 1.15, tint: 0xd98c3f, breaksBlocks: true },
  // The three power forms are all the same size as Cholent; only Cholent and
  // Small differ physically. Milestone 5 gives them their behaviours.
  menorah: { heightScale: 1.36, widthScale: 1.15, tint: 0xf2c14e, breaksBlocks: true },
  lulav: { heightScale: 1.36, widthScale: 1.15, tint: 0x6a994e, breaksBlocks: true },
  peyos: { heightScale: 1.36, widthScale: 1.15, tint: 0x9b5de5, breaksBlocks: true },
};

/** Rules for the core loop that are not about how a character moves. */
export const GAMEPLAY = {
  /** Upward velocity given to the player by a successful stomp, px/s. */
  stompBounce: -260,
  /** Same, but when the jump button is held at the moment of the stomp. */
  stompBounceHeld: -330,
  /** A stomp counts only if the player is falling at least this fast, px/s. */
  stompMinFallSpeed: 20,
  /** How far above an enemy's middle the player's feet must be to count as a stomp. */
  stompFootMargin: 4,
  /** How long a defeated enemy stays visible, squashed, before vanishing, ms. */
  enemyDeathMs: 350,
  /** Knockback applied to the player when hurt, px/s. */
  hurtKnockbackX: 90,
  hurtKnockbackY: -180,
  /** How long the level pauses on death before respawning, ms. */
  deathPauseMs: 900,
  /** Upward velocity of the player's death flop, px/s. */
  deathLaunchY: -320,
  /** How far a bumped block rises before settling, px. */
  blockBumpHeight: 6,
  blockBumpMs: 160,
  /** Speed a Cholent pickup slides along the ground at, px/s. */
  pickupSpeed: 45,
  /** How high a collected coin floats before fading, px. */
  coinPopHeight: 18,
} as const;
