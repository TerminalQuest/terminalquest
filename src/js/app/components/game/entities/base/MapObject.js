import EventEmitter from 'events';
import get from 'lodash.get';
import { emitter, getContext } from '../../../../common/context';

export default class MapObject extends EventEmitter {
  constructor(level, obj) {
    super();

    // Set up references to Phaser objects from containing level
    this.level = level;
    this.game = level.game;

    // Populate standard Tiled map object properties
    this.name = obj.name;
    this.type = obj.type;
    this.startX = obj.x;
    this.startY = obj.y;
    this.width = obj.width;
    this.height = obj.height;
    this.visible = obj.visible;
    this.objectgroup = obj.objectgroup;

    this.subscribedProps = [];

    // Dump custom properties from Tiled into object instance
    if (obj.properties && obj.properties.length > 0) {
      obj.properties.forEach(prop => {
        // Search for props with the subscription character indicator
        if (prop.name.charAt(0) === '@') {
          const operation = prop.value.charAt(0) === '!' ? 'negate' : 'none';

          this.subscribedProps.push({
            name: prop.name.slice(1),
            subscriptionPath: prop.value.slice(1),
            operation,
          });
        } else {
          this[prop.name] = prop.value;
        }
      });

      if (this.subscribedProps.length > 0) {
        emitter.on('contextUpdate', this.updateSubscribedProps);
      }
    }
  }

  updateSubscribedProps = () => {
    const context = getContext();

    this.subscribedProps.forEach(subscribedProp => {
      const stateValue = get(context, subscribedProp.subscriptionPath);

      switch (subscribedProp.operation) {
        case 'negate':
          this[subscribedProp.name] = !stateValue;
          break;
        case 'none':
        default:
          this[subscribedProp.name] = stateValue;
          break;
      }
    });
  };

  destroy() {
    if (this.subscribedProps.length > 0) {
      emitter.off('contextUpdate', this.updateSubscribedProps);
    }
  }
}
