/**
 * The flip-phone build.
 *
 * Set by the Android app (it adds `BochurBrosFlip` to its user agent) or by
 * `?flip` in the address, which is how it is tried on a computer. The page's
 * inline script reads it before anything else runs and marks `<body>`, so the
 * layout and the game agree from the first frame.
 *
 * A flip phone has a number pad and a D-pad, and very likely cannot register
 * two keys at once, so every move in the game has to be one key: the
 * diagonal jumps are keys of their own and run is a toggle.
 */
export function flipMode(): boolean {
  return document.body?.dataset.flip === 'on';
}

/** Run, switched on and off with 7. Kept here so it survives a level restart. */
let runOn = false;

export function toggleRun(): boolean {
  runOn = !runOn;
  if (document.body) document.body.dataset.run = runOn ? 'on' : 'off';
  return runOn;
}

export function runToggled(): boolean {
  return runOn;
}
