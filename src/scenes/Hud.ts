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
  }

  update(coins: number, tier: PowerTier, character: CharacterId): void {
    this.text.setText([
      `TZEDAKAH ${coins}`,
      `${CHARACTERS[character].label.toUpperCase()} / ${tier.toUpperCase()}`,
    ]);
  }

  showBanner(message: string): void {
    this.banner.setText(message).setVisible(true);
  }

  hideBanner(): void {
    this.banner.setVisible(false);
  }
}
