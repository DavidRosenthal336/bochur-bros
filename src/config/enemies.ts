/**
 * Enemy definitions.
 *
 * §11 asks for "one enemy system with configurable behaviors rather than a
 * bespoke class per creature", so an enemy is a row in this table plus, later,
 * a sprite. Adding the rats, geese, chipmunks and cats means adding entries
 * here — not new classes.
 *
 * The behaviour kinds named in §11 are patrol, dive, chase, emerge-on-timer and
 * thief. Milestone 2 implements the first two; the rest land with the worlds
 * that need them.
 */
import type { ActorSpriteName } from './sprites';

export type EnemyBehaviorKind =
  | 'patrol'
  | 'dive'
  | 'emerge'
  | 'chase'
  | 'thief'
  | 'hop'
  | 'drift'
  | 'dart'
  | 'cling'
  | 'flutter';

export interface EnemyConfig {
  readonly label: string;
  readonly behavior: EnemyBehaviorKind;
  /**
   * Which drawn sheet to use, if one exists. Leave it off and the enemy is a
   * tinted rectangle of exactly its hitbox size, which is how a creature gets
   * built and tuned before it gets drawn.
   */
  readonly art?: ActorSpriteName;
  /** Cruising speed, px/s. */
  readonly speed: number;
  /** Stomps needed to put it down. Geese take two (§6, World 2). */
  readonly hits: number;
  /** Can it be stomped at all? Mosquito swarms cannot (§6, World 3). */
  readonly stompable: boolean;
  /**
   * What landing on it throws you upward at, px/s, if that is more than a stomp.
   *
   * §6 calls frogs "bounceable", and in a game with no double jump that word
   * means a creature is a way to get somewhere you otherwise could not. A stomp
   * is worth 260 and gets you nothing; this is for the ones where the bounce is
   * the point. Left off, a stomp is a stomp.
   */
  readonly bounceVelocity?: number;
  /**
   * What touching it costs you.
   *
   * `hurt` is the default and the only thing World 1 and 2 have: contact drops
   * a power tier, or a life at the bottom. `steal` is the raccoon — it takes
   * the power-up itself and runs off with it, which costs a tier and no life,
   * and costs a player who has nothing to take precisely nothing. §6 describes
   * the raccoon entirely as a thief and never as a danger, and a thief that
   * kills you when your pockets are empty is a different animal.
   */
  readonly contact?: 'hurt' | 'steal';
  /** Does gravity apply? Fliers say no and hold their altitude. */
  readonly affectedByGravity: boolean;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly color: number;
  /** How far either side of its spawn it patrols, px. */
  readonly patrolRange: number;
  /** Extra settings for `emerge`: hiding, then scurrying out on a timer (§6). */
  readonly emerge?: {
    /** How long it stays out of sight between appearances, ms. */
    readonly hiddenMs: number;
    /** How long it takes to climb out, ms. This is the warning. */
    readonly risingMs: number;
    /** How long it runs for before it is gone, ms. */
    readonly runMs: number;
  };
  /** Extra settings for `dive`. */
  /**
   * Walks at you on the ground and does not stop (§6's geese).
   *
   * Distinct from `dive`, which is a single committed attack with a recovery
   * afterwards. A chaser has no attack and no recovery — it simply arrives,
   * and the answer is to go somewhere it cannot follow or to stand on it.
   */
  readonly chase?: {
    /** How close you have to get before it notices, px. */
    readonly triggerRange: number;
    /** How long it stands and hisses before setting off, ms. The tell. */
    readonly hissMs: number;
    /** Chasing speed, px/s. */
    readonly speed: number;
  };
  /**
   * Extra settings for `cling`: §6's geckos, which "cling to stone walls,
   * scurry when approached".
   */
  readonly cling?: {
    /** How far it creeps up and down the wall, either side of where it was put, px. */
    readonly range: number;
    /** How close you have to come before it bolts, px. */
    readonly triggerRange: number;
    /** How fast it bolts, px/s. */
    readonly scurrySpeed: number;
    /** How long it keeps bolting, ms. */
    readonly scurryMs: number;
  };
  /**
   * Extra settings for `dart`: §6's cats, "darting across the player's path".
   */
  readonly dart?: {
    /** How close you have to come, sideways, before it goes, px. */
    readonly triggerRange: number;
    /** The hiss before the dash, ms. The tell. */
    readonly hissMs: number;
    /** How long the dash lasts, ms. */
    readonly runMs: number;
    /** How long it sits afterwards before it will go again, ms. */
    readonly restMs: number;
  };
  /**
   * Extra settings for `drift`: §6's mosquito swarms, which "drift toward the
   * player as a cloud".
   */
  readonly drift?: {
    /** How close you have to be before it notices you, px. */
    readonly triggerRange: number;
    /** How far it wobbles about its line of travel, px. It is a cloud. */
    readonly wobble: number;
  };
  /**
   * Extra settings for `flutter`: §6's sparrows, "quick and erratic, hard to hit".
   */
  readonly flutter?: {
    /** How far from where it was put it will wander, px. */
    readonly leash: number;
    /** Shortest and longest it keeps one heading before picking another, ms. */
    readonly minMs: number;
    readonly maxMs: number;
  };
  /**
   * Extra settings for `hop`: §6's frogs, which "hop in arcs near the lake".
   */
  readonly hop?: {
    /** How long it sits between hops, ms. A frog is mostly a thing that sits. */
    readonly restMs: number;
    /** Sideways speed during a hop, px/s. */
    readonly speedX: number;
    /** Upward launch, px/s. This and gravity decide how high the arc goes. */
    readonly speedY: number;
  };
  /**
   * Extra settings for `thief`: §6's raccoon, which "steals the player's
   * power-up and bolts under a porch".
   */
  readonly steal?: {
    /** How fast it runs off with it, px/s. */
    readonly fleeSpeed: number;
    /** How long it keeps running before it goes to ground, ms. */
    readonly fleeMs: number;
    /** How long it stays under the porch, out of reach, ms. */
    readonly denMs: number;
  };
  readonly dive?: {
    /** How close the player must get, horizontally, to trigger a swoop, px. */
    readonly triggerRange: number;
    /**
     * How long it rears up before committing, ms.
     *
     * An attack you cannot see coming is not difficulty, it is a coin toss.
     * The design doc already asks for this for the falling pipes — "a shadow
     * appears on the ground, then the pipe drops. Telegraphed, then lethal"
     * (§6) — and the same rule applies to anything that lunges at you.
     */
    readonly windUpMs: number;
    /** Speed of the swoop itself, px/s. */
    readonly speed: number;
    /** How fast it climbs back to its perch afterwards, px/s. */
    readonly recoverSpeed: number;
    /** How long it must wait between swoops, ms. */
    readonly cooldownMs: number;
  };
}

export const ENEMIES = {
  /**
   * The pigeon — World 1's basic grunt. "Dive at you in arcs. Stomp them
   * mid-swoop." It drifts along its perch line until you get close, swoops,
   * then climbs back up and resumes.
   */
  pigeon: {
    label: 'Pigeon',
    behavior: 'dive',
    speed: 34,
    hits: 1,
    stompable: true,
    affectedByGravity: false,
    art: 'pigeon',
    bodyWidth: 16,
    bodyHeight: 12,
    color: 0x8a8f9e,
    patrolRange: 48,
    // Measured, with the camera's look-ahead in place: you can see about 160px
    // in front of you. Triggering at 120 means a pigeon is always on screen
    // before it reacts — a wind-up you cannot see is not a warning.
    dive: { triggerRange: 120, windUpMs: 500, speed: 105, recoverSpeed: 70, cooldownMs: 1400 },
  },
  /**
   * The rat — "emerge from sewer grates and garbage bags on a timer, scurry
   * fast in one direction" (§6).
   *
   * Fast enough to be a problem and short-lived enough not to be a siege. It
   * climbs out visibly before it moves, for the same reason the pigeon rears
   * up: an enemy that simply appears underneath you is a coin toss.
   */
  rat: {
    label: 'Rat',
    behavior: 'emerge',
    speed: 120,
    hits: 1,
    stompable: true,
    affectedByGravity: true,
    art: 'rat',
    // 16 x 10 rather than the 14 x 9 it was greyboxed at: the drawn rat's body
    // is 16 wide before the tail, and a hitbox narrower than the animal means
    // stomps that visibly connect do nothing.
    bodyWidth: 16,
    bodyHeight: 10,
    color: 0x6f6257,
    patrolRange: 0,
    emerge: { hiddenMs: 1800, risingMs: 420, runMs: 3200 },
  },

  // --- World 2, The Five Towns ----------------------------------------------

  /**
   * The Canada goose — World 2's signature enemy (§6): "Hiss, chase on foot,
   * relentless, don't scare off. A stomp makes one angrier before it goes down
   * (two hits)."
   *
   * All three of those are load-bearing. It hisses first, because every threat
   * in this game announces itself before it becomes one. It does not scare
   * off, so there is no standing your ground and waiting it out — the answer
   * is height, or two stomps. And at 96px/s it is faster than a walk and
   * slower than a run, which makes running away a real option and dawdling
   * not one.
   */
  goose: {
    label: 'Canada goose',
    behavior: 'chase',
    speed: 38,
    hits: 2,
    stompable: true,
    affectedByGravity: true,
    art: 'goose',
    bodyWidth: 20,
    bodyHeight: 22,
    color: 0x4a4f42,
    patrolRange: 44,
    chase: { triggerRange: 140, hissMs: 520, speed: 96 },
  },

  /** "Quick ground grunts darting between hedges" (§6). */
  chipmunk: {
    label: 'Chipmunk',
    behavior: 'patrol',
    speed: 128,
    hits: 1,
    stompable: true,
    affectedByGravity: true,
    art: 'chipmunk',
    bodyWidth: 12,
    bodyHeight: 10,
    color: 0x9a7448,
    patrolRange: 56,
  },
  // --- World 3, The Catskills ------------------------------------------------

  /**
   * The raccoon (§6): "steal the player's power-up and bolt under a porch.
   * Chase one down and it drops what it took."
   *
   * The only enemy in the game that takes something other than your health,
   * and the numbers are chosen so that it is a robbery rather than an
   * execution. It ambles — 52px/s, slower than either brother's walk — so
   * bumping into one is always your own doing and never an ambush. Then it
   * bolts at 168, which is faster than Mendy's run of 150, because a thief you
   * can simply outpace from a standing start is not a thief. What makes the
   * chase winnable is that the bolt has an end: eleven hundred milliseconds of
   * it, then it goes to ground under the nearest porch for two seconds, and
   * then it comes back out ambling with your pot still on its back.
   *
   * So nothing is ever lost for good. §5's tiers are the game's whole economy
   * and losing a Lulav to a bad step would sting for the rest of the level;
   * what this costs you is the time to go and get it, which is the right price
   * for not looking where you are going.
   */
  raccoon: {
    label: 'Raccoon',
    behavior: 'thief',
    speed: 52,
    hits: 1,
    stompable: true,
    affectedByGravity: true,
    art: 'raccoon',
    bodyWidth: 18,
    bodyHeight: 11,
    color: 0x6b6a72,
    patrolRange: 40,
    contact: 'steal',
    steal: { fleeSpeed: 168, fleeMs: 1100, denMs: 2000 },
  },
  /**
   * The wasp (§6): "circle garbage cans, attack if approached."
   *
   * Not one line of new code — a diver with no gravity and a short fuse, which
   * is what that sentence describes. It drifts a tile and a half either side of
   * whatever it was spawned over, which reads as circling, and it commits from
   * much closer than a pigeon does: a pigeon is guarding the sky and sees you
   * coming, a wasp is guarding a bin and only cares once you are at it.
   *
   * Stompable, because everything that flies at you in this game can be landed
   * on, and the wind-up is what makes that possible.
   */
  wasp: {
    label: 'Wasp',
    behavior: 'dive',
    speed: 46,
    hits: 1,
    stompable: true,
    affectedByGravity: false,
    art: 'wasp',
    bodyWidth: 8,
    bodyHeight: 8,
    color: 0xd8bf4a,
    patrolRange: 22,
    dive: { triggerRange: 54, windUpMs: 380, speed: 130, recoverSpeed: 95, cooldownMs: 1100 },
  },
  /**
   * The frog (§6): "hop in arcs near the lake. Bounceable."
   *
   * Bounceable is the interesting word. Everything else in this game that can
   * be stomped dies of it; §6 asks for a frog to be a thing you land on, which
   * in a game with no double jump is a thing that gets you somewhere you could
   * not otherwise reach. So it takes two hits rather than one — the first stomp
   * is a trampoline and the second finishes it — and the arc it travels in is
   * the timing puzzle.
   *
   * It sits for most of its life. A frog that hopped continuously would be a
   * moving target with no rhythm to read, and the rest between hops is what
   * makes one a platform you can plan on.
   */
  frog: {
    label: 'Frog',
    behavior: 'hop',
    speed: 60,
    hits: 2,
    stompable: true,
    affectedByGravity: true,
    art: 'frog',
    bodyWidth: 12,
    bodyHeight: 8,
    color: 0x5f8f4f,
    /**
     * Measured, and then fixed twice over.
     *
     * The first numbers gave a hop of 24px up and 22px along — arithmetic says
     * 260 against the enemy gravity of 1400 rises 260²/2800, and watching six
     * frogs for twelve seconds confirmed it. That is a twitch, not §6's "arcs":
     * a creature you are meant to time your jump against has to visibly leave
     * the ground. 430 rises 66px, which is four tiles, and takes six hundred
     * milliseconds to do it — long enough to watch and plan against.
     *
     * The travel came *down* rather than up. A tall short hop reads as a frog; a
     * long flat one reads as a thrown rock. 55 carries it about 43px, and with a
     * patrol range of 24 a frog stays inside four tiles of where it was put —
     * which matters because three of the six were hopping off their rocks into
     * the lake and out of the level.
     */
    patrolRange: 24,
    /**
     * Between a trampoline's 640 and a stomp's 260, and nearer the trampoline: a
     * frog has to be worth crossing the lake on rather than worth avoiding.
     * Measured at 560 it throws you about 87px, which clears the four-tile rock
     * at 128 with margin — a stomp is worth 19px, which clears nothing.
     */
    bounceVelocity: -560,
    hop: { restMs: 900, speedX: 55, speedY: -430 },
  },
  /**
   * The mosquito swarm (§6): "drift toward the player as a cloud. Cannot be
   * stomped; outrun them or disperse them with a power-up."
   *
   * Each clause of that is a number here.
   *
   * *Drift toward the player* — it homes in both axes, with no gravity, because a
   * cloud does not walk.
   *
   * *Outrun them* — 46px/s, which is slower than either brother walks (90 and
   * 75). So getting away is always a matter of moving, never of speed, and a
   * player who stops to think in the dark is the player it catches up with.
   *
   * *Cannot be stomped* — landing on one hurts, the same as walking into one.
   * There is no way through a swarm from above.
   *
   * *Disperse them with a power-up* — the Menorah's flame and the Lulav's swing
   * already knock away anything they touch without asking whether it can be
   * stomped, so that clause cost nothing: it was true the moment the swarm was
   * an enemy. The Cholent's landing stun holds one in place as well.
   *
   * It collides with the level, deliberately. A swarm drifting through a porch
   * would be a thing you cannot put anything between yourself and, and "outrun
   * them" would become "outrun them in the open or not at all".
   */
  mosquito: {
    label: 'Mosquito swarm',
    behavior: 'drift',
    speed: 46,
    hits: 1,
    stompable: false,
    affectedByGravity: false,
    art: 'mosquito',
    bodyWidth: 16,
    bodyHeight: 8,
    color: 0x2a2a30,
    patrolRange: 0,
    // Wakes when you are within three tiles sideways — about when you are
    // passing underneath — so that it chases rather than blocks. See tickDrift.
    drift: { triggerRange: 48, wobble: 6 },
  },
  // --- World 4, Meah Shearim ------------------------------------------------

  /**
   * The cat — World 4's signature (§6): "Everywhere, in packs, on walls and
   * bins, darting across the player's path."
   *
   * Every clause is a decision. *On walls and bins*: it sits, which is most of
   * what a Jerusalem alley cat does, and it is placed up on things. *Darting
   * across the path*: it waits until you are close, hisses — the tell — and
   * then goes, flat out, in one direction, straight through where you are
   * standing and out the other side. It does not chase. A cat has somewhere to
   * be and you are in the way of it.
   *
   * *In packs* is the level's job, not this table's: three of them on one wall
   * go one after another, and the answer to a pack is the gap between them.
   *
   * At 175px/s it is faster than anybody runs, so it cannot be outpaced; it can
   * be jumped, because the hiss gives you the half-second to do it, and it can
   * be stomped. One hit — it is a cat, not a goose.
   */
  cat: {
    label: 'Cat',
    behavior: 'dart',
    speed: 175,
    hits: 1,
    stompable: true,
    affectedByGravity: true,
    art: 'cat',
    bodyWidth: 18,
    bodyHeight: 12,
    color: 0x8a7a5a,
    patrolRange: 0,
    dart: { triggerRange: 80, hissMs: 460, runMs: 1000, restMs: 1700 },
  },
  /**
   * The gecko (§6): "cling to stone walls, scurry when approached."
   *
   * The only creature in the game that lives on a vertical surface. It creeps
   * up and down the face of a wall, slowly, and when you come within four tiles
   * it bolts — up the wall, away from you — and then creeps back. It is never
   * trying to reach you, which is §6's "scurry": the danger is that a wall you
   * are jumping past has something on it, and that the thing moves when you
   * arrive.
   *
   * No gravity, of course. A gecko on a wall is the point of a gecko.
   */
  gecko: {
    label: 'Gecko',
    behavior: 'cling',
    speed: 22,
    hits: 1,
    stompable: true,
    affectedByGravity: false,
    art: 'gecko',
    // Upright: it is drawn lying flat and turned to climb, so its hitbox is the
    // drawing's width and height swapped.
    bodyWidth: 6,
    bodyHeight: 12,
    color: 0x7a8f4a,
    patrolRange: 0,
    cling: { range: 20, triggerRange: 64, scurrySpeed: 140, scurryMs: 420 },
  },
  /**
   * The sparrow (§6, World 4): "quick and erratic, hard to hit."
   *
   * The rooftop pigeon is the opposite bird, and that is why both are here. A
   * pigeon holds a line and commits to a dive, so it is read and then dodged; a
   * sparrow never holds anything. Every quarter- to half-second it picks a new
   * heading at random and flits off along it, inside a small patch of air it
   * never leaves.
   *
   * *Quick* is 95px/s, faster than Mendy walks. *Erratic* is the random heading.
   * *Hard to hit* is both of those and a body barely bigger than a coin. It can
   * be stomped — once — but landing on a thing that will not be where you
   * aimed is a skill, and the honest alternative is to wait for it to flit out
   * of the way, which it always does within half a second.
   *
   * The leash is what keeps it fair. It hangs about one spot, so a sparrow over
   * a gap is a sparrow over *that* gap: you see it from a screen away, and the
   * question is when to go, never whether it will follow.
   */
  sparrow: {
    label: 'Sparrow',
    behavior: 'flutter',
    speed: 95,
    hits: 1,
    stompable: true,
    affectedByGravity: false,
    art: 'sparrow',
    bodyWidth: 10,
    bodyHeight: 8,
    color: 0x8a6a4a,
    patrolRange: 0,
    flutter: { leash: 28, minMs: 250, maxMs: 450 },
  },
} as const satisfies Record<string, EnemyConfig>;

export type EnemyKind = keyof typeof ENEMIES;
