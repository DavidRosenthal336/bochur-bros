/**
 * A small authoring API that produces a LevelDef — the same shape the game
 * reads, and the input to `to-tiled.mjs`.
 *
 * Levels with repetition in them are clearer stated as a loop than placed by
 * hand. Once a map has been generated you can open the `.tmj` in Tiled and
 * edit it visually instead; just stop regenerating that one.
 */
export function level({ key, name, width, height, floorTop, background = '0x151a2c', backdrop = 'day' }) {
  const bouncers = [];
  const perches = [];
  let boss;
  let autoScroll;
  const solids = [];
  const labels = [];
  const coins = [];
  const blocks = [];
  const enemies = [];
  const crates = [];
  const hazards = [];
  const checkpoints = [];
  let spawn = { x: 2, y: floorTop };
  let goal;

  const api = {
    /** Solid ground from the surface down to the bottom of the level. */
    ground(x, w, top = floorTop) {
      solids.push({ x, y: top, w, h: height - top, kind: 'ground' });
      return api;
    },
    /** A block sitting on the main floor, whose top surface is `top`. */
    ledge(x, top, w) {
      solids.push({ x, y: top, w, h: floorTop - top, kind: 'platform' });
      return api;
    },
    /** Any solid rectangle. */
    slab(x, y, w, h, kind = 'platform') {
      solids.push({ x, y, w, h, kind });
      return api;
    },
    spawnAt(x, y = floorTop) { spawn = { x, y }; return api; },
    goalAt(x, y = floorTop) { goal = { x, y }; return api; },
    checkpoint(x, y = floorTop) { checkpoints.push({ x, y }); return api; },
    coin(x, y) { coins.push({ x, y }); return api; },
    coinRow(x, y, count) {
      for (let i = 0; i < count; i += 1) coins.push({ x: x + i, y });
      return api;
    },
    /** A shallow arc, the shape a jump actually traces. */
    coinArc(x, y, count) {
      const lift = [0, 1, 2, 2, 2, 2, 1, 0];
      for (let i = 0; i < count; i += 1) coins.push({ x: x + i, y: y - (lift[i] ?? 0) });
      return api;
    },
    block(x, y, kind = 'brick', contents = 'coin') { blocks.push({ x, y, kind, contents }); return api; },
    bricks(x, y, count) {
      for (let i = 0; i < count; i += 1) blocks.push({ x: x + i, y, kind: 'brick', contents: 'coin' });
      return api;
    },
    enemy(x, y, kind = 'pigeon') { enemies.push({ x, y, kind }); return api; },
    crate(x, y = floorTop) { crates.push({ x, y }); return api; },
    wind(x, y, w, h, direction) { hazards.push({ x, y, w, h, kind: 'wind', direction }); return api; },
    /** A moving hazard: pipe, cart, van, stroller. */
    hazard(kind, x, y = floorTop, direction = -1) {
      hazards.push({ x, y, w: 1, h: 1, kind, direction });
      return api;
    },
    /** Something you bounce off: an awning, a bag of rubbish. */
    bounce(x, y, w = 1) { bouncers.push({ x, y, w }); return api; },
    bossAt(x, y) { boss = { x, y }; return api; },
    perch(x, y) { perches.push({ x, y }); return api; },
    scrolls(pxPerSecond) { autoScroll = pxPerSecond; return api; },
    label(x, y, text) { labels.push({ x, y, text }); return api; },
    /** Signage. Row 15 is the first row the camera reliably shows. */
    sign(x, lines, firstRow = 15) {
      lines.forEach((text, i) => labels.push({ x, y: firstRow + i, text }));
      return api;
    },
    build() {
      return {
        key,
        name,
        widthInTiles: width,
        heightInTiles: height,
        spawn,
        backgroundColor: Number(background),
        backdrop,
        solids,
        labels,
        coins,
        blocks,
        enemies,
        crates,
        hazards,
        bouncers,
        groundRow: floorTop,
        perches,
        checkpoints,
        ...(boss ? { boss } : {}),
        ...(autoScroll === undefined ? {} : { autoScroll }),
        ...(goal ? { goal } : {}),
      };
    },
  };

  return api;
}
