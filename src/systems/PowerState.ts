import Phaser from 'phaser';

/**
 * The power-up tiers, from BOCHUR_BROS_DESIGN.md §5.
 *
 * Small is the base state, Cholent is the "big" tier, and the three power
 * forms all sit on the same rung above Cholent — you hold one at a time, and
 * losing it drops you to Cholent rather than straight to Small.
 */
export type PowerTier = 'small' | 'cholent' | 'menorah' | 'lulav' | 'peyos';

/**
 * THE tier-drop rule. §11 asks for it in one place, and this is the place:
 * a hit costs exactly one rung, and a hit at the bottom rung costs a life.
 */
const TIER_BELOW: Record<PowerTier, PowerTier | null> = {
  peyos: 'cholent',
  lulav: 'cholent',
  menorah: 'cholent',
  cholent: 'small',
  small: null, // nothing below Small: a hit here is fatal
};

/** Ranking used to decide whether a pickup is an upgrade or a sidegrade. */
const TIER_RANK: Record<PowerTier, number> = {
  small: 0,
  cholent: 1,
  menorah: 2,
  lulav: 2,
  peyos: 2,
};

export type HitResult = 'ignored' | 'dropped' | 'died';

/**
 * Invulnerability after taking a hit. Not in the design doc, but without it a
 * single overlap with an enemy spans several frames and strips every tier at
 * once. [ADDED]
 */
const INVULNERABLE_MS = 1200;

/**
 * A small state machine holding which power-up tier is active.
 *
 * It is deliberately separate from the player: §4 says both characters share
 * one power-up state, so when Berel and the swap arrive in Milestone 3 this
 * object stays put while the controlled entity changes underneath it.
 *
 * Emits:
 *  - `changed` (next: PowerTier, previous: PowerTier)
 *  - `died`
 */
export class PowerState extends Phaser.Events.EventEmitter {
  private tier: PowerTier = 'small';
  private invulnerableUntil = 0;

  get current(): PowerTier {
    return this.tier;
  }

  /** Does the current tier count as "big"? Drives body size and block-breaking. */
  get isBig(): boolean {
    return this.tier !== 'small';
  }

  isInvulnerable(now: number): boolean {
    return now < this.invulnerableUntil;
  }

  /**
   * Award a tier from a pickup.
   *
   * A pickup never demotes you — collecting a Cholent while in a power form
   * leaves the power form alone — but the three power forms share a rung, so
   * picking up a Lulav while holding the Menorah swaps you to the Lulav. §5:
   * "only one at a time".
   */
  grant(next: PowerTier): boolean {
    if (next === this.tier) return false;
    if (TIER_RANK[next] < TIER_RANK[this.tier]) return false;
    return this.set(next);
  }

  /**
   * Take a hit. Returns what it cost: nothing (still invulnerable from the
   * last one), one tier, or a life.
   */
  takeHit(now: number): HitResult {
    if (this.isInvulnerable(now)) return 'ignored';

    const below = TIER_BELOW[this.tier];
    if (below === null) {
      this.emit('died');
      return 'died';
    }

    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.set(below);
    return 'dropped';
  }

  /** Back to Small with no grace period — used when respawning. */
  reset(): void {
    this.invulnerableUntil = 0;
    this.set('small');
  }

  private set(next: PowerTier): boolean {
    if (next === this.tier) return false;
    const previous = this.tier;
    this.tier = next;
    this.emit('changed', next, previous);
    return true;
  }
}
