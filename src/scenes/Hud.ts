import Phaser from 'phaser';
import { VIEW_WIDTH } from '../config/Tuning';
import type { CharacterId } from '../config/Tuning';
import { CHARACTERS } from '../config/Tuning';
import type { PowerTier } from '../systems/PowerState';

/**
 * The player-facing readout: coins and current form.
 *
 * Lives and the 100-coin extra life are Milestone 5, so there is no life
 * counter here yet.
 */
export class Hud {
  private readonly text: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly bossBar: Phaser.GameObjects.Rectangle;
  private readonly bossBarFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(VIEW_WIDTH - 4, 4, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f2e6c8',
        align: 'right',
        lineSpacing: 2,
      })
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

  update(
    coins: number,
    tier: PowerTier,
    character: CharacterId,
    lives: number,
    secondsLeft?: number,
  ): void {
    const lines = [
      `LIVES ${lives}`,
      `TZEDAKAH ${coins}`,
      `${CHARACTERS[character].label.toUpperCase()} / ${tier.toUpperCase()}`,
    ];
    if (secondsLeft !== undefined) lines.unshift(`TIME ${Math.ceil(secondsLeft)}`);
    this.text.setText(lines);
    // The last ten seconds go red, because a clock you have to read is not a
    // clock you will read.
    this.text.setColor(secondsLeft !== undefined && secondsLeft <= 10 ? '#ff8a7a' : '#f2e6c8');
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

  /** A quick pulse on the lives line, so an extra life is noticed. */
  flashLife(): void {
    this.text.setColor('#8ef2a8');
    this.text.scene.time.delayedCall(400, () => this.text.setColor('#f2e6c8'));
  }

  showBanner(message: string): void {
    this.banner.setText(message).setVisible(true);
  }

  hideBanner(): void {
    this.banner.setVisible(false);
  }
}
