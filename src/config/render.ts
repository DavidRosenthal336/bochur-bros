import { VIEW_HEIGHT, VIEW_WIDTH } from './Tuning';

/**
 * How the game is drawn — not what it is.
 *
 * The game's world is 320x180 with 16px tiles, and every speed, hitbox and
 * jump in Tuning.ts is in those units. Nothing here changes any of that. In
 * `pixel` mode the canvas *is* 320x180 and the browser scales it up, blocky,
 * as the game was first built. In `hd` mode the canvas is 1920x1080 — six
 * times — the camera is zoomed six times so the same 320x180 of world fills
 * it, and art drawn at six times the size is shown at one sixth, so it takes
 * up exactly the space the pixel art did and is sharp at full resolution.
 *
 * Switch the whole game between the two with `?render=hd` or `?render=pixel`
 * on the address, or the default below. The flip-phone build is pixel: its
 * screen is 240 wide and its WebView is old (scripts/build-apk.sh).
 */

/** HD pixels per game pixel. 1920 / 320. Also the art pipeline's SCALE. */
export const ART_SCALE = 6;

const HD_BY_DEFAULT = (import.meta.env.VITE_RENDER ?? 'hd') !== 'pixel';

const params = typeof location === 'undefined' ? undefined : new URLSearchParams(location.search);
const asked = params?.get('render');

export const RENDER_MODE: 'hd' | 'pixel' =
  asked === 'hd' ? 'hd' : asked === 'pixel' ? 'pixel' : HD_BY_DEFAULT ? 'hd' : 'pixel';

export const HD = RENDER_MODE === 'hd';

/** The canvas, in real pixels. The world is still VIEW_WIDTH x VIEW_HEIGHT. */
export const CANVAS_WIDTH = HD ? VIEW_WIDTH * ART_SCALE : VIEW_WIDTH;
export const CANVAS_HEIGHT = HD ? VIEW_HEIGHT * ART_SCALE : VIEW_HEIGHT;

/** What every camera is zoomed by, so a world unit is a world unit. */
export const CAMERA_ZOOM = HD ? ART_SCALE : 1;

/**
 * Text is rasterised at this many canvas pixels per world pixel. In HD it is
 * what makes an 8px monospace label crisp at full resolution instead of a
 * blown-up bitmap of itself.
 */
export const TEXT_RESOLUTION = HD ? ART_SCALE : 1;
