# Art spec

Everything an artist needs to draw sprites that drop straight into the game.
All numbers below are read out of the code, not remembered — regenerate them
any time with the snippet at the bottom.

**Status:** the game currently runs on plain coloured rectangles, exactly as
BOCHUR_BROS_DESIGN.md §9 asks ("Build with placeholder rectangles first"). Real
art replaces them; nothing about the physics changes.

---

## The grid

| | |
|---|---|
| Tile size | **16 × 16 px** |
| Internal resolution | **320 × 180 px** (20 × 11.25 tiles) |
| Scaling | Whole screen is scaled up to fit the window, nearest-neighbour |
| Style | 16-bit pixel art, SNES era (§9) |

320 × 180 is exactly 16:9 and multiplies cleanly: ×4 = 1280×720, ×6 = 1920×1080.
**Draw at 1×.** Do not pre-scale anything — the game scales the whole frame at
once, and pre-scaled art will end up soft next to art that isn't.

---

## Hitboxes

These are the **collision boxes**, in pixels. The artwork does not have to match
them (see *Frames and padding* below), but the box is what the game moves and
collides with, so the character should read as occupying roughly this space.

### Mendy — light and agile

| Form | Standing | Crouched |
|---|---|---|
| Small | **14 × 22** | 14 × 13 |
| Cholent | **16 × 30** | 16 × 18 |
| Menorah | **16 × 30** | 16 × 18 |
| Lulav | **16 × 30** | 16 × 18 |
| Peyos | **16 × 30** | 16 × 18 |

### Berel — heavy and strong

| Form | Standing | Crouched |
|---|---|---|
| Small | **16 × 24** | 16 × 14 |
| Cholent | **18 × 33** | 18 × 20 |
| Menorah | **18 × 33** | 18 × 20 |
| Lulav | **18 × 33** | 18 × 20 |
| Peyos | **18 × 33** | 18 × 20 |

The four large forms share a body size on purpose: only Small and Cholent differ
physically, and the power forms are Cholent-sized so that swapping between them
never changes what fits through a gap.

### Enemies

| Enemy | Hitbox | Notes |
|---|---|---|
| Pigeon | **16 × 12** | Flies. Perches, rears up to telegraph, then swoops. |

Pigeons are the only enemy built so far. Rats, geese, chipmunks, raccoons,
cats and the rest arrive with their worlds; each will get a row here.

### Objects and effects

| Thing | Size | Notes |
|---|---|---|
| Tzedakah coin | **8 × 10** | Centred origin, bobs up and down |
| L'chaim (1-up) | **10 × 14** | Rare |
| Power-up pickup | **14 × 14** | Slides along the ground after it pops out |
| Mystery box / brick / reinforced / weak floor | **16 × 16** | One tile each |
| Crate | **16 × 16** | Berel can shove it, Mendy cannot |
| Menorah flame | **8 × 8** | Bounces and rolls |
| Lulav swing arc | 22 × 26 | Effect only, never drawn as a sprite sheet |

---

## Origins

**Characters, enemies and crates are anchored at their feet** — origin
`(0.5, 1)`, i.e. bottom-centre. A sprite grows upward when the form gets
bigger, which is why growing never shoves anyone through a floor.

Coins and flames are centred, origin `(0.5, 0.5)`.

---

## Frames and padding

Right now each sprite frame is exactly its hitbox. **Real art does not have to
be.** Hair, a hat brim, a swinging lulav and a flame trail can all overhang,
and they should — a character whose art stops exactly at its collision box
looks stiff.

Recommended approach:

- Pick one frame size per character per form and keep it constant across every
  animation in that set.
- Leave **4–6 px of margin on each side and above** the hitbox. For Mendy Small
  that means roughly a **24 × 28** frame around a 14 × 22 box.
- Keep the feet on the bottom edge of the frame and the body horizontally
  centred. The game positions by the feet.
- Hand over the frame size with the art and the hitbox is set separately in
  code — one line per form.

---

## What needs drawing

### Characters — the big job (§9)

Two characters × five forms × six animations:

| Animation | Notes |
|---|---|
| Idle | |
| Run | |
| Jump | Rising |
| Fall | Descending — a separate pose from Jump |
| Crouch | Uses the crouched hitbox above |
| Hurt | Brief, plays when a tier is lost |

**The Peyos form needs extra parts** and is the game's signature image (§9):
the peyos spin like rotors, and **the hat lifts off the head and hovers above it
while airborne**. The hat is a *separate sprite* — it detaches, so it cannot be
part of the character frame. It is currently a small dark rectangle floating
above the head.

### Suggested order

1. **Mendy, Small** — idle, run, jump, fall. Four frames-worth tells us whether
   the whole look is right, and it is the character you see most.
2. Mendy Cholent (the size change is the thing to check).
3. Berel, Small — he has to read as heavier at a glance, not just larger.
4. Everything else.

### Colours currently standing in

Only so the art has something to react to; none of it is binding.

| | |
|---|---|
| Mendy | `#4ea8de` blue |
| Berel | `#e07a5f` terracotta |
| Cholent | `#d98c3f` |
| Menorah | `#f2c14e` |
| Lulav | `#6a994e` |
| Peyos | `#9b5de5` |
| Pigeon | `#8a8f9e` |
| Coin / flame | `#f2c14e` / `#ffb648` |

---

## Licensing — non-negotiable (§2)

- **No Nintendo asset, sprite, sound, name or character.** Not as a placeholder,
  not as reference kept in the repo, not "temporarily".
- Anything third-party must be free for commercial use (CC0, CC-BY, or an
  explicit permissive licence) and goes in `CREDITS.md` with its source URL and
  licence **at the moment it is added**.
- AI-generated pixel art touched up by hand is fine and is the plan for
  characters, enemies and bosses, since nothing Jewish-specific exists in free
  asset packs.
- Environments and tiles are expected to come from free packs (Kenney.nl is CC0
  and the safest start), one or two matching packs per world so each world looks
  internally consistent.

---

## Regenerating these numbers

```bash
npx tsc --ignoreConfig src/config/Tuning.ts src/config/enemies.ts \
  --target es2022 --module esnext --moduleResolution bundler \
  --outDir /tmp/spec --skipLibCheck
```

Then read `TILE`, `CHARACTERS` and `TIERS` out of `/tmp/spec/config/Tuning.js`:
a form's size is `round(bodyWidth × widthScale)` by
`round(bodyHeight × heightScale)`, and crouched height is that height times
`crouchHeightFactor`.
