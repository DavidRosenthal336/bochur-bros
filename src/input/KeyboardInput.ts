import Phaser from 'phaser';
import type { InputState } from './InputState';
import { NEUTRAL_INPUT } from './InputState';

/**
 * Keyboard bindings, per BOCHUR_BROS_DESIGN.md §8.
 *
 * One departure from §8: it assigns `S` to both "crouch" (as part of WASD) and
 * "swap character". `S` is crouch here, and swap is on `Tab` or `C` — `C` sits
 * next to `Z` and `X`, so it is reachable without leaving the jump hand.
 */
const KEYS = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['SPACE', 'Z'],
  run: ['SHIFT', 'X'],
  action: ['X'],
  swap: ['TAB', 'C'],
  pause: ['ESC'],
} as const;

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
      this.keys.set(
        action,
        codes.map((code) => keyboard.addKey(code, true, true)),
      );
    }

    // Stop the browser scrolling the page or tabbing away mid-jump.
    keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'TAB']);
  }

  /** Call once per frame, before anything reads `current`. */
  update(): void {
    const left = this.isDown('left');
    const right = this.isDown('right');
    const up = this.isDown('up');
    const down = this.isDown('down');

    this.state = {
      moveX: axis(left, right),
      moveY: axis(up, down),
      jumpPressed: this.justDown('jump'),
      jumpHeld: this.isDown('jump'),
      run: this.isDown('run'),
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
