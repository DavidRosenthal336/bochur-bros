import Phaser from 'phaser';
import { BOSSES } from '../config/bosses';
import type { BossConfig } from '../config/bosses';
import { TILE } from '../config/Tuning';
import type { ActorSpriteSet } from '../config/sprites';
import { actorArt, applyActorArt, playPose } from '../util/art';
import { solidTextureKey } from '../util/textures';

/** What the boss wants the level to do for it this frame. */
export type BossRequest = 'none' | 'summon' | 'shockwave';

/**
 * A boss.
 *
 * Bosses are a third category alongside enemies and hazards: they have real
 * health, named phases, and a script rather than a behaviour. The Pigeon King
 * "summons flocks of pigeons, dive-bombs in arcs, and retreats to high perches
 * between attacks" (§6), and that is three states with a rota.
 *
 * Phases exist so the fight gets harder as it goes, and so the final boss can
 * later cycle through the forms of every boss already beaten (§6, World 4).
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly config: BossConfig;

  private hitsLeft: number;
  private phase:
    | 'perched'
    | 'telegraph'
    | 'diving'
    | 'sweeping'
    | 'hovering'
    | 'returning'
    | 'dead' = 'perched';
  /** Set on the first tick, once there is a clock to measure the opening from. */
  private opened = false;
  /** Which way it is skimming at the bottom of the arc. */
  private sweepDirection: -1 | 1 = 1;
  private phaseEndsAt = 0;
  private perchIndex = 0;
  private invulnerableUntil = 0;
  private tell: Phaser.GameObjects.Rectangle | undefined;
  private pendingRequest: BossRequest = 'none';
  /** Where it dives to, chosen when the dive starts. */
  private targetX = 0;
  /**
   * The perch it is flying back to, chosen when it starts flying back.
   *
   * Not simply the next one in the list. See `pickPerch`.
   */
  private targetPerch: Phaser.Math.Vector2 | undefined;
  /**
   * The clear stretch of room he is allowed to dive into and skim along.
   *
   * The sweep is the fight. If it can end inside the scenery then the fight
   * can end inside the scenery, and it did: he swept into the staircase and
   * hung there, embedded in it, with the player pressed against the bottom
   * step sixty pixels away and no way through. Turning at the map edge is not
   * enough, because the map edge is not where the floor stops being floor.
   */
  private lane: { left: number; right: number } | undefined;
  private readonly art: ActorSpriteSet | undefined;
  /**
   * How long the wings-out drawing stays up after a summon.
   *
   * The request itself is read and cleared by the level on the very next
   * frame, so it cannot double as the thing that decides what is drawn — a
   * one-frame pose is a flicker, not a tell.
   */
  private summoningUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BossConfig = BOSSES.pigeonKing) {
    super(scene, x, y, solidTextureKey(scene, config.bodyWidth, config.bodyHeight));
    this.config = config;
    this.hitsLeft = config.hits;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(9);

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

    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isAlive(): boolean {
    return this.phase !== 'dead';
  }

  /** 1 at full health, 0 when beaten. Drives the bar. */
  get healthFraction(): number {
    return this.hitsLeft / this.config.hits;
  }

  /**
   * Can it be hurt right now? Any time it is down at your level: skimming
   * along, or stopped at the end of the skim.
   *
   * Deliberately no longer the same question as `isDangerous`. They were one
   * getter, and tying them together is what kept the fight unfair after the
   * window itself had been made reachable.
   */
  get isVulnerable(): boolean {
    const down = this.phase === 'sweeping' || this.phase === 'hovering';
    return down && this.scene.time.now >= this.invulnerableUntil;
  }

  /**
   * Is touching it right now a hit?
   *
   * Not while it is climbing back to a perch. It leaves along a straight line
   * to wherever the next perch is, which can run directly through the player,
   * and a hit you cannot see coming or move away from is not a fight — it is a
   * toll. Going up is its retreat; the fight is what happens on the way down.
   *
   * And not while it is stopped at the end of the arc either, which is the
   * change that finally made this fight fair. The hover is the answer to the
   * attack, and it cannot also be part of the attack.
   *
   * The knot took a while to see, because every piece of it looked reasonable.
   * He aims where you stand, so the dodge is to move — but moving is what puts
   * you eighty to a hundred and twenty pixels away when the window opens, and
   * a jump from a standing start only carries thirty-five. So the window could
   * only be answered by walking into range first, and walking into him cost
   * you a life by the same four pixels of overlap that make ducking work.
   * Dodging correctly was what put the answer out of reach. Driven from the
   * real game loop that showed up as a hit landing on the first pass and then
   * a death on the second, over and over, at the same pixel.
   *
   * Now: the dive and the skim are the attack, and the moment he pulls up and
   * hangs there is yours. Walk over and jump on him. Which is what the sign in
   * the room has said all along.
   */
  get isDangerous(): boolean {
    return this.phase === 'diving' || this.phase === 'sweeping';
  }

  /** The escalating phase number, 1-based. Later phases move faster. */
  private get intensity(): number {
    const lost = this.config.hits - this.hitsLeft;
    return 1 + Math.floor((lost / this.config.hits) * (this.config.phases - 1));
  }

  /**
   * Park him exactly at the bottom of the arc.
   *
   * The body has to be moved, not the sprite. Arcade owns the body's position
   * and writes it back to the sprite after every step, so assigning `this.y`
   * is undone on the next frame — which left him a couple of pixels below
   * where the config said, and a couple of pixels is the entire margin between
   * a duck that works and a duck that does not.
   */
  private settleAtSweepHeight(): void {
    const body = this.physicsBody;
    body.stop();
    body.y = this.config.floorY - body.height;
    this.y = this.config.floorY;
  }

  /** Read and clear whatever the boss asked the level to do. */
  takeRequest(): BossRequest {
    const request = this.pendingRequest;
    this.pendingRequest = 'none';
    return request;
  }

  /**
   * Tell him the open floor: the span he can dive into and skim along without
   * ending up inside the level. The level works it out, because the level is
   * what knows where its own solids are.
   */
  setLane(left: number, right: number): void {
    const inset = this.config.bodyWidth / 2;
    this.lane = { left: left + inset, right: right - inset };
  }

  tick(now: number, playerX: number, perches: readonly Phaser.Math.Vector2[]): void {
    if (this.phase === 'dead') return;
    if (this.tell) this.tell.setPosition(this.x, this.y - this.config.bodyHeight / 2);

    if (!this.opened) {
      this.opened = true;
      this.phaseEndsAt = now + this.config.openingMs;
    }

    const speedUp = 1 + (this.intensity - 1) * 0.35;

    switch (this.phase) {
      // Note: no early `return` anywhere in here. Bailing out of tick skips
      // the pose update at the bottom, which is how the wings-out summon
      // drawing went unseen for a whole milestone — the boss was summoning
      // pigeons and never once flapping.
      case 'perched': {
        this.physicsBody.setVelocity(0, 0);
        if (now >= this.phaseEndsAt) {
          // Every other turn it calls the flock down instead of coming itself.
          if (this.perchIndex % 2 === 1) {
            this.pendingRequest = 'summon';
            this.summoningUntil = now + 600;
            this.phaseEndsAt = now + this.config.perchMs / speedUp;
            this.perchIndex += 1;
          } else {
            this.phase = 'telegraph';
            this.phaseEndsAt = now + this.config.telegraphMs / speedUp;
            // Aimed at you, but only as far as the open floor goes: stand on
            // the stairs and he comes down beside them rather than into them.
            this.targetX = this.lane
              ? Phaser.Math.Clamp(playerX, this.lane.left, this.lane.right)
              : playerX;
            this.showTell(this.config.telegraphMs / speedUp);
          }
        }
        break;
      }

      case 'telegraph':
        this.physicsBody.setVelocity(0, 0);
        if (now >= this.phaseEndsAt) {
          this.clearTell();
          this.phase = 'diving';
          this.invulnerableUntil = now + 120;
          // Fixed here, where it is unambiguous: the way he is travelling is
          // from his perch toward where he is aiming. Reading it off his
          // velocity at the bottom of the dive does not work, because by then
          // he has converged on his target and is barely moving sideways at
          // all, so the sign is whichever way the rounding fell.
          this.sweepDirection = this.targetX >= this.x ? 1 : -1;
        }
        break;

      case 'diving': {
        /**
         * Cross the gap in exactly the time the fall takes.
         *
         * The dive used to close horizontally at its own fixed rate and end
         * the moment it reached floor height, which meant the two had nothing
         * to do with each other: from a perch across the room he ran out of
         * height long before he ran out of distance, levelled out hundreds of
         * pixels short, swept, and hung there — the whole stompable part of
         * the fight happening somewhere the player was not. Driving the fight
         * from the real game loop, the hover landed 250 to 600px away every
         * time, and 1.2 seconds is not enough to walk 250px. The window was
         * open and simply out of reach, which is exactly what "there's no way
         * to land on him" describes.
         *
         * Deriving the sideways speed from the time left to fall makes the
         * arrival a fact rather than a coincidence: he touches down where he
         * aimed, so if you moved after the tell, he misses by however far you
         * moved, and the beat afterwards happens next to you.
         */
        const fallSpeed = this.config.diveSpeed * 0.55 * speedUp;
        const timeLeft = Math.max(this.config.floorY - this.y, 1) / fallSpeed;
        const dx = this.targetX - this.x;
        const limit = this.config.diveSpeed * 2 * speedUp;
        this.physicsBody.setVelocity(Phaser.Math.Clamp(dx / timeLeft, -limit, limit), fallSpeed);
        if (this.y >= this.config.floorY) {
          // Level out and run past, rather than pulling straight back up. This
          // is the beat the whole fight hangs on: it is the only time his back
          // is somewhere a jump can reach.
          this.settleAtSweepHeight();
          this.phase = 'sweeping';
          this.phaseEndsAt = now + this.config.sweepMs;
          this.pendingRequest = 'shockwave';
        }
        break;
      }

      case 'sweeping': {
        // Flat, with no vertical velocity at all: a sweep that drifts down
        // sinks into the ground, and one that drifts up is gone before you can
        // answer it. The height itself was set once, on arrival.
        // Nothing stops him leaving the room — he has no collider with the
        // level, being a bird — so he turns at the walls himself rather than
        // sweeping off into the dark where the fight cannot follow.
        const arena = this.scene.physics.world.bounds;
        const margin = TILE * 3;
        const left = this.lane?.left ?? arena.x + margin;
        const right = this.lane?.right ?? arena.right - margin;
        if (
          (this.sweepDirection < 0 && this.x <= left) ||
          (this.sweepDirection > 0 && this.x >= right)
        ) {
          this.sweepDirection = (this.sweepDirection * -1) as -1 | 1;
        }
        // Also un-escalated, so the gap he leaves is the same one every time.
        this.physicsBody.setVelocity(this.sweepDirection * this.config.sweepSpeed, 0);
        if (now >= this.phaseEndsAt) {
          this.phase = 'hovering';
          // Not divided by `speedUp`: see the note on `hoverMs`. The window the
          // fight is won in stays the same size in every phase.
          this.phaseEndsAt = now + this.config.hoverMs;
        }
        break;
      }

      case 'hovering': {
        // Stopped, at head height, wings going. Still lethal to walk into —
        // the answer is to come down on top of him, or to duck and wait.
        this.physicsBody.setVelocity(0, 0);
        if (now >= this.phaseEndsAt) {
          this.phase = 'returning';
          this.targetPerch = pickPerch(perches, playerX, this.perchIndex);
        }
        break;
      }

      case 'returning': {
        const perch = this.targetPerch ?? perches[this.perchIndex % perches.length] ?? perches[0];
        if (!perch) break;
        const toX = perch.x - this.x;
        const toY = perch.y - this.y;
        this.physicsBody.setVelocity(
          Phaser.Math.Clamp(toX * 2, -this.config.returnSpeed, this.config.returnSpeed),
          Phaser.Math.Clamp(toY * 2, -this.config.returnSpeed, this.config.returnSpeed),
        );
        if (Math.abs(toX) < 6 && Math.abs(toY) < 6) {
          this.setPosition(perch.x, perch.y);
          this.physicsBody.setVelocity(0, 0);
          this.targetPerch = undefined;
          this.perchIndex += 1;
          this.phase = 'perched';
          this.phaseEndsAt = now + this.config.perchMs / speedUp;
        }
        break;
      }

      default:
        break;
    }

    this.updatePose();
  }

  /**
   * One drawing per phase: perched, wings out to call the flock, folded for a
   * dive. It reads as an attack pattern from across the room, which is the
   * only way a three-phase fight is fair.
   */
  private updatePose(): void {
    const art = this.art;
    if (!art) return;

    if (this.scene.time.now < this.invulnerableUntil && !this.isDangerous) {
      playPose(this, art, 'hurt');
    } else if (this.phase === 'hovering') {
      playPose(this, art, 'wings');
    } else if (this.phase === 'diving' || this.phase === 'sweeping' || this.phase === 'telegraph') {
      playPose(this, art, 'dive');
    } else if (this.scene.time.now < this.summoningUntil) {
      playPose(this, art, 'wings');
    } else {
      playPose(this, art, 'idle');
    }

    const vx = this.physicsBody.velocity.x;
    if (Math.abs(vx) > 2) this.setFlipX(vx < 0);
  }

  /** Stomped. Returns true if that was the last one. */
  takeHit(now: number): boolean {
    if (!this.isVulnerable) return false;

    this.hitsLeft -= 1;
    this.invulnerableUntil = now + 600;
    this.scene.cameras.main.shake(220, 0.01);

    if (this.hitsLeft > 0) {
      this.setTint(0xffffff);
      this.scene.time.delayedCall(140, () => {
        if (!this.isAlive) return;
        if (this.art) this.clearTint();
        else this.setTint(this.config.color);
      });
      // Knocked back up to a perch, and straight into the next round.
      this.phase = 'returning';
      return false;
    }

    this.defeat();
    return true;
  }

  private showTell(durationMs: number): void {
    this.clearTell();
    this.tell = this.scene.add
      .rectangle(this.x, this.y - this.config.bodyHeight / 2, this.config.bodyWidth + 10, this.config.bodyHeight + 10)
      .setStrokeStyle(2, 0xffe9a8)
      .setDepth(10);
    this.scene.tweens.add({
      targets: this.tell,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.25,
      duration: durationMs / 2,
      yoyo: true,
      repeat: -1,
    });
  }

  private clearTell(): void {
    if (!this.tell) return;
    this.scene.tweens.killTweensOf(this.tell);
    this.tell.destroy();
    this.tell = undefined;
  }

  private defeat(): void {
    this.phase = 'dead';
    this.clearTell();
    this.physicsBody.setVelocity(0, 0);
    this.physicsBody.enable = false;
    this.scene.cameras.main.shake(500, 0.014);

    this.scene.tweens.add({
      targets: this,
      angle: 200,
      y: this.y + 40,
      alpha: 0,
      duration: 1100,
      ease: 'Quad.easeIn',
    });
  }

  override destroy(fromScene?: boolean): void {
    this.clearTell();
    super.destroy(fromScene);
  }
}

/**
 * Which perch he retreats to.
 *
 * Going round the list in order reads as a boss with a routine, but it puts
 * him wherever the routine says rather than wherever the player is, and a
 * telegraph you cannot see is not a telegraph. The arena is fifty-six tiles
 * and the view is twenty, so a perch chosen without reference to the player is
 * usually off-screen: he rears up somewhere in the dark, dives, and the first
 * you know of it is the shadow.
 *
 * So: the nearest perch that is not on top of you. `MIN_GAP` keeps him far
 * enough that the rear-up is a warning and not an ambush — the other half of
 * "he just shoots on top of you the second you spawn" — and taking the nearest
 * of what is left keeps him inside the view, so the dive is something you
 * watch coming and answer.
 *
 * `avoid` is the perch he just left, skipped when there is any alternative, so
 * he moves around the room instead of pumping up and down over one spot.
 */
function pickPerch(
  perches: readonly Phaser.Math.Vector2[],
  playerX: number,
  avoid: number,
): Phaser.Math.Vector2 | undefined {
  if (perches.length === 0) return undefined;
  /** Closer than this and the dive lands before the tell has been read. */
  const MIN_GAP = TILE * 5;

  const ranked = perches
    .map((p, i) => ({ p, i, gap: Math.abs(p.x - playerX) }))
    .sort((a, b) => a.gap - b.gap);

  const usable = ranked.filter((r) => r.gap >= MIN_GAP);
  const pool = usable.length > 0 ? usable : ranked.slice().reverse();
  return (pool.find((r) => r.i !== avoid % perches.length) ?? pool[0])?.p;
}
