import Phaser from 'phaser';
import { PHYSICS_FPS, VIEW_HEIGHT, VIEW_WIDTH } from './config/Tuning';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';
import { WorldMapScene } from './scenes/WorldMapScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0d0f1a',
  scale: {
    // The game renders at VIEW_WIDTH x VIEW_HEIGHT and is scaled up to the
    // window. Everything in the game therefore works in one fixed coordinate
    // space, on a desktop monitor and a phone alike.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // World gravity stays at zero: gravity is a per-character stat, because
      // Berel falls harder than Mendy (design doc §11).
      gravity: { x: 0, y: 0 },
      // A fixed step means the jump arc is identical on a 60Hz laptop and a
      // 144Hz monitor. Do not make this variable.
      fps: PHYSICS_FPS,
      fixedStep: true,
      debug: false,
    },
  },
  scene: [BootScene, WorldMapScene, LevelScene],
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  // Handy during tuning: `__game.scene.getScene('Level').player` in the browser
  // console lets you poke at the live character, and `__levels` shows what the
  // map files parsed into. Dev builds only.
  (window as unknown as { __game: Phaser.Game }).__game = game;
  void import('./levels').then(({ LEVELS }) => {
    (window as unknown as { __levels: unknown }).__levels = LEVELS;
  });
}
