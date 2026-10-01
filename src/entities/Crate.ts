import Phaser from 'phaser';
import { ACTOR_SPRITES } from '../config/sprites';
import { GAMEPLAY, TILE } from '../config/Tuning';
import { actorArt, applyActorArt, playPose } from '../util/art';
import type { ActorSpriteName } from '../config/sprites';
import { solidTextureKey } from '../util/textures';

/**
 * A shuk crate. Berel shoves it along; Mendy cannot budge it (§4).
 *
 * The crate is never `pushable` in Arcade's sense. Arcade resolves a push by
 * sharing momentum between the two bodies, which falls apart for a slow
 * pusher — a crouching Berel leaning on a crate moved it six pixels in four
 * seconds. Instead the crate stays immovable to the physics step and the scene
 * drives it directly, at the speed of whoever is leaning on it. That makes the
 * push deterministic and gives it an honest tuning knob.
 */
/** Dimming applied to a crate the character on screen is too weak to shift. */
const TOO_HEAVY_TINT = 0x9b9b9b;

/**
 * What kind of heavy thing this is.
 *
 * A crate is shoved and stops when you stop. A shuk cart (§6: "shuk crates and
 * carts to climb, push, and knock over") is on wheels: it is shoved faster than
 * Berel walks and barely slowed by the stones, so one push sends it rolling away
 * from him on its own — a thing you aim rather than a thing you walk along.
 */
export interface HeavyKind {
  readonly art: ActorSpriteName;
  readonly width: number;
  readonly height: number;
  /** How hard the ground slows it once nobody is pushing, px/s^2. */
  readonly drag: number;
  /** How fast a push sends it, px/s. */
  readonly pushSpeed: number;
}

export const CRATE: HeavyKind = {
  art: 'crate',
  width: TILE,
  height: TILE,
  drag: 500,
  pushSpeed: GAMEPLAY.cratePushSpeed,
};

/**
 * Measured against the brothers: Berel walks at 75, so a cart pushed at 110
 * pulls away from him within a few frames, and with 70 of drag it then coasts
 * about 86px — five tiles. Far enough to send into a gap ahead, short enough to
 * catch up with.
 */
export const SHUK_CART: HeavyKind = {
  art: 'shukCart',
  width: 24,
  height: 13,
  drag: 70,
  pushSpeed: 110,
};

export class Crate extends Phaser.Physics.Arcade.Sprite {
  /** Whether the character on screen right now is strong enough to move it. */
  private shovable = false;
  private readonly kind: HeavyKind;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: HeavyKind = CRATE) {
    super(scene, x, y, solidTextureKey(scene, kind.width, kind.height));
    this.kind = kind;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);

    const body = this.physicsBody;
    const art = actorArt(kind.art) ?? ACTOR_SPRITES.crate;
    applyActorArt(this, art, kind.width, kind.height);
    playPose(this, art, 'idle');
    this.setTint(TOO_HEAVY_TINT);
    body.setAllowGravity(true);
    body.setGravityY(1600);
    body.setMaxVelocity(kind.pushSpeed, 600);
    body.setDragX(kind.drag);
    body.setCollideWorldBounds(true);
    body.pushable = false;
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Called when the active character changes. Named `setShovable` rather than
   * `setPushable` because Phaser's Sprite already has a `setPushable`.
   *
   * The lighter tint is the tell that this brother can move it. It is a tint
   * over the drawn crate rather than a second drawing, because the difference
   * has to track the character swap instantly.
   */
  setShovable(shovable: boolean): void {
    this.shovable = shovable;
    if (shovable) this.clearTint();
    else this.setTint(TOO_HEAVY_TINT);
  }

  get canBeShoved(): boolean {
    return this.shovable;
  }

  /** Leaned on from `direction` at `speed`. Ignored if this brother is too weak. */
  shove(direction: -1 | 1, speed: number): void {
    if (!this.shovable) return;
    // A cart takes its own speed from a push, which is what makes it roll away;
    // a crate goes no faster than the hand on it.
    const pace = this.kind === CRATE ? Math.min(speed, this.kind.pushSpeed) : this.kind.pushSpeed;
    this.physicsBody.setVelocityX(direction * pace);
  }
}
