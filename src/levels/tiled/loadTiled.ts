import type { EnemyKind } from '../../config/enemies';
import type { HazardKind } from '../../config/hazards';
import { TILE } from '../../config/Tuning';
import type { BlockContents, BlockKind } from '../../entities/Block';
import type {
  BlockPlacement,
  EnemyPlacement,
  HazardPlacement,
  LabelDef,
  LevelDef,
  SolidDef,
  SolidKind,
  TilePoint,
} from '../LevelDef';
import type { TiledMap, TiledObject, TiledObjectLayer, TiledProperty } from './TiledTypes';

/**
 * Turns a Tiled map into the shape the game already understood.
 *
 * This is the whole point of the milestone: the game's idea of a level does
 * not change, only where one comes from. Adding a level is adding a `.tmj`
 * file — `src/levels/index.ts` discovers them and nothing in the scene code
 * knows a level's name.
 */
export function levelFromTiled(key: string, map: TiledMap): LevelDef {
  const tile = map.tilewidth;
  if (tile !== TILE || map.tileheight !== TILE) {
    throw new Error(`${key}: map is ${map.tilewidth}x${map.tileheight} per tile, expected ${TILE}`);
  }

  const solids: SolidDef[] = [];
  const labels: LabelDef[] = [];
  const coins: TilePoint[] = [];
  const blocks: BlockPlacement[] = [];
  const enemies: EnemyPlacement[] = [];
  const crates: TilePoint[] = [];
  const hazards: HazardPlacement[] = [];
  const checkpoints: TilePoint[] = [];
  let spawn: TilePoint = { x: 2, y: map.height - 8 };
  let goal: TilePoint | undefined;

  for (const layer of map.layers) {
    if (layer.type !== 'objectgroup') continue;
    const objects = (layer as TiledObjectLayer).objects;

    if (layer.name === 'solids') {
      for (const object of objects) {
        solids.push({
          x: object.x / tile,
          y: object.y / tile,
          w: object.width / tile,
          h: object.height / tile,
          kind: (readString(object, 'kind') as SolidKind | undefined) ?? 'ground',
        });
      }
      continue;
    }

    for (const object of objects) {
      const kind = object.class ?? object.type ?? object.name;
      // Point objects sit where they are; rectangles are read from their
      // top-left, so a one-tile object lands on the tile you drew it on.
      const x = Math.round(object.x / tile);
      const y = Math.round(object.y / tile);

      switch (kind) {
        case 'spawn':
          spawn = { x, y };
          break;
        case 'goal':
          goal = { x, y };
          break;
        case 'checkpoint':
          checkpoints.push({ x, y });
          break;
        case 'coin':
          coins.push({ x, y });
          break;
        case 'crate':
          crates.push({ x, y });
          break;
        case 'block':
          blocks.push({
            x,
            y,
            kind: (readString(object, 'block') as BlockKind | undefined) ?? 'brick',
            contents: (readString(object, 'contents') as BlockContents | undefined) ?? 'coin',
          });
          break;
        case 'enemy':
          enemies.push({
            x,
            y,
            kind: (readString(object, 'enemy') as EnemyKind | undefined) ?? 'pigeon',
          });
          break;
        case 'wind':
          hazards.push({
            x,
            y,
            w: Math.round(object.width / tile),
            h: Math.round(object.height / tile),
            kind: 'wind' as HazardKind,
            direction: readNumber(object, 'direction') === 1 ? 1 : -1,
          });
          break;
        case 'label':
          labels.push({ x, y, text: readString(object, 'text') ?? object.name });
          break;
        default:
          // An unknown class is a level-authoring mistake, and a silent one is
          // worse than a loud one.
          console.warn(`${key}: ignoring object of unknown class "${kind}"`);
      }
    }
  }

  return {
    key,
    name: readMapString(map, 'name') ?? key,
    widthInTiles: map.width,
    heightInTiles: map.height,
    spawn,
    backgroundColor: Number(readMapString(map, 'backgroundColor') ?? '0x151a2c'),
    solids,
    labels,
    coins,
    blocks,
    enemies,
    crates,
    hazards,
    checkpoints,
    ...(goal ? { goal } : {}),
  };
}

function find(properties: readonly TiledProperty[] | undefined, name: string): TiledProperty | undefined {
  return properties?.find((property) => property.name === name);
}

function readString(object: TiledObject, name: string): string | undefined {
  const property = find(object.properties, name);
  return property === undefined ? undefined : String(property.value);
}

function readNumber(object: TiledObject, name: string): number | undefined {
  const property = find(object.properties, name);
  return property === undefined ? undefined : Number(property.value);
}

function readMapString(map: TiledMap, name: string): string | undefined {
  const property = find(map.properties, name);
  return property === undefined ? undefined : String(property.value);
}
