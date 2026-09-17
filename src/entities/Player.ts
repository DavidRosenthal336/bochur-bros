import Phaser from 'phaser';
import type { CharacterStats } from '../config/Tuning';
import type { InputState } from '../input/InputState';
import { makeSolidTexture } from '../util/textures';

/** Everything the debug overlay wants to know, without reaching into privates. */
export interface PlayerDebugInfo {
  readonly grounded: boolean;
  readonly coyoteMs: number;
  readonly bufferMs: number;
  readonly rising: boolean;
  readonly jumpCut: boolean;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly running: boolean;
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
  /** True once the current jump has already been cut short by a release. */
  private jumpCut = false;
  /** Was the player grounded last frame? Used to detect landings. */
  private wasGrounded = true;

  /** Which way we are facing. Drives the nose marker; drives sprites later. */
  private facing: -1 | 1 = 1;
  /** A little wedge showing which way we face, since a rectangle cannot. */
  private readonly nose: Phaser.GameObjects.Rectangle;

  /** Position at the moment of the last takeoff, for the debug readouts. */
  private launchY = 0;
  private launchX = 0;
  private lastJumpHeight = 0;
  private lastJumpDistance = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: CharacterStats) {
    const textureKey = `player-${stats.label.toLowerCase()}-small`;
    makeSolidTexture(scene, textureKey, stats.bodyWidth, stats.bodyHeight, 0xffffff);

    super(scene, x, y, textureKey);
    this.stats = stats;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1); // anchored at the feet: spawn points are floor positions
    this.setTint(stats.color);
    this.setDepth(10);

    const body = this.physicsBody;
    body.setSize(stats.bodyWidth, stats.bodyHeight);
    body.setOffset(0, 0);
    body.setAllowGravity(true);
    body.setGravityY(stats.gravity);
    body.setMaxVelocity(10_000, stats.maxFallSpeed);
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
  tick(delta: number, input: InputState): void {
    const dt = delta / 1000;
    const grounded = this.isGrounded;

    // Arcade physics steps on the scene's `update` event, which fires *before*
    // Scene.update — so by the time we get here, position already reflects this
    // frame's movement. Measure first, while it is freshest.
    this.measure(grounded);

    this.updateTimers(delta, grounded, input);
    this.updateHorizontal(dt, grounded, input);
    this.updateJump(grounded, input);
    this.updateAppearance(grounded);

    this.wasGrounded = grounded;
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

  private updateHorizontal(dt: number, grounded: boolean, input: InputState): void {
    const body = this.physicsBody;
    const dir = input.moveX;
    const topSpeed = input.run ? this.stats.runSpeed : this.stats.walkSpeed;
    const vx = body.velocity.x;

    if (dir === 0) {
      // No input: bleed off. Much gentler in the air, so jump arcs stay arcs.
      const rate = this.stats.deceleration * (grounded ? 1 : this.stats.airDrag);
      body.setVelocityX(approach(vx, 0, rate * dt));
      return;
    }

    this.facing = dir;
    const target = dir * topSpeed;

    let rate: number;
    if (vx !== 0 && Math.sign(vx) !== dir) {
      // Pivoting. Deliberately the harshest rate — turnarounds should bite.
      rate = this.stats.turnDeceleration;
    } else if (Math.abs(vx) > topSpeed) {
      // Over the cap, e.g. the run button was just released. Ease down, don't snap.
      rate = this.stats.deceleration;
    } else {
      rate = this.stats.acceleration;
    }

    if (!grounded) rate *= this.stats.airControl;
    body.setVelocityX(approach(vx, target, rate * dt));
  }

  private updateJump(grounded: boolean, input: InputState): void {
    const body = this.physicsBody;

    // Take off when a remembered press meets available ground (real or coyote).
    if (this.bufferMs > 0 && this.coyoteMs > 0) {
      body.setVelocityY(this.stats.jumpVelocity);
      this.bufferMs = 0;
      this.coyoteMs = 0; // one jump per departure from the ground
      this.rising = true;
      this.jumpActive = true;
      this.jumpCut = false;
      this.launchY = this.y;
      this.launchX = this.x;
      this.lastJumpHeight = 0;
    }

    // Variable height: letting go early lops 50% off whatever lift is left.
    if (this.rising && !this.jumpCut && !input.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * this.stats.jumpCutMultiplier);
      this.jumpCut = true;
    }

    // A ceiling ends the jump as surely as gravity does.
    if (body.blocked.up) {
      this.rising = false;
    }
    if (body.velocity.y >= 0) {
      this.rising = false;
    }
    if (grounded && !this.wasGrounded) {
      this.rising = false;
      this.jumpCut = false;
    }
  }

  private updateAppearance(grounded: boolean): void {
    // Greybox feedback: a touch brighter in the air so state is readable at a glance.
    this.setTint(grounded ? this.stats.color : lighten(this.stats.color, 0.35));

    this.nose.setPosition(
      this.x + this.facing * (this.stats.bodyWidth / 2 - 2),
      this.y - this.stats.bodyHeight + 6,
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
    this.jumpCut = false;
    this.wasGrounded = true;
    this.lastJumpHeight = 0;
    this.lastJumpDistance = 0;
  }

  get debugInfo(): PlayerDebugInfo {
    const body = this.physicsBody;
    return {
      grounded: this.isGrounded,
      coyoteMs: this.coyoteMs,
      bufferMs: this.bufferMs,
      rising: this.rising,
      jumpCut: this.jumpCut,
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
      running: Math.abs(body.velocity.x) > this.stats.walkSpeed + 1,
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
