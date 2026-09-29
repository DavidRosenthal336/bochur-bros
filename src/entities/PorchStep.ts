import Phaser from 'phaser';
import { TILE } from '../config/Tuning';
import { actorArt } from '../util/art';
import { solidTextureKey } from '../util/textures';

/** How long it holds after it has been stood on, ms. §6: "a beat". */
const FUSE_MS = 420;
/** How long it is gone before it is back, ms. */
const REBUILD_MS = 2600;

/**
 * A rotting porch step (§6): "crumble a beat after the player lands."
 *
 * The beat is the entire design. A tile that disappears the instant you touch
 * it is a hole that lies about being a floor, and there is no skill in it — by
 * the time the information arrives you are already falling. Four hundred and
 * twenty milliseconds is long enough to take one step and short enough that
 * you cannot stand and think, which turns a row of them into a sentence: keep
 * moving, and do not plan to come back this way in a hurry.
 *
 * It rebuilds, because §6's steps are a route rather than a resource. A colony
 * with a permanently missing step would be a level you can walk into and lock
 * yourself out of, and the build-time trap validator would be right to fail
 * it.
 */
export class PorchStep extends Phaser.Physics.Arcade.Image {
  // `state` is taken: Phaser's GameObject has one of its own.
  private phase: 'whole' | 'creaking' | 'gone' = 'whole';
  private breaksAt = 0;
  private returnsAt = 0;
  private readonly drawn: boolean;
  private readonly homeY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const art = actorArt('porchStep');
    super(scene, x, y, art ? art.key : solidTextureKey(scene, TILE, TILE), 0);

    this.drawn = art !== undefined;
    this.homeY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 0.5);
    this.setDepth(3);
    if (!this.drawn) this.setTint(0x8a6f52);
  }

  get staticBody(): Phaser.Physics.Arcade.StaticBody {
    return this.body as Phaser.Physics.Arcade.StaticBody;
  }

  /**
   * Somebody has landed on it.
   *
   * Only ever arms the fuse; it never re-arms one that is already burning, so
   * standing still on a step does not buy you a second beat.
   */
  standOn(now: number): void {
    if (this.phase !== 'whole') return;
    this.phase = 'creaking';
    this.breaksAt = now + FUSE_MS;

    if (this.drawn) this.setFrame(1);
    else this.setTint(0xb08a63);

    // A shudder, because the frame change alone is two pixels of difference at
    // this scale and the warning has to survive being looked at sideways.
    this.scene.tweens.add({
      targets: this,
      y: this.homeY + 1,
      duration: 70,
      yoyo: true,
      repeat: Math.ceil(FUSE_MS / 140),
    });
  }

  tick(now: number): void {
    if (this.phase === 'creaking' && now >= this.breaksAt) {
      this.phase = 'gone';
      this.returnsAt = now + REBUILD_MS;
      this.staticBody.enable = false;

      this.scene.tweens.killTweensOf(this);
      this.setPosition(this.x, this.homeY);
      this.scene.tweens.add({
        targets: this,
        y: this.homeY + TILE,
        alpha: 0,
        angle: 12,
        duration: 320,
        ease: 'Quad.easeIn',
      });
      return;
    }

    if (this.phase === 'gone' && now >= this.returnsAt) {
      this.phase = 'whole';
      this.scene.tweens.killTweensOf(this);
      this.setPosition(this.x, this.homeY);
      this.setAngle(0);
      this.setAlpha(1);
      if (this.drawn) this.setFrame(0);
      else this.setTint(0x8a6f52);
      // Re-enabling is not enough on its own: a static body remembers where it
      // was told it is, and this one has been tweened a tile downward since.
      this.staticBody.enable = true;
      this.staticBody.updateFromGameObject();
    }
  }
}
