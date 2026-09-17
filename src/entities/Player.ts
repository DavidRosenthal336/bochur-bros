import Phaser from 'phaser';
import type { CharacterStats, JumpBracket } from '../config/Tuning';
import { GAMEPLAY, TIERS } from '../config/Tuning';
import type { PowerTier } from '../systems/PowerState';
import type { InputState } from '../input/InputState';
import { NEUTRAL_INPUT } from '../input/InputState';
import { solidTextureKey } from '../util/textures';

/** Everything the debug overlay wants to know, without reaching into privates. */
export interface PlayerDebugInfo {
  readonly grounded: boolean;
  readonly coyoteMs: number;
  readonly bufferMs: number;
  readonly rising: boolean;
  readonly gravity: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly crouching: boolean;
  /** Is the run button held? */
  readonly running: boolean;
  readonly tier: PowerTier;
  /** Peak height above the launch point for the most recent jump, in pixels. */
  readonly lastJumpHeight: number;
  /** Horizontal ground covered by the most recent completed jump, in pixels. */
  readonly lastJumpDistance: number;
}

/**
 * The player character.
 *
 * Horizontal motion is integrated by hand rather than handed to Arcade's drag
 * and acceleration, because the spec's feel rules — a hard top speed, separate
 * turn-around deceleration, reduced air control — are all easier to state
 * exactly than to coax out of a drag coefficient.
 *
 * Milestone 1 is Mendy only. Berel and the swap arrive in Milestone 3; because
 * every characteristic already comes from an injected `CharacterStats`, that is
 * a matter of pointing this class at a different stat block.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private stats: CharacterStats;

  /** Milliseconds of ledge grace still available. Refilled while grounded. */
  private coyoteMs = 0;
  /** Milliseconds a recent jump press stays queued. Set on press, spent on landing. */
  private bufferMs = 0;
  /** True from leaving the ground until upward velocity is spent. Drives the jump cut. */
  private rising = false;
  /** True from takeoff until the next landing. Scopes the debug measurements. */
  private jumpActive = false;
  /** The jump bracket the current jump launched in. Fixed for its whole arc. */
  private bracket: JumpBracket;

  /** Which way we are facing. Drives the nose marker; drives sprites later. */
  private facing: -1 | 1 = 1;
  /** Ducking. Shrinks the body; standing up again waits for headroom. */
  private crouching = false;
  /** Was the run button held this frame? Debug readout only. */
  private running = false;
  /** Current power-up tier. Owned by the scene's PowerState; mirrored here for size. */
  private tier: PowerTier = 'small';
  /** While false, input is ignored — during a death, or a level-complete walk-off. */
  private controllable = true;
  /** A little wedge showing which way we face, since a rectangle cannot. */
  private readonly nose: Phaser.GameObjects.Rectangle;

  /** Position at the moment of the last takeoff, for the debug readouts. */
  private launchY = 0;
  private launchX = 0;
  private lastJumpHeight = 0;
  private lastJumpDistance = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: CharacterStats) {
    super(scene, x, y, solidTextureKey(scene, stats.bodyWidth, stats.bodyHeight));
    this.stats = stats;
    this.bracket = stats.jumpBrackets[0]!;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1); // anchored at the feet: spawn points are floor positions
    this.setTint(stats.color);
    this.setDepth(10);

    const body = this.physicsBody;
    body.setSize(stats.bodyWidth, stats.bodyHeight);
    body.setOffset(0, 0);
    body.setAllowGravity(true);
    // Note: Arcade's maxVelocity clamps a component in BOTH directions, so it
    // cannot express a terminal fall speed — it would cap the jump too.
    // Falling is limited by hand in `tick` instead.
    body.setMaxVelocity(10_000, 10_000);
    // Gravity is not a constant here: it is chosen every frame from the jump
    // bracket and whether the button is still held. See `applyGravity`.
    body.setGravityY(stats.jumpBrackets[0]!.fallGravity);
    body.setCollideWorldBounds(true);

    this.nose = scene.add.rectangle(x, y, 4, 4, 0xffffff, 0.9).setDepth(11);
  }

  /** The arcade body, narrowed. Phaser types `body` loosely on GameObjects. */
  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isGrounded(): boolean {
    const body = this.physicsBody;
    return body.blocked.down || body.touching.down;
  }

  /**
   * Advance one frame.
   *
   * @param delta Milliseconds since the previous frame.
   */
  tick(delta: number, rawInput: InputState): void {
    const input = this.controllable ? rawInput : NEUTRAL_INPUT;
    const dt = delta / 1000;
    const grounded = this.isGrounded;

    // Arcade physics steps on the scene's `update` event, which fires *before*
    // Scene.update — so by the time we get here, position already reflects this
    // frame's movement. Measure first, while it is freshest.
    this.measure(grounded);

    this.updateTimers(delta, grounded, input);
    this.updateCrouch(grounded, input);
    this.updateHorizontal(dt, grounded, input);
    this.updateJump(grounded, input);
    this.limitFallSpeed();
    this.updateAppearance(grounded);
  }

  /** Terminal velocity, applied downward only. */
  private limitFallSpeed(): void {
    const body = this.physicsBody;
    if (body.velocity.y > this.stats.maxFallSpeed) {
      body.setVelocityY(this.stats.maxFallSpeed);
    }
  }

  /**
   * Debug instrumentation only: how high and how far the current jump got.
   * Nothing in the game reads these; the overlay does, and it is what makes the
   * test level's height and gap ladders measurable rather than guesswork.
   */
  private measure(grounded: boolean): void {
    if (!this.jumpActive) return;

    this.lastJumpHeight = Math.max(this.lastJumpHeight, this.launchY - this.y);
    if (grounded) {
      this.lastJumpDistance = Math.abs(this.x - this.launchX);
      this.jumpActive = false;
    }
  }

  private updateTimers(delta: number, grounded: boolean, input: InputState): void {
    // Coyote time: full while standing on something, draining once you are not.
    if (grounded) {
      this.coyoteMs = this.stats.coyoteTimeMs;
    } else {
      this.coyoteMs = Math.max(0, this.coyoteMs - delta);
    }

    // Jump buffer: a press is remembered briefly so an early press still fires.
    if (input.jumpPressed) {
      this.bufferMs = this.stats.jumpBufferMs;
    } else {
      this.bufferMs = Math.max(0, this.bufferMs - delta);
    }
  }

  /**
   * Crouching shrinks the body and roots you in place, as it does in Mario.
   * Standing up is refused while something is directly overhead, so ducking
   * under a low ceiling cannot wedge you inside it.
   */
  private updateCrouch(grounded: boolean, input: InputState): void {
    const wantsCrouch = grounded && input.moveY > 0;
    if (wantsCrouch === this.crouching) return;
    if (!wantsCrouch && !this.hasHeadroom()) return;

    this.crouching = wantsCrouch;
    this.applyBodyHeight();
  }

  /** Is there room to stand back up to full height? */
  private hasHeadroom(): boolean {
    const full = this.currentHeight(false);
    const gap = full - this.currentHeight(true);
    if (gap <= 0) return true;

    const blockers = this.scene.physics.overlapRect(
      this.x - this.tierWidth / 2 + 1,
      this.y - full,
      this.tierWidth - 2,
      gap,
      false,
      true,
    );
    return blockers.length === 0;
  }

  /** Body width at the current tier, in pixels. */
  private get tierWidth(): number {
    return Math.round(this.stats.bodyWidth * TIERS[this.tier].widthScale);
  }

  /** Standing height for the current tier and stance, in pixels. */
  private currentHeight(crouching: boolean): number {
    const standing = Math.round(this.stats.bodyHeight * TIERS[this.tier].heightScale);
    return crouching ? Math.round(standing * this.stats.crouchHeightFactor) : standing;
  }

  /**
   * Change power-up tier. The scene's PowerState decides *when*; this only
   * applies the consequences — a bigger body and a different colour.
   */
  setTier(tier: PowerTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.applyBodyHeight();
    this.updateAppearance(this.isGrounded);
  }

  /** Can this tier smash a breakable block from below? */
  get breaksBlocks(): boolean {
    return TIERS[this.tier].breaksBlocks;
  }

  /** Bounce off something — a stomped enemy, usually. */
  bounce(velocityY: number): void {
    this.physicsBody.setVelocityY(velocityY);
    this.rising = false;
    this.jumpActive = false;
  }

  /** Knocked back by a hit, without dying. */
  recoil(fromX: number): void {
    const away = this.x < fromX ? -1 : 1;
    this.physicsBody.setVelocity(away * GAMEPLAY.hurtKnockbackX, GAMEPLAY.hurtKnockbackY);
  }

  /** Stop responding to input and flop upward. The scene handles what comes next. */
  playDeath(): void {
    this.controllable = false;
    const body = this.physicsBody;
    body.setVelocity(0, GAMEPLAY.deathLaunchY);
    body.checkCollision.none = true;
    body.setAllowGravity(true);
    body.setGravityY(1500);
    this.setTint(0x6b7090);
  }

  /** Hand control back, e.g. after respawning. */
  setControllable(controllable: boolean): void {
    this.controllable = controllable;
  }

  /**
   * Resize the sprite and its body, keeping the feet planted.
   *
   * This swaps to a texture of exactly the right size rather than scaling one,
   * so the sprite's scale stays at 1 and the body matches the picture exactly.
   * Because the origin sits at the feet, a shorter body shrinks from the top —
   * which is what ducking should look like, and stops a resize from popping the
   * character up off the floor.
   */
  private applyBodyHeight(): void {
    const width = this.tierWidth;
    const height = this.currentHeight(this.crouching);

    this.setTexture(solidTextureKey(this.scene, width, height));
    const body = this.physicsBody;
    body.setSize(width, height);
    body.setOffset(0, 0);
  }

  /**
   * Mario's horizontal model: a slow build-up to one of two caps, a distinct
   * and much harsher rate for turning around, and — the part that matters most
   * — no friction at all in the air, so a jump keeps the speed it launched with.
   */
  private updateHorizontal(dt: number, grounded: boolean, input: InputState): void {
    const body = this.physicsBody;
    const running = input.run && !this.crouching;
    this.running = running;
    const topSpeed = this.crouching
      ? this.stats.crouchSpeed
      : running
        ? this.stats.runSpeed
        : this.stats.walkSpeed;
    // A zero top speed (a character who is rooted while ducking) is expressed
    // as having no direction at all, so the friction branch below stops them.
    const dir = topSpeed === 0 ? 0 : input.moveX;
    const vx = body.velocity.x;

    if (dir === 0) {
      const rate = this.stats.friction * (grounded ? 1 : this.stats.airDrag);
      body.setVelocityX(approach(vx, 0, rate * dt));
      return;
    }

    this.facing = dir;

    let rate: number;
    if (vx !== 0 && Math.sign(vx) !== dir) {
      // The screech-turn. Much harsher than either accelerating or coasting.
      rate = this.stats.skidDeceleration;
    } else if (Math.abs(vx) > topSpeed) {
      // Over the cap, e.g. the run button was just released. Coast down to it.
      rate = this.stats.friction;
    } else {
      rate = running ? this.stats.runAcceleration : this.stats.walkAcceleration;
    }

    if (!grounded) rate *= this.stats.airControl;
    body.setVelocityX(approach(vx, dir * topSpeed, rate * dt));
  }

  /**
   * Mario's jump, which is two ideas rather than one.
   *
   * First, how high you go depends on how fast you were moving when you left
   * the ground — the bracket is chosen at takeoff and holds for the whole arc.
   * Second, holding the button does not add force; it *lowers gravity*. Let go
   * and the heavy falling gravity takes over immediately and permanently, so
   * a tap gives you a tile and a held button gives you four. That single
   * detail is most of what people mean when they say a jump feels like Mario's.
   */
  private updateJump(grounded: boolean, input: InputState): void {
    const body = this.physicsBody;

    // Take off when a remembered press meets available ground (real or coyote).
    if (this.bufferMs > 0 && this.coyoteMs > 0) {
      this.bracket = this.bracketFor(Math.abs(body.velocity.x));
      body.setVelocityY(this.bracket.launchVelocity);
      this.bufferMs = 0;
      this.coyoteMs = 0; // one jump per departure from the ground
      this.rising = true;
      this.jumpActive = true;
      this.launchY = this.y;
      this.launchX = this.x;
      this.lastJumpHeight = 0;
    }

    // Releasing the button ends the light-gravity phase for good; re-pressing
    // mid-jump does not get it back.
    if (!input.jumpHeld || body.velocity.y >= 0 || body.blocked.up) {
      this.rising = false;
    }

    this.applyGravity(grounded);
  }

  /** Pick the jump bracket for a given horizontal speed. */
  private bracketFor(speed: number): JumpBracket {
    for (const bracket of this.stats.jumpBrackets) {
      if (speed <= bracket.upToSpeed) return bracket;
    }
    return this.stats.jumpBrackets[this.stats.jumpBrackets.length - 1]!;
  }

  /** Light gravity only while rising with the button held; heavy the rest of the time. */
  private applyGravity(grounded: boolean): void {
    const bracket = grounded
      ? this.bracketFor(Math.abs(this.physicsBody.velocity.x))
      : this.bracket;
    this.physicsBody.setGravityY(this.rising ? bracket.holdGravity : bracket.fallGravity);
  }

  private updateAppearance(grounded: boolean): void {
    // Greybox feedback: a touch brighter in the air so state is readable at a glance.
    const base = TIERS[this.tier].tint ?? this.stats.color;
    this.setTint(grounded ? base : lighten(base, 0.35));

    this.nose.setPosition(
      this.x + this.facing * (this.tierWidth / 2 - 2),
      this.y - this.currentHeight(this.crouching) + 6,
    );
  }

  /** Put the player back at a known good spot, motionless. */
  respawn(x: number, y: number): void {
    const body = this.physicsBody;
    body.reset(x, y);
    this.coyoteMs = 0;
    this.bufferMs = 0;
    this.rising = false;
    this.jumpActive = false;
    this.bracket = this.stats.jumpBrackets[0]!;
    this.lastJumpHeight = 0;
    this.lastJumpDistance = 0;
    this.crouching = false;
    this.controllable = true;
    this.physicsBody.checkCollision.none = false;
    this.applyBodyHeight();
  }

  get debugInfo(): PlayerDebugInfo {
    const body = this.physicsBody;
    return {
      grounded: this.isGrounded,
      coyoteMs: this.coyoteMs,
      bufferMs: this.bufferMs,
      rising: this.rising,
      gravity: this.physicsBody.gravity.y,
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
      crouching: this.crouching,
      running: this.running,
      tier: this.tier,
      lastJumpHeight: this.lastJumpHeight,
      lastJumpDistance: this.lastJumpDistance,
    };
  }

  override destroy(fromScene?: boolean): void {
    this.nose.destroy();
    super.destroy(fromScene);
  }
}

/** Move `current` toward `target` by at most `maxDelta`. */
function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

function lighten(color: number, amount: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.round(c.red + (255 - c.red) * amount),
    Math.round(c.green + (255 - c.green) * amount),
    Math.round(c.blue + (255 - c.blue) * amount),
  );
}
