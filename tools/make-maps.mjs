/**
 * Regenerates `src/levels/maps/*.tmj`.
 *
 * Run with `npm run build:maps`. Sources are the modules in `tools/levels/`,
 * which exist because levels with repetition in them — a ladder of widening
 * gaps, a staircase — are clearer as a loop than as a hundred placed objects.
 *
 * Once a map exists you can open it in Tiled and edit it there instead; just
 * stop regenerating that one, or your edits go back over the side.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { levelDefToTiled } from './to-tiled.mjs';

const SOURCE_DIR = new URL('./levels/', import.meta.url);
const OUT_DIR = 'src/levels/maps';

await mkdir(OUT_DIR, { recursive: true });

const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.mjs')).sort();
if (files.length === 0) {
  console.error('no level sources in tools/levels/');
  process.exit(1);
}

for (const file of files) {
  const module = await import(new URL(file, SOURCE_DIR).href);
  const def = module.default;
  if (!def?.key) throw new Error(`${file}: default export must be a LevelDef with a key`);

  const tiled = levelDefToTiled(def);
  const path = join(OUT_DIR, `${def.key}.tmj`);
  await writeFile(path, `${JSON.stringify(tiled, null, 1)}\n`);
  console.log(
    `${path.padEnd(34)} ${def.widthInTiles}x${def.heightInTiles} tiles, ` +
      `${tiled.layers[0].objects.length} solids, ${tiled.layers[1].objects.length} entities`,
  );
}
void pathToFileURL;
