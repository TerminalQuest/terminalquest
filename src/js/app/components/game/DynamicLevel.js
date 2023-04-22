import EventEmitter from 'events';
import appConfig from '../../config/config';
import EntityConfigService from './EntityConfigService';
import InteractionTextService from './InteractionTextService';
import StarfieldEmitter from './StarfieldEmitter';
import VrBackgroundEffect from './VrBackgroundEffect';
import audioManager from '../../common/audio/index';
import { emitter } from '../../common/context';
import TiledService from '../../common/tiled';
import ScreenShakePlugin from './ScreenShake';
import EntityService from './entities/service/EntityService';
import EntityFactory from './entities/service/EntityFactory';
import { getContext } from '../../common/context';

export default class DynamicLevel extends EventEmitter {
  constructor(config) {
    super();
    this.levelName = config.levelName;
    this.playerEntryPoint = config.playerEntryPoint;
    this.levelMapName = config.levelMapName;
    this.tilesetImages = [];
    this.levelProperties = config.levelProperties;
    this.spriteSheets = config.spriteSheets;
    this.tilesets = config.tilesets;
    this.objectConfigs = config.objectConfigs;
    this.legacyEntityConfigs = config.legacyEntityConfigs;
    this.onCreationComplete = config.onCreationComplete;

    // Collect sprites so we can render debugging stuff
    window.debugSprites = [];

    // See "create" for other members to be added to the level
    this.game = new window.Phaser.Game(
      528,
      330,
      getContext('systemInfo').pi ? Phaser.CANVAS : Phaser.AUTO,
      config.containerId,
      {
        preload: () => this.preload(),
        create: () => this.create(),
        update: () => this.update(),
        postUpdate: () => this.postUpdate(),
        render: () => this.render(),
        antialias: false,
      }
    );
  }

  loadEntityConfigs() {
    this.objectConfigs.forEach(({ key, dirPath }) => {
      const configurator = EntityConfigService.get(key);
      configurator.loadSpriteSheets(this.game, dirPath);
    });

    this.legacyEntityConfigs.forEach(({ key, dirPath }) => {
      const configurator = EntityConfigService.get(key);
      configurator.loadSpriteSheets(this.game, dirPath);
    });
  }

  preload() {
    this.loadEntityConfigs();

    // Load common 32x32 spritesheets
    this.spriteSheets.forEach(spriteSheet => {
      this.game.load.spritesheet(
        spriteSheet.baseName,
        spriteSheet.fileUrl,
        spriteSheet.width,
        spriteSheet.height
      );
    });

    // Load common tilesets
    this.tilesets.forEach(tileset => {
      this.game.load.spritesheet(
        tileset.baseName,
        tileset.fileUrl,
        tileset.width,
        tileset.height
      );
      this.tilesetImages.push(tileset.baseName);
    });

    // Load Object Interaction Text
    InteractionTextService.load('levels/common');
    InteractionTextService.loadLevelOverrides(this.levelName);

    // Load level-specific spritesheets (if any)
    // TODO

    // Load level-specific tilesets (if any)
    // TODO

    this.game.load.tilemap(
      'level-tilemap',
      null,
      TiledService.getMapData(),
      Phaser.Tilemap.TILED_JSON
    );

    // General game world configuration
    this.game.stage.smoothed = false;
    this.game.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
    // this.game.scale.setMinMax(528, 330, 1920, 1080);

    // initialize screenShake plugin
    this.game.plugins.screenShake = this.game.plugins.add(ScreenShakePlugin);
    this.game.plugins.screenShake.setup({
      shakesCount: 0,
      shakeX: true,
      shakeY: true,
      sensCoef: 1.4,
    });
  }

  playBackgroundMusic() {
    if (this.levelProperties.backgroundMusic) {
      if (!audioManager.loaded) {
        audioManager.onload = () =>
          audioManager.music.play(this.levelProperties.backgroundMusic);
      } else {
        audioManager.onload = () => {};
        audioManager.music.play(this.levelProperties.backgroundMusic);
      }
    } else {
      audioManager.music.stopAll();
    }
  }

  create() {
    this.debugTexts = {};
    this.entityService = new EntityService(this);

    // Ensure debug sprites list is empty for each level change
    window.debugSprites = [];

    this.game.physics.startSystem(Phaser.Physics.Arcade);
    this.cursors = this.game.input.keyboard.createCursorKeys();

    this.map = this.game.add.tilemap('level-tilemap');
    // Loop through all loaded tilesets and add them
    this.tilesetImages.forEach(img => {
      this.map.addTilesetImage(img, img);
    });

    // Set background color from map property or default
    this.game.stage.backgroundColor = '#000000';
    if (this.map.properties && this.map.properties.length > 0) {
      this.map.properties.forEach(p => {
        if (p.name === 'backgroundColor') {
          this.game.stage.backgroundColor = p.value;
        }
      });
    }

    this.starfieldEmitter = new StarfieldEmitter(this.game, this.map);
    this.vrBackgroundEffect = new VrBackgroundEffect(this.game, this.map);

    this.backgroundEffect = this.levelProperties.backgroundEffect;
    let backgroundEffectOptions = {};

    if (typeof this.levelProperties.backgroundEffect === 'object') {
      this.backgroundEffect = this.levelProperties.backgroundEffect.key;
      backgroundEffectOptions =
        this.levelProperties.backgroundEffect.options || {};
    }

    if (this.backgroundEffect === 'starfield') {
      this.starfieldEmitter.start(backgroundEffectOptions);
    } else if (this.backgroundEffect === 'vr') {
      this.vrBackgroundEffect.start();
    }

    this.playBackgroundMusic();

    this.game.camera.bounds = this.game.world.getBounds();

    // Initialize display layers/groups and other first pass level
    // set up information.
    TiledService.getLayers().forEach(layer => {
      switch (layer.type) {
        case 'tilelayer':
          layer.instance = this.map.createLayer(layer.name);

          if (layer.properties.collision) {
            layer.instance.resizeWorld();
            this.map.setCollisionByExclusion([], true, layer.instance);
          }

          if (layer.properties.hidden) {
            layer.instance.visible = false;
          }

          break;
        case 'objectgroup':
          if (!this.entityService.getGroup('objects')) {
            // all object layers will start at the height of the first
            // object layer
            this.entityService.createGroup('objects');
          }

          break;
        default:
          console.warn(`Tiled layer type "${type}" is not implemented.`);
          break;
      }
    });

    this.entityService.createGroup('ui'); // highest display layer

    // Now that all display layers/groups are initialized, create all the
    // objects we need.
    TiledService.getLayers(layer => layer.type === 'objectgroup').forEach(
      this.createObjects.bind(this)
    );

    // Center camera on player
    this.game.camera.x = this.player.sprite.x + 16;
    this.game.camera.y = this.player.sprite.y - 32;

    // Fire event callback (if configured) for creation complete
    this.onCreationComplete && this.onCreationComplete();
  }

  createObjects(layer) {
    const entityFactory = new EntityFactory(this);

    this.map.objects[layer.name].forEach(rawObject => {
      // Use zIndex of the object layer if it's there
      if (layer.properties && layer.properties.zIndex) {
        if (!rawObject.properties) {
          rawObject.properties = [];
        }

        const doesRawObjectHaveZIndexProperty =
          rawObject.properties &&
          rawObject.properties.some(prop => prop.name === 'zIndex');

        // If object already has a zIndex, prefer that
        // value instead
        if (!doesRawObjectHaveZIndexProperty) {
          rawObject.properties.push({
            name: 'zIndex',
            type: 'number',
            value: layer.properties.zIndex,
          });
        }
      }

      if (
        rawObject.type === 'player' &&
        rawObject.name !== this.playerEntryPoint
      ) {
        // if not current playerEntryPoint, skip it
        return;
      }

      if (
        rawObject.type === 'player' &&
        rawObject.name === this.playerEntryPoint
      ) {
        this.player = entityFactory.create(rawObject);
        return;
      }

      entityFactory.create(rawObject);
    });
  }

  // Handle movement and inputs
  update() {
    // Player updates self on every frame
    this.player.update();

    if (this.backgroundEffect === 'starfield') {
      this.starfieldEmitter.update();
    } else if (this.backgroundEffect === 'vr') {
      this.vrBackgroundEffect.update();
    }

    const objectGroup = this.entityService.getGroup('objects');

    objectGroup.update = () => {
      objectGroup.forEach(object => object.update());
    };

    objectGroup.customSort((a, b) => {
      const zIndexA = a.zIndex || 0;
      const zIndexB = b.zIndex || 0;

      const zDiff = zIndexA - zIndexB;

      // If objects are on different zIndex levels,
      // we should use zIndex for sorting.
      if (zDiff !== 0) {
        return zDiff;
      }

      // If objects are on the same zIndex, we should
      // sort them by body position.
      const bottomOfABody = a.body.y + a.body.height;
      const bottomOfBBody = b.body.y + b.body.height;

      return bottomOfABody - bottomOfBBody;
    });
  }

  // Handle updates that need to occur after physics
  postUpdate() {
    this.player.postUpdate();
  }

  render() {
    // Player needs to update themself on render
    this.player.render();

    if (this.game && appConfig.drawDebug) {
      window.debugSprites.forEach(s => {
        this.game.debug.geom(
          new Phaser.Rectangle(s.x, s.y, s.width, s.height),
          '#ff0000',
          false
        );
      });
      this.entityService.getAll().forEach(({ instance, collections, guid }) => {
        if (!instance.sprite) {
          return;
        }

        this.game.debug.geom(
          new Phaser.Rectangle(
            instance.sprite.x,
            instance.sprite.y,
            instance.sprite.width,
            instance.sprite.height
          ),
          '#ff0000',
          false
        );
        if (instance.sprite.body) {
          if (instance.sprite.body.isCircle) {
            this.game.debug.geom(
              new Phaser.Circle(
                instance.sprite.body.x + instance.sprite.body.width / 2,
                instance.sprite.body.y + instance.sprite.body.height / 2,
                instance.sprite.body.radius * 2
              ),
              '#00ff00',
              false
            );
          } else {
            this.game.debug.geom(
              new Phaser.Rectangle(
                instance.sprite.body.x,
                instance.sprite.body.y,
                instance.sprite.body.width,
                instance.sprite.body.height
              ),
              '#00ff00',
              false
            );
          }

          // console.log(instance);
          if (!this.debugTexts[guid]) {
            this.debugTexts[guid] = this.game.add.text(
              instance.sprite.x + instance.sprite.width / 2,
              instance.sprite.y + instance.sprite.height / 2,
              `"${instance.type}"`,
              {
                font: '12px Arial',
                fill: '#ffffff',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4,
              }
            );
          } else {
            this.debugTexts[guid].x =
              instance.sprite.x + instance.sprite.width / 2;
            this.debugTexts[guid].y =
              instance.sprite.y + instance.sprite.height / 2;
          }

          this.game.debug.geom(
            new Phaser.Line(
              instance.sprite.x + instance.sprite.width / 2,
              instance.sprite.y + instance.sprite.height / 2,
              instance.sprite.body.x + instance.sprite.body.width / 2,
              instance.sprite.body.y + instance.sprite.body.height / 2
            ),
            '#0000ff'
          );
        }
      });
      if (this.game.camera) {
        this.game.debug.cameraInfo(this.game.camera, 32, 32);
      }
      if (this.player.sprite) {
        this.game.debug.spriteCoords(this.player.sprite, 32, 200);
        this.game.debug.geom(this.player.rangeFinder, '#0fffff', false);
      }
    }
  }
}
