# Bochur Bros

A 2D side-scrolling platformer. See `BOCHUR_BROS_DESIGN.md` for the design doc.

**Current state: Milestone 1 — the jump.** One character, one greybox test
level, a camera that follows. Nothing else, on purpose.

## Playing it

The quickest way is a hosted build — no install, just a link. `npm run
build:playtest` produces a flattened, self-contained page in `playtest/` that
can be published anywhere static. It is keyboard-only until Milestone 7 adds
touch controls, so play it on a computer.

To run it locally instead:

```bash
npm install
npm run dev      # then open http://localhost:5173
```

Other scripts: `npm run build` (typechecks, then bundles to `dist/`),
`npm run build:playtest`, `npm run preview`, `npm run typecheck`.

Click the game once before using the keyboard — a page does not receive key
presses until something inside it has been clicked. The start card says so.

## Controls

| | |
|---|---|
| Arrows / WASD | Move; hold Down to crouch |
| Space or Z | Jump — hold for height |
| Shift or X | Run |
| R | Respawn at the last checkpoint |
| F1 | Toggle the debug readout |
| F2 | Toggle collision boxes |
| F3 | Switch between the level and the Gym |

`Tab` (swap) and `Esc` (pause) are bound but do nothing yet.

Mendy moves on Super Mario Bros.' own figures: 90 px/s walking, 150 running, a
four-tile standing jump and a five-tile running one. Holding the jump button
does not add force, it *lowers gravity* — which is why a tap gives you one tile
and a held button gives you four.

### Two dials worth knowing

Both are in `src/config/Tuning.ts`:

- **`riseSeconds`** in each `jumpArc(...)` line — how long the jump takes to
  reach the top. Lower it and jumping feels faster *without changing how high
  it goes*. Raise it and the jump floats.
- **`VIEW_WIDTH` / `VIEW_HEIGHT`** — how much of the world fits on screen.
  320x180 shows 20 tiles across. A wider view makes everything read as slower,
  because the same walking speed has more screen to cross.

## Tuning the feel

Everything that affects how the character moves lives in one file:
**`src/config/Tuning.ts`**. Vite hot-reloads it, so edit, save, and the page
picks it up. Values taken from the design doc are marked `[SPEC]`; values added
to make it playable are marked `[ADDED]` and explained.

The test level is a calibration range, not a level. Each lettered station
measures one property of the jump:

| | |
|---|---|
| **A** | Flat ground — acceleration, top speed, stopping, pivoting |
| **B** | Pillars rising one tile at a time — how high you get |
| **C** | Gaps widening one tile at a time — how far you get |
| **D** | A ledge to run off and jump from late — coyote time |
| **E** | A staircase and a long drop — jump buffering |
| **F** | A two-tile-high tunnel — head collisions |
| **G** | A one-tile tunnel — crouching, and what Cholent cannot fit through |

There are no bottomless pits. Every gap has a floor a short hop below it, so
missing a jump costs a walk back and nothing else.

Turn on F1 and the readout gives you the apex and the distance of your last
jump in pixels and tiles, which is faster than arguing about it.

## Layout

```
src/
  config/Tuning.ts      every tunable number, and only tunable numbers
  entities/Player.ts    movement, jump state, coyote time, jump buffer
  input/                abstract actions; keyboard today, touch in Milestone 7
  levels/               level geometry as data; Tiled replaces this in M4
  scenes/               boot, the test level, the debug overlay
  util/                 runtime placeholder-texture generation
```
