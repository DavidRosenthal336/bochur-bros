/**
 * The art pipeline: turns images from ChatGPT into files the game can load.
 *
 *   npm run assets             process every new or changed image in assets/raw/
 *   npm run assets -- --force  process everything again
 *   npm run assets -- --only mendy_small
 *
 * First it cuts every batch image in assets/raw/batches/ — one ChatGPT picture
 * holding many assets, see `tools/assets/batches.mjs` and ART_BATCHES.md — into
 * one raw file per asset. Then, per asset in `tools/assets/manifest.mjs`:
 *
 *   1. Finds its raw image(s) in assets/raw/ (see "Naming" in ASSETS.md).
 *   2. Removes the background: real transparency is kept, the #FF00FF magenta
 *      fallback is keyed out, and a plain flat background is flood-filled away
 *      from the edges as a last resort (sprites only — tiles and skies are
 *      supposed to be solid).
 *   3. Splits a sheet image into its frames (it finds each drawing; if it
 *      cannot, it cuts the grid the prompt asked for), trims each one, scales
 *      them all by ONE factor so they stay the same size as each other, and
 *      stands them on a common baseline (or centres them) in identical cells.
 *   4. Writes a 1080p master to assets/processed/hd/, and a game-scale version
 *      snapped to the game's pixel grid.
 *   5. Packs the game-scale sheets into one texture atlas per group
 *      (assets/processed/atlases/), and writes assets/processed/index.json,
 *      which is what the game reads to find them.
 *   6. Rewrites ASSETS.md with every asset's status: missing / raw / processed.
 *
 * Nothing here touches the existing art in public/. Processed art overrides it
 * in the game; anything not yet processed keeps what it had.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import sharp from 'sharp';
import { BATCHES, batchPrompt } from '../tools/assets/batches.mjs';
import { ASSETS, PRIORITIES, SCALE, hdSize, promptFor } from '../tools/assets/manifest.mjs';

const RAW = 'assets/raw';
const OUT = 'assets/processed';
const HD = join(OUT, 'hd');
const SHEETS = join(OUT, 'sheets');
const ATLASES = join(OUT, 'atlases');
const REFS = 'assets/reference';
const BATCH_DIR = join(RAW, 'batches');
const FROM_BATCHES = join(RAW, 'from-batches');
const STATE_FILE = join(OUT, 'state.json');
const INDEX_FILE = join(OUT, 'index.json');
const DOC = 'ASSETS.md';
const BATCH_DOC = 'ART_BATCHES.md';
const IMAGE = /\.(png|jpe?g|webp)$/i;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;

// ---------------------------------------------------------------------------
// Images as plain RGBA buffers.
// ---------------------------------------------------------------------------

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}

const blank = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });

const toSharp = (img) => sharp(Buffer.from(img.d.buffer, img.d.byteOffset, img.d.length), { raw: { width: img.w, height: img.h, channels: 4 } });

async function save(img, file) {
  await mkdir(dirname(file), { recursive: true });
  await toSharp(img).png({ compressionLevel: 9 }).toFile(file);
}

async function resize(img, w, h, fit = 'fill') {
  const { data, info } = await toSharp(img)
    .resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), { kernel: 'lanczos3', fit, position: 'centre' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}

function crop(img, x, y, w, h) {
  const out = blank(w, h);
  for (let j = 0; j < h; j += 1) {
    const sy = y + j;
    if (sy < 0 || sy >= img.h) continue;
    for (let i = 0; i < w; i += 1) {
      const sx = x + i;
      if (sx < 0 || sx >= img.w) continue;
      const s = (sy * img.w + sx) * 4;
      const o = (j * w + i) * 4;
      out.d[o] = img.d[s]; out.d[o + 1] = img.d[s + 1]; out.d[o + 2] = img.d[s + 2]; out.d[o + 3] = img.d[s + 3];
    }
  }
  return out;
}

function paste(dst, src, x, y) {
  for (let j = 0; j < src.h; j += 1) {
    const dy = y + j;
    if (dy < 0 || dy >= dst.h) continue;
    for (let i = 0; i < src.w; i += 1) {
      const dx = x + i;
      if (dx < 0 || dx >= dst.w) continue;
      const s = (j * src.w + i) * 4;
      if (src.d[s + 3] === 0) continue;
      const o = (dy * dst.w + dx) * 4;
      dst.d[o] = src.d[s]; dst.d[o + 1] = src.d[s + 1]; dst.d[o + 2] = src.d[s + 2]; dst.d[o + 3] = src.d[s + 3];
    }
  }
}

// ---------------------------------------------------------------------------
// Background removal.
// ---------------------------------------------------------------------------

const isMagenta = (r, g, b) => r > 180 && b > 180 && g < 110 && Math.abs(r - b) < 70;

/**
 * Make the background transparent.
 *
 * `mode` is 'sprite' (anything goes: alpha, magenta, then a flat-colour flood
 * fill from the edges) or 'solid' (tiles and backdrops: only real alpha and the
 * magenta fallback count, because their own colours reach the edges on purpose).
 * Returns how it was done, for the log.
 */
function removeBackground(img, mode) {
  const n = img.w * img.h;
  const d = img.d;
  let seeThrough = 0;
  let magenta = 0;
  for (let p = 0; p < n; p += 1) {
    if (d[p * 4 + 3] < 250) seeThrough += 1;
    else if (isMagenta(d[p * 4], d[p * 4 + 1], d[p * 4 + 2])) magenta += 1;
  }

  let how = 'opaque';
  if (seeThrough > n * 0.01) how = 'transparency';
  if (magenta > n * 0.01) {
    how = how === 'transparency' ? 'transparency + magenta' : 'magenta';
    for (let p = 0; p < n; p += 1) {
      const o = p * 4;
      if (isMagenta(d[o], d[o + 1], d[o + 2])) d[o + 3] = 0;
    }
    despill(img);
  }
  if (how === 'opaque' && mode === 'sprite') {
    how = floodBackground(img) ? 'flat background' : 'opaque (nothing removed)';
  }
  bleed(img);
  return how;
}

/** Pinkish fringe left on edges by anti-aliasing against the magenta: knock it out or neutralise it. */
function despill(img) {
  const { w, h, d } = img;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const o = (y * w + x) * 4;
      if (d[o + 3] === 0) continue;
      const edge =
        (x > 0 && d[o - 4 + 3] === 0) || (x < w - 1 && d[o + 4 + 3] === 0) ||
        (y > 0 && d[o - w * 4 + 3] === 0) || (y < h - 1 && d[o + w * 4 + 3] === 0);
      if (!edge) continue;
      const r = d[o], g = d[o + 1], b = d[o + 2];
      const pink = Math.min(r, b) - g;
      if (pink > 60) d[o + 3] = 0;
      else if (pink > 20) { const m = Math.round((r + g + b) / 3); d[o] = Math.min(r, m + 20); d[o + 2] = Math.min(b, m + 20); }
    }
  }
}

/** A flat background colour reached from the image edges, flood-filled to transparent. */
function floodBackground(img) {
  const { w, h, d } = img;
  const border = [];
  for (let x = 0; x < w; x += 4) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 4) border.push(y * w, y * w + w - 1);
  const median = (k) => border.map((p) => d[p * 4 + k]).sort((a, c) => a - c)[border.length >> 1];
  const bg = [median(0), median(1), median(2)];
  const near = (p) => {
    const o = p * 4;
    return Math.abs(d[o] - bg[0]) + Math.abs(d[o + 1] - bg[1]) + Math.abs(d[o + 2] - bg[2]) < 48;
  };
  // Only worth doing if most of the edge really is one colour.
  if (border.filter(near).length < border.length * 0.8) return false;
  const seen = new Uint8Array(w * h);
  const stack = border.filter(near);
  for (const p of stack) seen[p] = 1;
  while (stack.length) {
    const p = stack.pop();
    d[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q >= 0 && !seen[q] && near(q)) { seen[q] = 1; stack.push(q); }
    }
  }
  return true;
}

/** Copy edge colours into the transparent pixels next to them, so resizing does not drag in a halo. */
function bleed(img, passes = 3) {
  const { w, h, d } = img;
  let filled = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) filled[p] = d[p * 4 + 3] > 0 ? 1 : 0;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = filled.slice();
    for (let p = 0; p < w * h; p += 1) {
      if (filled[p]) continue;
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || !filled[q]) continue;
        d[p * 4] = d[q * 4]; d[p * 4 + 1] = d[q * 4 + 1]; d[p * 4 + 2] = d[q * 4 + 2];
        next[p] = 1;
        break;
      }
    }
    filled = next;
  }
}

function bbox(img, x0 = 0, y0 = 0, x1 = img.w, y1 = img.h) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (img.d[(y * img.w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? undefined : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ---------------------------------------------------------------------------
// Finding the frames in a sheet image.
// ---------------------------------------------------------------------------

/**
 * The drawings in an image, as boxes, in reading order.
 *
 * Works on a shrunk copy of the alpha channel, grown a little so that the bits
 * of one drawing (a floating hat, a flame, a stray peyah) join up. Then the
 * smallest pieces are merged into their nearest neighbours until there are as
 * many as there should be frames.
 */
function findDrawings(img, expected) {
  const step = Math.max(1, Math.round(Math.max(img.w, img.h) / 400));
  const W = Math.ceil(img.w / step), H = Math.ceil(img.h / step);
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < img.h; y += 1) {
    for (let x = 0; x < img.w; x += 1) {
      if (img.d[(y * img.w + x) * 4 + 3] > 24) mask[((y / step) | 0) * W + ((x / step) | 0)] = 1;
    }
  }
  const grow = Math.max(1, Math.round(Math.min(W, H) / 120));
  const grown = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!mask[y * W + x]) continue;
      for (let j = -grow; j <= grow; j += 1) {
        for (let i = -grow; i <= grow; i += 1) {
          const nx = x + i, ny = y + j;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) grown[ny * W + nx] = 1;
        }
      }
    }
  }
  const label = new Int32Array(W * H).fill(-1);
  let boxes = [];
  for (let p = 0; p < W * H; p += 1) {
    if (!grown[p] || label[p] >= 0) continue;
    const id = boxes.length;
    const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1, area: 0 };
    const stack = [p];
    label[p] = id;
    while (stack.length) {
      const q = stack.pop();
      const x = q % W, y = (q / W) | 0;
      if (mask[q]) box.area += 1;
      box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
      box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
      for (const r of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]) {
        if (r >= 0 && grown[r] && label[r] < 0) { label[r] = id; stack.push(r); }
      }
    }
    boxes.push(box);
  }
  // Specks are noise, not frames.
  const biggest = Math.max(0, ...boxes.map((b) => b.area));
  boxes = boxes.filter((b) => b.area > biggest * 0.02);
  // Too many pieces: fold the smallest into its nearest neighbour.
  while (boxes.length > expected) {
    boxes.sort((a, c) => a.area - c.area);
    const small = boxes.shift();
    const cx = (small.x0 + small.x1) / 2, cy = (small.y0 + small.y1) / 2;
    let best = boxes[0], bestD = Infinity;
    for (const b of boxes) {
      const dx = Math.max(b.x0 - cx, 0, cx - b.x1), dy = Math.max(b.y0 - cy, 0, cy - b.y1);
      const dist = Math.hypot(dx, dy);
      if (dist < bestD) { bestD = dist; best = b; }
    }
    best.x0 = Math.min(best.x0, small.x0); best.x1 = Math.max(best.x1, small.x1);
    best.y0 = Math.min(best.y0, small.y0); best.y1 = Math.max(best.y1, small.y1);
    best.area += small.area;
  }
  if (boxes.length !== expected) return undefined;
  // Reading order: rows first, then left to right. Two drawings share a row when
  // they overlap top to bottom — comparing their middles instead put a sprinkler
  // sitting low in the grass on a row of its own below the same sprinkler
  // spraying, and swapped the frames.
  boxes.sort((a, c) => a.y0 - c.y0);
  const rows = [];
  for (const b of boxes) {
    const row = rows.find((r) => {
      const overlap = Math.min(r.y1, b.y1) - Math.max(r.y0, b.y0);
      return overlap > 0.3 * Math.min(r.y1 - r.y0, b.y1 - b.y0);
    });
    if (row) { row.items.push(b); row.y0 = Math.min(row.y0, b.y0); row.y1 = Math.max(row.y1, b.y1); }
    else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
  }
  return rows.flatMap((r) => r.items.sort((a, c) => a.x0 - c.x0)).map((b) => ({
    x: b.x0 * step, y: b.y0 * step, w: (b.x1 - b.x0 + 1) * step, h: (b.y1 - b.y0 + 1) * step,
  }));
}

/** The fallback: cut the grid the prompt asked for, evenly. */
function gridCells(img, [cols, rows], count) {
  const area = bbox(img) ?? { x: 0, y: 0, w: img.w, h: img.h };
  const cw = area.w / cols, ch = area.h / rows;
  const cells = [];
  for (let i = 0; i < count; i += 1) {
    const c = i % cols, r = Math.floor(i / cols);
    cells.push({ x: Math.round(area.x + c * cw), y: Math.round(area.y + r * ch), w: Math.round(cw), h: Math.round(ch) });
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Down to the game's pixel grid.
// ---------------------------------------------------------------------------

/**
 * Shrink by a whole factor, one output pixel per k x k block, keeping it crisp:
 * a block is see-through unless most of it is solid, and its colour is the
 * commonest one in it rather than an average. This is what turns a large
 * pixel-art drawing back into clean game-size pixel art instead of a blur.
 */
function pixelDownscale(img, k, soft = false) {
  const W = Math.floor(img.w / k), H = Math.floor(img.h / k);
  const out = blank(W, H);
  const counts = new Map();
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      counts.clear();
      let solid = 0;
      for (let j = 0; j < k; j += 1) {
        for (let i = 0; i < k; i += 1) {
          const o = ((y * k + j) * img.w + (x * k + i)) * 4;
          if (img.d[o + 3] < 128) continue;
          solid += 1;
          const key = ((img.d[o] >> 4) << 8) | ((img.d[o + 1] >> 4) << 4) | (img.d[o + 2] >> 4);
          const c = counts.get(key);
          if (c) { c.n += 1; c.r += img.d[o]; c.g += img.d[o + 1]; c.b += img.d[o + 2]; }
          else counts.set(key, { n: 1, r: img.d[o], g: img.d[o + 1], b: img.d[o + 2] });
        }
      }
      if (solid * 2 < k * k) continue;
      let best;
      if (soft) {
        // Small things drawn with more detail than they have pixels: the
        // average keeps their colour, where the commonest shade is the outline.
        best = { n: 0, r: 0, g: 0, b: 0 };
        for (const c of counts.values()) { best.n += c.n; best.r += c.r; best.g += c.g; best.b += c.b; }
      } else {
        for (const c of counts.values()) if (!best || c.n > best.n) best = c;
      }
      const o = (y * W + x) * 4;
      out.d[o] = Math.round(best.r / best.n); out.d[o + 1] = Math.round(best.g / best.n); out.d[o + 2] = Math.round(best.b / best.n); out.d[o + 3] = 255;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// One asset.
// ---------------------------------------------------------------------------

/** Which raw files belong to which asset, by name. See "Naming" in ASSETS.md. */
function matchRaw(files) {
  const byId = new Map();
  const unknown = [];
  const ids = ASSETS.map((a) => a.id).sort((a, c) => c.length - a.length);
  for (const file of files) {
    const base = file.split('/').pop().replace(IMAGE, '').toLowerCase();
    const id = ids.find((i) => base === i || base.startsWith(`${i}-`));
    if (!id) { unknown.push(file); continue; }
    const asset = ASSETS.find((a) => a.id === id);
    const suffix = base === id ? '' : base.slice(id.length + 1);
    const list = byId.get(id) ?? [];
    if (!suffix) list.push({ file, frames: asset.frames });
    else if (asset.frames.includes(suffix)) list.push({ file, frames: [suffix] });
    else {
      // A pose strip: "run" covers run-1, run-2, run-3.
      const group = asset.frames.filter((f) => f.startsWith(`${suffix}-`));
      if (group.length) list.push({ file, frames: group });
      else { unknown.push(file); continue; }
    }
    byId.set(id, list);
  }
  return { byId, unknown };
}

async function processSheet(asset, raws, log) {
  const [fw, fh] = asset.size;
  const [cw, ch] = hdSize(asset);
  // Collect each frame's drawing at full resolution. Whole-sheet files first,
  // so single-frame files can override individual frames.
  const drawings = new Map();
  const ordered = [...raws].sort((a, c) => c.frames.length - a.frames.length);
  for (const raw of ordered) {
    const img = await load(join(RAW, raw.file));
    const how = removeBackground(img, 'sprite');
    let boxes;
    if (raw.frames.length === 1) boxes = [bbox(img)].filter(Boolean);
    else {
      boxes = findDrawings(img, raw.frames.length);
      if (!boxes) {
        const layout = raw.frames.length === asset.frames.length ? asset.layout : [raw.frames.length, 1];
        boxes = gridCells(img, layout, raw.frames.length).map((c) => {
          const b = bbox(img, c.x, c.y, Math.min(img.w, c.x + c.w), Math.min(img.h, c.y + c.h));
          return b;
        });
        log.push(`${raw.file}: could not find ${raw.frames.length} separate drawings, cut the ${layout.join('x')} grid instead`);
      }
    }
    if (boxes.length !== raw.frames.length || boxes.some((b) => !b)) {
      throw new Error(`${raw.file}: expected ${raw.frames.length} frame(s), found ${boxes.filter(Boolean).length}`);
    }
    raw.frames.forEach((name, i) => {
      const b = boxes[i];
      drawings.set(name, crop(img, b.x, b.y, b.w, b.h));
    });
    log.push(`${raw.file}: background by ${how}, ${raw.frames.length} frame(s)`);
  }
  const missing = asset.frames.filter((f) => !drawings.has(f));
  if (missing.length) throw new Error(`missing frame(s): ${missing.join(', ')}`);

  // Blocks fill their tile edge to edge, so a row of them meets with no seam.
  if (asset.fill) {
    const hd = blank(cw * asset.frames.length, ch);
    for (const [i, name] of asset.frames.entries()) {
      paste(hd, await resize(drawings.get(name), cw, ch), i * cw, 0);
    }
    const game = pixelDownscale(hd, SCALE, asset.soft);
    await save(hd, join(HD, asset.url));
    await save(game, join(SHEETS, `${asset.id}.png`));
    return { sheet: join(SHEETS, `${asset.id}.png`), hd: join(HD, asset.url) };
  }

  // One scale for every frame, so a crouch is smaller than a stand rather than
  // blown up to the same height. A one-game-pixel margin all round.
  const pad = SCALE;
  const scale = Math.min(...asset.frames.map((f) => {
    const d = drawings.get(f);
    return Math.min((cw - pad * 2) / d.w, (ch - pad) / d.h);
  }));
  const hd = blank(cw * asset.frames.length, ch);
  for (const [i, name] of asset.frames.entries()) {
    const d = drawings.get(name);
    const r = await resize(d, d.w * scale, d.h * scale);
    const x = i * cw + Math.round((cw - r.w) / 2);
    const y = asset.anchor === 'center' ? Math.round((ch - r.h) / 2) : ch - r.h;
    paste(hd, r, x, y);
  }
  const game = pixelDownscale(hd, SCALE, asset.soft);
  if (game.w !== fw * asset.frames.length || game.h !== fh) throw new Error('size mismatch after downscale');
  await save(hd, join(HD, asset.url));
  await save(game, join(SHEETS, `${asset.id}.png`));
  return { sheet: join(SHEETS, `${asset.id}.png`), hd: join(HD, asset.url) };
}

async function processWhole(asset, raws, log) {
  // Tiles and backdrops: one image, filled edge to edge, never trimmed.
  const raw = raws.find((r) => r.frames.length === asset.frames.length) ?? raws[0];
  const img = await load(join(RAW, raw.file));
  const how = removeBackground(img, 'solid');
  const [w, h] = hdSize(asset);
  const hd = await resize(img, w, h, 'cover');
  const game = pixelDownscale(hd, SCALE, asset.soft);
  await save(hd, join(HD, asset.url));
  await save(game, join(OUT, asset.url));
  log.push(`${raw.file}: background ${how}, ${w}x${h} master, ${game.w}x${game.h} in game`);
  return { file: join(OUT, asset.url), hd: join(HD, asset.url) };
}

// ---------------------------------------------------------------------------
// Atlases.
// ---------------------------------------------------------------------------

/**
 * Shelf packing: tallest first, left to right, a new shelf when a row is full.
 * Not the tightest packer there is, and it does not need to be: these are a
 * few dozen small sheets per group.
 */
function pack(items, maxWidth = 1024, gap = 2) {
  const sorted = [...items].sort((a, c) => c.h - a.h || c.w - a.w);
  const width = Math.min(maxWidth, Math.max(...sorted.map((i) => i.w + gap * 2), 64));
  let x = gap, y = gap, shelf = 0;
  for (const it of sorted) {
    if (x + it.w + gap > width) { x = gap; y += shelf + gap; shelf = 0; }
    it.x = x; it.y = y;
    x += it.w + gap;
    shelf = Math.max(shelf, it.h);
  }
  return { width, height: y + shelf + gap };
}

async function buildAtlases(state) {
  await rm(ATLASES, { recursive: true, force: true });
  const groups = new Map();
  for (const asset of ASSETS) {
    if (asset.kind !== 'sheet' || state[asset.id]?.status !== 'processed') continue;
    const file = join(SHEETS, `${asset.id}.png`);
    if (!existsSync(file)) continue;
    const img = await load(file);
    const list = groups.get(asset.group) ?? [];
    list.push({ asset, img, w: img.w, h: img.h });
    groups.set(asset.group, list);
  }
  const atlases = {};
  const entries = {};
  for (const [group, items] of groups) {
    const { width, height } = pack(items);
    const sheet = blank(width, height);
    const frames = {};
    for (const it of items) {
      paste(sheet, it.img, it.x, it.y);
      frames[it.asset.id] = {
        frame: { x: it.x, y: it.y, w: it.w, h: it.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h },
        sourceSize: { w: it.w, h: it.h },
      };
      entries[it.asset.url] = {
        atlas: group,
        frame: it.asset.id,
        frameWidth: it.asset.size[0],
        frameHeight: it.asset.size[1],
        frames: it.asset.frames.length,
      };
    }
    await save(sheet, join(ATLASES, `${group}.png`));
    await writeFile(
      join(ATLASES, `${group}.json`),
      JSON.stringify({ frames, meta: { app: 'bochur-bros process-assets', image: `${group}.png`, format: 'RGBA8888', size: { w: width, h: height }, scale: '1' } }, null, 1),
    );
    atlases[group] = { image: `processed/atlases/${group}.png`, data: `processed/atlases/${group}.json` };
  }
  for (const asset of ASSETS) {
    if (asset.kind === 'sheet' || state[asset.id]?.status !== 'processed') continue;
    entries[asset.url] = { file: `processed/${asset.url}` };
  }
  return { atlases, entries };
}

// ---------------------------------------------------------------------------
// Reference images: the current art, enlarged, to hand ChatGPT alongside a prompt.
// ---------------------------------------------------------------------------

async function writeReferences() {
  for (const asset of ASSETS) {
    const src = join('public', asset.url);
    const dst = join(REFS, `${asset.id}.png`);
    if (!existsSync(src) || existsSync(dst)) continue;
    await mkdir(REFS, { recursive: true });
    const { width, height } = await sharp(src).metadata();
    await sharp(src).resize(width * SCALE, height * SCALE, { kernel: 'nearest' }).png().toFile(dst);
  }
  for (const batch of BATCHES) {
    const dst = join(REFS, 'batches', `${batch.id}.png`);
    if (!existsSync(dst)) await writeBatchReference(batch, dst);
  }
}

/**
 * One picture of a batch's current art, laid out the way the prompt asks for
 * the new one — a row per asset, or three stacked panels — labelled, on a
 * checkerboard so the see-through parts read as see-through.
 */
async function writeBatchReference(batch, dst) {
  const W = 1536, GAP = 24, LABEL = 44;
  const label = (text) => Buffer.from(
    `<svg width="${W}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg"><text x="16" y="31" font-family="DejaVu Sans, sans-serif" ` +
      `font-weight="bold" font-size="26" fill="#ffffff">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
  );
  const checker = (w, h) => Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse">` +
      `<rect width="32" height="32" fill="#d0d0d0"/><rect width="16" height="16" fill="#a0a0a0"/><rect x="16" y="16" width="16" height="16" fill="#a0a0a0"/>` +
      `</pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/></svg>`,
  );
  const parts = [];
  let y = GAP;
  for (const [i, id] of batch.rows.entries()) {
    const a = ASSETS.find((x) => x.id === id);
    const src = join(REFS, `${id}.png`);
    const name = batch.kind === 'backdrops' ? ['Top panel: sky', 'Middle panel: distance', 'Bottom panel: close up'][i] : `Row ${i + 1}: ${a.title.replace(/^.*? — /, '')}`;
    parts.push({ input: label(name), left: 0, top: y });
    y += LABEL;
    if (!existsSync(src)) {
      parts.push({ input: label('   (nothing drawn yet - new)'), left: 0, top: y });
      y += LABEL + GAP;
      continue;
    }
    const { width, height } = await sharp(src).metadata();
    const scale = Math.min((W - 32) / width, (batch.kind === 'backdrops' ? 760 : 260) / height);
    const w = Math.round(width * scale), h = Math.round(height * scale);
    const img = await sharp(src).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
    parts.push({ input: checker(w, h), left: 16, top: y }, { input: img, left: 16, top: y });
    y += h + GAP;
  }
  await mkdir(dirname(dst), { recursive: true });
  await sharp({ create: { width: W, height: y, channels: 4, background: '#2b2b38' } }).composite(parts).png().toFile(dst);
}

// ---------------------------------------------------------------------------
// ASSETS.md
// ---------------------------------------------------------------------------

function rawName(asset) {
  return `${asset.id}.png`;
}

/** ART_BATCHES.md: the dozen ChatGPT requests that cover the rest of the game, with what each still needs. */
function writeBatchDoc(state) {
  const out = [];
  out.push('# Bochur Bros — art in batches');
  out.push('');
  out.push('> **Generated by `npm run assets`** from `tools/assets/batches.mjs`. Every run rewrites it with what is done.');
  out.push('');
  out.push('Each batch is **one ChatGPT request** that makes many pieces of art in one picture. For each one:');
  out.push('');
  out.push('1. Attach 3 pictures: **Mendy** (`assets/raw/mendy_small.png`), **Berel** (`assets/raw/berel_small.png`) and the');
  out.push('   batch\'s **reference** (the current art, laid out the way the new picture should be).');
  out.push('2. Paste the prompt.');
  out.push('3. Save what comes back as `assets/raw/batches/<batch id>.png` and run `npm run assets`. It is cut into its pieces');
  out.push('   on its own. If one row comes out badly, redo just that piece and save it in `assets/raw/` under its own name.');
  out.push('');
  const total = BATCHES.reduce((n, b) => n + b.rows.length, 0);
  const have = BATCHES.reduce((n, b) => n + b.rows.filter((id) => state[id]?.status === 'processed').length, 0);
  out.push(`**${have} of ${total} pieces done across ${BATCHES.length} batches.**`);
  out.push('');
  for (const [i, batch] of BATCHES.entries()) {
    const done = batch.rows.filter((id) => state[id]?.status === 'processed').length;
    out.push(`## ${done === batch.rows.length ? '✅' : done ? '🟨' : '⬜'} Batch ${i + 1} — ${batch.title}`);
    out.push('');
    out.push(`${done} of ${batch.rows.length} done · save as \`assets/raw/batches/${batch.id}.png\` · reference \`assets/reference/batches/${batch.id}.png\``);
    out.push('');
    out.push('```text');
    out.push(batchPrompt(batch));
    out.push('```');
    out.push('');
  }
  return writeFile(BATCH_DOC, out.join('\n'));
}

function writeDoc(state, unknown) {
  const icon = { missing: '⬜ missing', raw: '🟨 raw', processed: '✅ processed' };
  const counts = { missing: 0, raw: 0, processed: 0 };
  for (const a of ASSETS) counts[state[a.id]?.status ?? 'missing'] += 1;

  const out = [];
  out.push('# Bochur Bros — art assets');
  out.push('');
  out.push('> **Generated by `npm run assets`** from `tools/assets/manifest.mjs`. Edit the manifest, not this file:');
  out.push('> every run rewrites it with the current status of every asset.');
  out.push('');
  out.push(`**${ASSETS.length} assets** — ✅ ${counts.processed} processed · 🟨 ${counts.raw} raw (waiting or failed) · ⬜ ${counts.missing} missing`);
  out.push('');
  out.push('## How to add art');
  out.push('');
  out.push('1. Pick an asset below. Copy its prompt into ChatGPT and attach your reference images (the');
  out.push('   brothers, plus the current version of the asset from `assets/reference/`, enlarged 6x, when there is one).');
  out.push('2. Save what ChatGPT gives you into **`assets/raw/`**, named as the asset says ("Drop as").');
  out.push('3. Run **`npm run assets`**. Then `npm run dev` and look at it in the game.');
  out.push('');
  out.push('### Naming');
  out.push('');
  out.push('- `mendy_small.png` — the whole asset: every frame, in the grid the prompt asked for.');
  out.push('- `mendy_small-run.png` — just one pose\'s frames (here `run-1`, `run-2`, `run-3`), left to right.');
  out.push('- `mendy_small-crouch.png` — just one frame. Overrides that frame in a whole-asset image, so you can redo one bad frame.');
  out.push('- PNG, JPG or WebP. Transparent backgrounds are kept; a flat `#FF00FF` magenta background is removed;');
  out.push('  for sprites, any other flat background colour touching the edges is removed too.');
  out.push('');
  out.push('### Sizes');
  out.push('');
  out.push('Sizes are given at **1920x1080**. The game itself is built on a 320x180 screen — exactly one sixth — and');
  out.push('scaled up to fit, so every 1080p size is 6x the game size. The pipeline keeps the 1080p master in');
  out.push('`assets/processed/hd/` and snaps a game-size copy to the game\'s pixel grid; that copy is what the game draws.');
  out.push('A frame\'s size is fixed by its hitbox in the game, so ChatGPT\'s image does not have to match it: the');
  out.push('pipeline trims and scales.');
  out.push('');
  out.push('### In the game');
  out.push('');
  out.push('The new art is a **preview** until it is switched on for everyone (`NEW_ART_BY_DEFAULT` in');
  out.push('`src/config/processedArt.ts`): the plain address still shows the original art. To see the new art, add to the');
  out.push('address: `?art=mix` (new art where it exists, original for the rest) or `?art=new` (only the new art, with');
  out.push('coloured boxes for what is still to be drawn).');
  out.push('');
  out.push('## Batches');
  out.push('');
  out.push(`The quick way, many assets per ChatGPT image: see **[${BATCH_DOC}](${BATCH_DOC})**.`);
  out.push('');
  if (unknown.length) {
    out.push('### ⚠️ Files in assets/raw/ that match no asset');
    out.push('');
    for (const f of unknown) out.push(`- \`${f}\``);
    out.push('');
  }
  out.push('## Status');
  out.push('');
  out.push('| Asset | Priority | Status | Drop as | 1080p frame | Frames |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const a of ASSETS) {
    const [w, h] = hdSize(a);
    out.push(`| [${a.title}](#${a.id.replace(/_/g, '_')}) | ${a.priority} | ${icon[state[a.id]?.status ?? 'missing']} | \`${rawName(a)}\` | ${w}×${h} | ${a.frames.length} |`);
  }
  out.push('');
  for (const [p, label] of Object.entries(PRIORITIES)) {
    out.push(`## Priority ${p} — ${label}`);
    out.push('');
    for (const a of ASSETS.filter((x) => String(x.priority) === p)) {
      const [w, h] = hdSize(a);
      const st = state[a.id];
      out.push(`### ${a.id}`);
      out.push('');
      out.push(`**${a.title}** — ${icon[st?.status ?? 'missing']}${st?.error ? ` — last attempt failed: ${st.error}` : ''}`);
      out.push('');
      out.push(`- **Drop as:** \`assets/raw/${rawName(a)}\``);
      out.push(`- **Game file:** \`${a.url}\` → ${a.kind === 'sheet' ? `atlas \`assets/processed/atlases/${a.group}.png\`` : `\`assets/processed/${a.url}\``}; 1080p master \`assets/processed/hd/${a.url}\``);
      if (a.kind === 'sheet') {
        out.push(`- **Size:** ${w}×${h} px per frame at 1080p (${a.size[0]}×${a.size[1]} in game); whole sheet ${w * a.frames.length}×${h}`);
        out.push(`- **Frames (${a.frames.length}):** ${a.frames.map((f) => `\`${f}\``).join(', ')}${a.frames.length > 1 ? ` — drawn as a ${a.layout[0]}×${a.layout[1]} grid` : ''}`);
        out.push(`- **Anchor:** ${a.fill ? 'fills the whole tile, edge to edge' : a.anchor === 'center' ? 'centred in the frame' : 'bottom centre (feet on the frame\'s bottom edge)'}`);
      } else {
        out.push(`- **Size:** ${w}×${h} px at 1080p (${a.size[0]}×${a.size[1]} in game)${a.kind === 'tile' ? ', seamless on all sides' : ', seamless left to right'}`);
      }
      if (existsSync(join(REFS, `${a.id}.png`))) out.push(`- **Reference (current art, 6x):** \`assets/reference/${a.id}.png\``);
      if (a.note) out.push(`- **Note:** ${a.note}`);
      out.push('');
      out.push('```text');
      out.push(promptFor(a));
      out.push('```');
      out.push('');
    }
  }
  return writeFile(DOC, out.join('\n'));
}

// ---------------------------------------------------------------------------

async function listRaw(dir = RAW) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (p === BATCH_DIR) continue; // cut up by splitBatches(), not assets themselves
    if (e.isDirectory()) out.push(...(await listRaw(p)));
    else if (IMAGE.test(e.name)) out.push(relative(RAW, p));
  }
  return out.sort();
}

async function hashOf(raws) {
  const h = createHash('sha1');
  for (const r of [...raws].sort((a, c) => a.file.localeCompare(c.file))) {
    h.update(r.file);
    h.update(await readFile(join(RAW, r.file)));
  }
  return h.digest('hex');
}

/**
 * The manifest must agree with the game: where the game already has art, the
 * manifest's frame size and frame count must reproduce its sheet exactly, or
 * new art would be cut into the wrong frames. Checked every run.
 */
async function checkManifest() {
  const wrong = [];
  for (const a of ASSETS) {
    const file = join('public', a.url);
    if (!existsSync(file)) continue;
    const { width, height } = await sharp(file).metadata();
    const w = a.kind === 'sheet' ? a.size[0] * a.frames.length : a.size[0];
    if (width !== w || height !== a.size[1]) wrong.push(`${a.id}: manifest says ${w}x${a.size[1]}, the game's art is ${width}x${height}`);
  }
  for (const line of wrong) console.warn(`  ! ${line}`);
  return wrong.length;
}

// ---------------------------------------------------------------------------
// Batches: one ChatGPT image holding many assets (tools/assets/batches.mjs).
// ---------------------------------------------------------------------------

/**
 * The bands of rows with something drawn in them, merged across the narrowest
 * gaps until there are `count` — a stray speck or a wing tip that leaves a
 * one-pixel gap inside a row does not make a row of its own.
 */
function rowBands(img, count) {
  const bands = [];
  let start = -1;
  for (let y = 0; y <= img.h; y += 1) {
    let n = 0;
    if (y < img.h) for (let x = 0; x < img.w; x += 1) if (img.d[(y * img.w + x) * 4 + 3] > 40) n += 1;
    if (n > 1 && start < 0) start = y;
    if (n <= 1 && start >= 0) { bands.push([start, y]); start = -1; }
  }
  while (bands.length > count) {
    let best = 0;
    for (let i = 1; i < bands.length - 1; i += 1) {
      if (bands[i + 1][0] - bands[i][1] < bands[best + 1][0] - bands[best][1]) best = i;
    }
    bands.splice(best, 2, [bands[best][0], bands[best + 1][1]]);
  }
  if (bands.length < count) throw new Error(`expected ${count} rows, found ${bands.length}`);
  // Each row gets the space up to halfway to its neighbours, so nothing is cut.
  return bands.map(([a, b], i) => [
    i === 0 ? 0 : Math.round((bands[i - 1][1] + a) / 2),
    i === bands.length - 1 ? img.h : Math.round((b + bands[i + 1][0]) / 2),
  ]);
}

/**
 * Cut every batch image in assets/raw/batches/ into one raw file per asset, in
 * assets/raw/from-batches/. Rebuilt from scratch every run; an asset that has
 * its own raw file elsewhere in assets/raw/ keeps that instead.
 */
async function splitBatches(ownRaw) {
  await rm(FROM_BATCHES, { recursive: true, force: true });
  if (!existsSync(BATCH_DIR)) return;
  for (const file of (await readdir(BATCH_DIR)).filter((f) => IMAGE.test(f)).sort()) {
    const base = file.replace(IMAGE, '').toLowerCase();
    const batch = BATCHES.find((b) => base === b.id);
    if (!batch) { console.warn(`  ? batches/${file} matches no batch — see "Batches" in ASSETS.md`); continue; }
    try {
      const img = await load(join(BATCH_DIR, file));
      let parts;
      if (batch.kind === 'backdrops') {
        const third = img.h / batch.rows.length;
        parts = batch.rows.map((_, i) => [Math.round(i * third), Math.round((i + 1) * third)]);
      } else {
        removeBackground(img, 'sprite');
        parts = rowBands(img, batch.rows.length);
      }
      const written = [];
      for (const [i, id] of batch.rows.entries()) {
        if (ownRaw.has(id)) continue;
        const [y0, y1] = parts[i];
        await save(crop(img, 0, y0, img.w, y1 - y0), join(FROM_BATCHES, `${id}.png`));
        written.push(id);
      }
      console.log(`  ✂ ${file}: ${written.length} of ${batch.rows.length} rows cut out${written.length < batch.rows.length ? ' (the rest have their own raw file)' : ''}`);
    } catch (error) {
      console.error(`  ✗ batches/${file}: ${error.message ?? error}`);
      process.exitCode = 1;
    }
  }
}

async function main() {
  await mkdir(RAW, { recursive: true });
  if (await checkManifest()) {
    console.error('The manifest disagrees with the game (above). Fix tools/assets/manifest.mjs before adding art.');
    process.exitCode = 1;
    return;
  }
  await mkdir(OUT, { recursive: true });
  const state = existsSync(STATE_FILE) ? JSON.parse(await readFile(STATE_FILE, 'utf8')) : {};
  const own = matchRaw((await listRaw()).filter((f) => !f.startsWith('from-batches/')));
  await splitBatches(new Set(own.byId.keys()));
  const { byId, unknown } = matchRaw(await listRaw());
  for (const f of unknown) console.warn(`  ? ${f} matches no asset in the manifest — see "Naming" in ASSETS.md`);

  let done = 0, failed = 0, unchanged = 0;
  for (const asset of ASSETS) {
    const raws = byId.get(asset.id);
    if (!raws) {
      // Nothing to work from. If it was processed before, the raw was deleted:
      // forget the old output rather than keep art nobody can rebuild.
      delete state[asset.id];
      continue;
    }
    if (ONLY && asset.id !== ONLY) continue;
    const hash = await hashOf(raws);
    const prev = state[asset.id];
    const outputsThere = prev?.outputs?.every((f) => existsSync(f));
    if (!FORCE && prev?.hash === hash && prev.status === 'processed' && outputsThere) { unchanged += 1; continue; }

    const log = [];
    try {
      const out = asset.kind === 'sheet' ? await processSheet(asset, raws, log) : await processWhole(asset, raws, log);
      state[asset.id] = { status: 'processed', hash, outputs: Object.values(out), at: new Date().toISOString() };
      done += 1;
      console.log(`  ✓ ${asset.id}`);
      for (const line of log) console.log(`      ${line}`);
    } catch (error) {
      state[asset.id] = { status: 'raw', hash, error: String(error.message ?? error) };
      failed += 1;
      console.error(`  ✗ ${asset.id}: ${error.message ?? error}`);
    }
  }

  // Outputs of assets whose raw files are gone.
  for (const asset of ASSETS) {
    if (state[asset.id]) continue;
    await rm(join(SHEETS, `${asset.id}.png`), { force: true });
    await rm(join(HD, asset.url), { force: true });
    if (asset.kind !== 'sheet') await rm(join(OUT, asset.url), { force: true });
  }

  const index = await buildAtlases(state);
  await writeFile(INDEX_FILE, JSON.stringify({ scale: SCALE, ...index }, null, 2) + '\n');
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  await writeReferences();
  await writeDoc(state, unknown);
  await writeBatchDoc(state);

  const processed = Object.values(state).filter((s) => s.status === 'processed').length;
  console.log(
    `\n${done} processed, ${unchanged} unchanged, ${failed} failed. ` +
      `${processed} of ${ASSETS.length} assets now have new art; ${Object.keys(index.atlases).length} atlas(es). ASSETS.md updated.`,
  );
  if (failed) process.exitCode = 1;
}

await main();
