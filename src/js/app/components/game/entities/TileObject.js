import SpriteObject from './base/SpriteObject';
import InteractionTextService from '../InteractionTextService';
import { getContext, setContext } from '../../../common/context';
import { emitter } from '../../../common/context';

export default class TileObject extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);

    // For now, they shouldn't be impacted by the player
    this.sprite.body.immovable = true;

    this.identifiers = {
      key: this.flavorText || this.key,
      gid: obj.gid,
    };
  }

  hasInteractionEffect() {
    if (this.type === 'triggerArea') {
      return false;
    }

    if (this.name === 'mission_computer') {
      return true;
    }

    if (this.hackable) {
      return true;
    }

    if (this.interactable) {
      return true;
    }

    return Boolean(InteractionTextService.getText(this.identifiers));
  }

  interactionEffect() {
    if (this.name === 'mission_computer') {
      setContext({ showMissionComputer: true });
      return;
    } else if (this.hackable && !this.objectiveName) {
      console.error(
        `Object with hackable set did not have an objectiveName listed`,
        this
      );
      return;
    } else if (this.objectiveName && this.hackable) {
      // Get objective completion status before updating context
      const completedObjectives = getContext('completedObjectives');
      const objectiveKey = `${this.level.levelName}.${this.objectiveName}`;
      if (completedObjectives[objectiveKey]) {
        this.complete = true;
      }

      setContext({
        hackObject: this,
      });
      return;
    }

    const toastMessage = InteractionTextService.getText(this.identifiers);

    // Only show a message if this object has text
    if (toastMessage) {
      setContext({ toastMessage });
    }
  }

  isInRange(testSprite) {
    if (this.interactionDisabled) {
      return false;
    }

    return super.isInRange(testSprite);
  }

  setInteractable(interactable) {
    this.interactable = interactable;
    emitter.emit('objectUpdate:interactable', this);
  }
}
