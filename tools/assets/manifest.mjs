/**
 * Every graphic the game draws, in one list.
 *
 * The single source of truth for the art pipeline: `scripts/process-assets.mjs`
 * reads it to know what each raw image is and what to make of it, `ASSETS.md`
 * is generated from it (with a ChatGPT prompt for every entry), and the game
 * finds the results through `assets/processed/index.json`.
 *
 * ## Sizes
 *
 * The game is built on a 320x180 screen — exactly one sixth of 1920x1080 — and
 * scaled up to fit the display. Every size here is in GAME pixels; the 1080p
 * size is that times `SCALE`. A character frame of 24x28 is 144x168 at 1080p.
 *
 * The pipeline keeps both: a 1080p master in `assets/processed/hd/`, and the
 * game-scale version the game draws today. The game-scale size must match what
 * the game expects (`src/config/sprites.ts`, `src/config/scenery.ts`) exactly,
 * because hitboxes are lined up against those frame sizes.
 *
 * ## Frames
 *
 * `frames` is the order the game expects them in the sheet. Do not reorder: the
 * game's animations are frame numbers into this list.
 */

/** 1080p pixels per game pixel. 1920 / 320. */
export const SCALE = 6;

/** The base resolution the art is described at. */
export const BASE = { width: 1920, height: 1080 };

// --------------------------------------------------------------------------
// The two brothers. Shared description, so all ten sheets agree.
// --------------------------------------------------------------------------

const MENDY =
  'Mendy, a slim, wiry teenage yeshiva bochur: black velvet kippah, long brown peyos hanging past his jaw, ' +
  'a bright, cheerful face, crisp white button-down shirt with the sleeves at the wrist, dark navy trousers and ' +
  'black shoes. Light on his feet — the quick one';

const BEREL =
  'Berel, a big, stocky, broad-shouldered teenage yeshiva bochur: black velvet kippah, thick dark-brown hair, long ' +
  'dark peyos, a round, good-natured face, white button-down shirt stretched across a heavy build, dark navy ' +
  'trousers and black shoes. Solid and strong — the heavy one';

const FORMS = {
  small: 'in his ordinary everyday look',
  cholent:
    'in his Cholent power form: puffed up round and heavy like a full cholent pot, noticeably wider and taller, ' +
    'cheeks puffed, warm orange-brown tinge to his shirt, a wisp of cholent steam rising from his shoulders',
  menorah:
    'in his Menorah power form: holding a small polished brass menorah out in front of him in one hand, its ' +
    'flames lit, a soft golden glow around it',
  lulav:
    'in his Lulav power form: gripping a lulav (a tall green palm-frond bundle with myrtle and willow leaves) in ' +
    'both hands like a baseball bat, resting on his shoulder',
  peyos:
    'in his Peyos power form: his long peyos flared out to the sides like rotor blades ready to spin, a look of ' +
    'determination. Bare kippah, no hat (the floating hat is drawn separately)',
};

/** What each of the eight frames of a character sheet shows. */
const CHARACTER_POSES = {
  idle: 'standing still, relaxed, facing right',
  'run-1': 'running, right foot forward, arms swinging (first of a three-frame run cycle)',
  'run-2': 'running, legs passing under the body, mid-stride (second run frame)',
  'run-3': 'running, left foot forward, arms swinging the other way (third run frame)',
  jump: 'jumping upward, knees tucked, one arm raised',
  fall: 'falling, legs dangling, both arms up',
  crouch: 'ducking low, crouched down to about half his standing height',
  hurt: 'knocked back, leaning away, wincing',
};

const CHARACTER_FRAMES = Object.keys(CHARACTER_POSES);

const character = (who, form, size) => {
  const id = `${who}_${form}`;
  return {
    id,
    title: `${who === 'mendy' ? 'Mendy' : 'Berel'} — ${form === 'small' ? 'Small' : form[0].toUpperCase() + form.slice(1)}`,
    priority: 1,
    group: 'characters',
    kind: 'sheet',
    url: `sprites/${id}.png`,
    size,
    frames: CHARACTER_FRAMES,
    poses: CHARACTER_POSES,
    layout: [4, 2],
    anchor: 'bottom',
    subject: `${who === 'mendy' ? MENDY : BEREL}, ${FORMS[form]}`,
  };
};

// --------------------------------------------------------------------------
// Everything else, by constructor.
// --------------------------------------------------------------------------

/** A sprite sheet. `poses` maps each frame name, in order, to what it shows. */
const sheet = (id, priority, group, size, subject, poses, extra = {}) => ({
  id,
  title: extra.title ?? id,
  priority,
  group,
  kind: 'sheet',
  url: extra.url ?? `sprites/${id}.png`,
  size,
  frames: Object.keys(poses),
  poses,
  layout: extra.layout ?? autoLayout(Object.keys(poses).length),
  anchor: extra.anchor ?? 'bottom',
  subject,
  ...(extra.note ? { note: extra.note } : {}),
  ...(extra.fill ? { fill: true } : {}),
  ...(extra.soft ? { soft: true } : {}),
});

/** A single still image (one frame). */
const still = (id, priority, group, size, subject, extra = {}) =>
  sheet(id, priority, group, size, subject, { idle: extra.pose ?? 'as described' }, extra);

/** A 16x16 terrain tile. Opaque, seamless, never trimmed. */
const tile = (id, priority, subject, extra = {}) => ({
  id,
  title: extra.title ?? id,
  priority,
  group: 'tiles',
  kind: 'tile',
  url: `tiles/${id}.png`,
  size: [16, 16],
  frames: ['tile'],
  subject,
  seeThrough: extra.seeThrough ?? false,
});

/** A parallax backdrop layer: full screen, seamless left to right. */
const backdrop = (id, priority, subject, layer, size = [320, 180]) => ({
  id,
  title: id,
  priority,
  group: 'backdrops',
  kind: 'backdrop',
  url: `sprites/backdrops/${id}.png`,
  size,
  frames: ['backdrop'],
  subject,
  layer,
});

function autoLayout(n) {
  if (n <= 4) return [n, 1];
  if (n <= 6) return [3, 2];
  return [4, Math.ceil(n / 4)];
}

// --------------------------------------------------------------------------

const P1 = 1; // Mendy and Berel
const P2 = 2; // World 1, Boro Park — and everything it needs to be played
const P3 = 3; // World 2, The Five Towns
const P4 = 4; // World 3, The Catskills
const P5 = 5; // World 4, Meah Shearim, and the Yetzer Hara

export const PRIORITIES = {
  1: 'Mendy and Berel',
  2: 'World 1 — Boro Park (and the boxes, coins, power-ups, HUD and title it needs)',
  3: 'World 2 — The Five Towns',
  4: 'World 3 — The Catskills',
  5: 'World 4 — Meah Shearim, and the Yetzer Hara',
};

const BORO_PARK_SKY = {
  day: 'a bright Brooklyn morning sky, soft blue with a few puffy clouds',
  dusk: 'a Brooklyn dusk sky, orange and pink fading to purple, first lights coming on',
  night: 'a Brooklyn night sky, deep navy with a few stars and a hazy city glow at the bottom',
};

const WORLD_LIGHT = {
  five_towns_day: 'bright suburban afternoon light',
  five_towns_dusk: 'warm suburban dusk light, long shadows, porch lights on',
  catskills_day: 'clear summer-camp daylight in the mountains',
  catskills_night: 'a dark summer night in the mountains, moonlight and a few lit bungalow windows',
  meah_shearim_day: 'bright Jerusalem sun, pale gold stone, hard shadows',
  meah_shearim_dusk: 'Jerusalem at dusk, rose-gold stone, lights coming on in windows',
};

export const ASSETS = [
  // ===== Priority 1: Mendy and Berel ======================================
  character('mendy', 'small', [24, 28]),
  character('mendy', 'cholent', [26, 36]),
  character('mendy', 'menorah', [26, 36]),
  character('mendy', 'lulav', [26, 36]),
  character('mendy', 'peyos', [26, 36]),
  character('berel', 'small', [26, 30]),
  character('berel', 'cholent', [28, 41]),
  character('berel', 'menorah', [28, 41]),
  character('berel', 'lulav', [28, 41]),
  character('berel', 'peyos', [28, 41]),
  still('peyos_hat', P1, 'characters', [12, 6],
    'a black yeshiva-style fedora hat floating on its own, seen from the side, brim level (the hat that hovers above the brothers in Peyos form)',
    { anchor: 'center', title: 'Peyos form — the floating hat' }),
  sheet('menorah_flame', P1, 'characters', [8, 8],
    'a small bouncing ball of menorah fire, golden-orange with a white-hot core (the Menorah form\'s projectile)',
    { 'burn-1': 'the flame, tall and round', 'burn-2': 'the flame, flickering wider' },
    { anchor: 'center', title: 'Menorah flame (projectile)', soft: true }),

  // ===== Priority 2: World 1, Boro Park, and what it needs =================
  still('title_logo', P2, 'ui', [160, 24],
    'the game\'s title logo, the words "BOCHUR BROS" in big chunky friendly pixel letters, cream with a dark outline and a warm gold drop shadow, a small kiddush cup dotting the space between the words',
    { anchor: 'center', url: 'sprites/ui/title_logo.png', title: 'Title logo', note: 'Shown at the top of the map screen in place of the plain text title.' }),
  sheet('hud_icons', P2, 'ui', [8, 8],
    'three tiny HUD icons',
    { coin: 'a gold tzedakah coin', life: 'a tiny kippah (lives)', clock: 'a tiny clock face' },
    { anchor: 'center', url: 'sprites/ui/hud_icons.png', title: 'HUD icons' }),
  sheet('map_node', P2, 'ui', [12, 12],
    'a round level marker for the world map',
    { locked: 'grey, with a small padlock', open: 'gold, glowing, ready to play', cleared: 'green with a white check mark' },
    { anchor: 'center', url: 'sprites/ui/map_node.png', title: 'World map node' }),
  still('map_path_dot', P2, 'ui', [4, 4], 'a single small round cream-coloured dot for the dotted path on the world map',
    { anchor: 'center', url: 'sprites/ui/map_path_dot.png', title: 'World map path dot' }),
  still('kiddush_table', P2, 'ui', [64, 32],
    'a small kiddush table with a white tablecloth, empty, seen from the front, where the recovered prizes are displayed',
    { url: 'sprites/ui/kiddush_table.png', title: 'Kiddush table (map)' }),
  sheet('prize_icons', P2, 'ui', [12, 12],
    'five tiny icons of the kiddush prizes',
    { meat_board: 'a wooden board of cold cuts', poppers: 'a pan of potato poppers', kugel: 'a square of golden kugel', tequila: 'a bottle of tequila', empty: 'an empty dashed outline' },
    { anchor: 'center', url: 'sprites/ui/prize_icons.png', title: 'Prize icons' }),
  sheet('coin', P2, 'shared', [8, 10],
    'a gold tzedakah coin spinning',
    { 'spin-1': 'face on', 'spin-2': 'turned a quarter', 'spin-3': 'edge on, a thin sliver', 'spin-4': 'turned three quarters' },
    { anchor: 'center', title: 'Tzedakah coin', soft: true }),
  still('mystery_box', P2, 'shared', [16, 16],
    'a mystery box: a square golden block with a dark border and a big bold question mark on its face', { title: 'Mystery box', fill: true }),
  still('box_used', P2, 'shared', [16, 16],
    'an empty, used-up mystery box: a dull brown square block with a plain border and no question mark', { title: 'Used box', fill: true }),
  still('reinforced_block', P2, 'shared', [16, 16],
    'a reinforced block: a heavy dark-grey stone block bound with iron bands and rivets — only Berel can break it', { title: 'Reinforced block', fill: true }),
  still('weak_floor', P2, 'shared', [16, 16],
    'a weak floor block: cracked old wooden planks, sagging — Berel ground-pounds through it', { title: 'Weak floor', fill: true }),
  still('crate', P2, 'shared', [16, 16],
    'a heavy wooden shipping crate with cross bracing — only Berel can push it', { title: 'Crate', fill: true }),
  still('powerup_pickup', P2, 'shared', [14, 14],
    'a covered cholent pot with a lid, a generic power-up (the game tints it per power)', { title: 'Power-up (generic pot)', soft: true }),
  still('powerup_cholent', P2, 'shared', [14, 14],
    'a power-up: a steaming covered cholent pot, warm brown and orange', { title: 'Power-up — Cholent', soft: true }),
  still('powerup_menorah', P2, 'shared', [14, 14],
    'a power-up: a small brass menorah with lit flames, glowing gold', { title: 'Power-up — Menorah', soft: true }),
  still('powerup_lulav', P2, 'shared', [14, 14],
    'a power-up: a lulav bundle — green palm frond with myrtle and willow', { title: 'Power-up — Lulav', soft: true }),
  still('powerup_peyos', P2, 'shared', [14, 14],
    'a power-up: a pair of curled peyos with a little black hat floating above them', { title: 'Power-up — Peyos', soft: true }),
  still('lchaim', P2, 'shared', [10, 14],
    'a L\'chaim: a small silver kiddush cup filled with red wine, a sparkle on the rim (the 1-up)', { title: "L'chaim (1-up)", soft: true }),
  sheet('checkpoint', P2, 'shared', [20, 36],
    'a checkpoint: a tzedakah pushke (charity box) on a short post',
    { off: 'the pushke dull and closed', on: 'the pushke lit up gold with a coin dropping in' },
    { title: 'Checkpoint' }),
  still('goal_meat_board', P2, 'world1', [36, 34],
    'the meat board: a wooden serving board piled with cold cuts, pickles and a little flag — World 1\'s stolen kiddush prize', { title: 'World 1 prize — the meat board' }),
  sheet('pigeon', P2, 'world1', [20, 16],
    'a grimy grey Brooklyn city pigeon',
    { perch: 'standing, puffed up', rear: 'rearing back, wings half open, about to dive', 'fly-1': 'flying, wings up', 'fly-2': 'flying, wings down', swoop: 'diving forward and down, wings swept back', squash: 'flattened, stomped, dizzy' },
    { title: 'Pigeon' }),
  sheet('rat', P2, 'world1', [20, 14],
    'a scruffy brown sewer rat with a long pink tail',
    { 'run-1': 'scurrying, legs stretched', 'run-2': 'scurrying, legs bunched', squash: 'flattened, stomped' },
    { title: 'Rat' }),
  still('cart', P2, 'world1', [26, 22], 'a runaway metal shopping cart, side view, one wobbly wheel', { title: 'Shopping cart' }),
  still('van', P2, 'world1', [50, 32], 'a battered white Brooklyn delivery van, side view, facing left', { title: 'Delivery van' }),
  still('scaffold_pipe', P2, 'world1', [16, 44], 'a single grey steel scaffolding pipe hanging upright, with a clamp at the top', { title: 'Falling scaffolding pipe' }),
  still('stroller', P2, 'world1', [28, 30], 'a big double baby stroller (a Boro Park "bugaboo"), side view, facing left, rolling', { title: 'Stroller (1-3 chase)' }),
  sheet('pigeon_king', P2, 'world1', [44, 38],
    'the Pigeon King: an enormous, grimy, puffed-up pigeon wearing a tiny crown, boss of World 1',
    { idle: 'perched, chest out, glaring', wings: 'wings spread wide, summoning his flock', dive: 'diving forward, wings swept back', hurt: 'stunned, feathers flying, crown askew' },
    { title: 'Boss — the Pigeon King' }),

  tile('brick', P2, 'red Brooklyn brownstone brick wall, a few darker bricks', { title: 'Brick' }),
  tile('sidewalk', P2, 'pale grey concrete sidewalk slab with a seam, seen from the front as a ground surface, the top edge a lighter kerb line', { title: 'Sidewalk' }),
  tile('asphalt', P2, 'dark grey asphalt road with a scattering of lighter grit', { title: 'Asphalt' }),
  tile('scaffold_pole', P2, 'a vertical grey steel scaffolding pole with a coupler', { title: 'Scaffold pole', seeThrough: true }),
  tile('scaffold_plank', P2, 'a horizontal wooden scaffolding plank, light wood, nailed', { title: 'Scaffold plank' }),
  tile('fire_escape', P2, 'a black iron fire-escape grating with railings', { title: 'Fire escape', seeThrough: true }),
  tile('awning', P2, 'a red-and-white striped shop awning, seen from the front', { title: 'Shop awning' }),
  tile('sewer_grate', P2, 'an iron sewer grate set in asphalt', { title: 'Sewer grate' }),
  tile('window', P2, 'a brownstone window: dark glass, cream frame, brick around it', { title: 'Window' }),
  ...['day', 'dusk', 'night'].flatMap((t) => [
    backdrop(`bg_sky_${t}`, P2, BORO_PARK_SKY[t], 'sky'),
    backdrop(`bg_sky_tall_${t}`, P2, `${BORO_PARK_SKY[t]}, taller, for the vertical climb level`, 'sky', [320, 360]),
    backdrop(`bg_skyline_${t}`, P2, `a distant Brooklyn skyline of apartment blocks and water towers in silhouette, ${t}`, 'far'),
    backdrop(`bg_street_${t}`, P2, `a Boro Park street of brownstones and shopfronts with Hebrew-lettered signs and awnings, ${t}`, 'near'),
  ]),

  // ===== Priority 3: World 2, The Five Towns =============================
  sheet('goose', P3, 'world2', [24, 26],
    'a big angry Canada goose, black neck, white chinstrap',
    { idle: 'standing tall', hiss: 'neck stretched out, beak open, hissing', run: 'charging forward, wings half out', angry: 'red-eyed and furious', squash: 'flattened, stomped' },
    { title: 'Goose' }),
  sheet('chipmunk', P3, 'world2', [16, 14],
    'a small striped chipmunk',
    { 'run-1': 'darting, legs stretched', 'run-2': 'darting, legs bunched', squash: 'flattened, stomped' },
    { title: 'Chipmunk' }),
  sheet('dog', P3, 'world2', [24, 22],
    'a small fluffy suburban dog behind a fence',
    { quiet: 'sitting, watching', bark: 'barking, mouth open, ears up' },
    { title: 'Dog' }),
  sheet('sprinkler', P3, 'world2', [16, 28],
    'a pop-up lawn sprinkler',
    { down: 'retracted into the grass', up: 'popped up, spraying a jet of water' },
    { title: 'Sprinkler' }),
  still('mower', P3, 'world2', [28, 20], 'a red ride-on lawn mower with no driver, side view, facing left', { title: 'Lawn mower' }),
  still('blower', P3, 'world2', [20, 20], 'a leaf blower on the ground, nozzle pointing left', { title: 'Leaf blower' }),
  still('wind_puff', P3, 'world2', [16, 8], 'a small white puff of blown wind with a couple of leaves', { anchor: 'center', title: 'Wind puff' }),
  sheet('trampoline', P3, 'world2', [36, 16],
    'a round backyard trampoline, side view',
    { idle: 'at rest', bounce: 'mat stretched down mid-bounce' },
    { title: 'Trampoline' }),
  sheet('gate', P3, 'world2', [20, 36],
    'a white picket backyard gate',
    { open: 'swung open', shut: 'closed and latched' },
    { title: 'Backyard gate' }),
  still('minivan', P3, 'world2', [56, 34], 'a silver family minivan, side view, facing left', { title: 'Minivan' }),
  sheet('escalade', P3, 'world2', [88, 46],
    'the Escalade: a huge black luxury SUV, side view facing right, a driver on the phone visible through the window — boss of World 2',
    { phase1: 'gleaming, undamaged', phase2: 'one dent in the roof, a cracked window', phase3: 'two dents, steaming, a hubcap missing', beaten: 'crumpled and smoking' },
    { title: 'Boss — the Escalade' }),
  still('goal_poppers', P3, 'world2', [36, 28], 'a foil pan of golden potato poppers — World 2\'s stolen kiddush prize', { title: 'World 2 prize — poppers' }),
  tile('five_towns_lawn', P3, 'neat green suburban lawn with a soil edge below', { title: 'Lawn' }),
  tile('five_towns_hedge', P3, 'a trimmed green box hedge', { title: 'Hedge' }),
  tile('five_towns_siding', P3, 'pale vinyl house siding, horizontal boards', { title: 'Siding' }),
  tile('five_towns_shingle', P3, 'grey asphalt roof shingles', { title: 'Roof shingle' }),
  tile('five_towns_driveway', P3, 'a smooth light-grey concrete driveway', { title: 'Driveway' }),
  tile('five_towns_fence', P3, 'a white picket fence', { title: 'Picket fence', seeThrough: true }),
  tile('five_towns_pool_water', P3, 'bright turquoise swimming-pool water with ripples', { title: 'Pool water' }),
  tile('five_towns_pool_tile', P3, 'small blue-and-white pool-edge tiles', { title: 'Pool tile' }),
  tile('five_towns_deck', P3, 'a warm wooden backyard deck', { title: 'Deck' }),
  ...['five_towns_day', 'five_towns_dusk'].flatMap((v) => [
    backdrop(`bg_sky_${v}`, P3, `a suburban Long Island sky, ${WORLD_LIGHT[v]}`, 'sky'),
    backdrop(`bg_far_${v}`, P3, `distant leafy trees and rooftops of a Five Towns suburb in silhouette, ${WORLD_LIGHT[v]}`, 'far'),
    backdrop(`bg_near_${v}`, P3, `big suburban houses with lawns and two-car garages, ${WORLD_LIGHT[v]}`, 'near'),
  ]),

  // ===== Priority 4: World 3, The Catskills ==============================
  sheet('raccoon', P4, 'world3', [22, 15],
    'a masked raccoon thief',
    { 'run-1': 'running, legs stretched', 'run-2': 'running, legs bunched' },
    { title: 'Raccoon' }),
  still('wasp', P4, 'world3', [12, 12], 'a fat angry yellow-and-black wasp', { anchor: 'center', title: 'Wasp' }),
  sheet('frog', P4, 'world3', [16, 12],
    'a round green lake frog',
    { idle: 'sitting', leap: 'mid-leap, legs stretched out' },
    { title: 'Frog' }),
  sheet('mosquito_swarm', P4, 'world3', [20, 12],
    'a small dark cloud of mosquitoes',
    { 'buzz-1': 'the swarm bunched up', 'buzz-2': 'the swarm spread out' },
    { anchor: 'center', title: 'Mosquito swarm' }),
  still('golf_cart', P4, 'world3', [28, 20], 'a white bungalow-colony golf cart with a canopy, side view, facing left', { title: 'Golf cart' }),
  still('canoe', P4, 'world3', [32, 11], 'a red wooden canoe, side view, floating level', { title: 'Canoe' }),
  still('clothesline_post', P4, 'world3', [12, 20], 'a short wooden T-shaped clothesline post', { title: 'Clothesline post' }),
  sheet('porch_step', P4, 'world3', [16, 16],
    'a rotting wooden porch step',
    { ok: 'old but whole', cracked: 'cracked through, about to give way' },
    { title: 'Porch step' }),
  still('rope_swing', P4, 'world3', [10, 22], 'a frayed rope with a knot at the bottom, hanging straight', { anchor: 'center', title: 'Rope swing' }),
  sheet('bear', P4, 'world3', [34, 42],
    'a big brown black-bear who lives behind the canteen dumpster — boss of World 3',
    { walk: 'on all fours, prowling', rear: 'reared up on hind legs, claws out, swiping', hurt: 'dazed, stars around its head' },
    { title: 'Boss — the Bear' }),
  still('goal_kugel', P4, 'world3', [28, 28], 'a pan of golden-brown kugel — World 3\'s stolen kiddush prize', { title: 'World 3 prize — kugel' }),
  tile('catskills_lawn', P4, 'rough green summer-camp grass with clover', { title: 'Colony lawn' }),
  tile('catskills_dirt', P4, 'brown packed dirt with pebbles', { title: 'Dirt' }),
  tile('catskills_shingle', P4, 'old green bungalow roof shingles', { title: 'Bungalow shingle' }),
  tile('catskills_porch_wood', P4, 'weathered grey porch planks', { title: 'Porch wood' }),
  tile('catskills_bungalow_wall', P4, 'white-painted bungalow clapboard wall, a little peeling', { title: 'Bungalow wall' }),
  tile('catskills_leaves', P4, 'dense green tree leaves', { title: 'Leaves', seeThrough: true }),
  tile('catskills_trunk', P4, 'a brown tree trunk with bark', { title: 'Trunk' }),
  tile('catskills_mud', P4, 'thick wet brown mud', { title: 'Mud' }),
  tile('catskills_lake', P4, 'dark blue-green lake water with ripples', { title: 'Lake water' }),
  ...['catskills_day', 'catskills_night'].flatMap((v) => [
    backdrop(`bg_sky_${v}`, P4, `a mountain sky over the Catskills, ${WORLD_LIGHT[v]}`, 'sky'),
    backdrop(`bg_far_${v}`, P4, `distant wooded Catskill mountains in silhouette, ${WORLD_LIGHT[v]}`, 'far'),
    backdrop(`bg_near_${v}`, P4, `a row of little white summer-colony bungalows among pine trees, ${WORLD_LIGHT[v]}`, 'near'),
  ]),

  // ===== Priority 5: World 4, Meah Shearim, and the Yetzer Hara ==========
  sheet('cat', P5, 'world4', [22, 16],
    'a scrawny Jerusalem alley cat',
    { sit: 'sitting on a wall, tail curled', 'run-1': 'darting, legs stretched', 'run-2': 'darting, legs bunched', hiss: 'back arched, hissing' },
    { title: 'Cat' }),
  sheet('gecko', P5, 'world4', [16, 9],
    'a small sandy-coloured gecko seen from the side, lying flat (the game turns it to climb walls)',
    { 'crawl-1': 'legs out one way', 'crawl-2': 'legs out the other way' },
    { anchor: 'center', title: 'Gecko' }),
  sheet('sparrow', P5, 'world4', [16, 11],
    'a quick little brown house sparrow',
    { 'flap-1': 'wings up', 'flap-2': 'wings down' },
    { anchor: 'center', title: 'Sparrow' }),
  still('pashkevil', P5, 'world4', [8, 8], 'a small crumpled paper poster (a pashkevil) blowing in the wind, with tiny black Hebrew-style lettering', { anchor: 'center', title: 'Pashkevil' }),
  still('laundry_line', P5, 'world4', [16, 8], 'a short stretch of washing line with a white sheet and a small shirt pegged on it', { anchor: 'center', title: 'Laundry on the line' }),
  still('solar_tank', P5, 'world4', [24, 16], 'a white cylindrical rooftop solar water tank (a dud shemesh) lying on its side on a little frame', { title: 'Solar water tank' }),
  still('shuk_cart', P5, 'world4', [28, 17], 'a wooden shuk market handcart loaded with crates of vegetables, side view', { title: 'Shuk cart' }),
  still('shuk_crate', P5, 'world4', [16, 16], 'a wooden market crate full of oranges', { title: 'Shuk crate' }),
  sheet('yetzer_hara', P5, 'world4', [44, 46],
    'the Yetzer Hara, a shape-shifting shadow with no true form, drawn in dark smoke and deep purple — the final boss',
    { 'smoke-1': 'a formless dark smoke shape with two glowing eyes', 'smoke-2': 'the same smoke shape, swirling the other way', 'as-pigeon-king': 'wearing the shape of the Pigeon King, in purple smoke', 'as-escalade': 'wearing the shape of the Escalade, in purple smoke', 'as-bear': 'wearing the shape of the Bear, in purple smoke' },
    { title: 'Final boss — the Yetzer Hara' }),
  still('goal_tequila', P5, 'world4', [24, 26], 'a bottle of tequila with a red cap — the final stolen kiddush prize', { title: 'World 4 prize — tequila' }),
  tile('meah_shearim_stone', P5, 'pale gold Jerusalem limestone blocks', { title: 'Stone' }),
  tile('meah_shearim_stone_worn', P5, 'old worn Jerusalem stone paving, smoothed by feet', { title: 'Worn stone' }),
  tile('meah_shearim_stone_stair', P5, 'a Jerusalem stone stair step', { title: 'Stone stair' }),
  tile('meah_shearim_arch', P5, 'the top of a Jerusalem stone archway, a keystone in the middle', { title: 'Arch' }),
  tile('meah_shearim_rooftop', P5, 'a flat Jerusalem rooftop surface with a low parapet edge', { title: 'Rooftop' }),
  tile('meah_shearim_deck', P5, 'old wooden boards of a balcony', { title: 'Balcony deck' }),
  tile('meah_shearim_awning_ms', P5, 'a faded green-and-cream fabric shuk awning', { title: 'Shuk awning' }),
  tile('meah_shearim_sand', P5, 'pale sandy ground', { title: 'Sand' }),
  tile('meah_shearim_dirt', P5, 'dry reddish-brown dirt', { title: 'Dirt' }),
  ...['meah_shearim_day', 'meah_shearim_dusk'].flatMap((v) => [
    backdrop(`bg_sky_${v}`, P5, `a Jerusalem sky, ${WORLD_LIGHT[v]}`, 'sky'),
    backdrop(`bg_far_${v}`, P5, `distant Jerusalem hills and domes in silhouette, ${WORLD_LIGHT[v]}`, 'far'),
    backdrop(`bg_near_${v}`, P5, `old stone buildings of Meah Shearim with arched windows, balconies and laundry lines, ${WORLD_LIGHT[v]}`, 'near'),
  ]),
];

// ---------------------------------------------------------------------------
// The prompts.
// ---------------------------------------------------------------------------

const OPENER = 'Match the Bochur Bros style exactly, using my reference images.';

const STYLE =
  'Style: 16-bit SNES-era pixel art. Big, chunky, crisp square pixels, every pixel a solid block of one colour, ' +
  'dark one-pixel outlines, a limited palette, flat shading with one highlight and one shadow tone. ' +
  'No anti-aliasing, no blur, no gradients, no painterly texture, no 3D render.';

const TRANSPARENT_RULES =
  'Background rules: a PNG with a real transparent background (alpha channel). Nothing behind the subject — no ' +
  'floor, no ground shadow, no scenery, no frame or border, no text, labels, numbers or watermark. If you cannot ' +
  'make the background transparent, fill the entire background with one flat solid pure magenta, #FF00FF ' +
  '(no gradient, no shading, no shadow), and do not use that magenta anywhere in the artwork itself.';

const TILE_RULES = (seeThrough) =>
  'Background rules: the tile fills the whole square edge to edge and is seamless on all four sides, so copies ' +
  'placed side by side and on top of each other join with no visible seam. Flat, front-on view. ' +
  (seeThrough
    ? 'The gaps in it (between rails, bars or leaves) must be transparent — a real alpha channel; if you cannot ' +
      'do transparency, fill only those gaps with one flat solid pure magenta, #FF00FF, and use that magenta ' +
      'nowhere else. No border, no text, no watermark.'
    : 'Every pixel is opaque — no transparent areas, no border, no text, no watermark, no magenta.');

const BACKDROP_RULES = (layer) =>
  layer === 'sky'
    ? 'Background rules: this is the furthest layer, so it is fully opaque and fills the whole image edge to edge. ' +
      'It must tile seamlessly left to right: the left edge continues exactly from the right edge. No border, no ' +
      'text, no watermark, no magenta.'
    : 'Background rules: everything above the skyline is a real transparent background (alpha channel), so the ' +
      'sky layer behind shows through; the bottom of the image is filled solid. It must tile seamlessly left to ' +
      'right: the left edge continues exactly from the right edge. No border, no text, no watermark. If you cannot ' +
      'make the sky transparent, fill it with one flat solid pure magenta, #FF00FF, and use that magenta nowhere ' +
      'else in the artwork.';

/** The ready-to-paste ChatGPT prompt for one asset. */
export function promptFor(asset) {
  const [w, h] = asset.size;
  const hd = `${w * SCALE}x${h * SCALE}`;
  if (asset.kind === 'tile') {
    return [
      OPENER,
      `Draw one square terrain tile for a side-scrolling platformer: ${asset.subject}.`,
      STYLE,
      `Square image. It will be scaled to ${hd} px at 1920x1080 (16x16 game pixels), so keep the detail bold and readable at that size.`,
      TILE_RULES(asset.seeThrough),
    ].join('\n\n');
  }
  if (asset.kind === 'backdrop') {
    const what = { sky: 'the far sky layer', far: 'the distant middle layer', near: 'the nearest background layer' }[asset.layer];
    return [
      OPENER,
      `Draw ${what} of a parallax background for a side-scrolling platformer: ${asset.subject}.`,
      STYLE,
      `Wide landscape image in a ${w}:${h} ratio. It will be scaled to ${hd} px at 1920x1080. Keep it calm and slightly muted so the characters stand out in front of it. No people.`,
      BACKDROP_RULES(asset.layer),
    ].join('\n\n');
  }
  const n = asset.frames.length;
  const [cols, rows] = asset.layout;
  const lines = [OPENER, `Draw ${asset.subject}.`, STYLE];
  if (n === 1) {
    lines.push(
      `One single image of it, side view${asset.anchor === 'bottom' ? ', standing on an invisible baseline' : ''}, ` +
        `centred, whole and uncropped. Its proportions should fit a ${w}:${h} box — it will be scaled to ${hd} px at 1920x1080.`,
    );
  } else {
    const list = asset.frames.map((f, i) => `${i + 1}. ${f} — ${asset.poses[f]}`).join('\n');
    lines.push(
      `Make ONE image that is a sprite sheet of ${n} frames, laid out in a grid of ${cols} column${cols > 1 ? 's' : ''} ` +
        `and ${rows} row${rows > 1 ? 's' : ''}, in this exact order (left to right, then top to bottom):\n${list}`,
      `Every frame shows the same ${asset.group === 'characters' ? 'character' : 'subject'} at exactly the same scale, ` +
        `side view facing right, whole and uncropped${asset.anchor === 'bottom' ? ', with the feet (or base) on the same invisible baseline in every frame' : ', centred in its cell'}. ` +
        `Leave clear empty space between frames so no two frames touch. Each frame should fit a ${w}:${h} box — ` +
        `each will be scaled to ${hd} px at 1920x1080.`,
    );
  }
  lines.push(TRANSPARENT_RULES);
  return lines.join('\n\n');
}

/** Sizes at 1080p. */
export const hdSize = (asset) => [asset.size[0] * SCALE, asset.size[1] * SCALE];
