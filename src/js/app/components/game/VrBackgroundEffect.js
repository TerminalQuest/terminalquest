export default class VrBackgroundEffect {
  constructor(game, map) {
    this.game = game;
    this.map = map;

    this.createVrParticles();
  }

  getMapProperty(name, defaultValue) {
    let returnValue = defaultValue;
    if (this.map.properties && this.map.properties.length > 0) {
      this.map.properties.some(p => {
        if (p.name === name) {
          returnValue = p.value;
          return true;
        }
      });
    }
    return returnValue;
  }

  start() {
    this.bg = this.game.add.tileSprite(
      0,
      0,
      this.game.width,
      this.game.height,
      this.game.cache.getBitmapData('vrParticleSquare')
    );
    this.bg.fixedToCamera = true;
    this.bg.alpha = 0.3;
    applyThrobTween(this.game, this.bg);
  }

  update() {
    this.bg.tilePosition.set(
      this.game.camera.x * -0.5,
      this.game.camera.y * -0.5
    );
  }

  createVrParticles() {
    let bmd = this.game.add.bitmapData(32, 32);
    bmd.context.strokeStyle = this.getMapProperty('vrLineColor', '#00FF00');
    bmd.context.lineWidth = 1;
    bmd.context.strokeRect(0, 0, 32, 32);
    this.game.cache.addBitmapData('vrParticleSquare', bmd);
  }
}

function applyThrobTween(game, sprite) {
  const alphaMax = 0.8;

  const tween = game.add.tween(sprite).to(
    {
      alpha: alphaMax,
    },
    3000, // time
    Phaser.Easing.Sinusoidal.In,
    undefined,
    undefined,
    -1, // repeat infinitely
    true // yoyo
  );

  tween.start();
}
