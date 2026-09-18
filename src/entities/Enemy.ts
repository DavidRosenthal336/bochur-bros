import Phaser from 'phaser';
import type { EnemyConfig } from '../config/enemies';
import type { ActorSpriteSet } from '../config/sprites';
import { GAMEPLAY } from '../config/Tuning';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/**
 * Every enemy in the game, driven by a config row rather than a subclass.
 *
 * Behaviours are small private methods selected by `config.behavior`; adding
 * `chase`, `emerge` or `thief` later means adding a method and a case, not a
 * new class hierarchy.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly config: EnemyConfig;

  private hitsLeft: number;
  private dying = false;
  /** Where it started. Patrol is measured from here, and swoops return here. */
  private readonly homeX: number;
  private readonly homeY: number;
  private facing: -1 | 1 = -1;
  private phase: 'patrol' | 'winding' | 'diving' | 'recovering' | 'hidden' | 'rising' | 'scurrying' =
    'patrol';
  /** When the current emerge phase ends. */
  private phaseEndsAt = 0;
  private nextDiveAllowedAt = 0;
  /** When the current wind-up finishes and the swoop actually starts. */
  private diveStartsAt = 0;
  private tell: Phaser.GameObjects.Rectangle | undefined;
  /** Frozen until this time. A stunned enemy still collides; it just stops. */
  private stunnedUntil = 0;
  /** The drawn sheet, if this creature has been drawn. */
  private readonly art: ActorSpriteSet | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.hitsLeft = config.hits;
    this.homeX = x;
    this.homeY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(9);

    const body = this.physicsBody;
    body.setSize(config.bodyWidth, config.bodyHeight);
    body.setOffset(0, 0);

    this.art = actorArt(config.art);
    if (this.art) {
      applyActorArt(this, this.art, config.bodyWidth, config.bodyHeight);
    } else {
      this.setTint(config.color);
    }

    body.setAllowGravity(config.affectedByGravity);
    if (config.affectedByGravity) body.setGravityY(1400);
    body.setVelocityX(this.facing * config.speed);
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isAlive(): boolean {
    return !this.dying && this.active;
  }

  tick(now: number, playerX: number, playerY: number): void {
    if (this.dying) return;
    if (this.tell) this.tell.setPosition(this.x, this.y - this.config.bodyHeight / 2);

    if (now < this.stunnedUntil) {
      this.physicsBody.setVelocityX(0);
      if (!this.config.affectedByGravity) this.physicsBody.setVelocityY(0);
      return;
    }

    switch (this.config.behavior) {
      case 'patrol':
        this.tickPatrol();
        break;
      case 'dive':
        this.tickDive(now, playerX, playerY);
        break;
      case 'emerge':
        this.tickEmerge(now, playerX);
        break;
    }

    this.updatePose();
  }

  /**
   * Show whichever drawing matches what the creature is doing.
   *
   * The phase already says what is happening, so the pose is a lookup rather
   * than a second state machine — and a creature with no art simply has no
   * poses to play.
   */
  private updatePose(): void {
    const art = this.art;
    if (!art) return;

    switch (this.phase) {
      case 'winding':
        playPose(this, art, 'rear');
        break;
      case 'diving':
        playPose(this, art, 'swoop');
        break;
      case 'rising':
      case 'scurrying':
        playPose(this, art, 'run');
        break;
      default:
        // Drifting along a perch line is flying; standing still is perching.
        playPose(this, art, Math.abs(this.physicsBody.velocity.x) > 2 ? 'fly' : 'perch');
        break;
    }

    if (this.physicsBody.velocity.x !== 0) {
      // Every sheet is drawn facing right.
      this.setFlipX(this.physicsBody.velocity.x < 0);
    }
  }

  /** Back to normal colours after a flash. Drawn art is never tinted at rest. */
  private restoreTint(): void {
    if (this.art) this.clearTint();
    else this.setTint(this.config.color);
  }

  /** Walk or drift back and forth, turning at the ends of the beat and at walls. */
  private tickPatrol(): void {
    const body = this.physicsBody;
    const strayed = Math.abs(this.x - this.homeX) >= this.config.patrolRange;
    const walled = body.blocked.left || body.blocked.right;
    if (strayed || walled) this.turnAround();
    body.setVelocityX(this.facing * this.config.speed);
  }

  /**
   * Patrol a perch line, swoop when the player comes near and is below, then
   * climb back up. The arc comes from swooping at a fixed speed while the
   * player keeps moving, which is enough to make it read as a dive.
   */
  private tickDive(now: number, playerX: number, playerY: number): void {
    const body = this.physicsBody;
    const dive = this.config.dive;
    if (!dive) {
      this.tickPatrol();
      return;
    }

    switch (this.phase) {
      case 'patrol': {
        this.tickPatrol();
        body.setVelocityY(0);
        const near = Math.abs(playerX - this.x) < dive.triggerRange;
        const below = playerY > this.y + 16;
        if (near && below && now >= this.nextDiveAllowedAt) {
          this.beginWindUp(now, dive.windUpMs, playerX);
        }
        break;
      }

      case 'winding': {
        // Hold still, rear up, and flash. Whatever it does here has to be
        // legible from across the screen, because this is the whole warning.
        body.setVelocity(0, -18);
        if (now >= this.diveStartsAt) {
          this.endWindUp();
          this.phase = 'diving';
        }
        break;
      }

      case 'diving': {
        body.setVelocityX(this.facing * dive.speed);
        body.setVelocityY(dive.speed * 0.75);
        // Pull out once level with the player, or on hitting anything.
        if (this.y >= playerY - 2 || body.blocked.down || body.blocked.left || body.blocked.right) {
          this.phase = 'recovering';
          this.nextDiveAllowedAt = now + dive.cooldownMs;
        }
        break;
      }

      case 'recovering': {
        body.setVelocityX(this.facing * dive.recoverSpeed * 0.5);
        body.setVelocityY(-dive.recoverSpeed);
        if (this.y <= this.homeY) {
          this.y = this.homeY;
          this.phase = 'patrol';
          body.setVelocityY(0);
        }
        break;
      }
    }
  }

  /**
   * Out of sight, then up through the grate, then a hard run in one direction
   * and gone. The rising phase is deliberately visible: it is the warning.
   */
  private tickEmerge(now: number, playerX: number): void {
    const config = this.config.emerge;
    if (!config) {
      this.tickPatrol();
      return;
    }

    const body = this.physicsBody;

    if (this.phase === 'patrol') {
      this.phase = 'hidden';
      this.phaseEndsAt = now + config.hiddenMs;
    }

    switch (this.phase) {
      case 'hidden':
        this.setVisible(false);
        body.enable = false;
        this.setPosition(this.homeX, this.homeY);
        if (now >= this.phaseEndsAt) {
          this.phase = 'rising';
          this.phaseEndsAt = now + config.risingMs;
          this.facing = playerX < this.homeX ? -1 : 1;
          this.setVisible(true);
          this.setAlpha(0.55);
        }
        break;

      case 'rising':
        // Climbing out: visible, harmless, and not going anywhere yet.
        body.enable = false;
        this.setAlpha(0.55 + 0.45 * (1 - (this.phaseEndsAt - now) / config.risingMs));
        if (now >= this.phaseEndsAt) {
          this.phase = 'scurrying';
          this.phaseEndsAt = now + config.runMs;
          this.setAlpha(1);
          body.enable = true;
        }
        break;

      case 'scurrying':
        body.setVelocityX(this.facing * this.config.speed);
        if (now >= this.phaseEndsAt) {
          this.phase = 'hidden';
          this.phaseEndsAt = now + config.hiddenMs;
        }
        break;

      default:
        this.phase = 'hidden';
        this.phaseEndsAt = now + config.hiddenMs;
    }
  }

  private turnAround(): void {
    this.facing = this.facing === 1 ? -1 : 1;
  }

  /**
   * Rear up and flash, so the swoop is something you can read and answer.
   *
   * The tell is drawn as an outline *around* the enemy rather than a marker
   * above it: a marker above clips off the top of the screen exactly when the
   * enemy is perched high, which is precisely when you need to see it.
   */
  private beginWindUp(now: number, windUpMs: number, playerX: number): void {
    this.phase = 'winding';
    this.diveStartsAt = now + windUpMs;
    this.facing = playerX < this.x ? -1 : 1;

    this.setTint(0xffe9a8);
    this.tell = this.scene.add
      .rectangle(this.x, this.y - this.config.bodyHeight / 2, this.config.bodyWidth + 8, this.config.bodyHeight + 8)
      .setStrokeStyle(1, 0xffe9a8)
      .setDepth(9);
    this.scene.tweens.add({
      targets: this.tell,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.2,
      duration: windUpMs / 2,
      yoyo: true,
      repeat: -1,
    });
  }

  private endWindUp(): void {
    this.restoreTint();
    if (this.tell) {
      this.scene.tweens.killTweensOf(this.tell);
      this.tell.destroy();
      this.tell = undefined;
    }
  }

  /** Knocked senseless by a Cholent landing nearby (§5). */
  stun(now: number, durationMs: number): void {
    if (this.dying) return;
    this.stunnedUntil = Math.max(this.stunnedUntil, now + durationMs);
    this.endWindUp();
    this.phase = 'patrol';
    this.setTint(0x9aa4c8);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.active && !this.dying) this.restoreTint();
    });
  }

  get isStunned(): boolean {
    return this.scene.time.now < this.stunnedUntil;
  }

  /**
   * Hit by something that kills outright — a flame, or a Lulav swing. Unlike a
   * stomp this ignores the hit count: §5 says the Lulav "hits harder than
   * fire", and both hit harder than a boot.
   */
  knockAway(direction: -1 | 1, speed: number): void {
    if (this.dying) return;
    this.dying = true;
    this.endWindUp();

    const body = this.physicsBody;
    body.enable = false;
    this.scene.tweens.add({
      targets: this,
      x: this.x + direction * speed * 0.35,
      y: this.y - 24,
      angle: direction * 220,
      alpha: 0,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  /**
   * Take a stomp. Returns true if this finished it off — a goose (§6) takes
   * two, and the first "makes one angrier before it goes down".
   */
  stomp(): boolean {
    if (!this.config.stompable || this.dying) return false;

    this.hitsLeft -= 1;
    if (this.hitsLeft > 0) {
      this.setTint(0xffffff);
      this.scene.time.delayedCall(120, () => this.restoreTint());
      return false;
    }

    this.defeat();
    return true;
  }

  /** Squash flat, then vanish. */
  private defeat(): void {
    this.dying = true;
    this.endWindUp();
    const body = this.physicsBody;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.enable = false;

    // A drawn creature has a squashed pose of its own; squeezing that flat as
    // well would flatten something already flat. Undrawn ones get the scale.
    const squashed = this.art !== undefined && 'squash' in this.art.poses;
    if (squashed && this.art) playPose(this, this.art, 'squash');

    this.scene.tweens.add({
      targets: this,
      ...(squashed ? {} : { scaleY: 0.2 }),
      alpha: 0,
      duration: squashed ? GAMEPLAY.enemyDeathMs * 1.6 : GAMEPLAY.enemyDeathMs,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  override destroy(fromScene?: boolean): void {
    this.endWindUp();
    super.destroy(fromScene);
  }
}
