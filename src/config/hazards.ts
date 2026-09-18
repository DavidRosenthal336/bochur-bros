/**
 * Hazard definitions.
 *
 * §11 asks for hazards to be their own system, separate from enemies, because
 * they work differently: a hazard cannot be defeated, only survived, avoided
 * or ridden. They have no health, no stomp and no death animation, and several
 * of them are terrain that happens to be trying to kill you.
 *
 * Adding a hazard is a row in this table plus a sprite, the same deal as the
 * enemy table.
 */
import type { ActorSpriteName } from './sprites';

export type HazardKind = 'wind' | 'pipe' | 'cart' | 'van' | 'stroller';

export type HazardBehavior =
  /** A region that pushes. Leaf blowers, the hamsin. */
  | 'wind'
  /** Waits above, warns on the ground below, then drops. */
  | 'faller'
  /** Rolls along the ground in one direction, fast. */
  | 'roller'
  /** Sits still, then lurches forward without warning. */
  | 'lurcher'
  /** Follows the player the length of the level. */
  | 'chaser';

export interface HazardConfig {
  readonly label: string;
  readonly behavior: HazardBehavior;
  /** Which drawn sheet to use. Absent means a tinted rectangle. */
  readonly art?: ActorSpriteName;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly color: number;
  /** Can you stand on top of it and be carried? (§6: carts and van roofs.) */
  readonly rideable: boolean;
  /** Does touching it from the side hurt? */
  readonly harmful: boolean;
  /** Travel speed, px/s. Meaning depends on the behaviour. */
  readonly speed: number;
  /** Does gravity act on it? */
  readonly affectedByGravity: boolean;

  /** `faller`: how long the shadow shows before the drop, and how far it watches. */
  readonly faller?: {
    readonly warningMs: number;
    readonly triggerRange: number;
    readonly resetMs: number;
  };
  /** `lurcher`: how long it sits, and how long it lunges for. */
  readonly lurcher?: {
    readonly waitMs: number;
    readonly lungeMs: number;
    readonly triggerRange: number;
  };
  /** `wind`: sideways acceleration, px/s^2. */
  readonly force?: number;
}

export const HAZARDS = {
  wind: {
    label: 'Wind',
    behavior: 'wind',
    bodyWidth: 16,
    bodyHeight: 16,
    color: 0x6fb3d2,
    rideable: false,
    harmful: false,
    speed: 0,
    affectedByGravity: false,
    force: 620,
  },

  /**
   * Falling scaffolding pipe — "a shadow appears on the ground, then the pipe
   * drops. Telegraphed, then lethal" (§6). The shadow is the whole mechanic.
   */
  pipe: {
    label: 'Scaffolding pipe',
    behavior: 'faller',
    art: 'pipe',
    // The drawn pipe is 12 x 40 — two and a half tiles of scaffolding tube, not
    // the stub it was greyboxed as. Being longer makes the shadow warning
    // matter more, which is the point of the thing.
    bodyWidth: 12,
    bodyHeight: 40,
    color: 0x8d97c9,
    rideable: false,
    harmful: true,
    speed: 520,
    affectedByGravity: false,
    faller: { warningMs: 620, triggerRange: 34, resetMs: 2600 },
  },

  /** Runaway shopping cart — "roll at you fast. Jump on top to ride one." (§6) */
  cart: {
    label: 'Shopping cart',
    behavior: 'roller',
    art: 'cart',
    bodyWidth: 22,
    bodyHeight: 18,
    color: 0xa8b0c8,
    rideable: true,
    harmful: true,
    speed: 135,
    affectedByGravity: true,
  },

  /**
   * Double-parked van — "sit still, then lurch forward without warning and
   * crush against walls. Their roofs are platforms, so the player must climb
   * the thing trying to kill them." (§6)
   *
   * Not drawn yet, and not placed in a level yet either — it stays a rectangle
   * until there is a van sheet to point at.
   */
  van: {
    label: 'Van',
    behavior: 'lurcher',
    bodyWidth: 46,
    bodyHeight: 28,
    color: 0x4a5a76,
    rideable: true,
    harmful: true,
    speed: 190,
    affectedByGravity: true,
    lurcher: { waitMs: 1500, lungeMs: 900, triggerRange: 150 },
  },

  /** The stroller — "rolls downhill and chases the player through a level." (§6) */
  stroller: {
    label: 'The stroller',
    behavior: 'chaser',
    art: 'stroller',
    bodyWidth: 24,
    bodyHeight: 26,
    color: 0xc46a8a,
    rideable: false,
    harmful: true,
    speed: 104,
    affectedByGravity: true,
  },
} as const satisfies Record<string, HazardConfig>;
