import Phaser from 'phaser';
import { TILE } from '../config/Tuning';
import { actorArt } from '../util/art';

/**
 * A laundry line strung across a Meah Shearim alley (§6): "strung across
 * alleys, above and below the player".
 *
 * Different from the Catskills clothesline, which is a zipline you ride: this is
 * a line you *run along*, sheets and all, and "above and below" is exactly how it
 * behaves. From below it is nothing — you jump up through it — and from above it
 * is a floor. So a stack of them across one gap is a ladder you climb by jumping,
 * and a single one across a gap is a bridge you have to land on from above.
 *
 * The body is a thin strip at the rope. The scene only lets it collide with feet
 * coming down onto it, the same rule the awnings use, so walking into one at head
 * height never stops you.
 */
export class LaundryLine {
  readonly body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.StaticGroup, tileX: number, tileY: number, tiles: number) {
    const x = tileX * TILE;
    const y = tileY * TILE;
    const w = tiles * TILE;

    // The collision strip: four pixels at the rope, invisible.
    this.body = scene.add.rectangle(x + w / 2, y + 2, w, 4, 0xffffff, 0).setDepth(3);
    group.add(this.body);

    const rope = scene.add.graphics().setDepth(3);
    rope.lineStyle(1, 0xe2d8c0, 1);
    rope.beginPath();
    rope.moveTo(x, y);
    rope.lineTo(x + w, y);
    rope.strokePath();

    // Posts at the ends, so it is visibly tied to something.
    scene.add.rectangle(x, y + 3, 2, 8, 0x8a7a5a).setDepth(3);
    scene.add.rectangle(x + w, y + 3, 2, 8, 0x8a7a5a).setDepth(3);

    // Washing, every couple of tiles, hanging below the rope.
    const sheet = actorArt('laundryLine');
    if (!sheet) return;
    for (let i = 1; i < tiles; i += 2) {
      scene.add.image(x + i * TILE, y + 5, sheet.key, 0).setDepth(3);
    }
  }
}
