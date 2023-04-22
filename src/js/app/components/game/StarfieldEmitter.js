export default class StarfieldEmitter {
  constructor(game, map) {
    this.game = game;

    this.configureEmitter(map);

    // create pairs of render texture for each layer of the starfield
    this.renderTextures = [
      [
        game.add.renderTexture(map.widthInPixels, map.heightInPixels),
        game.add.renderTexture(map.widthInPixels, map.heightInPixels),
      ],
      [
        game.add.renderTexture(map.widthInPixels, map.heightInPixels),
        game.add.renderTexture(map.widthInPixels, map.heightInPixels),
      ],
      [
        game.add.renderTexture(map.widthInPixels, map.heightInPixels),
        game.add.renderTexture(map.widthInPixels, map.heightInPixels),
      ],
    ];

    /**
     * Create sprites to render the starfield renderTextures to the game canvas.
     * One sprite will start off screen in the direction of the
     * starfield motion.
     * This off screen sprite will slide in behind the initial sprite as it
     * slides off screen.
     * When one of the sprites slides off screen, it will return to the top
     * and then continue it's descent.
     * This creates a treadmill effect where the starfield is visually seamless.
     */
    this.layers = this.renderTextures.map(([texture1, texture2]) => [
      game.add.sprite(0, 0, texture1),
      game.add.sprite(0, 0, texture2),
    ]);
  }

  resizeEmitter(width, height) {
    this.emitter.width = width;
    this.emitter.height = height;
  }

  configureEmitter(map) {
    this.emitter = this.game.add.emitter(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
      400
    );

    this.resizeEmitter(map.widthInPixels, map.heightInPixels);

    this.createStarParticle();
    this.emitter.particleClass = StarParticle;
    this.emitter.makeParticles();

    this.emitter.gravity = 0;

    this.emitter.minParticleScale = 0.1;
    this.emitter.maxParticleScale = 0.5;

    this.emitter.minRotation = 0;
    this.emitter.maxRotation = 0;
  }

  /**
   *
   * @param {Object} options
   * @param {Object} options.direction - which direction should the stars move. Can only be topToBottom, bottomToTop, leftToRight, or rightToLeft
   * @param {Object} options.baseSpeed - speed in pixels/frame for the slowest star field layer (higher layers will move faster)
   * @param {Number} options.starCount - quantity of stars to be spawned per layer, larger numbers will lead to a denser looking star field.
   */
  start({ direction = 'topToBottom', baseSpeed = 0.1, starCount = 200 }) {
    this.emitter.maxParticles = starCount;

    const VALID_DIRECTIONS = [
      'topToBottom',
      'bottomToTop',
      'leftToRight',
      'rightToLeft',
    ];

    if (!VALID_DIRECTIONS.some(valid => valid === direction)) {
      console.error(
        `Invalid direction "${direction}" supplied to StarfieldEmitter!`
      );
      direction = 'topToBottom';
    }
    this.direction = direction;

    this.layers.forEach((layer, index) =>
      layer.forEach(
        sprite => (sprite.starfieldSpeed = (index * index + 1) * baseSpeed)
      )
    );

    switch (this.direction) {
      case 'topToBottom':
        this.layers.forEach(layer =>
          layer[0].position.setTo(0, -layer[0].height)
        );
        break;
      case 'bottomToTop':
        this.layers.forEach(layer =>
          layer[0].position.setTo(0, layer[0].height)
        );
        break;
      case 'leftToRight':
        this.layers.forEach(layer =>
          layer[0].position.setTo(-layer[0].width, 0)
        );
        break;
      case 'rightToLeft':
        this.layers.forEach(layer =>
          layer[0].position.setTo(layer[0].width, 0)
        );
        break;
    }

    this.renderTextures.flat().forEach(texture => {
      this.emitter.killAll();
      this.emitter.explode(0, starCount);
      texture.renderXY(this.emitter, 0, 0, true);
    });

    this.emitter.destroy();
  }

  update() {
    this.layers.flat().forEach(layer => {
      switch (this.direction) {
        case 'topToBottom':
          if (layer.y > layer.height) {
            layer.y = -layer.height;
          } else {
            layer.y += layer.starfieldSpeed;
          }
          break;
        case 'bottomToTop':
          if (layer.y < -layer.height) {
            layer.y = layer.height;
          } else {
            layer.y -= layer.starfieldSpeed;
          }
          break;
        case 'leftToRight':
          if (layer.x > layer.width) {
            layer.x = -layer.width;
          } else {
            layer.x += layer.starfieldSpeed;
          }
          break;
        case 'rightToLeft':
          if (layer.x < -layer.width) {
            layer.x = layer.width;
          } else {
            layer.x -= layer.starfieldSpeed;
          }
          break;
      }
    });
  }

  createStarParticle() {
    const bmd = this.game.add.bitmapData(8, 8);
    bmd.context.fillStyle = '#FFFFFF';
    bmd.context.fillRect(0, 0, 4, 4);
    this.game.cache.addBitmapData('starParticle', bmd);
  }
}

class StarParticle extends Phaser.Particle {
  constructor(game, x, y) {
    super(game, x, y, game.cache.getBitmapData('starParticle'));
  }
}
