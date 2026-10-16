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
 * `?art=new`: only the new art, and coloured boxes for everything still to be
 * drawn — the way to see how far the art has got. `?art=old`: the game as it
 * was, ignoring the new art entirely.
 */
export const ART_MODE: 'both' | 'new' | 'old' =
  params?.get('art') === 'new' ? 'new' : params?.get('art') === 'old' ? 'old' : 'both';

/** The pipeline's art for a path the game asks for, if there is any (and it is wanted). */
export function processedArt(url: string): ProcessedEntry | undefined {
  if (ART_MODE === 'old') return undefined;
  return PROCESSED.entries[url];
}

/** The texture atlases the pipeline packed, by name. */
export const PROCESSED_ATLASES = PROCESSED.atlases;
