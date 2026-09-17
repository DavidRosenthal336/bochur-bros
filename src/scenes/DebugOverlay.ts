import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { TILE, VIEW_HEIGHT } from '../config/Tuning';

/**
 * A tuning instrument, not a HUD.
 *
 * Reading "apex 75px / 4.7 tiles" beats guessing at whether the last change
 * helped. Toggle with F1; the collision-box view is F2. Neither ships.
 */
export class DebugOverlay {
  private readonly text: Phaser.GameObjects.Text;
  // Off by default: this is a tuning instrument, and it covers a quarter of the
  // screen. F1 brings it up when you want numbers rather than a game.
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
  ) {
    this.text = scene.add
      // Anchored bottom-left: the top of the screen is where the level's own
      // signage lives, and the bottom is solid ground with nothing to hide.
      .text(4, VIEW_HEIGHT - 4, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#c8ffd4',
        backgroundColor: '#000000a0',
        padding: { x: 3, y: 2 },
        lineSpacing: 1,
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    const keyboard = scene.input.keyboard;
    keyboard?.on('keydown-F1', () => {
      this.visible = !this.visible;
      this.text.setVisible(this.visible);
    });
    keyboard?.on('keydown-F2', () => {
      const world = scene.physics.world;
      world.drawDebug = !world.drawDebug;
      if (!world.drawDebug) world.debugGraphic.clear();
    });
  }

  update(): void {
    if (!this.visible) return;

    const d = this.player.debugInfo;
    const state = d.grounded ? 'GROUND' : d.velocityY < 0 ? 'RISE  ' : 'FALL  ';

    this.text.setText([
      `fps  ${Math.round(this.scene.game.loop.actualFps)}`,
      `x/y  ${Math.round(this.player.x)} ${Math.round(this.player.y)}`,
      `vel  ${pad(d.velocityX)} ${pad(d.velocityY)}${d.crouching ? ' DUCK' : ''}`,
      `spd  ${Math.abs(Math.round(d.velocityX))}${d.running ? ' RUN' : ''}`,
      `st   ${state}${d.rising ? ' hold' : ''}  grav ${Math.round(d.gravity)}`,
      `coy  ${Math.round(d.coyoteMs)}ms   buf ${Math.round(d.bufferMs)}ms`,
      `apex ${Math.round(d.lastJumpHeight)}px (${(d.lastJumpHeight / TILE).toFixed(1)} tiles)`,
      `dist ${Math.round(d.lastJumpDistance)}px (${(d.lastJumpDistance / TILE).toFixed(1)} tiles)`,
      'F1 hud  F2 bodies  R respawn',
    ]);
  }
}

function pad(value: number): string {
  return Math.round(value).toString().padStart(5, ' ');
}
