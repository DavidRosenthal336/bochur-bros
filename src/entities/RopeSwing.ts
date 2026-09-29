import Phaser from 'phaser';
import { SWING, TILE } from '../config/Tuning';
import { actorArt } from '../util/art';

/**
 * A rope swing over the lake (§6, World 3): "a rope swing to cross".
 *
 * ## Why this is a pendulum and not a tween
 *
 * Everything interesting about a rope swing is the choice of when to let go. Let
 * go at the bottom of the arc and you go fast and flat; let go near the top and
 * you go slow and high; let go on the way back and you go backwards. A tween
 * from A to B can be made to *look* like all of that and can answer none of it,
 * because the only state it has is a number between nought and one.
 *
 * So the rope keeps an angle and an angular rate and integrates them, which is
 * four lines of arithmetic and gives every one of those outcomes for free —
 * including the one nobody designs and everybody tries, which is pumping it to
 * get higher than the rope was ever hung to reach.
 *
 * ## The rope has no body
 *
 * Same decision as the clothesline, for the same reason: a body that can be
 * stood on is a platform and a body that cannot reports overlaps for anyone
 * walking past underneath. What a rope needs to know is whether a hand came
 * within reach of its lower half, which is a distance to a line segment, and
 * the scene asks it that directly.
 */
export class RopeSwing {
  /** Where it is tied. The pivot, in pixels. */
  readonly anchorX: number;
  readonly anchorY: number;
  /** How long it is, in pixels. */
  readonly length: number;

  /** Radians from straight down. Positive is to the right. */
  private angle: number;
  private rate = 0;
  /** Where it hangs when nobody is on it, so it can be left as it was found. */
  private readonly restAngle: number;

  private readonly rope: Phaser.GameObjects.Graphics;
  private readonly knot: Phaser.GameObjects.Image | undefined;
  private readonly post: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, tiles: number, lean = 0) {
    this.anchorX = tileX * TILE + TILE / 2;
    this.anchorY = tileY * TILE;
    this.length = tiles * TILE;
    this.restAngle = lean;
    this.angle = lean;

    // The branch it is tied to. Drawn, not solid: a rope swing hangs from
    // something, and something you could stand on up there would be a shortcut
    // past the swing rather than the reason for it.
    this.post = scene.add
      .rectangle(this.anchorX, this.anchorY - 2, TILE * 2, 4, 0x4a3a28)
      .setDepth(3);

    this.rope = scene.add.graphics().setDepth(4);
    const art = actorArt('ropeSwing');
    this.knot = art ? scene.add.image(0, 0, art.key, 0).setOrigin(0.5, 0).setDepth(4) : undefined;
    this.draw();
  }

  /** Where the end of the rope is now. */
  get handX(): number {
    return this.anchorX + Math.sin(this.angle) * this.length;
  }

  get handY(): number {
    return this.anchorY + Math.cos(this.angle) * this.length;
  }

  /**
   * Is a hand within reach of the rope?
   *
   * The distance from the hand to the rope as a **line segment**, over its lower
   * stretch — not to the knot as a point. The first version tested two circles
   * around the end of the rope and was never once caught in six attempts,
   * because it asked the wrong question: a player arrives on a jump, and a jump
   * crosses the rope's line at whatever height it happens to be at when it gets
   * there. Measured, the hand was passing 48px above the knot and sailing
   * straight through the rope.
   *
   * A rope is a long thing. Catching it anywhere along its lower half is what a
   * person does, and it is also what makes the swing findable rather than a
   * pixel-perfect trick. Grabbing high does not shorten the pendulum: you slide
   * down to the knot, which is the one simplification here and the one nobody
   * will notice.
   */
  canBeGrabbedBy(x: number, y: number): boolean {
    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);
    // From part-way down the rope to its end. The top belongs to the tree.
    const fromT = this.length * SWING.grabFrom;
    const ax = this.anchorX + sin * fromT;
    const ay = this.anchorY + cos * fromT;
    const bx = this.handX;
    const by = this.handY;

    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    const t = lenSq === 0 ? 0 : Phaser.Math.Clamp(((x - ax) * abx + (y - ay) * aby) / lenSq, 0, 1);
    const px = ax + abx * t;
    const py = ay + aby * t;
    const dx = x - px;
    const dy = y - py;
    return dx * dx + dy * dy <= SWING.grabRadius * SWING.grabRadius;
  }

  /**
   * Somebody has taken hold of it, arriving with this velocity.
   *
   * The arriving speed becomes angular rate through the tangent, which is what
   * makes a running jump onto a rope carry through into the swing — grabbing a
   * rope should never throw away the run that got you there.
   */
  grab(velocityX: number, velocityY: number): void {
    const tangentX = Math.cos(this.angle);
    const tangentY = -Math.sin(this.angle);
    const along = velocityX * tangentX + velocityY * tangentY;
    this.rate = along / this.length;
  }

  /** Advance the pendulum. `pump` is -1, 0 or 1: which way the rider is leaning. */
  tick(dt: number, pump: number): void {
    this.rate += (-SWING.gravity / this.length) * Math.sin(this.angle) * dt;
    if (pump !== 0) this.rate += pump * SWING.pump * dt;
    this.rate *= Math.pow(SWING.damping, dt);
    this.rate = Phaser.Math.Clamp(this.rate, -SWING.maxRate, SWING.maxRate);
    this.angle += this.rate * dt;
    this.draw();
  }

  /** What letting go right now is worth, in px/s. */
  releaseVelocity(): { x: number; y: number } {
    const speed = this.rate * this.length * SWING.releaseFactor;
    return {
      x: speed * Math.cos(this.angle),
      y: -speed * Math.sin(this.angle) + SWING.releaseLift,
    };
  }

  /**
   * Let the rope settle back towards where it hangs.
   *
   * Without this a rope stays wherever it was abandoned, which over a level
   * means every swing ends up stuck out at an angle like a broken signpost.
   */
  settle(dt: number): void {
    if (Math.abs(this.angle - this.restAngle) < 0.004 && Math.abs(this.rate) < 0.01) return;
    this.tick(dt, 0);
  }

  private draw(): void {
    const x = this.handX;
    const y = this.handY;
    this.rope.clear();
    this.rope.lineStyle(2, 0xb99a6b, 1);
    this.rope.beginPath();
    this.rope.moveTo(this.anchorX, this.anchorY);
    this.rope.lineTo(x, y);
    this.rope.strokePath();
    // The knot hangs from the end, turned along the rope, so the drawing agrees
    // with the maths about where the thing you are holding actually is.
    this.knot?.setPosition(x, y - 4).setRotation(-this.angle);
    this.post.setVisible(true);
  }
}
