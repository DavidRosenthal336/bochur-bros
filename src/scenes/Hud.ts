import Phaser from 'phaser';
import { sceneryArt } from '../config/scenery';
import { VIEW_WIDTH } from '../config/Tuning';
import type { CharacterId } from '../config/Tuning';
import { CHARACTERS } from '../config/Tuning';
import type { PowerTier } from '../systems/PowerState';

/** One line of the readout: an icon, and the number beside it. */
interface Row {
  readonly icon: Phaser.GameObjects.Image | undefined;
  readonly value: Phaser.GameObjects.Text;
  /** Used when there is no icon to carry the meaning. */
  readonly word: string;
}

const RIGHT = VIEW_WIDTH - 4;
const ROW_HEIGHT = 10;
/**
 * Where a counter's icon sits, and where its number starts.
 *
 * The number is left-aligned just after the icon rather than right-aligned to
 * the edge: a right-aligned number leaves a widening gap as the count shrinks,
 * and a coin icon floating ten pixels from its own total reads as two things.
 */
const ICON_X = RIGHT - 30;
const VALUE_X = ICON_X + 11;

/**
 * The player-facing readout: the clock, lives, tzedakah and which form you are
 * in.
 *
 * The three counters are icon plus number. Words cost a third of the width for
 * something you stop reading after the first level — and the clock only shows
 * up on the levels that have one, so its row is closed up when it is absent.
 */
export class Hud {
  private readonly clock: Row;
  private readonly lives: Row;
  private readonly coins: Row;
  private readonly form: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly bossBar: Phaser.GameObjects.Rectangle;
  private readonly bossBarFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    const icons = sceneryArt('hudIcons');

    const row = (frame: string, word: string): Row => ({
      icon: icons
        ? scene.add
            .image(ICON_X, 0, icons.key, icons.frames[frame])
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(1000)
        : undefined,
      value: scene.add
        .text(0, 0, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f2e6c8' })
        .setOrigin(icons ? 0 : 1, 0)
        .setScrollFactor(0)
        .setDepth(1000),
      word,
    });

    this.clock = row('clock', 'TIME');
    this.lives = row('life', 'LIVES');
    this.coins = row('coin', 'TZEDAKAH');

    this.form = scene.add
      .text(RIGHT, 0, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f2e6c8' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.banner = scene.add
      .text(VIEW_WIDTH / 2, 74, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    const barWidth = VIEW_WIDTH - 80;
    this.bossBar = scene.add
      .rectangle(VIEW_WIDTH / 2, 12, barWidth, 6, 0x2b2f44)
      .setStrokeStyle(1, 0x8d97c9)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);
    this.bossBarFill = scene.add
      .rectangle(VIEW_WIDTH / 2 - barWidth / 2 + 1, 12, barWidth - 2, 4, 0xd05a6a)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);
  }

  private place(row: Row, index: number, value: string, visible = true): void {
    const y = 4 + index * ROW_HEIGHT;
    row.value.setVisible(visible).setPosition(row.icon ? VALUE_X : RIGHT, y);
    row.value.setText(row.icon ? value : `${row.word} ${value}`);
    row.icon?.setVisible(visible).setY(y);
  }

  update(
    coins: number,
    tier: PowerTier,
    character: CharacterId,
    lives: number,
    secondsLeft?: number,
  ): void {
    const timed = secondsLeft !== undefined;
    this.place(this.clock, 0, timed ? String(Math.ceil(secondsLeft)) : '', timed);
    // With no clock the rows close up rather than leaving a gap at the top.
    this.place(this.lives, timed ? 1 : 0, String(lives));
    this.place(this.coins, timed ? 2 : 1, String(coins));
    this.form
      .setPosition(RIGHT, 4 + (timed ? 3 : 2) * ROW_HEIGHT)
      .setText(`${CHARACTERS[character].label.toUpperCase()} / ${tier.toUpperCase()}`);

    // The last ten seconds go red, because a clock you have to read is not a
    // clock you will read.
    const urgent = timed && secondsLeft <= 10;
    this.clock.value.setColor(urgent ? '#ff8a7a' : '#f2e6c8');
    this.clock.icon?.setTint(urgent ? 0xff8a7a : 0xffffff);
  }

  /** A health bar for a boss, shown only while one is alive. */
  showBossHealth(fraction: number): void {
    this.bossBar.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossBarFill.setScale(Math.max(0, fraction), 1);
  }

  hideBossHealth(): void {
    this.bossBar.setVisible(false);
    this.bossBarFill.setVisible(false);
  }

  /** A quick pulse on the lives row, so an extra life is noticed. */
  flashLife(): void {
    this.lives.value.setColor('#8ef2a8');
    this.lives.icon?.setTint(0x8ef2a8);
    this.lives.value.scene.time.delayedCall(400, () => {
      this.lives.value.setColor('#f2e6c8');
      this.lives.icon?.clearTint();
    });
  }

  showBanner(message: string): void {
    this.banner.setText(message).setVisible(true);
  }

  hideBanner(): void {
    this.banner.setVisible(false);
  }
}
