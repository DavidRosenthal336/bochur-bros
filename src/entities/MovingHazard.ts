import Phaser from 'phaser';
import type { HazardConfig } from '../config/hazards';
import type { ActorSpriteSet } from '../config/sprites';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/**
 * A hazard that moves: a falling pipe, a runaway cart, a lurching van, the
 * stroller.
 *
 * One class, four behaviours picked by config, for the same reason the enemies
 * are one class — §11 asks for it, and because the difference between a cart
 * and a van is a handful of numbers, not a type hierarchy.
 *
 * None of these can be defeated. They are survived, dodged, or in the case of
 * the cart and the van, climbed onto and ridden.
 */
export class MovingHazard extends Phaser.Physics.Arcade.Sprite {
  readonly config: HazardConfig;

  private readonly homeX: number;
  private readonly homeY: number;
  private facing: -1 | 1;
  private phase: 'idle' | 'warning' | 'active' | 'spent' = 'idle';
  private phaseEndsAt = 0;
  /** The shadow a falling pipe casts before it drops (§6). */
  private shadow: Phaser.GameObjects.Rectangle | undefined;
  private readonly art: ActorSpriteSet | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number, config: HazardConfig, facing: -1 | 1 = -1) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.homeX = x;
    this.homeY = y;
    this.facing = facing;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(7);

    const body = this.physicsBody;
    body.setSize(config.bodyWidth, config.bodyHeight);
    body.setOffset(0, 0);

    this.art = actorArt(config.art);
    if (this.art) {
      applyActorArt(this, this.art, config.bodyWidth, config.bodyHeight);
      playPose(this, this.art, 'idle');
    } else {
      this.setTint(config.color);
    }

    body.setAllowGravity(config.affectedByGravity);
    if (config.affectedByGravity) body.setGravityY(1500);
    // NOT immovable. Arcade skips separation entirely when both bodies in a
    // collision are immovable, and every solid in the level is a static body,
    // which counts as immovable — so an immovable cart simply fell through the
    // pavement and out of the world. `pushable = false` gets what immovable was
    // reached for (the player cannot shove it) without that.
    body.pushable = false;
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Does the level's geometry stop it?
   *
   * A faller says no. It rests on scaffolding it is deliberately overlapping
   * and stops at the ground row it is told about, so letting Arcade separate
   * it from the scaffolding would shove it out of its rest position and make
   * `blocked.down` true before it had fallen anywhere.
   */
  get collidesWithSolids(): boolean {
    return this.config.behavior !== 'faller';
  }

  /** Is it currently able to hurt you? A pipe waiting on the scaffold is not. */
  get isDangerous(): boolean {
    if (!this.config.harmful) return false;
    if (this.config.behavior === 'faller') return this.phase === 'active';
    return true;
  }

  tick(now: number, playerX: number, playerY: number, groundY: number): void {
    switch (this.config.behavior) {
      case 'faller':
        this.tickFaller(now, playerX, groundY);
        break;
      case 'roller':
        this.tickRoller();
        break;
      case 'lurcher':
        this.tickLurcher(now, playerX);
        break;
      case 'chaser':
        this.tickChaser(playerX, playerY);
        break;
      default:
        break;
    }

    this.rollWheels();
  }

  /**
   * Anything on wheels leans the way it is going and bobs as it rolls.
   *
   * These are single-frame drawings by design — the README calls for them to be
   * "moved and rotated in code rather than animated" — so the motion has to
   * come from here or they slide along like stickers.
   */
  private rollWheels(): void {
    if (!this.art) return;
    const vx = this.physicsBody.velocity.x;

    if (this.config.behavior === 'roller' || this.config.behavior === 'chaser') {
      if (vx !== 0) this.setFlipX(vx < 0);
      // A shallow rock rather than a spin: these are drawn upright, and a
      // rotating hitbox is not something Arcade has any concept of.
      this.setAngle(Math.abs(vx) < 1 ? 0 : Math.sin(this.scene.time.now / 70) * 2.5);
    }
  }

  /**
   * Waits overhead. When you walk under it, a shadow appears on the ground for
   * a beat, and then it drops. The shadow is the entire fairness of it.
   */
  private tickFaller(now: number, playerX: number, groundY: number): void {
    const settings = this.config.faller;
    if (!settings) return;
    const body = this.physicsBody;

    switch (this.phase) {
      case 'idle': {
        body.setVelocity(0, 0);
        body.setAllowGravity(false);
        this.setPosition(this.homeX, this.homeY);
        if (Math.abs(playerX - this.homeX) < settings.triggerRange) {
          this.phase = 'warning';
          this.phaseEndsAt = now + settings.warningMs;
          this.showShadow(groundY, settings.warningMs);
        }
        break;
      }

      case 'warning':
        if (now >= this.phaseEndsAt) {
          this.phase = 'active';
          body.setVelocityY(this.config.speed);
        }
        break;

      case 'active':
        if (body.blocked.down || this.y >= groundY) {
          this.phase = 'spent';
          this.phaseEndsAt = now + settings.resetMs;
          // Snap flush to the pavement. At 520 px/s a frame is nine pixels, so
          // without this it comes to rest wherever the step happened to leave
          // it — hovering above the ground or sunk into it.
          this.setPosition(this.x, Math.min(this.y, groundY));
          body.setVelocity(0, 0);
          this.clearShadow();
          this.scene.cameras.main.shake(120, 0.005);
        }
        break;

      case 'spent':
        if (now >= this.phaseEndsAt) {
          this.phase = 'idle';
          this.setPosition(this.homeX, this.homeY);
        }
        break;
    }
  }

  private showShadow(groundY: number, warningMs: number): void {
    this.clearShadow();
    this.shadow = this.scene.add
      .rectangle(this.homeX, groundY - 1, this.config.bodyWidth + 6, 3, 0x000000, 0.55)
      .setOrigin(0.5, 1)
      .setDepth(3);
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.15,
      duration: warningMs / 4,
      yoyo: true,
      repeat: -1,
    });
  }

  private clearShadow(): void {
    if (!this.shadow) return;
    this.scene.tweens.killTweensOf(this.shadow);
    this.shadow.destroy();
    this.shadow = undefined;
  }

  /** Rolls in one direction, turning at walls so it stays in its stretch. */
  private tickRoller(): void {
    const body = this.physicsBody;
    if (body.blocked.left || body.blocked.right) this.facing = this.facing === 1 ? -1 : 1;
    body.setVelocityX(this.facing * this.config.speed);
  }

  /** Sits still, then lurches forward with no warning at all. That is the joke. */
  private tickLurcher(now: number, playerX: number): void {
    const settings = this.config.lurcher;
    if (!settings) return;
    const body = this.physicsBody;

    switch (this.phase) {
      case 'idle':
        body.setVelocityX(0);
        if (Math.abs(playerX - this.x) < settings.triggerRange) {
          this.phase = 'warning';
          this.phaseEndsAt = now + settings.waitMs;
        }
        break;

      case 'warning':
        body.setVelocityX(0);
        if (now >= this.phaseEndsAt) {
          this.phase = 'active';
          this.phaseEndsAt = now + settings.lungeMs;
          this.facing = playerX < this.x ? -1 : 1;
        }
        break;

      case 'active':
        body.setVelocityX(this.facing * this.config.speed);
        if (now >= this.phaseEndsAt || body.blocked.left || body.blocked.right) {
          this.phase = 'spent';
          this.phaseEndsAt = now + settings.waitMs * 2;
          body.setVelocityX(0);
        }
        break;

      case 'spent':
        body.setVelocityX(0);
        if (now >= this.phaseEndsAt) this.phase = 'idle';
        break;
    }
  }

  /** Follows, relentlessly, and hops a little when it meets a step. */
  private tickChaser(playerX: number, playerY: number): void {
    const body = this.physicsBody;
    const direction = playerX < this.x ? -1 : 1;
    body.setVelocityX(direction * this.config.speed);

    // A wall in the way is a step to be hopped, not a reason to stop: the
    // stroller is supposed to follow you the length of the level.
    const blocked = direction > 0 ? body.blocked.right : body.blocked.left;
    if (blocked && body.blocked.down) body.setVelocityY(-430);
    void playerY;
  }

  override destroy(fromScene?: boolean): void {
    this.clearShadow();
    super.destroy(fromScene);
  }
}
