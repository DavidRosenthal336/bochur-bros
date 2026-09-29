import Phaser from 'phaser';
import type { BearConfig, BearStage } from '../config/bosses';
import { BEAR } from '../config/bosses';
import type { ActorSpriteSet } from '../config/sprites';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

type BearMode =
  | 'pacing'
  | 'windingUp'
  | 'swiping'
  | 'rearing'
  | 'charging'
  | 'dazed'
  | 'hurt'
  | 'toDumpster'
  | 'climbing'
  | 'throwing'
  | 'descending'
  | 'beaten';

/** The crash has to settle before the window opens, as the Escalade's does. */
const DAZE_SETTLE_MS = 180;
/** A hit knocks it back into itself for this long before it goes for the bin. */
const HURT_MS = 520;
/** Gravity on the bear. Heavy: it is a bear. */
const GRAVITY = 1400;
/** The jump up onto the dumpster, and the one back down. */
const CLIMB_VY = -470;
const DESCEND_VY = -240;
const HOP_VX = 95;
/** A garbage bag's lob: upward speed, and the cap on how hard it is thrown sideways. */
const BAG_VY = -320;
const BAG_MAX_VX = 250;
const BAG_GRAVITY = 900;
/** The longest a charge may run before it gives up, for an arena with no end. */
const CHARGE_CAP_MS = 3200;

/**
 * The Bear (§6, 3-4): "Lives behind the canteen dumpster with the kugel.
 * Charges, swipes, climbs the dumpster and hurls garbage bags, and calls in
 * raccoons when wounded."
 *
 * ## The round
 *
 * It paces towards you. It rears up — the telegraph, and the only warning there
 * is — and charges, and it does not stop until it hits something: the fence at
 * the end of the clearing, or the side of its own dumpster. Then it is dazed,
 * and a dazed bear is the one thing in this fight you can land on and hurt.
 * Afterwards it goes back to the dumpster, climbs it, and throws bags at you
 * from the top until it runs out, then drops down and starts again.
 *
 * So each round is a question and an answer. The charge is the question — get
 * out of its way, over it or onto the dumpster — and the daze is the answer,
 * with a stomp in it. The bags are the price of taking your time.
 *
 * ## The swipe
 *
 * If you stand in front of it while it is pacing, it swipes. The paw goes back
 * for three hundred and eighty milliseconds first, and that is on purpose: a
 * melee hit with no wind-up is a coin toss, and every attack in this game
 * announces itself.
 *
 * ## Landing on it
 *
 * Landing on a bear that is not dazed bounces you off and hurts neither of you.
 * It is a bear; a person on its head is an inconvenience. Walking into one is
 * another matter. That split is what makes the rule readable — you can always
 * try the stomp, and the daze is when it works.
 *
 * ## When it is beaten
 *
 * It is not killed. It sits down, thinks better of the whole business, and
 * lumbers off into the woods, and the kugel is left behind the dumpster where it
 * was the whole time. This is a family game about getting a kiddush back.
 */
export class Bear extends Phaser.Physics.Arcade.Sprite {
  readonly config: BearConfig;
  mode: BearMode = 'pacing';

  private hitsLeft: number;
  private modeEndsAt = 0;
  private facing: -1 | 1 = -1;
  private bagsLeft = 0;
  private nextThrowAt = 0;
  private chargeStartedAt = 0;
  private dazedFrom = 0;
  private dumpsterLeft = 0;
  private dumpsterRight = 0;
  private dumpsterTop = 0;
  private readonly art: ActorSpriteSet | undefined;
  private readonly throwBag: (x: number, y: number, vx: number, vy: number) => void;
  private stars: Phaser.GameObjects.Text | undefined;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    throwBag: (x: number, y: number, vx: number, vy: number) => void,
    config: BearConfig = BEAR,
  ) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.hitsLeft = config.hits;
    this.throwBag = throwBag;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(8);

    const body = this.physicsBody;
    body.setSize(config.bodyWidth, config.bodyHeight);
    body.setGravityY(GRAVITY);
    // Pushable off, not immovable, for the usual reason: Arcade will not
    // separate two immovable bodies, and every solid in the level is static.
    body.pushable = false;

    this.art = actorArt(config.art);
    if (this.art) applyActorArt(this, this.art, config.bodyWidth, config.bodyHeight);
    else this.setTint(config.color);

    this.modeEndsAt = scene.time.now + this.stage.paceMs + 800;
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isAlive(): boolean {
    return this.hitsLeft > 0;
  }

  get healthFraction(): number {
    return Math.max(0, this.hitsLeft) / this.config.hits;
  }

  /** 1-based, and it escalates with every hit. */
  get phase(): number {
    return Math.min(this.config.stages.length, this.config.hits - this.hitsLeft + 1);
  }

  private get stage(): BearStage {
    return this.config.stages[this.phase - 1]!;
  }

  /** Where the dumpster is. The scene owns it; the bear only needs to find it. */
  setDumpster(left: number, right: number, top: number): void {
    this.dumpsterLeft = left;
    this.dumpsterRight = right;
    this.dumpsterTop = top;
  }

  /** Can it be hurt right now? Only when it has run into something. */
  isVulnerable(now: number): boolean {
    return this.mode === 'dazed' && now >= this.dazedFrom + DAZE_SETTLE_MS;
  }

  /** Does walking into it hurt? Everything but a dazed, hurt or beaten bear. */
  get isDangerous(): boolean {
    return this.mode !== 'dazed' && this.mode !== 'hurt' && this.mode !== 'beaten';
  }

  /**
   * The swipe's reach, while it is live, in world pixels.
   *
   * Only in front, and only the height of the bear. The scene tests the player
   * against this, so that a swipe is a place you are standing and not a
   * collision you happened to have.
   */
  swipeZone(): Phaser.Geom.Rectangle | undefined {
    if (this.mode !== 'swiping') return undefined;
    const body = this.physicsBody;
    const x = this.facing === 1 ? body.right : body.left - this.config.swipeRange;
    return new Phaser.Geom.Rectangle(x, body.top, this.config.swipeRange, body.height);
  }

  get stageRaccoons(): number {
    return this.stage.raccoons;
  }

  /**
   * Take a stomp. Returns true if that finished it.
   *
   * A hit ends the daze at once — the bear shakes it off, angrier — so a single
   * window is worth a single hit however quick the player is.
   */
  takeHit(now: number): boolean {
    if (!this.isVulnerable(now) || !this.isAlive) return false;
    this.hitsLeft -= 1;
    this.clearStars();

    if (this.hitsLeft <= 0) {
      this.beBeaten();
      return true;
    }

    this.mode = 'hurt';
    this.modeEndsAt = now + HURT_MS;
    this.physicsBody.setVelocityX(0);
    this.setTint(0xffb0a0);
    this.scene.time.delayedCall(HURT_MS, () => {
      if (this.active && this.isAlive) this.art ? this.clearTint() : this.setTint(this.config.color);
    });
    return false;
  }

  tick(now: number, playerX: number, playerY: number): void {
    if (this.mode === 'beaten') return;
    const body = this.physicsBody;
    const toPlayer: -1 | 1 = playerX >= this.x ? 1 : -1;

    switch (this.mode) {
      case 'pacing': {
        this.facing = toPlayer;
        body.setVelocityX(this.facing * this.config.walkSpeed);
        // Somebody standing in front of it, at its own height, gets swiped at.
        const inFront = Math.abs(playerX - this.x) < this.config.bodyWidth / 2 + this.config.swipeRange;
        const level = Math.abs(playerY - body.bottom) < this.config.bodyHeight;
        if (inFront && level && body.blocked.down) {
          this.enter('windingUp', now + this.config.swipeWindUpMs);
          body.setVelocityX(0);
          break;
        }
        if (now >= this.modeEndsAt) {
          this.enter('rearing', now + this.stage.rearMs);
          body.setVelocityX(0);
        }
        break;
      }

      case 'windingUp':
        body.setVelocityX(0);
        if (now >= this.modeEndsAt) this.enter('swiping', now + this.config.swipeMs);
        break;

      case 'swiping':
        body.setVelocityX(0);
        if (now >= this.modeEndsAt) this.enter('pacing', now + this.stage.paceMs * 0.6);
        break;

      case 'rearing':
        // It turns to face you through the whole rear, so the telegraph is also
        // the aim. Stepping over it during the rear turns it round.
        this.facing = toPlayer;
        body.setVelocityX(0);
        // A shiver on the spot: the rear has to be legible from across the arena.
        this.setX(this.x + (Math.floor(now / 50) % 2 === 0 ? 0.6 : -0.6));
        if (now >= this.modeEndsAt) {
          this.chargeStartedAt = now;
          this.enter('charging', 0);
        }
        break;

      case 'charging': {
        body.setVelocityX(this.facing * this.stage.chargeSpeed);
        const hit = (this.facing === 1 && body.blocked.right) || (this.facing === -1 && body.blocked.left);
        if (hit) {
          this.daze(now);
        } else if (now - this.chargeStartedAt > CHARGE_CAP_MS) {
          this.enter('pacing', now + this.stage.paceMs);
        }
        break;
      }

      case 'dazed':
        body.setVelocityX(0);
        if (now >= this.modeEndsAt) {
          this.clearStars();
          this.enter('toDumpster', 0);
        }
        break;

      case 'hurt':
        body.setVelocityX(0);
        if (now >= this.modeEndsAt) this.enter('toDumpster', 0);
        break;

      case 'toDumpster': {
        // Walk to whichever side of the bin is nearer, then go up.
        const side = this.x < (this.dumpsterLeft + this.dumpsterRight) / 2 ? this.dumpsterLeft : this.dumpsterRight;
        const dir: -1 | 1 = side >= this.x ? 1 : -1;
        this.facing = dir;
        const near = Math.abs(side - this.x) < this.config.bodyWidth;
        if (near && body.blocked.down) {
          const middle = (this.dumpsterLeft + this.dumpsterRight) / 2;
          body.setVelocity((middle > this.x ? 1 : -1) * HOP_VX, CLIMB_VY);
          this.enter('climbing', now + 1400);
        } else {
          body.setVelocityX(dir * this.config.walkSpeed * 1.6);
        }
        break;
      }

      case 'climbing': {
        const middle = (this.dumpsterLeft + this.dumpsterRight) / 2;
        const onTop = body.blocked.down && body.bottom <= this.dumpsterTop + 3;
        if (onTop) {
          body.setVelocityX(0);
          this.bagsLeft = this.stage.bags;
          this.nextThrowAt = now + 450;
          this.enter('throwing', 0);
        } else if (body.blocked.down && now >= this.modeEndsAt) {
          // Missed the top: go round again rather than stand at the foot of it.
          this.enter('toDumpster', 0);
        } else if (!body.blocked.down) {
          // Steer the jump towards the middle of the lid.
          body.setVelocityX(Math.abs(this.x - middle) < 4 ? 0 : (middle > this.x ? 1 : -1) * HOP_VX);
        }
        break;
      }

      case 'throwing':
        body.setVelocityX(0);
        this.facing = toPlayer;
        if (now >= this.nextThrowAt && this.bagsLeft > 0) {
          this.bagsLeft -= 1;
          this.nextThrowAt = now + this.stage.throwEveryMs;
          this.lob(playerX);
        }
        if (this.bagsLeft === 0 && now >= this.nextThrowAt) {
          // Down on your side, not the far one: the next charge starts close.
          body.setVelocity(toPlayer * HOP_VX * 1.3, DESCEND_VY);
          this.enter('descending', 0);
        }
        break;

      case 'descending':
        if (body.blocked.down && body.bottom > this.dumpsterTop + 3) {
          body.setVelocityX(0);
          this.enter('pacing', now + this.stage.paceMs);
        }
        break;
    }

    this.stars?.setPosition(this.x, this.y - this.config.bodyHeight - 6);
    this.updatePose();
  }

  /**
   * A garbage bag, lobbed at where you are.
   *
   * Aimed by solving the flight for the lob: a fixed upward speed, so a fixed
   * time in the air, and whatever sideways speed lands it on your position. It
   * leads nothing — it lands where you were — so moving is the answer, and
   * standing still to watch is how you get hit.
   */
  private lob(targetX: number): void {
    const body = this.physicsBody;
    const fromX = this.x + this.facing * 10;
    const fromY = body.top + 6;
    const flight = (2 * -BAG_VY) / BAG_GRAVITY;
    const vx = Phaser.Math.Clamp((targetX - fromX) / flight, -BAG_MAX_VX, BAG_MAX_VX);
    this.throwBag(fromX, fromY, vx, BAG_VY);
  }

  static get bagGravity(): number {
    return BAG_GRAVITY;
  }

  private daze(now: number): void {
    this.dazedFrom = now;
    this.enter('dazed', now + this.stage.dazeMs);
    this.physicsBody.setVelocityX(0);
    this.scene.cameras.main.shake(140, 0.006);
    this.clearStars();
    // Stars over its head: the window, drawn where the player is looking.
    this.stars = this.scene.add
      .text(this.x, this.y - this.config.bodyHeight - 6, '* * *', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffe680',
      })
      .setOrigin(0.5, 1)
      .setDepth(9);
    this.scene.tweens.add({ targets: this.stars, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: -1 });
  }

  private clearStars(): void {
    if (!this.stars) return;
    this.scene.tweens.killTweensOf(this.stars);
    this.stars.destroy();
    this.stars = undefined;
  }

  private enter(mode: BearMode, endsAt: number): void {
    this.mode = mode;
    this.modeEndsAt = endsAt;
  }

  /**
   * Beaten, and off into the woods.
   *
   * No squash and no knock-out: it sits for a moment, then gets up and goes,
   * with nothing to collide with on the way so the fence cannot keep it.
   */
  private beBeaten(): void {
    this.mode = 'beaten';
    const body = this.physicsBody;
    body.setVelocity(0, 0);
    body.enable = false;
    if (this.art) playPose(this, this.art, 'hurt');
    this.scene.tweens.add({
      targets: this,
      x: this.x + 140,
      alpha: 0,
      delay: 900,
      duration: 1600,
      ease: 'Quad.easeIn',
      onStart: () => this.setFlipX(false),
    });
  }

  private updatePose(): void {
    const art = this.art;
    if (art) {
      const pose =
        this.mode === 'rearing' || this.mode === 'windingUp' || this.mode === 'swiping'
          ? 'swipe'
          : this.mode === 'dazed' || this.mode === 'hurt'
            ? 'hurt'
            : 'idle';
      playPose(this, art, pose);
    } else if (this.mode === 'rearing' || this.mode === 'windingUp') {
      this.setTint(0xc98b4a);
    } else if (this.mode !== 'hurt') {
      this.setTint(this.config.color);
    }
    // The sheet is drawn facing right.
    this.setFlipX(this.facing < 0);
  }

  override destroy(fromScene?: boolean): void {
    this.clearStars();
    super.destroy(fromScene);
  }
}
