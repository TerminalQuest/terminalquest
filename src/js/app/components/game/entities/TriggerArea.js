import MapObject from './base/MapObject';
import { emitter } from '../../../common/context';
import FSM from './FSM';

export default class TriggerArea extends MapObject {
  constructor(level, obj) {
    super(level, obj);

    this.state = new FSM(
      {
        overlapped: {
          actions: {
            notOverlapping: () => this.state.transition('empty'),
          },
          onEnter: () => {
            emitter.emit('levelLifecycle', {
              name: 'triggerAreaWasEntered',
              target: this,
            });
          },
        },
        empty: {
          actions: {
            overlapping: () => this.state.transition('overlapped'),
          },
          onEnter: () => {
            emitter.emit('levelLifecycle', {
              name: 'triggerAreaWasExited',
              target: this,
            });
          },
        },
      },
      'empty'
    );

    this.boundary = new window.Phaser.Rectangle(
      obj.x,
      obj.y,
      obj.width,
      obj.height
    );
  }

  isBeingOverlapped(overlapped) {
    if (overlapped) {
      this.state.action('overlapping');
    } else {
      this.state.action('notOverlapping');
    }
  }

  // Determine if the given sprite is in interaction range
  isInRange(testSprite) {
    let testRect = new window.Phaser.Rectangle(
      testSprite.x,
      testSprite.y,
      testSprite.width,
      testSprite.height
    );

    return window.Phaser.Rectangle.intersects(testRect, this.boundary);
  }
}
