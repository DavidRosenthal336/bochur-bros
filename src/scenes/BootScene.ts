import Phaser from 'phaser';
import { SceneKey } from './SceneKey';

/**
 * Loads nothing, for now. Milestone 1 art is generated at runtime and there are
 * no sound files yet, so Boot exists to hold the place where the real preloader
 * and its progress bar will go.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  create(): void {
    this.scene.start(SceneKey.Level);
  }
}
