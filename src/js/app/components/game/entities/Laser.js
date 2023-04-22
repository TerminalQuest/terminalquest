import SpriteObject from './base/SpriteObject';

export default class Laser extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);

    this.sprite.animations.play('idle', null, true);
  }
}
