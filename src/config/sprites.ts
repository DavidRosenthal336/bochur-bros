import type { CharacterId } from './Tuning';
import type { PowerTier } from '../systems/PowerState';

/**
 * Real sprite art, where it exists.
 *
 * Forms not listed here fall back to the placeholder rectangle, so art can
 * land one form at a time without the game caring which are drawn and which
 * are not. `tools/art/generate.py` produces these sheets; the art is authored
 * as text grids in that file rather than as binary assets, so a recolour or a
 * restyle is a diff rather than a redraw.
 */
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

export const SPRITE_SETS: Partial<Record<`${CharacterId}-${PowerTier}`, SpriteSet>> = {
  'mendy-small': {
    key: 'mendy_small',
    url: 'sprites/mendy_small.png',
    frameWidth: 24,
    frameHeight: 28,
    frames: { idle: 0, run: [1, 2, 3], jump: 4, fall: 5, crouch: 6, hurt: 7 },
    runFps: 10,
  },
};

export function spriteSetFor(character: CharacterId, tier: PowerTier): SpriteSet | undefined {
  return SPRITE_SETS[`${character}-${tier}`];
}

/** Animation keys are derived, so nothing has to keep two lists in step. */
export const animKey = (set: SpriteSet, name: 'idle' | 'run' | 'jump' | 'fall' | 'crouch' | 'hurt'): string =>
  `${set.key}-${name}`;
