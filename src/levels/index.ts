import type { LevelDef } from './LevelDef';
import { levelFromTiled } from './tiled/loadTiled';
import type { TiledMap } from './tiled/TiledTypes';

/**
 * Every level the game knows about, discovered from the map files.
 *
 * §11: "Adding a level means adding a file, never editing game code." Dropping
 * a `.tmj` into `src/levels/maps/` is the whole procedure — this glob picks it
 * up at build time and its filename becomes its key.
 */
const mapModules = import.meta.glob<TiledMap>('./maps/*.tmj', { eager: true, import: 'default' });

export const LEVELS: Record<string, LevelDef> = Object.fromEntries(
  Object.entries(mapModules).map(([path, map]) => {
    const key = path.replace(/^.*\//, '').replace(/\.tmj$/, '');
    return [key, levelFromTiled(key, map)];
  }),
);

/** Levels that are not part of the game proper: instruments and test beds. */
export const GREYBOX_LEVELS: readonly string[] = ['powers', 'gym', 'core-loop', 'chavrusa'];

export const DEFAULT_LEVEL = '1-1';
