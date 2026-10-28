import Phaser from 'phaser';
import type { HazardConfig } from '../config/hazards';
import type { ActorSpriteSet } from '../config/sprites';
import { GAMEPLAY } from '../config/Tuning';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/** How hard a chaser pulls back toward its lane, px/s per px behind it. */
const CHASE_PULL = 2.5;
/** The most a chaser does catching up to its lane, px/s. A run is 150. */
const CHASE_CATCH_UP = 140;

/**
 * A hazard that moves: a falling pipe, a runaway cart, a lurching van, the
 * stroller.
 *
 * One class, four behaviours picked by config, for the same reason the enemies
 * are one class — §11 asks for it, and because the difference between a cart
 * and a van is a handful of numbers, not a type hierarchy.
 *
 * None of these can be defeated. They are survived, dodged, or in the case of
 * the cart and the van, climbed onto and ridden.
 */
export class MovingHazard extends Phaser.Physics.Arcade.Sprite {
  readonly config: HazardConfig;

  private readonly homeX: number;
  private readonly homeY: number;
  private facing: -1 | 1;
  private phase: 'idle' | 'warning' | 'active' | 'spent' = 'idle';
  private phaseEndsAt = 0;
  /** The shadow a falling pipe casts before it drops (§6). */
  private shadow: Phaser.GameObjects.Rectangle | undefined;
  /** Grit shaken loose from a pipe that is about to go, for as long as it rattles. */
  private nextDustAt = 0;
  /** The rope a pipe hangs from, up to the scaffolding above the screen. */
  private strap: Phaser.GameObjects.Rectangle | undefined;
  private readonly art: ActorSpriteSet | undefined;
  /**
   * Is there something solid at a point, in pixels? The level answers; this
   * is how a thing on wheels sees the end of the pavement coming.
   */
  private readonly solidAt: (x: number, y: number) => boolean;
  /**
   * A roller sleeps until the player is near, so it is where it was put when
   * they get there. Nothing else has a before and an after.
   */
  private awake: boolean;
  /**
   * A chaser stands still until this time. Set by the scene on a resumed
   * life, so the stroller does not arrive while the respawn grace is still
   * running and catch a player who has not moved yet the moment it ends.
   */
  holdUntil = 0;
  /**
   * Where a chaser is meant to be on a level whose screen moves by itself:
   * a lane just inside the left edge, moving at the screen's speed. Set by
   * the scene every frame. Behind the lane it catches up fast; ahead of it,
   * it eases off; in the lane, it keeps exact pace with the screen. So it is
   * the left edge of the screen with wheels, and it reaches exactly the
   * player the screen has pinned there — not, as it did with a speed of its
   * own, everyone whose average over the level fell below that speed, which
   * is everyone, about halfway through.
   */
  lane: { x: number; speed: number } | undefined;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: HazardConfig,
    facing: -1 | 1 = -1,
    solidAt: (x: number, y: number) => boolean = () => true,
  ) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.homeX = x;
    this.homeY = y;
    this.facing = facing;
    this.solidAt = solidAt;
    this.awake = config.behavior !== 'roller';

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(7);

    const body = this.physicsBody;
    body.setSize(config.bodyWidth, config.bodyHeight);
    body.setOffset(0, 0);

    this.art = actorArt(config.art);
    if (this.art) {
      applyActorArt(this, this.art, config.bodyWidth, config.bodyHeight);
      playPose(this, this.art, 'idle');
    } else {
      this.setTint(config.color);
    }

    body.setAllowGravity(config.affectedByGravity);
    if (config.affectedByGravity) body.setGravityY(1500);

    // A faller hangs low enough to be seen, so it needs something to hang from.
    if (config.behavior === 'faller') {
      this.strap = scene.add
        .rectangle(x, y - config.bodyHeight, 2, 120, 0x3a3f55)
        .setOrigin(0.5, 1)
        .setDepth(6);
    }
    // NOT immovable. Arcade skips separation entirely when both bodies in a
    // collision are immovable, and every solid in the level is a static body,
    // which counts as immovable — so an immovable cart simply fell through the
    // pavement and out of the world. `pushable = false` gets what immovable was
    // reached for (the player cannot shove it) without that.
    body.pushable = false;
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Does the level's geometry stop it?
   *
   * A faller says no. It rests on scaffolding it is deliberately overlapping
   * and stops at the ground row it is told about, so letting Arcade separate
   * it from the scaffolding would shove it out of its rest position and make
   * `blocked.down` true before it had fallen anywhere.
   */
  get collidesWithSolids(): boolean {
    return this.config.behavior !== 'faller';
  }

  /** Is it currently able to hurt you? A pipe waiting on the scaffold is not. */
  /**
   * Does the player bump into it at all?
   *
   * A pipe hangs low enough now to be seen, which puts it within a jump of the
   * pavement, so hanging or lying spent it is scenery you pass through. Only a
   * pipe on its way down is a thing, and that is the one that hurts.
   */
  get collidesWithPlayer(): boolean {
    return this.config.behavior !== 'faller' || this.phase === 'active';
  }

  get isDangerous(): boolean {
    if (!this.config.harmful) return false;
    if (this.config.behavior === 'faller') return this.phase === 'active';
    return true;
  }

  tick(now: number, playerX: number, playerY: number, groundY: number): void {
    switch (this.config.behavior) {
      case 'faller':
        this.tickFaller(now, playerX, groundY);
        break;
      case 'roller':
        this.tickRoller(playerX);
        break;
      case 'lurcher':
        this.tickLurcher(now, playerX);
        break;
      case 'chaser':
        this.tickChaser(now, playerX, playerY);
        break;
      default:
        break;
    }

    this.rollWheels();
  }

  /**
   * Anything on wheels leans the way it is going and bobs as it rolls.
   *
   * These are single-frame drawings by design — the README calls for them to be
   * "moved and rotated in code rather than animated" — so the motion has to
   * come from here or they slide along like stickers.
   */
  private rollWheels(): void {
    if (!this.art) return;
    const vx = this.physicsBody.velocity.x;

    if (this.config.behavior === 'roller' || this.config.behavior === 'chaser') {
      if (vx !== 0) this.setFlipX(vx < 0);
      // A shallow rock rather than a spin: these are drawn upright, and a
      // rotating hitbox is not something Arcade has any concept of.
      this.setAngle(Math.abs(vx) < 1 ? 0 : Math.sin(this.scene.time.now / 70) * 2.5);
    }
  }

  /**
   * Hangs from the scaffolding, in plain sight. When you come near, it rattles
   * — shaking on its clamp, grit falling off it, flashing — and a red mark
   * lights up on the pavement where it is going to land. A second later it
   * drops.
   *
   * §6 asks for "a shadow on the ground, then the pipe drops", and the first
   * version was exactly that: a three-pixel shadow under a pipe hung above the
   * top of the screen. On these graphics the shadow could not be seen, and the
   * pipe could not be seen until it was already falling, so there was nothing
   * to dodge. Something falling from the sky has to be seen first.
   */
  private tickFaller(now: number, playerX: number, groundY: number): void {
    const settings = this.config.faller;
    if (!settings) return;
    const body = this.physicsBody;

    switch (this.phase) {
      case 'idle': {
        body.setVelocity(0, 0);
        body.setAllowGravity(false);
        this.setPosition(this.homeX, this.homeY);
        if (Math.abs(playerX - this.homeX) < settings.triggerRange) {
          this.phase = 'warning';
          this.phaseEndsAt = now + settings.warningMs;
          this.showShadow(groundY, settings.warningMs);
        }
        break;
      }

      case 'warning':
        // The rattle: a pipe working loose, unmistakably, from across the street.
        this.setPosition(this.homeX + Math.sin(now / 22) * 1.6, this.homeY);
        if (Math.floor(now / 110) % 2 === 0) this.setTint(0xff9a8a);
        else this.art ? this.clearTint() : this.setTint(this.config.color);
        if (now >= this.nextDustAt) {
          this.nextDustAt = now + 80;
          this.dropGrit();
        }
        this.strap?.setX(this.x);
        if (now >= this.phaseEndsAt) {
          this.phase = 'active';
          this.setPosition(this.homeX, this.homeY);
          // The rope snaps: the pipe goes, and so does what held it.
          this.strap?.setVisible(false);
          if (this.art) this.clearTint();
          else this.setTint(this.config.color);
          body.setVelocityY(this.config.speed);
        }
        break;

      case 'active':
        if (body.blocked.down || this.y >= groundY) {
          this.phase = 'spent';
          this.phaseEndsAt = now + settings.resetMs;
          // Snap flush to the pavement. At 520 px/s a frame is nine pixels, so
          // without this it comes to rest wherever the step happened to leave
          // it — hovering above the ground or sunk into it.
          this.setPosition(this.x, Math.min(this.y, groundY));
          body.setVelocity(0, 0);
          this.clearShadow();
          this.scene.cameras.main.shake(120, 0.005);
        }
        break;

      case 'spent':
        if (now >= this.phaseEndsAt) {
          this.phase = 'idle';
          this.setPosition(this.homeX, this.homeY);
          this.strap?.setVisible(true).setX(this.homeX);
        }
        break;
    }
  }

  /** A fleck of rust and dust off the bottom of a rattling pipe. */
  private dropGrit(): void {
    const bottom = this.homeY;
    const fleck = this.scene.add
      .rectangle(this.homeX + Phaser.Math.Between(-5, 5), bottom, 2, 2, 0xd8c8a0)
      .setDepth(6);
    this.scene.tweens.add({
      targets: fleck,
      y: bottom + Phaser.Math.Between(28, 46),
      alpha: 0,
      duration: 420,
      onComplete: () => fleck.destroy(),
    });
  }

  /**
   * Where it will land: a bright red bar on the pavement, flashing.
   *
   * Named for the shadow it replaced. A dark shadow on dark pavement was
   * invisible; red on grey is not.
   */
  private showShadow(groundY: number, warningMs: number): void {
    this.clearShadow();
    this.shadow = this.scene.add
      .rectangle(this.homeX, groundY, this.config.bodyWidth + 14, 5, 0xff3b30, 0.95)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0xffe08a)
      .setDepth(6);
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.35,
      duration: warningMs / 6,
      yoyo: true,
      repeat: -1,
    });
  }

  private clearShadow(): void {
    if (!this.shadow) return;
    this.scene.tweens.killTweensOf(this.shadow);
    this.shadow.destroy();
    this.shadow = undefined;
  }

  /**
   * Rolls in one direction, turning at walls and at the ends of its ground so
   * it stays in its stretch, and not at all until the player is near.
   *
   * Both halves are the same lesson. A cart was placed in 1-1 for the player
   * to ride, and rolled off the end of its pavement into a pit two and a half
   * seconds after the level began — long before anyone reached it. Turning at
   * a ledge keeps it on its stretch; sleeping keeps it where it was put until
   * there is someone there to roll at.
   */
  private tickRoller(playerX: number): void {
    const body = this.physicsBody;
    if (!this.awake) {
      body.setVelocityX(0);
      if (Math.abs(playerX - this.x) > GAMEPLAY.wakeRange) return;
      this.awake = true;
      // It rolls at you: whichever side you come from.
      this.facing = playerX < this.x ? -1 : 1;
    }
    const walled = body.blocked.left || body.blocked.right;
    if (walled || (body.blocked.down && this.ledgeAhead())) this.facing = this.facing === 1 ? -1 : 1;
    body.setVelocityX(this.facing * this.config.speed);
  }

  /** Is the ground about to run out in the direction it is going? */
  private ledgeAhead(): boolean {
    const body = this.physicsBody;
    const aheadX = this.facing > 0 ? body.right + 2 : body.left - 2;
    return !this.solidAt(aheadX, body.bottom + 2);
  }

  /**
   * How wide a hole it is driving at, in tiles, or 0 for none. Looks across
   * the floor ahead for the next solid tile.
   */
  private gapAhead(): number {
    const body = this.physicsBody;
    const edge = this.facing > 0 ? body.right : body.left;
    for (let tiles = 0; tiles < 6; tiles += 1) {
      const px = edge + this.facing * (2 + tiles * 16);
      if (this.solidAt(px, body.bottom + 2)) return tiles;
    }
    return 6;
  }

  /** Sits still, then lurches forward with no warning at all. That is the joke. */
  private tickLurcher(now: number, playerX: number): void {
    const settings = this.config.lurcher;
    if (!settings) return;
    const body = this.physicsBody;

    switch (this.phase) {
      case 'idle':
        body.setVelocityX(0);
        if (Math.abs(playerX - this.x) < settings.triggerRange) {
          this.phase = 'warning';
          this.phaseEndsAt = now + settings.waitMs;
        }
        break;

      case 'warning':
        body.setVelocityX(0);
        if (now >= this.phaseEndsAt) {
          this.phase = 'active';
          this.phaseEndsAt = now + settings.lungeMs;
          this.facing = playerX < this.x ? -1 : 1;
        }
        break;

      case 'active':
        body.setVelocityX(this.facing * this.config.speed);
        if (now >= this.phaseEndsAt || body.blocked.left || body.blocked.right) {
          this.phase = 'spent';
          this.phaseEndsAt = now + settings.waitMs * 2;
          body.setVelocityX(0);
        }
        break;

      case 'spent':
        body.setVelocityX(0);
        if (now >= this.phaseEndsAt) this.phase = 'idle';
        break;
    }
  }

  /**
   * Follows, relentlessly: hops a step it meets, jumps a gap it comes to, and
   * if it is ever lost down one anyway, comes back behind you.
   *
   * The first version only hopped at walls, and rolled into the first pit of
   * 1-3 six seconds into a level whose whole premise is that it "pursues the
   * whole way" (§6). A chaser has to be able to go everywhere the player can.
   */
  private tickChaser(now: number, playerX: number, playerY: number): void {
    const body = this.physicsBody;
    const direction = playerX < this.x ? -1 : 1;
    this.facing = direction;

    if (now < this.holdUntil) {
      body.setVelocityX(0);
      return;
    }

    // Fallen out of the level: back on the floor behind the player, so the
    // chase goes on. Out of sight, so it looks like it caught up.
    if (this.y > this.homeY + 160) {
      this.resetBehind(playerX, playerY);
      return;
    }

    // In the air, keep the speed the jump was made at: a hop that slows down
    // halfway across is a hop into the hole.
    if (!body.blocked.down) return;

    if (this.lane) {
      const behind = this.lane.x - this.x;
      body.setVelocityX(Phaser.Math.Clamp(this.lane.speed + behind * CHASE_PULL, 0, CHASE_CATCH_UP));
    } else {
      body.setVelocityX(direction * this.config.speed);
    }

    // A wall in the way is a step to be hopped, not a reason to stop.
    const blocked = direction > 0 ? body.blocked.right : body.blocked.left;
    if (blocked) {
      body.setVelocityY(-430);
      return;
    }

    // A gap in the way is jumped — with a run at it, because the arc it gets
    // only clears a little over three tiles at its own speed.
    const gap = this.gapAhead();
    if (gap > 0 && gap <= 4) {
      body.setVelocityY(-430);
      body.setVelocityX(direction * Math.max(Math.abs(body.velocity.x), (gap + 1.5) * 16 / 0.57));
    }
  }

  /**
   * It caught you. It drops back and waits a moment before it comes again.
   *
   * Without this, a chaser that had hit you rolled on through the blinking
   * player and came out in front, and the level became a squeeze between the
   * screen's left edge shoving you forwards and a stroller you could not get
   * past. One hit is the price of being caught; being caught is not a trap.
   */
  stumble(now: number, playerX: number, playerY: number): void {
    this.resetBehind(playerX, playerY);
    this.holdUntil = now + 1000;
  }

  /** Back onto the floor a lead behind the player. */
  private resetBehind(playerX: number, playerY: number): void {
    const body = this.physicsBody;
    const lead = 7 * 16;
    let x = playerX - lead;
    // Walk left until there is floor under the whole body.
    for (let tries = 0; tries < 40; tries += 1) {
      const half = this.config.bodyWidth / 2;
      if (this.solidAt(x - half + 1, this.homeY + 1) && this.solidAt(x + half - 1, this.homeY + 1)) break;
      x -= 8;
    }
    this.setPosition(Math.max(this.config.bodyWidth, x), this.homeY);
    body.reset(this.x, this.y);
    body.setVelocity(0, 0);
    void playerY;
  }

  override destroy(fromScene?: boolean): void {
    this.clearShadow();
    this.strap?.destroy();
    super.destroy(fromScene);
  }
}
