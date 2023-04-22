import WeightedMap from '../WeightedMap';

export default class IdleAnimations {
  /**
   * Controls Idle Animations for a Sprite. Specify when to start and stop idling
   * and this object will automatically play idle animations based on its configuration
   * at randomized intervals.
   *
   * @param {Object} props - Properties to configure Animations object
   * @param {WeightedMapConfig} props.animations - A map of all Idle animations this object can play
   * @param {Phaser.Sprite} props.sprite - A reference to the sprite to be animated
   * @param {number} props.minIdleTime - The minimum amount of time that must elapse before an animation will play in milliseconds
   * @param {number} props.maxIdleTime - The maximum amount of time that can elapse before an animation will play in milliseconds
   * @param {bool} props.shouldCycle - If true, this IdleAnimations instance
   * will choose a new idle animation to play on a random interval between the
   * min and max idle times. If false, this IdleAnimations instance will
   * randomly pick an initial animation and loop it eternally.
   * @param {bool} props.shouldPickRandomInitialFrame - If true, the first
   * animation this plays will start on a random frame. This can be useful
   * if you want to make several entities with one animation loop off
   * sync to each other. Defaults to false.
   */
  constructor({
    animations,
    spriteObject,
    minIdleTime,
    maxIdleTime,
    shouldCycle = true,
    shouldPickRandomInitialFrame = false,
  }) {
    this.animations = new WeightedMap(animations);
    this.spriteObject = spriteObject;
    this.minIdleTime = minIdleTime;
    this.maxIdleTime = maxIdleTime;
    this.shouldCycle = shouldCycle;
    this.shouldPickRandomInitialFrame = shouldPickRandomInitialFrame;
    this.hasPlayedAnyAnimation = false;

    // Don't auto destroy Timer on event resolution
    this.timer = this.spriteObject.game.time.create(false);
  }

  scheduleIdleAnimationEvent() {
    this.timer.add(
      Phaser.Math.between(this.minIdleTime, this.maxIdleTime),
      () => {
        this.playIdleAnimation();
        this.scheduleIdleAnimationEvent();
      }
    );
  }

  playIdleAnimation(loop) {
    let startWithRandomFrame = false;

    if (!this.hasPlayedAnyAnimation && this.shouldPickRandomInitialFrame) {
      startWithRandomFrame = true;
    }

    this.hasPlayedAnyAnimation = true;

    this.spriteObject.playAnimation(this.animations.pickRandom(), loop, {
      startWithRandomFrame,
    });
  }

  stopIdleAnimation() {
    this.spriteObject.sprite.animations.stop();
  }

  startIdle() {
    if (!this.shouldCycle) {
      this.playIdleAnimation(true);
      return;
    }

    this.scheduleIdleAnimationEvent();
    this.timer.start();
  }

  stopIdle() {
    if (!this.shouldCycle) {
      this.stopIdleAnimation();
      return;
    }

    this.timer.stop();
    this.timer.removeAll();
  }
}
