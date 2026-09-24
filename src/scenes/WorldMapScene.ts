import Phaser from 'phaser';
import { sceneryArt } from '../config/scenery';
import { VIEW_WIDTH } from '../config/Tuning';
import type { LevelEntry, WorldEntry } from '../levels/catalog';
import { LEVEL_ORDER, WORLDS } from '../levels/catalog';
import { GREYBOX_LEVELS, LEVELS, PROLOGUE_LEVEL } from '../levels';
import type { SaveData } from '../systems/SaveGame';
import { clearSave, currentLevel, isUnlocked, loadSave } from '../systems/SaveGame';
import { touchControls } from '../input/TouchInput';
import { SceneKey } from './SceneKey';

/**
 * The world map (§7): the four worlds as a journey, levels as nodes, a marker
 * for where you are, locked worlds greyed out, and a kiddush table that fills
 * up as the prizes come back.
 *
 * All sixteen levels are listed from the start, because seeing the shape of the
 * journey is the point of the screen. A level that has not been built yet says
 * so rather than pretending to be locked.
 */
/**
 * Layout, in the 320x180 virtual screen. Every band has its own strip so
 * nothing lands on anything else: worlds 42..108, the kiddush table 113..136,
 * the description 142..160, the controls 166..174.
 */
const NODE_SIZE = 12;
const NODE_SPACING = 40;
const NODE_LEFT = 132;
const ROW_SPACING = 18;
const MAP_TOP = 40;
/** Top-left of the kiddush table, which is 64 x 32. */
const TABLE_X = (VIEW_WIDTH - 64) / 2;
const TABLE_Y = 106;
/** Where the prizes sit on the tabletop, relative to the table's corner. */
const PRIZE_INSET = 8;
const PRIZE_PITCH = 13;
const PRIZE_TOP = 2;

/** One level's marker on the map, whether it is drawn art or a rectangle. */
interface MapNode {
  readonly object: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  readonly setState: (state: 'locked' | 'open' | 'cleared', world: WorldEntry) => void;
}

export class WorldMapScene extends Phaser.Scene {
  private save!: SaveData;
  private selected = 0;
  private nodes: MapNode[] = [];
  private marker!: Phaser.GameObjects.Rectangle;
  private detail!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.WorldMap);
  }

  create(): void {
    this.save = loadSave();
    this.selected = Math.max(
      0,
      LEVEL_ORDER.findIndex((level) => level.id === currentLevel(this.save)),
    );

    this.cameras.main.setBackgroundColor(0x11131f);
    this.drawChrome();
    this.drawWorlds();
    this.drawKiddushTable();

    this.marker = this.add
      .rectangle(0, 0, NODE_SIZE + 6, NODE_SIZE + 6)
      .setStrokeStyle(1, 0xffffff)
      .setDepth(5);
    this.refresh();

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-RIGHT', () => this.move(1));
    keyboard?.on('keydown-LEFT', () => this.move(-1));
    keyboard?.on('keydown-D', () => this.move(1));
    keyboard?.on('keydown-A', () => this.move(-1));
    keyboard?.on('keydown-DOWN', () => this.move(4));
    keyboard?.on('keydown-UP', () => this.move(-4));
    keyboard?.on('keydown-SPACE', () => this.enter());
    keyboard?.on('keydown-ENTER', () => this.enter());
    keyboard?.on('keydown-Z', () => this.enter());
    keyboard?.on('keydown-G', () => this.enterGreybox());
    // The prologue, again. It plays once by itself and is worth being able to
    // go back to, since it is the only place the story is actually told.
    keyboard?.on('keydown-I', () =>
      this.scene.start(SceneKey.Level, { levelKey: PROLOGUE_LEVEL, prologue: true }),
    );
    keyboard?.on('keydown-BACKSPACE', () => this.wipe());
  }

  private drawChrome(): void {
    this.add
      .text(VIEW_WIDTH / 2, 6, 'BOCHUR BROS', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e8d9b0',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(VIEW_WIDTH / 2, 24, 'get the kiddush back', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#6f7aa8',
      })
      .setOrigin(0.5, 0);

    this.detail = this.add
      .text(VIEW_WIDTH / 2, 142, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#c8d0f0',
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5, 0);

    const thumbs = touchControls().active;
    this.add
      .text(
        VIEW_WIDTH / 2,
        166,
        thumbs
          ? 'TAP A LEVEL, THEN TAP IT AGAIN TO PLAY'
          : 'ARROWS choose   SPACE play   G greybox   BKSP wipe save',
        { fontFamily: 'monospace', fontSize: '8px', color: '#4c5478' },
      )
      .setOrigin(0.5, 0);

    if (thumbs) this.drawTouchButtons();
  }

  /**
   * PLAY and STORY, for thumbs.
   *
   * The map's other two doors stay keyboard-only on purpose: G opens the
   * greybox instruments, which are a developer's tool, and Backspace destroys
   * your progress. Neither wants to be a button a thumb can find by accident.
   * Watching the opening again does want to be reachable, because it is the
   * only place the story is actually told.
   */
  private drawTouchButtons(): void {
    const button = (x: number, y: number, label: string, onTap: () => void): void => {
      this.add
        .rectangle(x, y, 60, 18, 0x1d2338)
        .setStrokeStyle(1, 0x4ea8de)
        .setDepth(6)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', onTap);
      this.add
        .text(x, y, label, { fontFamily: 'monospace', fontSize: '8px', color: '#9fd0ef' })
        .setOrigin(0.5)
        .setDepth(7);
    };

    // In the margins beside the kiddush table, which is 64 wide and centred,
    // so the space either side of it is the only part of this screen that is
    // empty. The band under it belongs to the level description — the first
    // version of these buttons sat on top of that, which made the one piece of
    // text that says what you are about to play unreadable.
    button(38, TABLE_Y + 16, 'PLAY', () => this.enter());
    button(VIEW_WIDTH - 52, TABLE_Y + 16, 'STORY', () =>
      this.scene.start(SceneKey.Level, { levelKey: PROLOGUE_LEVEL, prologue: true }),
    );
  }

  private drawWorlds(): void {
    this.nodes = [];
    const nodeArt = sceneryArt('mapNode');
    const dotArt = sceneryArt('mapPathDot');

    WORLDS.forEach((world, worldIndex) => {
      const y = MAP_TOP + worldIndex * ROW_SPACING;
      const worldOpen = this.isWorldOpen(world);

      this.add
        .text(8, y, `${world.number}  ${world.name.toUpperCase()}`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: worldOpen ? '#a9b4e0' : '#3a4060',
        })
        .setOrigin(0, 0.5);

      world.levels.forEach((level, levelIndex) => {
        const x = NODE_LEFT + levelIndex * NODE_SPACING;

        // The path between one level and the next, so the row reads as a
        // journey rather than four unrelated buttons.
        if (levelIndex > 0 && dotArt) {
          for (let dot = 1; dot <= 4; dot += 1) {
            this.add
              .image(x - NODE_SPACING + dot * 8, y, dotArt.key, 0)
              .setDepth(1)
              .setAlpha(worldOpen ? 0.8 : 0.25);
          }
        }

        const node = this.makeNode(x, y, world, nodeArt);
        this.nodes.push(node);

        /**
         * A thumb-sized target over a twelve-pixel node.
         *
         * The marker is drawn at its real size, because that is what the map is
         * supposed to look like; what you touch is a good deal bigger than what
         * you see. Thirty-four by sixteen of the virtual screen comes out around
         * eighty by forty real pixels on a phone held sideways, which is a
         * target — twelve by twelve is a dare.
         *
         * The first tap selects, so the line underneath tells you what you are
         * about to play, and a second tap on the same one starts it. A mis-tap
         * then costs you a look rather than a level.
         */
        const index = this.nodes.length - 1;
        node.object
          .setInteractive(
            new Phaser.Geom.Rectangle(NODE_SIZE / 2 - 17, NODE_SIZE / 2 - 8, 34, 16),
            Phaser.Geom.Rectangle.Contains,
          )
          .on('pointerup', () => {
            if (this.selected === index) {
              this.enter();
              return;
            }
            this.selected = index;
            this.refresh();
          });
        void level;
      });
    });
  }

  /**
   * A level marker.
   *
   * Drawn art gives each state its own frame; without it the node falls back to
   * the coloured rectangle the map used before, which is why the state change
   * is handed back as a closure rather than branching at every refresh.
   */
  private makeNode(
    x: number,
    y: number,
    world: WorldEntry,
    art: ReturnType<typeof sceneryArt>,
  ): MapNode {
    if (art) {
      const image = this.add.image(x, y, art.key, art.frames.locked).setDepth(2);
      return {
        object: image,
        setState: (state) => image.setFrame(art.frames[state] ?? 0),
      };
    }

    const rect = this.add.rectangle(x, y, NODE_SIZE, NODE_SIZE, world.color).setDepth(2);
    return {
      object: rect,
      setState: (state, forWorld) => {
        rect.setFillStyle(state === 'locked' ? 0x252a3d : forWorld.color);
        rect.setStrokeStyle(state === 'cleared' ? 1 : 0, 0xffffff);
      },
    };
  }

  /**
   * The kiddush table, filling up as the prizes come home (§6).
   *
   * This is the player's progress bar and it should be the first thing they
   * look at, so it is a drawn table with the four prizes laid along it rather
   * than a row of labelled boxes.
   */
  private drawKiddushTable(): void {
    const tableArt = sceneryArt('kiddushTable');
    const prizeArt = sceneryArt('prizeIcons');

    if (!tableArt || !prizeArt) {
      this.drawKiddushTableFallback();
      return;
    }

    this.add.image(TABLE_X, TABLE_Y, tableArt.key, 0).setOrigin(0, 0).setDepth(1);

    WORLDS.forEach((world, index) => {
      const recovered = this.save.kiddushItems.includes(world.number);
      const frame = recovered ? (prizeArt.frames[world.prizeIcon] ?? 0) : prizeArt.frames.empty;
      const slot = this.add
        .image(TABLE_X + PRIZE_INSET + index * PRIZE_PITCH, TABLE_Y + PRIZE_TOP, prizeArt.key, frame)
        .setOrigin(0, 0)
        .setDepth(2);
      // The empty slot is drawn as an outline in the palette's near-black, for
      // a table with a solid top. This one is open, so it needs lifting off
      // the map's own dark background or it simply is not there.
      if (!recovered) slot.setTint(0x5d678f);
    });
  }

  /** The pre-art version: a shelf with a labelled box per prize. */
  private drawKiddushTableFallback(): void {
    const y = TABLE_Y + 12;
    this.add.rectangle(VIEW_WIDTH / 2, y + 7, VIEW_WIDTH - 40, 2, 0x6b5330).setDepth(1);

    WORLDS.forEach((world, index) => {
      const x = VIEW_WIDTH / 2 - 63 + index * 42;
      const recovered = this.save.kiddushItems.includes(world.number);
      this.add
        .rectangle(x, y, 26, 10, recovered ? world.color : 0x252a3d)
        .setDepth(2)
        .setStrokeStyle(1, recovered ? 0xffffff : 0x333a52);
      this.add
        .text(x, y + 10, recovered ? world.prize.replace(/^the /, '') : '?', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: recovered ? '#e8d9b0' : '#3a4060',
        })
        .setOrigin(0.5, 0)
        .setDepth(2);
    });
  }

  private isWorldOpen(world: WorldEntry): boolean {
    return world.levels.some((level) => isUnlocked(this.save, level.id));
  }

  private move(delta: number): void {
    const next = this.selected + delta;
    if (next < 0 || next >= LEVEL_ORDER.length) return;
    this.selected = next;
    this.refresh();
  }

  private refresh(): void {
    LEVEL_ORDER.forEach((level, index) => {
      const node = this.nodes[index];
      if (!node) return;
      const world = WORLDS[Math.floor(index / 4)]!;
      const unlocked = isUnlocked(this.save, level.id);
      const done = this.save.completed.includes(level.id);

      node.setState(done ? 'cleared' : unlocked ? 'open' : 'locked', world);
      // A level nobody has built yet is faded rather than locked: the shape of
      // the whole journey is the point of this screen (§7).
      node.object.setAlpha(level.map ? 1 : 0.5);
    });

    const node = this.nodes[this.selected];
    if (node) this.marker.setPosition(node.object.x, node.object.y);
    this.detail.setText(this.describe(LEVEL_ORDER[this.selected]!));
  }

  private describe(level: LevelEntry): string {
    const world = WORLDS[Math.floor(LEVEL_ORDER.indexOf(level) / 4)]!;
    const heading = `${level.id}  ${level.name.toUpperCase()}`;

    if (!isUnlocked(this.save, level.id)) {
      return `${heading}\nlocked — finish the level before it`;
    }
    if (!level.map) {
      return `${heading}\nnot built yet`;
    }
    if (level.isBoss) {
      return `${heading}\nboss — holds ${world.prize}`;
    }
    return `${heading}\n${touchControls().active ? 'TAP IT AGAIN, or PLAY' : 'SPACE to play'}`;
  }

  private enter(): void {
    const level = LEVEL_ORDER[this.selected];
    if (!level?.map || !isUnlocked(this.save, level.id)) {
      this.cameras.main.shake(90, 0.004);
      return;
    }
    this.scene.start(SceneKey.Level, { levelKey: level.map, levelId: level.id });
  }

  /** The greybox instruments are still reachable; they are just not the game. */
  private enterGreybox(): void {
    const first = GREYBOX_LEVELS.find((key) => LEVELS[key]);
    if (!first) return;
    this.scene.start(SceneKey.Level, { levelKey: first, greybox: true });
  }

  private wipe(): void {
    clearSave();
    this.scene.restart();
  }
}
