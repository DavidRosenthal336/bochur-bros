/**
 * Enemy definitions.
 *
 * §11 asks for "one enemy system with configurable behaviors rather than a
 * bespoke class per creature", so an enemy is a row in this table plus, later,
 * a sprite. Adding the rats, geese, chipmunks and cats means adding entries
 * here — not new classes.
 *
 * The behaviour kinds named in §11 are patrol, dive, chase, emerge-on-timer and
 * thief. Milestone 2 implements the first two; the rest land with the worlds
 * that need them.
 */
import type { ActorSpriteName } from './sprites';

export type EnemyBehaviorKind = 'patrol' | 'dive' | 'emerge';

export interface EnemyConfig {
  readonly label: string;
  readonly behavior: EnemyBehaviorKind;
  /**
   * Which drawn sheet to use, if one exists. Leave it off and the enemy is a
   * tinted rectangle of exactly its hitbox size, which is how a creature gets
   * built and tuned before it gets drawn.
   */
  readonly art?: ActorSpriteName;
  /** Cruising speed, px/s. */
  readonly speed: number;
  /** Stomps needed to put it down. Geese take two (§6, World 2). */
  readonly hits: number;
  /** Can it be stomped at all? Mosquito swarms cannot (§6, World 3). */
  readonly stompable: boolean;
  /** Does gravity apply? Fliers say no and hold their altitude. */
  readonly affectedByGravity: boolean;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly color: number;
  /** How far either side of its spawn it patrols, px. */
  readonly patrolRange: number;
  /** Extra settings for `emerge`: hiding, then scurrying out on a timer (§6). */
  readonly emerge?: {
    /** How long it stays out of sight between appearances, ms. */
    readonly hiddenMs: number;
    /** How long it takes to climb out, ms. This is the warning. */
    readonly risingMs: number;
    /** How long it runs for before it is gone, ms. */
    readonly runMs: number;
  };
  /** Extra settings for `dive`. */
  readonly dive?: {
    /** How close the player must get, horizontally, to trigger a swoop, px. */
    readonly triggerRange: number;
    /**
     * How long it rears up before committing, ms.
     *
     * An attack you cannot see coming is not difficulty, it is a coin toss.
     * The design doc already asks for this for the falling pipes — "a shadow
     * appears on the ground, then the pipe drops. Telegraphed, then lethal"
     * (§6) — and the same rule applies to anything that lunges at you.
     */
    readonly windUpMs: number;
    /** Speed of the swoop itself, px/s. */
    readonly speed: number;
    /** How fast it climbs back to its perch afterwards, px/s. */
    readonly recoverSpeed: number;
    /** How long it must wait between swoops, ms. */
    readonly cooldownMs: number;
  };
}

export const ENEMIES = {
  /**
   * The pigeon — World 1's basic grunt. "Dive at you in arcs. Stomp them
   * mid-swoop." It drifts along its perch line until you get close, swoops,
   * then climbs back up and resumes.
   */
  pigeon: {
    label: 'Pigeon',
    behavior: 'dive',
    speed: 34,
    hits: 1,
    stompable: true,
    affectedByGravity: false,
    art: 'pigeon',
    bodyWidth: 16,
    bodyHeight: 12,
    color: 0x8a8f9e,
    patrolRange: 48,
    // Measured, with the camera's look-ahead in place: you can see about 160px
    // in front of you. Triggering at 120 means a pigeon is always on screen
    // before it reacts — a wind-up you cannot see is not a warning.
    dive: { triggerRange: 120, windUpMs: 500, speed: 105, recoverSpeed: 70, cooldownMs: 1400 },
  },
  /**
   * The rat — "emerge from sewer grates and garbage bags on a timer, scurry
   * fast in one direction" (§6).
   *
   * Fast enough to be a problem and short-lived enough not to be a siege. It
   * climbs out visibly before it moves, for the same reason the pigeon rears
   * up: an enemy that simply appears underneath you is a coin toss.
   */
  rat: {
    label: 'Rat',
    behavior: 'emerge',
    speed: 120,
    hits: 1,
    stompable: true,
    affectedByGravity: true,
    art: 'rat',
    // 16 x 10 rather than the 14 x 9 it was greyboxed at: the drawn rat's body
    // is 16 wide before the tail, and a hitbox narrower than the animal means
    // stomps that visibly connect do nothing.
    bodyWidth: 16,
    bodyHeight: 10,
    color: 0x6f6257,
    patrolRange: 0,
    emerge: { hiddenMs: 1800, risingMs: 420, runMs: 3200 },
  },
} as const satisfies Record<string, EnemyConfig>;

export type EnemyKind = keyof typeof ENEMIES;
