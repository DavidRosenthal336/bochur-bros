import Phaser from 'phaser';
import { ENEMIES } from '../config/enemies';
import type { CharacterId } from '../config/Tuning';
import { CAMERA, DEFAULT_CHARACTER, FELL_OUT_MARGIN, GAMEPLAY, POWERS, TIERS, TILE } from '../config/Tuning';
import { Block } from '../entities/Block';
import { Crate } from '../entities/Crate';
import { Enemy } from '../entities/Enemy';
import { WindZone } from '../entities/Hazard';
import { HAZARDS } from '../config/hazards';
import { Flame } from '../entities/Flame';
import { Coin, PowerUpPickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { KeyboardInput } from '../input/KeyboardInput';
import type { LevelDef, SolidKind } from '../levels/LevelDef';
import { DEFAULT_LEVEL, GREYBOX_LEVELS, LEVELS } from '../levels';
import { findLevel } from '../levels/catalog';
import { completeLevel as recordCompletion, loadSave, writeSave } from '../systems/SaveGame';
import type { PowerTier } from '../systems/PowerState';
import { PowerState } from '../systems/PowerState';
import { solidTextureKey } from '../util/textures';
import { DebugOverlay } from './DebugOverlay';
import { Hud } from './Hud';
import { SceneKey } from './SceneKey';

/** Placeholder palette. Colour carries no meaning to the physics. */
const SOLID_COLORS: Record<SolidKind, number> = {
  ground: 0x3d4466,
  platform: 0x565f8c,
  wall: 0x2b3050,
};

export interface LevelSceneData {
  readonly levelKey?: string;
  /** The catalog id ("1-1") this play belongs to. Absent for greybox levels. */
  readonly levelId?: string;
  /** True when this is an instrument rather than part of the game. */
  readonly greybox?: boolean;
  /** Carried across a death, so the coin total is not lost with the life. */
  readonly coins?: number;
  /** The checkpoint to come back to, in pixels. Omitted means the level start. */
  readonly respawnX?: number;
  readonly respawnY?: number;
  /** Who was being controlled when the last life ended. */
  readonly character?: CharacterId;
  /** Lives left, carried across a death restart. */
  readonly lives?: number;
}

/**
 * Plays one level.
 *
 * Everything in here is driven by the `LevelDef` it is handed — geometry,
 * coins, boxes, enemies, checkpoints, the goal. Nothing about a specific level
 * is written into this class, which is what lets Milestone 4 swap the source
 * of those definitions to Tiled without touching gameplay code.
 */
export class LevelScene extends Phaser.Scene {
  private level!: LevelDef;
  private player!: Player;
  private controls!: KeyboardInput;
  private overlay!: DebugOverlay;
  private hud!: Hud;
  private power!: PowerState;

  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private blocks!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.GameObjects.Group;
  private enemies!: Phaser.GameObjects.Group;
  private pickups!: Phaser.GameObjects.Group;
  private crates!: Phaser.GameObjects.Group;
  private flames!: Phaser.GameObjects.Group;
  private winds: WindZone[] = [];
  private lives: number = GAMEPLAY.startingLives;
  private wasGrounded = true;
  private lastFallSpeed = 0;

  private respawnAt = new Phaser.Math.Vector2();
  private coinCount = 0;
  private state: 'playing' | 'dying' | 'complete' = 'playing';
  /** Where the checkpoint was when this attempt started, carried in from the last one. */
  private carriedRespawn: { x: number; y: number } | null = null;
  /** §7 stores "character last used", so a death does not silently swap you back. */
  private carriedCharacter: CharacterId = DEFAULT_CHARACTER;
  /** Which catalog entry this play counts towards, if any. */
  private levelId: string | undefined;
  private greybox = false;

  constructor() {
    super(SceneKey.Level);
  }

  init(data: LevelSceneData): void {
    const key = data.levelKey ?? DEFAULT_LEVEL;
    this.level = LEVELS[key] ?? LEVELS[DEFAULT_LEVEL]!;
    this.coinCount = data.coins ?? 0;
    this.carriedRespawn =
      data.respawnX !== undefined && data.respawnY !== undefined
        ? { x: data.respawnX, y: data.respawnY }
        : null;
    this.carriedCharacter = data.character ?? DEFAULT_CHARACTER;
    this.lives = data.lives ?? loadSave().lives;
    this.levelId = data.levelId;
    this.greybox = data.greybox ?? GREYBOX_LEVELS.includes(key);
    this.state = 'playing';
  }

  create(): void {
    const widthPx = this.level.widthInTiles * TILE;
    const heightPx = this.level.heightInTiles * TILE;

    this.cameras.main.setBackgroundColor(this.level.backgroundColor);
    // The world floor sits well below the level so a missed jump falls out of
    // it rather than landing on an invisible surface.
    this.physics.world.setBounds(0, 0, widthPx, heightPx + 400);

    this.drawGrid(widthPx, heightPx);
    this.buildSolids();
    this.drawLabels();

    this.power = new PowerState();
    this.power.on('changed', (tier: Parameters<Player['setTier']>[0]) => {
      this.player.setTier(tier);
      this.cameras.main.flash(90, 255, 255, 255);
    });

    this.respawnAt.set(
      this.carriedRespawn?.x ?? this.level.spawn.x * TILE + TILE / 2,
      this.carriedRespawn?.y ?? this.level.spawn.y * TILE,
    );
    this.player = new Player(this, this.respawnAt.x, this.respawnAt.y, this.carriedCharacter);

    this.buildBlocks();
    this.buildCoins();
    this.buildEnemies();
    this.buildCrates();
    this.buildHazards();
    this.buildCheckpointsAndGoal();
    this.pickups = this.add.group();
    this.flames = this.add.group();

    this.registerCollisions();
    this.setUpCamera(widthPx, heightPx);

    this.controls = new KeyboardInput(this);
    this.hud = new Hud(this);
    this.overlay = new DebugOverlay(this, this.player);

    this.applyCharacterToWorld();

    this.keyboard?.on('keydown-R', () =>
      this.state === 'complete' ? this.restartFromStart() : this.restartFromCheckpoint(),
    );
    this.keyboard?.on('keydown-F3', () => this.cycleLevel());
    this.keyboard?.on('keydown-ESC', () => this.toWorldMap());
    this.keyboard?.on('keydown-SPACE', () => {
      if (this.state === 'complete' && !this.greybox) this.toWorldMap();
    });
  }

  override update(_time: number, delta: number): void {
    const step = Math.min(delta, 50);
    const now = this.time.now;
    this.controls.update();

    if (this.controls.current.swapPressed && this.state === 'playing') {
      this.swapCharacter();
    }

    this.player.tick(step, this.controls.current);
    this.applyWind(step / 1000);
    this.updateCrates();
    this.updatePowers(now);

    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (enemy.isAlive) enemy.tick(now, this.player.x, this.player.y);
    }
    for (const pickup of this.pickups.getChildren() as PowerUpPickup[]) {
      pickup.tick();
    }

    this.watchForLanding();
    this.updateCameraLookAhead();
    this.flashWhileInvulnerable(now);
    this.hud.update(this.coinCount, this.power.current, this.player.character, this.lives);
    this.overlay.update();

    if (
      this.state === 'playing' &&
      this.player.y > this.level.heightInTiles * TILE + FELL_OUT_MARGIN
    ) {
      this.killPlayer();
    }
  }

  // -------------------------------------------------------------------------
  // Building the level
  // -------------------------------------------------------------------------

  private buildSolids(): void {
    this.solids = this.physics.add.staticGroup();

    for (const def of this.level.solids) {
      const w = def.w * TILE;
      const h = def.h * TILE;
      const rect = this.add.rectangle(
        def.x * TILE + w / 2,
        def.y * TILE + h / 2,
        w,
        h,
        SOLID_COLORS[def.kind ?? 'ground'],
      );
      // A lighter top edge, so the surface you can actually land on reads clearly.
      this.add.rectangle(def.x * TILE + w / 2, def.y * TILE + 1, w, 2, 0x8d97c9).setDepth(1);
      this.solids.add(rect);
    }
  }

  private buildBlocks(): void {
    this.blocks = this.physics.add.staticGroup();
    for (const def of this.level.blocks ?? []) {
      this.blocks.add(
        new Block(
          this,
          def.x * TILE + TILE / 2,
          def.y * TILE + TILE / 2,
          def.kind,
          def.contents ?? 'coin',
        ),
        true,
      );
    }
  }

  private buildCoins(): void {
    this.coins = this.add.group();
    for (const def of this.level.coins ?? []) {
      this.coins.add(new Coin(this, def.x * TILE + TILE / 2, def.y * TILE + TILE / 2));
    }
  }

  private buildEnemies(): void {
    this.enemies = this.add.group();
    for (const def of this.level.enemies ?? []) {
      const config = ENEMIES[def.kind];
      this.enemies.add(new Enemy(this, def.x * TILE + TILE / 2, def.y * TILE, config));
    }
  }

  private buildCrates(): void {
    this.crates = this.add.group();
    for (const point of this.level.crates ?? []) {
      this.crates.add(new Crate(this, point.x * TILE + TILE / 2, point.y * TILE));
    }
  }

  private buildHazards(): void {
    this.winds = [];
    for (const placement of this.level.hazards ?? []) {
      const config = HAZARDS[placement.kind];
      this.winds.push(
        new WindZone(
          this,
          placement.x,
          placement.y,
          placement.w,
          placement.h,
          placement.direction,
          config,
        ),
      );
    }
  }

  private buildCheckpointsAndGoal(): void {
    for (const point of this.level.checkpoints ?? []) {
      const x = point.x * TILE + TILE / 2;
      // A checkpoint carried in from a previous life shows as already taken.
      const alreadyTaken = this.respawnAt.x >= x;
      const post = this.add
        .rectangle(x, point.y * TILE - 20, 4, 40, 0x6ee7a0, alreadyTaken ? 1 : 0.55)
        .setDepth(3);
      this.physics.add.existing(post, true);
      this.physics.add.overlap(this.player, post, () => {
        if (this.respawnAt.x >= x) return;
        this.respawnAt.set(x, point.y * TILE);
        post.setFillStyle(0x6ee7a0, 1);
      });
    }

    const goal = this.level.goal;
    if (!goal) return;
    const post = this.add
      .rectangle(goal.x * TILE + TILE / 2, goal.y * TILE - 48, 6, 96, 0xf2c14e)
      .setDepth(3);
    this.physics.add.existing(post, true);
    this.physics.add.overlap(this.player, post, () => this.completeLevel());
  }

  private registerCollisions(): void {
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.pickups, this.solids);
    this.physics.add.collider(this.pickups, this.blocks);
    this.physics.add.collider(this.crates, this.solids);
    this.physics.add.collider(this.crates, this.blocks);
    this.physics.add.collider(this.crates, this.crates);
    this.physics.add.collider(this.flames, this.solids);
    this.physics.add.collider(this.flames, this.blocks);
    this.physics.add.collider(this.flames, this.crates);

    this.physics.add.overlap(this.flames, this.enemies, (flameObject, enemyObject) => {
      const flame = flameObject as Flame;
      const enemy = enemyObject as Enemy;
      if (flame.isSpent || !enemy.isAlive) return;
      flame.gutter();
      enemy.knockAway(flame.physicsBody.velocity.x >= 0 ? 1 : -1, POWERS.lulav.knockAway * 0.6);
    });
    this.physics.add.collider(this.player, this.crates);

    this.physics.add.collider(this.player, this.blocks, (_player, blockObject) => {
      this.onBlockCollision(blockObject as Block);
    });

    this.physics.add.overlap(this.player, this.coins, (_player, coinObject) => {
      if ((coinObject as Coin).collect()) this.collectCoins(1);
    });

    this.physics.add.overlap(this.player, this.pickups, (_player, pickupObject) => {
      const pickup = pickupObject as PowerUpPickup;
      if (!pickup.collect()) return;
      if (pickup.givesLife) this.grantLife();
      else this.power.grant(pickup.grants);
    });

    this.physics.add.overlap(this.player, this.enemies, (_player, enemyObject) => {
      this.onEnemyContact(enemyObject as Enemy);
    });
  }

  // -------------------------------------------------------------------------
  // Interactions
  // -------------------------------------------------------------------------

  /**
   * Blocks respond to a headbutt from below, and weak floors to a slam from
   * above. Which of the two applies is decided by where the player is.
   */
  private onBlockCollision(block: Block): void {
    const body = this.player.physicsBody;

    if (this.player.isGroundPounding && block.y > body.top) {
      block.hitFromAbove(this.player.abilities.groundPound);
      return;
    }

    if (!body.blocked.up) return;
    if (block.y > body.top) return;

    const outcome = block.hitFromBelow(
      this.player.breaksBlocks,
      this.player.abilities.breaksReinforced,
    );
    if (outcome !== 'contents') return;

    if (block.contents === 'coin') {
      this.collectCoins(1);
      this.popCoinFrom(block.x, block.y - TILE);
      return;
    }

    if (block.contents === 'lchaim') {
      this.pickups.add(new PowerUpPickup(this, block.x, block.y - TILE / 2, 'small', 0xe4f0ff, true));
      return;
    }

    const tier = block.contents as PowerTier;
    this.pickups.add(
      new PowerUpPickup(this, block.x, block.y - TILE / 2, tier, TIERS[tier].tint ?? 0xffffff),
    );
  }

  /**
   * Landing on an enemy from above defeats it; walking into one costs a tier.
   * The test is the player's feet against the enemy's midline, plus a genuine
   * downward velocity, so clipping a wing on the way up does not count.
   */
  private onEnemyContact(enemy: Enemy): void {
    if (this.state !== 'playing' || !enemy.isAlive) return;

    const body = this.player.physicsBody;
    const falling = body.velocity.y > GAMEPLAY.stompMinFallSpeed;
    const aboveMidline =
      body.bottom <= enemy.physicsBody.center.y + GAMEPLAY.stompFootMargin;

    if (enemy.config.stompable && falling && aboveMidline) {
      enemy.stomp();
      this.player.bounce(
        this.controls.current.jumpHeld ? GAMEPLAY.stompBounceHeld : GAMEPLAY.stompBounce,
      );
      return;
    }

    this.hurtPlayer(enemy.x);
  }

  /**
   * Leaning on a crate moves it.
   *
   * Contact is tested by position rather than by the collider callback. Two
   * bodies that are separating and re-touching only report a collision every
   * few frames, and each of those nudges was being eaten by the crate's drag
   * before the next one arrived — the crate crawled about a pixel a second.
   * A small positional tolerance keeps the shove continuous while someone is
   * actually leaning on it.
   */
  private updateCrates(): void {
    const dir = this.controls.current.moveX;
    if (dir === 0 || this.state !== 'playing') return;

    const body = this.player.physicsBody;
    const TOLERANCE = 3;

    for (const crate of this.crates.getChildren() as Crate[]) {
      if (!crate.canBeShoved) continue;
      const box = crate.physicsBody;

      const sideBySide = body.bottom > box.top + 2 && body.top < box.bottom - 2;
      if (!sideBySide) continue;

      const leaningRight = dir > 0 && Math.abs(box.left - body.right) <= TOLERANCE;
      const leaningLeft = dir < 0 && Math.abs(body.left - box.right) <= TOLERANCE;
      if (!leaningRight && !leaningLeft) continue;

      crate.shove(dir, GAMEPLAY.cratePushSpeed);
    }
  }

  /**
   * Put the other brother in this one's place. Instant and free (§4); the only
   * refusal is not having room for the larger body.
   */
  private swapCharacter(): void {
    const next: CharacterId = this.player.character === 'mendy' ? 'berel' : 'mendy';
    if (!this.player.setCharacter(next)) {
      this.cameras.main.shake(70, 0.004);
      return;
    }
    this.applyCharacterToWorld();
    this.cameras.main.flash(60, 180, 200, 255);
  }

  /** Re-evaluate anything in the level that cares about who is active. */
  private applyCharacterToWorld(): void {
    const canPush = this.player.abilities.pushesCrates;
    for (const crate of this.crates.getChildren() as Crate[]) {
      crate.setShovable(canPush);
    }
  }

  /** Wind acts on a region, so it is checked by position rather than collision. */
  private applyWind(dt: number): void {
    if (this.state !== 'playing' || this.winds.length === 0) return;
    const body = this.player.physicsBody;
    for (const wind of this.winds) {
      if (wind.contains(body)) this.player.applyWind(wind.force, dt);
    }
  }

  /**
   * Everything the power forms do, once a frame.
   *
   * The forms deliberately share no code beyond this dispatch: §5 gives each
   * one a different job — Menorah throws, Lulav swings, Peyos flies — and
   * collapsing them into a single "attack" would lose the thing that makes
   * choosing between them a decision.
   */
  private updatePowers(now: number): void {
    if (this.state !== 'playing') return;

    switch (this.player.takeAction(now, this.controls.current)) {
      case 'flame':
        this.fireFlame();
        break;
      case 'swing':
        this.cameras.main.shake(60, 0.002);
        break;
      case 'none':
        break;
    }

    for (const flame of this.flames.getChildren() as Flame[]) flame.tick();
    this.applySwing();
  }

  private fireFlame(): void {
    const live = (this.flames.getChildren() as Flame[]).filter((flame) => !flame.isSpent);
    if (live.length >= POWERS.menorah.maxFlames) return;

    const { x, y, direction } = this.player.muzzle;
    this.flames.add(new Flame(this, x, y, direction));
  }

  /** The Lulav arc, while it is live, against anything standing in it. */
  private applySwing(): void {
    const area = this.player.swingArea;
    if (!area) return;

    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (!enemy.isAlive) continue;
      const body = enemy.physicsBody;
      const box = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (!Phaser.Geom.Rectangle.Overlaps(area, box)) continue;
      enemy.knockAway(this.player.facingDirection, POWERS.lulav.knockAway);
    }
  }

  /** §5: a Cholent landing from a height stuns everything nearby. */
  private applyCholentLandingStun(impactSpeed: number): void {
    if (this.power.current !== 'cholent') return;
    if (impactSpeed < POWERS.cholent.stunFallSpeed) return;

    let stunned = 0;
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (!enemy.isAlive) continue;
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) >
        POWERS.cholent.stunRadius) continue;
      enemy.stun(this.time.now, POWERS.cholent.stunMs);
      stunned += 1;
    }
    if (stunned > 0) this.cameras.main.shake(180, 0.006);
  }

  /** §5: 100 tzedakah coins buy a life, and the counter starts again. */
  private collectCoins(amount: number): void {
    this.coinCount += amount;
    while (this.coinCount >= GAMEPLAY.coinsPerLife) {
      this.coinCount -= GAMEPLAY.coinsPerLife;
      this.grantLife();
    }
  }

  private grantLife(): void {
    this.lives += 1;
    this.hud.flashLife();
  }

  private hurtPlayer(fromX: number): void {
    const outcome = this.power.takeHit(this.time.now);
    if (outcome === 'ignored') return;
    if (outcome === 'died') {
      this.killPlayer();
      return;
    }
    this.player.recoil(fromX);
    this.cameras.main.shake(140, 0.007);
  }

  private killPlayer(): void {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.lives -= 1;
    this.player.playDeath();

    if (this.lives <= 0) {
      this.hud.showBanner('GAME OVER\nSPACE for the map');
      this.time.delayedCall(GAMEPLAY.deathPauseMs, () => {
        this.state = 'complete'; // lets SPACE take you back to the map
      });
      return;
    }

    this.hud.showBanner('OY');
    this.time.delayedCall(GAMEPLAY.deathPauseMs, () => this.restartFromCheckpoint());
  }

  /**
   * Reached the goal.
   *
   * §7: auto-save after every completed level, to localStorage, with no manual
   * save anywhere. That happens here and nowhere else.
   */
  private completeLevel(): void {
    if (this.state !== 'playing') return;
    this.state = 'complete';
    this.player.setControllable(false);

    if (this.levelId) {
      const entry = findLevel(this.levelId);
      const save = recordCompletion(loadSave(), this.levelId);
      writeSave({
        ...save,
        coins: save.coins + this.coinCount,
        character: this.player.character,
        lives: this.lives,
      });
      this.hud.showBanner(
        entry?.isBoss === true ? 'YOU GOT IT BACK!\nSPACE for the map' : "L'CHAIM!\nSPACE for the map",
      );
    } else {
      this.hud.showBanner("L'CHAIM!\nR to play again");
    }
  }

  /**
   * Come back from a death.
   *
   * The whole level is rebuilt, not just the player moved: an opened mystery
   * box, a stomped pigeon and a collected coin all come back. Anything else
   * and a death can strand you — spend the level's only Cholent box, die, and
   * there is no way to get big again. The coin total and the checkpoint you
   * reached are the two things that survive.
   */
  private restartFromCheckpoint(): void {
    this.scene.restart({
      levelKey: this.level.key,
      coins: this.coinCount,
      respawnX: this.respawnAt.x,
      respawnY: this.respawnAt.y,
      character: this.player.character,
      lives: this.lives,
    } satisfies LevelSceneData);
  }

  /** Start the level over from the top, with nothing carried. */
  private restartFromStart(): void {
    this.scene.restart({ levelKey: this.level.key } satisfies LevelSceneData);
  }

  /** F3 cycles the greybox instruments, which are not part of the game proper. */
  private cycleLevel(): void {
    const index = GREYBOX_LEVELS.indexOf(this.level.key);
    const next = GREYBOX_LEVELS[(index + 1) % GREYBOX_LEVELS.length]!;
    this.scene.restart({ levelKey: next, greybox: true } satisfies LevelSceneData);
  }

  private toWorldMap(): void {
    this.scene.start(SceneKey.WorldMap);
  }

  // -------------------------------------------------------------------------
  // Presentation
  // -------------------------------------------------------------------------

  /**
   * Watch for the frame the player touches down, and how hard.
   *
   * Tracked here rather than in Player because the consequence — stunning
   * everything nearby — is a fact about the level, not about the character.
   */
  private watchForLanding(): void {
    const grounded = this.player.isGrounded;
    if (grounded && !this.wasGrounded) {
      this.applyCholentLandingStun(this.lastFallSpeed);
    }
    this.wasGrounded = grounded;
    if (!grounded) this.lastFallSpeed = this.player.physicsBody.velocity.y;
  }

  /**
   * Lead the camera in the direction of travel.
   *
   * Phaser's follow offset is subtracted from the target, so a negative x
   * shifts the view to the right — which is what shows more of what is coming.
   * The swing is slow on purpose: a camera that snaps on every turn is worse
   * than one that never moves.
   */
  private updateCameraLookAhead(): void {
    const vx = this.player.physicsBody.velocity.x;
    if (Math.abs(vx) < 12) return;

    const camera = this.cameras.main;
    const target = -Math.sign(vx) * CAMERA.lookAhead;
    camera.setFollowOffset(
      Phaser.Math.Linear(camera.followOffset.x, target, CAMERA.lookAheadLerp),
      CAMERA.offsetY,
    );
  }

  /** Blink while the post-hit grace period is running, so it is visible. */
  private flashWhileInvulnerable(now: number): void {
    if (this.state !== 'playing') {
      this.player.setAlpha(1);
      return;
    }
    this.player.setAlpha(this.power.isInvulnerable(now) && Math.floor(now / 70) % 2 === 0 ? 0.35 : 1);
  }

  private popCoinFrom(x: number, y: number): void {
    const coin = this.add.image(x, y, solidTextureKey(this, 8, 10)).setTint(0xf2c14e).setDepth(6);
    this.tweens.add({
      targets: coin,
      y: y - 26,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => coin.destroy(),
    });
  }

  private drawGrid(widthPx: number, heightPx: number): void {
    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0xffffff, 0.045);
    for (let x = 0; x <= widthPx; x += TILE) grid.lineBetween(x, 0, x, heightPx);
    for (let y = 0; y <= heightPx; y += TILE) grid.lineBetween(0, y, widthPx, y);
    grid.strokePath();
  }

  private drawLabels(): void {
    for (const label of this.level.labels) {
      this.add
        .text(label.x * TILE, label.y * TILE, label.text, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#7f8bbd',
        })
        .setDepth(5);
    }
  }

  private setUpCamera(widthPx: number, heightPx: number): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, widthPx, heightPx);
    camera.startFollow(this.player, true, CAMERA.lerpX, CAMERA.lerpY);
    camera.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    camera.setFollowOffset(0, CAMERA.offsetY);
  }

  private get keyboard(): Phaser.Input.Keyboard.KeyboardPlugin | null {
    return this.input.keyboard ?? null;
  }
}
