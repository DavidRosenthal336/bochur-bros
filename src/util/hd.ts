import Phaser from 'phaser';
import { ART_SCALE, CAMERA_ZOOM, CANVAS_HEIGHT, CANVAS_WIDTH, HD } from '../config/render';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config/Tuning';

/**
 * The seams between a 320x180 world and a 1920x1080 canvas (config/render.ts).
 *
 * Everything in the game positions, sizes and collides in world units. These
 * are the few places where the real pixels show through, gathered so that no
 * scene or entity has to know which mode it is drawn in.
 */

/**
 * Make an HD texture take up the space its pixel-art original did.
 *
 * An HD sheet is six times the size, frame for frame. Rather than scale every
 * sprite that uses it by a sixth — which would scale its physics body too,
 * and every hitbox is set in world units by code that must not change — the
 * *frames* are told they are the original size while keeping the HD pixels:
 *
 * - WebGL draws a quad of `cutWidth x cutHeight` and samples the texture by
 *   the frame's UVs. The UVs are left covering the HD region and the cut size
 *   is divided down, so a 144x168 frame draws as 24x28 world units with every
 *   HD texel in it.
 * - Canvas draws the cut region of the image at `cut / source.resolution`,
 *   so there the cut stays HD and the source's resolution is set instead.
 *
 * Either way the frame's own width and height — what a sprite sizes itself
 * and its body from — become the original's. Tiles and backdrops are not put
 * through this: a tiling sprite copies its texture's cut region and repeats
 * it, so those keep their HD frames and the tiling sprite is scaled instead
 * (`tileScaleFor`).
 */
export function shrinkFrames(texture: Phaser.Textures.Texture, webgl: boolean): void {
  for (const name of texture.getFrameNames(true)) {
    const frame = texture.get(name);
    const width = frame.cutWidth / ART_SCALE;
    const height = frame.cutHeight / ART_SCALE;
    if (webgl) {
      frame.cutWidth = width;
      frame.cutHeight = height;
    } else {
      frame.source.resolution = ART_SCALE;
    }
    frame.width = width;
    frame.height = height;
    frame.halfWidth = Math.floor(width / 2);
    frame.halfHeight = Math.floor(height / 2);
    frame.centerX = Math.floor(width / 2);
    frame.centerY = Math.floor(height / 2);
    // `data` is Phaser's own bookkeeping, untyped: `realWidth` reads sourceSize.
    const data = (frame as unknown as {
      data: {
        sourceSize: { w: number; h: number };
        spriteSourceSize: { x: number; y: number; w: number; h: number };
      };
    }).data;
    data.sourceSize.w = width;
    data.sourceSize.h = height;
    data.spriteSourceSize.w = width;
    data.spriteSourceSize.h = height;
  }
}

/** Texture keys whose source is HD, so a tiling sprite of them knows to shrink. */
const HD_TILING = new Set<string>();

export function markHdTiling(key: string): void {
  HD_TILING.add(key);
}

/** The tile scale that makes a tiling sprite of this texture repeat at world size. */
export const tileScaleFor = (key: string): number => (HD_TILING.has(key) ? 1 / ART_SCALE : 1);

/** A tiling sprite, repeating at world size whatever its texture's resolution. */
export function tiling(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  key: string,
): Phaser.GameObjects.TileSprite {
  const sprite = scene.add.tileSprite(x, y, width, height, key);
  const scale = tileScaleFor(key);
  if (scale !== 1) sprite.setTileScale(scale);
  return sprite;
}

/** The height of a backdrop layer's image in world units. */
export const layerHeight = (scene: Phaser.Scene, key: string): number =>
  scene.textures.get(key).getSourceImage().height * tileScaleFor(key);

/**
 * Zoom a scene's camera so VIEW_WIDTH x VIEW_HEIGHT of world fills the canvas,
 * looking at the world's top-left corner (a scene that scrolls moves it on
 * from there).
 */
export function fitCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
  camera.setZoom(CAMERA_ZOOM);
  setView(camera, 0, 0);
}

/**
 * Phaser zooms a camera about its centre, so on a zoomed camera `scrollX` is
 * not the left edge of the view: the edge is `scrollX` plus half of what the
 * zoom cut off. Everything in the game that places or reads the view goes
 * through these, so that "the left edge" and "the top" mean the same thing
 * on a 320x180 canvas and a 1920x1080 one. (Following, bounds and the
 * deadzone are Phaser's own and already account for the zoom.)
 */
const VIEW_PAD = {
  x: (CANVAS_WIDTH - VIEW_WIDTH) / 2,
  y: (CANVAS_HEIGHT - VIEW_HEIGHT) / 2,
};

/**
 * Where something pinned to the screen (`setScrollFactor(0)`) has to be put
 * to appear at a view position. Phaser places such things as if the camera
 * were scrolled to the origin, and a zoomed camera scrolled to the origin
 * looks at the middle of the canvas, not its corner — so the view's top-left
 * is this far in. Add it to the position of anything pinned: HUD, backdrops,
 * the night.
 */
export const PIN = VIEW_PAD;

export const viewLeft = (camera: Phaser.Cameras.Scene2D.Camera): number => camera.scrollX + VIEW_PAD.x;
export const viewTop = (camera: Phaser.Cameras.Scene2D.Camera): number => camera.scrollY + VIEW_PAD.y;

/** Put the view's top-left corner at a world position. */
export function setView(camera: Phaser.Cameras.Scene2D.Camera, left: number, top: number): void {
  camera.setScroll(left - VIEW_PAD.x, top - VIEW_PAD.y);
}

/**
 * A camera shake of the strength the pixel-art game had.
 *
 * Phaser's shake moves by `intensity x canvas width x zoom`, then that offset
 * is applied under the zoom again, so on a six-times canvas at six-times zoom
 * the same number shakes thirty-six times harder.
 */
export function shake(camera: Phaser.Cameras.Scene2D.Camera, duration: number, intensity: number): void {
  camera.shake(duration, HD ? intensity / (ART_SCALE * ART_SCALE) : intensity);
}
