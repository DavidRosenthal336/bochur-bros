/**
 * Batches: many assets in one ChatGPT image, so the art takes a dozen requests
 * instead of a hundred.
 *
 * A sprite batch is one image with one row per asset, each row holding that
 * asset's frames left to right. A backdrop batch is one tall image of three
 * panels stacked: sky on top, the far layer, the near layer. Drop the image in
 * assets/raw/batches/ named `<batch id>.png`; `npm run assets` cuts it up into
 * the per-asset raw files (in assets/raw/from-batches/) and processes those as
 * if they had been drawn one by one. A raw file dropped in assets/raw/ under an
 * asset's own name still wins over its batch row, so one bad row can be redone
 * on its own.
 */
import { ASSETS, OPENER, STYLE } from './manifest.mjs';

const sprites = (id, title, rows, note) => ({ id, title, kind: 'sprites', rows, ...(note ? { note } : {}) });
const backdrops = (id, title, panels) => ({ id, title, kind: 'backdrops', rows: panels });

export const BATCHES = [
  sprites('batch_menus', 'Map screen and title', ['title_logo', 'kiddush_table', 'prize_icons', 'map_node']),
  sprites('batch_blocks', 'Blocks and the plain power-up', ['reinforced_block', 'weak_floor', 'crate', 'powerup_pickup'],
    'The three blocks are perfect squares that fill their square edge to edge.'),
  backdrops('batch_w1_background', 'World 1 background (Boro Park, day)', ['bg_sky_day', 'bg_skyline_day', 'bg_street_day']),
  sprites('batch_w2_creatures', 'World 2 creatures and traps', ['goose', 'chipmunk', 'dog', 'sprinkler', 'trampoline', 'gate']),
  sprites('batch_w2_things', 'World 2 vehicles, boss and prize', ['escalade', 'minivan', 'mower', 'blower', 'wind_puff', 'goal_poppers']),
  backdrops('batch_w2_background', 'World 2 background (Five Towns, day)', ['bg_sky_five_towns_day', 'bg_far_five_towns_day', 'bg_near_five_towns_day']),
  sprites('batch_w3_creatures', 'World 3 creatures and boss', ['bear', 'raccoon', 'frog', 'wasp', 'mosquito_swarm']),
  sprites('batch_w3_things', 'World 3 objects and prize', ['golf_cart', 'canoe', 'rope_swing', 'clothesline_post', 'porch_step', 'goal_kugel']),
  backdrops('batch_w3_background', 'World 3 background (Catskills, day)', ['bg_sky_catskills_day', 'bg_far_catskills_day', 'bg_near_catskills_day']),
  sprites('batch_w4_creatures', 'World 4 creatures and the final boss', ['yetzer_hara', 'cat', 'sparrow', 'gecko']),
  sprites('batch_w4_things', 'World 4 objects and prize', ['shuk_cart', 'shuk_crate', 'solar_tank', 'laundry_line', 'pashkevil', 'goal_tequila']),
  backdrops('batch_w4_background', 'World 4 background (Meah Shearim, day)', ['bg_sky_meah_shearim_day', 'bg_far_meah_shearim_day', 'bg_near_meah_shearim_day']),
];

const asset = (id) => {
  const a = ASSETS.find((x) => x.id === id);
  if (!a) throw new Error(`batches.mjs: no asset "${id}" in the manifest`);
  return a;
};

for (const b of BATCHES) b.rows.forEach(asset);

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** One row of a sprite batch, in words. */
function rowLine(a, i) {
  const what = `Row ${i + 1}: ${a.title.replace(/^.*? — /, '')}. ${capital(a.subject)}.`;
  if (a.frames.length === 1) return `${what} 1 frame.`;
  return `${what} ${a.frames.length} frames: ${a.frames.map((f) => a.poses[f]).join(' · ')}.`;
}

/** The ready-to-paste ChatGPT prompt for one batch. */
export function batchPrompt(batch) {
  const rows = batch.rows.map(asset);
  if (batch.kind === 'backdrops') {
    const [sky, far, near] = rows;
    return [
      OPENER + ' The last reference image shows the game\'s current background: redraw each of its layers in the better style, keeping the same layout.',
      STYLE,
      'Make ONE tall image made of exactly 3 wide panels stacked on top of each other, each panel exactly one third of the ' +
        'image\'s height, with no gap and no border between them. They are the 3 layers of a side-scrolling background. ' +
        'Side-on view, no people, no text. Every panel must repeat seamlessly left to right (its left edge continues its right edge).',
      `Top panel, the sky: ${sky.subject}. Fills the whole panel, fully opaque.`,
      `Middle panel, the distance: ${far.subject}. Transparent above the shapes, so the sky shows through.`,
      `Bottom panel, close up: ${near.subject}. Transparent above the rooftops and in any gaps between buildings.`,
      'Keep the colours calm and slightly muted, so the characters stand out in front.',
    ].join('\n\n');
  }
  return [
    OPENER + ' The last reference image shows the current version of each row: redraw them in the better style.',
    STYLE,
    `Make ONE image on a fully transparent background with exactly ${rows.length} rows, one row per thing below, ` +
      'with clear empty space between the rows. In each row put its frames left to right, evenly spaced, all at the same ' +
      'scale, not touching. Everything that moves faces right. No text, no labels, no numbers, no ground, no shadows.',
    rows.map(rowLine).join('\n'),
    ...(batch.note ? [batch.note] : []),
  ].join('\n\n');
}
