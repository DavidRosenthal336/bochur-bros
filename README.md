# Bochur Bros

A 2D side-scrolling platformer. See `BOCHUR_BROS_DESIGN.md` for the design doc.

**Current state: Milestone 1 — the jump.** One character, one greybox test
level, a camera that follows. Nothing else, on purpose.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typechecks, then bundles to `dist/`),
`npm run preview`, `npm run typecheck`.

## Controls

| | |
|---|---|
| Arrows / WASD | Move |
| Space or Z | Jump — hold for height |
| Shift | Run |
| R | Respawn at the start |
| F1 | Toggle the debug readout |
| F2 | Toggle collision boxes |

`X` (action), `Tab` (swap) and `Esc` (pause) are bound but do nothing yet.

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
