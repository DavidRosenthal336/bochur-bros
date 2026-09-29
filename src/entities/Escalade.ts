import Phaser from 'phaser';
import type { VehicleBossConfig, VehicleBossStage } from '../config/bosses';
import { VEHICLE_BOSSES } from '../config/bosses';
import type { ActorSpriteSet } from '../config/sprites';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/**
 * The Escalade (§6, 2-4).
 *
 * "A mother in sunglasses, on the phone, eating a salad, driving an enormous
 * Escalade around a cul-de-sac."
 *
 * **The player fights the vehicle, never the driver.** That is §6's own
 * emphasis and it is the whole joke, so it is enforced by construction rather
 * than by being careful: nothing in this class knows she is there. She is
 * drawn into the sheet, she has no hitbox, she is never told the fight is
 * happening, and she does not react to it. The dent is in a roof.
 *
 * ## The cycle
 *
 * It waits. It revs — this is the telegraph, and the only warning there is. It
 * charges the length of the cul-de-sac, clips the hydrant at the far end, and
 * stalls. The stall is the window. Then it goes back the other way, and from
 * the second phase on the way back is a charge too.
 *
 * ## Where you are supposed to be
 *
 * On it. §6 says of World 2's minivans that "the player must climb the thing
 * trying to kill them", and the game has been teaching that since the shopping
 * cart in 1-1 and the four-van carpool line in 2-1. Here it is the answer to
 * the boss: the roof is solid, landing on it is safe at any speed, and riding
 * it into the hydrant leaves you standing exactly where the dent goes.
 *
 * The stoops at either end are the other answer, for anyone who would rather
 * watch it go past than get on it — but they only get you through the charge.
 * The dent still has to be made up there.
 *
 * ## What makes the dent
 *
 * A ground pound, which is Berel's and nobody else's (§4). Not a stomp: this
 * is two and a half tons of car, and §6 asks for a dent pounded into a roof.
 * It is the one thing in the game that requires a specific brother, which is
 * why the arena says so twice and why the scene puts the hint over your head
 * if you are stood up there as the wrong one.
 */
export class Escalade extends Phaser.Physics.Arcade.Sprite {
  readonly config: VehicleBossConfig;

  private hitsLeft: number;
  mode: 'waiting' | 'revving' | 'beat' | 'charging' | 'stalled' | 'beaten' = 'waiting';
  private modeEndsAt = 0;
  /** Which way it is pointing, and therefore which end it is heading for. */
  private heading: -1 | 1 = 1;
  /** Is this leg a charge, or the crawl back? Only phase 1 has a crawl. */
  private chargingHard = true;
  private laneLeft = 0;
  private laneRight = 0;
  private opened = false;
  /** When the stall's window actually opens. The crash needs a beat to settle. */
  private dentableFrom = 0;
  private readonly art: ActorSpriteSet | undefined;
  /** The rev, drawn: it shakes on the spot before it goes anywhere. */
  private restX = 0;
  private beacons: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: VehicleBossConfig = VEHICLE_BOSSES.escalade,
  ) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.hitsLeft = config.hits;
    this.restX = x;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(7);

    const body = this.physicsBody;
    body.setSize(config.bodyWidth, config.bodyHeight);
    body.setOffset(0, 0);
    body.setAllowGravity(false);
    // Not immovable, for the reason the carts are not: Arcade skips separation
    // when both bodies are immovable, and every solid in a level is static.
    body.pushable = false;

    this.art = actorArt(config.art);
    if (this.art) {
      applyActorArt(this, this.art, config.bodyWidth, config.bodyHeight);
      playPose(this, this.art, 'phase1');
    } else {
      this.setTint(config.color);
    }
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

  /** Which phase the fight is in, 1-based. Escalates with every dent. */
  get phase(): number {
    return Math.min(this.config.phases, this.config.hits - this.hitsLeft + 1);
  }

  private get stage(): VehicleBossStage {
    return this.config.stages[Math.min(this.phase, this.config.stages.length) - 1]!;
  }

  /**
   * Stalled against the hydrant, and only then.
   *
   * A car you could dent while it was moving would be a car you never have to
   * dodge, and the dodge is the fight.
   */
  get isVulnerable(): boolean {
    return this.mode === 'stalled' && this.isAlive && this.scene.time.now >= this.dentableFrom;
  }

  /**
   * Moving, and therefore lethal to walk into.
   *
   * Standing still it is furniture — you can lean on a parked car. The roof is
   * safe at every moment of the fight, which is the scene's business rather
   * than this flag's.
   */
  get isDangerous(): boolean {
    return (this.mode === 'charging' || this.mode === 'beat') && this.isAlive;
  }

  /** Which way it is pointing. The scene needs it to know which way a crash throws you. */
  get facing(): -1 | 1 {
    return this.heading;
  }

  /** Where it can drive, in pixels: the ends are the two hydrants. */
  setLane(left: number, right: number): void {
    this.laneLeft = left;
    this.laneRight = right;
  }

  tick(now: number): void {
    if (!this.isAlive) {
      this.tickBeaten();
      return;
    }

    if (!this.opened) {
      this.opened = true;
      this.modeEndsAt = now + this.stage.waitMs;
      this.restX = this.x;
    }

    const body = this.physicsBody;
    const stage = this.stage;

    switch (this.mode) {
      case 'waiting':
        body.setVelocityX(0);
        this.setX(this.restX);
        if (now >= this.modeEndsAt) this.startRevving(now);
        break;

      case 'revving':
        body.setVelocityX(0);
        // Shaking on the spot. Without it a rev is an object doing nothing,
        // and a telegraph nobody can see is not a telegraph.
        this.setX(this.restX + Math.sin(now / 22) * 2.2);
        if (now >= this.modeEndsAt) {
          if (stage.beatMs > 0) {
            this.mode = 'beat';
            this.modeEndsAt = now + stage.beatMs;
            this.setX(this.restX);
          } else {
            this.launch(stage);
          }
        }
        break;

      case 'beat':
        // Dead still. §6: the salad goes in the cupholder and the music drops
        // out for one beat. It is dangerous through the beat because she is
        // already going; there is simply nothing left to watch for.
        body.setVelocityX(0);
        this.setX(this.restX);
        if (now >= this.modeEndsAt) this.launch(stage);
        break;

      case 'charging': {
        const speed = this.chargingHard ? stage.chargeSpeed : stage.returnSpeed;
        body.setVelocityX(this.heading * speed);
        if (this.atEndOfLane()) this.clipTheHydrant(now);
        break;
      }

      case 'stalled':
        body.setVelocityX(0);
        if (now >= this.modeEndsAt) {
          this.heading = this.heading === 1 ? -1 : 1;
          this.restX = this.x;
          this.mode = 'waiting';
          // The way back is a charge from phase 2 on (§6: "Reverse"), and a
          // crawl in phase 1, which is what makes phase 1 the one you learn in.
          this.chargingHard = stage.reverseCharges;
          this.modeEndsAt = now + stage.waitMs;
          this.refreshPose();
        }
        break;

      default:
        break;
    }

    this.setFlipX(this.heading < 0);
  }

  private startRevving(now: number): void {
    this.mode = 'revving';
    this.modeEndsAt = now + this.stage.revMs;
    this.restX = this.x;
    this.puff();
  }

  private launch(stage: VehicleBossStage): void {
    this.mode = 'charging';
    this.setX(this.restX);
    this.physicsBody.setVelocityX(
      this.heading * (this.chargingHard ? stage.chargeSpeed : stage.returnSpeed),
    );
  }

  private atEndOfLane(): boolean {
    const half = this.config.bodyWidth / 2;
    return this.heading > 0 ? this.x + half >= this.laneRight : this.x - half <= this.laneLeft;
  }

  /**
   * §6: "it clips a fire hydrant and stalls, and the player gets a window".
   *
   * Everything about the stall is telling you the window is open: it stops
   * dead, the screen shakes, steam comes off it and the hazards come on.
   */
  private clipTheHydrant(now: number): void {
    const half = this.config.bodyWidth / 2;
    this.setX(this.heading > 0 ? this.laneRight - half : this.laneLeft + half);
    this.restX = this.x;
    this.physicsBody.setVelocityX(0);
    this.mode = 'stalled';
    this.modeEndsAt = now + this.stage.stallMs;
    this.dentableFrom = now + this.config.settleMs;

    this.scene.cameras.main.shake(220, 0.011);
    this.steam();
    this.flashHazards(this.stage.stallMs);
  }

  /**
   * A dent. Returns true if that was the last one.
   *
   * Only ever called for a ground pound landed on the roof while it is stalled
   * — the scene owns that rule, because it is the scene that knows which
   * brother is up there.
   */
  takeDent(now: number): boolean {
    if (!this.isVulnerable) return false;
    this.hitsLeft -= 1;
    this.scene.cameras.main.shake(300, 0.016);
    this.scene.cameras.main.flash(90, 255, 255, 255);

    if (this.hitsLeft <= 0) {
      this.driveOff();
      return true;
    }

    // Back to waiting, with the next phase's numbers. The stall it was in is
    // over: a dent is not extra time to stand there.
    this.heading = this.heading === 1 ? -1 : 1;
    this.restX = this.x;
    this.mode = 'waiting';
    this.chargingHard = this.stage.reverseCharges || this.phase === 1;
    this.modeEndsAt = now + this.stage.waitMs;
    this.refreshPose();
    return false;
  }

  /** The drawn sheet has a frame per phase, so the damage is on the car. */
  private refreshPose(): void {
    if (!this.art) return;
    playPose(this, this.art, `phase${Math.min(3, this.phase)}`);
  }

  /**
   * §6: "the roof is dented in, the windows crack, the hazard lights come on,
   * she pulls calmly into a driveway still talking, and the pan of poppers
   * slides out the back hatch. She drives off, never having noticed."
   *
   * She is not told. She does not slow down, speed up or look round. The car
   * simply carries on to the end of the street, which is what it was doing
   * before any of this started.
   */
  private driveOff(): void {
    this.mode = 'beaten';
    if (this.art) playPose(this, this.art, 'beaten');
    this.physicsBody.checkCollision.none = true;
    this.flashHazards(6000);
    this.scene.tweens.add({
      targets: this,
      x: this.heading > 0 ? this.laneLeft - 140 : this.laneRight + 140,
      duration: 3400,
      ease: 'Sine.easeIn',
    });
  }

  private tickBeaten(): void {
    this.physicsBody.setVelocityX(0);
  }

  /** Exhaust, on the rev. */
  private puff(): void {
    const back = this.x - this.heading * (this.config.bodyWidth / 2);
    for (let i = 0; i < 3; i += 1) {
      const smoke = this.scene.add
        .rectangle(back, this.y - 6 - i * 2, 5, 5, 0x6f7aa8, 0.6)
        .setDepth(6);
      this.scene.tweens.add({
        targets: smoke,
        x: back - this.heading * (18 + i * 8),
        y: smoke.y - 12,
        alpha: 0,
        duration: 520 + i * 90,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /** Steam off the bonnet, on the stall. */
  private steam(): void {
    const nose = this.x + this.heading * (this.config.bodyWidth / 2 - 8);
    for (let i = 0; i < 5; i += 1) {
      const puff = this.scene.add
        .rectangle(nose, this.y - this.config.bodyHeight + 4, 6, 6, 0xd7def5, 0.7)
        .setDepth(8);
      this.scene.tweens.add({
        targets: puff,
        y: puff.y - 26 - i * 4,
        x: puff.x + (Math.random() - 0.5) * 18,
        alpha: 0,
        duration: 900 + i * 120,
        delay: i * 90,
        onComplete: () => puff.destroy(),
      });
    }
  }

  /** Hazard lights. On while it is stalled, and on for good once it is done. */
  private flashHazards(durationMs: number): void {
    this.clearBeacons();
    for (const side of [-1, 1] as const) {
      const light = this.scene.add
        .rectangle(
          this.x + side * (this.config.bodyWidth / 2 - 4),
          this.y - this.config.bodyHeight + 10,
          4,
          4,
          0xffa53c,
        )
        .setDepth(9);
      this.beacons.push(light);
      this.scene.tweens.add({
        targets: light,
        alpha: 0.1,
        duration: 260,
        yoyo: true,
        repeat: Math.max(0, Math.round(durationMs / 520)),
        onComplete: () => light.destroy(),
      });
    }
    this.scene.time.delayedCall(durationMs, () => this.clearBeacons());
  }

  private clearBeacons(): void {
    for (const light of this.beacons) {
      this.scene.tweens.killTweensOf(light);
      light.destroy();
    }
    this.beacons = [];
  }

  /** Keep the lights on the car as it moves. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    for (let i = 0; i < this.beacons.length; i += 1) {
      const light = this.beacons[i]!;
      if (!light.active) continue;
      light.x = this.x + (i === 0 ? -1 : 1) * (this.config.bodyWidth / 2 - 4);
      light.y = this.y - this.config.bodyHeight + 10;
    }
  }

  override destroy(fromScene?: boolean): void {
    this.clearBeacons();
    super.destroy(fromScene);
  }
}
