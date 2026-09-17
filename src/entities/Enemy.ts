import Phaser from 'phaser';
import type { EnemyConfig } from '../config/enemies';
import { GAMEPLAY } from '../config/Tuning';
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
  private phase: 'patrol' | 'winding' | 'diving' | 'recovering' = 'patrol';
  private nextDiveAllowedAt = 0;
  /** When the current wind-up finishes and the swoop actually starts. */
  private diveStartsAt = 0;
  private tell: Phaser.GameObjects.Rectangle | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.hitsLeft = config.hits;
    this.homeX = x;
    this.homeY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setTint(config.color);
    this.setDepth(9);

    const body = this.physicsBody;
    body.setSize(config.bodyWidth, config.bodyHeight);
    body.setOffset(0, 0);
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

    switch (this.config.behavior) {
      case 'patrol':
        this.tickPatrol();
        break;
      case 'dive':
        this.tickDive(now, playerX, playerY);
        break;
    }
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
    this.setTint(this.config.color);
    if (this.tell) {
      this.scene.tweens.killTweensOf(this.tell);
      this.tell.destroy();
      this.tell = undefined;
    }
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
      this.scene.time.delayedCall(120, () => this.setTint(this.config.color));
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

    this.scene.tweens.add({
      targets: this,
      scaleY: 0.2,
      alpha: 0,
      duration: GAMEPLAY.enemyDeathMs,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  override destroy(fromScene?: boolean): void {
    this.endWindUp();
    super.destroy(fromScene);
  }
}
