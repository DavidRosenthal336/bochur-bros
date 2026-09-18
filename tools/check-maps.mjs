/**
 * Validates every map in src/levels/maps, including ones edited by hand in
 * Tiled rather than generated. Run with `npm run check:maps`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describeTraps, findTraps } from './validate-level.mjs';

const DIR = 'src/levels/maps';
const files = (await readdir(DIR)).filter((f) => f.endsWith('.tmj')).sort();

let trapped = 0;

for (const file of files) {
  const map = JSON.parse(await readFile(join(DIR, file), 'utf8'));
  const solidLayer = map.layers.find((l) => l.name === 'solids');
  const def = {
    widthInTiles: map.width,
    heightInTiles: map.height,
    solids: (solidLayer?.objects ?? []).map((o) => ({
      x: o.x / map.tilewidth,
      y: o.y / map.tileheight,
      w: o.width / map.tilewidth,
      h: o.height / map.tileheight,
    })),
  };

  const traps = findTraps(def);
  const key = file.replace(/\.tmj$/, '');
  if (traps.length) {
    trapped += traps.length;
    console.error(`\nTRAP in ${key}:`);
    console.error(describeTraps(key, traps));
  } else {
    console.log(`  ${key.padEnd(12)} ok`);
  }
}

if (trapped > 0) {
  console.error(`\n${trapped} trap(s) across ${files.length} maps.`);
  process.exit(1);
}
console.log(`\n${files.length} maps, no traps.`);
