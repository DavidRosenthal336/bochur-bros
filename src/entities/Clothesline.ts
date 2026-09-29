import Phaser from 'phaser';
import { TILE } from '../config/Tuning';
import { actorArt } from '../util/art';

/**
 * A clothesline, which is a zipline with a bedsheet on it (§6, World 3).
 *
 * The one interesting decision in here is that a clothesline has **no physics
 * body at all.** It would be easy to give it a thin static one and let the
 * engine report the contact, and it would be wrong in both directions: a body
 * you can stand on is a platform, which kills the "duck under them" half of
 * §6's line, and a body you cannot stand on reports overlaps for a player
 * walking past underneath it. What a line actually needs to know is whether a
 * pair of feet came *down through* it, and that is a question about the two
 * rows the feet were on either side of this frame — not a question about
 * volumes touching.
 *
 * So the scene asks the geometry directly, and this class exists to hold that
 * geometry, answer where the line is at a given x, and be a drawn thing.
 */
export class Clothesline {
  /** The high end. */
  readonly x1: number;
  readonly y1: number;
  /** The low end. Always the downhill one, whichever way round it was built. */
  readonly x2: number;
  readonly y2: number;
  /** Which way you travel when riding it: +1 rightward, -1 leftward. */
  readonly direction: -1 | 1;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, drop: number) {
    const left = x * TILE;
    const right = (x + w) * TILE;
    const near = y * TILE;
    const far = (y + Math.abs(drop)) * TILE;

    // A negative drop means the line was authored from its low end, reaching
    // back to the left. Normalising here means everything downstream can say
    // "from x1 to x2" and mean "downhill".
    const ridesRight = drop >= 0;
    this.x1 = ridesRight ? left : right;
    this.y1 = ridesRight ? near : near;
    this.x2 = ridesRight ? right : left;
    this.y2 = ridesRight ? far : far;
    this.direction = ridesRight ? 1 : -1;

    this.draw(scene, Math.min(left, right), Math.max(left, right), drop);
  }

  /** How far left and right the line reaches, regardless of which way it runs. */
  get minX(): number {
    return Math.min(this.x1, this.x2);
  }

  get maxX(): number {
    return Math.max(this.x1, this.x2);
  }

  /** Is this a line you can ride, or only one to walk under? */
  get rideable(): boolean {
    return this.y2 !== this.y1;
  }

  /**
   * Where the rope is at a given x.
   *
   * Clamped to the span rather than extrapolated: a rope does not carry on
   * past its post, and the ride ends by comparing against this.
   */
  heightAt(x: number): number {
    const t = Phaser.Math.Clamp((x - this.x1) / (this.x2 - this.x1), 0, 1);
    return this.y1 + (this.y2 - this.y1) * t;
  }

  /** Has a rider who has got this far run out of rope? */
  isPastEnd(x: number): boolean {
    return this.direction === 1 ? x >= this.x2 : x <= this.x2;
  }

  /**
   * Two posts and a sagging rope.
   *
   * The rope is drawn as a chain of short segments rather than one rotated
   * sprite so that the drawn line lies exactly where `heightAt` says it does.
   * A player riding a rope that is drawn a few pixels off the rope they are
   * actually on looks like a bug in the physics, and it is the first thing
   * anybody notices.
   */
  private draw(scene: Phaser.Scene, left: number, right: number, drop: number): void {
    const post = actorArt('clotheslinePost');
    const line = actorArt('laundryLine');

    const rope = scene.add.graphics().setDepth(5);
    rope.lineStyle(1, 0xd8d2c4, 1);
    rope.beginPath();
    rope.moveTo(this.x1, this.y1);
    rope.lineTo(this.x2, this.y2);
    rope.strokePath();

    if (post) {
      // Hanging below each end, which is what a line is tied to — a porch
      // upright or a pole. Drawn under the rope so the rope reads as on top.
      for (const end of [
        { x: left, y: this.heightAt(left) },
        { x: right, y: this.heightAt(right) },
      ]) {
        scene.add.image(end.x, end.y + 20, post.key, 0).setOrigin(0.5, 1).setDepth(4);
      }
    }

    if (!line) return;

    // Washing, spaced along the rope. Skipping the ends keeps it clear of the
    // posts, and the alternating hang makes a row of them read as laundry
    // rather than as a dashed line.
    const span = Math.abs(this.x2 - this.x1);
    const pegs = Math.max(1, Math.floor(span / 26));
    for (let i = 1; i <= pegs; i += 1) {
      const t = i / (pegs + 1);
      const x = this.x1 + (this.x2 - this.x1) * t;
      scene.add
        .image(x, this.heightAt(x) + 5 + (i % 2), line.key, 0)
        .setDepth(4)
        .setFlipX(drop < 0);
    }
  }
}
