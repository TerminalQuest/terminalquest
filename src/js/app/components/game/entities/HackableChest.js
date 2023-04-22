import SpriteObject from './base/SpriteObject';
import { getContext } from '../../../common/context';

export default class HackableChest extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);
    this.sprite.body.immovable = true;
    this.complete = false;

    // After the object is added, determine if the configured objective has
    // been completed already, and display the appropriate sprite frame
    const complete = getContext('completedObjectives')[
      `${this.level.levelName}.${this.objectiveName}`
    ];
    if (complete) this.markAsComplete();
  }

  // Mark the current object as complete and update sprite
  markAsComplete() {
    this.sprite.frame = 1;
    this.complete = true;
  }
}
