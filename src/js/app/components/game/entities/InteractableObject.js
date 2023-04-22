import EventEmitter from 'events';

export default class InteractableObject extends EventEmitter {
  constructor(level, obj) {
    super();

    this.level = level;
    this.game = level.game;
    this.name = obj.name;
    this.rect = new window.Phaser.Rectangle(
      obj.x,
      obj.y,
      obj.width,
      obj.height
    );
  }

  // Determine if the given sprite is in interaction range
  isInRange(testSprite) {
    // Phaser API for getting bounds doesn't work, manually create rect for
    // test sprite
    let testRect = new Phaser.Rectangle(
      testSprite.x,
      testSprite.y,
      testSprite.width,
      testSprite.height
    );
    return window.Phaser.Rectangle.intersects(testRect, this.rect);
  }
}
