import type Phaser from 'phaser';
import type { InputState } from './InputState';
import { KeyboardInput } from './KeyboardInput';
import { touchControls } from './TouchInput';

/**
 * Anything that can drive the player.
 *
 * The game has never read a key — it reads an `InputState` — and this is the
 * shape of the thing that produces one. It exists so that the scene can hold a
 * keyboard, a set of on-screen buttons, both at once, or, in the headless test
 * rig, a script.
 */
export interface InputSource {
  update(): void;
  readonly current: InputState;
}

/**
 * Keyboard and thumbs at the same time.
 *
 * Not "keyboard, or touch if this looks like a phone". A tablet with a case
 * keyboard is both; a laptop with a touchscreen is both; and deciding which one
 * a player owns from a media query is exactly the sort of guess that leaves
 * somebody unable to play. Every frame both are read and merged, and a device
 * that has no keyboard simply contributes nothing from it.
 */
export class CombinedInput implements InputSource {
  private readonly keyboard: KeyboardInput;
  private readonly touch: ReturnType<typeof touchControls>;
  private state: InputState;

  constructor(scene: Phaser.Scene) {
    this.keyboard = new KeyboardInput(scene);
    this.touch = touchControls();
    this.keyboard.update();
    this.touch.update();
    this.state = this.keyboard.current;
  }

  update(): void {
    this.keyboard.update();
    this.touch.update();

    const k = this.keyboard.current;
    const t = this.touch.current;
    this.state = {
      // Left on one and right on the other cancel, the same as both arrow keys.
      moveX: clampAxis(k.moveX + t.moveX),
      moveY: clampAxis(k.moveY + t.moveY),
      jumpPressed: k.jumpPressed || t.jumpPressed,
      jumpHeld: k.jumpHeld || t.jumpHeld,
      run: k.run || t.run,
      actionPressed: k.actionPressed || t.actionPressed,
      swapPressed: k.swapPressed || t.swapPressed,
      pausePressed: k.pausePressed || t.pausePressed,
    };
  }

  get current(): InputState {
    return this.state;
  }
}

function clampAxis(sum: number): -1 | 0 | 1 {
  if (sum > 0) return 1;
  if (sum < 0) return -1;
  return 0;
}
