import Phaser from 'phaser';

/**
 * Milestone 1 art is generated, not loaded: a flat rectangle of the exact size
 * the hitbox needs. No files, no licensing questions, and the sprite frame and
 * the collision box can never drift apart.
 *
 * When real art arrives these keys get replaced by loaded spritesheets and
 * nothing that uses them has to change.
 */
export function makeSolidTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  color: number,
): void {
  if (scene.textures.exists(key)) return;

  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, width, height);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}
