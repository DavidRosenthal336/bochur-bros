/**
 * Converts a LevelDef — the shape the game has used since Milestone 1 — into a
 * Tiled `.tmj` map.
 *
 * Geometry goes into a "solids" object layer and everything else into an
 * "entities" layer, tagged with Tiled's Class field. No tileset is referenced,
 * because greybox terrain is rectangles and a rectangle is an object.
 */
export const TILE = 16;

const prop = (name, value) => ({
  name,
  type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
  value,
});

export function levelDefToTiled(def) {
  let nextId = 1;
  const rect = (x, y, w, h, klass, properties) => ({
    id: nextId++,
    name: '',
    class: klass,
    x: Math.round(x * TILE),
    y: Math.round(y * TILE),
    width: Math.round(w * TILE),
    height: Math.round(h * TILE),
    rotation: 0,
    visible: true,
    ...(properties && properties.length ? { properties } : {}),
  });

  const solids = def.solids.map((s) => rect(s.x, s.y, s.w, s.h, '', [prop('kind', s.kind ?? 'ground')]));

  const entities = [];
  entities.push(rect(def.spawn.x, def.spawn.y, 1, 1, 'spawn'));
  if (def.goal) entities.push(rect(def.goal.x, def.goal.y, 1, 1, 'goal'));
  for (const c of def.checkpoints ?? []) entities.push(rect(c.x, c.y, 1, 1, 'checkpoint'));
  for (const c of def.coins ?? []) entities.push(rect(c.x, c.y, 1, 1, 'coin'));
  for (const c of def.crates ?? []) entities.push(rect(c.x, c.y, 1, 1, 'crate'));
  for (const b of def.blocks ?? [])
    entities.push(rect(b.x, b.y, 1, 1, 'block', [prop('block', b.kind), prop('contents', b.contents ?? 'coin')]));
  for (const e of def.enemies ?? []) entities.push(rect(e.x, e.y, 1, 1, 'enemy', [prop('enemy', e.kind)]));
  for (const h of def.hazards ?? [])
    entities.push(rect(h.x, h.y, h.w || 1, h.h || 1, h.kind, [prop('direction', h.direction)]));
  for (const b of def.bouncers ?? []) {
    entities.push(
      rect(b.x, b.y, b.w, 1, 'bounce', [
        ...(b.kind ? [prop('kind', b.kind)] : []),
        ...(b.periodMs === undefined ? [] : [prop('periodMs', String(b.periodMs))]),
        ...(b.offsetMs === undefined ? [] : [prop('offsetMs', String(b.offsetMs))]),
      ]),
    );
  }
  for (const p of def.perches ?? []) entities.push(rect(p.x, p.y, 1, 1, 'perch'));
  if (def.boss) entities.push(rect(def.boss.x, def.boss.y, 1, 1, 'boss'));
  if (def.thief) entities.push(rect(def.thief.x, def.thief.y, 1, 1, 'thief'));
  for (const l of def.labels ?? []) entities.push(rect(l.x, l.y, 1, 1, 'label', [prop('text', l.text)]));

  return {
    compressionlevel: -1,
    width: def.widthInTiles,
    height: def.heightInTiles,
    tilewidth: TILE,
    tileheight: TILE,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    type: 'map',
    version: '1.10',
    nextlayerid: 3,
    nextobjectid: nextId,
    tilesets: [],
    properties: [
      prop('name', def.name),
      prop('backgroundColor', '0x' + def.backgroundColor.toString(16).padStart(6, '0')),
      ...(def.groundRow === undefined ? [] : [prop('groundRow', String(def.groundRow))]),
      ...(def.autoScroll === undefined ? [] : [prop('autoScroll', String(def.autoScroll))]),
      ...(def.autoScrollUp === undefined ? [] : [prop('autoScrollUp', String(def.autoScrollUp))]),
      ...(def.backdrop === undefined ? [] : [prop('backdrop', def.backdrop)]),
    ],
    layers: [
      { id: 1, name: 'solids', type: 'objectgroup', draworder: 'index', opacity: 1, visible: true, x: 0, y: 0, objects: solids },
      { id: 2, name: 'entities', type: 'objectgroup', draworder: 'index', opacity: 1, visible: true, x: 0, y: 0, objects: entities },
    ],
  };
}
