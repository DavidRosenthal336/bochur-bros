import Phaser from 'phaser';
import { TILE } from '../config/Tuning';
import { ACTOR_SPRITES, actorAnimKey } from '../config/sprites';
import { artExists } from '../config/scenery';
import { solidTextureKey } from '../util/textures';

/** How far ahead of the player he runs, px. Just under half a screen. */
const LEAD = 120;
/** How hard he pulls back to that distance. Higher is more rubber-bandy. */
const CATCH_UP = 2.6;
/** Ceiling on his speed, px/s. Above the player's run, so he is never caught. */
const TOP_SPEED = 300;
/** The bolt when he is released: speed, px/s, and how long he keeps it up, ms. */
const BOLT_SPEED = 120;
const BOLT_MS = 700;
/** How far he bobs as he goes, px, and how fast, Hz. */
const BOB = 3;
const BOB_HZ = 5;

/**
 * The Yetzer Hara, in the prologue — a thief, not a boss.
 *
 * He is the one actor in the game that cannot be caught, cannot be hurt and
 * cannot hurt you, and all three are deliberate. The prologue's job is to show
 * the premise the design doc opens with — he "crashed the kiddush and made off
 * with the entire spread, scattering it across four places" (§1) — and to hand
 * the player the map that premise explains. A chase you can lose would make
 * the first minute of the game a skill check; a chase you can win would
 * contradict the four worlds that follow.
 *
 * So he is a rubber band. He holds station a fixed distance ahead and matches
 * whatever pace the player sets: dawdle and he drifts, run flat out and he
 * stays exactly as far away. There is no closing the gap and no losing him,
 * which leaves the level free to teach running, jumping and swapping brothers
 * instead of testing them.
 *
 * Deliberately not a physics sprite. Nothing in the level touches him, so a
 * body would earn nothing and cost the usual grief — Arcade writes the body's
 * position back over the sprite's every step, so the bob would have to be
 * smuggled through the body and the whole thing would be at the mercy of a
 * sync that exists for collisions that never happen.
 *
 * He is drawn only as smoke. §6 calls him "a shape-shifter with no true form",
 * and the final fight is built on never letting him settle into one, so the
 * prologue must not show a face. The sheet's other frames — the borrowed
 * shapes of the three bosses — belong to World 4.
 */
export class Thief extends Phaser.GameObjects.Sprite {
  private readonly startX: number;
  /** Where he stops running: the end of the street. */
  private readonly exitX: number;
  private bobT = 0;
  private baseY: number;
  private leaving = false;
  private lastPlayerX: number | undefined;
  private boltMsLeft = 0;
  /**
   * He does not move until the level lets him.
   *
   * The prologue opens on a held beat — the room, the sign, and a shape
   * standing in it — and then he goes. That moment is the crash, and it only
   * lands if there was a moment before it.
   */
  private held = true;

  constructor(scene: Phaser.Scene, x: number, y: number, exitX: number) {
    const set = ACTOR_SPRITES.yetzerHara;
    const drawn = artExists(set.url);
    super(scene, x, y, drawn ? set.key : solidTextureKey(scene, 26, 36));

    this.startX = x;
    this.exitX = exitX;
    this.baseY = y;

    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(8);

    if (drawn) {
      this.play(actorAnimKey(set, 'smoke'), true);
    } else {
      // Not drawn yet: a dark shape of about his size, which is the right
      // placeholder for something whose whole character is being a dark shape.
      this.setTint(0x241a2e);
    }
  }

  /** Let him run. */
  release(): void {
    if (!this.held) return;
    this.held = false;
    this.boltMsLeft = BOLT_MS;
  }

  /** Has he got to the end of the street? */
  get isAtExit(): boolean {
    return !this.held && this.x >= this.exitX - 1;
  }

  /** Has he reached the end of the street and begun to go? */
  get isLeaving(): boolean {
    return this.leaving;
  }

  /**
   * Hold station ahead of the player.
   *
   * He matches the player's own speed and then corrects towards the mark, so
   * the distance settles at `LEAD` whoever is running and however fast.
   *
   * Correcting alone is not enough, and the first version did only that: with
   * speed proportional to the error, the gap settles wherever the correction
   * happens to equal the player's pace, so it comes out as the player's speed
   * divided by the gain. Measured, that was seventy pixels at a run and would
   * have been half of it at a walk — he would have been in your lap for
   * anybody who strolled. Carrying the player's speed is what makes the lead
   * a distance rather than a side effect.
   *
   * The floor of zero matters too: he must never travel backwards towards the
   * player, because a shadow sliding at you looks like an attack in a level
   * where nothing can attack you.
   */
  tick(delta: number, playerX: number): void {
    const dt = delta / 1000;
    this.bobT += dt * BOB_HZ;

    const playerSpeed =
      this.lastPlayerX === undefined ? 0 : Math.max(0, (playerX - this.lastPlayerX) / dt);
    this.lastPlayerX = playerX;

    if (!this.leaving && !this.held) {
      const want = Phaser.Math.Clamp(playerX + LEAD, this.startX, this.exitX);
      let speed = Phaser.Math.Clamp(playerSpeed + (want - this.x) * CATCH_UP, 0, TOP_SPEED);

      /**
       * The bolt.
       *
       * Without it he only moves once the player has closed to within a lead
       * of him, so the moment the level is built around — the shape turning
       * and going — happens with him standing perfectly still while the camera
       * shakes at nothing. For the first moment he runs because he is running,
       * not because anybody is coming.
       *
       * Kept short on purpose. He is standing near the right-hand edge of the
       * opening view, so a long bolt carries him clean off the screen and a
       * player who hesitates is left looking at an empty street wondering what
       * they were meant to have seen. This one takes him to about the edge and
       * leaves him there.
       */
      if (this.boltMsLeft > 0) {
        this.boltMsLeft -= delta;
        speed = Math.max(speed, BOLT_SPEED);
      }

      this.x = Math.min(this.x + speed * dt, this.exitX);
    }

    this.y = this.baseY + Math.sin(this.bobT) * BOB;
  }

  /**
   * Over the wall and gone.
   *
   * Up and away rather than off the right-hand edge, so the last thing the
   * player sees is him leaving the street entirely. The spread is about to be
   * scattered across four neighbourhoods, and he has to look like something
   * that can reach all four.
   */
  escape(onDone: () => void): void {
    if (this.leaving) return;
    this.leaving = true;

    this.scene.tweens.add({
      targets: this,
      props: {
        x: { value: this.x + TILE * 4, duration: 1100, ease: 'Quad.easeOut' },
        alpha: { value: 0, duration: 1100, ease: 'Quad.easeIn' },
      },
      duration: 1100,
      onUpdate: () => {
        // Climbing, and the bob in `tick` is relative to this.
        this.baseY -= 1.6;
      },
      onComplete: () => {
        onDone();
        this.destroy();
      },
    });
  }
}
