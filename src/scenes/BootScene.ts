import Phaser from 'phaser';
import { animKey, SPRITE_SETS } from '../config/sprites';
import { SceneKey } from './SceneKey';

/**
 * Loads the sprite sheets and registers their animations.
 *
 * Animations are global in Phaser, so registering them once here means every
 * scene can play them and no scene has to know how a character is drawn.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    for (const set of Object.values(SPRITE_SETS)) {
      this.load.spritesheet(set.key, set.url, {
        frameWidth: set.frameWidth,
        frameHeight: set.frameHeight,
      });
    }
  }

  create(): void {
    for (const set of Object.values(SPRITE_SETS)) {
      const still = (name: 'idle' | 'jump' | 'fall' | 'crouch' | 'hurt', frame: number) => {
        this.anims.create({
          key: animKey(set, name),
          frames: [{ key: set.key, frame }],
          frameRate: 1,
        });
      };

      this.anims.create({
        key: animKey(set, 'run'),
        frames: set.frames.run.map((frame) => ({ key: set.key, frame })),
        frameRate: set.runFps,
        repeat: -1,
      });

      still('idle', set.frames.idle);
      still('jump', set.frames.jump);
      still('fall', set.frames.fall);
      still('crouch', set.frames.crouch);
      still('hurt', set.frames.hurt);
    }

    this.scene.start(SceneKey.WorldMap);
  }
}
