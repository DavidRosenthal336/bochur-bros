import type { CharacterId } from './Tuning';
import type { PowerTier } from '../systems/PowerState';
import { artExists } from './scenery';

/**
 * The art registry: every drawn sheet in the game, and which frame is which.
 *
 * Nothing that uses a sprite knows where it came from or how big its frame is
 * — it asks this table. A form or a creature that is not listed here falls
 * back to the generated placeholder rectangle, so art can land one piece at a
 * time without the game caring which pieces have arrived.
 *
 * `tools/art/generate.py` produces every one of these sheets. The art is
 * authored as text grids in that script rather than as binary assets, so a
 * recolour or a restyle is a diff rather than a redraw, and
 * `npm run check:art` fails the build if a PNG here stops matching the frame
 * sizes this file claims.
 */

/** Poses every playable character has, in every form. */
export type CharacterPose = 'idle' | 'run' | 'jump' | 'fall' | 'crouch' | 'hurt';

export interface SpriteSet {
  /** Texture key, and also the file name. */
  readonly key: string;
  readonly url: string;
  /** Frame size. Larger than the hitbox on purpose — see ART_SPEC.md. */
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Which frame index is which pose. */
  readonly frames: {
    readonly idle: number;
    readonly run: readonly number[];
    readonly jump: number;
    readonly fall: number;
    readonly crouch: number;
    readonly hurt: number;
  };
  /** Run cycle speed at full walking pace; it scales with actual speed. */
  readonly runFps: number;
}

/**
 * Every character sheet has the same eight frames in the same order, so the
 * only thing that varies between forms is the frame size.
 *
 * The run cycle is 1, 2, 3, 2 rather than 1, 2, 3: the three drawn legs are
 * contact, passing and contact-on-the-other-foot, so playing them straight
 * through snaps back to the first pose and the walk limps. Bouncing off the
 * middle pose gives a four-beat cycle out of three drawings.
 */
const CHARACTER_FRAMES = {
  idle: 0,
  run: [1, 2, 3, 2],
  jump: 4,
  fall: 5,
  crouch: 6,
  hurt: 7,
} as const;

const character = (key: string, frameWidth: number, frameHeight: number): SpriteSet => ({
  key,
  url: `sprites/${key}.png`,
  frameWidth,
  frameHeight,
  frames: CHARACTER_FRAMES,
  runFps: 10,
});

export const SPRITE_SETS: Partial<Record<`${CharacterId}-${PowerTier}`, SpriteSet>> = {
  'mendy-small': character('mendy_small', 24, 28),
  'mendy-cholent': character('mendy_cholent', 26, 36),
  'mendy-menorah': character('mendy_menorah', 26, 36),
  'mendy-lulav': character('mendy_lulav', 26, 36),
  'mendy-peyos': character('mendy_peyos', 26, 36),
  'berel-small': character('berel_small', 26, 30),
  'berel-cholent': character('berel_cholent', 28, 41),
  'berel-menorah': character('berel_menorah', 28, 41),
  'berel-lulav': character('berel_lulav', 28, 41),
  'berel-peyos': character('berel_peyos', 28, 41),
};

export function spriteSetFor(character: CharacterId, tier: PowerTier): SpriteSet | undefined {
  const set = SPRITE_SETS[`${character}-${tier}`];
  return set && artExists(set.url) ? set : undefined;
}

/** Animation keys are derived, so nothing has to keep two lists in step. */
export const animKey = (set: SpriteSet, name: CharacterPose): string => `${set.key}-${name}`;

// --------------------------------------------------------------- actors ---

/**
 * Everything drawn that is not a playable character: enemies, hazards, the
 * boss, coins, boxes, crates, the hat.
 *
 * These have no fixed pose vocabulary — a pigeon perches and swoops, a cart
 * just sits there — so poses are a free-form map and the entity asks for the
 * one it wants by name.
 */
export interface ActorSpriteSet {
  readonly key: string;
  readonly url: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Named pose → one frame, or a list of frames to cycle. */
  readonly poses: Readonly<Record<string, number | readonly number[]>>;
  /** Playback rate for the poses that are a list. */
  readonly fps: number;
  /**
   * Where the origin sits vertically. Anything that stands on the ground is
   * anchored at its feet so a spawn point is a floor position; coins and
   * flames hang in the air and are anchored at their middle.
   */
  readonly originY: 0.5 | 1;
}

const actor = (
  key: string,
  frameWidth: number,
  frameHeight: number,
  poses: Readonly<Record<string, number | readonly number[]>>,
  options: { readonly fps?: number; readonly originY?: 0.5 | 1 } = {},
): ActorSpriteSet => ({
  key,
  url: `sprites/${key}.png`,
  frameWidth,
  frameHeight,
  poses,
  fps: options.fps ?? 8,
  originY: options.originY ?? 1,
});

export const ACTOR_SPRITES = {
  /** The hat, which lifts off the head and hovers while airborne (§5, §9). */
  peyosHat: actor('peyos_hat', 12, 6, { hat: 0 }, { originY: 0.5 }),

  pigeon: actor(
    'pigeon',
    20,
    16,
    { perch: 0, rear: 1, fly: [2, 3], swoop: 4, squash: 5 },
    { fps: 8 },
  ),
  rat: actor('rat', 20, 14, { run: [0, 1], squash: 2 }, { fps: 12 }),
  pigeonKing: actor('pigeon_king', 44, 38, { idle: 0, wings: 1, dive: 2, hurt: 3 }),

  /**
   * The Yetzer Hara.
   *
   * §6 calls him "a shape-shifter with no true form", and the sheet is drawn
   * that way: the first two frames are a formless dark shape, and the other
   * three are the borrowed forms he cycles through in World 4. The prologue
   * only ever uses the smoke, which is the point — the final fight has nothing
   * left to reveal if you have had a good look at him in the first minute.
   */
  yetzerHara: actor(
    'yetzer_hara',
    44,
    46,
    { smoke: [0, 1], asPigeonKing: 2, asEscalade: 3, asBear: 4 },
    { fps: 6 },
  ),

  cart: actor('cart', 26, 22, { idle: 0 }),

  // --- World 2, The Five Towns (§6) ----------------------------------------
  /**
   * The signature enemy. "Hiss, chase on foot, relentless, don't scare off. A
   * stomp makes one angrier before it goes down (two hits)."
   */
  goose: actor('goose', 24, 26, { idle: 0, hiss: 1, run: [2, 0], angry: 3, squash: 4 }, { fps: 7 }),
  chipmunk: actor('chipmunk', 16, 14, { run: [0, 1], squash: 2 }, { fps: 14 }),
  /** Cannot reach you. Barks, and the bark is the hazard. */
  dog: actor('dog', 24, 22, { quiet: 0, bark: 1 }),
  sprinkler: actor('sprinkler', 16, 28, { down: 0, up: 1 }),
  mower: actor('mower', 28, 20, { idle: 0 }),
  blower: actor('blower', 20, 20, { idle: 0 }),
  windPuff: actor('wind_puff', 16, 8, { idle: 0 }, { originY: 0.5 }),
  trampoline: actor('trampoline', 36, 16, { idle: 0, bounce: 1 }),
  gate: actor('gate', 20, 36, { open: 0, shut: 1 }),
  minivan: actor('minivan', 56, 34, { idle: 0 }),
  golfCart: actor('golf_cart', 28, 20, { idle: 0 }),
  /** The boss. One frame per phase, and one for after. */
  escalade: actor('escalade', 88, 46, { phase1: 0, phase2: 1, phase3: 2, beaten: 3 }),
  pipe: actor('scaffold_pipe', 16, 44, { idle: 0 }),
  stroller: actor('stroller', 28, 30, { idle: 0 }),
  van: actor('van', 50, 32, { idle: 0 }),

  coin: actor('coin', 8, 10, { spin: [0, 1, 2, 3] }, { fps: 8, originY: 0.5 }),
  flame: actor('menorah_flame', 8, 8, { burn: [0, 1] }, { fps: 12, originY: 0.5 }),
  lchaim: actor('lchaim', 10, 14, { idle: 0 }),
  powerUp: actor('powerup_pickup', 14, 14, { idle: 0 }),
  mysteryBox: actor('mystery_box', 16, 16, { idle: 0 }),
  boxUsed: actor('box_used', 16, 16, { idle: 0 }),
  crate: actor('crate', 16, 16, { idle: 0 }),
} as const satisfies Record<string, ActorSpriteSet>;

export type ActorSpriteName = keyof typeof ACTOR_SPRITES;

export const actorAnimKey = (set: ActorSpriteSet, pose: string): string => `${set.key}-${pose}`;

// ---------------------------------------------------------------- tiles ---

/**
 * The Boro Park tileset, one 16x16 texture per file.
 *
 * Loaded as separate images rather than sliced out of the strip because the
 * solids are drawn with tiling sprites, and a tiling sprite repeats a whole
 * texture. Nine small files is a cheaper answer than a strip plus nine
 * canvases to cut it up.
 */
export const TILE_TEXTURES = {
  brick: 'tiles/brick.png',
  sidewalk: 'tiles/sidewalk.png',
  asphalt: 'tiles/asphalt.png',
  scaffoldPole: 'tiles/scaffold_pole.png',
  scaffoldPlank: 'tiles/scaffold_plank.png',
  fireEscape: 'tiles/fire_escape.png',
  awning: 'tiles/awning.png',
  sewerGrate: 'tiles/sewer_grate.png',
  window: 'tiles/window.png',

  // --- World 2, The Five Towns ---------------------------------------------
  lawn: 'tiles/five_towns_lawn.png',
  hedge: 'tiles/five_towns_hedge.png',
  siding: 'tiles/five_towns_siding.png',
  shingle: 'tiles/five_towns_shingle.png',
  driveway: 'tiles/five_towns_driveway.png',
  fence: 'tiles/five_towns_fence.png',
  poolWater: 'tiles/five_towns_pool_water.png',
  poolTile: 'tiles/five_towns_pool_tile.png',
  deck: 'tiles/five_towns_deck.png',
} as const;

export type TileTextureName = keyof typeof TILE_TEXTURES;
