# Progress

Running notes on what is built, what is stubbed, and what is known-broken.
See `BOCHUR_BROS_DESIGN.md` for the design this is being built against.

---

## Decisions that supersede the design doc

Playtesting overrules the spec where the two disagree. These are the changes
made so far, in one place so nothing gets quietly lost. The design doc itself
has **not** been edited — say the word and these get folded into it.

1. **Mendy moves on Super Mario Bros.' figures, not §11's.** The starting
   values in §11 produced a character who walked faster than Mario runs
   (160 px/s against Mario's 150), which read as "flying through levels". The
   whole model is now SMB's: 90 px/s walking, 150 running, with a
   speed-dependent jump. Marked `[SMB]` in `src/config/Tuning.ts`. See
   CREDITS.md for why copying these particular numbers is fine.
2. **The variable jump works differently.** §11 says "releasing jump early cuts
   upward velocity by 50%". Mario instead applies *light gravity while the
   button is held* and heavy gravity the moment it is released. That one
   difference is most of what makes a jump feel like Mario's, so it replaces
   the 50% rule.
3. **The run button stays**, at Mario's spacing — a 67% lift, not the 160%
   the spec's numbers implied.
4. **Ducking lets you move**, at about half walking speed. SMB roots you while
   crouched, but the design doc's own obstacles (clotheslines in §6 World 3,
   laundry lines in World 4) are things you duck under *and travel through*.
5. **`S` is still double-booked** in §8 — crouch (via WASD) and swap character.
   `S` is crouch; swap is on `Tab` only. Needs settling before Milestone 3.
6. **The jump climbs faster than SMB's.** SMB takes 0.53s to the apex. At this
   game's camera that read as floating, so the rise is 0.44s while the heights
   stay exactly where they were — 4 tiles standing, 5 running. `riseSeconds` in
   `jumpArc()` is the dial.
7. **Terminal fall speed is 620 px/s, not SMB's ~270.** At 270 the limiter was
   engaging partway down an *ordinary jump* and stretching the descent, which is
   a bug rather than a style. A terminal velocity should only bite on a long
   drop.
8. **The camera shows 20 tiles across, not 24.** The wider view meant the same
   90 px/s walk had half again as much screen to cross, which made everything
   read as slow. `VIEW_WIDTH` / `VIEW_HEIGHT` are the dial.
9. **Dying rebuilds the level.** Reported in playtesting: spend the level's only
   Cholent box, die, and there was no way to get big again, because the scene
   kept its state across a respawn. The level is now rebuilt from its data on
   every death; the coin total and the checkpoint reached are the only things
   carried over.

---

## Milestone 1 — The jump ✅

Scaffolded, running, playable. Project is Phaser 3.90 + TypeScript 7 + Vite 8,
`strict` on, no `any`. Physics run on a fixed 60Hz step so the jump arc is
identical on any display. Every number that affects feel lives in
`src/config/Tuning.ts` and nowhere else.

Built: Mendy's movement, variable jump, coyote time, jump buffering, crouch
with a headroom check, camera follow with a deadzone, a debug overlay (F1) that
reports measured apex and jump distance in tiles, and the Gym — a greybox
calibration range whose stations each measure one property of the jump.

## Milestone 2 — Core loop ✅

The first version that is a game rather than an instrument.

- **Power-up state machine** (`src/systems/PowerState.ts`). The tier-drop rule
  §11 asks to keep in one place is in one place: a hit costs exactly one rung,
  power form → Cholent → Small, and a hit at Small costs a life.
- **Cholent tier** — visibly bigger, takes the extra hit, breaks bricks from
  below. Tier sizes are multipliers on a character's own body, so Berel will
  stay bigger than Mendy at every tier without a second table.
- **Data-driven enemies** (`src/entities/Enemy.ts`, `src/config/enemies.ts`).
  §11 asks for one enemy system with configurable behaviours rather than a class
  per creature, so an enemy is a row in a table. `patrol` and `dive` are
  implemented; `chase`, `emerge` and `thief` land with the worlds that need them.
- **Pigeons** that perch, swoop when you come near, and can be stomped mid-swoop.
- **Mystery boxes and breakable bricks**, hit from underneath, contents driven
  by level data.
- **Tzedakah coins** with a counter.
- **Death and respawn** at the last checkpoint, from a hit at Small or from a
  pit. Checkpoints are frequent, per §7.
- **A goal** at the end of the level.
- **A second greybox level** ("Thirteenth Avenue (greybox)") that teaches the
  loop in order: coins, then boxes, then a pigeon, then a pit that can kill you.
  F3 switches between it and the Gym.

### Verified in the browser, driving the real game loop

Mendy against the figures he is modelled on:

| | measured | Super Mario Bros. |
|---|---|---|
| Walk top speed | **90 px/s** | 90 |
| Run top speed | **150 px/s** | 150 |
| Standing jump height | **4 tiles** | 4 |
| Running jump height | **5 tiles** | 5 |
| Time to the apex | **0.45s** | 0.53 |
| Airtime, standing jump | **0.70s** | 0.86 |
| Widest gap, walking | **3 tiles** | — |
| Widest gap, running | **6 tiles** | — |
| Tallest ledge, walking | **4 tiles** | 4 |
| Tallest ledge, running | **5 tiles** | 5 |

The jump climbs 17% faster than SMB's while reaching exactly the same heights.
The cost is horizontal reach: a shorter airtime covers less ground, so gaps
that used to be clearable at a walk now need a run. `riseSeconds` in
`src/config/Tuning.ts` trades one for the other — 0.44 now, 0.53 for SMB's
exact arc, 0.48 for a middle.

Crouching: Small is 22px standing and 13px ducked; Cholent is 30px and 18px.
The Gym's one-tile tunnel lets Small duck through and turns Cholent away, which
is the trade the bigger tiers are meant to make.

Core loop checks, all passing: every tier drops exactly one rung on a hit and
Small dies; a pickup never demotes you; two hits in the same instant cost one
tier, not two; Cholent breaks bricks and Small cannot; a stomp kills a pigeon
and bounces the player without costing a tier; walking into one costs Cholent a
tier and costs Small a life; falling in a pit kills and returns you to the last
checkpoint; the goal completes the level; and an autopilot that only knows
"walk right, jump at edges" can finish the level start to end.

### Deviations worth knowing about

- **Invulnerability frames after a hit** (1200ms) are not in the design doc.
  Without them a single overlap spans several frames and strips every tier at
  once. [ADDED]
- **Breakable bricks** are not named in Milestone 2's list, but Cholent's
  defining ability in §5 is breaking blocks from below, and it needs something
  to break.

### Deliberately not built yet

- **Cholent's ground-pound stun** (§5: "landing from a height stuns nearby
  enemies"). Milestone 2's list is the tier and the hit rule; this is the next
  thing to add to Cholent.
- **Lives and game over** (§7). Coins count, but the 100-coin extra life is
  Milestone 5 and there is no game-over screen until there is a title screen.
- Menorah, Lulav, Peyos — Milestone 5.
- Berel and the swap — Milestone 3.
- Touch controls — Milestone 7. The build is keyboard-only and says so.

### Stubbed

- `BootScene` loads nothing — a placeholder for the real preloader.
- Looking up (`W` / Up) is read from input and ignored.
- `BEREL` stats exist in `Tuning.ts` but nothing instantiates him.
- Collecting a Cholent while already Cholent is absorbed and does nothing;
  Milestone 5 gives boxes the right contents for the tier you are in.

---

## Milestone 3 — Both characters

Not started.
