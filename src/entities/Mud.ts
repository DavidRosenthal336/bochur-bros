import Phaser from 'phaser';
import { TILE } from '../config/Tuning';

/**
 * A patch of mud (§6, World 3): "slows movement to a crawl."
 *
 * The same shape of thing as a wind zone — a place rather than an object, with
 * no body, asked once a frame whether the player is in it. What makes it worth
 * its own small class rather than a rectangle in the scene is the drawing: mud
 * has to be obviously mud from a distance, because a patch of ground that takes
 * sixty per cent of your speed away without looking different from the ground
 * beside it is indistinguishable from a bug.
 */
export class Mud {
  readonly bounds: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, tileW: number, tileH: number) {
    const x = tileX * TILE;
    const y = tileY * TILE;
    const w = tileW * TILE;
    const h = tileH * TILE;
    this.bounds = new Phaser.Geom.Rectangle(x, y, w, h);

    // Drawn over the terrain rather than instead of it: the lake shore is still
    // the lake shore, it is just churned up. Depth 2 puts it above the ground
    // tiles and below anything standing on them.
    if (scene.textures.exists('tile-mud')) {
      scene.add.tileSprite(x, y, w, h, 'tile-mud').setOrigin(0, 0).setDepth(2);
    } else {
      scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x4a3b2a).setDepth(2);
    }

    /**
     * Bubbles, slowly.
     *
     * Three of them, on their own timers, because the one thing that separates
     * mud from a brown floor at a glance is that mud is doing something.
     */
    for (let i = 0; i < Math.max(2, Math.round(tileW / 3)); i += 1) {
      const blob = scene.add
        .circle(x + 6 + Math.random() * Math.max(1, w - 12), y + 4, 1.5, 0x6b5636, 0.8)
        .setDepth(2);
      scene.tweens.add({
        targets: blob,
        scale: { from: 0.4, to: 1.5 },
        alpha: { from: 0.8, to: 0 },
        duration: 900 + Math.random() * 900,
        repeat: -1,
        delay: Math.random() * 1200,
      });
    }
  }

  contains(body: Phaser.Physics.Arcade.Body): boolean {
    /**
     * The ground under the feet decides, not the body.
     *
     * Two pixels *below* the feet, and getting that sign wrong is why the first
     * version did nothing at all. A patch of mud is authored on the row the
     * ground's surface occupies — that is where it has to be drawn, because it
     * is the mud you can see — and a body standing on that row has its feet
     * exactly on the row's top edge, with every pixel of itself above the
     * rectangle. Asking whether the body is inside the mud is asking whether it
     * is buried in it, and the answer is always no.
     *
     * Measured, that bug read as mud slowing a run and not a walk, which is not
     * a thing mud can do: the "slow" run was a player sprinting off the end of
     * the shore into the lake.
     */
    return this.bounds.contains(body.center.x, body.bottom + 2);
  }
}
