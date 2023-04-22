import SpriteObject from './base/SpriteObject';

function hexStringToNumber(input) {
  return parseInt(input.replace(/^#/, ''), 16);
}

export default class HighlightTile extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);
    this.applyHighlightTween(this.game, this.sprite);
  }

  getStartColor() {
    return hexStringToNumber(this.startColor || '#109310');
  }

  getEndColor() {
    return hexStringToNumber(this.endColor || '#00ff00');
  }

  applyHighlightTween() {
    const startColor = this.getStartColor();
    const endColor = this.getEndColor();
  
    // this controls how many color steps there will be
    const totalSteps = 200;
    const stepCounter = { step: 0 };
  
    const tween = this.game.add.tween(stepCounter).to(
      {
        step: totalSteps,
      },
      850, // time
      Phaser.Easing.Exponential.In,
      undefined,
      undefined,
      -1, // repeat infinitely
      true // yoyo
    );
  
    tween.onUpdateCallback(() => {
      this.sprite.tint = Phaser.Color.interpolateColor(
        startColor,
        endColor,
        totalSteps,
        stepCounter.step
      );
    });
  
    this.sprite.tint = startColor;
  
    tween.start();
  }
}
