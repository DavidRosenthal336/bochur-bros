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
  /**
   * How long it waits at the very start of the fight, ms.
   *
   * Without this the phase timer starts at zero, so the first frame of the
   * fight already satisfies "time to attack" and the boss is diving before the
   * player has touched the controls.
   */
  readonly openingMs: number;
  /** How long it sits on a perch between attacks, ms. */
  readonly perchMs: number;
  /** How long it rears up before a dive, ms. The fight's fairness lives here. */
  readonly telegraphMs: number;
  readonly diveSpeed: number;
  readonly returnSpeed: number;
  /** The y it dives down to before levelling out, px. */
  readonly floorY: number;
  /**
   * The bottom of the arc: how long it skims along at `floorY`, ms, and how
   * fast.
   *
   * This is the entire stomp window, and the fight has no answer without it. A
   * boss that only descends is unstompable by construction — it comes down on
   * the player's head, so the player is always underneath it, which is the
   * losing side of every stomp check. Levelling out and running past is what
   * puts its back within reach, and it is also what makes §6's "dive-bombs in
   * arcs" an arc rather than a plunge.
   */
  readonly sweepMs: number;
  readonly sweepSpeed: number;
  /**
   * How long it hangs at the end of the arc, wings beating, before climbing
   * away — the moment the fight is actually won in.
   *
   * A sweep alone leaves a window barely four frames wide: the player has to
   * be already airborne, already descending, and horizontally inside
   * thirty-odd pixels of a target crossing at speed. It is reachable, which
   * measurement confirmed, and it is not something anyone should be asked to
   * do three times. Stopping still for a beat turns "land on him" from a
   * timing trick into an instruction you can follow.
   *
   * It has to outlast a jump. A jump from the floor is about nine hundred
   * milliseconds up and back down, so a seven-hundred-millisecond window is
   * one you can answer correctly and still miss, because he leaves while you
   * are in the air — which measured as zero hits from four different
   * distances against a stationary target.
   */
  readonly hoverMs: number;
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
    openingMs: 2200,
    perchMs: 1500,
    // Long enough to read from across the room and still get somewhere. It was
    // 620ms, which is fine once you know the fight and a coin toss before that.
    telegraphMs: 900,
    diveSpeed: 210,
    returnSpeed: 190,
    /**
     * The height of the sweep, in pixels rather than tiles, and deliberately
     * not on a tile boundary.
     *
     * It has one job: leave a gap a crouching player fits through and a
     * standing one does not. Crouched is 13px and standing is 22px, so the gap
     * has to land inside a nine-pixel band, and 18px is the middle of it —
     * five pixels of clearance ducking, four pixels of overlap standing.
     *
     * At the tidy value of 19 tiles the gap came out at 13.1px and ducking
     * cleared the sweep by a tenth of a pixel, which is not a mechanic.
     */
    floorY: 320 - 18,
    sweepMs: 900,
    sweepSpeed: 100,
    hoverMs: 1200,
    summonCount: 2,
  },
} as const satisfies Record<string, BossConfig>;
