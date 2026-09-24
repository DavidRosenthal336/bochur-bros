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
