/**
 * Boss definitions.
 *
 * A boss is a third category beside enemies and hazards: real health, named
 * phases, and a script rather than a behaviour. Keeping them in a table means
 * World 4's Yetzer Hara — who "cycles through the forms of every boss already
 * beaten" (§6) — can later be built by referring to these rows rather than by
 * reimplementing three fights.
 */
import type { ActorSpriteName } from './sprites';

export interface BossConfig {
  readonly label: string;
  /** Which drawn sheet to use. Absent means a tinted rectangle. */
  readonly art?: ActorSpriteName;
  /** Stomps to beat it. */
  readonly hits: number;
  /** How many escalating phases the fight moves through (§6). */
  readonly phases: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly color: number;
  /** How long it sits on a perch between attacks, ms. */
  readonly perchMs: number;
  /** How long it rears up before a dive, ms. The fight's fairness lives here. */
  readonly telegraphMs: number;
  readonly diveSpeed: number;
  readonly returnSpeed: number;
  /** The y it dives down to before pulling out, px. */
  readonly floorY: number;
  /** How many pigeons a summon brings. */
  readonly summonCount: number;
}

export const BOSSES = {
  /**
   * The Pigeon King (§6): "an enormous, grimy pigeon atop the scaffolding.
   * Summons flocks of pigeons, dive-bombs in arcs, and retreats to high
   * perches between attacks. Sitting on the meat board."
   */
  pigeonKing: {
    label: 'The Pigeon King',
    hits: 3,
    phases: 3,
    art: 'pigeonKing',
    // 34 wide, not 40: the drawn king's wings reach past his body, and a hitbox
    // out to the wingtips means he hurts you from further away than he looks.
    bodyWidth: 34,
    bodyHeight: 30,
    color: 0x7d8496,
    perchMs: 1500,
    telegraphMs: 620,
    diveSpeed: 210,
    returnSpeed: 190,
    floorY: 19 * 16,
    summonCount: 2,
  },
} as const satisfies Record<string, BossConfig>;
