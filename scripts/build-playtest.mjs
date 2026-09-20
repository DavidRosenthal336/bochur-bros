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
 *
 * That last part used to be a rule somebody had to remember. It is a file now:
 * `scripts/bundle-aliases.txt` lists every name the entry has ever gone out
 * under, this script writes the current bundle to all of them and adds today's,
 * and the list is committed. Nothing to remember.
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
for (const item of await readdir(DIST, { withFileTypes: true })) {
  if (item.name === 'index.html') continue;
  await cp(join(DIST, item.name), join(OUT, item.name), { recursive: true });
}

// The entry chunk, under every name it has ever been published as.
const ALIASES = 'scripts/bundle-aliases.txt';
const entry = pick(html, /src="\.?\/?(assets\/index-[^"]+\.js)"/);
const lines = (await readFile(ALIASES, 'utf8')).split('\n');
const known = new Set(lines.filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim()));
if (!known.has(entry)) {
  known.add(entry);
  await writeFile(
    ALIASES,
    lines.filter((l) => l.startsWith('#')).join('\n') + '\n' + [...known].sort().join('\n') + '\n',
  );
}
const current = await readFile(join(DIST, entry));
for (const alias of known) if (alias !== entry) await writeFile(join(OUT, alias), current);

console.log(
  `playtest build ready in ${OUT}/ (${flattened.length} bytes of HTML, ` +
    `entry ${entry}, ${known.size} bundle names)`,
);

function pick(source, pattern) {
  const match = source.match(pattern);
  if (!match) throw new Error(`could not find ${pattern} in ${DIST}/index.html`);
  return match[1];
}
