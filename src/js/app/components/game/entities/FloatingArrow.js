import SpriteObject from './base/SpriteObject';

export default class FloatingArrow extends SpriteObject {
  constructor(level, obj) {
    super(level, obj);

    this.orientVertically(this.angle);

    applyHoverTween(this.game, this.sprite);

    this.createTextImage();
  }

  orientVertically(angle = 270) {
    this.sprite.angle = angle;

    this.sprite.anchor.setTo(0, 0.5);
  }

  createTextImage() {
    this.textImage = this.game.add.sprite(
      this.sprite.x + 3,
      this.sprite.y - this.sprite.width,
      'press_spacebar'
    );
    this.textImage.anchor.setTo(0.5, 1);

    applyHoverTween(this.game, this.textImage);

    // This is needed because SpriteObject's constructor can try to hide this
    // text image before it has been created
    if (this.hideTextImageOnCreate) {
      this.hide();
    }
  }

  hide() {
    super.hide();

    if (this.textImage) {
      this.textImage.visible = false;
    } else {
      this.hideTextImageOnCreate = true;
    }
  }

  show() {
    super.show();

    if (this.textImage) {
      this.textImage.visible = true;
    } else {
      this.hideTextImageOnCreate = false;
    }
  }
}

function applyHoverTween(game, sprite) {
  const hoverAdjustment = 2;

  const tween = game.add.tween(sprite).to(
    {
      y: sprite.y + hoverAdjustment,
    },
    400, // time
    Phaser.Easing.Exponential.In,
    undefined,
    undefined,
    -1, // repeat infinitely
    true // yoyo)
  );

  tween.start();
}
