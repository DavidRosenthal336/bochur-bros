import Phaser from 'phaser';
import { GAMEPLAY, TILE } from '../config/Tuning';
import { solidTextureKey } from '../util/textures';

/**
 * What a block does when it is hit.
 *
 *  mystery     gives up its contents once, from below
 *  brick       shatters from below, but only for a tier that breaks blocks
 *  reinforced  shatters from below, but only for a character strong enough —
 *              Mendy cannot break one in any form (§4)
 *  weak        a floor, broken from ABOVE by a ground pound (§4)
 */
export type BlockKind = 'mystery' | 'brick' | 'reinforced' | 'weak';

/** What comes out of a mystery box. */
export type BlockContents = 'coin' | 'cholent' | 'menorah' | 'lulav' | 'peyos' | 'lchaim';

const COLORS: Record<BlockKind, number> = {
  mystery: 0xe0a33e,
  brick: 0x9c6144,
  reinforced: 0x707a8c,
  weak: 0x7a6a52,
};

const SPENT_COLOR = 0x5a5f78;

/**
 * A block you hit from below: a mystery box that gives up its contents, or a
 * breakable brick that shatters if you are big enough to break it (§5 —
 * Cholent "breaks normal blocks from below").
 */
export class Block extends Phaser.Physics.Arcade.Sprite {
  readonly kind: BlockKind;
  readonly contents: BlockContents;

  private spent = false;
  private bumping = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: BlockKind,
    contents: BlockContents = 'coin',
  ) {
    super(scene, x, y, solidTextureKey(scene, TILE, TILE));
    this.kind = kind;
    this.contents = contents;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 0.5);
    this.setTint(COLORS[kind]);
    this.setDepth(4);
  }

  get staticBody(): Phaser.Physics.Arcade.StaticBody {
    return this.body as Phaser.Physics.Arcade.StaticBody;
  }

  get isSpent(): boolean {
    return this.spent;
  }

  /**
   * Headbutted from below.
   *
   * Returns what should happen: a mystery box yields its contents once and
   * then goes inert; a brick shatters for a big player and merely rattles for
   * a small one.
   */
  hitFromBelow(playerBreaksBlocks: boolean, playerBreaksReinforced: boolean): 'contents' | 'broken' | 'bump' {
    if (this.kind === 'weak') {
      // A weak floor ignores anything from underneath; it only gives way from above.
      this.bump();
      return 'bump';
    }

    if (this.kind === 'reinforced') {
      if (playerBreaksReinforced) {
        this.shatter();
        return 'broken';
      }
      this.bump();
      return 'bump';
    }

    if (this.kind === 'brick') {
      if (playerBreaksBlocks) {
        this.shatter();
        return 'broken';
      }
      this.bump();
      return 'bump';
    }

    if (this.spent) {
      this.bump();
      return 'bump';
    }

    this.spent = true;
    this.setTint(SPENT_COLOR);
    this.bump();
    return 'contents';
  }

  /** A short hop upward, the universal "you hit this" tell. */
  private bump(): void {
    if (this.bumping) return;
    this.bumping = true;
    const restY = this.y;
    this.scene.tweens.add({
      targets: this,
      y: restY - GAMEPLAY.blockBumpHeight,
      duration: GAMEPLAY.blockBumpMs / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.y = restY;
        this.bumping = false;
      },
    });
  }

  /**
   * Slammed from above. Only a weak floor cares, and only for a character with
   * the ground pound — which is Berel and nobody else.
   */
  hitFromAbove(playerGroundPounds: boolean): 'broken' | 'ignored' {
    if (this.kind !== 'weak' || !playerGroundPounds) return 'ignored';
    this.shatter();
    return 'broken';
  }

  private shatter(): void {
    const body = this.staticBody;
    body.enable = false;

    // Four chunks flying apart. Purely decorative, so they carry no physics.
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const chunk = this.scene.add
        .rectangle(this.x + dx * 3, this.y + dy * 3, 6, 6, COLORS[this.kind])
        .setDepth(4);
      this.scene.tweens.add({
        targets: chunk,
        x: chunk.x + dx * 22,
        y: chunk.y + dy * 26 - 14,
        alpha: 0,
        angle: dx * 180,
        duration: 420,
        ease: 'Quad.easeIn',
        onComplete: () => chunk.destroy(),
      });
    }

    this.destroy();
  }
}
