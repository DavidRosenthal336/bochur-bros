import Phaser from 'phaser';
import { actorArt } from '../util/art';
import { solidTextureKey } from '../util/textures';

/** Body of a tank, px: the drawing's hitbox. */
export const TANK_WIDTH = 20;
export const TANK_HEIGHT = 12;
/**
 * How hard the curve throws you off, at the very edge, px/s^2.
 *
 * Chosen against the brothers' footing. Friction holds at 177 (Mendy) and 190
 * (Berel), so a player who lets go anywhere but the top few pixels of a tank
 * slides off it; a player who holds a direction against it screeches at 361 and
 * wins. So a tank never takes a player who is going somewhere, and always takes
 * one who stops — which is §6's "round, awkward", and not a coin toss. At 520
 * it was the second: landing a few pixels short of the top carried you back
 * into the gap you had just cleared, whatever you pressed.
 */
export const TANK_SLIDE = 360;

/**
 * A solar water tank on a Jerusalem roof (§6): "round, awkward platforms".
 *
 * A drum lying on its side, which is a platform with exactly one place to stand:
 * the top of the curve. Anywhere else the curve takes you off, harder the further
 * out you are. So a row of them is not a walkway but a sequence of hops — land
 * near the middle, go again — and a player who stops to think on one slides off
 * the side and finds out what was underneath.
 *
 * The slide is applied by the scene, which knows who is standing where; this is
 * the drum, its body and its drawing.
 */
export class SolarTank extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const art = actorArt('solarTank');
    super(scene, x, y, art ? art.key : solidTextureKey(scene, TANK_WIDTH, TANK_HEIGHT), 0);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setDepth(3);
    if (!art) this.setTint(0xb8c4c8);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TANK_WIDTH, TANK_HEIGHT);
    // Bottom-centred, like the drawing.
    body.position.set(x - TANK_WIDTH / 2, y - TANK_HEIGHT);
    body.updateCenter();
  }

  get staticBody(): Phaser.Physics.Arcade.StaticBody {
    return this.body as Phaser.Physics.Arcade.StaticBody;
  }

  /**
   * The push off the curve for something standing at `x`, px/s^2.
   *
   * Proportional to how far from the top of the drum it is, which is what a
   * curve does: dead centre is still, and the edge is a slope you cannot stand on.
   */
  slideAt(x: number): number {
    const half = TANK_WIDTH / 2;
    const off = Phaser.Math.Clamp((x - this.x) / half, -1, 1);
    return off * TANK_SLIDE;
  }
}
