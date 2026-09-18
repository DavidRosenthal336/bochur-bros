import Phaser from 'phaser';
import { POWERS } from '../config/Tuning';
import { solidTextureKey } from '../util/textures';

/**
 * A Menorah flame (§5): "shoots flames that bounce and roll along the ground".
 *
 * It is thrown rather than aimed — gravity acts on it, and it hops along the
 * floor, which is what lets it find an enemy standing in a dip you cannot see
 * into. It dies on a wall, or when it has been alive long enough.
 */
export class Flame extends Phaser.Physics.Arcade.Sprite {
  private spent = false;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: -1 | 1) {
    const size = POWERS.menorah.size;
    super(scene, x, y, solidTextureKey(scene, size, size));

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setTint(POWERS.menorah.color);
    this.setDepth(8);

    const body = this.physicsBody;
    body.setSize(size, size);
    body.setOffset(0, 0);
    body.setAllowGravity(true);
    body.setGravityY(POWERS.menorah.gravity);
    body.setVelocity(direction * POWERS.menorah.speed, -60);
    body.setBounceY(POWERS.menorah.bounce);
    body.setCollideWorldBounds(false);

    scene.tweens.add({
      targets: this,
      scale: 0.7,
      duration: 160,
      yoyo: true,
      repeat: -1,
    });

    scene.time.delayedCall(POWERS.menorah.lifetimeMs, () => this.gutter());
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isSpent(): boolean {
    return this.spent;
  }

  /** Keep it hopping, and put it out when it hits a wall. */
  tick(): void {
    if (this.spent) return;
    const body = this.physicsBody;

    if (body.blocked.left || body.blocked.right) {
      this.gutter();
      return;
    }
    // Arcade's bounce loses height every time; without a floor on it the flame
    // flattens out into a slide after two hops.
    if (body.blocked.down && body.velocity.y > -POWERS.menorah.minBounce) {
      body.setVelocityY(-POWERS.menorah.minBounce);
    }
  }

  /** Go out, with a little puff. Safe to call twice. */
  gutter(): void {
    if (this.spent || !this.active) return;
    this.spent = true;
    this.physicsBody.enable = false;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: 1.9,
      alpha: 0,
      duration: 180,
      onComplete: () => this.destroy(),
    });
  }
}
