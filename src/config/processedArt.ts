import { PROCESSED } from 'virtual:processed-art';

/**
 * Art from the pipeline (`npm run assets`, see ASSETS.md).
 *
 * Keyed by the same path the game already asks for — `sprites/mendy_small.png`,
 * `tiles/brick.png` — so the rest of the game never needs to know which art it
 * is drawing. A processed entry is either a frame in a texture atlas (sprite
 * sheets) or a file of its own (tiles and backdrops, which repeat across the
 * screen and so cannot share a texture).
 */
export interface ProcessedEntry {
  readonly atlas?: string;
  readonly frame?: string;
  readonly file?: string;
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly frames?: number;
}

const params = typeof location === 'undefined' ? undefined : new URLSearchParams(location.search);

/**
 * Is the new art switched on for everyone yet?
 *
 * Not yet: the live game keeps its original art until the new art is ready and
 * the developer says so, so a half-redrawn cast never reaches players. Until
 * then the new art is a preview, by address:
 *
 * - `?art=mix`: the new art where it exists, the original everywhere else.
 * - `?art=new`: only the new art, with coloured boxes for what is still to be
 *   drawn — the way to see how far the art has got.
 * - `?art=old`: the original art (what everyone sees while this is false).
 *
 * Flip this to true to make `mix` the default.
 */
const NEW_ART_BY_DEFAULT = false;

const asked = params?.get('art');
export const ART_MODE: 'both' | 'new' | 'old' =
  asked === 'new' ? 'new' : asked === 'mix' || asked === 'both' ? 'both' : asked === 'old' ? 'old' : NEW_ART_BY_DEFAULT ? 'both' : 'old';

/** The pipeline's art for a path the game asks for, if there is any (and it is wanted). */
export function processedArt(url: string): ProcessedEntry | undefined {
  if (ART_MODE === 'old') return undefined;
  return PROCESSED.entries[url];
}

/** The texture atlases the pipeline packed, by name. */
export const PROCESSED_ATLASES = PROCESSED.atlases;
