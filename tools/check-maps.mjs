/**
 * Validates every map in src/levels/maps, including ones edited by hand in
 * Tiled rather than generated. Run with `npm run check:maps`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STRICT_LEVELS, describeFaults, describeTraps, findDesignFaults, findTraps } from './validate-level.mjs';

const DIR = 'src/levels/maps';

/** The object classes `to-tiled.mjs` gives hazards: their kind. */
const HAZARD_CLASSES = new Set(['wind', 'pipe', 'cart', 'van', 'stroller', 'minivan', 'mower', 'blower', 'golfCart', 'canoe', 'hamsin']);
const propOf = (o, name) => (o.properties ?? []).find((p) => p.name === name)?.value;
const numberProp = (map, name) => {
  const v = (map.properties ?? []).find((p) => p.name === name)?.value;
  return v === undefined ? undefined : Number(v);
};
const point = (layer, klass) => {
  const o = (layer?.objects ?? []).find((obj) => obj.class === klass);
  return o ? { x: o.x / 16, y: o.y / 16 } : undefined;
};
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
    // Porch steps are floor when you arrive at one, and they rebuild. Without
    // them a rotting porch reads as a row of holes.
    steps: (entityLayer?.objects ?? [])
      .filter((o) => o.class === 'step')
      .map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight })),
    // Laundry lines are floor from above, so a gap with one across it is not a
    // pit. See the validator.
    laundry: (entityLayer?.objects ?? [])
      .filter((o) => o.class === 'laundry')
      .map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight, w: o.width / map.tilewidth })),
    // Blocks are solid to the player, so they are part of the geometry as far
    // as "is there room to stand here" is concerned.
    blocks: (entityLayer?.objects ?? [])
      .filter((o) => o.class === 'block')
      .map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight, kind: propOf(o, 'block'), contents: propOf(o, 'contents') })),
    // The design rules read what is placed, not only where the floor is.
    spawn: point(entityLayer, 'spawn') ?? { x: 2, y: 0 },
    goal: point(entityLayer, 'goal'),
    checkpoints: (entityLayer?.objects ?? []).filter((o) => o.class === 'checkpoint').map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight })),
    enemies: (entityLayer?.objects ?? []).filter((o) => o.class === 'enemy').map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight, kind: propOf(o, 'enemy') })),
    hazards: (entityLayer?.objects ?? []).filter((o) => HAZARD_CLASSES.has(o.class)).map((o) => ({ x: o.x / map.tilewidth, y: o.y / map.tileheight, w: o.width / map.tilewidth, h: o.height / map.tileheight, kind: o.class })),
    boss: point(entityLayer, 'boss'),
    autoScrollUp: numberProp(map, 'autoScrollUp'),
    name: String((map.properties ?? []).find((p) => p.name === 'name')?.value ?? ''),
    key: file.replace(/\.tmj$/, ''),
  };
  if (def.autoScrollUp === undefined) delete def.autoScrollUp;
  if (!def.goal) delete def.goal;
  if (!def.boss) delete def.boss;

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
  const key = def.key;
  const faults = findDesignFaults(def);
  const strict = STRICT_LEVELS.has(key);
  if (traps.length) {
    trapped += traps.length;
    console.error(`\nTRAP in ${key}:`);
    console.error(describeTraps(key, traps));
  }
  if (faults.length) {
    if (strict) trapped += faults.length;
    console[strict ? 'error' : 'warn'](`\n${strict ? 'UNFAIR' : 'unfair (warning)'} in ${key}:`);
    console[strict ? 'error' : 'warn'](describeFaults(key, faults));
  }
  if (!traps.length && !faults.length) console.log(`  ${key.padEnd(12)} ok`);
}

if (trapped > 0) {
  console.error(`\n${trapped} problem(s) across ${files.length} maps.`);
  process.exit(1);
}
console.log(`\n${files.length} maps, no traps.`);
