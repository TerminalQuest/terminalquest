import SpriteObject from './base/SpriteObject';

function pickRandom(array) {
  const randomIndex = Phaser.Math.between(0, array.length - 1);

  return array[randomIndex];
}

export default class Flame extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);

    const animations = ['burn', 'burn2'];

    this.sprite.animations.play(pickRandom(animations), null, true);
  }
}
