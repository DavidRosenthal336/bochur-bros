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

## Milestone 3 — Both characters ✅

- **The swap** (`Tab` or `C`). §11 is explicit that it "swaps the controlled
  entity... Not two entities", so there is exactly one `Player` for the whole
  game and swapping changes which stat block it reads. Position, momentum and
  power-up tier are therefore shared for free, because they were never
  duplicated. Verified: 1 entity in the scene, and x, y, velocity and tier all
  identical across a swap taken at full running speed.
- **Berel**, on the same movement model as Mendy, shifted heavier: 75/120 px/s
  against 90/150, a three-tile standing jump against four.
- **The four abilities from §4**, each with an obstacle built around it:
  reinforced blocks, crates, weak floors and wind.
- **A hazard system** separate from enemies, per §11 — wind acts on a *region*
  and cannot be defeated, only avoided or ignored.
- **"The Chavrusa"**, a greybox level where every lettered station is a wall to
  one brother and a door to the other.

### Verified in the browser: every station gates the right brother

| Station | Mendy | Berel |
|---|---|---|
| B  four-tile wall | **passes** | cannot reach |
| C  six-tile gap | **passes** | cannot reach |
| D  wind corridor | blown back | **walks through** |
| E  crate in a doorway | cannot budge it | **shoves it clear** |
| F  reinforced block | cannot break it, *even as Cholent* (§4) | **breaks it** |
| G  weak floor | cannot pound | **pounds through** |

Measured reach, which is what makes the gating possible:

| | Mendy | Berel |
|---|---|---|
| Widest gap, running | 6 tiles | 5 |
| Tallest ledge, walking | 4 tiles | 3 |

A swap that would leave the larger body inside a wall is **refused** rather
than forced — verified with Cholent Mendy (30px) under a 32px ceiling, where
Cholent Berel (33px) does not fit. Being shoved through a floor is worse than
a swap that does not happen.

### Design notes worth reading

- **The six-tile gap is deliberately survivable.** Six is Berel's exclusion
  point *and* Mendy's exact limit, so requiring it would be a pixel-perfect
  jump. Rather than soften the gate, the gap bottoms out two tiles down and
  both brothers can climb out — a miss costs a walk back, not a life. Mendy
  clears it across roughly a ten-pixel window of take-off timing.
- **Crates are not pushed by Arcade's own push resolution.** Arcade resolves a
  push by sharing momentum, which collapses for a slow pusher: a crouching
  Berel leaning on a crate moved it six pixels in four seconds. Contact is now
  detected by position and the crate is driven directly.
- **Ducking now moves at half speed for both brothers**, because the crate
  doorway and the Gym's tunnel both need you to travel while crouched.

### Stubbed or deferred

- Looking up (`W` / Up) is read and ignored.
- The swap is bound to `Tab` and `C`. §8 says "Tab or S", but `S` is crouch in
  the WASD scheme — this is the conflict flagged in Milestone 1, now settled
  in favour of crouch.
- Cholent's ground-pound stun (§5) is still not built; Berel's ground pound is
  a separate thing and does not stun.
- Wind is the only hazard so far. Falling pipes, sprinklers, mowers and the
  rest arrive with the worlds that need them.

---

## Milestone 4 — Level pipeline ✅

- **Levels are Tiled maps.** `src/levels/maps/*.tmj`, discovered by a glob, so
  §11's "adding a level means adding a file, never editing game code" is
  literally true — drop a `.tmj` in the folder and it is in the game. The three
  greybox levels were converted rather than retyped: they only ever imported
  types, so they compiled standalone and were run through the same exporter,
  which means zero transcription risk.
- **Maps are authored as object layers** (`solids` and `entities`), which needs
  no tileset image while terrain is still rectangles. A tile layer slots in
  alongside when real art arrives.
- **`npm run build:maps`** regenerates maps from `tools/levels/*.mjs`. That
  exists because a staircase or a ladder of widening gaps is clearer as a loop
  than as a hundred hand-placed objects. Once you start editing a map in Tiled,
  stop regenerating it.
- **A world map** showing all sixteen levels from §6 as a journey, with locked
  worlds greyed, a marker for where you are, and the kiddush table filling up.
  Levels that do not exist yet say "not built yet" rather than pretending to be
  locked — the shape of the game should be visible before it is finished.
- **Progression and unlocking**: a level opens when the one before it is
  finished, which makes §6's "beating a boss unlocks the next world" fall out
  for free.
- **Auto-save to `localStorage`** after every completed level and nowhere else
  (§7). Storing what §7 asks for: levels completed, kiddush items, lives,
  coins, character last used. Every failure mode — storage disabled, quota
  full, a save from an older shape — lands on a fresh game rather than an
  exception.
- **1-1 Thirteenth Avenue** and **1-2 The Scaffolding**, built as real levels.

### Verified in the browser

All five maps parse from `.tmj`. Entering 1-1 from the map, finishing it,
returning, and finding 1-2 unlocked all work; the save survives a full page
reload and the marker comes back on 1-2. An autopilot that walks right and
jumps at edges **finishes 1-1** with one death.

The same autopilot fails 1-1 when told to run, and that is worth recording
because it is *not* a level problem: it only jumps once it is already against a
wall, so it runs flat into the awning at tile 38, loses all 150 px/s of
momentum, and never gets it back before the next gap. A person jumps earlier,
and running clears more ground than walking, not less.

### A design constraint worth knowing

**A walking jump clears three tiles, and that is the hard limit.** 1-1 was
originally built with three-tile gaps and the autopilot died on them
repeatedly; they are all two tiles now. Three tiles is a gap to spend
deliberately, with a run-up, not the default spacing. This is the cost of the
snappier jump from the last round, and it is the right trade — but level design
has to respect it.

### Deferred

- 1-3 and 1-4 need the stroller chase and the Pigeon King, which is Milestone 6.
- 1-2's falling pipes and rats are World 1 content and arrive with Milestone 6;
  the climb and the fire escapes are there and waiting for them.
- Awnings are platforms, not bounce pads — bouncing is World 1 terrain (M6).
- Lives are stored in the save but not spent; the 100-coin extra life is M5.

### Playtest fixes after Milestone 4

Three things came back from playing it, and two were real bugs.

**You could get stuck between platforms in 1-2.** Confirmed and fixed. The
climb turned around by clamping to the wall, which stacked two platforms almost
on top of each other and left a six-tile pocket with two tiles of headroom —
enough to walk into, not enough to jump out of. Turning now reverses *before*
stepping, so a turn is an ordinary step sideways. Every roofed stretch in 1-2
is now exactly one tile wide with six tiles of open floor beside it, checked
programmatically rather than by eye.

**You could not see the pigeons coming.** Also real, and worse than it looked:
every pigeon in 1-1 was perched *above the top of the screen*. Standing on the
floor the camera shows from row 14.4 down, and they were on rows 10 to 14 — so
the first you saw of one was it arriving. Three fixes:

- Perches moved into the band you can actually see.
- A **wind-up** before the swoop: the pigeon rears up, flashes, and pulses an
  outline for half a second before committing. §6 already asks for exactly this
  for the falling pipes ("telegraphed, then lethal") and the rule belongs to
  anything that lunges.
- **The camera now leads in the direction you are moving.** Measured: you could
  only see 122px ahead walking and 114px running, so anything reacting to you
  from further away did so off screen. It is 157px now either way, and a pigeon
  triggers at 120px — comfortably inside it. Measured end to end, a pigeon is
  on screen for half a second before it reacts, then telegraphs for another half
  before it moves.

**Hit knockback was throwing you into pits.** Not reported, but it fell out of
moving the pigeons down: at 90 px/s a hit threw you five and a half tiles
backwards, which over a two-tile pit turned "you lost a tier" into "you lost a
life". Down to 45, and no pigeon in 1-1 now perches within six tiles of a pit.

---

## Milestone 5 — Full power-up set ✅

- **Menorah** — throws flames that bounce and roll along the ground (§5), two
  on screen at a time. The cap is what stops it trivialising a level.
- **Lulav** — a short melee arc that kills outright and throws the body
  sideways. No ammo, but you have to be next to the thing.
- **Peyos** — hold jump after the top of a jump and keep climbing. Limited per
  takeoff, refills the instant you land, so the limit is a per-hop budget
  rather than a resource to hoard. The hat lifts off and hovers above him (§5).
- **Cholent's landing stun** (§5), which had been outstanding since Milestone 2:
  land hard enough as Cholent and everything nearby is stunned.
- **L'chaim 1-ups** and the **100-coin extra life**, with lives shown in the HUD,
  carried across deaths, and saved.
- **Game over** at zero lives, which hands you back to the world map.
- **"The Beis Medrash"**, a greybox range with one station per form and
  something to use each on.

### Verified in the browser

| | |
|---|---|
| Menorah | four of five pigeons killed at range; never more than 2 flames |
| Lulav | kills a pigeon beside you, nothing 70px away |
| Peyos | holding jump reaches **10 tiles** against 3.8 without flight |
| Flight refill | back to the full 1400ms the moment you land |
| 100 coins | +1 life, counter carries the remainder |
| Game over | lives reach 0, and the map is one keypress away |
| Cholent stun | a hard landing beside a pigeon stuns it |

**A real bug, found by measuring:** Peyos flight engaged correctly but he still
sank, because gravity was left on. At ~2000 px/s² it added more downward speed
per frame than the thrust removed, so "flight" flew him into the floor. Gravity
now comes off entirely while flying.

### First art is in

**Mendy's Small form is drawn** — idle, a three-frame run, jump, fall, crouch
and hurt. `src/config/sprites.ts` is a registry of which forms have art; the
player uses a sprite where one exists and a rectangle everywhere else, so the
remaining nineteen sets can land one at a time.

Fixing that up surfaced another real bug: the constructor sized the hitbox by
hand instead of going through the normal sizing path, so with a frame larger
than the hitbox the body sat six pixels above the sprite's feet — he was drawn
sunk into the floor, and the first crouch misbehaved.

See `ART_SPEC.md` for the grid, every hitbox, and how to add the next form.

### Playtest fixes after Milestone 5

**Stuck between the awnings in 1-1.** The same class of bug as 1-2's climb, and
that is the part worth recording: it was built with `ledge()`, which makes a
block solid all the way down to the floor, so three awnings became three
pillars with two-tile slots between them — walled five and seven tiles high,
which no jump clears from a standstill. They are one-tile platforms now, which
is also what §6 describes: something you land on, not a pillar.

**This bug has now shipped twice, so it is a build error rather than a habit.**
`tools/validate-level.mjs` reads a level's geometry, finds every horizontal run
of floor, and asks whether you could leave it — by walking off an end, by
mounting the shorter of the two walls, or by jumping onto something above.
Anything you could get into and not out of fails the build. It runs on every
`npm run build:maps` and `npm run build`, and `npm run check:maps` checks the
hand-edited maps too.

Pointed at the existing levels it immediately found the awning trap *and* one
in the Gym: the height-ladder pillars were three tiles apart with five-tile
walls, so falling between the two tallest wedged you. Respaced to four pillars
nine apart. All six maps now pass.

**Cholent reverting to a box** is expected, not a bug — only Mendy Small is
drawn so far, and everything else falls back to a placeholder. Placeholders now
carry a darker edge so they read as a deliberate stand-in rather than as art
that failed to load, and `ART_SPEC.md` names Cholent as the next form to draw:
it is the first power-up in the game, so it is the most visible gap.

---

## Milestone 6 — World 1 complete

Four levels, a boss, and the art.

### The levels

**1-3, The Stroller** — the chase. The screen scrolls on by itself at 86 px/s,
slightly under a walking pace, so standing still loses ground; the stroller
comes from behind and never tires; there is a clock. The design rule here is
that the route is never ambiguous, because at this speed there is no time to
read a fork — so there isn't one. Everything is a straight run with things to
clear.

**1-4, The Pigeon King** — "an enormous, grimy pigeon atop the scaffolding.
Summons flocks of pigeons, dive-bombs in arcs, and retreats to high perches
between attacks" (§6). Three hits, three phases, each faster than the last. He
is only vulnerable while he is down among you, which makes the fight about
waiting for the dive rather than chasing him.

### New systems

**Hazards that move** (`MovingHazard`) — one class, four behaviours from the
config table, for the same reason the enemies are one class:

- `faller` — the scaffolding pipe. A shadow appears on the pavement, then it
  drops. The shadow is the entire fairness of it.
- `roller` — the shopping cart. Rolls fast; stand on top and ride it.
- `lurcher` — the double-parked van. Sits still, then lunges with no warning.
- `chaser` — the stroller.

**Bosses** (`Boss`, `src/config/bosses.ts`) — a third category beside enemies
and hazards: real health, named phases, and a script rather than a behaviour.
Kept in a table so World 4's Yetzer Hara, who "cycles through the forms of every
boss already beaten" (§6), can be built by referring to these rows rather than
by reimplementing three fights.

**Riding, bounce pads, and the level clock**, all driven from the level data.

---

### The art

The full World 1 art package arrived and went in: both brothers in all five
forms, the pigeons, the rats, the Pigeon King, the cart, the scaffolding pipe,
the stroller, coins, boxes, crates, flames, the loose hat, and a nine-tile
Boro Park tileset. Twenty-five sheets, all original, all generated from text
grids in `tools/art/generate.py`.

`src/config/sprites.ts` grew from a player-forms registry into the registry for
everything drawn: character sheets, actor sheets with free-form named poses, and
the tile textures. Enemies, hazards and bosses name their sheet with one `art:`
field in their config row, and `src/util/art.ts` insets the hitbox into the
frame in exactly one place — the thing that goes silently wrong otherwise.

Solids are tiled now: a surface row you can land on and a fill beneath it,
sidewalk over asphalt for ground and plank over brick for platforms. The tile
grid that used to be drawn behind every level is an instrument, so it is now
drawn only in the greybox test levels; real levels get a brick facade scrolling
at a third of camera speed behind them instead.

**`npm run check:art`** fails the build if a sheet on disk stops matching the
frame sizes `sprites.ts` slices it by. The frame size is load-bearing — get it
wrong and the game shows the wrong half of every frame, forever, quietly — so
it is a build error rather than a thing to remember.

### Bugs the art pass turned up

Wiring the art meant looking at every entity in a browser, which found four
real bugs that had nothing to do with art:

**Carts and the stroller fell through the pavement.** Arcade skips separation
entirely when *both* bodies in a collision are immovable, and every solid in a
level is a static body, which counts as immovable. So `setImmovable(true)` on a
hazard — reached for so the player could not shove it — meant it simply fell
out of the world. `pushable = false` gets the intent without the side effect.

**The Pigeon King never flapped.** His perched phase returned early out of
`tick`, which skipped the pose update at the bottom, so the wings-out summon
drawing never appeared — he was calling flocks of pigeons down without once
moving his wings. There are no early returns in that method any more, and the
comment says why.

**1-3 killed you before you could press anything.** The stroller started one
tile behind a spawn point two tiles in, which put its hitbox on top of you: at
104 px/s you had about a quarter of a second. It starts nine tiles back now,
which is about a second of head start — the difference between a chase and an
ambush.

**The pipes never fell.** Fixing the cart made hazards collide with solids for
the first time, and a pipe resting on the scaffolding it deliberately overlaps
came up `blocked.down` before it had fallen anywhere. A faller does not collide
with level geometry at all now; it stops at the ground row it is told about, and
snaps flush to it, because at 520 px/s one frame is nine pixels of hovering.

Also removed: the Menorah flame's scale pulse, which was breathing its hitbox in
and out thirty times a second, since Arcade multiplies a body's size by its
sprite's scale. The two drawn flame frames do the flicker properly.

### What is still a rectangle

The goal marker, checkpoints, the van, the Lulav swing, the world map and the
HUD. `ART_SPEC.md` lists all of it, worst gap first — the backdrop being the
one that would change the look of the whole game.

---

## Sockets for the scenery

The scenery package — backdrops, level furniture, the world map and HUD icons —
has a README but the PNGs have not arrived yet. The second zip was byte-for-byte
the first one. Rather than wait, the slots for all of it are in and verified.

**`available-art`** (a Vite plugin) hands the game the real listing of what is
in `public/` at build time. Phaser cannot ask whether a file exists — it can
only fetch and fail — so without this, listing art that has not been drawn means
a 404 for every piece of it. With it, the game asks for exactly what is there,
and *dropping a PNG into `public/` is the entire integration step*: no code
change, no registry edit, and the plugin watches the directory so not even a
dev-server restart. Both directions are tested: adding a file makes it appear in
the listing, removing one takes it away.

**`src/config/scenery.ts`** registers the backdrop layers, the level furniture
and the interface art with their file names and frame sizes. `sceneryArt()`
returns the sheet or `undefined`, and `undefined` means whatever was drawing a
rectangle carries on drawing one. The goal, the checkpoints, the reinforced and
weak blocks and the van all go through it; the van also gets a row in the actor
registry, so it is a hazard with a hitbox rather than scenery.

**The backdrop is three parallax layers now** — sky, skyline, street — each a
tiling sprite pinned to the camera, scrolled horizontally by moving the texture
and vertically by moving the sprite, because a skyline tiles left to right but
not top to bottom. A level names its time of day (`day`, `dusk`, `night`) and it
round-trips through Tiled like any other level property: 1-1 and 1-2 day, 1-3
dusk, 1-4 night, since World 1 ends at a kiddush. Until the layers exist it
falls back to the single tinted brick wall.

`npm run check:art` now covers the scenery registry as well, and holds backdrop
layers to 320px wide — anything else seams once per screen, forever.

### Verified against stand-ins, then thrown away

The three-layer code was tested against a generated stand-in set (flat gradients
and rectangles), which is the only way to know the depth sorting, the scroll
ratios and the tall-sky switch actually work. The stand-ins were deleted
afterwards: inventing the art direction is not this session's job. Two things
the test established that are now in `ART_SPEC.md` as requirements:

- A layer must be **opaque to the bottom of its frame**. Layers slide down as
  the camera climbs, so transparency along the base becomes a visible cut in a
  level like 1-2.
- The **tall sky** is for levels whose camera can travel more than two screens
  upward, which is 1-2 and nothing else. The first cut of that test used the
  level's bounding box and picked the tall sky for every level in the game.

### Two more real bugs

**A boss survived into the next level.** Phaser reuses the scene instance across
`scene.start`, and `buildBoss` only ever *assigned* `this.boss` — it never
cleared it. Beat 1-4, go back to the map, start 1-1, and the scene goes on
ticking a Pigeon King whose body has been destroyed: `Cannot read properties of
undefined`. The parallax layers and the hazard you were riding had the same
hole. All three are cleared on build now.

**The greybox levels were getting a backdrop.** Same root cause: the backdrop
list was built only for real levels, so a greybox level inherited whatever the
last real level left behind.

---

## World 1 art complete

The scenery pack landed and went in: twelve backdrop layers, the meat board, the
pushke checkpoints, the van, the reinforced and weak blocks, and the interface
art. **56 of 56 pieces the game knows how to draw are now drawn.** Every file
matched the sizes `ART_SPEC.md` asked for on the first try, including the one
requirement that came out of testing against stand-ins — every backdrop layer is
opaque along its bottom row.

Dropping the files into `public/` was the whole integration, exactly as the
sockets promised; the running dev server picked all twelve layers up without a
restart. `tools/art/scenery.py` regenerates all 22 files byte-identically, so
the art is genuinely source rather than binaries that happen to be in the repo.

### The backdrop had to be anchored to the pavement, not the screen

First pass put each layer's base at the bottom of the view, which is where the
stand-ins had been built for. With the real art that buried the whole shopfront
band — awnings, doorways, everything below the buildings — under the road
surface, because the game's pavement sits about halfway up the screen, not at
the bottom of it.

Layers are now lined up so their base meets the pavement, and lag behind by
their scroll fraction as the camera strays from that position. The shopfronts
sit on the street where they were drawn to, and still slide correctly through
the climb in 1-2.

### Signage had to be rewritten to survive the backdrop

The in-world labels were muted blue-grey on a flat background. Against lit
windows and fire escapes they vanished. They are near-white with a hard shadow
now — a readability regression the art caused, and the sort of thing that only
shows up once the thing behind the text is finished.

### The HUD and the world map

The HUD is icon-and-number rows now — clock, life, tzedakah — with the clock row
closed up on the levels that have no timer. The number sits immediately after
its icon rather than right-aligned to the edge, because a right-aligned number
drifts away from its own icon as the count shrinks.

The world map is drawn nodes (locked / open / cleared) joined by a path of dots,
and the kiddush table with the four prizes laid along it — the meat board
recovered, the other three as dashed outlines. The table is the player's
progress bar and should be the first thing they look at, so it replaced the row
of labelled boxes.

The one tint applied over the artist's work: the empty prize slots are drawn in
the palette's near-black, for a table with a solid top. This table's interior is
open, so on the map's dark background they were invisible. They are lifted to a
slate blue.

### Still a rectangle

The Lulav swing arc, the wind streaks, the pipe's shadow and the boss health
bar — all effects drawn in code rather than missing sheets. And `van.png` is in
and wired but no level places a van yet: that needs a stretch of street designed
around climbing one, which is level design rather than art.

---

## Playtest fixes after the art landed

Two reports: the checkpoint in 1-3 not sticking, and Mendy getting stuck in 1-2
"when he hits a side wall". The first turned out to be three bugs stacked on
each other, and two of them had nothing to do with checkpoints.

### 1-3 restarted from the beginning, with the checkpoint working perfectly

`autoScrollX` was reset to zero on every life. In a level scrolled by a clock
rather than by the player, that put the camera back at the start of the level
while the player stood at the checkpoint a thousand pixels off the right-hand
edge, waiting for the screen to arrive. The checkpoint was doing its job and
looked completely broken.

The scroll now resumes at the checkpoint, a quarter of a screen in from the
left, which is where the chase has you at the level's own start — and only on a
resumed life, so a first attempt still opens where the level was designed to
open.

The stroller had the same problem from the other direction: it was rebuilt at
the position it was *placed*, a thousand pixels behind, so every restart handed
you a free run. A chaser is now offset by however far into the level the life
began, because "just behind you" is a fact about the player, not about the map.

### Dying took the level's identity with it

`restartFromCheckpoint` did not pass `levelId` through. Everything keyed off it
quietly stopped working after a single death: the 1-3 clock disappeared, and —
much worse — **finishing the level no longer recorded completion or unlocked
the next one.** Die once in 1-1, walk to the goal, and 1-2 stayed locked.

Found by checking what the restart actually carried while verifying the
checkpoint fix, not by looking for it. Both restart paths now carry the
level's identity, and the test walks 1-1 to its goal with and without a death
and reads the save back both times.

### 1-2: a block nobody could stand on

The level validator now knows about blocks, which are static bodies the player
collides with and therefore terrain. It found the peyos box tucked one tile
under an overhang: sixteen pixels of clearance on top of it, against a shortest
character of twenty-two. Anything that reached the top of it was shoved back
out — a hundred and fifteen pixels sideways, when measured.

The check is not "low ceilings are wrong". The greybox gym has two on purpose,
because ducking through a low gap is a mechanic and crouched is thirteen pixels.
What makes one wrong is arriving at it any way but crouched, and the geometry
that decides it is whether the low stretch connects sideways to somewhere you
can stand up. A crouch tunnel does; a block under an overhang does not. With
that rule the validator flags exactly one spot across all eight maps, and it is
the box. Moved up a row; it is still hit from the landing below.

**Honest limit:** this is a real defect and it is fixed, but it was never
reproduced as a hard freeze. Jumping into the box from the platform below bonks
and falls, every time, across a spread of approach speeds and jump heights. So
it may not be the thing that was reported. If it happens again, where on the
climb it happened would narrow it down a long way.

### Two test harnesses that lied

Worth recording, because both wasted more time than the bugs did.

A stuck detector that compares the first and last frame of a window reports a
jump loop as frozen: leave and come back and the endpoints match. It has to
measure the range across the whole window.

And driving Arcade by hand to run faster than real time needs
`world.singleStep()`. `world.step(delta)` and `world.update(time, delta)` both
return without doing anything, so the player never moves and every case looks
like a bug. A harness gets a positive control now — make the player fall, check
he fell — before anything it reports is believed.

## World 2, level 3 — the water

2-3 is the first level in the game whose floor is not the point, and building
it meant building a way to move that the engine did not have. The rules it
settled on, and the measurements behind them.

### A stroke is not a small jump

A jump in this game is one decision taken at takeoff and lived with — the
bracket is chosen from your speed at the moment you leave the ground and holds
for the whole arc, and holding the button lowers gravity rather than adding
force. Swimming had to be the opposite of that or the water would feel like a
level with the numbers turned down. So under water there are no brackets and no
held-button gravity: a press gives a fixed upward shove, and the way up is to
keep asking for it. Gravity is 420 against roughly 1850 dry, and you sink at 90.

The stroke itself is a fraction of each character's own standing jump rather
than a number of its own, which keeps §4's height difference alive under water.
Measured, from the bottom of a six-tile pool: **Mendy 36px a stroke, Berel 22px.**
Mendy is the swimmer. Berel walks along the bottom, which has its own uses,
two of which are grey blocks.

### The surface is not a ceiling

The first working version of the swim code had no way out of a pool. A stroke
is worth about 180 px/s, and 180 px/s in air against a fall gravity of 1850 is
eight pixels — so the water's edge was a lid you could see the deck over and
never reach.

The rule that fixes it: **within a tile of the surface, with open sky over your
head, a stroke is not a stroke, it is an ordinary jump** — same bracket, same
held-button gravity, same height as climbing onto anything else. The "open sky"
half of that is not decoration. Under a pool cover the same test would launch
you into the underside of it forever, so the check is for a solid six pixels
above the head and the answer decides which of the two you get.

### Currents have no interesting middle

Horizontal movement here is a velocity approached at a rate, not a force
summed against other forces. The consequence is sharp: a current weaker than
your acceleration does **nothing at all**, and one stronger than it is a wall
with no door. There is no "hard but possible" to tune towards, which is the
same shape as the leaf blower that had to come down from 560 to 300 in 2-2.

So the level never asks anyone to swim head-on into a current. Every band in
2-3 is something you ride, something you fall through, or something you go over
the top of, and **no band fills the column it is in** — there is always clear
water above or below it. The one place that rule was broken by accident, a
four-row band in a seven-row pool, cost a test run a full minute pinned against
the bottom being pushed backwards. Three rows of band and three clear.

Swim acceleration still comes from the character (1.5× their walking figure, so
Mendy 200 and Berel 165), because recovering from a current faster is a real
difference even when fighting one is not on the menu.

### A jet has to beat gravity before it lifts anything

The first filter jet was set to 380, the sideways figure plus a bit. It lifted a
body off the bottom of the pool by half a pixel and put it back, because what
reaches the player is the difference between the jet and `SWIM.gravity` at 420.
At 760 a jet carries you from the floor of the deepest pool in the level to the
surface, and that is the default now.

### Water is drawn behind the solids, not over them

Water went in at depth 1.5, above the terrain's 0 and 1, which meant every
shelf and every pool floor inside it was invisible — 2-3 shipped its first
screenshot with a ledge in the middle of the deep end that nothing could see.
It sits at -0.6 now, behind the terrain and in front of the sky, with a second
nearly transparent pane at depth 12 that tints whatever is under the surface,
including the player. There is a `pool` solid kind as well, so the bottom of a
swimming pool is pool tile and not lawn.

### A dead end has to be somewhere you can stand still

§6 asks for "a pool cover to swim beneath", and a cover at the water's surface
is only a cover if you cannot walk along it. The first two attempts put a fence
where the water meets the lid, and both produced the same thing when played: a
wall at the waterline. You surface, the stroke throws you at it, you fall back,
you surface again, and none of it is legible because you never stop moving. A
test run spent forty seconds in that cycle without ever going under.

The shape that works is a walkway with a hole in it. You step off the deck onto
the lid, walk six tiles, the lid stops, and six tiles of open water is past any
jump in the game. The far stretch of lid has its fence one tile back from its
edge — so if you do climb out on that side you land on a board, stand still,
and look at a fence, which is a thing a person can read and then step off
backwards from. One tile of difference between a dead end and a trap.

### What the validator had to be told

Water changes what the rest of the geometry checks mean. A pool is a pit you do
not have to jump; a pool floor is a surface you do not have to stand up on; a
basin walled on both sides is somewhere you leave by swimming. All three checks
now ask whether a tile is wet first, and `check-maps.mjs` had to learn to read
the water objects back out of the `.tmj` — it builds its own level definition
from the map file, so for one run 2-3 passed at build time and failed the
standalone check with eleven traps that were all just the pool.

### Verified

Both brothers, start to goal, driving the real game: **Mendy 44s, Berel 53s**
over 330 tiles with six pools in them. Dry physics re-measured on 1-1 and
unchanged — Mendy's standing jump 61.6px, run 150 px/s, and `isSwimming` never
true on a level with no water in it.

The traversal bot needed four rewrites before its results were worth anything,
and every one of its failures was the same mistake in a different coat:
stroking the moment it started sinking, so it never went down; diving again the
moment a stroke cleared the floor, so it never came up; and testing "am I
sinking" while resting on the bottom, where the velocity is zero and the answer
is no. Diving and climbing are commitments that have to hold for a couple of
seconds. That is true of the bot and it is true of the player.

## The mobile version

§3 calls phone play "a first-class requirement, not an afterthought" and §8
spells out what that means: "on-screen left/right buttons, jump button, action
button, swap button. Large hit areas, positioned for thumbs, semi-transparent."
Here is what it took, and the two places the obvious answer was wrong.

### The buttons are HTML, not sprites

Everything else the game draws lives in a 320x180 canvas that is scaled to fill
whatever window it is given. Controls drawn in there would be scaled with it —
the size of the jump button would depend on the aspect ratio of the phone, and
a thumb would land somewhere different in the level depending on how the canvas
happened to be letterboxed. Elements in the page are the opposite: sized in
real millimetres, outside the game's coordinate space entirely, hit-tested by
the browser. They also load before Phaser does, so a phone never sees a frame
of this game without its controls on it.

The whole contract between the page and the code is one attribute. `TouchInput`
finds the button under a finger by asking the document what is at that point,
which is also what lets a thumb slide from left to right without lifting — the
browser sends a touch's events to the element it started on, so listening per
button would have left you pressing left until you let go.

### Two buttons §8 does not list

**Down**, because §4 gives Berel a ground pound on "Down, in mid-air", §5 gives
everyone a crouch, and 2-3 swims downward with it.

**Run**, and this one is not a convenience. The leaf blowers in 2-2 push at 300
px/s² against Mendy's walking acceleration of 133 and his running acceleration
of 323. Walking into one, he goes *backwards*. A control scheme without a run
button has a corridor in World 2 that a phone cannot cross at all.

### Keyboard and thumbs, not keyboard or thumbs

`CombinedInput` reads both every frame and merges them. Deciding which one a
player owns from a media query is exactly the sort of guess that leaves
somebody unable to play — a tablet with a case keyboard is both, and so is a
touchscreen laptop. A device with no keyboard simply contributes nothing from
it. The on-screen deck appears on a coarse-pointer device at load and on
anything else the first time a finger actually touches the screen, so a
touchscreen laptop gets a keyboard game until somebody reaches for it.

### Portrait is not landscape with less room

The first portrait layout gave the game 58% of the screen height and the
controls the rest. It looked broken, and the reason is arithmetic: a 320x180
canvas across the full width of a phone is a strip 56.25% of that width tall,
and no amount of box around it changes that. Handing it 58% of an 844-point
screen just put a 219-point picture in the middle of a 489-point box with dead
space above it as well as below.

So portrait sizes `#game` to the strip exactly — picture at the very top, out
from under the hands, controls at the very bottom where thumbs already are, and
the leftover space in the middle where it belongs. Landscape has no leftover
space, so there the pads float over the bottom corners at the transparency §8
asks for, out where the picture is pavement and sky.

`Scale.FIT` watches the window, which is enough on a desktop and not enough
here: the first touch resizes `#game` without the window changing at all, and
so does a phone's address bar sliding away. A `ResizeObserver` on the canvas's
box re-fits for both.

### Three sizing mistakes, all found by measuring

Six buttons across a 390-point phone do not fit. Two clusters of three
thumb-sized targets plus their margins came to more than the screen was wide,
and the pair that overlapped was DOWN and FORM — so the left cluster became a
d-pad shape, down as a bar over left and right, which is 138 points instead of
236 and reads better anyway.

`#touch button { width: 72px }` inside the portrait block also caught the MAP
button in the corner and blew it up to seventy-two points square. Scoped to
`.pad button` now.

And the map screen's PLAY and STORY buttons were first placed in the band that
holds the level description, which made the one line of text that says what you
are about to play unreadable. They live in the margins beside the kiddush
table, which is the only part of that screen that is actually empty.

### Verified

Driven as a phone — real touch events, no mouse — at seven screen sizes from a
375-point iPhone SE to an iPad in both orientations: no button overlapping
another, nothing off the edge, nothing under 32 points, and in portrait nothing
over the canvas at all.

Playing, on a phone in landscape: RIGHT walks at 90, RIGHT and RUN together at
150 (two fingers at once), JUMP held gives 61.6px against 34.6px tapped, so
variable jump height survives a button; SWAP swaps; DOWN crouches and, in
mid-air as Berel, ground pounds; six taps of JUMP lift him from the bottom of
2-3's shallow end and out through the surface. A thumb slid from LEFT to RIGHT
without lifting ends up going right. Losing a touch off the edge of the window
leaves him standing still rather than running forever.

And the desktop is untouched: no deck, the key table still shown, walk 90, run
150, jump 61.6px, and the headless test rigs — which replace `scene.controls`
wholesale with an object that has `update` and `current` and nothing else —
still drive a level from start to finish. That last one is why the hint text
asks the shared controls whether a phone is in play rather than reaching
through `this.controls` for it.

## The stuck button

Reported from a real phone, which is where this was always going to be found:
pressing forward and letting go left him walking.

### Why the first design could stick at all

It tracked each touch in a map — a pointer went in on `pointerdown`, moved
between buttons on `pointermove`, came out on `pointerup`. A design like that
can only ever be corrected by an event it is still expecting, and there are
real ways to miss one. A browser that decides a touch was the start of a scroll
takes the gesture and stops sending. A second finger can turn the first into a
pinch candidate. A touch that ends while the page is being backgrounded may
report nothing at all. Miss the release and the entry sits in the map forever.

It had a second hole in the same place, pointing the other way. `pointermove`
began `if (!this.pointers.has(event.pointerId)) return;` — so a thumb that
jittered a pixel into the gap between two buttons was deleted from the map, and
when it jittered back onto the button the handler returned early and the button
was dead until the finger lifted. One bug made the character run forever and
the other made the button stop answering, and both would be reported as "it
gets stuck".

### What replaced it

Every touch event — `touchstart`, `touchmove`, `touchend`, `touchcancel` —
carries `event.touches`: **every finger on the glass at that moment**, not a
delta. So the held set is thrown away and rebuilt from that list on each one.

A finger that lifted is not in the list, so it cannot be held. A finger that
slid off a button and back is resolved fresh against where it is now, so it
cannot go dead. An event that never arrives is repaired by the next one,
whatever it is. There is no accounting to get out of step, because there is no
accounting. Mouse and stylus keep the tracked shape, because there is only ever
one of them and its events are not the ones that go missing.

The listeners are also non-passive now and call `preventDefault` on a touch
that lands on a button, so the browser never gets the chance to decide the
press was a scroll — which is the thing that makes it stop sending events in
the first place.

### Tested with real touches this time

The first round of testing used synthetic `PointerEvent`s dispatched from
JavaScript, which is not the same thing at all and is why this shipped. These
go through the browser's own touch pipeline, over CDP: press and hold and lift;
two fingers with only one lifted; a thumb slid off a button and back on; a
touch cancelled mid-hold; the window losing focus mid-hold. All of them end
with nothing held and nothing lit, and the one that used to go dead now keeps
working.

One case cannot be tested here and is worth naming: a release that is never
reported at all. The browser maintains its own touch state, so CDP will not let
a `touchend` be dropped. That case is handled by construction rather than by
test — the next event of any kind rebuilds the set from scratch.

## The whole screen

Asked for, and the honest answer has three parts.

**Inside an artifact panel there is no way to get it.** The game is in an
iframe, and an iframe cannot go fullscreen unless the page holding it allows
that. There is now a FULL button next to MAP that calls the Fullscreen API,
shown only where `document.fullscreenEnabled` says it will be granted — which
is desktop, Android, and an iPad, and is not an iPhone: Safari there does not
implement the API on the phone at all.

**A page of its own is the answer.** At its own address the game is the
top-level document, so fullscreen works where the browser has it — and, better
than that, it can be added to a phone's home screen and launched with no
browser around it whatsoever. That is a genuinely full screen on an iPhone and
it is the only one.

So the metadata for it is in place now rather than later: the Apple web-app
meta tags, a manifest asking for `display: fullscreen` in landscape, and an
icon generated from frame 0 of Mendy's idle sheet at 32, 180, 192 and 512
(`npm run art:icon`). A phone that is not given an icon uses a screenshot of
the page, which for this game would be a screenshot of a start card.

Deploying it is a decision for the person whose game it is, not something to do
because it would be convenient, so it is offered rather than done.

## Run is a latch

Asked for, and right: "just click run and then it stays running until you click
it again, so that you don't have to hold two things at once."

Holding it is what a controller does, because a controller has a shoulder
button for it. On a phone it means pinning one thumb on the far side of the
screen from the one that is steering, for the whole level — and the two things
run changes, top speed and how far a jump carries, are exactly the things you
want while that thumb is busy. So it stays on until it is turned off.

That changes where the button belongs, twice over. It is about how you are
moving, which is the steering thumb's business, so it moved to the left cluster
as a bar over the d-pad. And an accidental brush is no longer half a second of
sprinting, it is a mode flip — so it cannot sit directly above JUMP, which is
the button a thumb reaches for in a hurry. JUMP now stands alone.

A latch has to say which way it is set while nothing is touching it, so it has
a second state beyond the pressed highlight: lit solid blue for on. The pressed
highlight means "your thumb is here" and lasts a moment; this one stays.

The keyboard is untouched. Shift is still a hold, and the two are OR'd, so
Shift still runs whatever the latch says.

Verified: RIGHT alone walks at 90 with the latch off and runs at 150 with it
on, one thumb either way; the latch survives letting go, dying and restarting;
a running jump still carries 85px; and Shift still runs with the latch off.

## Deployed

`bochur-bros.vercel.app` equivalent, built from this repo on every push to the
working branch — Vercel pulls the branch, runs `npm run build` and serves
`dist/`. That is the standalone page, not the flattened artifact copy: the
artifact build strips the `<head>` because its host supplies one, and a phone
without a viewport meta lays the page out at 980 points and scales it down.

Vercel Authentication was on by default, which would have put a login in front
of the URL. Turned off deliberately: the link is public now, which is what a
link you can open on a phone means.

## 2-4 — The Escalade, and World 2 is finished

§6's own emphasis: **"the player fights the vehicle, never the driver."** She
is never harmed, never stomped, and never once acknowledges that any of this is
happening. That is enforced by construction rather than by being careful —
nothing in `Escalade.ts` knows she is there. She is drawn into the sheet, she
has no hitbox, and the damage is a dent in a roof.

### It needed its own class, not a bigger `BossConfig`

Every field of the Pigeon King's row describes a bird: perches, dive speed,
sweep height, hover. Reusing the shape would have produced a table where two
thirds of each row was ignored. A boss is "real health, named phases, and a
script"; the script is the part that differs, so it got its own row type.

### The roof is the answer, which is the whole point

§6 says of this world's minivans that "the player must climb the thing trying
to kill them". The game has been teaching it since the shopping cart in 1-1 and
four vans nose to tail in 2-1. Here it is the exam: the roof is solid at any
speed, and riding it into the hydrant leaves you already standing where the
dent goes. So the hitbox is the drawn height rather than something shorter — a
shorter one would let a running jump clear the whole car, which is an easier
answer than the one the fight is about.

The stoops at either end are the other answer. Three tiles up, butted onto the
hydrants, outside the lane. They get you through a charge and nothing more.

### Four things found by playing it

**A goose is not scenery.** The first arena had one on each stoop, because §6
has geese scattering in phase 2. §6 also says they "hiss, chase on foot,
relentless, don't scare off" — so the near one walked to the spawn point and
killed the player five times before the Escalade had moved at all. Game over in
a boss arena without a fight. The geese are a visual event now: four with no
bodies that run off the screen when phase 2 opens. 1-4 is empty for the same
reason. A boss arena should contain the boss.

**The far stoop was one tile clear of its hydrant**, and that tile was the
fight. A player on the stoop is four pixels above the crashed roof and twenty
across — you step onto it. With a gap, that step became a jump over a hole,
next to a car, on a clock.

**"PRESS DOWN" is not an instruction that works.** A ground pound happens in
mid-air (§4) — `updateGroundPound` returns immediately if you are grounded — so
a player stood on the roof pressing down gets nothing at all. It took watching
a bot fail the fight fourteen times in seventy seconds to see that the hint I
had written was incomplete. It says JUMP, THEN DOWN now, in the level's sign
and in the hint that appears over your head when you are up there as Mendy.

**The crash has to throw you off, and then the car has to settle.** Riding is
the best line and should stay that way, but without a jolt the first dent won
the whole fight: you were already standing on the roof for every stall after
it, phase 3's included. A stomp's bounce was worth eighteen pixels and you came
straight back down. Forty-eight and a shove forward puts you on the stoop —
except that then the throw put you airborne directly over an already-vulnerable
car and the pound landed on the next frame, which was worse. So the stall takes
420ms to settle before a dent will take. With both, the fight went from 21
seconds to 30, and phase 3 went from four seconds to ten.

### Verified

Driving the real fight: three dents through all three phases, no damage taken,
prize collected, level complete, in 30 seconds. The Pigeon King re-checked on
the shared prize drop that this work pulled out of `onBossDefeated` — both
bosses drop something that can be picked up and ends the level.

World 2 is complete: Central Avenue, Backyards, The Pool and The Escalade.


---

## World 3 — The Catskills: 3-1, The Colony

§6 changes the shape of the game in one line: "bungalow roofs as the main
platforming route, with gaps between them". Boro Park was a street and The Five
Towns was the gardens behind one, and both were level — the ground ran the
length of them and everything interesting sat on top of it. Here the route is
the roofs and the lawn is where you end up when you miss.

### Four new things

**The clothesline** has no physics body at all, and that is the interesting
decision in it. A body you can stand on is a platform, which kills "or duck
under them"; a body you cannot stand on reports overlaps for anybody walking
past its post. What a rope needs to know is whether a pair of feet came down
*through* it, which is a question about the two rows the feet were on either
side of this frame rather than about volumes touching — and asking it that way
makes both halves of §6's sentence the same rule. Measured at 195px/s, 171px in
0.9s, identical for both brothers, and walking underneath never catches.

**The rotting porch step** is solid, then a 420ms fuse, then gone for 2.6s. The
beat is the whole mechanic: a tile that vanishes on contact is a hole that lies
about being a floor, and there is no skill in it, because the information
arrives after you are already falling. Measured 583ms from landing to falling
through, back 2.5s later.

**The raccoon** is §11's fifth behaviour kind and the only enemy in the game
that takes something other than health. `PowerState.steal()` is a tier and no
invulnerability — a hit earns immunity because a hit is one frame of a collision
that will still be happening on the next four, while a theft happens once by
construction, since the thief is carrying the thing afterwards. A Small player
loses nothing at all: §6 describes the raccoon entirely as a thief and never as
a danger, and a thief that kills you when your pockets are empty is a different
animal. Verified end to end: robbed at 0.3s, chased down, pot back on the grass
at 2.8s.

**The golf cart and the wasp** came free, which is what §11 asked for — a roller
and a diver with no gravity and a three-tile trigger, both config rows and no
new code.

### Three bugs, and one rule that caused two of them

**Bungalows cannot be solid.** Built from shingle to lawn — which is what a
bungalow looks like — eight of them made eight canyons, and the two-tile alley
between two was six deep with six-tile walls either side. Walk in and you live
there. The trap validator threw out the whole level. A bungalow is a two-tile
roof with open air under it now, and only the porch reaches the ground.

**A roller only turns at a wall, and a lawn has none.** The first golf cart
drove the length of the level and ran a bot down two seconds in, before the sign
was on screen. Both carts have a beat between two ends now. The near tree earns
its place twice: it stops the cart reaching the spawn, and it is the first thing
in the world you climb — so you meet your first golf cart from the top of a
tree, looking down at the roof you are about to find out is solid.

**A rise is only as possible as the run-up in front of it.** This one caused two
separate bugs and is the lesson of the level. Measured, jumping at the level's
own geometry:

```
Mendy walking   65px      Mendy running   77px
Berel walking   48px      Berel running   59px
```

A three-tile ledge is a 48px rise and Berel's standing jump is 48px *exactly*,
which fails. The porch-to-roof climb was also three tiles, taken from a porch
two tiles wide — nowhere to build the run that would have carried him. Berel
could not reach a single roof in the colony: a bot driving the level as him got
fourteen tiles from the spawn and spent the next eighty-seven seconds at a tree.
Then, having re-laid every rise at two tiles, I introduced the same bug again at
the one deliberate four-tile rise, by leaving a two-tile shed to jump from —
64px is past Mendy's *walking* 65px by a pixel, so it is a running jump, and
32px of shed is not enough road to run on. Eight coins and a spare life,
unreachable by anybody.

So: every rise is two tiles and butted against what it climbs from, never a gap
and a rise in the same jump. §4's difference is spent in exactly one place
rather than by accident everywhere — the high roof at 226 is four tiles, past
Berel's running 59 and inside Mendy's 77, with the coins and the spare life up
there and a full route past it at roof height.

### On harnesses, again

The rig that produced those jump numbers is the second one written. The first
built its own wall against a floor row it had assumed the greybox gym used, and
reported that Mendy cannot climb two tiles — which a completed run of the same
level disproves. Every harness needs a positive control before its results are
believed, and Mendy is the control in this one.

Two more rig lessons, both of which cost a run each. Editing a source file while
a Playwright test is running triggers Vite HMR and destroys the execution
context. And dying in a level calls `scene.restart`, which rebuilds the scene
with a fresh `CombinedInput` and throws away both the rig's controls and its
`postupdate` listener — so the bot stops moving, makes no further progress, and
the promise it is waiting on can never settle. The runner replaces the
checkpoint restart with a respawn in place, which keeps one continuous
measurement across every death.

### Verified

Driving the real level end to end, with a bot that goes right and jumps at
whatever is in front of it: **Mendy completes in 38.3s and Berel in 47.6s, both
with no deaths, both riding both clotheslines.** Berel riding them is the proof
that matters — the rope at 146 can only be boarded from the tall roof, so
finishing with two rides means he climbed lawn, porch, roof, shed and tall roof
for real. The four route-critical climbs were then measured one at a time, and
the high roof is Mendy's alone as intended.


---

## 3-2 — The Lake

"Canoes, rope swing, frogs, mud." (§6) Three of the four cost almost nothing,
which is §11's architecture finally paying out in full, and the fourth is the
only piece of genuinely new physics in World 3.

### The canoe is a config row

It is the first hazard in the game that cannot hurt you, which makes "hazard"
the wrong word and exactly the right system. §11 separates hazards from enemies
because a hazard is "survived, avoided, or ridden", and a canoe is the pure third
case: `rideable` already carries a player on top of a moving body, `harmful:
false` is already checked before anything does damage, and a roller already turns
at the ends of its water the way a shopping cart turns at a wall. Gravity off, so
it stays on the lake. Measured, a rider is carried with the gap held to 3px.

### The frog took two goes

A config row plus a small behaviour — sit, hop, land, sit — where the sitting is
most of it, because §6 also calls frogs bounceable and you cannot plan to land on
something that never holds still. The first numbers gave a hop of 24px up and
22px along, which arithmetic predicts exactly (260 against the enemy gravity of
1400 rises 260²/2800) and which is a twitch rather than §6's "arcs". At 430 it
rises 66px and spends six hundred milliseconds doing it. The travel came *down*
to 55: a tall short hop reads as a frog, a long flat one as a thrown rock.

Bounceable earned one new field. A stomp is worth 260 and clears 19px; a frog is
worth 560 and clears about 87px, which is what makes the four-tile rock at 120
reachable by either brother and only by using the animal. Two hits, so the first
landing is a trampoline and not a kill.

### The rope swing is a pendulum, not a tween

Everything interesting about a rope swing is deciding when to let go: at the
bottom of the arc you go flat and fast, near the top high and short, and holding
a direction pumps it higher than the rope was hung to reach. A tween can be made
to *look* like all of that and can answer none of it, because the only state it
has is a number between nought and one. So it integrates an angle and an angular
rate — four lines of arithmetic — and gives every one of those outcomes,
including the one nobody designs and everybody tries.

Measured: holding on four frames puts you back where you started, twelve reaches
tile 85, twenty-eight reaches 87.

### Six bugs, and the shape they share

**Mud was never detected.** `contains` tested two pixels above the feet, and mud
is authored on the row the ground's surface occupies — which is where it must be
drawn, because it is the mud you can see — so a body standing on it has every
pixel of itself above the rectangle. It read as mud slowing a run but not a walk,
which is not a thing mud can do: the "slow" run was a player sprinting off the
shore into the lake.

**The rope was never caught**, six attempts out of six, because it tested two
circles around the knot and a player arrives on a jump, crossing the rope's line
at whatever height it has reached. The hand was passing 48px above the knot.
Distance to the rope as a line segment now, over its lower two thirds, and it is
caught thirteen times out of fourteen from anywhere on the planking.

**The canoes drifted away**, which is the golf-cart bug for the third time. A
roller only ever turns at a wall, and neither a lawn nor a lake is one.

**The lake was 44% of the level**, and two bots spent 80% and 94% of their runs
swimming. That number is the whole level report, and the answer was a rebuild:
four crossings of ten or twelve tiles with twenty tiles of ground between them,
and a lake three rows deep instead of four.

**The islands that bounded the canoes were walls to a swimmer**, sheer from the
waterline to the bed.

**The shelves that fixed that were traps with roofs.** One tile thick at the
surface with open water underneath, so a swimmer walking the bottom into the
corner ended up beneath the shelf with solid above and the shore's face beside:
eighty-five seconds, no way out. Banks are full depth now.

The last two are the same mistake twice, and worth a rule: anything added at a
water's edge has to be checked from underneath as well as from above. The
build-time trap validator cannot help there, because it treats water as "not a
pit" and stops looking.

### On harnesses, once more

Three of those six were diagnosed only after the stalls were made to explain
themselves — feet row, swimming, on a rope, grounded, walled. Before that I fixed
the water three times when the fault was a test bot that only presses jump while
grounded, and is therefore never able to let go of a rope: one run hung off the
last swing for fifty seconds and reported the level unfinishable. The instrument
should have come before the first fix, not after the third.

Two other rig faults cost a cycle each: a "broken" canoe carry that was really
net displacement measured on an oscillating platform (the constant 3px gap is the
right statistic), and a frog rise measured against each frog's final position
rather than its take-off, which reported the three frogs that had fallen into the
lake as the ones making the biggest leaps.

### Verified

Both brothers complete it: **Mendy in 40.6s and Berel in 41.6s, 202 tiles, 48 and
49 coins**, with swimming down to 195 and 26 frames from the 5065 of the version
before. Four deaths each, every one of them at a frog, which is the level's
difficulty rather than its geometry.


---

## 3-3 — Lights Out

"Night level, timed. Visibility reduced to a circle of light around the player.
Fireflies mark safe paths. Crickets on the soundtrack. Eyes blink in the dark
just outside the light radius." (§6)

### The night

One screen-sized render texture, pinned to the camera, filled every frame and
then erased: a soft round hole at the player and a smaller, fainter one under
each firefly on screen. A radial gradient, not a hard circle, so it reads as a
lantern rather than a porthole. Redrawn on the camera's follow-update rather
than in the scene's update, because the camera moves after update runs and a
lantern placed against last frame's scroll trails the player like a torch on a
string.

### The number that makes it a level

The lantern reaches 58px. A walking jump carries about 64. So you cannot quite
see where a jump lands, and that gap is the whole level: the fireflies close it.
Each one shines through the dark and lights a little of the ground beneath it,
so a line of them is a line of places that are there. One rule, taught in the
first thirty tiles and never broken — every firefly is over something you can
stand on. No decoys. A mechanic that exists so the player can trust the dark
cannot also be the thing that lies to them.

Nothing else in the level is new terrain. Porches, roofs, rotting steps, a
clothesline and three-tile pits were all taught in daylight in 3-1, and that is
the design: the only fair way to take sight away is from things the player
already knows how to do.

### Mosquitoes

§6's swarms, saved for the night: "drift toward the player as a cloud. Cannot be
stomped; outrun them or disperse them with a power-up." The last clause cost
nothing — the flame and the Lulav swing already knock away whatever they touch
without asking whether it can be stomped.

"Outrun them" cost a redesign. The first swarms woke at 150px and hovered at
head height, which put a homing cloud you cannot stomp in the path of a player
walking towards it: a closing speed of 121px/s. Berel died to the first one
ninety-eight times. Now they hang five tiles up and wake only when you pass
underneath, so they come down behind you and you walk away at nearly twice
their speed. Outrunning is something you do to a thing behind you.

### Two things the screenshots caught

The dark was checked by looking at it, and the first look found that signs sat
under the night like all world text — so the one sign explaining how to read the
dark was a smudge. Signs on dark levels now render above the night. Instructions
are not scenery.

### The clock

140 seconds, from measurement: a perfect run is 27 to 34, walking the length is
about 45, and stopping to read the lights at every pit takes a careful player to
about 70. The first figure of 180 was six times the fastest run and would never
have mattered to anyone.

### What is not here

The crickets. There is no audio in the game, and §10 asks for a system that
tracks drop into as files. They belong to that, not to a sound engine built
inside one level.

### Verified

Both brothers complete it with no deaths — Mendy in 26.9s and Berel in 33.7s,
both riding the clothesline. The run before the swarm fix was reported by the
test bot as COMPLETE after ninety-eight deaths; it was a game over, which the
scene also marks as 'complete' so that SPACE returns you to the map. The bot now
tells the two apart, and puts swarms home on respawn the way the real restart
does, so it cannot manufacture a death loop the game itself cannot produce.


---

## 3-4 — The Bear, and World 3 is done

"Lives behind the canteen dumpster with the kugel. Charges, swipes, climbs the
dumpster and hurls garbage bags, and calls in raccoons when wounded." (§6) Four
verbs, each a mode of one state machine.

**The charge is the window.** It rears — the only telegraph — and runs until it
hits something, and it can only be hurt once it has. Landing on it otherwise
bounces you off and hurts neither of you. That split is the whole rule of the
fight: you can always try the stomp, and the daze is when it works.

**The swipe** is for standing in front of it while it paces, after a 380ms
wind-up, because a melee hit with no warning is a coin toss.

**The dumpster** comes after every daze: up it goes, throwing bags aimed by
solving the lob for where you are. They land where you were.

**The raccoons** are the part that makes the fight answer back rather than just
speed up. Every hit calls in more of the one enemy in the game that takes your
power-up instead of your life — so the better the fight is going, the more there
is to lose.

The arena falls out of the charge rule: two perches, the woodpile and the bear's
own dumpster, each exactly two tiles high. Both brothers climb that from
standing, and the bear, at two and a half tiles, can neither run under nor over
either — so a charge at one always ends against it, dazed, one short drop below
you. Nothing else lives in the clearing.

It is not killed. It sits, thinks better of it, and lumbers off into the woods,
leaving the kugel on the dumpster lid where it was the whole time.

### One tuning change, from the timings

The first clean run broke the fight down by mode, and fourteen of its fifty
seconds were the bear walking back across the clearing to its dumpster after
each daze — over a quarter of a boss fight with nothing in it. It lopes home now
rather than ambling, and the same fight takes about forty-four seconds with the
trip home at eight.

### Verified

Both brothers beat it with no deaths: Mendy in 43.0s and Berel in 44.8s, three
hits one per phase, nine bags thrown (two, three and four — the stages exactly),
raccoons called in, and the kugel collected off the lid.

## World 3 — The Catskills, complete

3-1 The Colony, 3-2 The Lake, 3-3 Lights Out and 3-4 The Bear, each completed
end to end by both brothers.

What it added to the game: bungalow roofs as a route, clotheslines, rotting
porch steps, raccoons, golf carts and wasps (3-1); mud, canoes, bounceable frogs
and a real pendulum rope swing (3-2); darkness, fireflies, eyes and mosquito
swarms (3-3); and a boss built from four verbs (3-4).

What it taught about building levels, which is the part worth keeping:

- **A rise is only as possible as the run-up in front of it.** Two bugs in 3-1,
  both with every height correct and the route still closed.
- **A roller only turns at a wall, and neither a lawn nor a lake is one.** The
  golf-cart bug, three times.
- **Anything added at a water's edge must be checked from underneath.** A helpful
  ledge and an inescapable pocket are the same geometry seen from two sides, and
  the trap validator cannot see either.
- **An enemy you cannot stomp must be behind you**, or "outrun them" means nothing.
- **Make the instrument explain itself before the first fix, not after the third.**
  Most of this world's wasted cycles were spent fixing the level for faults that
  belonged to the test bot.

Not built: §6's crickets, which belong to the audio system §10 asks for and the
game does not have yet.


---

## 1-2 without its rats

At the developer's request, 1-2 is easier: its six rats are gone and nothing
replaces them. A rat runs a scaffold board in about a second, on a climb where
the screen is already rising beneath you and the board it runs along is the only
thing to stand on. The pigeons and falling pipes stay — those are the
telegraphed hazards the level exists to teach — and rats remain in 1-1 and 1-3.
§6 lists rats for 1-2, so the level file says why they are not there.

---

## World 4 — Meah Shearim: 4-1 The Alleys and 4-2 The Shuk

"Jerusalem. Stone, arches, bright sun, narrow alleys. Visually the furthest
thing from Brooklyn." (§6) One material, pale stone, for the floor and the walls
alike, and the arch as a solid kind of its own.

### 4-1 — "Stone stairs, arches, cats, hamsin gusts"

Built on a slope: terraces joined by flights of single-tile stone stairs, arches
over the passages with three tiles of headroom.

**The cat** sits, hisses when you come close, and runs flat out in one direction
straight through where you were. It does not chase; it has somewhere to be. One,
then two, then three on a wall, where the answer is the gap between darts.

**The hamsin** is a wind zone that gusts on the clock: 2.25s calm, 0.7s of
pashkevilin lifting off the walls, 1.3s of wind at 420 — more than Mendy's footing
of 177. Measured: a gust shoves a Mendy standing on the narrow stone 54px back
into the pit, and pushes a jump into it short; Berel, immune, does not move at
all. The narrow stretches between pits are a swap test against the clock, with a
sign before them that says so.

Two finds: the trap check called the terraces a seventy-tile pit (a pit is a
hole, not a hill — a column solid at the floor row no longer counts as one), and
the first slope opened a parallax gap every flat level hid, now filled with the
backdrop's own base colour.

Both brothers complete it: Mendy 28.5s with no deaths, Berel 53.5s with four, all
to cats.

### 4-2 — "Crates, carts, awnings, geckos. Heavy Berel usage."

Berel's level, by §6's instruction. The **cart** is the crate on wheels — pushed at
110 against Berel's walk of 75, barely slowed by the stone, so a shove sends it
rolling about five tiles. The **gecko** creeps on stall walls and bolts away when
you come near.

Four bugs, all found by driving the level:

- **The gecko stalls were four tiles tall**, walls Berel could not get over
  (running jump 59px, wall 64). Sixteen deaths at the first one. Stalls are two
  tiles now, and the helper no longer takes a height. 3-1's rule, again.
- **The gecko fled into your climb.** It bolts up its wall, and up a stall's wall
  is where you jump: sixty-five deaths at the first stall. §6 gives geckos no
  attack — "cling to stone walls, scurry when approached" — so a fleeing gecko is
  harmless until it settles.
- **The Berel-only passage was not.** One crate in three tiles of headroom left
  32px above it; Mendy is 22px and walked over it, finishing without a swap. Two
  crates stacked leave 16px, and standing Berel pushes both at once.
- **The cellar under a weak floor had no way out** — a box hanging at standing
  height and stairs climbing into the underside of the street. Four rows tall
  now, the box set into the ceiling, the stairs opening into daylight.

And three test-bot faults, each of which would have reported the level broken:
it set the character directly instead of through the scene's swap (so crates
never knew Berel was pushing), it would not jump at a crate (so it pushed a
stopped cart into a wall forever), and before that it could not swap at all.

Both brothers complete it with no deaths: Berel 42.1s; Mendy 41.5s, swapping once
at the passage, which is what the sign at the shuk's entrance tells you to do.

### 4-3 — "Timed chase across solar water tanks and laundry lines"

Ninety seconds on the clock, and the Yetzer Hara on the roofs ahead — the same
uncatchable rubber band as the prologue, now standing on whatever roof is under
him. As you close on him at the far end he goes over the last wall towards the
final fight; the flag past it still ends the level. Back from a checkpoint, he
starts a lead ahead of you rather than back at the first roof.

**Solar tanks** are drums on their side: a static body, plus a push off the
curve for whoever is standing on it, proportional to how far from the top they
are (360px/s² at the edge). Let go and it rolls you off; hold a direction and
you win, because a skid (361) beats it. So it takes anyone who stops and nobody
who keeps going. At 520 it took you back into the gap you had just cleared
whatever you pressed.

**Laundry lines** are a floor from above and nothing from below — the awnings'
one-way rule. A bridge at roof height first, then a line with a second line of
coins three tiles over it, then two stacked up an alley as a ladder to the high
roof. The validator counts a line across a gap as something to land on; the trap
and pocket checks ignore them, since you jump straight up through one.

**Sparrows** are a new `flutter` behaviour: a new random heading every quarter
to half second, inside 28px of home, no gravity, one stomp. They never follow.

Two finds, both by driving it:

- **The tank stacks were one tile wide**, a twenty-pixel target, and a running
  jump sailed over the second into the gap behind (Berel twenty-five deaths,
  then Mendy thirty-two). Two tiles now, the tank across the middle, a tile
  below the roof line and three tiles apart: every jump in the game, from
  Berel's walk to Mendy's run, comes down on one.
- **Sparrows hung in the middle of a jump** made each gap a coin toss — one
  death on one run, six on the next. Hung higher, a plain jump passes under.

And one rig fault: the bot's look-ahead for floor was 34px wide, which spans a
two-tile gap, so it walked into every one and reported the first roof
impassable.

Both brothers finish: Mendy 30.6–32.2s with one or two deaths to sparrows,
Berel 31.8s clean on one run and 42.5s with two on another. The thief goes over
the wall about half a second before the flag.

### 4-4 — The Yetzer Hara

"A shape-shifter with no true form. He cycles through the forms of every boss
already beaten." (§6) So he is not a fourth boss with a fourth script: each form
is the real Pigeon King, Escalade or Bear class, running his numbers, with its
own drawing hidden and his purple borrowed shape from the sheet drawn over it
(scaled to the real hitbox, so what you see is what hits you), trailing smoke.
Every contact rule and every window is the one the player learned in 1-4, 2-4
and 3-4. That is why those three fights took their tuning as a parameter.

- **Phases 1–3**: pigeon, car, bear, two hits each, a step quicker than the
  originals. Between shapes he is smoke drifting to where the next one stands,
  and smoke cannot hurt or be hurt.
- **Phase 4**: three more hits, each shape worth one, coming on at once. He
  changes shape on a shrinking hold (7.5s down to 6s) to a random *other*
  shape — "never settling into a rhythm" — but never in the middle of a
  window, and a frame of another shape flickers through every half-second.
- **Each phase is a checkpoint.** Nine hits is a long fight to repeat.
- **On defeat** he comes apart — he never resolves into a shape — and leaves
  the tequila. The banner says the kiddush is whole.

One courtyard serves all three: the hydrants are the car's lane ends and the
bear's thing to charge into, the stoops behind them are where you wait, the
far stoop is the bear's dumpster, and the perches are 1-4's, lowered.

Found by driving it with a bot that fights each shape the way it was beaten:

- The HUD is built after the boss, so the opening banner wrote to the last
  level's destroyed HUD and crashed. The first shift waits a frame.
- The bear's dumpster was the stoop you start and respawn on, so it climbed up
  beside you. It is the far one now, as in 3-4.
- The flock and the bags outlived the shape that made them and killed you in
  the next one. They leave with it.
- The perches were 1-4's, above where the camera reaches with you on the floor:
  the telegraph was off the top of the screen. The car and the bear appeared
  relative to the room, sometimes off-screen. Both now appear on screen.

Both brothers beat the whole fight: Berel in 129s, Mendy in 173s.

## The game is complete

All sixteen levels across four worlds, plus the prologue. Not built: §6's
crickets, which wait on §10's audio.

## The flip-phone app

A build for flip phones with no browser — the CAT S22 Flip in particular, an
Android 11 phone with a keypad that is common as a filtered phone. See
FLIP_PHONE.md for installing it and the keys.

- **An APK, offline.** `npm run build:apk` packs the game into an Android app
  with no permissions at all. A small Java activity shows it in a WebView and
  answers every request for the game's files from inside the app, at a made-up
  https address — module scripts will not run from a plain file. Built with
  Ubuntu's Android tools; no Gradle, no Android Studio.
- **For an old WebView.** A filtered phone may never have updated its WebView,
  so the phone build targets Chrome 69. Checked by parsing the bundle as ES2019:
  the phone build passes, the normal one does not (the positive control).
- **One key per move.** Number pad: 4/6 walk, 2/5 jump, 1/3 jump left/right, 7
  toggles run, 8 ducks (and ground-pounds in the air), 9 uses your form, 0 swaps.
  The D-pad moves and its up and middle buttons jump. Measured key by key in
  the game. The number keys work on a computer as well.
- **Portrait.** The game across the top of the screen, the key guide in the
  space under it, with 7 lit while run is on. The map and banners say OK and 5
  instead of SPACE. Back leaves a level for the map and closes the app from the
  map. The clear key cannot wipe the save on the phone, because it arrives as
  Backspace.

Not tested on a real phone: there is no Android device or emulator here. What is
verified is the APK's structure and signatures (`aapt`, `apksigner`, v1–v3) and
the phone build itself running in a 320×427 screen with the phone's user agent.

### The phone's own buttons

The app now catches every button in the activity (`dispatchKeyEvent`) and
hands the page the computer key it stands for; `window.bochurKey` in
`index.html` turns that into an ordinary key press, so the game needed no
change. D-pad walks, ducks and jumps (up or OK), the left soft key swaps
brothers, the right soft key uses your form, Call and ✱ switch run, the clear
key does nothing, and volume, Back and power do what they always do. Left to the
WebView, a flip phone's D-pad can drive a focus ring and its soft keys, Call
and ✱ may never reach the page. A bar along the bottom of the screen labels the
soft keys, as flip phones do. Tested by driving the game only through that
bridge, with the codes the app sends: every button did what the guide says.
