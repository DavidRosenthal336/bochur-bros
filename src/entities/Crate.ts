import Phaser from 'phaser';
import { GAMEPLAY, TILE } from '../config/Tuning';
import { solidTextureKey } from '../util/textures';

/**
 * A shuk crate. Berel shoves it along; Mendy cannot budge it (§4).
 *
 * The crate is never `pushable` in Arcade's sense. Arcade resolves a push by
 * sharing momentum between the two bodies, which falls apart for a slow
 * pusher — a crouching Berel leaning on a crate moved it six pixels in four
 * seconds. Instead the crate stays immovable to the physics step and the scene
 * drives it directly, at the speed of whoever is leaning on it. That makes the
 * push deterministic and gives it an honest tuning knob.
 */
export class Crate extends Phaser.Physics.Arcade.Sprite {
  /** Whether the character on screen right now is strong enough to move it. */
  private shovable = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, solidTextureKey(scene, TILE, TILE));

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setTint(0xa9743f);
    this.setDepth(5);

    const body = this.physicsBody;
    body.setSize(TILE, TILE);
    body.setOffset(0, 0);
    body.setAllowGravity(true);
    body.setGravityY(1600);
    body.setMaxVelocity(GAMEPLAY.cratePushSpeed, 600);
    body.setDragX(500);
    body.setCollideWorldBounds(true);
    body.pushable = false;
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Called when the active character changes. Named `setShovable` rather than
   * `setPushable` because Phaser's Sprite already has a `setPushable`.
   *
   * The lighter tint is the tell that this brother can move it.
   */
  setShovable(shovable: boolean): void {
    this.shovable = shovable;
    this.setTint(shovable ? 0xc98b4a : 0xa9743f);
  }

  get canBeShoved(): boolean {
    return this.shovable;
  }

  /** Leaned on from `direction` at `speed`. Ignored if this brother is too weak. */
  shove(direction: -1 | 1, speed: number): void {
    if (!this.shovable) return;
    this.physicsBody.setVelocityX(direction * Math.min(speed, GAMEPLAY.cratePushSpeed));
  }
}
