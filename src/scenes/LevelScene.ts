import Phaser from 'phaser';
import { ENEMIES } from '../config/enemies';
import type { CharacterId } from '../config/Tuning';
import type { BackdropLayer } from '../config/scenery';
import { BACKDROPS, DEFAULT_BACKDROP, sceneryArt, tallSky } from '../config/scenery';
import type { SceneryName, BackdropVariant } from '../config/scenery';
import {
  CAMERA,
  DEFAULT_CHARACTER,
  FELL_OUT_MARGIN,
  GAMEPLAY,
  POWERS,
  TIERS,
  TILE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../config/Tuning';
import { Block } from '../entities/Block';
import { Crate } from '../entities/Crate';
import { Enemy } from '../entities/Enemy';
import { WindZone } from '../entities/Hazard';
import { MovingHazard } from '../entities/MovingHazard';
import { Boss } from '../entities/Boss';
import { Thief } from '../entities/Thief';
import { ENEMIES as ENEMY_TABLE } from '../config/enemies';
import { HAZARDS } from '../config/hazards';
import { Flame } from '../entities/Flame';
import { Coin, PowerUpPickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { KeyboardInput } from '../input/KeyboardInput';
import type { LevelDef, SolidKind } from '../levels/LevelDef';
import { DEFAULT_LEVEL, GREYBOX_LEVELS, PROLOGUE_LEVEL, LEVELS } from '../levels';
import { findLevel, worldOf } from '../levels/catalog';
import { completeLevel as recordCompletion, loadSave, writeSave } from '../systems/SaveGame';
import type { PowerTier } from '../systems/PowerState';
import { PowerState } from '../systems/PowerState';
import { solidTextureKey } from '../util/textures';
import { DebugOverlay } from './DebugOverlay';
import { Hud } from './Hud';
import { SceneKey } from './SceneKey';

/** Which drawn prize hangs on the goal post, by the world's kiddush item. */
const GOAL_ART = {
  meat_board: 'goal',
  poppers: 'goalPoppers',
  kugel: 'goalKugel',
  tequila: 'goalTequila',
} as const satisfies Record<string, SceneryName>;

/** Fallback palette, used only if the tileset failed to load. */
const SOLID_COLORS: Record<SolidKind, number> = {
  ground: 0x3d4466,
  platform: 0x565f8c,
  wall: 0x2b3050,
};

/**
 * How each kind of solid is tiled: the surface you land on, and the fill under
 * it.
 *
 * Splitting the two is what makes a platform readable at a glance — the top
 * row is the thing you can stand on, and it wants to look different from the
 * mass beneath it. It was a lighter-coloured strip in greybox for exactly the
 * same reason.
 */
type TileSet = Record<SolidKind, { readonly top: string; readonly fill: string }>;

const BORO_PARK: TileSet = {
  ground: { top: 'tile-sidewalk', fill: 'tile-asphalt' },
  platform: { top: 'tile-scaffoldPlank', fill: 'tile-brick' },
  wall: { top: 'tile-brick', fill: 'tile-brick' },
};

/**
 * Lawn over driveway, decking over siding, hedge for a wall.
 *
 * A neighbourhood is mostly its ground. Boro Park's pavement-over-asphalt says
 * city before a single enemy appears, and The Five Towns has to do the same
 * job with grass — §6 calls it "open, manicured, quiet", and manicured is a
 * thing you read off the floor.
 */
const FIVE_TOWNS: TileSet = {
  ground: { top: 'tile-lawn', fill: 'tile-driveway' },
  platform: { top: 'tile-deck', fill: 'tile-siding' },
  wall: { top: 'tile-hedge', fill: 'tile-hedge' },
};

/**
 * Which tiles a level is built from, chosen by its sky.
 *
 * The backdrop already names the neighbourhood, so it is the one place a level
 * has to say where it is — anything else would be a second field to keep in
 * step with the first.
 */
function tilesFor(backdrop: BackdropVariant): TileSet {
  if (backdrop.startsWith('five_towns')) return FIVE_TOWNS;
  return BORO_PARK;
}

export interface LevelSceneData {
  readonly levelKey?: string;
  /** The catalog id ("1-1") this play belongs to. Absent for greybox levels. */
  readonly levelId?: string;
  /** True when this is an instrument rather than part of the game. */
  readonly greybox?: boolean;
  /**
   * True for the prologue, which is a level in every mechanical sense and none
   * of the bookkeeping ones: it is not in the catalog, unlocks nothing, and
   * records only that it has been watched.
   */
  readonly prologue?: boolean;
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

  /**
   * The parallax layers behind the street, back to front, each paired with how
   * fast it moves. Empty in greybox levels.
   */
  private backdrop: { readonly sprite: Phaser.GameObjects.TileSprite; readonly layer: BackdropLayer }[] = [];
  /**
   * Where the backdrop lines up with the level, in screen pixels, and the
   * camera position that alignment is measured from.
   *
   * The layers are drawn so their base sits on the pavement — the shopfronts
   * and awnings along the bottom of each layer are meant to meet the street,
   * not the bottom of the screen. Anchoring them to the view instead buries
   * that whole band under the road surface.
   */
  private backdropRestY = 0;
  private backdropRestScrollY = 0;

  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private blocks!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.GameObjects.Group;
  private enemies!: Phaser.GameObjects.Group;
  private pickups!: Phaser.GameObjects.Group;
  private crates!: Phaser.GameObjects.Group;
  private flames!: Phaser.GameObjects.Group;
  private winds: WindZone[] = [];
  private hazards!: Phaser.GameObjects.Group;
  private bouncers!: Phaser.Physics.Arcade.StaticGroup;
  /** The hazard the player is currently standing on, if any. */
  private riding: MovingHazard | undefined;
  private boss: Boss | undefined;
  private thief: Thief | undefined;
  private prologue = false;
  private perches: Phaser.Math.Vector2[] = [];
  /** Seconds left, on the levels that have a clock (§7). */
  private secondsLeft: number | undefined;
  /** How far the level has scrolled itself along, px. */
  private autoScrollX = 0;
  /** Where the rising camera has got to, px. Only ever decreases. */
  private autoScrollY = 0;
  /**
   * When the rising camera's own clock starts, ms.
   *
   * A life begins with the player standing still, and without this the screen
   * is already taking their ground away — measured, standing still at the
   * start of 1-2 was a death in three and a bit seconds, before anybody has
   * worked out which way is up. The ratchet still follows a player who moves
   * immediately; it is only the clock that waits.
   *
   * Counted down from the frame delta rather than read off `time.now`, which
   * is not yet meaningful in `create()` — set from it, the grace expired
   * before the first frame and the camera rose from the off.
   */
  private riseGraceLeft = 0;
  /**
   * How far to move a pursuing hazard along, so it resumes the same distance
   * behind the player as it started. Only ever non-zero on a chase level
   * restarted from a checkpoint.
   */
  private hazardOffsetX = 0;
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
    this.secondsLeft = this.levelId ? findLevel(this.levelId)?.timeLimit : undefined;
    this.autoScrollX = 0;
    this.autoScrollY = 0;
    this.greybox = data.greybox ?? GREYBOX_LEVELS.includes(key);
    this.prologue = data.prologue ?? key === PROLOGUE_LEVEL;
    this.state = 'playing';
  }

  create(): void {
    const widthPx = this.level.widthInTiles * TILE;
    const heightPx = this.level.heightInTiles * TILE;

    this.cameras.main.setBackgroundColor(this.level.backgroundColor);
    // The world floor sits well below the level so a missed jump falls out of
    // it rather than landing on an invisible surface.
    this.physics.world.setBounds(0, 0, widthPx, heightPx + 400);

    // Same reason as the boss below: the scene instance outlives the level, so
    // anything not rebuilt every time has to be cleared every time.
    this.backdrop = [];
    this.riding = undefined;

    // The tile grid is an instrument, not scenery: it belongs in the greybox
    // test levels and nowhere near a level with drawn art behind it.
    if (this.greybox) this.drawGrid(widthPx, heightPx);
    else this.drawBackdrop();
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

    /**
     * How far into the level this life begins, compared with the level's own
     * start. Zero on a first attempt, a checkpoint's worth on a later one.
     *
     * An auto-scrolling level has to be told: the scroll is driven by a clock,
     * not by the player, so restarting it at zero left the camera crawling up
     * the level from the beginning while the player stood at the checkpoint
     * far off the right-hand edge, waiting for the screen to arrive. The
     * checkpoint was working perfectly and looked completely broken.
     */
    const resumedAt = this.carriedRespawn
      ? this.respawnAt.x - (this.level.spawn.x * TILE + TILE / 2)
      : 0;
    if (this.level.autoScroll && resumedAt > 0) {
      // A quarter of a screen in from the left, which is where the chase has
      // you at the level's own start. Only on a resumed life: a first attempt
      // must open where the level was designed to open.
      this.autoScrollX = Phaser.Math.Clamp(
        this.respawnAt.x - VIEW_WIDTH * 0.25,
        0,
        Math.max(0, widthPx - VIEW_WIDTH),
      );
    }
    this.hazardOffsetX = this.level.autoScroll ? resumedAt : 0;

    /**
     * Where the rising camera starts.
     *
     * The bottom of the level on a first attempt, and just under the
     * checkpoint on a resumed life — otherwise the screen restarts at the
     * ground while the player stands forty tiles up, and the climb they are
     * standing on scrolls past them before they can move. The same mistake
     * 1-3's horizontal scroll shipped with.
     */
    if (this.level.autoScrollUp) {
      const lowest = Math.max(0, heightPx - VIEW_HEIGHT);
      this.autoScrollY = Phaser.Math.Clamp(
        this.respawnAt.y - VIEW_HEIGHT * CAMERA.risingFollow,
        0,
        lowest,
      );
      this.riseGraceLeft = CAMERA.riseGraceMs;
    }

    this.buildBlocks();
    this.buildCoins();
    this.buildEnemies();
    this.buildCrates();
    this.buildHazards();
    this.buildBouncers();
    this.buildBoss();
    this.buildThief();
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
    this.keyboard?.on('keydown-ESC', () => {
      // Skipping the prologue still counts as having seen it. Otherwise it
      // reappears every launch until it is sat through, which is the surest
      // way to make somebody resent it.
      if (this.prologue) writeSave({ ...loadSave(), introSeen: true });
      this.toWorldMap();
    });
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
    this.updateHazards(now);
    this.updateBoss(now);
    this.dismissFlock(now);
    this.thief?.tick(step, this.player.x);
    this.watchForTheGetaway();
    this.updateClock(delta);
    this.updateAutoScroll(delta);
    this.updateRisingCamera(delta);

    this.watchForLanding();
    this.updateCameraLookAhead();
    this.updateBackdrop();
    this.flashWhileInvulnerable(now);
    this.hud.update(
      this.coinCount,
      this.power.current,
      this.player.character,
      this.lives,
      this.secondsLeft,
    );
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
      const kind = def.kind ?? 'ground';
      const x = def.x * TILE;
      const y = def.y * TILE;

      // The rectangle stays: it is what carries the static body, and keeping
      // collision separate from decoration means the drawing can change
      // without any risk of the hitbox moving with it.
      const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, SOLID_COLORS[kind]);
      this.solids.add(rect);

      const tiles = tilesFor(this.level.backdrop ?? DEFAULT_BACKDROP)[kind];
      if (this.textures.exists(tiles.top) && this.textures.exists(tiles.fill)) {
        rect.setVisible(false);
        if (h > TILE) {
          this.add.tileSprite(x, y + TILE, w, h - TILE, tiles.fill).setOrigin(0, 0).setDepth(0);
        }
        this.add.tileSprite(x, y, w, Math.min(TILE, h), tiles.top).setOrigin(0, 0).setDepth(1);
      } else {
        // A lighter top edge, so the surface you can land on reads clearly.
        this.add.rectangle(x + w / 2, y + 1, w, 2, 0x8d97c9).setDepth(1);
      }
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
    this.hazards = this.add.group();

    for (const placement of this.level.hazards ?? []) {
      const config = HAZARDS[placement.kind];

      // Wind acts on a region; everything else is a thing in the level.
      if (config.behavior === 'wind') {
        this.winds.push(
          new WindZone(this, placement.x, placement.y, placement.w, placement.h, placement.direction, config),
        );
        continue;
      }

      // A chaser is positioned relative to the player rather than to the
      // level: the stroller's whole job is to be just behind you, and after a
      // checkpoint restart "just behind you" is not where it was placed.
      const offset = config.behavior === 'chaser' ? this.hazardOffsetX : 0;
      this.hazards.add(
        new MovingHazard(
          this,
          placement.x * TILE + TILE / 2 + offset,
          placement.y * TILE,
          config,
          placement.direction,
        ),
      );
    }
  }

  /** Awnings and rubbish bags: land on one and you are launched (§6). */
  private buildBouncers(): void {
    this.bouncers = this.physics.add.staticGroup();
    for (const placement of this.level.bouncers ?? []) {
      const w = placement.w * TILE;
      const x = placement.x * TILE;
      const y = placement.y * TILE;
      // The pad is a thin strip so that landing on it is unambiguous; the
      // awning drawn under it is a full tile deep and purely decorative.
      const pad = this.add.rectangle(x + w / 2, y + 3, w, 6, 0xd06a8a).setDepth(4);
      this.bouncers.add(pad);

      if (this.textures.exists('tile-awning')) {
        pad.setVisible(false);
        this.add.tileSprite(x, y, w, TILE, 'tile-awning').setOrigin(0, 0).setDepth(4);
      }
    }
  }

  private buildBoss(): void {
    // Cleared first, not just assigned when there is one. Phaser reuses the
    // scene instance across `scene.start`, so a boss left over from the level
    // before would go on being ticked here with a destroyed body under it —
    // beat 1-4, go back to the map, start 1-1, crash.
    this.boss = undefined;
    this.perches = (this.level.perches ?? []).map(
      (p) => new Phaser.Math.Vector2(p.x * TILE + TILE / 2, p.y * TILE),
    );
    if (!this.level.boss) return;

    this.boss = new Boss(this, this.level.boss.x * TILE + TILE / 2, this.level.boss.y * TILE);
    if (this.perches.length === 0) {
      this.perches = [new Phaser.Math.Vector2(this.boss.x, this.boss.y)];
    }
    const lane = this.sweepLane(this.boss);
    this.boss.setLane(lane.left, lane.right);

    this.physics.add.overlap(this.player, this.boss, () => this.onBossContact());
  }

  /**
   * Landing on the boss hurts it; anything else hurts you. Same rule as an
   * ordinary enemy, which is the point — the fight teaches nothing new, it
   * asks you to do the thing you already know under pressure.
   */
  private onBossContact(): void {
    const boss = this.boss;
    if (!boss?.isAlive || this.state !== 'playing') return;

    /**
     * The same stomp test every other enemy uses: coming down, from above.
     *
     * It was tempting to loosen this for the boss, because the fight really
     * was unwinnable — but the reason was never the test. He was only
     * vulnerable while diving *at* the player, which puts him above you by
     * construction, so there was no moment when landing on him was a thing you
     * could do. The window is what was missing, not the rule, and a boss with
     * its own private definition of a stomp is a worse thing to explain than a
     * boss that holds still long enough to be jumped on.
     */
    const body = this.player.physicsBody;
    const falling = body.velocity.y > GAMEPLAY.stompMinFallSpeed;
    const aboveMidline = body.bottom <= boss.physicsBody.center.y + GAMEPLAY.stompFootMargin;

    if (falling && aboveMidline && boss.isVulnerable) {
      this.player.bounce(GAMEPLAY.stompBounceHeld);
      if (boss.takeHit(this.time.now)) this.onBossDefeated();
      return;
    }
    if (boss.isDangerous) this.hurtPlayer(boss.x);
  }

  /**
   * He goes when you get close, not when you touch the goal.
   *
   * The goal alone was the wrong trigger. He runs out of street three tiles
   * short of it and waits there, so a player at full tilt simply overtakes the
   * thing that is supposed to be uncatchable and jogs past him to the flag —
   * measured, the gap went from fourteen pixels to minus fifty-six. Watching
   * the distance instead means the escape plays as you close on him, which is
   * the moment the whole level is for, and the goal is left as a backstop for
   * anyone who finds a way round.
   */
  private watchForTheGetaway(): void {
    const thief = this.thief;
    if (!thief || !this.prologue || this.state !== 'playing') return;
    if (!thief.isAtExit || thief.isLeaving) return;
    if (thief.x - this.player.x > TILE * 4) return;
    this.completeLevel();
  }

  /**
   * The Yetzer Hara, in the prologue.
   *
   * Cleared first for the same reason the boss is: Phaser reuses the scene
   * instance across `scene.start`, so one left over from the level before
   * would go on being ticked with a destroyed sprite under it.
   */
  private buildThief(): void {
    this.thief = undefined;
    const placement = this.level.thief;
    if (!placement) return;

    const goalX = (this.level.goal?.x ?? this.level.widthInTiles - 6) * TILE;
    this.thief = new Thief(
      this,
      placement.x * TILE + TILE / 2,
      placement.y * TILE,
      // Short of the goal, so the escape happens in front of the player rather
      // than off the edge of the screen while they are still running at it.
      goalX - TILE * 3,
    );

    /**
     * The held beat, and then he goes.
     *
     * This is the crash. The player gets a second and a half to read the room
     * and the sign with nothing moving, and then the shape they have been
     * looking at turns out to be the thief and bolts. Doing it this way rather
     * than as a cutscene keeps the controls live throughout — the first thing
     * the game does is not take them away.
     */
    this.time.delayedCall(1500, () => {
      if (!this.thief || this.state !== 'playing') return;
      this.thief.release();
      this.cameras.main.shake(260, 0.006);
    });
  }

  /**
   * The spread goes up, and comes down over four neighbourhoods.
   *
   * Four icons, the four world prizes, thrown out along four arcs. It is the
   * last beat of the prologue and the first line of the map screen's argument:
   * the player has just watched the thing the map is a picture of, so the four
   * nodes they are about to see arrive already meaning something.
   *
   * Thrown flat rather than high, because there is nowhere to throw it.
   *
   * The camera sits near the bottom of a 27-tile level and the view is 180px,
   * so above the pavement there are about fifty pixels of picture and no more.
   * The first version launched from the thief's own position and arced six to
   * nine tiles up: measured against the camera, every piece left the top of
   * the screen within a few frames, and the beat the whole prologue ends on
   * played entirely above the visible world. Twice, because the second attempt
   * fixed the launch height and kept the arc.
   *
   * So it fans sideways and rises a little, which is the right reading anyway
   * — four places, spread out, not one plume going up.
   *
   * Drawn from the prize sheet when it exists and as four coloured squares
   * when it does not, like everything else here.
   */
  private scatterTheSpread(fromX: number): void {
    const camera = this.cameras.main;
    const icons = sceneryArt('prizeIcons');
    const spread: readonly { frame: string; tint: number }[] = [
      { frame: 'meat_board', tint: 0x8d6bb5 },
      { frame: 'poppers', tint: 0x5fa86b },
      { frame: 'kugel', tint: 0xd98b3a },
      { frame: 'tequila', tint: 0x4f8fd0 },
    ];

    // Chest height on the pavement, and a rise that stops short of the top of
    // the view whatever the camera is doing.
    const fromY = this.player.y - TILE;
    const headroom = Math.max(TILE * 2, fromY - camera.scrollY - TILE);

    spread.forEach((item, i) => {
      const piece = icons
        ? this.add.image(fromX, fromY, icons.key, icons.frames[item.frame] ?? 0)
        : this.add.rectangle(fromX, fromY, 10, 10, item.tint);
      piece.setDepth(11).setScrollFactor(1);

      // Fanned out: two left, two right, each a little further than the last.
      const direction = i < 2 ? -1 : 1;
      const reach = TILE * (2 + i * 1.5);

      this.tweens.add({
        targets: piece,
        x: fromX + direction * reach,
        y: fromY - headroom * (i % 2 === 0 ? 0.85 : 0.55),
        alpha: { value: 0, delay: 700, duration: 800 },
        duration: 1500,
        ease: 'Quad.easeOut',
        onComplete: () => piece.destroy(),
      });
    });
  }

  /**
   * Summoned pigeons fly off once their time is up.
   *
   * Taken out of the enemy group first, so that from this moment they neither
   * think nor touch anybody: a bird on its way out that can still dive, or
   * still hurt you, is the same permanent hazard with extra steps. Then gravity
   * off, a push towards the nearer wall, and fade.
   *
   * Only the summoned ones carry `leaveAt`. Pigeons placed in a level are part
   * of the level and stay put.
   */
  private dismissFlock(now: number): void {
    const middle = (this.level.widthInTiles * TILE) / 2;
    for (const enemy of (this.enemies.getChildren() as Enemy[]).slice()) {
      const leaveAt = enemy.getData('leaveAt') as number | undefined;
      if (leaveAt === undefined || now < leaveAt || !enemy.isAlive) continue;

      this.enemies.remove(enemy, false, false);
      const body = enemy.physicsBody;
      body.setAllowGravity(false);
      body.setVelocity(enemy.x < middle ? -90 : 90, -120);
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        duration: 900,
        onComplete: () => enemy.destroy(),
      });
    }
  }

  /**
   * The widest run of floor the boss can skim along without ending up inside
   * the level.
   *
   * The boss has no collider with the terrain — he is a bird, and giving him
   * one would have him landing on the scenery — so nothing stops him sweeping
   * straight into a staircase and hovering inside it, which is where the one
   * stompable moment in the fight went. He needs to be told.
   *
   * The band that matters runs from his body at sweep height all the way DOWN
   * to the ground, not just the body itself — and that is the whole subtlety.
   * His height is calibrated against the floor: eighteen pixels of gap, which
   * a crouched 13px head clears and a standing 22px one does not. Stand
   * anywhere higher than the floor and that calibration is simply wrong. On
   * 1-4's bottom step, one tile up, a crouched head reaches 291 and his body
   * reaches down to 302, so ducking does not save you — nothing does.
   *
   * Measuring only the body's own band missed this, because a one-tile step is
   * entirely below him: he skims two pixels over it, the step never touches
   * his band, and the lane happily included the staircase. Driving the fight
   * from the real loop, that was a guaranteed death in every run, at the same
   * pixel, as soon as the fight moved to the stairs.
   *
   * So the lane stops where the floor stops being the floor.
   */
  private sweepLane(boss: Boss): { left: number; right: number } {
    const top = boss.config.floorY - boss.config.bodyHeight;
    const bottom = (this.level.groundRow ?? this.level.heightInTiles) * TILE;
    let left = 0;
    let right = this.level.widthInTiles * TILE;

    for (const solid of this.level.solids) {
      const y0 = solid.y * TILE;
      const y1 = (solid.y + solid.h) * TILE;
      if (y1 <= top || y0 >= bottom) continue; // nowhere near the sweep
      const x0 = solid.x * TILE;
      const x1 = (solid.x + solid.w) * TILE;
      if (x1 <= boss.x) left = Math.max(left, x1);
      else if (x0 >= boss.x) right = Math.min(right, x0);
    }

    return { left, right };
  }

  /**
   * The boss is down, so the kiddush item it was sitting on comes loose (§6).
   *
   * Recovering it *is* the world's victory condition, so the level ends when
   * you pick it up rather than at a goal post — there is no goal post in a
   * boss arena.
   */
  private onBossDefeated(): void {
    const boss = this.boss;
    if (!boss) return;
    this.hud.hideBossHealth();

    const world = worldOf(this.levelId ?? '');
    const prize = this.add
      .rectangle(boss.x, boss.y - 10, 22, 14, world?.color ?? 0xe8d9b0)
      .setStrokeStyle(1, 0xffffff)
      .setDepth(8);
    this.physics.add.existing(prize);
    const prizeBody = prize.body as Phaser.Physics.Arcade.Body;
    prizeBody.setAllowGravity(true);
    prizeBody.setGravityY(900);
    prizeBody.setBounce(0.3);
    this.physics.add.collider(prize, this.solids);

    this.hud.showBanner(world ? `GET ${world.prize.toUpperCase()}` : 'GET IT BACK');

    this.physics.add.overlap(this.player, prize, () => {
      if (this.state !== 'playing') return;
      prize.destroy();
      this.completeLevel();
    });
  }

  private updateBoss(now: number): void {
    const boss = this.boss;
    if (!boss) return;

    if (!boss.isAlive) {
      this.hud.hideBossHealth();
      return;
    }

    boss.tick(now, this.player.x, this.perches);
    this.hud.showBossHealth(boss.healthFraction);

    switch (boss.takeRequest()) {
      case 'summon': {
        // A flock, thrown in from either side of the arena.
        //
        // Two things this gets wrong if you let it. Spawning them relative to
        // the boss puts them above the top of the screen while he is on a high
        // perch, so the first you know of a pigeon is the one already on you —
        // they come in at a height the camera can actually see instead. And
        // nothing ever removed them, so a long fight silently turned into a
        // room full of birds. The flock is capped; calling for more when the
        // sky is full does nothing.
        const alive = (this.enemies.getChildren() as Enemy[]).filter((e) => e.isAlive).length;
        const room = Math.max(0, GAMEPLAY.maxFlock - alive);
        const y = this.cameras.main.scrollY + VIEW_HEIGHT * 0.3;
        for (let i = 0; i < Math.min(boss.config.summonCount, room); i += 1) {
          const x = Phaser.Math.Clamp(
            boss.x + (i % 2 === 0 ? -70 : 70),
            TILE * 2,
            this.level.widthInTiles * TILE - TILE * 2,
          );
          const bird = new Enemy(this, x, y, ENEMY_TABLE.pigeon);
          bird.setData('leaveAt', this.time.now + GAMEPLAY.flockLifeMs);
          this.enemies.add(bird);
        }
        break;
      }
      case 'shockwave':
        this.cameras.main.shake(160, 0.006);
        break;
      case 'none':
        break;
    }
  }

  /**
   * Checkpoints and the end of the level.
   *
   * In both cases the rectangle stays as the trigger and the drawing goes
   * behind it, so what you have to touch is identical whether or not the art
   * has been made. A goal you can reach in one build and miss in the next
   * because someone added a sprite is not a trade worth making.
   */
  private buildCheckpointsAndGoal(): void {
    const checkpointArt = sceneryArt('checkpoint');

    for (const point of this.level.checkpoints ?? []) {
      const x = point.x * TILE + TILE / 2;
      // A checkpoint carried in from a previous life shows as already taken.
      const alreadyTaken = this.respawnAt.x >= x;
      const post = this.add
        .rectangle(x, point.y * TILE - 20, 4, 40, 0x6ee7a0, alreadyTaken ? 1 : 0.55)
        .setDepth(3);
      this.physics.add.existing(post, true);

      let pushke: Phaser.GameObjects.Image | undefined;
      if (checkpointArt) {
        post.setVisible(false);
        pushke = this.add
          .image(x, point.y * TILE, checkpointArt.key, checkpointArt.frames[alreadyTaken ? 'on' : 'off'])
          .setOrigin(0.5, 1)
          .setDepth(3);
      }

      this.physics.add.overlap(this.player, post, () => {
        if (this.respawnAt.x >= x) return;
        this.respawnAt.set(x, point.y * TILE);
        post.setFillStyle(0x6ee7a0, 1);
        if (checkpointArt && pushke) pushke.setFrame(checkpointArt.frames.on ?? 0);
      });
    }

    const goal = this.level.goal;
    if (!goal) return;
    const x = goal.x * TILE + TILE / 2;
    const post = this.add.rectangle(x, goal.y * TILE - 48, 6, 96, 0xf2c14e).setDepth(3);
    this.physics.add.existing(post, true);

    /**
     * The prize on the post is the one this world is trying to get back (§6).
     *
     * Every level in a world ends on the same item, so reaching the end of 2-3
     * and seeing a pan of poppers is the game saying what the next fight is
     * for. Falls back to World 1's meat board for anything with no world —
     * the greybox instruments and the prologue.
     */
    const goalArt = sceneryArt(GOAL_ART[worldOf(this.levelId ?? '')?.prizeIcon ?? 'meat_board']);
    if (goalArt) {
      post.setVisible(false);
      this.add.image(x, goal.y * TILE, goalArt.key, 0).setOrigin(0.5, 1).setDepth(3);
    }

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
    this.physics.add.collider(
      this.hazards,
      this.solids,
      undefined,
      (hazardObject) => (hazardObject as MovingHazard).collidesWithSolids,
    );
    this.physics.add.collider(this.enemies, this.hazards);
    this.physics.add.collider(this.flames, this.solids);

    // Standing on a cart or a van roof carries you; walking into its side does
    // not. §6 is explicit that the player "must climb the thing trying to kill
    // them", so which part you touch has to be the whole difference.
    this.physics.add.collider(this.player, this.hazards, (_player, hazardObject) => {
      this.onHazardContact(hazardObject as MovingHazard);
    });

    /**
     * An awning is something you land on, not something you walk into.
     *
     * §6 describes awnings and bags of rubbish as things that launch you when
     * you land on them, and as a plain collider that is only half true: the pad
     * is a solid strip a tile above the pavement, so running along the street
     * into the side of one stops you dead. That is how the Pigeon King's arena
     * ended up with two walls across the middle of it, and how 1-3's chase
     * turned into a bot dying forty-five times at the same tile.
     *
     * The process callback is the whole fix: the collision only exists for a
     * player who is coming down onto the pad. From below or from the side there
     * is nothing there.
     */
    this.physics.add.collider(
      this.player,
      this.bouncers,
      (_player, padObject) => {
        this.onBounce(padObject as Phaser.GameObjects.Rectangle);
      },
      (playerObject, padObject) => {
        const body = (playerObject as Player).body as Phaser.Physics.Arcade.Body;
        const pad = (padObject as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
        return body.velocity.y > 0 && body.bottom <= pad.top + GAMEPLAY.stompFootMargin + 4;
      },
    );
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

  /** Move every hazard, and carry the player if they are riding one. */
  private updateHazards(now: number): void {
    const groundY = (this.level.groundRow ?? this.level.heightInTiles - 7) * TILE;
    for (const hazard of this.hazards.getChildren() as MovingHazard[]) {
      hazard.tick(now, this.player.x, this.player.y, groundY);
    }

    // Riding: while stood on one, the player is moved by it. Arcade does not
    // carry a body on top of a moving platform by itself.
    if (this.riding && this.riding.active) {
      const body = this.player.physicsBody;
      const stillOn =
        body.blocked.down &&
        body.bottom <= this.riding.physicsBody.top + 4 &&
        body.right > this.riding.physicsBody.left &&
        body.left < this.riding.physicsBody.right;

      if (stillOn) this.player.x += (this.riding.physicsBody.velocity.x * this.game.loop.delta) / 1000;
      else this.riding = undefined;
    } else {
      this.riding = undefined;
    }
  }

  /**
   * Touching a hazard. On top of a rideable one you get a lift; anywhere else
   * on a harmful one costs you.
   */
  private onHazardContact(hazard: MovingHazard): void {
    if (this.state !== 'playing') return;
    const body = this.player.physicsBody;
    const onTop = body.bottom <= hazard.physicsBody.top + 6 && body.velocity.y >= 0;

    if (onTop && hazard.config.rideable) {
      this.riding = hazard;
      return;
    }
    if (hazard.isDangerous) this.hurtPlayer(hazard.x);
  }

  /** Landing on an awning or a bag of rubbish launches you (§6). */
  private onBounce(pad: Phaser.GameObjects.Rectangle): void {
    const body = this.player.physicsBody;
    if (body.velocity.y < 0 || body.bottom > pad.y + 8) return;

    this.player.bounce(GAMEPLAY.bounceVelocity);
    this.tweens.add({ targets: pad, scaleY: 0.4, duration: 80, yoyo: true });
  }

  /** The clock, on the levels that have one (§7). Running out costs a life. */
  private updateClock(delta: number): void {
    if (this.secondsLeft === undefined || this.state !== 'playing') return;

    this.secondsLeft = Math.max(0, this.secondsLeft - delta / 1000);
    if (this.secondsLeft === 0) {
      this.hud.showBanner('TIME');
      this.killPlayer();
    }
  }

  /**
   * An auto-scrolling chase (§6, 1-3): the camera moves on by itself and the
   * left edge of the screen is a wall you cannot go back through.
   */
  private updateAutoScroll(delta: number): void {
    if (!this.level.autoScroll || this.state !== 'playing') return;

    const camera = this.cameras.main;
    this.autoScrollX += (this.level.autoScroll * delta) / 1000;
    camera.stopFollow();
    camera.setScroll(
      Math.min(this.autoScrollX, this.level.widthInTiles * TILE - VIEW_WIDTH),
      camera.scrollY,
    );

    // Shove the player along rather than letting them be left behind: being
    // scrolled off the back is the chase, not a death.
    const leftEdge = camera.scrollX + 6;
    if (this.player.x < leftEdge) this.player.x = leftEdge;
  }

  /**
   * A climb the screen will not wait for (§6, 1-2): the camera rises by itself
   * and the bottom of the screen is the floor falling away.
   *
   * A ratchet, in two senses. It climbs on its own clock, so standing still
   * loses you the level — but it also climbs to keep up with a player who is
   * faster than the clock, because a screen that can be outrun from below is a
   * screen you climb off the top of. And it never descends, so ground you have
   * already gained is never given back.
   *
   * Following has to be driven by hand here. `startFollow` owns both axes and
   * runs after the scene's update, so anything written to `scrollY` here would
   * simply be overwritten by the follow a moment later; the horizontal follow
   * is therefore reimplemented as the lerp it already was.
   */
  private updateRisingCamera(delta: number): void {
    if (!this.level.autoScrollUp || this.state !== 'playing') return;

    const camera = this.cameras.main;
    const widthPx = this.level.widthInTiles * TILE;
    const heightPx = this.level.heightInTiles * TILE;
    const lowest = Math.max(0, heightPx - VIEW_HEIGHT);

    if (this.riseGraceLeft > 0) this.riseGraceLeft -= delta;
    else this.autoScrollY = Math.max(0, this.autoScrollY - (this.level.autoScrollUp * delta) / 1000);

    // Pulled up by a fast climber, on top of its own clock.
    const pulled = Phaser.Math.Clamp(this.player.y - VIEW_HEIGHT * CAMERA.risingFollow, 0, lowest);
    this.autoScrollY = Math.min(this.autoScrollY, pulled);

    const wantX = Phaser.Math.Clamp(this.player.x - VIEW_WIDTH / 2, 0, Math.max(0, widthPx - VIEW_WIDTH));
    camera.stopFollow();
    camera.setScroll(Phaser.Math.Linear(camera.scrollX, wantX, CAMERA.lerpX), this.autoScrollY);

    // Left below the screen with nothing under you. There is no shoving a
    // player upwards the way the horizontal chase shoves them along, so this
    // is the one place being outpaced is fatal.
    if (this.player.physicsBody.top > camera.scrollY + VIEW_HEIGHT) this.killPlayer();
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
    if (this.prologue) {
      this.completePrologue();
      return;
    }
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
      const world = worldOf(this.levelId);
      this.hud.showBanner(
        entry?.isBoss === true && world
          ? `YOU GOT ${world.prize.toUpperCase()} BACK!\nSPACE for the map`
          : "L'CHAIM!\nSPACE for the map",
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
  /**
   * Take a life and start again from the last checkpoint.
   *
   * `levelId` has to come along. It is what ties a play to its entry in the
   * catalog, and without it the level stops being a level in the game: no
   * clock, and — worse — finishing no longer records completion or unlocks
   * anything. Die once in 1-1, reach the goal, and 1-2 stayed locked.
   */
  private restartFromCheckpoint(): void {
    this.scene.restart({
      levelKey: this.level.key,
      ...(this.levelId ? { levelId: this.levelId } : {}),
      ...(this.greybox ? { greybox: true } : {}),
      coins: this.coinCount,
      respawnX: this.respawnAt.x,
      respawnY: this.respawnAt.y,
      character: this.player.character,
      lives: this.lives,
    } satisfies LevelSceneData);
  }

  /** Start the level over from the top, with nothing carried but its identity. */
  private restartFromStart(): void {
    this.scene.restart({
      levelKey: this.level.key,
      ...(this.levelId ? { levelId: this.levelId } : {}),
      ...(this.greybox ? { greybox: true } : {}),
    } satisfies LevelSceneData);
  }

  /** F3 cycles the greybox instruments, which are not part of the game proper. */
  private cycleLevel(): void {
    const index = GREYBOX_LEVELS.indexOf(this.level.key);
    const next = GREYBOX_LEVELS[(index + 1) % GREYBOX_LEVELS.length]!;
    this.scene.restart({ levelKey: next, greybox: true } satisfies LevelSceneData);
  }

  /**
   * The end of the prologue: he gets away, and the spread goes with him.
   *
   * Nothing is unlocked and nothing is scored, because the prologue is not one
   * of the sixteen. The only thing written down is that it has been watched.
   *
   * It ends on its own rather than waiting for a keypress. Every other level
   * finishes on "SPACE for the map" because finishing one is an achievement
   * worth sitting in; this one finishes on losing, and holding the player
   * there to press a key would be asking them to confirm it.
   */
  private completePrologue(): void {
    this.state = 'complete';
    this.player.setControllable(false);
    writeSave({ ...loadSave(), introSeen: true });

    const thief = this.thief;
    if (!thief) {
      this.toWorldMap();
      return;
    }

    thief.escape(() => {
      this.scatterTheSpread(thief.x);
      this.hud.showBanner('SCATTERED ACROSS FOUR PLACES.\nGO AND GET IT BACK');
      this.time.delayedCall(2600, () => this.toWorldMap());
    });
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

  /**
   * The street behind the street: sky, then a distant skyline, then the
   * shopfronts.
   *
   * Every layer is a tiling sprite pinned to the camera. Horizontal movement
   * moves the *texture* inside it, which is what makes the scroll endless — a
   * sprite as wide as a 260-tile level would be enormous, and one as wide as
   * the view would run out. Vertical movement moves the sprite itself, because
   * a skyline tiles left to right but emphatically not top to bottom.
   *
   * Until the layers are drawn this falls back to a single tinted brick wall,
   * which is not a backdrop so much as a promise that one is coming.
   */
  private drawBackdrop(): void {
    const variant = this.level.backdrop ?? DEFAULT_BACKDROP;
    // A level that climbs well above the shopfronts needs sky above the view to
    // reveal; one that does not would only be loading a taller image for
    // nothing. The two are interchangeable — the tall one's bottom 180px are
    // the short one — so the test is how far the camera can actually travel
    // upward, not how tall the level's bounding box happens to be.
    const climbs = this.level.heightInTiles * TILE - VIEW_HEIGHT > VIEW_HEIGHT * 2;
    const layers = BACKDROPS[variant].map((layer, index) =>
      index === 0 && climbs ? tallSky(variant) : layer,
    );

    for (const layer of layers) {
      if (!this.textures.exists(layer.key)) continue;
      const source = this.textures.get(layer.key).getSourceImage();
      const sprite = this.add
        .tileSprite(0, VIEW_HEIGHT, VIEW_WIDTH, source.height, layer.key)
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(-10 + this.backdrop.length);
      this.backdrop.push({ sprite, layer });
    }

    if (this.backdrop.length === 0 && this.textures.exists('tile-brick')) {
      const wall = this.add
        .tileSprite(0, VIEW_HEIGHT, VIEW_WIDTH, VIEW_HEIGHT * 2, 'tile-brick')
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(-10)
        // Pushed well back, so nothing in the foreground has to compete with it.
        .setTint(0x4a3f4e)
        .setAlpha(0.5);
      this.backdrop.push({
        sprite: wall,
        layer: { key: 'tile-brick', url: '', scrollX: CAMERA.parallax, scrollY: CAMERA.parallax },
      });
    }

    // Line the layers up with the pavement, and remember the camera position
    // that alignment was measured at, so `updateBackdrop` can lag behind it.
    const groundY = (this.level.groundRow ?? this.level.heightInTiles - 7) * TILE;
    const travel = Math.max(0, this.level.heightInTiles * TILE - VIEW_HEIGHT);
    this.backdropRestScrollY = Phaser.Math.Clamp(groundY - VIEW_HEIGHT / 2, 0, travel);
    this.backdropRestY = groundY - this.backdropRestScrollY;
    this.updateBackdrop();
  }

  /**
   * Slide the layers to match the camera.
   *
   * Horizontally the texture moves inside a sprite pinned to the camera, which
   * is what makes the scroll endless. Vertically the sprite itself moves, by a
   * fraction of how far the camera has strayed from the position the backdrop
   * was lined up for — so the shopfronts sit on the pavement while you are on
   * the street, and lag behind as you climb away from it.
   */
  private updateBackdrop(): void {
    if (this.backdrop.length === 0) return;
    const camera = this.cameras.main;
    const strayed = this.backdropRestScrollY - camera.scrollY;

    for (const { sprite, layer } of this.backdrop) {
      sprite.tilePositionX = camera.scrollX * layer.scrollX;
      sprite.y = this.backdropRestY + strayed * layer.scrollY;
    }
  }

  private drawGrid(widthPx: number, heightPx: number): void {
    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0xffffff, 0.045);
    for (let x = 0; x <= widthPx; x += TILE) grid.lineBetween(x, 0, x, heightPx);
    for (let y = 0; y <= heightPx; y += TILE) grid.lineBetween(0, y, widthPx, y);
    grid.strokePath();
  }

  /**
   * In-world signage.
   *
   * Lit rather than dim, with a hard shadow behind it. It used to be a muted
   * blue-grey against a flat background, which was legible right up until there
   * were lit windows and fire escapes behind it.
   */
  private drawLabels(): void {
    for (const label of this.level.labels) {
      const text = this.add
        .text(label.x * TILE, label.y * TILE, label.text, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#e8ecff',
        })
        .setShadow(1, 1, '#0d0f1a', 0, true, true)
        .setDepth(5);

      /**
       * A plate behind the words.
       *
       * Near-white with a drop shadow is legible over brick and sky and
       * nothing else. The backdrop's shopfronts are a red and white striped
       * awning at a fixed height, and any line that lands on that band is
       * gone — the prologue's third line was unreadable and the line had done
       * nothing wrong. A sign has to be readable wherever it is hung.
       */
      this.add
        .rectangle(text.x - 2, text.y - 1, text.width + 4, text.height + 2, 0x0d0f1a, 0.66)
        .setOrigin(0, 0)
        .setDepth(4.5);
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
