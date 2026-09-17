import Phaser from 'phaser';
import { CAMERA, FELL_OUT_MARGIN, MENDY, TILE } from '../config/Tuning';
import { Player } from '../entities/Player';
import { KeyboardInput } from '../input/KeyboardInput';
import type { LevelDef, SolidKind } from '../levels/LevelDef';
import { TEST_LEVEL } from '../levels/testLevel';
import { DebugOverlay } from './DebugOverlay';
import { SceneKey } from './SceneKey';

/** Placeholder palette. Colour carries no meaning to the physics. */
const SOLID_COLORS: Record<SolidKind, number> = {
  ground: 0x3d4466,
  platform: 0x565f8c,
  wall: 0x2b3050,
};

/**
 * Milestone 1: one greybox level, one character, a camera that follows.
 *
 * Deliberately nothing else. No enemies, no pickups, no goal, no death — those
 * are Milestone 2, and putting any of them in now would only make it harder to
 * tell whether the jump itself is right.
 */
export class TestLevelScene extends Phaser.Scene {
  private player!: Player;
  private overlay!: DebugOverlay;
  /** Our action reader. Named `controls` so it does not shadow `Scene.input`. */
  private controls!: KeyboardInput;
  private readonly level: LevelDef = TEST_LEVEL;

  constructor() {
    super(SceneKey.TestLevel);
  }

  create(): void {
    const widthPx = this.level.widthInTiles * TILE;
    const heightPx = this.level.heightInTiles * TILE;

    this.cameras.main.setBackgroundColor(this.level.backgroundColor);
    this.physics.world.setBounds(0, 0, widthPx, heightPx);

    this.drawGrid(widthPx, heightPx);
    const solids = this.buildSolids();
    this.drawLabels();

    this.player = new Player(
      this,
      this.level.spawn.x * TILE + TILE / 2,
      this.level.spawn.y * TILE,
      MENDY,
    );
    this.physics.add.collider(this.player, solids);

    this.setUpCamera(widthPx, heightPx);

    this.controls = new KeyboardInput(this);
    this.overlay = new DebugOverlay(this, this.player);

    this.keyboard?.on('keydown-R', () => this.respawn());
  }

  override update(_time: number, delta: number): void {
    this.controls.update();
    // Phaser can hand out a huge delta after a tab-out; a 50ms clamp keeps one
    // stalled frame from teleporting the player through a floor.
    this.player.tick(Math.min(delta, 50), this.controls.current);
    this.overlay.update();

    if (this.player.y > this.level.heightInTiles * TILE + FELL_OUT_MARGIN) {
      this.respawn();
    }
  }

  private respawn(): void {
    this.player.respawn(this.level.spawn.x * TILE + TILE / 2, this.level.spawn.y * TILE);
    this.cameras.main.flash(120, 255, 255, 255);
  }

  private buildSolids(): Phaser.Physics.Arcade.StaticGroup {
    const solids = this.physics.add.staticGroup();

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
      this.add
        .rectangle(def.x * TILE + w / 2, def.y * TILE + 1, w, 2, 0x8d97c9)
        .setDepth(1);
      solids.add(rect);
    }

    return solids;
  }

  private drawGrid(widthPx: number, heightPx: number): void {
    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0xffffff, 0.045);

    for (let x = 0; x <= widthPx; x += TILE) {
      grid.lineBetween(x, 0, x, heightPx);
    }
    for (let y = 0; y <= heightPx; y += TILE) {
      grid.lineBetween(0, y, widthPx, y);
    }
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
