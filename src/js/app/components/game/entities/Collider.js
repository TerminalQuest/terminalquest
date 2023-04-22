import TileObject from './TileObject';

export default class Collider extends TileObject {
  constructor(level, obj) {
    super(level, obj);

    this.sprite.alpha = 0;
  }
}
