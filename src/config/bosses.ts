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
   * It has to outlast the whole move, not just the jump. A jump is about nine
   * hundred milliseconds up and back down, and 1200ms looked like enough on
   * that basis — but you are not standing next to him when it opens. The skim
   * puts him the length of the skim away, so the move is: run there, then
   * jump, then come down. Driving the real fight, that measured at about 1.45
   * seconds from a seventy-pixel gap, and 1200ms produced near-misses with the
   * player still in the air as he climbed away.
   *
   * So: a shorter, slower skim, and a window sized to answering it.
   *
   * How short is not a matter of taste. You spend the skim crouched, so when
   * the window opens you are standing still, and a jump from a standing start
   * carries about thirty-five pixels sideways — measured, watching the real
   * body accelerate from zero. A gap wider than that cannot be jumped; it has
   * to be walked first, and walking into him is death by the same four pixels
   * of overlap that make ducking work. That is the shape of "there's no way to
   * land on him without you dying", and at a ninety-pixel gap it was still
   * true after everything else had been fixed.
   *
   * 650ms at 70px/s is about forty-five pixels: he pulls up just outside your
   * reach and stops, and the answer is to stand up and jump, immediately, from
   * where you are. No approach, so nothing to clip.
   *
   * It is also the one number that does NOT escalate with the phases. Later
   * phases come at you sooner and faster, which is escalation; shrinking the
   * one moment the fight can be answered in is just taking the answer away,
   * and taking the answer away is what made this fight unwinnable to begin
   * with.
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
    sweepMs: 650,
    sweepSpeed: 70,
    hoverMs: 1700,
    summonCount: 2,
  },
} as const satisfies Record<string, BossConfig>;

/**
 * A boss that drives (§6, 2-4).
 *
 * Nothing in `BossConfig` above means anything to a car. Perches, dive speed,
 * sweep height, hover — every field of it describes a bird, and reusing the
 * shape would have meant a table where two thirds of each row was ignored. A
 * boss is "real health, named phases, and a script"; the script is the part
 * that differs, so the script gets its own row shape.
 *
 * ## The one rule this fight is built on
 *
 * **The player fights the vehicle, never the driver.** §6 is explicit, and the
 * joke only works if it is absolute: she is never harmed, never stomped, and
 * never once acknowledges that any of this is happening. So there is no
 * hitbox on her, no reaction from her, and the damage is a dent in a roof.
 *
 * ## Why the roof is the answer
 *
 * §6 says of the minivans that "the player must climb the thing trying to kill
 * them", and World 2 has been teaching that since the carpool line: a shopping
 * cart in 1-1, four minivans in 2-1. This is the exam. Getting onto the roof
 * is both the dodge and the setup — there is nowhere else to be while it is
 * moving, and once it has clipped the hydrant you are already standing where
 * the dent goes.
 *
 * The hitbox is the drawn height rather than something shorter, because of
 * that. A shorter one would let a running jump clear the whole car, which is
 * an easier answer than the one the fight is about.
 */
export interface VehicleBossStage {
  /** How long it sits before it starts revving, ms. */
  readonly waitMs: number;
  /** The rev. This is the telegraph, and the fairness lives in it. */
  readonly revMs: number;
  readonly chargeSpeed: number;
  /** The window after it clips the hydrant: the whole fight, in one number. */
  readonly stallMs: number;
  readonly returnSpeed: number;
  /** Does the leg back also come at you, or is it a crawl you can walk around? */
  readonly reverseCharges: boolean;
  /**
   * §6: "She sets the salad in the cupholder. The music drops out for one
   * beat. Then she drives like she means it."
   *
   * A dead stop, after the rev, with everything else still going. There is no
   * music yet to drop, so the beat is silence of a different kind — the one
   * moment in the fight where the car is not doing anything at all.
   */
  readonly beatMs: number;
}

export interface VehicleBossConfig {
  readonly label: string;
  readonly art?: ActorSpriteName;
  readonly hits: number;
  readonly phases: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly color: number;
  /**
   * How long after the crash before a dent will take, ms.
   *
   * The car has stopped but it has not finished stopping — it is rocking on
   * its springs and there is steam coming off it. Mechanically this is what
   * stops the best line in the fight from also being an instant win: riding
   * the roof in means the crash throws you off it, and without a settling beat
   * you are airborne directly over a car that is already vulnerable, so the
   * throw lands the dent for you on the next frame. With one, you come down,
   * and then you have to jump and pound like anyone else — from the best place
   * in the arena to be doing it from, which is the reward for the ride.
   */
  readonly settleMs: number;
  /** One per phase, in order. */
  readonly stages: readonly VehicleBossStage[];
}

export const VEHICLE_BOSSES = {
  /**
   * The Escalade (§6): "A mother in sunglasses, on the phone, eating a salad,
   * driving an enormous Escalade around a cul-de-sac."
   *
   * Eighty pixels by forty-four is five tiles long and nearly three tall,
   * which is the joke stated in numbers: it is larger than both brothers put
   * together and it is being driven with one hand.
   */
  escalade: {
    label: 'The Escalade',
    art: 'escalade',
    hits: 3,
    phases: 3,
    bodyWidth: 80,
    bodyHeight: 44,
    color: 0x2f3444,
    settleMs: 420,
    stages: [
      // Phase 1. It charges one way and crawls back, so half the cycle is
      // free time — this is where you learn that the roof is a place.
      {
        waitMs: 1700,
        revMs: 950,
        chargeSpeed: 250,
        stallMs: 2800,
        returnSpeed: 110,
        reverseCharges: false,
        beatMs: 0,
      },
      // Phase 2. §6: "Reverse. Backup beeping." The leg back is a charge now,
      // so there is no longer a safe half of the cycle.
      {
        waitMs: 1400,
        revMs: 820,
        chargeSpeed: 305,
        stallMs: 2400,
        returnSpeed: 305,
        reverseCharges: true,
        beatMs: 0,
      },
      // Phase 3. The salad goes in the cupholder.
      {
        waitMs: 1100,
        revMs: 620,
        chargeSpeed: 375,
        stallMs: 2050,
        returnSpeed: 375,
        reverseCharges: true,
        beatMs: 620,
      },
    ],
  },
} as const satisfies Record<string, VehicleBossConfig>;

export type VehicleBossKind = keyof typeof VEHICLE_BOSSES;

// --------------------------------------------------------------- the bear ---

/** One phase of the bear fight. The fight escalates by swapping stages. */
export interface BearStage {
  /** How long it paces between attacks, ms. */
  readonly paceMs: number;
  /** The rear before a charge — the telegraph, and the only one there is, ms. */
  readonly rearMs: number;
  /** Charging speed, px/s. */
  readonly chargeSpeed: number;
  /** How long it is dazed after running into something, ms. This is the window. */
  readonly dazeMs: number;
  /** Garbage bags thrown from the dumpster, per visit. */
  readonly bags: number;
  /** Time between throws, ms. */
  readonly throwEveryMs: number;
  /** Raccoons called in when it is hit into this phase. */
  readonly raccoons: number;
}

export interface BearConfig {
  readonly label: string;
  readonly art: ActorSpriteName;
  readonly hits: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly color: number;
  /** Pacing speed, px/s. */
  readonly walkSpeed: number;
  /** How close in front of it you have to be to be swiped at, px. */
  readonly swipeRange: number;
  /** The wind-up of a swipe, ms: the paw goes back before it comes round. */
  readonly swipeWindUpMs: number;
  /** How long the swipe is live for, ms. */
  readonly swipeMs: number;
  readonly stages: readonly BearStage[];
}

/**
 * The Bear (§6, 3-4): "Lives behind the canteen dumpster with the kugel.
 * Charges, swipes, climbs the dumpster and hurls garbage bags, and calls in
 * raccoons when wounded."
 *
 * Four verbs in §6's sentence and one number each. The charge is the window —
 * it runs into the fence and is dazed, and a dazed bear can be landed on. The
 * swipe is the reason not to stand next to it. The dumpster is the round's
 * second half, a rain of bags that makes the arena smaller. And the raccoons are
 * the fight answering back: every hit brings more of the one enemy in the game
 * that takes your power-up rather than your life, so the better you are doing,
 * the more there is to lose.
 */
export const BEAR = {
  label: 'The Bear',
  art: 'bear',
  hits: 3,
  bodyWidth: 29,
  bodyHeight: 38,
  color: 0x4a3526,
  walkSpeed: 42,
  swipeRange: 30,
  swipeWindUpMs: 380,
  swipeMs: 180,
  stages: [
    { paceMs: 1500, rearMs: 760, chargeSpeed: 210, dazeMs: 1900, bags: 2, throwEveryMs: 700, raccoons: 0 },
    { paceMs: 1200, rearMs: 600, chargeSpeed: 255, dazeMs: 1600, bags: 3, throwEveryMs: 600, raccoons: 1 },
    { paceMs: 950, rearMs: 460, chargeSpeed: 300, dazeMs: 1350, bags: 4, throwEveryMs: 520, raccoons: 2 },
  ],
} as const satisfies BearConfig;
