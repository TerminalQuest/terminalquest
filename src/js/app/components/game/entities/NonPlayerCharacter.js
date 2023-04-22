import IdleAnimations from './IdleAnimations';
import SpriteObject from './base/SpriteObject';

export default class NonPlayerCharacter extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);

    // Configure NPC physics body
    this.sprite.body.setSize(22, 32, 6, 2);
    this.sprite.body.bounce.setTo(0, 0);
    this.sprite.body.immovable = true;

    this.idleAnimations = new IdleAnimations({
      animations: {
        blink: 60,
        idle: 20,
        idle2: 20,
      },
      spriteObject: this,
      minIdleTime: 2000,
      maxIdleTime: 5000,
    });

    this.idleAnimations.startIdle();
  }

  // Determine if the given sprite is in conversation range (usually the
  // player's sprite). Gives about a 32px halo around the NPC where conversation
  // can be initiated.
  isInRange(testSprite) {
    let xInRange =
      testSprite.x < this.sprite.x + 32 && testSprite.x > this.sprite.x - 32;

    let yInRange =
      testSprite.y > this.sprite.y - 40 && testSprite.y < this.sprite.y + 32;

    return xInRange && yInRange;
  }
}
