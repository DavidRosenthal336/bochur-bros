import Phaser from 'phaser';
import type { HazardConfig } from '../config/hazards';
import { TILE } from '../config/Tuning';
import { actorArt } from '../util/art';

/**
 * A region of the level that does something to whoever is standing in it.
 *
 * Unlike an enemy this has no body of its own — the scene asks it each frame
 * whether the player is inside, because a hazard is a *place*, not a thing you
 * collide with. It cannot be defeated (§11); it is survived, avoided, or in
 * Berel's case simply ignored.
 */
export class WindZone {
  readonly bounds: Phaser.Geom.Rectangle;
  /** Signed acceleration: negative blows left, positive blows right. */
  readonly force: number;

  private readonly streaks: Phaser.GameObjects.Rectangle[] = [];
  /** The gust cycle, for a wind that comes and goes. Absent: always blowing. */
  private readonly gust: HazardConfig['gust'];
  private readonly haze: Phaser.GameObjects.Rectangle;
  private readonly papers: Phaser.GameObjects.Image[] = [];
  private readonly direction: -1 | 1;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    tileW: number,
    tileH: number,
    direction: -1 | 1,
    config: HazardConfig,
  ) {
    const x = tileX * TILE;
    const y = tileY * TILE;
    const w = tileW * TILE;
    const h = tileH * TILE;

    this.bounds = new Phaser.Geom.Rectangle(x, y, w, h);
    this.force = (config.force ?? 0) * direction;
    this.gust = config.gust;
    this.direction = direction;

    this.haze = scene.add.rectangle(x + w / 2, y + h / 2, w, h, config.color, 0.1).setDepth(2);

    /**
     * Pashkevilin, for a gusting wind (§6: "papers blowing through the air").
     *
     * They are the hamsin's warning as well as its weather. Before a gust they
     * lift off and start to drift, and during it they are flung across the zone
     * — so the papers moving is the signal to brace, and you see it coming from
     * the far side of the courtyard.
     */
    const paper = actorArt('pashkevil');
    if (this.gust && paper) {
      for (let i = 0; i < Math.max(3, Math.round(tileW / 3)); i += 1) {
        this.papers.push(
          scene.add
            .image(x + Math.random() * w, y + 6 + Math.random() * (h - 12), paper.key, 0)
            .setDepth(3)
            .setAlpha(0),
        );
      }
    }

    /**
     * The machine doing the blowing, at the upwind end.
     *
     * A zone that pushes you with nothing visible causing it reads as the
     * controls having gone wrong. The blower sits at the edge the wind comes
     * from and faces along it.
     */
    const art = actorArt(config.art);
    if (art) {
      scene.add
        .image(direction > 0 ? x : x + w, y + h, art.key, 0)
        .setOrigin(0.5, 1)
        .setFlipX(direction < 0)
        .setDepth(3);
    }

    // Streaks blowing the way the wind blows, so the direction is readable
    // without a legend.
    for (let i = 0; i < Math.max(4, Math.round(tileH * 1.5)); i += 1) {
      const streakY = y + 6 + Math.random() * (h - 12);
      const streak = scene.add
        .rectangle(x + Math.random() * w, streakY, 10 + Math.random() * 14, 1, config.color, 0.55)
        .setDepth(2);
      this.streaks.push(streak);

      scene.tweens.add({
        targets: streak,
        x: direction > 0 ? x + w + 20 : x - 20,
        duration: 900 + Math.random() * 700,
        repeat: -1,
        delay: Math.random() * 900,
        onRepeat: () => {
          streak.x = direction > 0 ? x - 20 : x + w + 20;
        },
      });
    }
  }

  /**
   * Where in its cycle a gusting wind is: 'calm', 'warn' or 'blow'.
   *
   * Taken from the clock rather than counted, so every hamsin in a level with
   * the same timings gusts together — one weather system, not a set of fans.
   */
  phaseAt(now: number): 'calm' | 'warn' | 'blow' {
    const gust = this.gust;
    if (!gust) return 'blow';
    const t = now % (gust.calmMs + gust.warnMs + gust.blowMs);
    if (t < gust.calmMs) return 'calm';
    if (t < gust.calmMs + gust.warnMs) return 'warn';
    return 'blow';
  }

  /** The push right now, px/s^2. Nothing between gusts, and nothing in the warning. */
  forceAt(now: number): number {
    return this.phaseAt(now) === 'blow' ? this.force : 0;
  }

  /**
   * Draw the weather for this frame.
   *
   * A steady wind needs nothing: its streaks run forever. A gusting one shows
   * its cycle — clear air in the calm, papers lifting in the warning, streaks
   * and a heat haze and papers flying in the gust.
   */
  tick(now: number, dt: number): void {
    if (!this.gust) return;
    const phase = this.phaseAt(now);
    const streakAlpha = phase === 'blow' ? 0.6 : phase === 'warn' ? 0.15 : 0;
    for (const streak of this.streaks) streak.setAlpha(streakAlpha);
    this.haze.setAlpha(phase === 'blow' ? 1 : phase === 'warn' ? 0.5 : 0.25);

    const b = this.bounds;
    const speed = phase === 'blow' ? 230 : phase === 'warn' ? 35 : 0;
    for (const paper of this.papers) {
      if (phase === 'calm') {
        paper.setAlpha(Math.max(0, paper.alpha - dt * 2));
        continue;
      }
      paper.setAlpha(Math.min(1, paper.alpha + dt * 3));
      paper.x += this.direction * speed * dt;
      paper.y += Math.sin(now / 120 + paper.x) * (phase === 'blow' ? 1.2 : 0.4);
      paper.rotation += this.direction * dt * (phase === 'blow' ? 9 : 2);
      // Out of the far side, back in at the near one, at a new height.
      if (this.direction > 0 ? paper.x > b.right + 6 : paper.x < b.left - 6) {
        paper.x = this.direction > 0 ? b.left - 4 : b.right + 4;
        paper.y = b.top + 6 + Math.random() * (b.height - 12);
      }
    }
  }

  contains(body: Phaser.Physics.Arcade.Body): boolean {
    return Phaser.Geom.Rectangle.Overlaps(
      this.bounds,
      new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height),
    );
  }
}
