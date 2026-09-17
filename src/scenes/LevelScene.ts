import Phaser from 'phaser';
import { ENEMIES } from '../config/enemies';
import { CAMERA, FELL_OUT_MARGIN, GAMEPLAY, MENDY, TIERS, TILE } from '../config/Tuning';
import { Block } from '../entities/Block';
import { Enemy } from '../entities/Enemy';
import { Coin, PowerUpPickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { KeyboardInput } from '../input/KeyboardInput';
import type { LevelDef, SolidKind } from '../levels/LevelDef';
import { DEFAULT_LEVEL, LEVELS, LEVEL_ORDER } from '../levels';
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

  private respawnAt = new Phaser.Math.Vector2();
  private coinCount = 0;
  private state: 'playing' | 'dying' | 'complete' = 'playing';

  constructor() {
    super(SceneKey.Level);
  }

  init(data: LevelSceneData): void {
    const key = data.levelKey ?? DEFAULT_LEVEL;
    this.level = LEVELS[key] ?? LEVELS[DEFAULT_LEVEL]!;
    this.coinCount = 0;
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

    this.respawnAt.set(this.level.spawn.x * TILE + TILE / 2, this.level.spawn.y * TILE);
    this.player = new Player(this, this.respawnAt.x, this.respawnAt.y, MENDY);

    this.buildBlocks();
    this.buildCoins();
    this.buildEnemies();
    this.buildCheckpointsAndGoal();
    this.pickups = this.add.group();

    this.registerCollisions();
    this.setUpCamera(widthPx, heightPx);

    this.controls = new KeyboardInput(this);
    this.hud = new Hud(this);
    this.overlay = new DebugOverlay(this, this.player);

    this.keyboard?.on('keydown-R', () => this.respawn());
    this.keyboard?.on('keydown-F3', () => this.cycleLevel());
  }

  override update(_time: number, delta: number): void {
    const step = Math.min(delta, 50);
    this.controls.update();
    this.player.tick(step, this.controls.current);

    const now = this.time.now;
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (enemy.isAlive) enemy.tick(now, this.player.x, this.player.y);
    }
    for (const pickup of this.pickups.getChildren() as PowerUpPickup[]) {
      pickup.tick();
    }

    this.flashWhileInvulnerable(now);
    this.hud.update(this.coinCount, this.power.current);
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

  private buildCheckpointsAndGoal(): void {
    for (const point of this.level.checkpoints ?? []) {
      const post = this.add
        .rectangle(point.x * TILE + TILE / 2, point.y * TILE - 20, 4, 40, 0x6ee7a0, 0.55)
        .setDepth(3);
      this.physics.add.existing(post, true);
      this.physics.add.overlap(this.player, post, () => {
        if (this.respawnAt.x >= post.x) return;
        this.respawnAt.set(point.x * TILE + TILE / 2, point.y * TILE);
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

    this.physics.add.collider(this.player, this.blocks, (_player, blockObject) => {
      this.onBlockCollision(blockObject as Block);
    });

    this.physics.add.overlap(this.player, this.coins, (_player, coinObject) => {
      if ((coinObject as Coin).collect()) this.coinCount += 1;
    });

    this.physics.add.overlap(this.player, this.pickups, (_player, pickupObject) => {
      const pickup = pickupObject as PowerUpPickup;
      if (pickup.collect()) this.power.grant(pickup.grants);
    });

    this.physics.add.overlap(this.player, this.enemies, (_player, enemyObject) => {
      this.onEnemyContact(enemyObject as Enemy);
    });
  }

  // -------------------------------------------------------------------------
  // Interactions
  // -------------------------------------------------------------------------

  /** A block only responds to being hit from underneath. */
  private onBlockCollision(block: Block): void {
    const body = this.player.physicsBody;
    if (!body.blocked.up) return;
    if (block.y > body.top) return;

    const outcome = block.hitFromBelow(this.player.breaksBlocks);
    if (outcome !== 'contents') return;

    if (block.contents === 'coin') {
      this.coinCount += 1;
      this.popCoinFrom(block.x, block.y - TILE);
      return;
    }

    this.pickups.add(
      new PowerUpPickup(this, block.x, block.y - TILE / 2, 'cholent', TIERS.cholent.tint!),
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
    this.player.playDeath();
    this.hud.showBanner('OY');
    this.time.delayedCall(GAMEPLAY.deathPauseMs, () => this.respawn());
  }

  private completeLevel(): void {
    if (this.state !== 'playing') return;
    this.state = 'complete';
    this.player.setControllable(false);
    this.hud.showBanner('L\'CHAIM!\nR to play again');
  }

  private respawn(): void {
    this.hud.hideBanner();
    this.state = 'playing';
    this.power.reset();
    this.player.respawn(this.respawnAt.x, this.respawnAt.y);
    this.player.setTier(this.power.current);
    this.cameras.main.flash(160, 255, 255, 255);
  }

  private cycleLevel(): void {
    const index = LEVEL_ORDER.indexOf(this.level.key);
    const next = LEVEL_ORDER[(index + 1) % LEVEL_ORDER.length]!;
    this.scene.restart({ levelKey: next } satisfies LevelSceneData);
  }

  // -------------------------------------------------------------------------
  // Presentation
  // -------------------------------------------------------------------------

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
