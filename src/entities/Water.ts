import Phaser from 'phaser';
import { TILE } from '../config/Tuning';
import type { CurrentDef, WaterDef } from '../levels/LevelDef';

/** How hard a current pushes sideways by default, px/s^2. */
const CURRENT_FORCE = 340;

/**
 * How hard a return jet pushes upward by default, px/s^2.
 *
 * Twice the sideways figure, and it has to be: a jet is fighting `SWIM.gravity`
 * before it moves anything at all, so a jet set to the sideways force does
 * precisely nothing — measured, a 380 jet lifted a body off the bottom of the
 * pool by half a pixel and put it back. What reaches the player is the
 * difference, and then only up to the drift clamp.
 */
const JET_FORCE = 760;

const WATER = 0x2f7fb5;
const FOAM = 0xbfe6f5;

/**
 * A body of water (§6, 2-3).
 *
 * Terrain rather than a hazard: it has no body, hurts nobody, and the scene
 * asks it each frame whether the player is inside — the same arrangement the
 * wind zones use, for the same reason. What it knows that a wind zone does not
 * is where its *surface* is, because every rule about swimming is stated
 * against that one line.
 *
 * It is drawn twice, once behind the player and once in front. The front pane
 * is nearly transparent and does nothing but tint whatever is under the water,
 * which is how you can see at a glance whether you are in it.
 */
export class Water {
  readonly bounds: Phaser.Geom.Rectangle;
  /** The surface, in pixels. */
  readonly top: number;

  constructor(scene: Phaser.Scene, def: WaterDef) {
    const x = def.x * TILE;
    const y = def.y * TILE;
    const w = def.w * TILE;
    const h = def.h * TILE;

    this.bounds = new Phaser.Geom.Rectangle(x, y, w, h);
    this.top = y;

    const body = scene.textures.exists('tile-poolWater')
      ? scene.add.tileSprite(x, y, w, h, 'tile-poolWater').setOrigin(0, 0)
      : scene.add.rectangle(x + w / 2, y + h / 2, w, h, WATER, 0.75);
    // Behind the solids, not in front of them. The floor of a pool and the
    // shelves in it are terrain drawn at depth 0 and 1, and a pane of water
    // over the top of those hides them completely — which is how the first
    // draft of 2-3 came to have an invisible ledge in the middle of it.
    body.setDepth(-0.6);

    // The surface, and the fact that it moves. A still pane of colour reads as
    // a coloured wall; two pixels of foam sliding along it reads as water.
    const foam = scene.add.rectangle(x + w / 2, y + 1, w, 2, FOAM, 0.8).setDepth(-0.5);
    scene.tweens.add({
      targets: foam,
      y: y + 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // The pane in front. Depth 12 puts it over the player (10) and his hat
    // (11), so being under water is something you can see rather than infer.
    scene.add.rectangle(x + w / 2, y + h / 2, w, h, WATER, 0.18).setDepth(12);
  }

  contains(body: Phaser.Physics.Arcade.Body): boolean {
    return Phaser.Geom.Rectangle.Overlaps(
      this.bounds,
      new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
    );
  }
}

/**
 * Water that is going somewhere — the filter, and its return jets (§6).
 *
 * Nobody is immune. Berel walks through a leaf blower because §6 gives him
 * that, and a current he could ignore would reduce every water puzzle in the
 * game to pressing the swap button.
 */
export class Current {
  readonly bounds: Phaser.Geom.Rectangle;
  readonly forceX: number;
  readonly forceY: number;

  constructor(scene: Phaser.Scene, def: CurrentDef) {
    const x = def.x * TILE;
    const y = def.y * TILE;
    const w = def.w * TILE;
    const h = def.h * TILE;

    this.bounds = new Phaser.Geom.Rectangle(x, y, w, h);
    const force = def.force ?? (def.dy < 0 ? JET_FORCE : CURRENT_FORCE);
    this.forceX = force * def.dx;
    this.forceY = force * def.dy;

    // Bubbles, travelling the way the water does. A push with nothing visible
    // causing it reads as the controls having gone wrong — the same lesson the
    // leaf blowers taught, and the reason they have a machine drawn at the
    // mouth of them.
    const count = Math.max(5, Math.round((def.w * def.h) / 6));
    for (let i = 0; i < count; i += 1) {
      const size = 2 + Math.random() * 3;
      const bubble = scene.add
        .rectangle(x + Math.random() * w, y + Math.random() * h, size, size, FOAM, 0.6)
        .setDepth(1.7);
      const travel = 900 + Math.random() * 800;
      scene.tweens.add({
        targets: bubble,
        x: bubble.x + this.forceX * 0.6,
        y: bubble.y + this.forceY * 0.6,
        duration: travel,
        repeat: -1,
        delay: Math.random() * travel,
        onRepeat: () => {
          bubble.x = x + Math.random() * w;
          bubble.y = y + Math.random() * h;
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
