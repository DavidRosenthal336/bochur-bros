import Phaser from 'phaser';
import {
  ACTOR_SPRITES,
  actorAnimKey,
  animKey,
  SPRITE_SETS,
  TILE_TEXTURES,
} from '../config/sprites';
import type { CharacterPose } from '../config/sprites';
import { SceneKey } from './SceneKey';

/**
 * Loads every sheet in the art registry and registers their animations.
 *
 * Animations are global in Phaser, so registering them once here means every
 * scene can play them and no scene has to know how anything is drawn.
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

    for (const set of Object.values(ACTOR_SPRITES)) {
      this.load.spritesheet(set.key, set.url, {
        frameWidth: set.frameWidth,
        frameHeight: set.frameHeight,
      });
    }

    for (const [name, url] of Object.entries(TILE_TEXTURES)) {
      this.load.image(`tile-${name}`, url);
    }
  }

  create(): void {
    for (const set of Object.values(SPRITE_SETS)) {
      const still = (name: CharacterPose, frame: number) => {
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

    for (const set of Object.values(ACTOR_SPRITES)) {
      for (const [pose, frames] of Object.entries(set.poses)) {
        const list = typeof frames === 'number' ? [frames] : frames;
        this.anims.create({
          key: actorAnimKey(set, pose),
          frames: list.map((frame) => ({ key: set.key, frame })),
          frameRate: list.length > 1 ? set.fps : 1,
          repeat: list.length > 1 ? -1 : 0,
        });
      }
    }

    this.scene.start(SceneKey.WorldMap);
  }
}
