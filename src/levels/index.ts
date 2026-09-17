import type { LevelDef } from './LevelDef';
import { CORE_LOOP_LEVEL } from './coreLoopLevel';
import { TEST_LEVEL } from './testLevel';

/**
 * Every level the game knows about.
 *
 * Milestone 4 replaces this hand-written map with Tiled files discovered at
 * build time; until then it is the one place a level gets registered.
 */
export const LEVELS: Record<string, LevelDef> = {
  [CORE_LOOP_LEVEL.key]: CORE_LOOP_LEVEL,
  [TEST_LEVEL.key]: TEST_LEVEL,
};

/** The order F3 cycles through, for playtesting. */
export const LEVEL_ORDER: readonly string[] = [CORE_LOOP_LEVEL.key, TEST_LEVEL.key];

export const DEFAULT_LEVEL = CORE_LOOP_LEVEL.key;
