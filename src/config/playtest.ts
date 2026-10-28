/**
 * Playtest switches: things the developer wants while playing the game that
 * a player should never see.
 *
 * `ALL_LEVELS_OPEN` — every level on the map can be entered, cleared or not.
 * On by default in the playtest build (`npm run build:playtest` sets
 * `VITE_OPEN_LEVELS=1`), because every change to a level came with a fresh
 * save and a walk back from 1-1 to get to it. Anywhere else, `?levels=all`
 * on the URL does the same for one visit. The save file is untouched either
 * way: clearing a level still records it, and the real order still decides
 * where the map's marker starts.
 */
const params = typeof location === 'undefined' ? undefined : new URLSearchParams(location.search);

export const ALL_LEVELS_OPEN = import.meta.env.VITE_OPEN_LEVELS === '1' || params?.get('levels') === 'all';
