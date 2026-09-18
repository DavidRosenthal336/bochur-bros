/**
 * Fail the build if the art on disk stops matching what the game believes.
 *
 * The frame sizes in `src/config/sprites.ts` are load-bearing: Phaser slices a
 * sheet by them, and every hitbox is inset into the frame using them. If a
 * redrawn sheet changes size and nothing notices, the game silently starts
 * showing the wrong half of each frame. That is a two-line check, so it is a
 * build error rather than a thing to remember.
 */
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SPRITES = 'public/sprites';
const MANIFEST = 'tools/art/manifest.json';

/** Width and height out of a PNG's IHDR chunk, which is always the first one. */
function pngSize(path) {
  const buf = readFileSync(path);
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${path}: not a PNG`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const source = readFileSync('src/config/sprites.ts', 'utf8');

const problems = [];

// 1. Every sheet the manifest describes is present and a whole number of
//    frames wide.
for (const [key, spec] of Object.entries(manifest)) {
  const file = join(SPRITES, `${key}.png`);
  let size;
  try {
    size = pngSize(file);
  } catch {
    problems.push(`${key}: missing ${file}`);
    continue;
  }
  if (size.height !== spec.frameHeight) {
    problems.push(`${key}: sheet is ${size.height}px tall, frame says ${spec.frameHeight}`);
  }
  const frames = size.width / spec.frameWidth;
  if (!Number.isInteger(frames)) {
    problems.push(`${key}: ${size.width}px wide is not a whole number of ${spec.frameWidth}px frames`);
  } else if (frames !== spec.frames.length) {
    problems.push(`${key}: sheet holds ${frames} frames, manifest names ${spec.frames.length}`);
  }
}

// 2. Every frame size quoted in the registry matches the sheet it names.
for (const [, key, w, h] of source.matchAll(/'(\w+)',\s*(\d+),\s*(\d+),/g)) {
  const spec = manifest[key];
  if (!spec) continue;
  if (Number(w) !== spec.frameWidth || Number(h) !== spec.frameHeight) {
    problems.push(
      `sprites.ts claims ${key} is ${w}x${h}; the sheet is ${spec.frameWidth}x${spec.frameHeight}`,
    );
  }
}

// 3. Nothing is sitting in public/sprites that nothing knows about.
for (const file of readdirSync(SPRITES)) {
  if (!file.endsWith('.png')) continue;
  const key = file.slice(0, -4);
  if (!manifest[key]) problems.push(`${file}: on disk but not in the manifest`);
}

if (problems.length) {
  console.error('art does not match the registry:\n');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`art ok — ${Object.keys(manifest).length} sheets match the registry.`);
