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
  let thief;
  let autoScroll;
  let autoScrollUp;
  let lightRadius;
  const fireflies = [];
  const solids = [];
  const labels = [];
  const coins = [];
  const blocks = [];
  const enemies = [];
  const crates = [];
  const hazards = [];
  const waters = [];
  const currents = [];
  const clotheslines = [];
  const muds = [];
  const swings = [];
  const steps = [];
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
    /** A leaf blower: a wind zone with the machine drawn at its mouth (§6). */
    blower(x, y, w, h, direction = -1) {
      hazards.push({ x, y, w, h, kind: 'blower', direction });
      return api;
    },
    /**
     * The hamsin (§6): a gusting hot wind over a region. Calm, papers lift, gust.
     * Berel walks through it; Mendy waits for the calm or gets pushed.
     */
    hamsin(x, y, w, h, direction = -1) {
      hazards.push({ x, y, w, h, kind: 'hamsin', direction });
      return api;
    },
    /** A moving hazard: pipe, cart, van, stroller. */
    hazard(kind, x, y = floorTop, direction = -1) {
      hazards.push({ x, y, w: 1, h: 1, kind, direction });
      return api;
    },
    /** Something you bounce off: an awning, a bag of rubbish. */
    bounce(x, y, w = 1) { bouncers.push({ x, y, w }); return api; },
    /** A trampoline between backyards (§6). Throws you further than an awning. */
    trampoline(x, y, w = 2) { bouncers.push({ x, y, w, kind: 'trampoline' }); return api; },
    /**
     * A pop-up sprinkler. Fires on a timer and launches you (§6).
     *
     * `offsetMs` is how far into the cycle it starts, so a row of them can
     * ripple instead of firing as one wall.
     */
    sprinkler(x, y, { periodMs = 2600, offsetMs = 0, w = 1 } = {}) {
      bouncers.push({ x, y, w, kind: 'sprinkler', periodMs, offsetMs });
      return api;
    },
    /**
     * A body of water you can swim in (§6). `y` is the surface.
     *
     * Water is not a solid and not a hazard — it is a region that changes how
     * you move through it. Whatever is under it still has to be built: a pool
     * needs a floor and two walls like any other hole in the ground, or you
     * swim out of the bottom of the level.
     */
    water(x, y, w, h) { waters.push({ x, y, w, h }); return api; },
    /**
     * A current, from the filter (§6). `dx`/`dy` are which way it pushes.
     *
     * Drawn as part of the water rather than on top of it, so place one inside
     * a `water` rectangle; a current in mid-air does nothing.
     */
    current(x, y, w, h, dx = 1, dy = 0, force) {
      currents.push({ x, y, w, h, dx, dy, ...(force === undefined ? {} : { force }) });
      return api;
    },
    /**
     * A return jet: a current that pushes straight up. Water's lift shaft.
     *
     * Leave `force` alone unless you have measured it. A jet is working
     * against gravity before it moves anybody, so the default is more than
     * twice a sideways current's and anything much under it does nothing.
     */
    jet(x, y, w, h, force) {
      currents.push({ x, y, w, h, dx: 0, dy: -1, ...(force === undefined ? {} : { force }) });
      return api;
    },
    /**
     * A rope swing (§6). `y` is where it is tied and `length` is how far the
     * knot hangs below that, in tiles.
     *
     * Hang it so the knot is at about head height over the near shore: the grab
     * is the hard part of a swing, and a rope you have to jump blind for is a
     * rope people walk past.
     */
    swing(x, y, length = 3, lean) {
      swings.push({ x, y, length, ...(lean === undefined ? {} : { lean }) });
      return api;
    },
    /** A patch of mud, which slows whoever is standing in it (§6). */
    mud(x, y, w, h = 1) { muds.push({ x, y, w, h }); return api; },
    /**
     * A clothesline (§6). `drop` is how far the far end hangs below the near
     * one, and its sign is which way you ride: negative reaches back to the
     * left. A drop of zero is washing you can only walk under.
     *
     * Ride it or duck under it — which of the two happens is decided by the
     * player's feet, not by anything written here.
     */
    clothesline(x, y, w, drop = 3) {
      clotheslines.push({ x, y, w, drop });
      return api;
    },
    /** A rotting porch step: solid until it is stood on (§6). */
    step(x, y) { steps.push({ x, y }); return api; },
    /** A run of them, which is how a porch rots. */
    stepRow(x, y, count) {
      for (let i = 0; i < count; i += 1) steps.push({ x: x + i, y });
      return api;
    },
    /**
     * The level's boss. `kind` picks the fight; leaving it off means the
     * Pigeon King, which is what 1-4 has always meant by a boss marker.
     */
    bossAt(x, y, kind) { boss = { x, y, ...(kind ? { kind } : {}) }; return api; },
    /** The Yetzer Hara, in the prologue. He runs; he is not fought. */
    thiefAt(x, y = floorTop) { thief = { x, y }; return api; },
    perch(x, y) { perches.push({ x, y }); return api; },
    scrolls(pxPerSecond) { autoScroll = pxPerSecond; return api; },
    /** A night level: only this many pixels around the player can be seen (§6, 3-3). */
    dark(radius) { lightRadius = radius; return api; },
    /** A firefly, hovering over something worth landing on (§6, 3-3). */
    firefly(x, y) { fireflies.push({ x, y }); return api; },
    /**
     * A run of fireflies along a surface, one every `every` tiles.
     *
     * The common case: a roof or a ledge that has to be findable in the dark.
     * Spaced rather than solid, because a string of lights reads as a path and
     * a solid bar of light reads as a platform — and the platform is already
     * there.
     */
    fireflyRow(x, y, count, every = 2) {
      for (let i = 0; i < count; i += 1) fireflies.push({ x: x + i * every, y });
      return api;
    },
    /** A climbing level whose camera rises by itself, px/s. */
    rises(pxPerSecond) { autoScrollUp = pxPerSecond; return api; },
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
        water: waters,
        currents,
        clotheslines,
        mud: muds,
        swings,
        steps,
        bouncers,
        groundRow: floorTop,
        perches,
        checkpoints,
        ...(boss ? { boss } : {}),
        ...(thief ? { thief } : {}),
        ...(autoScroll === undefined ? {} : { autoScroll }),
        ...(autoScrollUp === undefined ? {} : { autoScrollUp }),
        ...(lightRadius === undefined ? {} : { lightRadius }),
        ...(fireflies.length ? { fireflies } : {}),
        ...(goal ? { goal } : {}),
      };
    },
  };

  return api;
}
