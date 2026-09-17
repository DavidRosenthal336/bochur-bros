/**
 * Hazard definitions.
 *
 * §11 asks for hazards to be their own system, separate from enemies, because
 * they work differently: a hazard cannot be defeated, only survived, avoided
 * or ridden. They have no health, no stomp, and no death animation.
 *
 * Milestone 3 needs one — wind — because it is the cleanest obstacle that
 * demands Berel (§4: "A wind corridor needs Berel"). The leaf blowers of the
 * Five Towns and the Meah Shearim hamsin are both this hazard with different
 * art.
 */
export type HazardKind = 'wind';

export interface HazardConfig {
  readonly label: string;
  /** Sideways acceleration applied to anyone inside it, px/s^2. Sign is direction. */
  readonly force: number;
  /** Placeholder fill. */
  readonly color: number;
}

export const HAZARDS = {
  wind: {
    label: 'Wind',
    force: 620,
    color: 0x6fb3d2,
  },
} as const satisfies Record<string, HazardConfig>;
