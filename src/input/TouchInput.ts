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
 * gives every character a crouch, and 2-3 swims downward with it. A control
 * scheme without Down cannot play the game that exists.
 *
 * **Run**, for the same reason and more sharply: the leaf blowers in 2-2 push
 * at 300 px/s^2 against Mendy's walking acceleration of 133 and his running
 * acceleration of 323. Walking into one, he goes backwards. Without a run
 * button there is a corridor in World 2 that a phone simply cannot cross.
 *
 * ## Sliding between buttons
 *
 * A thumb that presses left and then slides to right without lifting has to
 * end up pressing right, because that is what every thumb on every d-pad does.
 * The browser gives a touch's events to the element it started on, so the
 * button under the finger is found by asking the document what is at that
 * point on every move rather than by listening on each button.
 */

/** The actions a button can carry. Matches `data-act` in the markup. */
type TouchAction = 'left' | 'right' | 'down' | 'jump' | 'run' | 'action' | 'swap' | 'menu';

const ACTIONS: readonly TouchAction[] = [
  'left',
  'right',
  'down',
  'jump',
  'run',
  'action',
  'swap',
  'menu',
];

function isAction(value: string | undefined): value is TouchAction {
  return value !== undefined && (ACTIONS as readonly string[]).includes(value);
}

export class TouchInput {
  private readonly root: HTMLElement | undefined;
  /** Which action each live touch is currently over. */
  private readonly pointers = new Map<number, TouchAction>();
  /** Actions that went down since the last `update`, so a quick tap is never lost. */
  private readonly tapped = new Set<TouchAction>();
  private state: InputState = NEUTRAL_INPUT;
  /** True once a real touch has happened, which is what reveals the controls. */
  private used = false;
  private menuHandler: (() => void) | undefined;

  constructor() {
    const root = document.getElementById('touch') ?? undefined;
    this.root = root;
    if (!root) return;

    root.addEventListener('pointerdown', (event) => this.onDown(event));
    root.addEventListener('pointermove', (event) => this.onMove(event));
    root.addEventListener('pointerup', (event) => this.onUp(event));
    root.addEventListener('pointercancel', (event) => this.onUp(event));
    // A touch that ends outside the window never sends pointerup to the page.
    // Without this, a finger dragged off the bottom edge leaves the character
    // running right forever.
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
    const held = new Set(this.pointers.values());
    const down = (action: TouchAction): boolean => held.has(action) || this.tapped.has(action);

    this.state = {
      moveX: axis(down('left'), down('right')),
      moveY: axis(false, down('down')),
      // A tap shorter than a frame still has to jump, so a press counts if the
      // button is down now or went down at any point since the last frame.
      jumpPressed: this.tapped.has('jump'),
      jumpHeld: held.has('jump'),
      run: down('run'),
      actionPressed: this.tapped.has('action'),
      swapPressed: this.tapped.has('swap'),
      pausePressed: this.tapped.has('menu'),
    };

    this.tapped.clear();
  }

  get current(): InputState {
    return this.state;
  }

  private onDown(event: PointerEvent): void {
    const action = this.actionAt(event.clientX, event.clientY);
    if (!action) return;
    event.preventDefault();
    this.used = true;
    document.body.dataset['touch'] = 'on';
    this.pointers.set(event.pointerId, action);
    this.tapped.add(action);
    this.paint();
    if (action === 'menu') this.menuHandler?.();
  }

  private onMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const action = this.actionAt(event.clientX, event.clientY);
    const before = this.pointers.get(event.pointerId);
    if (action === before) return;

    if (action) {
      this.pointers.set(event.pointerId, action);
      // Sliding onto a button counts as pressing it — a thumb that rolls from
      // jump onto swap meant to press swap.
      this.tapped.add(action);
    } else {
      this.pointers.delete(event.pointerId);
    }
    this.paint();
  }

  private onUp(event: PointerEvent): void {
    if (!this.pointers.delete(event.pointerId)) return;
    this.paint();
  }

  private releaseAll(): void {
    if (this.pointers.size === 0) return;
    this.pointers.clear();
    this.paint();
  }

  /** Which button is under this point, if any. */
  private actionAt(x: number, y: number): TouchAction | undefined {
    const element = document.elementFromPoint(x, y);
    const button = element?.closest<HTMLElement>('[data-act]');
    const act = button?.dataset['act'];
    return isAction(act) ? act : undefined;
  }

  /** Light up whatever is held. Feedback matters more here than anywhere else:
   *  a finger covers the button it is pressing, so the edge is the only part
   *  of it you can see. */
  private paint(): void {
    if (!this.root) return;
    const held = new Set(this.pointers.values());
    for (const button of this.root.querySelectorAll<HTMLElement>('[data-act]')) {
      const act = button.dataset['act'];
      button.classList.toggle('on', isAction(act) && held.has(act));
    }
  }
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
