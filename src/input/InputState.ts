/**
 * The game never reads a key. It reads this.
 *
 * Everything downstream of input works in terms of abstract actions, so that
 * Milestone 7 can add touch buttons and a gamepad by writing new producers
 * for this same shape, without touching a line of gameplay code.
 */
export interface InputState {
  /** -1 left, 0 neutral, +1 right. Both keys down cancels out. */
  readonly moveX: -1 | 0 | 1;
  /** -1 up, 0 neutral, +1 down. Unused in Milestone 1; crouch/look-up land later. */
  readonly moveY: -1 | 0 | 1;
  /** Jump went down THIS frame. The thing a jump buffer remembers. */
  readonly jumpPressed: boolean;
  /** Jump is currently held. Drives variable jump height and, later, Peyos hover. */
  readonly jumpHeld: boolean;
  /** Run modifier. */
  readonly run: boolean;
  /** Action button — Menorah fire, Lulav swing. Milestone 5. */
  readonly actionPressed: boolean;
  /** Swap character. Milestone 3. */
  readonly swapPressed: boolean;
  /** Pause. Milestone 7. */
  readonly pausePressed: boolean;
}

export const NEUTRAL_INPUT: InputState = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  run: false,
  actionPressed: false,
  swapPressed: false,
  pausePressed: false,
};
