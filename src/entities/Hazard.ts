import Phaser from 'phaser';
import type { HazardConfig } from '../config/hazards';
import { TILE } from '../config/Tuning';

/**
 * A region of the level that does something to whoever is standing in it.
 *
 * Unlike an enemy this has no body of its own — the scene asks it each frame
 * whether the player is inside, because a hazard is a *place*, not a thing you
 * collide with. It cannot be defeated (§11); it is survived, avoided, or in
 * Berel's case simply ignored.
 */
export class WindZone {
  readonly bounds: Phaser.Geom.Rectangle;
  /** Signed acceleration: negative blows left, positive blows right. */
  readonly force: number;

  private readonly streaks: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    tileW: number,
    tileH: number,
    direction: -1 | 1,
    config: HazardConfig,
  ) {
    const x = tileX * TILE;
    const y = tileY * TILE;
    const w = tileW * TILE;
    const h = tileH * TILE;

    this.bounds = new Phaser.Geom.Rectangle(x, y, w, h);
    this.force = config.force * direction;

    scene.add.rectangle(x + w / 2, y + h / 2, w, h, config.color, 0.1).setDepth(2);

    // Streaks blowing the way the wind blows, so the direction is readable
    // without a legend.
    for (let i = 0; i < Math.max(4, Math.round(tileH * 1.5)); i += 1) {
      const streakY = y + 6 + Math.random() * (h - 12);
      const streak = scene.add
        .rectangle(x + Math.random() * w, streakY, 10 + Math.random() * 14, 1, config.color, 0.55)
        .setDepth(2);
      this.streaks.push(streak);

      scene.tweens.add({
        targets: streak,
        x: direction > 0 ? x + w + 20 : x - 20,
        duration: 900 + Math.random() * 700,
        repeat: -1,
        delay: Math.random() * 900,
        onRepeat: () => {
          streak.x = direction > 0 ? x - 20 : x + w + 20;
        },
      });
    }
  }

  contains(body: Phaser.Physics.Arcade.Body): boolean {
    return Phaser.Geom.Rectangle.Overlaps(
      this.bounds,
      new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
    );
  }
}
