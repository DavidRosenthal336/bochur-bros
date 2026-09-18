import type { CharacterId } from '../config/Tuning';
import { DEFAULT_CHARACTER, GAMEPLAY } from '../config/Tuning';
import { LEVEL_ORDER, WORLDS, worldOf } from '../levels/catalog';

/**
 * Progress, in `localStorage`. No backend, no accounts, no passwords (§3, §7).
 *
 * §7 lists exactly what to keep: world/level unlocked, lives, coins, kiddush
 * items recovered, and the character last used. Auto-saved after every
 * completed level and nowhere else.
 */
export interface SaveData {
  /** Bumped when the shape changes, so an old save is discarded rather than crashing. */
  readonly version: number;
  /** Level ids that have been finished. */
  readonly completed: readonly string[];
  /** Worlds whose prize has been recovered, by world number. */
  readonly kiddushItems: readonly number[];
  readonly lives: number;
  readonly coins: number;
  readonly character: CharacterId;
  /**
   * Whether the prologue has been watched.
   *
   * Added without bumping `VERSION`, on purpose. A version bump discards the
   * save, and discarding somebody's progress to record that they have not seen
   * a thing they have not seen is a bad trade. An older save simply reads as
   * `false` and gets the prologue once, which is the right answer anyway.
   */
  readonly introSeen: boolean;
}

const KEY = 'bochur-bros/save/v1';
const VERSION = 1;

export const EMPTY_SAVE: SaveData = {
  version: VERSION,
  completed: [],
  kiddushItems: [],
  lives: GAMEPLAY.startingLives,
  coins: 0,
  character: DEFAULT_CHARACTER,
  introSeen: false,
};

/**
 * Read the save.
 *
 * Every failure mode lands on a fresh game rather than an exception: storage
 * can be disabled outright, quota'd, or hold a save from an older shape, and
 * none of those should stop someone playing.
 */
export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_SAVE;

    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== VERSION) return EMPTY_SAVE;

    return {
      version: VERSION,
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter(isKnownLevel) : [],
      kiddushItems: Array.isArray(parsed.kiddushItems) ? parsed.kiddushItems : [],
      lives: typeof parsed.lives === 'number' ? parsed.lives : EMPTY_SAVE.lives,
      coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
      character: parsed.character === 'berel' ? 'berel' : 'mendy',
      introSeen: parsed.introSeen === true,
    };
  } catch {
    return EMPTY_SAVE;
  }
}

/** Write the save. Silently does nothing if storage is unavailable. */
export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private windows, blocked storage, full quota. Not worth interrupting play.
  }
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** Record a finished level and, if it was a boss, the prize that came with it. */
export function completeLevel(save: SaveData, levelId: string): SaveData {
  const completed = save.completed.includes(levelId)
    ? save.completed
    : [...save.completed, levelId];

  const world = worldOf(levelId);
  const entry = LEVEL_ORDER.find((level) => level.id === levelId);
  const wonPrize = entry?.isBoss === true && world !== undefined;
  const kiddushItems =
    wonPrize && !save.kiddushItems.includes(world.number)
      ? [...save.kiddushItems, world.number]
      : save.kiddushItems;

  return { ...save, completed, kiddushItems };
}

/**
 * Is this level playable?
 *
 * The first level of the game always is. Otherwise a level opens once the one
 * before it is finished — and a world's first level needs the previous world's
 * boss, which is §6's rule that beating a boss unlocks the next world.
 */
export function isUnlocked(save: SaveData, levelId: string): boolean {
  const index = LEVEL_ORDER.findIndex((level) => level.id === levelId);
  if (index <= 0) return index === 0;

  const previous = LEVEL_ORDER[index - 1]!;
  return save.completed.includes(previous.id);
}

/** The furthest level the player can currently play. Where the marker starts. */
export function currentLevel(save: SaveData): string {
  for (const level of LEVEL_ORDER) {
    if (!save.completed.includes(level.id)) return level.id;
  }
  return LEVEL_ORDER[LEVEL_ORDER.length - 1]!.id;
}

function isKnownLevel(id: unknown): id is string {
  return typeof id === 'string' && LEVEL_ORDER.some((level) => level.id === id);
}

void WORLDS;
