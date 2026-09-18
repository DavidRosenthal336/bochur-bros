# Bochur Bros — Game Design & Build Spec

**Read this entire file before writing any code.** This is the authoritative design document for the project. Build it in the milestones listed at the bottom, and **stop after each milestone** so the developer can playtest before you continue.

---

## 1. What this is

A 2D side-scrolling platformer in the classic Super Mario Bros. tradition — run, jump, stomp enemies, hit boxes for power-ups, reach the end of the level, fight a boss at the end of each world.

The setting is contemporary Orthodox Jewish life. The tone is **epic adventure with warm, affectionate humor** — never mocking, never mean. The comedy comes from recognition, not ridicule.

**Premise:** The Yetzer Hara crashed the kiddush and made off with the entire spread, scattering it across four places. Mendy and his chavrusa Berel have to get it all back.

---

## 2. Legal guardrails — non-negotiable

- **Never use any Nintendo asset, sprite, sound, music, name, or character.** Not as placeholder, not as reference material in the repo, not downloaded "temporarily."
- Game mechanics and genre conventions are not protected and are fine to imitate freely.
- Do not name anything in a way that echoes a Nintendo title. The game is **Bochur Bros**, and nothing in it is "Super," "Bros." in a Mario-shaped phrase, or named after a Nintendo character.
- Every third-party asset used must be free for commercial use (CC0, CC-BY, or an explicit permissive license). Track every one in `CREDITS.md` with source URL and license. If the license requires attribution, it goes in the in-game credits screen too.

---

## 3. Tech stack

- **Phaser 3** (latest stable) with **TypeScript**
- **Vite** for bundling and dev server
- **Tiled** (`.tmj` / JSON export) for level design — levels are data, never hardcoded
- **Vercel** for deployment
- No backend, no accounts. Save data lives in `localStorage`.

Scaffold with `npm create @phaserjs/game@latest` (Phaser + TypeScript + Vite template) or an equivalent clean setup.

**Target:** desktop browsers and mobile browsers (phone play with on-screen touch controls is a first-class requirement, not an afterthought).

---

## 4. Characters

Two playable characters. **Only one is on screen at a time.** Press the swap button and the active character is instantly replaced in place by the other, at the same position with the same momentum. Swapping is free, unlimited, and instant.

Both characters share a single power-up state — if Mendy is in Menorah form and you swap to Berel, Berel is in Menorah form.

### Mendy — light and agile
- Higher jump, faster top speed, better air control
- Default character

### Berel — heavy and strong
- Lower jump, slower top speed, heavier fall
- **Breaks reinforced blocks** that Mendy cannot break in any form
- **Pushes crates** that Mendy cannot budge
- **Ground-pounds through weak floors**
- **Immune to wind** — leaf blowers and the Meah Shearim hamsin don't push him

Level design should regularly require both. A wind corridor needs Berel; a long gap needs Mendy.

---

## 5. Power-up system

Classic mystery-box system. Power-ups are **temporary** and come from boxes placed in levels. They are **not** permanent unlocks.

### Tiers
1. **Small** — base state
2. **Cholent** — the "big" tier
3. **Power forms** — Menorah, Lulav, or Peyos (only one at a time)

Taking a hit drops you exactly one tier: power form → Cholent → Small. Taking a hit while Small costs a life.

**No spare power-up is held in reserve.**

**No invincibility power-up exists.** (Deliberate. Do not add one.)

### The forms

| Form | Role | Behavior |
|---|---|---|
| **Cholent** | Grow tier | Puffs up round and heavy, steam rising. Takes an extra hit. Breaks normal blocks from below. Landing from a height stuns nearby enemies. |
| **Menorah** | Projectile | Small menorah in hand, golden glow. Shoots flames that bounce and roll along the ground, like fireballs. |
| **Lulav** | Melee | Swings it like a bat. Knocks enemies sideways with force, deflects incoming projectiles. Short range, no ammo, hits harder than fire. |
| **Peyos** | Flight | Peyos spin up like rotors; his hat lifts off his head and hovers above him while airborne. Hold the jump button to hover/fly. Limited duration per takeoff, refills on landing. |

**Each form changes the character's appearance visibly**, same as classic Mario. This means a full sprite set per character per form (see Art, §9).

### Collectibles
- **Tzedakah coins** — the coin equivalent. 100 coins = 1 extra life. Scattered everywhere.
- **L'chaim** — the 1-up. A small cup, rare, grants an extra life. (The pun is the point: *l'chaim* = "to life.")

---

## 6. Worlds

Four worlds, four levels each — three regular levels plus a boss level. **16 levels total.**

A **world map screen** connects levels. Completing a world's boss level unlocks the next world.

Each world's boss holds a stolen kiddush item. Recovering it is the world's victory condition. **Kiddush items are trophies only — they grant no abilities.** They appear on a kiddush table in the menu/map that fills up as you progress.

---

### Prologue — The Kiddush
Staging the premise above, so the map screen is arrived at rather than opened on.

The Yetzer Hara takes the spread and runs. He is a formless shadow the whole way — §6 has him as a shape-shifter with no true form, and the final fight has nothing left to reveal if he has already been seen properly — and he holds station ahead of the player however fast they run, so the chase cannot be won. It cannot be lost either: no enemies, no hazards, no pit, no clock. It ends when the player closes on him at the end of the street, at which point he goes up and over and the spread scatters into the four world-map nodes.

It also teaches running, jumping and swapping brothers, in a level where none of them can be failed. Plays once on a new save, skippable, and rewatchable from the map with **I**.

### World 1 — Boro Park
Dense, loud, urban Brooklyn. Grimy, crowded, vertical.

**Prize:** the meat board

**Enemies (defeatable):**
- **Pigeons** — dive at you in arcs. Stomp them mid-swoop. The basic grunt.
- **Rats** — emerge from sewer grates and garbage bags on a timer, scurry fast in one direction.

**Hazards (cannot be killed, only survived or used):**
- **Runaway shopping carts** — roll at you fast. Jump on top to ride one like a skateboard.
- **Falling scaffolding pipes** — a shadow appears on the ground, then the pipe drops. Telegraphed, then lethal.
- **Double-parked vans** — sit still, then lurch forward without warning and crush against walls. Their roofs are platforms, so the player must climb the thing trying to kill them.
- **The stroller** — rolls downhill and chases the player through an entire level.

**Terrain:** scaffolding to climb, awnings to bounce off, fire escapes as platforms, sewer grates, garbage bags as bounce pads.

**Levels:**
- **1-1 — Thirteenth Avenue.** Gentle intro. Pigeons, awnings, first Cholent box, teaches stomping and boxes.
- **1-2 — The Scaffolding.** Vertical climb. Falling pipes, fire escapes, rats. Teaches telegraphed hazards.
- **1-3 — The Stroller.** Auto-scroll chase level, **timed**. The stroller pursues the whole way.
- **1-4 — The Pigeon King.** Boss.

**Boss — The Pigeon King:** an enormous, grimy pigeon atop the scaffolding. Summons flocks of pigeons, dive-bombs in arcs, and retreats to high perches between attacks. Sitting on the meat board.

---

### World 2 — The Five Towns
Suburban Long Island. Open, manicured, quiet, and full of machinery that turns itself on.

**Prize:** the pan of poppers

**Enemies:**
- **Canada geese** — the signature enemy. Hiss, chase on foot, relentless, don't scare off. A stomp makes one angrier before it goes down (two hits).
- **Chipmunks** — quick ground grunts darting between hedges.
- **The dog behind the fence** — can't reach you, but its bark stuns you for a moment at the worst time.

**Hazards:**
- **Pop-up sprinklers** — fire on a timer, launch the player upward. Also the intended route to high platforms.
- **Self-driving lawn mowers** — patrol lawns in slow loops. Ride-on models can be hopped onto and ridden.
- **Leaf blowers** — constant wind pushing the player backward mid-jump. **Berel is immune.**
- **Trampolines** — big bounces between backyards.
- **Automatic gates and garage doors** — close on a timer, crush if you're slow.
- **Minivans** — back out of driveways with no warning; idle in a carpool line whose roofs are platforms but which lurch forward one at a time; cross in both directions during school pickup (Frogger-style crossings); block narrow streets with three-point turns.

**Levels:**
- **2-1 — Central Avenue.** Minivans, the carpool line, street crossings, introduces geese.
- **2-2 — Backyards.** Trampolines, sprinklers, mowers, leaf blowers, fences. Heavy Mendy/Berel swapping.
- **2-3 — The Pool.** Water level. Swim physics, currents from the filter, a pool cover to swim beneath.
- **2-4 — The Escalade.** Boss.

**Boss — The Escalade.** A mother in sunglasses, on the phone, eating a salad, driving an enormous Escalade around a cul-de-sac.

**Critical design note: the player fights the vehicle, never the driver.** She is never harmed, never stomped, and — this is the joke — **never once acknowledges that the fight is happening.**

- **Phase 1:** The Escalade charges across the cul-de-sac. Dodge it, it clips a fire hydrant and stalls, and the player gets a window to jump on the roof and ground-pound a dent into it.
- **Phase 2:** Reverse. Backup beeping, sprinklers kicking on, geese scattering. She's still on the phone. The salad is untouched.
- **Phase 3:** She sets the salad in the cupholder. The music drops out for one beat. Then she drives like she means it.

On defeat: the roof is dented in, the windows crack, the hazard lights come on, she pulls calmly into a driveway still talking, and the pan of poppers slides out the back hatch. She drives off, never having noticed.

---

### World 3 — The Catskills
A bungalow colony. Woods, lake, porches, bugs, the middle of nowhere.

**Prize:** the kugel

**Enemies:**
- **Mosquito swarms** — drift toward the player as a cloud. Cannot be stomped; outrun them or disperse them with a power-up.
- **Raccoons** — steal the player's power-up and bolt under a porch. Chase one down and it drops what it took.
- **Wasps** — circle garbage cans, attack if approached.
- **Frogs** — hop in arcs near the lake. Bounceable.
- **Skunks** — spray a lingering cloud that blocks a path until it clears.

**Hazards and terrain:**
- **Bungalow roofs** as the main platforming route, with gaps between them
- **Clotheslines** — ride them like ziplines, or duck under them
- **Screen doors** that slam shut on a timer
- **Rotting porch steps** that crumble a beat after the player lands
- **Mud** that slows movement to a crawl
- **The lake** — canoes as floating platforms, a rope swing to cross
- **Golf carts** puttering along the colony road

**Levels:**
- **3-1 — The Colony.** Bungalow roofs, clotheslines, porch steps, raccoons.
- **3-2 — The Lake.** Canoes, rope swing, frogs, mud.
- **3-3 — Lights Out.** **Night level, timed.** Visibility reduced to a circle of light around the player. Fireflies mark safe paths. Crickets on the soundtrack. Eyes blink in the dark just outside the light radius.
- **3-4 — The Bear.** Boss.

**Boss — The Bear.** Lives behind the canteen dumpster with the kugel. Charges, swipes, climbs the dumpster and hurls garbage bags, and calls in raccoons when wounded.

---

### World 4 — Meah Shearim
Jerusalem. Stone, arches, bright sun, narrow alleys. Visually the furthest thing from Brooklyn.

**Prize:** the tequila (the final prize)

**Enemies:**
- **Cats** — the signature. Everywhere, in packs, on walls and bins, darting across the player's path.
- **Rooftop pigeons** — dive across the alleys.
- **Geckos** — cling to stone walls, scurry when approached.
- **Sparrows** — quick and erratic, hard to hit.

**Hazards and terrain:**
- **Narrow alleys** with stone stairs, arches, and courtyards that open up
- **Laundry lines** strung across alleys, above and below the player
- **Solar water tanks** on rooftops — round, awkward platforms
- **Shuk crates and carts** to climb, push, and knock over (**Berel** pushes the heavy ones)
- **The hamsin** — a hot wind that gusts and pushes the player off narrow ledges. **Berel is immune.**
- **Pashkevilin** papers blowing through the air (visual)

**Levels:**
- **4-1 — The Alleys.** Stone stairs, arches, cats, hamsin gusts.
- **4-2 — The Shuk.** Crates, carts, awnings, geckos. Heavy Berel usage.
- **4-3 — Rooftops.** **Timed chase** across solar water tanks and laundry lines.
- **4-4 — The Yetzer Hara.** Final boss.

**Final Boss — The Yetzer Hara.** A shape-shifter with no true form. He cycles through the forms of every boss already beaten:
- **Phase 1:** Pigeon King — summons flocks, dive-bombs
- **Phase 2:** The Escalade — charges in straight lines
- **Phase 3:** The Bear — swipes, hurls, calls minions
- **Phase 4:** Flickers between all three, faster and faster, never holding one form long enough to settle into a rhythm

He never resolves into a stable shape. On defeat he gives up the tequila.

---

## 7. Systems

**Lives and death.** Classic lives with a game over, but **checkpoints are generous** — mid-level checkpoints placed frequently, and dying returns the player to the last checkpoint rather than the level start.

**Saving.** Auto-save after every completed level, to `localStorage`. No manual save, no passwords. Store: current world/level unlocked, lives, coins, kiddush items recovered, character last used.

**Difficulty.** Classic Mario difficulty — fair, learnable, demanding by the later worlds. Not forgiving, not brutal.

**Time limits.** Only on specific levels: **1-3 (stroller chase)**, **3-3 (night level)**, **4-3 (rooftop chase)**. All other levels are untimed.

**Secrets.** Keep levels straightforward. No hidden rooms, no secret exits, no branching paths. Reward exploration with visible coins and power-ups, not concealed content.

**World map.** A screen showing the four worlds as a journey, with levels as nodes, a marker for the player's position, locked worlds greyed out, and a kiddush table that fills with recovered items.

---

## 8. Controls

**Keyboard:**
- Arrow keys / WASD — move, crouch, look up
- Space or Z — jump (hold for higher jump; hold in Peyos form to hover)
- X — action (Menorah fire / Lulav swing)
- Shift — run
- Tab or S — **swap character**
- Escape — pause

**Touch (mobile):** on-screen left/right buttons, jump button, action button, swap button. Large hit areas, positioned for thumbs, semi-transparent. Test on an actual phone — this is not optional polish.

**Gamepad** support if it's cheap to add via Phaser's input system.

---

## 9. Art plan

**Build with placeholder rectangles first.** Colored boxes with correct hitboxes. Do not wait on art to make the game playable — the developer needs to feel the jump before anything is drawn.

**Style:** 16-bit pixel art, SNES era.

**Sourcing, in order:**
1. **Environments, tiles, props, backgrounds** — free asset packs (Kenney.nl is CC0 and the safest starting point; itch.io has many free packs). Use one or two matching packs per world so worlds look internally consistent.
2. **Characters, power-up forms, enemies, bosses** — these must be custom. Nothing Jewish-specific exists in free packs. AI-generated pixel art, touched up by hand, works well at this scale.

**The big art job:** each character needs a full sprite set per form — idle, run, jump, fall, crouch, hurt — across Small, Cholent, Menorah, Lulav, and Peyos. That's 2 characters × 5 forms. Plan for it, and don't start it until the game is fun with rectangles.

**The Peyos form detail matters:** the peyos spin like rotors and the hat lifts off the head and hovers above it during flight. Get that animation right; it's the game's signature image.

---

## 10. Audio plan

Music is being produced separately by the developer (via Suno). Direction: **klezmer melodies arranged as 16-bit chiptune** — clarinet lines over SNES-style backing.

Build the audio system so tracks drop in as files without code changes:
- One theme per world (Boro Park: brassy and busy / Five Towns: breezy suburban / Catskills: acoustic and woodsy / Meah Shearim: modal, Middle Eastern)
- Boss theme, world map theme, title theme
- Level-complete and game-over stingers
- **The Escalade fight needs a one-beat music drop before phase 3** — build the hook for it

Sound effects: free CC0 libraries (Kenney, freesound.org with license checking).

---

## 11. Code architecture

- **Levels are data.** Tiled maps loaded at runtime. Adding a level means adding a file, never editing game code.
- **Enemies are data-driven.** One enemy system with configurable behaviors (patrol, dive, chase, emerge-on-timer, thief) rather than a bespoke class per creature. New enemies should be a config entry plus a sprite.
- **Hazards are their own system**, separate from enemies — they can't be defeated, only survived or ridden.
- **Power-up state is a state machine**, clean transitions between tiers, with the tier-drop-on-hit rule in one place.
- **Character swap swaps the controlled entity**, sharing position, velocity, and power-up state. Not two entities.
- Keep tunable physics constants in a single config file so the developer can adjust jump feel without hunting through code.
- TypeScript throughout, typed properly. No `any` for game entities.

**Starting physics values** (tune from here, 60fps, expect to adjust heavily during playtesting):

```
gravity:              1800 px/s²
Mendy walk speed:     160
Mendy run speed:      260
Mendy jump velocity:  -520
Berel walk speed:     130
Berel run speed:      210
Berel jump velocity:  -440
Berel gravity:        2000
acceleration:         1200
deceleration:         1600
coyote time:          100ms
jump buffer:          120ms
variable jump:        releasing jump early cuts upward velocity by 50%
```

---

## 12. Build milestones — STOP AFTER EACH ONE

Do not run these together. After each milestone, stop, summarize what was built, tell the developer exactly what to test, and wait.

**Milestone 1 — The jump.**
Project scaffolded, running locally. One test level of placeholder rectangles. Mendy moves and jumps with variable jump height, coyote time, and jump buffering. Camera follows. Nothing else.
*Stop. The jump has to feel right before anything else is built.*

**Milestone 2 — Core loop.**
Pigeons that can be stomped. Mystery boxes. Cholent form with tier-drop-on-hit. Tzedakah coins. Death and respawn. A goal at the end of the level.
*Stop. This is the first time it's a game.*

**Milestone 3 — Both characters.**
Berel, the swap mechanic, the ability split, and one obstacle that requires each. Shared power-up state.
*Stop.*

**Milestone 4 — Level pipeline.**
Tiled integration. Levels load from map files. World map screen. Level progression and unlocking. Auto-save to localStorage. Build 1-1 and 1-2 as real designed levels.
*Stop.*

**Milestone 5 — Full power-up set.**
Menorah, Lulav, and Peyos, with the hover mechanic. L'chaim 1-ups. The 100-coin extra life.
*Stop.*

**Milestone 6 — World 1 complete.**
All Boro Park enemies and hazards. The stroller chase level. The Pigeon King boss fight. Kiddush item recovery and the kiddush table.
*Stop. This is the vertical slice — one complete world proves the whole game.*

**Milestone 7 — Mobile and polish.**
Touch controls, tested on a real phone. Pause menu, title screen, credits. Particles, screen shake, sound effect hooks. Vercel deployment.
*Stop.*

**Milestone 8 onward — Worlds 2, 3, and 4**, one world per milestone, following the same pattern as World 1.

---

## 13. Working rules

- Ask before adding any mechanic not in this document.
- When something in this spec conflicts with what actually feels good in play, say so — don't silently follow the spec into a worse game.
- Keep a running `PROGRESS.md` noting what's built, what's stubbed, and what's known-broken.
- Every asset added goes in `CREDITS.md` immediately, with source and license.
