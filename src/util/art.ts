import Phaser from 'phaser';
import type { ActorSpriteSet } from '../config/sprites';
import { ACTOR_SPRITES, actorAnimKey } from '../config/sprites';
import type { ActorSpriteName } from '../config/sprites';

/**
 * Point a physics sprite at a drawn sheet, keeping its hitbox where it was.
 *
 * Art frames are deliberately larger than hitboxes — a hat brim, a tail, a
 * pigeon's wings all overhang — so the body has to be inset into the frame
 * rather than filling it. Getting this wrong is invisible until something
 * collides with air, which is why every actor goes through one function.
 *
 * The body is centred horizontally in the frame, and sits either on the frame's
 * bottom edge or at its middle depending on how the sheet is anchored.
 */
export function applyActorArt(
  sprite: Phaser.Physics.Arcade.Sprite,
  set: ActorSpriteSet,
  bodyWidth: number,
  bodyHeight: number,
): void {
  sprite.setTexture(set.key, 0);
  sprite.setOrigin(0.5, set.originY);
  sprite.clearTint();

  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(bodyWidth, bodyHeight);
  body.setOffset(
    (set.frameWidth - bodyWidth) / 2,
    set.originY === 1 ? set.frameHeight - bodyHeight : (set.frameHeight - bodyHeight) / 2,
  );
}

/** Play a named pose, if it exists on this sheet and is not already playing. */
export function playPose(sprite: Phaser.GameObjects.Sprite, set: ActorSpriteSet, pose: string): void {
  if (!(pose in set.poses)) return;
  const key = actorAnimKey(set, pose);
  if (sprite.anims.getName() === key) return;
  sprite.play(key, true);
}

/** Look up a sheet by registry name. `undefined` means "not drawn yet". */
export function actorArt(name: ActorSpriteName | undefined): ActorSpriteSet | undefined {
  return name ? ACTOR_SPRITES[name] : undefined;
}
