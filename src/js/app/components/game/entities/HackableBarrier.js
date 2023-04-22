import SpriteObject from './base/SpriteObject';
import { getContext } from '../../../common/context';

export default class HackableBarrier extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);
    this.sprite.body.immovable = true;
    this.complete = false;

    // Uncomment to add this family of sprites to the list for debugging
    window.debugSprites.push(this.sprite, ...this.layerSprites);

    this.sprite.animations.play('idle', null, true);

    const [computerLayer] = this.layerSprites;

    if (computerLayer) {
      computerLayer.animations.play('screen-idle-locked', null, true);
    }

    if (this.removeLasers) {
      // We need to reset the barrier's width to the size of just the computer
      // so that it is correctly detected by the player.
      this.sprite.width = 24;
      this.sprite.destroy();
      this.sprite.width = 24;
    }

    // After the object is added, determine if the configured objective has
    // been completed already, and display the appropriate sprite frame
    const complete = getContext('completedObjectives')[
      `${this.level.levelName}.${this.objectiveName}`
    ];
    if (complete) this.markAsComplete();
  }

  // Mark the current object as complete and update sprite
  markAsComplete() {
    if (this.sprite) {
      this.sprite.animations.stop('idle', true);
      if (this.sprite.body) {
        this.sprite.body.enable = false;
      }
      this.sprite.frame = 16;
    }
    this.complete = true;

    const [computerLayer] = this.layerSprites;
    if (computerLayer) {
      computerLayer.animations.stop('screen-idle-locked', false);
      computerLayer.animations.play('screen-idle-open', null, true);
    }
  }
}
