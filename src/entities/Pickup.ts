import Phaser from 'phaser';
import { ACTOR_SPRITES } from '../config/sprites';
import { GAMEPLAY, TILE } from '../config/Tuning';
import type { PowerTier } from '../systems/PowerState';
import { applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/** What a pickup gives you when you touch it. */
export type PickupKind = 'coin' | 'cholent' | 'menorah' | 'lulav' | 'peyos' | 'lchaim';

/**
 * A tzedakah coin. Sits still, waits to be walked into, floats up and fades
 * when it is.
 */
export class Coin extends Phaser.Physics.Arcade.Sprite {
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, solidTextureKey(scene, 8, 10));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(6);

    const body = this.physicsBody;
    body.setAllowGravity(false);
    body.setImmovable(true);
    applyActorArt(this, ACTOR_SPRITES.coin, 8, 10);
    playPose(this, ACTOR_SPRITES.coin, 'spin');

    // A slow bob, so coins read as collectable rather than as scenery.
    scene.tweens.add({
      targets: this,
      y: y - 2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /** Returns false if it was already taken this frame. */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.physicsBody.enable = false;

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.y - GAMEPLAY.coinPopHeight,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
    return true;
  }
}

/**
 * A power-up that has popped out of a box and is now loose in the level.
 *
 * It slides along the ground, turns at walls and falls off ledges — the
 * classic behaviour, which gives the player a moment to chase it down.
 */
export class PowerUpPickup extends Phaser.Physics.Arcade.Sprite {
  readonly grants: PowerTier;
  /** A L'chaim gives a life instead of a tier, and does not wander off. */
  readonly givesLife: boolean;
  private collected = false;
  private facing: -1 | 1 = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    grants: PowerTier,
    color: number,
    givesLife = false,
  ) {
    super(scene, x, y, solidTextureKey(scene, givesLife ? 10 : 14, 14));
    this.grants = grants;
    this.givesLife = givesLife;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(6);

    const body = this.physicsBody;
    body.setSize(givesLife ? 10 : 14, 14);
    body.setOffset(0, 0);

    // One drawing for all four power-ups, tinted to the form it grants: a
    // covered pot is a covered pot, and what is under the lid is the surprise.
    // A L'chaim is its own thing and keeps its own colours.
    const art = givesLife ? ACTOR_SPRITES.lchaim : ACTOR_SPRITES.powerUp;
    applyActorArt(this, art, givesLife ? 10 : 14, 14);
    playPose(this, art, 'idle');
    if (!givesLife) this.setTint(color);

    body.setAllowGravity(true);
    body.setGravityY(1400);
    body.setMaxVelocity(200, 400);

    // Rise out of the box it came from before it starts moving.
    body.setAllowGravity(false);
    scene.tweens.add({
      targets: this,
      y: y - TILE,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        body.setAllowGravity(true);
        // A L'chaim is rare enough that making you chase it would be cruel.
        if (!givesLife) body.setVelocityX(this.facing * GAMEPLAY.pickupSpeed);
      },
    });
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  tick(): void {
    const body = this.physicsBody;
    if (!body.allowGravity) return;
    if (body.blocked.left || body.blocked.right) {
      this.facing = this.facing === 1 ? -1 : 1;
    }
    body.setVelocityX(this.facing * GAMEPLAY.pickupSpeed);
  }

  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.physicsBody.enable = false;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 200,
      onComplete: () => this.destroy(),
    });
    return true;
  }
}
