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
  const entityLayer = map.layers.find((l) => l.name === 'entities');
  const def = {
    widthInTiles: map.width,
    heightInTiles: map.height,
    groundRow: Number(
      (map.properties ?? []).find((p) => p.name === 'groundRow')?.value ?? Number.NaN,
    ),
    solids: (solidLayer?.objects ?? []).map((o) => ({
      x: o.x / map.tilewidth,
      y: o.y / map.tileheight,
      w: o.width / map.tilewidth,
      h: o.height / map.tileheight,
    })),
    bouncers: (entityLayer?.objects ?? [])
      .filter((o) => o.class === 'bounce')
      .map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight, w: o.width / map.tilewidth })),
    // Water changes what a hole and a walled floor mean — see the validator.
    // Without it a pool reads as an unjumpable pit and its bottom as a trap.
    water: (entityLayer?.objects ?? [])
      .filter((o) => o.class === 'water')
      .map((o) => ({
        x: o.x / map.tilewidth,
        y: o.y / map.tileheight,
        w: o.width / map.tilewidth,
        h: o.height / map.tileheight,
      })),
    // Blocks are solid to the player, so they are part of the geometry as far
    // as "is there room to stand here" is concerned.
    blocks: (entityLayer?.objects ?? [])
      .filter((o) => o.class === 'block')
      .map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight })),
  };

  if (!Number.isFinite(def.groundRow)) delete def.groundRow;

  /**
   * Greybox maps are instruments, not levels.
   *
   * The pit check in particular does not apply to them: `powers` is where the
   * Peyos flight power is measured, so it has deliberate ten-tile holes that
   * you are meant to fly over and that nothing else in the game would allow.
   */
  const isGreybox = String(
    (map.properties ?? []).find((p) => p.name === 'name')?.value ?? '',
  ).includes('greybox');

  const traps = findTraps(def, { checkLeaps: !isGreybox });
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
