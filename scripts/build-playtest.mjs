/**
 * Produces a playtest build in `playtest/` that can be published as a single
 * hosted page for someone to click and play.
 *
 * Vite emits a complete HTML document. Some hosts wrap the page they are given
 * in their own `<!doctype>`/`<head>`/`<body>` skeleton, which a second complete
 * document nests badly inside. This flattens Vite's output to just the page
 * content — title, icon, styles, markup, scripts — and copies the JS chunks
 * next to it unchanged.
 *
 * Run it with `npm run build:playtest`.
 */
/**
 * NOTE ON PUBLISHING
 *
 * Publish EVERY file in `playtest/`, every time. Not the bundle, not "what
 * changed" — all of it.
 *
 * The artifact keeps whatever was published before and carries it forward, so
 * sending only the bundle looks like it works and quietly freezes the art at
 * whatever was there the first time. Adding `yetzer_hara.png` to the sprite
 * registry and shipping only the code left the game asking a server for a
 * drawing that had never been sent to it, and the whole thing refused to boot
 * over one missing 1.5KB PNG.
 *
 * Also: leave the old bundles published. Vite content-hashes the entry, so
 * every build rewrites `index.html` to a new filename; deleting the previous
 * one means a browser holding a cached copy of the old page asks for a file
 * that is gone and renders nothing. Publishing the current bundle under the
 * old names as well makes a stale page load the current game.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const OUT = 'playtest';

const html = await readFile(join(DIST, 'index.html'), 'utf8');

const head = pick(html, /<head>([\s\S]*?)<\/head>/);
const body = pick(html, /<body>([\s\S]*?)<\/body>/);

const flattened = [
  // The host skeleton supplies charset and viewport; a second copy of either
  // would override its safe-area handling, so those two are dropped.
  head.replace(/<meta\s+charset[^>]*>/gi, '').replace(/<meta\s+name="viewport"[\s\S]*?>/gi, ''),
  body,
]
  .join('\n')
  .split('\n')
  .filter((line) => line.trim() !== '')
  .join('\n');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'index.html'), flattened + '\n');

// Everything Vite emitted except the page itself: JS chunks, and whatever came
// from public/ (sprite sheets, and later audio).
for (const entry of await readdir(DIST, { withFileTypes: true })) {
  if (entry.name === 'index.html') continue;
  await cp(join(DIST, entry.name), join(OUT, entry.name), { recursive: true });
}

console.log(`playtest build ready in ${OUT}/ (${flattened.length} bytes of HTML)`);

function pick(source, pattern) {
  const match = source.match(pattern);
  if (!match) throw new Error(`could not find ${pattern} in ${DIST}/index.html`);
  return match[1];
}
