/**
 * Fail the build if the art on disk stops matching what the game believes.
 *
 * The frame sizes in `src/config/sprites.ts` and `src/config/scenery.ts` are
 * load-bearing: Phaser slices a sheet by them, and every hitbox is inset into
 * the frame using them. If a redrawn sheet changes size and nothing notices,
 * the game silently starts showing the wrong half of each frame. That is a
 * cheap check, so it is a build error rather than a thing to remember.
 *
 * Art that has not been drawn yet is not an error — the registries list what
 * the game knows how to draw, and a missing file falls back to a rectangle.
 * This only checks the files that are actually there.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = 'public';
const SPRITES = join(PUBLIC, 'sprites');
/**
 * The generators' own declarations of what they drew, one per script.
 *
 * Merged rather than kept apart because nothing downstream cares which script
 * produced a sheet — only what size its frames are.
 */
const MANIFESTS = ['tools/art/manifest.json', 'tools/art/manifest_worlds234.json'];
/** The game's internal resolution. Every backdrop layer tiles across it. */
const VIEW_WIDTH = 320;

/** Width and height out of a PNG's IHDR chunk, which is always the first one. */
function pngSize(path) {
  const buf = readFileSync(path);
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${path}: not a PNG`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function sizeOrNull(path) {
  try {
    return pngSize(path);
  } catch {
    return null;
  }
}

const manifest = Object.assign({}, ...MANIFESTS.map((m) => JSON.parse(readFileSync(m, 'utf8'))));
const spritesSource = readFileSync('src/config/sprites.ts', 'utf8');
const scenerySource = readFileSync('src/config/scenery.ts', 'utf8');

const problems = [];
/** Every file path the game could ask for, so nothing is flagged as a stray. */
const known = new Set();

/** A sheet of `frameWidth x frameHeight` frames laid out in one row. */
function checkSheet(label, url, frameWidth, frameHeight, expectedFrames) {
  known.add(url);
  const size = sizeOrNull(join(PUBLIC, url));
  if (!size) return false; // not drawn yet, which is allowed
  if (size.height !== frameHeight) {
    problems.push(`${label}: sheet is ${size.height}px tall, the registry says ${frameHeight}`);
    return true;
  }
  const frames = size.width / frameWidth;
  if (!Number.isInteger(frames)) {
    problems.push(`${label}: ${size.width}px wide is not a whole number of ${frameWidth}px frames`);
  } else if (expectedFrames !== undefined && frames !== expectedFrames) {
    problems.push(`${label}: sheet holds ${frames} frames, ${expectedFrames} were expected`);
  }
  return true;
}

// 1. Every sheet the generators' manifests describe. Backdrop layers and tiles
//    live in their own folders and are checked by rules 4 and 5 instead.
for (const [key, spec] of Object.entries(manifest)) {
  if (key.startsWith('bg_') || spec.frames === undefined) continue;
  const url = `sprites/${key}.png`;
  if (!checkSheet(key, url, spec.frameWidth, spec.frameHeight, spec.frames.length)) {
    problems.push(`${key}: in the manifest but missing from ${join(PUBLIC, url)}`);
  }
}

// 2. Every frame size quoted in the registries matches the sheet it names.
for (const [, key, w, h] of spritesSource.matchAll(/'(\w+)',\s*(\d+),\s*(\d+),/g)) {
  const spec = manifest[key];
  known.add(`sprites/${key}.png`);
  if (!spec) continue;
  if (Number(w) !== spec.frameWidth || Number(h) !== spec.frameHeight) {
    problems.push(
      `sprites.ts claims ${key} is ${w}x${h}; the sheet is ${spec.frameWidth}x${spec.frameHeight}`,
    );
  }
}

// 3. The scenery registry, whose sheets have no generator manifest of their own.
for (const [, , path, w, h] of scenerySource.matchAll(
  /scenery\(\s*'([\w]+)',\s*'([\w/]+)',\s*(\d+),\s*(\d+)/g,
)) {
  checkSheet(path, `sprites/${path}.png`, Number(w), Number(h));
}

// 4. Backdrop layers tile across the view, so anything but 320 wide will seam.
for (const [, layer] of scenerySource.matchAll(/bg_(\w+)_\$\{variant\}\.png/g)) {
  for (const variant of ['day', 'dusk', 'night']) {
    const url = `sprites/backdrops/bg_${layer}_${variant}.png`;
    known.add(url);
    const size = sizeOrNull(join(PUBLIC, url));
    if (size && size.width !== VIEW_WIDTH) {
      problems.push(`${url}: ${size.width}px wide; a backdrop layer must be ${VIEW_WIDTH} to tile`);
    }
  }
}

// 5. The tile textures.
for (const [, url] of spritesSource.matchAll(/'(tiles\/[\w.]+\.png)'/g)) {
  known.add(url);
  const size = sizeOrNull(join(PUBLIC, url));
  if (size && (size.width !== 16 || size.height !== 16)) {
    problems.push(`${url}: ${size.width}x${size.height}; tiles are 16x16`);
  }
}

// 6. Nothing sitting in public/sprites that nothing knows about.
for (const file of readdirSync(SPRITES)) {
  if (!file.endsWith('.png')) continue;
  if (!known.has(`sprites/${file}`)) problems.push(`${file}: on disk but in no registry`);
}

if (problems.length) {
  console.error('art does not match the registries:\n');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const drawn = [...known].filter((url) => sizeOrNull(join(PUBLIC, url)) !== null).length;
console.log(`art ok — ${drawn} of ${known.size} known pieces are drawn, and all of them match.`);
