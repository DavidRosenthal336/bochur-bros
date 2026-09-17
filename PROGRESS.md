# Progress

Running notes on what is built, what is stubbed, and what is known-broken.
See `BOCHUR_BROS_DESIGN.md` for the design this is being built against.

---

## Milestone 1 — The jump ✅

Scaffolded, running, and playable. Mendy runs and jumps around one greybox
test level with a camera that follows him. Nothing else exists yet, by design.

### Built

- **Project** — Phaser 3.90 + TypeScript 7 + Vite 8. `strict` on, no `any`.
- **Fixed-timestep physics** (Arcade, 60Hz, `fixedStep: true`) so the jump arc
  is identical on a 60Hz laptop and a 144Hz monitor.
- **`src/config/Tuning.ts`** — every number that affects feel, in one file.
  Spec-sourced values are marked `[SPEC]`, additions are marked `[ADDED]`.
- **Mendy** — walk/run, acceleration, separate turn-around deceleration,
  variable jump height, coyote time, jump buffering, head-bonk handling,
  terminal velocity.
- **Camera** — lerped follow with a deadzone, clamped to level bounds.
- **`src/levels/`** — level geometry is *data*, not scene code, so the
  Milestone 4 Tiled loader replaces the source and not the consumer.
- **Debug overlay** (F1) — live velocity, grounded/coyote/buffer timers, and a
  measured apex and jump distance in both pixels and tiles. F2 draws hitboxes.

### Measured, in the browser, at the shipped tuning

These came out of an automated pass driving the real game loop, not from theory:

| | |
|---|---|
| Jump apex, held | **70.8 px** (4.4 tiles) |
| Jump apex, tapped | **39.2 px** (2.5 tiles) |
| Walk / run top speed | 160 / 260 px/s (exactly as specced) |
| Running jump distance | **147 px** (9.2 tiles) |
| Widest gap cleared, walking | **5 tiles** |
| Widest gap cleared, running | **9 tiles** |
| Tallest ledge mounted | **4 tiles** (a 5-tile ledge is out of reach) |
| Coyote window | fires 3 frames after leaving a ledge, not 9 |
| Jump buffer | fires on contact when pressed before landing |

### Deviations from the spec, and why

1. **`airControl` and `airDrag` added.** §11's deceleration of 1600 px/s²
   applied in midair scrubs off horizontal speed so fast that jump arcs stop
   being arcs. Air acceleration is scaled to 0.7 and air drag to 0.18 of the
   ground values. Mendy's "better air control" (§4) is now a real number to
   give Berel a worse one.
2. **`turnDeceleration` added** (2600). Pivoting shares a rate with coasting to
   a stop otherwise, and turnarounds feel mushy.
3. **`maxFallSpeed` added** (800). Uncapped falls reach silly speeds.
4. **Phaser 3, not 4.** §3 says Phaser 3 and that is what is installed.
   Phaser 4 is out; if you would rather start there, now is the cheap moment.

### Known conflicts to settle

- **The `S` key is double-booked.** §8 gives `S` to crouch (as part of WASD)
  *and* to swap character. Currently `S` is crouch and swap is `Tab` only.
  Needs a decision before Milestone 3.

### Deliberately not built yet

Enemies, boxes, power-ups, coins, death, lives, goals, sound, touch controls,
Berel, and the swap. All of them belong to later milestones, and every one of
them would make it harder to tell whether the jump itself is right.

### Stubbed

- `BootScene` loads nothing — it is a placeholder for the real preloader.
- Crouch and look-up are read from input but ignored.
- `BEREL` stats exist in `Tuning.ts` but nothing instantiates him.

---

## Milestone 2 — Core loop

Not started.
