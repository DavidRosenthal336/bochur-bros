import Phaser from 'phaser';
import {
  ACTOR_SPRITES,
  actorAnimKey,
  animKey,
  SPRITE_SETS,
  TILE_TEXTURES,
} from '../config/sprites';
import type { CharacterPose } from '../config/sprites';
import { artExists, BACKDROPS, SCENERY, tallSky } from '../config/scenery';
import type { BackdropVariant } from '../config/scenery';
import { SceneKey } from './SceneKey';
import { PROLOGUE_LEVEL } from '../levels';
import { loadSave } from '../systems/SaveGame';

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
    // Only ever ask for a file that is there. The registries list everything
    // the game knows how to draw, drawn or not, and the Vite plugin behind
    // `artExists` says which of those have actually been made.
    const sheet = (set: { key: string; url: string; frameWidth: number; frameHeight: number }) => {
      if (!artExists(set.url)) return;
      this.load.spritesheet(set.key, set.url, {
        frameWidth: set.frameWidth,
        frameHeight: set.frameHeight,
      });
    };

    for (const set of Object.values(SPRITE_SETS)) sheet(set);
    for (const set of Object.values(ACTOR_SPRITES)) sheet(set);
    for (const set of Object.values(SCENERY)) sheet(set);

    for (const [name, url] of Object.entries(TILE_TEXTURES)) {
      if (artExists(url)) this.load.image(`tile-${name}`, url);
    }

    for (const variant of Object.keys(BACKDROPS) as BackdropVariant[]) {
      for (const layer of [...BACKDROPS[variant], tallSky(variant)]) {
        if (artExists(layer.url)) this.load.image(layer.key, layer.url);
      }
    }
  }

  create(): void {
    /**
     * Build animations only for sheets that actually arrived.
     *
     * `artExists` answers whether a file was in `public/` when the bundle was
     * built, which is not the same question as whether it is on the server the
     * bundle is being served from — and the difference is not cosmetic. A sheet
     * that 404s leaves no texture behind, `anims.create` walks into it looking
     * for frames, and the whole of `create` dies with "Cannot read properties
     * of undefined". Boot never finishes, no scene ever starts, and the game is
     * a plain dark rectangle with no error anywhere a player can see.
     *
     * That shipped: the playtest artifact was missing one 220-byte PNG, and the
     * entire game refused to boot because of it. One absent drawing should cost
     * its own drawing and nothing else — the registry already falls back to a
     * plain rectangle for art that does not exist.
     */
    const loaded = (key: string): boolean => {
      if (this.textures.exists(key)) return true;
      console.warn(`bochur-bros: "${key}" did not load; drawing it as a rectangle instead`);
      return false;
    };

    for (const set of Object.values(SPRITE_SETS)) {
      if (!loaded(set.key)) continue;
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
      if (!loaded(set.key)) continue;
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

    /**
     * A new game opens on the prologue, not the map.
     *
     * The map is four neighbourhoods and no explanation; the prologue is the
     * explanation. Once it has been watched the game opens where it used to,
     * and it can be watched again from the map.
     */
    if (loadSave().introSeen) {
      this.scene.start(SceneKey.WorldMap);
      return;
    }
    this.scene.start(SceneKey.Level, { levelKey: PROLOGUE_LEVEL, prologue: true });
  }
}
