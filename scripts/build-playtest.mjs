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
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
await cp(join(DIST, 'assets'), join(OUT, 'assets'), { recursive: true });

console.log(`playtest build ready in ${OUT}/ (${flattened.length} bytes of HTML)`);

function pick(source, pattern) {
  const match = source.match(pattern);
  if (!match) throw new Error(`could not find ${pattern} in ${DIST}/index.html`);
  return match[1];
}
