import Phaser from 'phaser';
import type { InputState } from './InputState';
import { NEUTRAL_INPUT } from './InputState';
import { flipMode, runToggled, toggleRun } from '../util/flip';

/**
 * Keyboard bindings, per BOCHUR_BROS_DESIGN.md §8.
 *
 * One departure from §8: it assigns `S` to both "crouch" (as part of WASD) and
 * "swap character". `S` is crouch here, and swap is on `Tab` or `C` — `C` sits
 * next to `Z` and `X`, so it is reachable without leaving the jump hand.
 */
/**
 * The number keys are the flip phone's layout (see `util/flip.ts`), and are
 * bound everywhere: they collide with nothing on a computer, and it means the
 * phone's controls can be tried at a desk.
 *
 *   1 jump left   2 jump         3 jump right
 *   4 left        5 jump         6 right
 *   7 run on/off  8 duck/pound   9 use your form
 *                 0 swap brothers
 */
const KEYS = {
  left: ['LEFT', 'A', 'FOUR', 'NUMPAD_FOUR'],
  right: ['RIGHT', 'D', 'SIX', 'NUMPAD_SIX'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S', 'EIGHT', 'NUMPAD_EIGHT'],
  jump: ['SPACE', 'Z', 'TWO', 'FIVE', 'NUMPAD_TWO', 'NUMPAD_FIVE'],
  jumpLeft: ['ONE', 'NUMPAD_ONE'],
  jumpRight: ['THREE', 'NUMPAD_THREE'],
  run: ['SHIFT', 'X'],
  runToggle: ['SEVEN', 'NUMPAD_SEVEN'],
  action: ['X', 'NINE', 'NUMPAD_NINE'],
  swap: ['TAB', 'C', 'ZERO', 'NUMPAD_ZERO'],
  pause: ['ESC'],
} as const;

/**
 * On the phone the D-pad's up and its middle button are jump as well: up is
 * where a thumb on a D-pad goes to jump, and nothing in the game needs to look
 * up badly enough to be worth a key the size of a grain of rice.
 */
const FLIP_JUMP = ['UP', 'ENTER'] as const;

type ActionName = keyof typeof KEYS;

export class KeyboardInput {
  private readonly keys = new Map<ActionName, Phaser.Input.Keyboard.Key[]>();
  private state: InputState = NEUTRAL_INPUT;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      // Touch-only device with no keyboard attached. Milestone 7 fills this gap.
      return;
    }

    for (const [action, codes] of Object.entries(KEYS) as [ActionName, readonly string[]][]) {
      const all = action === 'jump' && flipMode() ? [...codes, ...FLIP_JUMP] : codes;
      this.keys.set(
        action,
        all.map((code) => keyboard.addKey(code, true, true)),
      );
    }

    // Stop the browser scrolling the page or tabbing away mid-jump.
    keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'TAB']);
  }

  /** Call once per frame, before anything reads `current`. */
  update(): void {
    const jumpLeft = this.isDown('jumpLeft');
    const jumpRight = this.isDown('jumpRight');
    const left = this.isDown('left') || jumpLeft;
    const right = this.isDown('right') || jumpRight;
    // On the phone, up is jump, not looking up.
    const up = this.isDown('up') && !flipMode();
    const down = this.isDown('down');

    // Each polled once: JustDown consumes the flag.
    const jumped = this.justDown('jump');
    const jumpedLeft = this.justDown('jumpLeft');
    const jumpedRight = this.justDown('jumpRight');
    if (this.justDown('runToggle')) toggleRun();

    this.state = {
      moveX: axis(left, right),
      moveY: axis(up, down),
      jumpPressed: jumped || jumpedLeft || jumpedRight,
      jumpHeld: this.isDown('jump') || jumpLeft || jumpRight,
      run: this.isDown('run') || runToggled(),
      actionPressed: this.justDown('action'),
      swapPressed: this.justDown('swap'),
      pausePressed: this.justDown('pause'),
    };
  }

  get current(): InputState {
    return this.state;
  }

  private isDown(action: ActionName): boolean {
    return this.keys.get(action)?.some((key) => key.isDown) ?? false;
  }

  private justDown(action: ActionName): boolean {
    const bound = this.keys.get(action);
    if (!bound) return false;
    // JustDown consumes the flag, so every key must be polled, not short-circuited.
    let pressed = false;
    for (const key of bound) {
      if (Phaser.Input.Keyboard.JustDown(key)) pressed = true;
    }
    return pressed;
  }
}

function axis(negative: boolean, positive: boolean): -1 | 0 | 1 {
  if (negative === positive) return 0;
  return negative ? -1 : 1;
}
