import EventEmitter from 'events';

export default class TransitionArea extends EventEmitter {
  constructor(level, obj) {
    super();

    this.level = level;
    this.game = level.game;
    this.name = obj.name;
    this.type = obj.type;
    this.key = obj.properties.key;
    this.disabled = obj.properties.disabled;

    // dump custom properties onto the instance
    if (obj.properties && obj.properties.length > 0) {
      obj.properties.forEach(prop => {
        this[prop.name] = prop.value;
      });
    }

    // Create rectangle from object properties
    this.rect = new window.Phaser.Rectangle(
      obj.x,
      obj.y,
      obj.width,
      obj.height
    );
  }

  // Determine if the given sprite is in interaction range
  isInRange(testSprite) {
    if (this.disabled) {
      return false;
    }

    let testRect = new window.Phaser.Rectangle(
      testSprite.x,
      testSprite.y,
      testSprite.width,
      testSprite.height
    );

    return window.Phaser.Rectangle.intersects(testRect, this.rect);
  }
}
