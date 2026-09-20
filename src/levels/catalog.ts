/**
 * The shape of the game: four worlds, four levels each (§6).
 *
 * This is the map screen's source of truth, and it lists all sixteen from the
 * start so the journey is visible before it is built. A level with no `map` is
 * one that has not been made yet; the map screen shows it greyed and says so
 * rather than pretending it is locked.
 */
export interface LevelEntry {
  /** "1-1", "2-4", and also the map file's name when there is one. */
  readonly id: string;
  readonly name: string;
  /** Which `.tmj` to load. Undefined means this level is not built yet. */
  readonly map?: string;
  /** A boss level ends its world and yields the kiddush item (§6). */
  readonly isBoss?: boolean;
  /**
   * Seconds on the clock. §7 puts a timer on exactly three levels — 1-3, 3-3
   * and 4-3 — and leaves every other level untimed on purpose.
   */
  readonly timeLimit?: number;
}

export interface WorldEntry {
  readonly number: number;
  readonly name: string;
  /** The stolen kiddush item this world's boss is sitting on. */
  readonly prize: string;
  /** Which frame of `ui/prize_icons.png` stands for this world's prize. */
  readonly prizeIcon: 'meat_board' | 'poppers' | 'kugel' | 'tequila';
  /** Placeholder colour for the map screen until art exists. */
  readonly color: number;
  readonly levels: readonly LevelEntry[];
}

export const WORLDS: readonly WorldEntry[] = [
  {
    number: 1,
    name: 'Boro Park',
    prize: 'the meat board',
    prizeIcon: 'meat_board',
    color: 0x8d6bb5,
    levels: [
      { id: '1-1', name: 'Thirteenth Avenue', map: '1-1' },
      { id: '1-2', name: 'The Scaffolding', map: '1-2' },
      { id: '1-3', name: 'The Stroller', map: '1-3', timeLimit: 150 },
      { id: '1-4', name: 'The Pigeon King', map: '1-4', isBoss: true },
    ],
  },
  {
    number: 2,
    name: 'The Five Towns',
    prize: 'the pan of poppers',
    prizeIcon: 'poppers',
    color: 0x5fa86b,
    levels: [
      { id: '2-1', name: 'Central Avenue', map: '2-1' },
      { id: '2-2', name: 'Backyards' },
      { id: '2-3', name: 'The Pool' },
      { id: '2-4', name: 'The Escalade', isBoss: true },
    ],
  },
  {
    number: 3,
    name: 'The Catskills',
    prize: 'the kugel',
    prizeIcon: 'kugel',
    color: 0xc98b4a,
    levels: [
      { id: '3-1', name: 'The Colony' },
      { id: '3-2', name: 'The Lake' },
      { id: '3-3', name: 'Lights Out' },
      { id: '3-4', name: 'The Bear', isBoss: true },
    ],
  },
  {
    number: 4,
    name: 'Meah Shearim',
    prize: 'the tequila',
    prizeIcon: 'tequila',
    color: 0xd9b26f,
    levels: [
      { id: '4-1', name: 'The Alleys' },
      { id: '4-2', name: 'The Shuk' },
      { id: '4-3', name: 'Rooftops' },
      { id: '4-4', name: 'The Yetzer Hara', isBoss: true },
    ],
  },
];

/** Every level in play order, flattened. */
export const LEVEL_ORDER: readonly LevelEntry[] = WORLDS.flatMap((world) => world.levels);

export function findLevel(id: string): LevelEntry | undefined {
  return LEVEL_ORDER.find((entry) => entry.id === id);
}

/** The level after this one, or undefined at the end of the game. */
export function nextLevel(id: string): LevelEntry | undefined {
  const index = LEVEL_ORDER.findIndex((entry) => entry.id === id);
  return index >= 0 ? LEVEL_ORDER[index + 1] : undefined;
}

export function worldOf(id: string): WorldEntry | undefined {
  return WORLDS.find((world) => world.levels.some((level) => level.id === id));
}
