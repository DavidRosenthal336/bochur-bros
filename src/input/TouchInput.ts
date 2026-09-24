import type { InputState } from './InputState';
import { NEUTRAL_INPUT } from './InputState';

/**
 * On-screen controls (§8, §12 Milestone 7).
 *
 * §8: "on-screen left/right buttons, jump button, action button, swap button.
 * Large hit areas, positioned for thumbs, semi-transparent. Test on an actual
 * phone — this is not optional polish." §3 makes phone play "a first-class
 * requirement, not an afterthought".
 *
 * ## Why these are HTML elements and not sprites
 *
 * Everything else the game draws lives in a 320x180 canvas that is scaled to
 * whatever the window is. Controls drawn in there would be scaled too — which
 * means the size of the jump button would depend on the aspect ratio of the
 * phone, and a thumb would land on a different place in the level depending on
 * how the canvas happened to be letterboxed. Buttons in the page are the
 * opposite: they are sized in real millimetres, they sit outside the game's
 * coordinate space entirely, and the browser does the hit testing.
 *
 * It also means the markup and its layout live in `index.html` beside the start
 * card, which is where the rest of the page's furniture is. This class does not
 * build anything; it binds to what is already there.
 *
 * ## Two buttons §8 does not list
 *
 * **Down**, because §4 gives Berel a ground pound on "Down, in mid-air" and §5
 * gives every character a crouch, and 2-3 swims downward with it.
 *
 * **Run**, for the same reason and more sharply: the leaf blowers in 2-2 push
 * at 300 px/s^2 against Mendy's walking acceleration of 133 and his running
 * acceleration of 323. Walking into one, he goes backwards. Without a run
 * button there is a corridor in World 2 that a phone simply cannot cross.
 *
 * ## The held set is rebuilt from scratch on every event, and that is the point
 *
 * The first version of this tracked each touch in a map: a pointer went in on
 * `pointerdown`, moved between buttons on `pointermove`, came out on
 * `pointerup`. It got stuck — the button stayed on after the thumb came off —
 * and the reason a design like that gets stuck is that it can only ever be
 * corrected by an event it is still expecting. Miss one `pointerup`, or get a
 * pointer id that does not match, and the entry stays in the map forever. And
 * there are real ways to miss one: a browser that decides a touch was the start
 * of a scroll takes the gesture and stops sending, a second finger can turn the
 * first into a pinch candidate, and a touch that ends while the page is being
 * put into the background may report nothing at all.
 *
 * A `touchstart`, `touchmove`, `touchend` or `touchcancel` all carry
 * `event.touches`: **every finger on the glass at that moment**, not a delta.
 * So the held set is thrown away and rebuilt from that list on each one. A
 * finger that lifted is not in the list, so it cannot be held. A finger that
 * slid off a button and back is resolved fresh against where it is now, so it
 * cannot go dead. An event that never arrives is repaired by the next one,
 * whatever it is. There is no accounting to get out of step, because there is
 * no accounting.
 *
 * Mouse and stylus keep the old shape — a single pointer, tracked — because
 * there is only ever one of them and its events are not the ones that go
 * missing.
 */

/** The actions a button can carry. Matches `data-act` in the markup. */
type TouchAction =
  | 'left'
  | 'right'
  | 'down'
  | 'jump'
  | 'run'
  | 'action'
  | 'swap'
  | 'menu'
  | 'full';

const ACTIONS: readonly TouchAction[] = [
  'left',
  'right',
  'down',
  'jump',
  'run',
  'action',
  'swap',
  'menu',
  'full',
];

function isAction(value: string | undefined): value is TouchAction {
  return value !== undefined && (ACTIONS as readonly string[]).includes(value);
}

export class TouchInput {
  private readonly root: HTMLElement | undefined;
  /** Every action currently under a finger. Rebuilt on every touch event. */
  private held = new Set<TouchAction>();
  /** The mouse or stylus, if one is on a button. There is only ever one. */
  private mouse: TouchAction | undefined;
  /** Actions that went down since the last `update`, so a quick tap is never lost. */
  private readonly tapped = new Set<TouchAction>();
  /**
   * Run is a latch, not a button you hold.
   *
   * Holding it is what a controller does, because a controller has a shoulder
   * for it. On a phone it means keeping one thumb pinned on the far side of
   * the screen from the one that is steering, for the whole level — and the
   * two things it changes, top speed and how far a jump carries, are exactly
   * the things you want while you are busy doing something else with that
   * thumb. So it stays on until it is turned off, and the button says which.
   *
   * The keyboard is untouched: Shift is still held, and the two are OR'd, so
   * holding Shift on a latched-off keyboard still runs.
   */
  private running = false;
  private state: InputState = NEUTRAL_INPUT;
  /** True once a real touch has happened, which is what reveals the controls. */
  private used = false;
  private menuHandler: (() => void) | undefined;

  constructor() {
    const root = document.getElementById('touch') ?? undefined;
    this.root = root;
    if (!root) return;

    // Not passive: a touch that begins on a button must not also be offered to
    // the browser as the start of a scroll. `touch-action: none` says the same
    // thing, and saying it twice is cheap — it is the gesture being stolen that
    // makes a browser stop sending the events this depends on.
    const options = { passive: false } as const;
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
      root.addEventListener(type, (event) => this.onTouch(event), options);
    }

    root.addEventListener('pointerdown', (event) => this.onMouseDown(event));
    root.addEventListener('pointermove', (event) => this.onMouseMove(event));
    root.addEventListener('pointerup', (event) => this.onMouseUp(event));
    root.addEventListener('pointercancel', (event) => this.onMouseUp(event));

    // A window that loses focus mid-press never reports the release.
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });

    // Reveal the deck the first time anything is actually touched. The media
    // query alone would put a d-pad on a touchscreen laptop that nobody is
    // going to touch; waiting for a real finger costs one frame and is right
    // on both kinds of machine.
    window.addEventListener(
      'touchstart',
      () => {
        this.used = true;
        document.body.dataset['touch'] = 'on';
      },
      { passive: true, once: true },
    );
  }

  /** Is the player holding a phone? Decides whether hints say TAP or SPACE. */
  get active(): boolean {
    return this.used || matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  /** What the menu button does. The scene sets this; it means "back to the map". */
  onMenu(handler: (() => void) | undefined): void {
    this.menuHandler = handler;
  }

  /** Call once per frame, before anything reads `current`. */
  update(): void {
    const down = (action: TouchAction): boolean =>
      this.held.has(action) || this.mouse === action || this.tapped.has(action);

    this.state = {
      moveX: axis(down('left'), down('right')),
      moveY: axis(false, down('down')),
      // A tap shorter than a frame still has to jump, so a press counts if the
      // button went down at any point since the last frame.
      jumpPressed: this.tapped.has('jump'),
      jumpHeld: this.held.has('jump') || this.mouse === 'jump',
      run: this.running || down('run'),
      actionPressed: this.tapped.has('action'),
      swapPressed: this.tapped.has('swap'),
      pausePressed: this.tapped.has('menu'),
    };

    this.tapped.clear();
  }

  get current(): InputState {
    return this.state;
  }

  /**
   * Every touch event, handled the same way: work out what is under each
   * finger that is still down, and let that be the answer.
   */
  private onTouch(event: TouchEvent): void {
    const next = new Set<TouchAction>();
    for (const touch of Array.from(event.touches)) {
      const action = this.actionAt(touch.clientX, touch.clientY);
      if (action) next.add(action);
    }

    // Anything that was not held a moment ago and is now has just been pressed.
    // This covers a tap too short to survive to the next frame, and a thumb
    // that rolls off jump onto swap without lifting.
    for (const action of next) {
      if (this.held.has(action)) continue;
      this.press(action);
    }

    // Stop the page treating a press on a button as a scroll or a zoom. Only
    // when the touch is actually on one, so a tap on the game still reaches it.
    if (event.cancelable && (next.size > 0 || this.overAButton(event.changedTouches))) {
      event.preventDefault();
    }

    this.used = true;
    document.body.dataset['touch'] = 'on';
    this.held = next;
    this.paint();
  }

  /** Everything that happens the moment a button goes down. */
  private press(action: TouchAction): void {
    this.tapped.add(action);
    switch (action) {
      case 'run':
        this.running = !this.running;
        break;
      case 'menu':
        this.menuHandler?.();
        break;
      case 'full':
        toggleFullScreen();
        break;
      default:
        break;
    }
  }

  private overAButton(touches: TouchList): boolean {
    for (const touch of Array.from(touches)) {
      if (this.actionAt(touch.clientX, touch.clientY)) return true;
    }
    return false;
  }

  private onMouseDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    const action = this.actionAt(event.clientX, event.clientY);
    if (!action) return;
    event.preventDefault();
    this.mouse = action;
    this.press(action);
    this.paint();
  }

  private onMouseMove(event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.mouse === undefined) return;
    // Buttons are only held while the button is held, so a move with nothing
    // pressed is just the cursor passing over.
    if (event.buttons === 0) {
      this.onMouseUp(event);
      return;
    }
    const action = this.actionAt(event.clientX, event.clientY);
    if (action === this.mouse) return;
    if (action && !this.held.has(action)) this.press(action);
    this.mouse = action;
    this.paint();
  }

  private onMouseUp(event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.mouse === undefined) return;
    this.mouse = undefined;
    this.paint();
  }

  private releaseAll(): void {
    if (this.held.size === 0 && this.mouse === undefined) return;
    this.held = new Set();
    this.mouse = undefined;
    this.paint();
  }

  /** Which button is under this point, if any. */
  private actionAt(x: number, y: number): TouchAction | undefined {
    const element = document.elementFromPoint(x, y);
    const button = element?.closest<HTMLElement>('[data-act]');
    const act = button?.dataset['act'];
    return isAction(act) ? act : undefined;
  }

  /**
   * Light up whatever is held.
   *
   * Feedback matters more here than anywhere else in the game: a finger covers
   * the button it is pressing, so the edge is the only part of it you can see.
   */
  private paint(): void {
    if (!this.root) return;
    for (const button of this.root.querySelectorAll<HTMLElement>('[data-act]')) {
      const act = button.dataset['act'];
      const on = isAction(act) && (this.held.has(act) || this.mouse === act);
      button.classList.toggle('on', on);
      // A latch has to say so even when nothing is touching it, or the only
      // way to find out whether you are running is to try it.
      if (act === 'run') button.classList.toggle('latched', this.running);
    }
  }
}

/**
 * Fill the screen, where the browser will allow it.
 *
 * Which is not everywhere, and the button that calls this is only shown when
 * `fullScreenAvailable` says so — an iframe is not allowed to go fullscreen
 * unless the page holding it says it may, and Safari on iPhone does not
 * implement it at all. See `index.html` for what to do about that.
 */
export function toggleFullScreen(): void {
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const owner = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };

  const open = owner.fullscreenElement ?? owner.webkitFullscreenElement ?? null;
  try {
    if (open) void (owner.exitFullscreen?.() ?? owner.webkitExitFullscreen?.());
    else void (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
  } catch {
    // Refused. The button is hidden when it is going to be refused, so this is
    // only the case where a browser changes its mind, and there is nothing to
    // say about it that would help.
  }
}

/** Is there any point offering a fullscreen button on this page? */
export function fullScreenAvailable(): boolean {
  const owner = document as Document & { webkitFullscreenEnabled?: boolean };
  return Boolean(owner.fullscreenEnabled ?? owner.webkitFullscreenEnabled);
}

function axis(negative: boolean, positive: boolean): -1 | 0 | 1 {
  if (negative === positive) return 0;
  return negative ? -1 : 1;
}

let shared: TouchInput | undefined;

/**
 * The one set of on-screen controls.
 *
 * Scenes are created, destroyed and restarted; the buttons in the page are not.
 * Building a second `TouchInput` per scene would bind a second set of listeners
 * to the same elements, and every tap would count twice.
 */
export function touchControls(): TouchInput {
  shared ??= new TouchInput();
  return shared;
}
