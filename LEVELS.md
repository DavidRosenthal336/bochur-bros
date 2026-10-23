# Bochur Bros — how a level is built

The rules every level is held to, and the numbers behind them. Half of them
are enforced by `npm run build:maps` / `npm run check:maps`
(`tools/validate-level.mjs`); the other half are judgement, and the checklist
at the end is how a level gets called done.

These exist because the first real playtest of World 1 found the same handful
of faults over and over: a pigeon two tiles from a checkpoint, a pipe hung
directly over one, carts that had rolled off into pits before anyone arrived,
a climb whose checkpoints could not be taken, a level with nothing in it. None
of that was caught by the geometry checks, because none of it is geometry.

## What the game can do (measured, `PROGRESS.md`)

| | Mendy | Berel |
|---|---|---|
| Standing jump | 4 tiles | 3 tiles |
| Running jump | 5 tiles | just under 4 |
| Widest gap, walking | 3 tiles | 3 tiles |
| Widest gap, running | 6 tiles | — |
| Walk / run | 90 / 150 px/s | slower |

- **A rise is two rows.** Three is Berel's standing jump exactly, with no
  margin. Where a level wants three, it gets an eight-tile run-up.
- **A gap is two tiles in a world's first level**, three at most anywhere.
  Three is the walking limit, so it is a gap you must not stop at.
- **Headroom is two rows.** One row is a slot nobody fits in standing up.
- **A pigeon perches on row 16 or lower** on a street level, or it dives from
  off the top of the screen, which is not a warning.
- **A pipe hangs at the floor row minus two**, in sight, and rattles for a
  second before it drops.

## The rules the validator enforces

| Rule | Number | Why |
|---|---|---|
| Nothing hostile near a spawn or checkpoint | **8 tiles** either side (on a climb, also within 6 rows) | A respawn gets 1.5s of grace. A pigeon triggers at 7.5 tiles; a rat walks. Eight tiles is time to see what is there. |
| A roller never shares a floor with a checkpoint | its whole stretch of floor | Carts and mowers patrol the stretch they stand on, so distance is not enough. |
| A roller starts on a floor | — | It sleeps until you are near; it must be on something when it wakes. |
| Checkpoints come in the order they are reached | x increasing, or on a climb y decreasing | The game counts them in list order. |
| A checkpoint stands on a floor | — | |
| Checkpoints are frequent | ≤ **90 tiles** apart (≤ 32 rows on a climb), the goal included | §7: "checkpoints are generous". |
| A Cholent box comes early | in the first **45%** of the route | You should be big before the level starts testing you. |
| Mystery boxes | at least **3** | |
| Things to deal with | at least **1 per 40 tiles** of route | 1-2 shipped with none. |

Boss arenas, the prologue and the greybox instruments skip the content rules.
The rules are errors for the worlds that have been rebuilt against them
(`STRICT_LEVELS` in the validator) and warnings for the rest, so the debt is
visible without blocking the build. A world moves to strict when it is rebuilt
and the developer has played it.

## The rules that are judgement

**Teach, then test, then use.** Every enemy and hazard is met alone, on open
ground, with a sign, before it is met with anything else going on. The first
rat in the game is one rat on a flat street. The next two have a ledge between
them. Only then do rats share a stretch with a cart.

**One new pressure at a time.** A level introduces one thing: a chase, a
rising screen, a dark, a clock. It does not introduce two. 1-3 has the stroller
and the moving screen, which are one pressure (you keep going), and nothing
else new.

**A checkpoint is a quiet place.** Flat floor, no pit under it, nothing that
moves within eight tiles, usually a coin row. You arrive, you breathe, you
look. A van needs twelve tiles, because it lurches ten.

**Length.** A street level is 60–90 seconds for someone who has played it once:
about 400 tiles at a mix of walking and running. A climb is set by the rising
screen; a chase by the scroll speed. Shorter than that and it feels like a
test; longer and it needs a second idea.

**Density.** Something every 15–25 tiles, counting coins and boxes. Empty
pavement is where a level feels short.

**What gets harder, by world.**

| World | Gaps | Enemies at once | New pressure | Clock |
|---|---|---|---|---|
| 1 Boro Park | 2, then 3 | 1, then 2 | rising screen (1-2), the chase (1-3) | none |
| 2 Five Towns | 3 | 2–3 | wind, water, machines on timers | none |
| 3 Catskills | 3, some needing a run | 2–3, thieves | ziplines, rotting steps, the dark | 3-3 |
| 4 Meah Shearim | 3 | 3, in packs | gusts, narrow ledges | 4-3 |

Only 3-3 and 4-3 carry a visible clock. An auto-scrolling level is already a
clock; a second one on top of it is noise.

**Power-ups.** A Cholent box early. One power form (Menorah, Lulav or Peyos)
per level from 1-1 on, placed just before something it is good against. A
L'chaim for an optional detour, never on the main route. A second Cholent
after the halfway checkpoint on anything long.

**Respawns.** A life that starts at a checkpoint gets 1.5 seconds of blinking
grace, and anything that chases waits it out. That is a safety net, not a
design tool: the eight-tile rule is what makes a checkpoint fair.

## Done means

1. `npm run build:maps` is clean: no traps, no unfair.
2. A scripted run finishes the level as Mendy and as Berel.
3. At every checkpoint, a respawn that stands still for three seconds is still
   alive.
4. The developer has played it.
