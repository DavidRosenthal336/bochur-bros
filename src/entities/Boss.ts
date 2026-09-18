import Phaser from 'phaser';
import { BOSSES } from '../config/bosses';
import type { BossConfig } from '../config/bosses';
import type { ActorSpriteSet } from '../config/sprites';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/** What the boss wants the level to do for it this frame. */
export type BossRequest = 'none' | 'summon' | 'shockwave';

/**
 * A boss.
 *
 * Bosses are a third category alongside enemies and hazards: they have real
 * health, named phases, and a script rather than a behaviour. The Pigeon King
 * "summons flocks of pigeons, dive-bombs in arcs, and retreats to high perches
 * between attacks" (§6), and that is three states with a rota.
 *
 * Phases exist so the fight gets harder as it goes, and so the final boss can
 * later cycle through the forms of every boss already beaten (§6, World 4).
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly config: BossConfig;

  private hitsLeft: number;
  private phase: 'perched' | 'telegraph' | 'diving' | 'returning' | 'dead' = 'perched';
  private phaseEndsAt = 0;
  private perchIndex = 0;
  private invulnerableUntil = 0;
  private tell: Phaser.GameObjects.Rectangle | undefined;
  private pendingRequest: BossRequest = 'none';
  /** Where it dives to, chosen when the dive starts. */
  private targetX = 0;
  private readonly art: ActorSpriteSet | undefined;
  /**
   * How long the wings-out drawing stays up after a summon.
   *
   * The request itself is read and cleared by the level on the very next
   * frame, so it cannot double as the thing that decides what is drawn — a
   * one-frame pose is a flicker, not a tell.
   */
  private summoningUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BossConfig = BOSSES.pigeonKing) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.hitsLeft = config.hits;

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
      playPose(this, this.art, 'idle');
    } else {
      this.setTint(config.color);
    }

    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isAlive(): boolean {
    return this.phase !== 'dead';
  }

  /** 1 at full health, 0 when beaten. Drives the bar. */
  get healthFraction(): number {
    return this.hitsLeft / this.config.hits;
  }

  /** Can it be hurt right now? Only while it is down among you. */
  get isVulnerable(): boolean {
    return this.phase === 'diving' && this.scene.time.now >= this.invulnerableUntil;
  }

  /** How fast it is going, which decides how dangerous the current phase is. */
  get isDangerous(): boolean {
    return this.phase === 'diving' || this.phase === 'returning';
  }

  /** The escalating phase number, 1-based. Later phases move faster. */
  private get intensity(): number {
    const lost = this.config.hits - this.hitsLeft;
    return 1 + Math.floor((lost / this.config.hits) * (this.config.phases - 1));
  }

  /** Read and clear whatever the boss asked the level to do. */
  takeRequest(): BossRequest {
    const request = this.pendingRequest;
    this.pendingRequest = 'none';
    return request;
  }

  tick(now: number, playerX: number, perches: readonly Phaser.Math.Vector2[]): void {
    if (this.phase === 'dead') return;
    if (this.tell) this.tell.setPosition(this.x, this.y - this.config.bodyHeight / 2);

    const speedUp = 1 + (this.intensity - 1) * 0.35;

    switch (this.phase) {
      // Note: no early `return` anywhere in here. Bailing out of tick skips
      // the pose update at the bottom, which is how the wings-out summon
      // drawing went unseen for a whole milestone — the boss was summoning
      // pigeons and never once flapping.
      case 'perched': {
        this.physicsBody.setVelocity(0, 0);
        if (now >= this.phaseEndsAt) {
          // Every other turn it calls the flock down instead of coming itself.
          if (this.perchIndex % 2 === 1) {
            this.pendingRequest = 'summon';
            this.summoningUntil = now + 600;
            this.phaseEndsAt = now + this.config.perchMs / speedUp;
            this.perchIndex += 1;
          } else {
            this.phase = 'telegraph';
            this.phaseEndsAt = now + this.config.telegraphMs / speedUp;
            this.targetX = playerX;
            this.showTell(this.config.telegraphMs / speedUp);
          }
        }
        break;
      }

      case 'telegraph':
        this.physicsBody.setVelocity(0, 0);
        if (now >= this.phaseEndsAt) {
          this.clearTell();
          this.phase = 'diving';
          this.invulnerableUntil = now + 120;
        }
        break;

      case 'diving': {
        const dx = this.targetX - this.x;
        this.physicsBody.setVelocity(
          Phaser.Math.Clamp(dx * 3, -this.config.diveSpeed, this.config.diveSpeed) * speedUp,
          this.config.diveSpeed * 0.55 * speedUp,
        );
        if (this.y >= this.config.floorY) {
          this.phase = 'returning';
          this.pendingRequest = 'shockwave';
        }
        break;
      }

      case 'returning': {
        const perch = perches[this.perchIndex % perches.length] ?? perches[0];
        if (!perch) break;
        const toX = perch.x - this.x;
        const toY = perch.y - this.y;
        this.physicsBody.setVelocity(
          Phaser.Math.Clamp(toX * 2, -this.config.returnSpeed, this.config.returnSpeed),
          Phaser.Math.Clamp(toY * 2, -this.config.returnSpeed, this.config.returnSpeed),
        );
        if (Math.abs(toX) < 6 && Math.abs(toY) < 6) {
          this.setPosition(perch.x, perch.y);
          this.physicsBody.setVelocity(0, 0);
          this.perchIndex += 1;
          this.phase = 'perched';
          this.phaseEndsAt = now + this.config.perchMs / speedUp;
        }
        break;
      }

      default:
        break;
    }

    this.updatePose();
  }

  /**
   * One drawing per phase: perched, wings out to call the flock, folded for a
   * dive. It reads as an attack pattern from across the room, which is the
   * only way a three-phase fight is fair.
   */
  private updatePose(): void {
    const art = this.art;
    if (!art) return;

    if (this.scene.time.now < this.invulnerableUntil && this.phase !== 'diving') {
      playPose(this, art, 'hurt');
    } else if (this.phase === 'diving' || this.phase === 'telegraph') {
      playPose(this, art, 'dive');
    } else if (this.scene.time.now < this.summoningUntil) {
      playPose(this, art, 'wings');
    } else {
      playPose(this, art, 'idle');
    }

    const vx = this.physicsBody.velocity.x;
    if (Math.abs(vx) > 2) this.setFlipX(vx < 0);
  }

  /** Stomped. Returns true if that was the last one. */
  takeHit(now: number): boolean {
    if (!this.isVulnerable) return false;

    this.hitsLeft -= 1;
    this.invulnerableUntil = now + 600;
    this.scene.cameras.main.shake(220, 0.01);

    if (this.hitsLeft > 0) {
      this.setTint(0xffffff);
      this.scene.time.delayedCall(140, () => {
        if (!this.isAlive) return;
        if (this.art) this.clearTint();
        else this.setTint(this.config.color);
      });
      // Knocked back up to a perch, and straight into the next round.
      this.phase = 'returning';
      return false;
    }

    this.defeat();
    return true;
  }

  private showTell(durationMs: number): void {
    this.clearTell();
    this.tell = this.scene.add
      .rectangle(this.x, this.y - this.config.bodyHeight / 2, this.config.bodyWidth + 10, this.config.bodyHeight + 10)
      .setStrokeStyle(2, 0xffe9a8)
      .setDepth(10);
    this.scene.tweens.add({
      targets: this.tell,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.25,
      duration: durationMs / 2,
      yoyo: true,
      repeat: -1,
    });
  }

  private clearTell(): void {
    if (!this.tell) return;
    this.scene.tweens.killTweensOf(this.tell);
    this.tell.destroy();
    this.tell = undefined;
  }

  private defeat(): void {
    this.phase = 'dead';
    this.clearTell();
    this.physicsBody.setVelocity(0, 0);
    this.physicsBody.enable = false;
    this.scene.cameras.main.shake(500, 0.014);

    this.scene.tweens.add({
      targets: this,
      angle: 200,
      y: this.y + 40,
      alpha: 0,
      duration: 1100,
      ease: 'Quad.easeIn',
    });
  }

  override destroy(fromScene?: boolean): void {
    this.clearTell();
    super.destroy(fromScene);
  }
}
