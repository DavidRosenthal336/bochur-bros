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
 * Is the new art switched on for everyone?
 *
 * Yes: everyone sees the new art where it exists and the original everywhere
 * else (the tiles, which stayed original on purpose). By address:
 *
 * - `?art=mix`: the same as the default.
 * - `?art=new`: only the new art, with coloured boxes for what was never
 *   redrawn — the way to see what is left.
 * - `?art=old`: the original art, as the game looked before the redraw.
 *
 * Set this to false to put the original art back for everyone.
 */
const NEW_ART_BY_DEFAULT = true;

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
