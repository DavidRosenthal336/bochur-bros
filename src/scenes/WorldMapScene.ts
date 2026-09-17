import Phaser from 'phaser';
import { VIEW_WIDTH } from '../config/Tuning';
import type { LevelEntry, WorldEntry } from '../levels/catalog';
import { LEVEL_ORDER, WORLDS } from '../levels/catalog';
import { GREYBOX_LEVELS, LEVELS } from '../levels';
import type { SaveData } from '../systems/SaveGame';
import { clearSave, currentLevel, isUnlocked, loadSave } from '../systems/SaveGame';
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
const NODE_WIDTH = 26;
const NODE_HEIGHT = 13;
const NODE_SPACING = 40;
const NODE_LEFT = 132;
const ROW_SPACING = 20;
const MAP_TOP = 42;
const TABLE_Y = 118;

export class WorldMapScene extends Phaser.Scene {
  private save!: SaveData;
  private selected = 0;
  private nodes: Phaser.GameObjects.Rectangle[] = [];
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
      .rectangle(0, 0, NODE_WIDTH + 6, NODE_HEIGHT + 6)
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

    this.add
      .text(VIEW_WIDTH / 2, 166, 'ARROWS choose   SPACE play   G greybox   BKSP wipe save', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#4c5478',
      })
      .setOrigin(0.5, 0);
  }

  private drawWorlds(): void {
    this.nodes = [];

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
        const node = this.add.rectangle(x, y, NODE_WIDTH, NODE_HEIGHT, world.color).setDepth(2);
        this.nodes.push(node);

        this.add
          .text(x, y, level.id, {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#0e1018',
          })
          .setOrigin(0.5)
          .setDepth(3)
          .setName(`label-${level.id}`);
      });
    });
  }

  /** The kiddush table, filling up as the prizes come home (§6). */
  private drawKiddushTable(): void {
    const y = TABLE_Y;
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

      node.setFillStyle(unlocked ? world.color : 0x252a3d);
      node.setAlpha(level.map ? 1 : 0.55);
      node.setStrokeStyle(done ? 1 : 0, 0xffffff);

      const label = this.children.getByName(`label-${level.id}`);
      if (label instanceof Phaser.GameObjects.Text) {
        label.setColor(unlocked ? '#0e1018' : '#4c5478');
      }
    });

    const node = this.nodes[this.selected];
    if (node) this.marker.setPosition(node.x, node.y);
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
    return `${heading}\nSPACE to play`;
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
