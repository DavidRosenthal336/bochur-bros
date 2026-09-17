/**
 * The subset of Tiled's JSON map format (`.tmj`) this game reads.
 *
 * Levels are authored as **object layers** rather than tile layers, because
 * greybox geometry is rectangles and an object layer is exactly a list of
 * rectangles. That also means no tileset image is needed yet. When real tile
 * art arrives, a tile layer gets added alongside these and the loader grows a
 * branch — the object layers keep working unchanged.
 *
 * Two layers are read:
 *   "solids"    rectangle objects; optional `kind` property
 *   "entities"  objects whose Tiled *class* says what they are
 */

export interface TiledProperty {
  readonly name: string;
  readonly type: string;
  readonly value: string | number | boolean;
}

export interface TiledObject {
  readonly id: number;
  readonly name: string;
  /** Tiled calls this "Class" in the UI. Older exports use `type`. */
  readonly class?: string;
  readonly type?: string;
  /** Pixels, top-left, except for point objects where width/height are 0. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly point?: boolean;
  readonly properties?: readonly TiledProperty[];
}

export interface TiledObjectLayer {
  readonly name: string;
  readonly type: 'objectgroup';
  readonly objects: readonly TiledObject[];
}

export interface TiledTileLayer {
  readonly name: string;
  readonly type: 'tilelayer';
}

export type TiledLayer = TiledObjectLayer | TiledTileLayer;

export interface TiledMap {
  readonly width: number;
  readonly height: number;
  readonly tilewidth: number;
  readonly tileheight: number;
  readonly layers: readonly TiledLayer[];
  readonly properties?: readonly TiledProperty[];
}
