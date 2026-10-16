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
import { PROCESSED_ATLASES, processedArt } from '../config/processedArt';
import { AVAILABLE_ART as AVAILABLE_URLS } from 'virtual:available-art';
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
/** A sprite sheet to be cut out of a processed atlas once the atlas has loaded. */
interface AtlasSheet {
  readonly key: string;
  readonly atlas: string;
  readonly frame: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

export class BootScene extends Phaser.Scene {
  /** Sheets that come from the art pipeline's atlases (ASSETS.md). */
  private atlasSheets: AtlasSheet[] = [];

  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    this.atlasSheets = [];
    const atlases = new Set<string>();
    // Only ever ask for a file that is there. The registries list everything
    // the game knows how to draw, drawn or not, and the Vite plugins behind
    // `artExists` say which of those have actually been made.
    //
    // The file to load is the art pipeline's if it made one (ASSETS.md), and
    // the one in public/ otherwise. A sheet the pipeline packed into an atlas
    // is not loaded here at all — the atlas is, and the sheet is cut out of it
    // in `create`, under the same key the game has always used.
    const sheet = (set: { key: string; url: string; frameWidth: number; frameHeight: number }) => {
      if (!artExists(set.url)) return;
      const processed = processedArt(set.url);
      if (processed?.atlas && processed.frame) {
        if (processed.frameWidth === set.frameWidth && processed.frameHeight === set.frameHeight) {
          atlases.add(processed.atlas);
          this.atlasSheets.push({
            key: set.key,
            atlas: processed.atlas,
            frame: processed.frame,
            frameWidth: set.frameWidth,
            frameHeight: set.frameHeight,
          });
          return;
        }
        // The game's frame size is what its hitboxes are lined up against;
        // art cut to any other size would be drawn in the wrong place.
        console.warn(
          `bochur-bros: new art for ${set.url} is ${processed.frameWidth}x${processed.frameHeight} a frame, ` +
            `the game expects ${set.frameWidth}x${set.frameHeight}; keeping the old art`,
        );
        if (!AVAILABLE_URLS.has(set.url)) return;
        this.load.spritesheet(set.key, set.url, { frameWidth: set.frameWidth, frameHeight: set.frameHeight });
        return;
      }
      this.load.spritesheet(set.key, processed?.file ?? set.url, {
        frameWidth: set.frameWidth,
        frameHeight: set.frameHeight,
      });
    };
    const image = (key: string, url: string) => {
      if (!artExists(url)) return;
      this.load.image(key, processedArt(url)?.file ?? url);
    };

    for (const set of Object.values(SPRITE_SETS)) sheet(set);
    for (const set of Object.values(ACTOR_SPRITES)) sheet(set);
    for (const set of Object.values(SCENERY)) sheet(set);

    for (const [name, url] of Object.entries(TILE_TEXTURES)) image(`tile-${name}`, url);

    for (const variant of Object.keys(BACKDROPS) as BackdropVariant[]) {
      for (const layer of [...BACKDROPS[variant], tallSky(variant)]) image(layer.key, layer.url);
    }

    for (const name of atlases) {
      const atlas = PROCESSED_ATLASES[name];
      if (atlas) this.load.atlas(`atlas-${name}`, atlas.image, atlas.data);
    }
  }

  /**
   * Cut each pipeline sheet out of its atlas, as a sprite sheet under the key
   * the game already uses, so every animation and every `setTexture` finds it
   * exactly as it found the old one.
   *
   * Phaser makes the whole atlas the new texture's base frame, which would draw
   * the entire atlas for anything that asks for the texture without a frame
   * number. So the base frame is pointed back at just this sheet.
   */
  private cutAtlasSheets(): void {
    for (const sheet of this.atlasSheets) {
      const atlasKey = `atlas-${sheet.atlas}`;
      if (!this.textures.exists(atlasKey) || this.textures.exists(sheet.key)) continue;
      const source = this.textures.getFrame(atlasKey, sheet.frame);
      if (!source) continue;
      const texture = this.textures.addSpriteSheetFromAtlas(sheet.key, {
        atlas: atlasKey,
        frame: sheet.frame,
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
      if (!texture) continue;
      texture.remove('__BASE');
      texture.add('__BASE', 0, source.cutX, source.cutY, source.cutWidth, source.cutHeight);
    }
  }

  create(): void {
    this.cutAtlasSheets();
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
      if (!artExists(set.url) || !loaded(set.key)) continue;
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
      if (!artExists(set.url) || !loaded(set.key)) continue;
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
