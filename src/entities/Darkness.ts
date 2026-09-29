import Phaser from 'phaser';
import { TILE, VIEW_HEIGHT, VIEW_WIDTH } from '../config/Tuning';

/** The colour of the night, and how much of it there is. Not quite black. */
const NIGHT = 0x04060c;
const NIGHT_ALPHA = 0.95;
/** A firefly's own little pool of light, px, and how strongly it lights. */
const FIREFLY_LIGHT = 20;
const FIREFLY_STRENGTH = 0.6;
/** How often a pair of eyes opens somewhere in the dark, ms, give or take. */
const EYES_EVERY_MS = 1900;
/** Above the night, below the HUD at 1000. */
const DARK_DEPTH = 900;
const GLOW_DEPTH = 910;

/**
 * The night in 3-3, Lights Out (§6): "Visibility reduced to a circle of light
 * around the player. Fireflies mark safe paths. Eyes blink in the dark just
 * outside the light radius."
 *
 * ## How the dark is made
 *
 * One screen-sized render texture, pinned to the camera, filled with night every
 * frame and then *erased* — a soft round hole where the player is, and a smaller,
 * fainter one under each firefly on screen. Erasing with a radial gradient
 * rather than a hard circle is what makes it read as a lantern rather than as a
 * porthole: the light falls off, so the edge of what you can see is a question
 * rather than a wall.
 *
 * It is drawn in screen space and not world space because the night does not
 * move with the level. A world-sized texture for a 230-tile level would be
 * enormous and would have to be redrawn anyway.
 *
 * ## What the fireflies are for
 *
 * §6 gives them one job, "mark safe paths", and the job is not decoration. In a
 * level where the light reaches about three and a half tiles and a walking jump
 * carries four, **you cannot see where your jump lands.** The fireflies are
 * where it lands. Each one shines above the night and lights a little of the
 * ground beneath it, so a line of them is a line of places that are there.
 *
 * ## The eyes
 *
 * Pure atmosphere, and deliberately harmless. A pair opens just outside the
 * light, blinks, and closes. They are never an enemy and never in the way,
 * because a thing that looks like a threat in the dark and is one would make the
 * darkness unfair, and a thing that looks like one and is not makes it
 * frightening, which is what §6 is asking for.
 */
export class Darkness {
  private readonly scene: Phaser.Scene;
  private readonly radius: number;
  private readonly night: Phaser.GameObjects.RenderTexture;
  private readonly lanternKey: string;
  private readonly fireflyKey: string;
  private readonly fireflies: Phaser.GameObjects.Arc[] = [];
  private nextEyesAt = 0;

  constructor(scene: Phaser.Scene, radius: number, fireflyTiles: readonly { x: number; y: number }[]) {
    this.scene = scene;
    this.radius = radius;

    this.lanternKey = Darkness.glowTexture(scene, radius, 1);
    this.fireflyKey = Darkness.glowTexture(scene, FIREFLY_LIGHT, FIREFLY_STRENGTH);

    this.night = scene.add
      .renderTexture(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DARK_DEPTH);

    for (const tile of fireflyTiles) this.fireflies.push(this.makeFirefly(tile.x, tile.y));
  }

  /**
   * A soft round light, as a texture: opaque in the middle, nothing at the edge.
   *
   * Cached by size and strength, because the scene restarts on every death and
   * a canvas texture is a thing to make once.
   */
  private static glowTexture(scene: Phaser.Scene, radius: number, strength: number): string {
    const key = `light-${radius}-${Math.round(strength * 100)}`;
    if (scene.textures.exists(key)) return key;

    const size = radius * 2;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return key;
    const ctx = canvas.getContext();
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    // Flat through most of the middle, then a quick fall: a lantern lights the
    // space near it evenly and gives up at the edge, and a straight linear ramp
    // makes everything a little dim and nothing clear.
    gradient.addColorStop(0, `rgba(255,255,255,${strength})`);
    gradient.addColorStop(0.55, `rgba(255,255,255,${strength})`);
    gradient.addColorStop(0.8, `rgba(255,255,255,${strength * 0.45})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
    return key;
  }

  /** A firefly: a warm dot above the night, drifting and pulsing on its own clock. */
  private makeFirefly(tileX: number, tileY: number): Phaser.GameObjects.Arc {
    const x = tileX * TILE + TILE / 2;
    const y = tileY * TILE + TILE / 2;
    const fly = this.scene.add.circle(x, y, 1.5, 0xf6f08a).setDepth(GLOW_DEPTH);
    const halo = this.scene.add.circle(x, y, 4, 0xf6f08a, 0.25).setDepth(GLOW_DEPTH);

    // Each on its own phase, so a row of them twinkles instead of pulsing in step
    // like a string of fairy lights on a timer.
    const delay = Math.random() * 1400;
    this.scene.tweens.add({
      targets: [fly, halo],
      y: y - 3,
      x: x + (Math.random() < 0.5 ? -2 : 2),
      duration: 1300 + Math.random() * 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay,
    });
    this.scene.tweens.add({
      targets: halo,
      alpha: { from: 0.1, to: 0.4 },
      scale: { from: 0.8, to: 1.3 },
      duration: 700 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      delay,
    });
    return fly;
  }

  /**
   * Draw the night for this frame, with holes in it.
   *
   * `lightX`, `lightY` are the lantern's world position — the middle of the
   * player's body rather than the feet, so a player standing on a ledge can see
   * the ledge.
   */
  update(now: number, lightX: number, lightY: number): void {
    const camera = this.scene.cameras.main;
    const sx = camera.scrollX;
    const sy = camera.scrollY;

    this.night.clear();
    this.night.fill(NIGHT, NIGHT_ALPHA);

    for (const fly of this.fireflies) {
      const fx = fly.x - sx;
      const fy = fly.y - sy;
      // Only the ones on screen, give or take their own glow.
      if (fx < -FIREFLY_LIGHT || fx > VIEW_WIDTH + FIREFLY_LIGHT) continue;
      if (fy < -FIREFLY_LIGHT || fy > VIEW_HEIGHT + FIREFLY_LIGHT) continue;
      this.night.erase(this.fireflyKey, fx - FIREFLY_LIGHT, fy - FIREFLY_LIGHT);
    }

    this.night.erase(this.lanternKey, lightX - sx - this.radius, lightY - sy - this.radius);

    if (now >= this.nextEyesAt) {
      this.nextEyesAt = now + EYES_EVERY_MS * (0.6 + Math.random() * 0.8);
      this.openEyes(lightX, lightY);
    }
  }

  /**
   * A pair of eyes, just outside the light (§6).
   *
   * Placed on a ring a little beyond the lantern's reach, on either side or above
   * but never below — eyes looking up at you out of the ground read as a bug in
   * the drawing, not as something in the woods.
   */
  private openEyes(cx: number, cy: number): void {
    const angle = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05);
    const distance = this.radius + Phaser.Math.Between(10, 42);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance * 0.8;

    const pair = [-2.5, 2.5].map((dx) =>
      this.scene.add.ellipse(x + dx, y, 2, 2, 0xe8e27a).setDepth(GLOW_DEPTH).setAlpha(0),
    );

    // Open, blink once or twice, close. Blinks are a squash to a line and back,
    // which is what an eye does and what a pair of floating dots does not.
    this.scene.tweens.chain({
      targets: pair,
      tweens: [
        { alpha: 0.9, duration: 260 },
        { scaleY: 0.15, duration: 80, yoyo: true, delay: 500 + Math.random() * 400 },
        { scaleY: 0.15, duration: 80, yoyo: true, delay: 300 + Math.random() * 600 },
        { alpha: 0, duration: 320, delay: 200 },
      ],
      onComplete: () => pair.forEach((eye) => eye.destroy()),
    });
  }
}
